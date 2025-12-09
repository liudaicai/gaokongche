import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Form, Input, DatePicker, Button, Row, Col, Typography, message, Table, Card, Space, Modal, Checkbox } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '../../../app/store';
import type { Equipment } from '../../equipment/equipmentslice';
import { selectEquipmentList } from '../../equipment/equipmentslice';
import { Order, SettlementRecord, SuspensionRecord, ClaimRecord, EntryRecord, ExitRecord } from '../types';
import { addSettlement, fetchOrderById, selectOrderById } from '../ordersSlice';
import { useTabs } from '../../common/TabsContext';
import { selectDefaultTemplate } from '../../templates/templatesSlice';
import { printElement, exportElementAsPdf } from '../../templates/templateEngine';
import { calculateRentWithAudit, PricingLogEntry } from '../pricing';

const { Text, Title } = Typography;

interface Props {
  order: Order;
  tabKey: string;
}

// 结算单号生成：JS + 时间戳后8位 + 随机3位
const generateSettlementNumber = (): string => {
  const prefix = 'JS';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

const toNum = (x: any): number => {
  const n = Number(x);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
};

type DeviceRow = {
  key: string; // 设备自编码
  itemIndex: number; // 对应设备项索引，-1 表示未知
  equipmentType?: string;
  height?: string;
  leaseStartDate?: string; // 起租日期（来自进场记录）
  settlementDate?: string; // 租金结算日期（来自退场记录）
  dailyRate?: number;
  monthlyRate?: number;
  shippingFee?: number;
  shippingType?: '单程' | '双程';
  modificationFee?: number;
};

const SettlementTab: React.FC<Props> = ({ order: initialOrder, tabKey }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { closeTab } = useTabs();
  const [form] = Form.useForm();
  const previewRef = useRef<HTMLDivElement>(null);
  const auditRef = useRef<Record<string, PricingLogEntry[]>>({});

  const settlementNumber = useMemo(generateSettlementNumber, []);
  const defaultSettleTpl = useSelector(selectDefaultTemplate('结算')); // 预留：如后续接入模板
  const equipmentList = useSelector(selectEquipmentList);
  const equipmentByCode = useMemo(() => new Map<string, Equipment>((equipmentList || []).map((e: Equipment) => [e.code, e])), [equipmentList]);

  // 统一：获取有效订单（详情优先，列表为回退）
  const cachedOrder = useSelector(selectOrderById(initialOrder.id));
  const order = useMemo(() => cachedOrder || initialOrder, [cachedOrder, initialOrder]);

  // 状态
  const [cycleStart, setCycleStart] = useState<Dayjs | null>(dayjs());
  const [cycleEnd, setCycleEnd] = useState<Dayjs | null>(dayjs());
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  // 已移除：抵扣额、人工费、其他费用本地状态
  // 审计日志
  const [auditVisible, setAuditVisible] = useState(false);

  // 如数据不完整，自动拉取完整详情，保证两个入口一致
  useEffect(() => {
    const needFull = !cachedOrder
      || (cachedOrder as any).entries == null
      || (cachedOrder as any).exits == null
      || (cachedOrder as any).receipts == null
      || (cachedOrder as any).refunds == null
      || (Array.isArray((cachedOrder as any)?.equipmentItems) ? (cachedOrder as any).equipmentItems.length === 0 : true);
    if (needFull) {
      dispatch(fetchOrderById(initialOrder.id));
    }
  }, [dispatch, initialOrder.id, cachedOrder]);

  // 初始化表单
  useEffect(() => {
    if (!order) return;
    // 初始化默认选择为全部设备编码
    const codes = deriveAllCodes(order);
    setSelectedRowKeys(codes);
    const nextValues = {
      settlementNumber,
      contractName: `${order.customerName}/${order.projectName}`,
      remark: undefined,
    };
    const t = setTimeout(() => {
      try { form.setFieldsValue(nextValues); } catch {}
    }, 0);
    return () => clearTimeout(t);
  }, [order, form, settlementNumber]);

  // 设备编码聚合：从在租、进场、退场记录收集唯一编码
  const deriveAllCodes = (ord: Order): string[] => {
    const set = new Set<string>();
    (ord.rentedEquipmentIds || []).forEach(arr => (arr || []).forEach(code => code && set.add(code)));
    (ord.entries || []).forEach((rec: EntryRecord) => (rec.equipmentCodes || []).forEach(code => code && set.add(code)));
    (ord.exits || []).forEach((rec: ExitRecord) => (rec.equipmentCodes || []).forEach(code => code && set.add(code)));
    return Array.from(set);
  };

  // 根据设备编码查找对应的设备项索引
  const findItemIndexByCode = (ord: Order, code: string): number => {
    const rented = ord.rentedEquipmentIds || [];
    for (let i = 0; i < rented.length; i++) {
      if ((rented[i] || []).includes(code)) return i;
    }
    // 在报停中匹配
    for (const rec of (ord.suspensions || [])) {
      const sels = rec.equipmentSelections || [];
      for (let i = 0; i < sels.length; i++) {
        if ((sels[i] || []).includes(code)) return i;
      }
    }
    // 在索赔中匹配
    for (const rec of (ord.claims || [])) {
      const sels = rec.equipmentSelections || [];
      for (let i = 0; i < sels.length; i++) {
        if ((sels[i] || []).includes(code)) return i;
      }
    }
    return -1;
  };

  // 获取设备编码对应的起租与结算日期
  const findLeaseStartDate = (ord: Order, code: string): string | undefined => {
    // 使用最早的 leaseStartDate
    const candidates = (ord.entries || [])
      .filter(r => (r.equipmentCodes || []).includes(code))
      .map(r => r.leaseStartDate || r.entryDate);
    return candidates.sort()[0];
  };

  const findSettlementDate = (ord: Order, code: string): string | undefined => {
    // 使用最新的 settlementDate（若无则用 exitDate）
    const candidates = (ord.exits || [])
      .filter(r => (r.equipmentCodes || []).includes(code))
      .map(r => r.settlementDate || r.exitDate);
    return candidates.sort().slice(-1)[0];
  };

  // 构造设备行
  const deviceRows: DeviceRow[] = useMemo(() => {
    if (!order) return [];
    const codes = deriveAllCodes(order);
    return codes.map(code => {
      const itemIndex = findItemIndexByCode(order, code);
      const item = itemIndex >= 0 ? (order.equipmentItems || [])[itemIndex] : undefined;
      return {
        key: code,
        itemIndex,
        equipmentType: item?.equipmentType,
        height: item?.height,
        leaseStartDate: findLeaseStartDate(order, code),
        settlementDate: findSettlementDate(order, code),
        dailyRate: item?.dailyRate,
        monthlyRate: item?.monthlyRate,
        shippingFee: item?.shippingFee,
        shippingType: item?.shippingType,
        modificationFee: item?.modificationFee,
      } as DeviceRow;
    });
  }, [order]);

  // 计算函数
  const calcDays = (start: Dayjs | null, end: Dayjs | null): number => {
    if (!start || !end) return 0;
    const s = start.startOf('day');
    const e = end.endOf('day');
    return Math.max(e.diff(s, 'day') + 1, 0);
  };

  // 设备是否在租（用于提醒，不阻断提交）
  const isCodeRenting = (code: string): boolean => {
    return (order.rentedEquipmentIds || []).some(arr => (arr || []).includes(code));
  };

  const calcSuspensionDaysForCode = (code: string, start: Dayjs | null, end: Dayjs | null): number => {
    if (!start || !end || !order?.suspensions || order.suspensions.length === 0) return 0;
    const s = start.startOf('day');
    const e = end.endOf('day');
    let total = 0;
    (order.suspensions as SuspensionRecord[]).forEach(rec => {
      // 检查该设备编码是否在本记录的选择中
      const included = (rec.equipmentSelections || []).some(codes => (codes || []).includes(code));
      if (!included) return;
      const rs = dayjs(rec.startDate).startOf('day');
      const re = dayjs(rec.endDate).endOf('day');
      const overlapStart = rs.isAfter(s) ? rs : s;
      const overlapEnd = re.isBefore(e) ? re : e;
      if (overlapEnd.isAfter(overlapStart)) {
        total += overlapEnd.diff(overlapStart, 'day') + 1;
      }
    });
    return Math.max(total, 0);
  };

  const calcClaimsForCode = (code: string): number => {
    if (!order?.claims || order.claims.length === 0) return 0;
    return (order.claims as ClaimRecord[]).reduce((sum, rec) => {
      const hit = (rec.equipmentSelections || []).some(codes => (codes || []).includes(code));
      return hit ? sum + (toNum(rec.claimAmount) || 0) : sum;
    }, 0);
  };

  // 列定义（简化并聚焦计算与选择）
  const columns: any[] = [
    { title: '序号', dataIndex: 'idx', width: 60, align: 'center', render: (_: any, __: any, i: number) => i + 1 },
    {
      title: '设备信息', dataIndex: 'deviceInfo', align: 'center', render: (_: any, row: DeviceRow) => {
        const type = row.equipmentType || '—';
        const h = row.height || '—';
        const eq = equipmentByCode.get(row.key);
        const customCode = String(eq?.customCode || '').trim();
        const displayCode = customCode || (row.key || '—');
        return `${type} / ${h} / ${displayCode}`;
      }
    },
    {
      title: (<div style={{ textAlign: 'center' }}>进退场时间</div>), dataIndex: 'entryExit', align: 'left', render: (_: any, row: DeviceRow) => {
        const start = row.leaseStartDate || '—';
        const end = row.settlementDate || '—';
        return (
          <Space direction="vertical" size={0}>
            <Text type="secondary">起租：{start}</Text>
            <Text type="secondary">退租：{end}</Text>
          </Space>
        );
      }
    },
    {
      title: '结算周期', dataIndex: 'cycle', align: 'center', render: () => (
        <Space direction="vertical" size={0}>
          <Text type="secondary">开始：{cycleStart?.format('YYYY-MM-DD')}</Text>
          <Text type="secondary">结束：{cycleEnd?.format('YYYY-MM-DD')}</Text>
        </Space>
      )
    },
    {
      title: '租金单价', dataIndex: 'rates', align: 'center', render: (_: any, row: DeviceRow) => {
        const d = toNum(row.dailyRate).toFixed(2);
        const m = toNum(row.monthlyRate).toFixed(2);
        return (
          <Space direction="vertical" size={0} style={{ width: '100%', textAlign: 'right' }}>
            <Text type="secondary">日租：¥{d}</Text>
            <Text type="secondary">月租：¥{m}</Text>
          </Space>
        );
      }
    },
    {
      title: '实算天数', dataIndex: 'actualDays', align: 'center', render: (_: any, row: DeviceRow) => {
        const used = calcActualDaysForCode(row.key);
        const susp = calcSuspensionDaysForCode(row.key, cycleStart, cycleEnd);
        const val = Math.max(used - susp, 0);
        return <div style={{ textAlign: 'right' }}>{val}</div>;
      }
    },
    {
      title: '租金', dataIndex: 'rent', align: 'center', render: (_: any, row: DeviceRow) => {
        const used = calcActualDaysForCode(row.key);
        const susp = calcSuspensionDaysForCode(row.key, cycleStart, cycleEnd);
        const actualDays = Math.max(used - susp, 0);
        const entryDate = findLeaseStartDate(order, row.key);
        const exitDate = findSettlementDate(order, row.key);
        const hasExited = Boolean(exitDate);
        const { amount } = calculateRentWithAudit({
          dailyRate: toNum(row.dailyRate),
          monthlyRate: toNum(row.monthlyRate),
          rentalDays: actualDays,
          hasExited,
          entryDate,
          exitDate,
        });
        return <div style={{ textAlign: 'right' }}>{amount.toFixed(2)}</div>;
      }
    },
    {
      title: '运费', dataIndex: 'shipping', align: 'center', render: (_: any, row: DeviceRow) => {
        const ship = toNum(row.shippingFee);
        // 录入值即为双程总额，不再因“双程”倍乘
        const times = 1;
        const val = ship * times;
        return <div style={{ textAlign: 'right' }}>{val.toFixed(2)}</div>;
      }
    },
    {
      title: '报停天数', dataIndex: 'suspDays', align: 'center', render: (_: any, row: DeviceRow) => {
        const val = calcSuspensionDaysForCode(row.key, cycleStart, cycleEnd);
        return <div style={{ textAlign: 'right' }}>{val}</div>;
      }
    },
    {
      title: '改装费', dataIndex: 'modFee', align: 'center', render: (_: any, row: DeviceRow) => {
        const val = toNum(row.modificationFee);
        return <div style={{ textAlign: 'right' }}>{val.toFixed(2)}</div>;
      }
    },
    {
      title: '索赔', dataIndex: 'claims', align: 'center', render: (_: any, row: DeviceRow) => {
        const val = calcClaimsForCode(row.key);
        return <div style={{ textAlign: 'right' }}>{val.toFixed(2)}</div>;
      }
    },
    {
      title: '选择', dataIndex: 'op', width: 80, align: 'center', render: (_: any, row: DeviceRow) => (
        <Checkbox
          checked={selectedRowKeys.includes(row.key)}
          onChange={(e) => {
            const next = new Set(selectedRowKeys as string[]);
            if (e.target.checked) next.add(row.key); else next.delete(row.key);
            setSelectedRowKeys(Array.from(next));
          }}
        />
      )
    },
  ];

  const data = deviceRows;

  // 计算设备编码在本期的使用天数（不扣报停）
  const calcActualDaysForCode = (code: string): number => {
    if (!cycleStart || !cycleEnd) return 0;
    // 活动区间为 [leaseStartDate, settlementDate]，若无结算日期则至本期结束
    const startStr = findLeaseStartDate(order, code);
    const endStr = findSettlementDate(order, code) || cycleEnd.format('YYYY-MM-DD');
    if (!startStr || !endStr) return 0;
    const s = dayjs(startStr).startOf('day');
    const e = dayjs(endStr).endOf('day');
    const cs = cycleStart.startOf('day');
    const ce = cycleEnd.endOf('day');
    const overlapStart = s.isAfter(cs) ? s : cs;
    const overlapEnd = e.isBefore(ce) ? e : ce;
    return Math.max(overlapEnd.diff(overlapStart, 'day') + 1, 0);
  };

  // 汇总计算
  const calcSummary = () => {
    const rows = ((selectedRowKeys as string[]) || []).length ? (selectedRowKeys as string[]) : deviceRows.map(r => r.key);
    let rentSum = 0;
    let shipSum = 0;
    let modSum = 0;
    let claimsSum = 0;
    const auditAcc: Record<string, PricingLogEntry[]> = {};
    rows.forEach((code) => {
      const row = deviceRows.find(r => r.key === code);
      if (!row) return;
      const usedDays = calcActualDaysForCode(code);
      const suspDays = calcSuspensionDaysForCode(code, cycleStart, cycleEnd);
      const actualDays = Math.max(usedDays - suspDays, 0);
      const entryDate = findLeaseStartDate(order, code);
      const exitDate = findSettlementDate(order, code);
      const hasExited = Boolean(exitDate);
      const { amount, log } = calculateRentWithAudit({
        dailyRate: toNum(row?.dailyRate),
        monthlyRate: toNum(row?.monthlyRate),
        rentalDays: actualDays,
        hasExited,
        entryDate,
        exitDate,
      });
      rentSum += amount;
      auditAcc[code] = log;
      // 录入值即为双程总额，不再因“双程”倍乘
      shipSum += toNum(row.shippingFee);
      modSum += toNum(row.modificationFee);
      claimsSum += calcClaimsForCode(code);
    });
    auditRef.current = auditAcc;
    const currentReceivable = rentSum + shipSum + modSum - claimsSum;
    // 累计收款余额（收款 - 退款）
    const received = (order.receipts || []).reduce((s, r) => s + toNum(r.amount), 0);
    const refunded = (order.refunds || []).reduce((s, r) => s + toNum(r.amount), 0);
    const receivedBalance = Math.max(received - refunded, 0);
    const diff = Math.max(currentReceivable - receivedBalance, 0);
    return { rentSum, shipSum, modSum, claimsSum, currentReceivable, receivedBalance, diff };
  };

  const confirmSubmit = async (): Promise<boolean> => {
    const { currentReceivable } = calcSummary();
    return new Promise((resolve) => {
      Modal.confirm({
        title: '确认提交结算',
        content: `本期结算金额：¥${currentReceivable.toFixed(2)}，确认提交吗？`,
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  };

  const validateSelectionBeforeSettle = (): { ok: boolean; badCodes: string[] } => {
    const rows = ((selectedRowKeys as string[]) || []).length ? (selectedRowKeys as string[]) : deviceRows.map(r => r.key);
    const badCodes = rows.filter(code => !isCodeRenting(code));
    // 仅警告，无阻断
    return { ok: true, badCodes };
  };

  const handleSave = async () => {
    try {
      const check = validateSelectionBeforeSettle();
      if (check.badCodes.length) {
        message.warning(`以下设备当前可能未在租：${check.badCodes.join('、')}，请确认是否仍需结算。`);
      }

      const ok = await confirmSubmit();
      if (!ok) return;

      const values = await form.validateFields();
      if (!order) return;
      if (!cycleStart || !cycleEnd) throw new Error('请设置结算周期');

      const { currentReceivable } = calcSummary();
      const record: SettlementRecord = {
        id: Date.now().toString(),
        settlementNumber,
        contractName: `${order.customerName}/${order.projectName}`,
        settlementDate: dayjs().format('YYYY-MM-DD'),
        cycleStartDate: cycleStart?.format('YYYY-MM-DD'),
        cycleEndDate: cycleEnd?.format('YYYY-MM-DD'),
        status: '待对账',
        settlementAmount: currentReceivable,
        attachments: undefined,
        remark: values.remark?.trim(),
        createdAt: new Date().toISOString(),
      };

      await dispatch(addSettlement({ orderId: order.id, record })).unwrap();
      message.success('结算记录已保存');
      closeTab(tabKey);
    } catch (e: any) {
      message.error(e?.message || '请检查表单输入');
    }
  };

  const { rentSum, shipSum, modSum, claimsSum, currentReceivable, receivedBalance, diff } = calcSummary();
  // 结算与收款汇总（用于显示四项核心指标）
  const previousSettlementAmount = (order.settlements || []).reduce((s, r) => s + toNum((r as any).settlementAmount), 0);
  const receiptsTotalAmount = (order.receipts || []).reduce((s, r) => s + toNum((r as any).amount), 0);
  const cumulativeSettlementAmount = previousSettlementAmount + currentReceivable; // 往期结算金额 + 本期结算金额
  const payableAmount = cumulativeSettlementAmount - receiptsTotalAmount; // 应付金额 = 累计金额 - 已收金额

  return (
    <div>
      {/* 顶部标题与结算周期 */}
      <Card variant="borderless" style={{ marginBottom: 12 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size={0}>
              <Title level={4} style={{ marginBottom: 0 }}>结算单</Title>
              <Text type="secondary">单号：{settlementNumber}</Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Text>结算周期：</Text>
              <DatePicker value={cycleStart} onChange={(d) => setCycleStart(d)} />
              <Text>至</Text>
              <DatePicker value={cycleEnd} onChange={(d) => setCycleEnd(d)} />
              <Button onClick={() => setAuditVisible(true)}>复核计算过程</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 订单信息卡片 */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Row gutter={16}>
          <Col span={8}><Space direction="vertical" size={0}><Text>合同编号：{order.contractNumber || '—'}</Text><Text>客户：{order.customerName || '—'}</Text></Space></Col>
          <Col span={8}><Space direction="vertical" size={0}><Text>项目名称：{order.projectName || '—'}</Text><Text>业务负责人：{order.businessManagerName || '—'}</Text></Space></Col>
          <Col span={8}><Space direction="vertical" size={0}><Text>交机地点：{order.deliveryLocation || '—'}</Text><Text>结算方式：{order.paymentAgreement || '—'}</Text></Space></Col>
        </Row>
      </Card>

      {/* 设备明细表 */}
      <Card title="设备结算明细" size="small" style={{ marginBottom: 12 }}>
        <Table
          size="small"
          columns={columns as any}
          dataSource={data}
          rowKey="key"
          pagination={{ pageSize: 8 }}
          scroll={{ x: 'max-content' }}
          summary={() => (
            <Table.Summary>
              <Table.Summary.Row>
                {/* 对齐当前列顺序：序号、设备信息、进退场时间、结算周期、租金单价、实算天数、租金、运费、报停天数、改装费、索赔、选择 */}
                <Table.Summary.Cell index={0} />
                <Table.Summary.Cell index={1} />
                <Table.Summary.Cell index={2} />
                <Table.Summary.Cell index={3} />
                <Table.Summary.Cell index={4} />
                <Table.Summary.Cell index={5} />
                {/* 6: 租金列小计 */}
                <Table.Summary.Cell index={6}>
                  <div style={{ textAlign: 'right' }}>租金小计：¥{rentSum.toFixed(2)}</div>
                </Table.Summary.Cell>
                {/* 7: 运费列小计 */}
                <Table.Summary.Cell index={7}>
                  <div style={{ textAlign: 'right' }}>运费小计：¥{shipSum.toFixed(2)}</div>
                </Table.Summary.Cell>
                {/* 8: 报停天数空白 */}
                <Table.Summary.Cell index={8} />
                {/* 9: 改装费列小计 */}
                <Table.Summary.Cell index={9}>
                  <div style={{ textAlign: 'right' }}>改装费小计：¥{modSum.toFixed(2)}</div>
                </Table.Summary.Cell>
                {/* 10: 索赔列小计 */}
                <Table.Summary.Cell index={10}>
                  <div style={{ textAlign: 'right' }}>索赔小计：¥{claimsSum.toFixed(2)}</div>
                </Table.Summary.Cell>
                {/* 11: 选择空白 */}
                <Table.Summary.Cell index={11} />
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>

      {/* 费用与备注（移除外层 Card，避免产生 ant-card-body div）*/}
      <div style={{ marginBottom: 12 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            remark: undefined,
          }}
          
        >
          
          <Row>
            <Col span={24}><Form.Item name="remark" label="备注"><Input.TextArea rows={3} /></Form.Item></Col>
          </Row>
        </Form>
      </div>

      {/* 底部左右面板 */}
      <Row gutter={12}>
        <Col xs={24} md={12}>
          <Card size="small" title="订单累计与收款记录">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>累计收款：¥{(order.receipts || []).reduce((s, r) => s + toNum(r.amount), 0).toFixed(2)}</Text>
              <Text>累计退款：¥{(order.refunds || []).reduce((s, r) => s + toNum(r.amount), 0).toFixed(2)}</Text>
              <Text>已收余额：¥{receivedBalance.toFixed(2)}</Text>
              <Table size="small" rowKey={(r: any) => r.id} columns={[
                { title: '收款单号', dataIndex: 'receiptNumber' },
                { title: '收款日期', dataIndex: 'receiptDate' },
                { title: '收款方式', dataIndex: 'paymentMethod' },
                { title: '金额', dataIndex: 'amount', render: (v: number) => `¥${(v||0).toLocaleString()}` },
              ] as any} dataSource={order.receipts || []} pagination={{ pageSize: 5 }} />
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card size="small" title="本期结算汇总">
            <Space direction="vertical">
              <Text>本期结算金额：¥{currentReceivable.toFixed(2)}</Text>
              <Text>累计结算金额：¥{cumulativeSettlementAmount.toFixed(2)}</Text>
              <Text>已收金额：¥{receiptsTotalAmount.toFixed(2)}</Text>
              <Text strong>应付金额：¥{payableAmount.toFixed(2)}</Text>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 居中功能按钮 */}
      <Row justify="center" style={{ marginTop: 12 }}>
        <Col>
          <Space>
            <Button onClick={() => setPreviewVisible(true)}>预览</Button>
            <Button onClick={() => closeTab(tabKey)}>取消</Button>
            <Button type="primary" onClick={handleSave}>提交</Button>
          </Space>
        </Col>
      </Row>

      {/* 预览弹窗（简单布局，支持打印/PDF）*/}
      <Modal
        title="结算单预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="print" onClick={() => previewRef.current && printElement(previewRef.current)}>打印</Button>,
          <Button key="pdf" onClick={() => previewRef.current && exportElementAsPdf(previewRef.current, `结算单_${settlementNumber}.pdf`)}>导出PDF</Button>,
          <Button key="close" onClick={() => setPreviewVisible(false)}>关闭</Button>
        ]}
        width={900}
      >
        <div ref={previewRef}>
          <Title level={4}>结算单</Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>单号：{settlementNumber}</Text>
            <Text>合同名称：{`${order.customerName}/${order.projectName}`}</Text>
            <Text>结算周期：{cycleStart?.format('YYYY-MM-DD')} 至 {cycleEnd?.format('YYYY-MM-DD')}</Text>
            <Text>订单累计结算金额：¥{(order.settlements || []).reduce((s, r) => s + toNum(r.settlementAmount), 0).toFixed(2)}</Text>
            <Text>租金合计：¥{rentSum.toFixed(2)}</Text>
            <Text>运费合计：¥{shipSum.toFixed(2)}</Text>
            <Text>改装费合计：¥{modSum.toFixed(2)}</Text>
            <Text>索赔扣减：¥{claimsSum.toFixed(2)}</Text>
            {/* 汇总四项 */}
            <Title level={5}>本期结算金额：¥{currentReceivable.toFixed(2)}</Title>
            <Text>累计结算金额：¥{cumulativeSettlementAmount.toFixed(2)}</Text>
            <Text>已收金额：¥{receiptsTotalAmount.toFixed(2)}</Text>
            <Text strong>应付金额：¥{payableAmount.toFixed(2)}</Text>
            <Text>备注：{(form.getFieldValue('remark') || '—')}</Text>
          </Space>
        </div>
      </Modal>

      {/* 审计日志复核 */}
      <Modal
        title="价格计算审计日志"
        open={auditVisible}
        onCancel={() => setAuditVisible(false)}
        footer={<Button onClick={() => setAuditVisible(false)}>关闭</Button>}
        width={800}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {deviceRows.map(row => {
            const logs = auditRef.current[row.key] || [];
            const eq = equipmentByCode.get(row.key);
            const customCode = String(eq?.customCode || '').trim();
            const displayCode = customCode || row.key;
            return (
              <Card key={row.key} size="small" title={`设备：${displayCode}`}>
                {logs.length ? (
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {logs.map((l, idx) => (
                      <li key={idx}>
                        <strong>{l.step}</strong>：{l.details}
                        {l.values ? (
                          <span>
                            {Object.entries(l.values).map(([k, v]) => ` ${k}=${v}`).join('')}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Text type="secondary">暂无日志</Text>
                )}
              </Card>
            );
          })}
        </Space>
      </Modal>
    </div>
  );
};

export default SettlementTab;