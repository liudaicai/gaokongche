import React, { useEffect, useMemo, useState, useRef } from 'react';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Row, Col, Space, Tag, Typography, Tabs, Descriptions, Table, Skeleton, Button, Dropdown, Popconfirm, message, Modal, Upload, Form, Input, Select, DatePicker, Collapse, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AppDispatch, RootState } from '../../../app/store';
import { Order, OrderEquipmentItem, EntryRecord, ExitRecord } from '../types';
import { fetchOrderById, selectOrderById, updateOrder, deleteOrder } from '../ordersSlice';
import { useTabs } from '../../common/TabsContext';
import EntryOperationTab from './EntryOperationTab';
import ExitOperationTab from './ExitOperationTab';
import ReceiptOperationTab from './ReceiptOperationTab';
import RefundOperationTab from './RefundOperationTab';
import SuspensionOperationTab from './SuspensionOperationTab';
import ClaimOperationTab from './ClaimOperationTab';
import SettlementTab from './SettlementTab';
import ClearanceOperationTab from './ClearanceOperationTab';
import { UploadOutlined } from '@ant-design/icons';
import { selectEquipmentList, fetchEquipmentsStart, fetchEquipmentsSuccess, fetchEquipmentsFailure, Equipment } from '../../equipment/equipmentslice';
import { apiGet } from '../../../api/client';
import { calculateRentWithAudit } from '../pricing';

interface OrderDetailTabProps {
  orderId: string;
  tabKey: string;
  initialOrder?: Order;
}

const OrderDetailTab: React.FC<OrderDetailTabProps> = ({ orderId, tabKey, initialOrder }) => {
  const dispatch = useDispatch<AppDispatch>();
  const cached = useSelector(selectOrderById(orderId));
  const order = useMemo(() => cached || initialOrder || null, [cached, initialOrder]);
  const equipmentList = useSelector(selectEquipmentList);

  useEffect(() => {
    // 修复：列表页缓存的订单不包含 entries/exits 等关键字段，导致刷新后记录不显示。
    // 当缓存缺少这些字段时，强制拉取完整订单详情。
    const needFull = !cached
      || (cached as any).entries == null
      || (cached as any).exits == null
      || (cached as any).equipmentItems == null;
    if (needFull) {
      dispatch(fetchOrderById(orderId));
    }
  }, [dispatch, orderId, cached]);

  // 加载设备列表（用于在设备清单中展示详细属性）
  useEffect(() => {
    if (!equipmentList || equipmentList.length === 0) {
      dispatch(fetchEquipmentsStart());
      apiGet<Equipment[]>('/equipments')
        .then(list => dispatch(fetchEquipmentsSuccess(list)))
        .catch((err: any) => dispatch(fetchEquipmentsFailure(err?.message || '获取设备列表失败')));
    }
  }, [dispatch]);

  if (!order) {
    return <Skeleton active />;
  }

  const { openTab, closeTab } = useTabs();
  const deleteLockRef = useRef<number>(0);
  // 结算详情弹窗状态
  const [settlementDetailVisible, setSettlementDetailVisible] = useState(false);
  const [settlementDetailRecord, setSettlementDetailRecord] = useState<any | null>(null);
  const [settlementDetailExpanded, setSettlementDetailExpanded] = useState(false);
  const [calcVisible, setCalcVisible] = useState(false);
  const [calcBreakdown, setCalcBreakdown] = useState<any | null>(null);
  const statusColor = (s?: string): string => {
    switch (s) {
      case '待对账': return 'orange';
      case '对账中': return 'blue';
      case '已确认': return 'green';
      case '已驳回': return 'red';
      default: return 'default';
    }
  };

  const fmtCurrency = (v: number): string => `¥${Number(v || 0).toFixed(2)}`;
  const fmtDateTime = (s?: string, opts?: { isEnd?: boolean }): string => {
    if (!s) return '—';
    const d = dayjs(s);
    if (!d.isValid()) {
      // 若仅为 YYYY-MM-DD 字符串，则补秒
      const guess = `${s} ${opts?.isEnd ? '23:59:59' : '00:00:00'}`;
      return guess;
    }
    return d.format('YYYY-MM-DD HH:mm:ss');
  };

  const validateSettlementRecord = (r: any): { anomalies: string[] } => {
    const anomalies: string[] = [];
    if (!r?.settlementNumber) anomalies.push('缺少结算单号');
    if (r?.settlementAmount == null) anomalies.push('缺少结算金额');
    if (Number(r?.settlementAmount) < 0) anomalies.push('金额为负值');
    if (Number(r?.settlementAmount) > 10000000) anomalies.push('金额异常偏大');
    if (!r?.cycleStartDate || !r?.cycleEndDate) anomalies.push('缺少结算周期');
    return { anomalies };
  };

  const deriveAllCodes = (ord: any): string[] => {
    const arr = (ord?.rentedEquipmentIds || []).flat().filter(Boolean);
    return Array.from(new Set(arr));
  };
  const findLeaseStartDate = (ord: any, code: string): string | undefined => {
    const candidates = (ord.entries || [])
      .filter((r: any) => (r.equipmentCodes || []).includes(code))
      .map((r: any) => r.leaseStartDate || r.entryDate);
    return candidates.sort()[0];
  };
  const findSettlementDate = (ord: any, code: string): string | undefined => {
    const candidates = (ord.exits || [])
      .filter((r: any) => (r.equipmentCodes || []).includes(code))
      .map((r: any) => r.settlementDate || r.exitDate);
    return candidates.sort().slice(-1)[0];
  };
  const calcSuspensionDaysForCode = (ord: any, code: string, start: dayjs.Dayjs, end: dayjs.Dayjs): number => {
    if (!ord?.suspensions || ord.suspensions.length === 0) return 0;
    let total = 0;
    (ord.suspensions || []).forEach((rec: any) => {
      const included = (rec.equipmentSelections || []).some((codes: string[]) => (codes || []).includes(code));
      if (!included) return;
      const rs = dayjs(rec.startDate).startOf('day');
      const re = dayjs(rec.endDate).endOf('day');
      const overlapStart = rs.isAfter(start) ? rs : start;
      const overlapEnd = re.isBefore(end) ? re : end;
      if (overlapEnd.isAfter(overlapStart)) {
        total += overlapEnd.diff(overlapStart, 'day') + 1;
      }
    });
    return Math.max(total, 0);
  };
  const openCalc = (r: any) => {
    if (!order || !r) return;
    const cs = dayjs(r.cycleStartDate).startOf('day');
    const ce = dayjs(r.cycleEndDate).endOf('day');
    const codes = deriveAllCodes(order);
    let rentSum = 0, shipSum = 0, modSum = 0, claimsSum = 0;
    const details: any[] = [];
    codes.forEach(code => {
      const itemIndex = (order.equipmentItems || []).findIndex((it: any, idx: number) => (order.rentedEquipmentIds?.[idx] || []).includes(code));
      const item = itemIndex >= 0 ? (order.equipmentItems || [])[itemIndex] : undefined;
      const entryDate = findLeaseStartDate(order, code);
      const exitDate = findSettlementDate(order, code) || r.cycleEndDate;
      if (!entryDate || !exitDate) return;
      const s = dayjs(entryDate).startOf('day');
      const e = dayjs(exitDate).endOf('day');
      const overlapStart = s.isAfter(cs) ? s : cs;
      const overlapEnd = e.isBefore(ce) ? e : ce;
      const usedDays = Math.max(overlapEnd.diff(overlapStart, 'day') + 1, 0);
      const suspDays = calcSuspensionDaysForCode(order, code, cs, ce);
      const rentalDays = Math.max(usedDays - suspDays, 0);
      const hasExited = Boolean(findSettlementDate(order, code));
      const { amount } = calculateRentWithAudit({
        dailyRate: Number(item?.dailyRate || 0),
        monthlyRate: Number(item?.monthlyRate || 0),
        rentalDays,
        hasExited,
        entryDate,
        exitDate,
      });
      rentSum += amount;
      shipSum += Number(item?.shippingFee || 0);
      modSum += Number(item?.modificationFee || 0);
      // 索赔金额按 code 聚合
      const codeClaims = (order.claims || []).reduce((s: number, rec: any) => {
        const hit = (rec.equipmentSelections || []).some((arr: string[]) => (arr || []).includes(code));
        return hit ? s + Number(rec.claimAmount || 0) : s;
      }, 0);
      claimsSum += codeClaims;
      details.push({ code, rentalDays, dailyRate: item?.dailyRate, monthlyRate: item?.monthlyRate, shippingFee: item?.shippingFee, modificationFee: item?.modificationFee, claims: codeClaims, rent: amount });
    });
    const currentReceivable = rentSum + shipSum + modSum - claimsSum;
    setCalcBreakdown({ rentSum, shipSum, modSum, claimsSum, currentReceivable, details });
    setCalcVisible(true);
  };
  // const screens = Grid.useBreakpoint();

  const [entryAttachModalOpen, setEntryAttachModalOpen] = useState(false);
  const [exitAttachModalOpen, setExitAttachModalOpen] = useState(false);
  const [currentEntryRecord, setCurrentEntryRecord] = useState<EntryRecord | null>(null);
  const [currentExitRecord, setCurrentExitRecord] = useState<ExitRecord | null>(null);
  const [entryEditOpen, setEntryEditOpen] = useState(false);
  const [exitEditOpen, setExitEditOpen] = useState(false);
  const [entryEditForm] = Form.useForm();
  const [exitEditForm] = Form.useForm();
  const [entryFileList, setEntryFileList] = useState<any[]>([]);
  const [exitFileList, setExitFileList] = useState<any[]>([]);

  const handleActionClick = (key: string) => {
    if (key === 'entry') {
      const tabKey = `order-entry-${order.id}`;
      openTab({
        key: tabKey,
        label: `进场：${order.projectName || order.contractNumber || order.customerName || order.id}`,
        content: <EntryOperationTab tabKey={tabKey} order={order} />
      });
      return;
    }
    if (key === 'exit') {
      const tabKey = `order-exit-${order.id}`;
      openTab({
        key: tabKey,
        label: `退场：${order.projectName || order.contractNumber || order.customerName || order.id}`,
        content: <ExitOperationTab tabKey={tabKey} order={order} />
      });
      return;
    }
    if (key === 'payment') {
      const tabKey = `order-payment-${order.id}`;
      openTab({
        key: tabKey,
        label: `收款：${order.projectName || order.contractNumber || order.customerName || order.id}`,
        content: <ReceiptOperationTab tabKey={tabKey} order={order} />
      });
      return;
    }
    if (key === 'refund') {
      const tabKey = `order-refund-${order.id}`;
      openTab({
        key: tabKey,
        label: `退款：${order.projectName || order.contractNumber || order.customerName || order.id}`,
        content: <RefundOperationTab tabKey={tabKey} order={order} />
      });
      return;
    }
    if (key === 'stop') {
      const tabKey = `order-suspension-${order.id}`;
      openTab({
        key: tabKey,
        label: `报停：${order.projectName || order.contractNumber || order.customerName || order.id}`,
        content: <SuspensionOperationTab tabKey={tabKey} order={order} />
      });
      return;
    }
    if (key === 'claim') {
      const tabKey = `order-claim-${order.id}`;
      openTab({
        key: tabKey,
        label: `索赔：${order.projectName || order.contractNumber || order.customerName || order.id}`,
        content: <ClaimOperationTab tabKey={tabKey} order={order} />
      });
      return;
    }
    if (key === 'settlement') {
      const tabKey = `order-settlement-${order.id}`;
      openTab({
        key: tabKey,
        label: `结算：${order.projectName || order.contractNumber || order.customerName || order.id}`,
              content: <SettlementTab tabKey={tabKey} order={order} />
      });
      return;
    }
    if (key === 'closing') {
      const tabKey = `order-clearance-${order.id}`;
      openTab({
        key: tabKey,
        label: `结清：${order.projectName || order.contractNumber || order.customerName || order.id}`,
        content: <ClearanceOperationTab tabKey={tabKey} order={order} />
      });
      return;
    }
    if (key === 'change') {
      message.info('变更功能暂未实现');
      return;
    }
    if (key === 'archive') {
      handleArchiveOrder(order);
      return;
    }
    if (key === 'delete') {
      preCheckAndConfirmDelete(order.id);
      return;
    }
  };

  const handleArchiveOrder = async (ord: Order) => {
    try {
      const updated = { ...ord, archivedAt: new Date().toISOString() };
      await dispatch(updateOrder(updated)).unwrap();
      message.success('订单已归档');
    } catch (error) {
      message.error('订单归档失败');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await dispatch(deleteOrder(orderId)).unwrap();
      message.success('订单删除成功');
      closeTab && closeTab(tabKey);
    } catch (error) {
      message.error('订单删除失败');
    }
  };

  // 权限判定与删除前预检查
  const { user: authUser } = useSelector((s: RootState) => s.auth);
  const roleFromLS = (() => { try { const u = localStorage.getItem('user'); return u ? (JSON.parse(u)?.role) : undefined; } catch { return undefined; } })();
  const permsFromLS = (() => { try { const u = localStorage.getItem('user'); return u ? (JSON.parse(u)?.permissions || []) : []; } catch { return []; } })();
  const userRole = authUser?.role ?? roleFromLS ?? '';
  const userPerms: string[] = (authUser?.permissions as any) || permsFromLS;
  const canDelete = userRole === 'superadmin' || (userPerms || []).includes('合同管理-删除');

  const preCheckAndConfirmDelete = async (orderId: string) => {
    if (!canDelete) {
      Modal.warning({ title: '无删除权限', content: '仅允许具有“合同管理-删除”权限的用户执行此操作' });
      return;
    }
    try {
      const check = await apiGet<{ ok: boolean; data?: any; error?: string }>(`/orders/${orderId}/delete-check`);
      if (!check?.ok || !check?.data) throw new Error(check?.error || '检查失败');
  const { contractNumber, contractName, associations } = check.data;
  // 修正类型：将值显式转为 number 后再求和，避免 reduce 泛型不匹配
  const total = Object.values(associations || {})
    .map(v => Number(v) || 0)
    .reduce((a, b) => a + b, 0);
      if (total > 0) {
        Modal.warning({
          title: '存在关联单据，禁止删除',
          content: (
            <div style={{ whiteSpace: 'pre-wrap' }}>
              {`合同编号：${contractNumber}\n合同名称：${contractName}`}
              <br />
              {`关联单据统计：进场(${associations.entries})、退场(${associations.exits})、收款(${associations.receipts})、退款(${associations.refunds})、报停(${associations.suspensions})、索赔(${associations.claims})、结算(${associations.settlements})、结清(${associations.clearances})`}
              <br />
              {'操作指引：请先删除上述所有关联单据后，再执行合同删除。'}
            </div>
          ),
        });
        return;
      }
      Modal.confirm({
        title: '确认要删除该订单吗？此操作不可撤销',
        okText: '确认删除',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: async () => {
          const now = Date.now();
          if (now - (deleteLockRef.current || 0) < 300) return;
          deleteLockRef.current = now;
          await handleDeleteOrder(orderId);
        },
      });
    } catch (e: any) {
      Modal.error({ title: '删除前检查失败', content: e?.message || '网络或服务器异常，请稍后重试' });
    }
  };

  // 保留原函数名以保持调用处兼容，内部转向预检查逻辑
  const confirmDeleteOrder = (orderId: string) => {
    preCheckAndConfirmDelete(orderId);
  };

  const operationMenuItems = [
    { key: 'entry', label: <Button size="small">进场</Button> },
    { key: 'exit', label: <Button size="small">退场</Button> },
    { key: 'payment', label: <Button size="small">收款</Button> },
    { key: 'refund', label: <Button size="small">退款</Button> },
    { key: 'stop', label: <Button size="small">报停</Button> },
    { key: 'claim', label: <Button size="small">索赔</Button> },
    { key: 'settlement', label: <Button size="small">结算</Button> },
    { key: 'closing', label: <Button size="small">结清</Button> },
    { key: 'change', label: <Button size="small">变更</Button> },
    {
      key: 'archive',
      label: (
        <Popconfirm
          title="确认归档该订单？"
          onConfirm={() => handleArchiveOrder(order)}
          okText="确定"
          cancelText="取消"
        >
          <Button size="small">归档</Button>
        </Popconfirm>
      )
    },
    {
      key: 'delete',
      label: (
        <Button
          size="small"
          type="primary"
          danger
          style={{ minWidth: 48, minHeight: 48 }}
          onClick={() => preCheckAndConfirmDelete(order.id)}
          disabled={!canDelete}
        >
          删除
        </Button>
      )
    },
  ];
  
  // 进场设备总数展示：优先读取订单状态中的累计进场数
  const entryEquipmentCountDisplay = useMemo(() => {
    const v = order.status?.entryCount;
    if (typeof v === 'number') return v;
    const countFromSummary = (summary?: string) => {
      if (!summary) return 0;
      return summary.split('；').reduce((sum, seg) => {
        const m = seg.match(/(\d+)\s*台/);
        return sum + (m ? Number(m[1]) : 0);
      }, 0);
    };
    return (order.entries || []).reduce(
      (sum, r) => sum + (r.equipmentCount != null ? r.equipmentCount : countFromSummary(r.equipmentSummary)),
      0,
    );
  }, [order.status?.entryCount, order.entries]);

  

  const header = (
    <Card variant="outlined" style={{ marginBottom: 12 }}>
      <Row align="middle" justify="space-between">
        <Col flex="auto">
          {/* 左上操作区：如需后续增加操作入口，请在此添加 */}
          <Space direction="vertical" size={6}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              合同名称：{order.customerName}/{order.projectName}
            </Typography.Title>
            <Space wrap>
              {(() => {
                const perf = order?.status?.performanceStatus ?? '履约';
                return (
                  <Tag color={perf === '履约' ? 'green' : 'red'}>{perf}</Tag>
                );
              })()}
              <Tag>合同编号：{order.contractNumber}</Tag>
              <Tag>进场设备数：{entryEquipmentCountDisplay}</Tag>
              <Tag>退场数量：{order?.status?.exitCount ?? 0}</Tag>
              <Tag color="blue">实收金额：¥{((order?.status?.actualReceivedAmount ?? 0).toLocaleString())}</Tag>
            </Space>
          </Space>
        </Col>
        <Col>
          <Space size={8} wrap>
            <Dropdown.Button
              type="primary"
              menu={{ items: operationMenuItems, onClick: ({ key }) => handleActionClick(key as string) }}
            >
              操作
            </Dropdown.Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );

  const equipmentColumns: ColumnsType<OrderEquipmentItem> = [
    { title: '设备类型', dataIndex: 'equipmentType', key: 'equipmentType' },
    { title: '高度', dataIndex: 'height', key: 'height' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity' },
    { title: '日租单价', dataIndex: 'dailyRate', key: 'dailyRate', render: (v: number) => `¥${(v||0).toLocaleString()}` },
    { title: '月租单价', dataIndex: 'monthlyRate', key: 'monthlyRate', render: (v: number) => `¥${(v||0).toLocaleString()}` },
    { title: '押金/台', dataIndex: 'deposit', key: 'deposit', render: (v: number) => `¥${(v||0).toLocaleString()}` },
    { title: '运费/台', dataIndex: 'shippingFee', key: 'shippingFee', render: (v: number) => `¥${(v||0).toLocaleString()}` },
    { title: '约定进场', dataIndex: 'scheduledEntryDate', key: 'scheduledEntryDate' },
    { title: '预计退场', dataIndex: 'estimatedExitDate', key: 'estimatedExitDate' },
  ];

  // 已进场设备（设备清单）列与数据：按需求显示合并属性
  interface EnteredEquipmentRow {
    code: string;
    customCode?: string;
    equipmentType?: string;
    model?: string;
    height?: string | number;
    isSublease?: boolean;
    rentalStatus: '在租' | '已退租';
    entryDate?: string;
    exitDate?: string;
  }

  const enteredEquipmentColumns: ColumnsType<EnteredEquipmentRow> = [
    { title: '序号', key: 'index', render: (_: any, __: EnteredEquipmentRow, index: number) => index + 1 },
    { title: '设备编号', key: 'displayCode', sorter: (a: EnteredEquipmentRow, b: EnteredEquipmentRow) => {
      const av = String((a.customCode || a.code || '')).trim();
      const bv = String((b.customCode || b.code || '')).trim();
      return av.localeCompare(bv);
    }, render: (_: any, r: EnteredEquipmentRow) => {
      const custom = String(r.customCode || '').trim();
      const code = String(r.code || '').trim();
      return custom || code || '—';
    } },
    { title: '设备类型', dataIndex: 'equipmentType', key: 'equipmentType', render: (v?: string) => v || '-', sorter: (a, b) => String(a.equipmentType || '').localeCompare(String(b.equipmentType || '')) },
    { title: '设备型号', dataIndex: 'model', key: 'model', render: (v?: string) => v || '-' },
    { title: '高度', dataIndex: 'height', key: 'height', render: (v?: string | number) => (v != null && v !== '' ? v : '-') },
    { title: '是否转租', key: 'sublease', render: (_: any, r: EnteredEquipmentRow) => (r.isSublease ? '是' : '否') },
    { title: '租赁状态', dataIndex: 'rentalStatus', key: 'rentalStatus' },
    { title: '进场日期/退场日期', key: 'entryExit', render: (_: any, r: EnteredEquipmentRow) => `${r.entryDate || '-'} / ${r.exitDate || '-'}` },
  ];

  const enteredEquipmentData = useMemo(() => {
    const items = order.equipmentItems || [];
    const rented = order.rentedEquipmentIds || [];
    const entryMap = order.entryAttachments || {};
    const exitMap = order.exitAttachments || {};

    const equipmentByCode = new Map((equipmentList || []).map((e: Equipment) => [e.code, e]));
    const rentedSet = new Set<string>((rented || []).flat());

    // 新增：纳入进/退场记录中的设备编码，确保显示“该订单下所有设备”
    const codesFromEntries = (order.entries || [])
      .flatMap(r => Array.isArray(r.equipmentCodes) ? r.equipmentCodes : [])
      .filter(Boolean);
    const codesFromExits = (order.exits || [])
      .flatMap(r => Array.isArray(r.equipmentCodes) ? r.equipmentCodes : [])
      .filter(Boolean);

    const unionCodes = new Set<string>();
    rentedSet.forEach(code => unionCodes.add(code));
    Object.keys(entryMap || {}).forEach(code => unionCodes.add(code));
    Object.keys(exitMap || {}).forEach(code => unionCodes.add(code));
    codesFromEntries.forEach(code => unionCodes.add(code));
    codesFromExits.forEach(code => unionCodes.add(code));

    const entryDates = (order.entries || []).map(r => r.entryDate).filter(Boolean) as string[];
    const exitDates = (order.exits || []).map(r => r.exitDate).filter(Boolean) as string[];
    const overallEntryDate = entryDates.length ? entryDates.slice().sort()[0] : undefined;
    const overallExitDateLatest = exitDates.length ? exitDates.slice().sort().slice(-1)[0] : undefined;

    const rows: EnteredEquipmentRow[] = [];
    unionCodes.forEach(code => {
      const eq = equipmentByCode.get(code);
      const inRent = rentedSet.has(code);
      // 高度优先取设备库，其次取需求项对应高度
      const demandIndex = (rented || []).findIndex(arr => (arr || []).includes(code));
      const fallbackHeight = demandIndex >= 0 ? items?.[demandIndex]?.height : undefined;
      rows.push({
        code,
        customCode: eq?.customCode ?? '-',
        equipmentType: eq?.type ?? (items?.[demandIndex]?.equipmentType ?? '-'),
        model: eq?.model ?? '-',
        height: eq?.height ?? fallbackHeight ?? '-',
        isSublease: eq?.source === 'sublease',
        rentalStatus: inRent ? '在租' : '已退租',
        entryDate: overallEntryDate,
        exitDate: inRent ? undefined : overallExitDateLatest,
      });
    });
    return rows;
  }, [order.equipmentItems, order.rentedEquipmentIds, order.entryAttachments, order.exits, order.entries, order.exitAttachments, equipmentList]);

  

  // 进/退场记录操作
  const onEntryRowAction = async (action: string, record: EntryRecord) => {
    if (action === 'attach') {
      setCurrentEntryRecord(record);
      setEntryFileList((record.attachments || []).map((f: any) => ({ ...f })));
      setEntryAttachModalOpen(true);
      return;
    }
    if (action === 'download') {
      message.info('下载进场单：暂未实现导出PDF，后续支持');
      return;
    }
    if (action === 'edit') {
      setCurrentEntryRecord(record);
      setEntryEditOpen(true);
      // 初始化编辑表单
      entryEditForm.setFieldsValue({
        transportMethod: record.transportMethod,
        businessManagerName: record.businessManagerName,
        handoverPerson: record.handoverPerson,
      });
      return;
    }
    if (action === 'delete') {
      Modal.confirm({
        title: '确认删除进场记录？',
        content: '删除后不可恢复。',
        okText: '删除',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            const nextEntries = (order.entries || []).filter(r => r.id !== record.id);
            const countFromSummary = (summary?: string) => {
              if (!summary) return 0;
              return summary.split('；').reduce((sum, seg) => {
                const m = seg.match(/(\d+)\s*台/);
                return sum + (m ? Number(m[1]) : 0);
              }, 0);
            };
            const nextEntryCount = nextEntries.reduce((sum, r) => sum + (r.equipmentCount != null ? r.equipmentCount : countFromSummary(r.equipmentSummary)), 0);
            const updated = { ...order, entries: nextEntries, status: { ...order.status, entryCount: nextEntryCount } };
            await dispatch(updateOrder(updated)).unwrap();
            message.success('进场记录已删除');
          } catch (e) {
            message.error('删除进场记录失败');
          }
        },
      });
      return;
    }
  };

  const onExitRowAction = async (action: string, record: ExitRecord) => {
    if (action === 'attach') {
      setCurrentExitRecord(record);
      setExitFileList((record.attachments || []).map((f: any) => ({ ...f })));
      setExitAttachModalOpen(true);
      return;
    }
    if (action === 'download') {
      message.info('下载退场单：暂未实现导出PDF，后续支持');
      return;
    }
    if (action === 'edit') {
      setCurrentExitRecord(record);
      setExitEditOpen(true);
      exitEditForm.setFieldsValue({
        transportMethod: record.transportMethod,
        businessManagerName: record.businessManagerName,
        handoverPerson: record.handoverPerson,
      });
      return;
    }
    if (action === 'delete') {
      Modal.confirm({
        title: '确认删除退场记录？',
        content: '删除后不可恢复。',
        okText: '删除',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            const nextExits = (order.exits || []).filter(r => r.id !== record.id);
            const updated = { ...order, exits: nextExits, status: { ...order.status, exitCount: nextExits.length } };
            await dispatch(updateOrder(updated)).unwrap();
            message.success('退场记录已删除');
          } catch (e) {
            message.error('删除退场记录失败');
          }
        },
      });
      return;
    }
  };

  const entryColumns: ColumnsType<EntryRecord> = [
    { title: '序号', key: 'index', render: (_, __, index) => index + 1, width: 80 },
    { title: '进场单号', dataIndex: 'entryNumber', key: 'entryNumber' },
    { title: '进场日期', dataIndex: 'entryDate', key: 'entryDate', sorter: (a, b) => (a.entryDate || '').localeCompare(b.entryDate || '') },
    { title: '进场设备编号', key: 'equipmentCodes', render: (_, r) => {
      const codes = r.equipmentCodes || [];
      if (!codes.length) return '—';
      // 优先使用后端返回的 equipmentDetails 显示自编码
      const details = (r as any).equipmentDetails || [];
      if (Array.isArray(details) && details.length) {
        return details
          .map((d: any) => {
            const val = String(d?.customCode ?? d?.code ?? '').trim();
            return val || '—';
          })
          .join('/');
      }
      // 兜底：使用设备列表映射出自编码
      const eqMap = new Map((equipmentList || []).map((e: Equipment) => [e.code, e]));
      const displayList = codes.map(code => {
        const eq = eqMap.get(code);
        const custom = String(eq?.customCode || '').trim();
        const base = String(code || '').trim();
        return (custom || base || '—');
      });
      return displayList.join('/');
    } },
    { title: '运输方式', dataIndex: 'transportMethod', key: 'transportMethod' },
    { title: '业务负责人', dataIndex: 'businessManagerName', key: 'businessManagerName' },
    { title: '交机人', dataIndex: 'handoverPerson', key: 'handoverPerson' },
    { title: '物流车辆', dataIndex: 'vehiclePlate', key: 'vehiclePlate' },
    { title: '司机', key: 'driver', render: (_, r) => (r.driverName ? `${r.driverName}${r.driverPhone ? ' / ' + r.driverPhone : ''}` : '—') },
    { title: '物流公司', dataIndex: 'companyName', key: 'companyName' },
    { title: '物流成本', dataIndex: 'logisticsCost', key: 'logisticsCost', render: (v?: number) => (v != null ? `¥${(v||0).toLocaleString()}` : '—') },
    { title: '操作', key: 'action', render: (_, record) => (
      <Dropdown.Button
        size="small"
        menu={{
          items: [
            { key: 'attach', label: '附件上传/查看' },
            { key: 'download', label: '下载进场单' },
            { key: 'edit', label: '修改信息' },
            { key: 'delete', label: '删除记录' },
          ],
          onClick: ({ key }) => onEntryRowAction(key as string, record),
        }}
      >操作</Dropdown.Button>
    ) },
  ];

  const exitColumns: ColumnsType<ExitRecord> = [
    { title: '序号', key: 'index', render: (_, __, index) => index + 1, width: 80 },
    { title: '退场单号', dataIndex: 'exitNumber', key: 'exitNumber' },
    { title: '退场日期', dataIndex: 'exitDate', key: 'exitDate', sorter: (a, b) => (a.exitDate || '').localeCompare(b.exitDate || '') },
    { title: '退场设备编号', key: 'equipmentCodes', render: (_, r) => {
      const codes = r.equipmentCodes || [];
      if (!codes.length) return '—';
      // 优先使用后端返回的 equipmentDetails 显示自编码
      const details = (r as any).equipmentDetails || [];
      if (Array.isArray(details) && details.length) {
        return details
          .map((d: any) => {
            const val = String(d?.customCode ?? d?.code ?? '').trim();
            return val || '—';
          })
          .join('/');
      }
      // 兜底：使用设备列表映射出自编码
      const eqMap = new Map((equipmentList || []).map((e: Equipment) => [e.code, e]));
      const displayList = codes.map(code => {
        const eq = eqMap.get(code);
        const custom = String(eq?.customCode || '').trim();
        const base = String(code || '').trim();
        return (custom || base || '—');
      });
      return displayList.join('/');
    } },
    { title: '运输方式', dataIndex: 'transportMethod', key: 'transportMethod' },
    { title: '业务负责人', dataIndex: 'businessManagerName', key: 'businessManagerName' },
    { title: '交机人', dataIndex: 'handoverPerson', key: 'handoverPerson' },
    { title: '物流车辆', dataIndex: 'vehiclePlate', key: 'vehiclePlate' },
    { title: '司机', key: 'driver', render: (_, r) => (r.driverName ? `${r.driverName}${r.driverPhone ? ' / ' + r.driverPhone : ''}` : '—') },
    { title: '物流公司', dataIndex: 'companyName', key: 'companyName' },
    { title: '物流成本', dataIndex: 'logisticsCost', key: 'logisticsCost', render: (v?: number) => (v != null ? `¥${(v||0).toLocaleString()}` : '—') },
    { title: '操作', key: 'action', render: (_, record) => (
      <Dropdown.Button
        size="small"
        menu={{
          items: [
            { key: 'attach', label: '附件上传/查看' },
            { key: 'download', label: '下载退场单' },
            { key: 'edit', label: '修改信息' },
            { key: 'delete', label: '删除记录' },
          ],
          onClick: ({ key }) => onExitRowAction(key as string, record),
        }}
      >操作</Dropdown.Button>
    ) },
  ];

  // 收/退款筛选与数据
  const [receiptFilterMethod, setReceiptFilterMethod] = useState<string>('');
  const [receiptFilterRange, setReceiptFilterRange] = useState<[string | null, string | null]>([null, null]);
  const filteredReceipts = useMemo(() => {
    const list = order.receipts || [];
    return list.filter(r => {
      const methodOk = !receiptFilterMethod || r.paymentMethod === receiptFilterMethod;
      const d = r.receiptDate || '';
      const startOk = !receiptFilterRange[0] || d >= (receiptFilterRange[0] as string);
      const endOk = !receiptFilterRange[1] || d <= (receiptFilterRange[1] as string);
      return methodOk && startOk && endOk;
    });
  }, [order.receipts, receiptFilterMethod, receiptFilterRange]);

  const [refundFilterMethod, setRefundFilterMethod] = useState<string>('');
  const [refundFilterRange, setRefundFilterRange] = useState<[string | null, string | null]>([null, null]);
  const filteredRefunds = useMemo(() => {
    const list = (order as any).refunds || [];
    return list.filter((r: any) => {
      const methodOk = !refundFilterMethod || r.paymentMethod === refundFilterMethod;
      const d = r.refundDate || '';
      const startOk = !refundFilterRange[0] || d >= (refundFilterRange[0] as string);
      const endOk = !refundFilterRange[1] || d <= (refundFilterRange[1] as string);
      return methodOk && startOk && endOk;
    });
  }, [order, refundFilterMethod, refundFilterRange]);

  const basicInfo = (
    <Space direction="vertical" style={{ width: '100%' }} size={12}>
      <Card title="结算信息" size="small">
        <Row gutter={[16, 8]}>
          <Col xs={24} md={8}><Descriptions column={1} bordered={false} size="small"><Descriptions.Item label="月计费方式">{order.monthCalculationMethod}</Descriptions.Item></Descriptions></Col>
          <Col xs={24} md={8}><Descriptions column={1} bordered={false} size="small"><Descriptions.Item label="支付方式">{order.paymentAgreement}</Descriptions.Item></Descriptions></Col>
          <Col xs={24} md={8}><Descriptions column={1} bordered={false} size="small"><Descriptions.Item label="运费减免">{order.shippingFeeReduction}</Descriptions.Item></Descriptions></Col>
          <Col xs={24} md={8}><Descriptions column={1} bordered={false} size="small"><Descriptions.Item label="运费计费方式">{order.shippingFeeCalculation}</Descriptions.Item></Descriptions></Col>
          <Col xs={24} md={8}><Descriptions column={1} bordered={false} size="small"><Descriptions.Item label="开票类型">{order.isTaxInvoice}</Descriptions.Item></Descriptions></Col>
          <Col xs={24} md={8}><Descriptions column={1} bordered={false} size="small"><Descriptions.Item label="发票税额">{order.invoiceTaxRate ?? '-'}</Descriptions.Item></Descriptions></Col>
        </Row>
      </Card>

      <Card title="项目信息" size="small">
        <Row gutter={[16, 8]}>
          <Col xs={24} md={8}><Descriptions column={1} bordered={false} size="small"><Descriptions.Item label="项目名称">{order.projectName}</Descriptions.Item></Descriptions></Col>
          <Col xs={24} md={8}><Descriptions column={1} bordered={false} size="small"><Descriptions.Item label="交机地点">{order.deliveryLocation}</Descriptions.Item></Descriptions></Col>
          <Col xs={24} md={8}><Descriptions column={1} bordered={false} size="small"><Descriptions.Item label="施工类别">{order.constructionCategory}</Descriptions.Item></Descriptions></Col>
          <Col xs={24} md={24}><Descriptions column={1} bordered={false} size="small"><Descriptions.Item label="其他约定">{order.otherAgreements || '-'}</Descriptions.Item></Descriptions></Col>
        </Row>
      </Card>

      <Card title="电子签章" size="small">
        <Row gutter={[16, 8]}>
          <Col xs={24} md={8}><Descriptions column={1} bordered={false} size="small"><Descriptions.Item label="签署方">{order.customerName}</Descriptions.Item></Descriptions></Col>
          <Col xs={24} md={8}><Descriptions column={1} bordered={false} size="small"><Descriptions.Item label="签署进度">{order.archivedAt ? '已归档' : '进行中'}</Descriptions.Item></Descriptions></Col>
          <Col xs={24} md={8}><Descriptions column={1} bordered={false} size="small"><Descriptions.Item label="操作">{order.archivedAt ? '—' : '详情'}</Descriptions.Item></Descriptions></Col>
        </Row>
      </Card>

      <Card title="设备需求" size="small">
        <Table<OrderEquipmentItem>
          size="small"
          rowKey={(r) => r.id}
          columns={equipmentColumns}
          dataSource={order.equipmentItems || []}
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
      </Card>

    </Space>
  );

  // 附件上传/查看模态 - 进场
  const EntryAttachModal = (
    <Modal
      title="进场附件上传/查看"
      open={entryAttachModalOpen}
      onCancel={() => setEntryAttachModalOpen(false)}
      onOk={async () => {
        try {
          if (!currentEntryRecord) return;
          const next = (order.entries || []).map(r => r.id === currentEntryRecord.id ? { ...r, attachments: entryFileList.map((f: any) => ({ uid: f.uid, name: f.name, type: f.type, size: f.size })) } : r);
          const updated = { ...order, entries: next };
          await dispatch(updateOrder(updated)).unwrap();
          message.success('进场附件已更新');
          setEntryAttachModalOpen(false);
        } catch {
          message.error('更新进场附件失败');
        }
      }}
      okText="保存"
      cancelText="取消"
    >
      <Upload fileList={entryFileList} onChange={({ fileList }) => setEntryFileList(fileList)} beforeUpload={() => false} onRemove={(file) => new Promise((resolve) => {
        Modal.confirm({
          title: '确认删除该附件？',
          content: `附件 ${file.name || ''} 将被移除。`,
          okText: '删除',
          cancelText: '取消',
          okButtonProps: { danger: true },
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      })}>
        <Button icon={<UploadOutlined />}>上传附件</Button>
      </Upload>
    </Modal>
  );

  // 附件上传/查看模态 - 退场
  const ExitAttachModal = (
    <Modal
      title="退场附件上传/查看"
      open={exitAttachModalOpen}
      onCancel={() => setExitAttachModalOpen(false)}
      onOk={async () => {
        try {
          if (!currentExitRecord) return;
          const next = (order.exits || []).map(r => r.id === currentExitRecord.id ? { ...r, attachments: exitFileList.map((f: any) => ({ uid: f.uid, name: f.name, type: f.type, size: f.size })) } : r);
          const updated = { ...order, exits: next };
          await dispatch(updateOrder(updated)).unwrap();
          message.success('退场附件已更新');
          setExitAttachModalOpen(false);
        } catch {
          message.error('更新退场附件失败');
        }
      }}
      okText="保存"
      cancelText="取消"
    >
      <Upload fileList={exitFileList} onChange={({ fileList }) => setExitFileList(fileList)} beforeUpload={() => false} onRemove={(file) => new Promise((resolve) => {
        Modal.confirm({
          title: '确认删除该附件？',
          content: `附件 ${file.name || ''} 将被移除。`,
          okText: '删除',
          cancelText: '取消',
          okButtonProps: { danger: true },
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      })}>
        <Button icon={<UploadOutlined />}>上传附件</Button>
      </Upload>
    </Modal>
  );

  // 编辑模态 - 进场
  const EntryEditModal = (
    <Modal
      title="修改进场记录"
      open={entryEditOpen}
      onCancel={() => setEntryEditOpen(false)}
      onOk={async () => {
        try {
          const v = await entryEditForm.validateFields();
          if (!currentEntryRecord) return;
          const next = (order.entries || []).map(r => r.id === currentEntryRecord.id ? { ...r, transportMethod: v.transportMethod, businessManagerName: v.businessManagerName, handoverPerson: v.handoverPerson } : r);
          const updated = { ...order, entries: next };
          await dispatch(updateOrder(updated)).unwrap();
          message.success('进场记录已更新');
          setEntryEditOpen(false);
        } catch {
          message.error('更新进场记录失败');
        }
      }}
      okText="保存"
      cancelText="取消"
    >
      <Form form={entryEditForm} layout="vertical">
        <Form.Item name="transportMethod" label="运输方式" rules={[{ required: true, message: '请选择运输方式' }]}> 
          <Select placeholder="请选择运输方式"> 
            <Select.Option value="客户自提">客户自提</Select.Option> 
            <Select.Option value="我方物流">我方物流</Select.Option> 
            <Select.Option value="第三方物流">第三方物流</Select.Option> 
          </Select> 
        </Form.Item>
        <Form.Item name="businessManagerName" label="业务负责人" rules={[{ required: true, message: '请输入业务负责人' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="handoverPerson" label="交机人" rules={[{ required: true, message: '请输入交机人' }]}>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );

  // 编辑模态 - 退场
  const ExitEditModal = (
    <Modal
      title="修改退场记录"
      open={exitEditOpen}
      onCancel={() => setExitEditOpen(false)}
      onOk={async () => {
        try {
          const v = await exitEditForm.validateFields();
          if (!currentExitRecord) return;
          const next = (order.exits || []).map(r => r.id === currentExitRecord.id ? { ...r, transportMethod: v.transportMethod, businessManagerName: v.businessManagerName, handoverPerson: v.handoverPerson } : r);
          const updated = { ...order, exits: next };
          await dispatch(updateOrder(updated)).unwrap();
          message.success('退场记录已更新');
          setExitEditOpen(false);
        } catch {
          message.error('更新退场记录失败');
        }
      }}
      okText="保存"
      cancelText="取消"
    >
      <Form form={exitEditForm} layout="vertical">
        <Form.Item name="transportMethod" label="运输方式" rules={[{ required: true, message: '请选择运输方式' }]}> 
          <Select placeholder="请选择运输方式"> 
            <Select.Option value="客户自提">客户自提</Select.Option> 
            <Select.Option value="我方物流">我方物流</Select.Option> 
            <Select.Option value="第三方物流">第三方物流</Select.Option> 
          </Select> 
        </Form.Item>
        <Form.Item name="businessManagerName" label="业务负责人" rules={[{ required: true, message: '请输入业务负责人' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="handoverPerson" label="交机人" rules={[{ required: true, message: '请输入交机人' }]}>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );

  return (
    <div style={{ padding: 12 }}>
      {header}
      <Tabs
        items={[
          { key: 'basic', label: '基本信息', children: basicInfo },
          { key: 'entryExit', label: '进退场', children: (
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              {/* 进场区域 */}
              <Card title="进场记录" size="small" styles={{ body: { background: '#f0f5ff' } }}>
                <Table<EntryRecord>
                  size="small"
                  rowKey={(r) => r.id}
                  columns={entryColumns}
                  dataSource={(order.entries || []).slice().sort((a, b) => (a.entryDate || '').localeCompare(b.entryDate || ''))}
                  pagination={{ pageSize: 5 }}
                />
              </Card>
              {/* 退场区域 */}
              <Card title="退场记录" size="small" styles={{ body: { background: '#fff7e6' } }}>
                <Table<ExitRecord>
                  size="small"
                  rowKey={(r) => r.id}
                  columns={exitColumns}
                  dataSource={(order.exits || []).slice().sort((a, b) => (a.exitDate || '').localeCompare(b.exitDate || ''))}
                  pagination={{ pageSize: 5 }}
                />
              </Card>
              {/* 模态窗口 */}
              {EntryAttachModal}
              {ExitAttachModal}
              {EntryEditModal}
              {ExitEditModal}
            </Space>
          ) },
          { key: 'receipts', label: '收退款', children: (
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Card size="small" title="收款记录" extra={(
                <Space>
                  <Select
                    placeholder="收款方式"
                    style={{ width: 120 }}
                    value={receiptFilterMethod}
                    onChange={setReceiptFilterMethod}
                  >
                    <Select.Option value="">全部</Select.Option>
                    <Select.Option value="二维码">二维码</Select.Option>
                    <Select.Option value="微信">微信</Select.Option>
                    <Select.Option value="支付宝">支付宝</Select.Option>
                    <Select.Option value="公账">公账</Select.Option>
                    <Select.Option value="银行卡">银行卡</Select.Option>
                  </Select>
                  <DatePicker.RangePicker
                    onChange={(vals) => setReceiptFilterRange([
                      vals?.[0]?.format('YYYY-MM-DD') || null,
                      vals?.[1]?.format('YYYY-MM-DD') || null,
                    ])}
                  />
                </Space>
              )}>
                <Table size="small" rowKey={(r: any) => r.id} columns={[
                  { title: '收款单号', dataIndex: 'receiptNumber', key: 'receiptNumber' },
                  { title: '收款日期', dataIndex: 'receiptDate', key: 'receiptDate' },
                  { title: '收款方式', dataIndex: 'paymentMethod', key: 'paymentMethod' },
                  { title: '金额', dataIndex: 'amount', key: 'amount', render: (v: number) => `¥${(v||0).toLocaleString()}` },
                ] as any} dataSource={filteredReceipts} pagination={{ pageSize: 5 }} />
              </Card>
              <Card size="small" title="退款记录" extra={(
                <Space>
                  <Select
                    placeholder="退款方式"
                    style={{ width: 120 }}
                    value={refundFilterMethod}
                    onChange={setRefundFilterMethod}
                  >
                    <Select.Option value="">全部</Select.Option>
                    <Select.Option value="二维码">二维码</Select.Option>
                    <Select.Option value="微信">微信</Select.Option>
                    <Select.Option value="支付宝">支付宝</Select.Option>
                    <Select.Option value="公账">公账</Select.Option>
                    <Select.Option value="银行卡">银行卡</Select.Option>
                  </Select>
                  <DatePicker.RangePicker
                    onChange={(vals) => setRefundFilterRange([
                      vals?.[0]?.format('YYYY-MM-DD') || null,
                      vals?.[1]?.format('YYYY-MM-DD') || null,
                    ])}
                  />
                </Space>
              )}>
                <Table size="small" rowKey={(r: any) => r.id} columns={[
                  { title: '退款单号', dataIndex: 'refundNumber', key: 'refundNumber' },
                  { title: '退款日期', dataIndex: 'refundDate', key: 'refundDate' },
                  { title: '退款方式', dataIndex: 'paymentMethod', key: 'paymentMethod' },
                  { title: '金额', dataIndex: 'amount', key: 'amount', render: (v: number) => `¥${(v||0).toLocaleString()}` },
                ] as any} dataSource={(filteredRefunds as any[])} pagination={{ pageSize: 5 }} />
              </Card>
            </Space>
          ) },
          { key: 'settlement', label: '结算', children: (
            <Card size="small" title="结算记录" extra={(
              <Space>
                <Button onClick={() => dispatch(fetchOrderById(orderId))}>刷新</Button>
                <Button onClick={() => setSettlementDetailExpanded(v => !v)}>{settlementDetailExpanded ? '收起明细' : '展开明细'}</Button>
              </Space>
            )}>
              <Table
                size="small"
                rowKey={(r: any) => r.id}
                columns={[
                  { title: '结算单号', dataIndex: 'settlementNumber', key: 'settlementNumber' },
                  { title: '结算周期', key: 'cycle', render: (_: any, r: any) => `${fmtDateTime(r.cycleStartDate)} 至 ${fmtDateTime(r.cycleEndDate, { isEnd: true })}` },
                  { title: '生成日期', key: 'createdAt', render: (_: any, r: any) => (r.createdAt ? dayjs(r.createdAt).format('YYYY-MM-DD HH:mm:ss') : '—') },
                  { title: '结算金额', dataIndex: 'settlementAmount', key: 'settlementAmount', render: (v: number, r: any) => (
                    <Tooltip title="查看详细计算过程">
                      <Button type="link" onClick={() => openCalc(r)}>{fmtCurrency(v)}</Button>
                    </Tooltip>
                  ) },
                  { title: '对账状态', dataIndex: 'status', key: 'status', render: (s: string) => (<Tag color={statusColor(s)}>{s || '待对账'}</Tag>) },
                  { title: '操作', key: 'op', render: (_: any, r: any) => (
                    <Button type="link" onClick={() => { setSettlementDetailRecord(r); setSettlementDetailVisible(true); }}>{settlementDetailExpanded ? '隐藏详情' : '查看详情'}</Button>
                  ) },
                ] as any}
                dataSource={order.settlements || []}
                pagination={{ pageSize: 5 }}
              />
              {settlementDetailExpanded && settlementDetailRecord ? (
                <Collapse defaultActiveKey={['info']} style={{ marginTop: 12 }}>
                  <Collapse.Panel header="结算明细信息" key="info">
                    <Row gutter={[12, 12]}>
                      <Col xs={24} md={12}>
                        <Space direction="vertical" size={4}>
                          <Typography.Text type="secondary">结算单号</Typography.Text>
                          <Typography.Text>{settlementDetailRecord.settlementNumber}</Typography.Text>
                        </Space>
                      </Col>
                      <Col xs={24} md={12}>
                        <Space direction="vertical" size={4}>
                          <Typography.Text type="secondary">对账状态</Typography.Text>
                          <Tag color={statusColor(settlementDetailRecord.status)}>{settlementDetailRecord.status || '待对账'}</Tag>
                        </Space>
                      </Col>
                      <Col xs={24} md={12}>
                        <Space direction="vertical" size={4}>
                          <Typography.Text type="secondary">结算周期</Typography.Text>
                          <Typography.Text>{`${fmtDateTime(settlementDetailRecord.cycleStartDate)} 至 ${fmtDateTime(settlementDetailRecord.cycleEndDate, { isEnd: true })}`}</Typography.Text>
                        </Space>
                      </Col>
                      <Col xs={24} md={12}>
                        <Space direction="vertical" size={4}>
                          <Typography.Text type="secondary">生成日期</Typography.Text>
                          <Typography.Text>{fmtDateTime(settlementDetailRecord.createdAt)}</Typography.Text>
                        </Space>
                      </Col>
                      <Col xs={24} md={12}>
                        <Space direction="vertical" size={4}>
                          <Typography.Text type="secondary">结算日期</Typography.Text>
                          <Typography.Text>{fmtDateTime(settlementDetailRecord.settlementDate)}</Typography.Text>
                        </Space>
                      </Col>
                      <Col xs={24} md={12}>
                        <Space direction="vertical" size={4}>
                          <Typography.Text type="secondary">备注</Typography.Text>
                          <Typography.Text>{settlementDetailRecord.remark || '—'}</Typography.Text>
                        </Space>
                      </Col>
                      <Col span={24}>
                        <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Space direction="vertical" size={4}>
                            <Typography.Text type="secondary">总金额</Typography.Text>
                            <Typography.Title level={4} style={{ margin: 0 }}>{fmtCurrency(settlementDetailRecord.settlementAmount)}</Typography.Title>
                          </Space>
                          <Space>
                            <Button onClick={() => openCalc(settlementDetailRecord)} type="primary">查看计算过程</Button>
                          </Space>
                        </Space>
                      </Col>
                      <Col span={24}>
                        {(() => {
                          const { anomalies } = validateSettlementRecord(settlementDetailRecord);
                          return anomalies.length ? <Tag color="red">异常数据：{anomalies.join('，')}</Tag> : <Tag color="green">数据正常</Tag>;
                        })()}
                      </Col>
                    </Row>
                  </Collapse.Panel>
                </Collapse>
              ) : null}
            </Card>
          ) },
          { key: 'equipment', label: '设备清单', children: (
            <Card size="small">
              <Table
                size="small"
                rowKey={(r: any) => r.code}
                columns={enteredEquipmentColumns as any}
                dataSource={enteredEquipmentData}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 'max-content' }}
              />
            </Card>
          ) },
        ]}
      />
      <Modal
        open={settlementDetailVisible}
        onCancel={() => { setSettlementDetailVisible(false); setSettlementDetailRecord(null); }}
        footer={null}
        title="结算详情"
      >
        {settlementDetailRecord ? (
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Card size="small">
              <Row gutter={[12, 12]} align="middle">
                <Col xs={24} md={12}>
                  <Space direction="vertical" size={4}>
                    <Typography.Text type="secondary">结算单号</Typography.Text>
                    <Typography.Title level={4} style={{ margin: 0 }}>{settlementDetailRecord.settlementNumber}</Typography.Title>
                  </Space>
                </Col>
                <Col xs={12} md={6}>
                  <Space direction="vertical" size={4}>
                    <Typography.Text type="secondary">金额</Typography.Text>
                    <Typography.Title level={4} style={{ margin: 0 }}>{fmtCurrency(Number(settlementDetailRecord.settlementAmount || 0))}</Typography.Title>
                  </Space>
                </Col>
                <Col xs={12} md={6} style={{ textAlign: 'right' }}>
                  <Space direction="vertical" size={4} style={{ width: '100%', alignItems: 'flex-end' }}>
                    <Typography.Text type="secondary">对账状态</Typography.Text>
                    <Tag color={statusColor(settlementDetailRecord.status)}>{settlementDetailRecord.status || '待对账'}</Tag>
                  </Space>
                </Col>
              </Row>
            </Card>

            <Card size="small">
              <Row gutter={[12, 12]}>
                <Col xs={24} md={12}>
                  <Space direction="vertical" size={4}>
                    <Typography.Text type="secondary">结算周期</Typography.Text>
                    <Typography.Text>
                      {(settlementDetailRecord.cycleStartDate || '—')} 至 {(settlementDetailRecord.cycleEndDate || '—')}
                    </Typography.Text>
                  </Space>
                </Col>
                <Col xs={24} md={12}>
                  <Space direction="vertical" size={4}>
                    <Typography.Text type="secondary">生成日期</Typography.Text>
                    <Typography.Text>
                      {settlementDetailRecord.createdAt ? dayjs(settlementDetailRecord.createdAt).format('YYYY-MM-DD HH:mm:ss') : '—'}
                    </Typography.Text>
                  </Space>
                </Col>
                <Col xs={24} md={12}>
                  <Space direction="vertical" size={4}>
                    <Typography.Text type="secondary">结算日期</Typography.Text>
                    <Typography.Text>{fmtDateTime(settlementDetailRecord.settlementDate)}</Typography.Text>
                  </Space>
                </Col>
                <Col xs={24} md={12}>
                  <Space direction="vertical" size={4}>
                    <Typography.Text type="secondary">备注</Typography.Text>
                    <Typography.Text>{settlementDetailRecord.remark || '—'}</Typography.Text>
                  </Space>
                </Col>
              </Row>
            </Card>
          </Space>
        ) : null}
      </Modal>
      <Modal
        open={calcVisible}
        onCancel={() => setCalcVisible(false)}
        footer={null}
        title="详细计算过程"
      >
        {calcBreakdown ? (
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            <Card size="small">
              <Space direction="vertical">
                <Typography.Text>租金合计：{fmtCurrency(calcBreakdown.rentSum)}</Typography.Text>
                <Typography.Text>运费合计：{fmtCurrency(calcBreakdown.shipSum)}</Typography.Text>
                <Typography.Text>改装费合计：{fmtCurrency(calcBreakdown.modSum)}</Typography.Text>
                <Typography.Text>索赔扣减合计：{fmtCurrency(calcBreakdown.claimsSum)}</Typography.Text>
                <Typography.Text strong>本期结算金额：{fmtCurrency(calcBreakdown.currentReceivable)}</Typography.Text>
              </Space>
            </Card>
            <Card size="small" title="设备明细">
              <Table
                size="small"
                rowKey={(r: any) => r.code}
                columns={[
                  { title: '设备编码', dataIndex: 'code', key: 'code' },
                  { title: '租金天数', dataIndex: 'rentalDays', key: 'rentalDays' },
                  { title: '日租', dataIndex: 'dailyRate', key: 'dailyRate', render: (v: number) => fmtCurrency(v) },
                  { title: '月租', dataIndex: 'monthlyRate', key: 'monthlyRate', render: (v: number) => fmtCurrency(v) },
                  { title: '运费', dataIndex: 'shippingFee', key: 'shippingFee', render: (v: number) => fmtCurrency(v) },
                  { title: '改装费', dataIndex: 'modificationFee', key: 'modificationFee', render: (v: number) => fmtCurrency(v) },
                  { title: '索赔扣减', dataIndex: 'claims', key: 'claims', render: (v: number) => fmtCurrency(v) },
                  { title: '租金小计', dataIndex: 'rent', key: 'rent', render: (v: number) => fmtCurrency(v) },
                ] as any}
                dataSource={calcBreakdown.details || []}
                pagination={{ pageSize: 5 }}
              />
            </Card>
          </Space>
        ) : null}
      </Modal>
    </div>
  );
};

export default OrderDetailTab;