import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Form, Input, DatePicker, Button, Row, Col, Typography, message, Table, Card, Space, Modal, Checkbox, Descriptions, Divider, Statistic, Tag } from 'antd';
import { 
  FileTextOutlined, 
  CalendarOutlined, 
  CalculatorOutlined,
  DollarOutlined,
  CreditCardOutlined,
  WalletOutlined,
  AccountBookOutlined,
  RiseOutlined,
  FallOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '../../../app/store';
import type { Equipment } from '../../equipment/equipmentslice';
import { selectEquipmentList, fetchEquipmentsStart, fetchEquipmentsSuccess, fetchEquipmentsFailure } from '../../equipment/equipmentslice';
import { Order, SettlementRecord, SuspensionRecord, ClaimRecord, EntryRecord, ExitRecord } from '../types';
import { addSettlement, updateSettlement, fetchOrderById, selectOrderById } from '../ordersSlice';
import { useTabs } from '../../common/TabsContext';
import { printElement, exportElementAsPdf } from '../../templates/templateEngine';
import { calculateRentWithAudit, PricingLogEntry } from '../pricing';
import { apiGet } from '../../../api/client';

const { Text, Title } = Typography;

interface Props {
  order?: Order;
  orderId?: string;
  tabKey: string;
  editRecord?: any; // 编辑模式时传入的现有结算记录
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

const SettlementTab: React.FC<Props> = ({ order: initialOrder, orderId: propOrderId, tabKey, editRecord }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { closeTab } = useTabs();
  const [form] = Form.useForm();
  const previewRef = useRef<HTMLDivElement>(null);
  const auditRef = useRef<Record<string, PricingLogEntry[]>>({});

  // 确定有效的 orderId
  const effectiveOrderId = propOrderId || initialOrder?.id;
  
  // 编辑模式：使用现有记录的结算单号，否则生成新的
  const settlementNumber = useMemo(() => {
    return editRecord?.settlementNumber || generateSettlementNumber();
  }, [editRecord]);
  
  const equipmentList = useSelector(selectEquipmentList);
  const equipmentByCode = useMemo(() => {
    const map = new Map<string, Equipment>((equipmentList || []).map((e: Equipment) => [e.code, e]));
    console.log(`[SettlementTab] 设备列表加载完成，共 ${equipmentList?.length || 0} 个设备`);
    console.log(`[SettlementTab] equipmentByCode Map 大小: ${map.size}`);
    console.log(`[SettlementTab] Map 中的设备编码:`, Array.from(map.keys()));
    console.log(`[SettlementTab] Map 中的设备编码类型:`, Array.from(map.keys()).map(k => typeof k));
    if (map.size > 0) {
      const firstKey = Array.from(map.keys())[0];
      const firstEquipment = map.get(firstKey);
      console.log(`[SettlementTab] 示例设备:`, firstEquipment);
    }
    // 打印所有设备的 code 和 customCode
    equipmentList?.forEach(eq => {
      console.log(`[SettlementTab] 设备: code=${eq.code} (${typeof eq.code}), customCode=${eq.customCode}`);
    });
    return map;
  }, [equipmentList]);

  // 统一：获取有效订单（详情优先，列表为回退）
  const cachedOrder = useSelector((state: any) => selectOrderById(state, effectiveOrderId || ''));
  const order = useMemo(() => cachedOrder || initialOrder || {} as Order, [cachedOrder, initialOrder]);

  // 状态
  const [cycleStart, setCycleStart] = useState<Dayjs | null>(dayjs());
  const [cycleEnd, setCycleEnd] = useState<Dayjs | null>(dayjs());
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [equipmentLoading, setEquipmentLoading] = useState(false);
  // 已移除：抵扣额、人工费、其他费用本地状态
  // 审计日志
  const [auditVisible, setAuditVisible] = useState(false);

  // 加载设备列表（后端默认返回所有设备）
  const fetchEquipments = async () => {
    setEquipmentLoading(true);
    dispatch(fetchEquipmentsStart());
    try {
      const list = await apiGet<Equipment[]>('/equipments');
      dispatch(fetchEquipmentsSuccess(list));
      console.log(`[SettlementTab] 设备列表加载成功，共 ${list.length} 个设备`);
    } catch (err: any) {
      console.error('[SettlementTab] 加载设备列表失败:', err);
      dispatch(fetchEquipmentsFailure(err?.message || '加载设备列表失败'));
      message.error('加载设备列表失败');
    } finally {
      setEquipmentLoading(false);
    }
  };

  // 初始化：加载设备列表
  useEffect(() => {
    if (!equipmentList || equipmentList.length === 0) {
      fetchEquipments();
    }
  }, []);

  // 编辑模式：如果通过 orderId 打开但没有 order，则加载订单
  useEffect(() => {
    if (propOrderId && !initialOrder && !cachedOrder) {
      dispatch(fetchOrderById(propOrderId));
    }
  }, [propOrderId, initialOrder, cachedOrder, dispatch]);

  // 编辑模式：初始化表单值
  useEffect(() => {
    if (editRecord) {
      // 设置结算周期
      if (editRecord.cycleStartDate) {
        setCycleStart(dayjs(editRecord.cycleStartDate));
      }
      if (editRecord.cycleEndDate) {
        setCycleEnd(dayjs(editRecord.cycleEndDate));
      }
      // 设置表单备注
      form.setFieldsValue({
        remark: editRecord.remark || ''
      });
    }
  }, [editRecord, form]);

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
  // 改进：通过设备的类型和高度匹配订单设备项
  const findItemIndexByCode = (ord: Order, code: string): number => {
    // 首先从设备列表中获取设备信息
    const equipment = equipmentByCode.get(code);
    if (!equipment) {
      // 如果设备列表还在加载中，静默返回 -1
      if (equipmentLoading) {
        return -1;
      }
      // 尝试从进场记录中推断设备信息
      console.log(`[SettlementTab] 设备 ${code} 不在设备列表中，尝试从订单数据推断`);
      // 如果设备列表已加载但找不到，可能是设备已被删除，返回第一个设备项作为默认
      if (equipmentList && equipmentList.length > 0) {
        console.warn(`[SettlementTab] 设备 ${code} 未找到，使用默认设备项`);
        return ord.equipmentItems && ord.equipmentItems.length > 0 ? 0 : -1;
      }
      return -1;
    }

    const equipmentType = equipment.type || '';
    const equipmentHeight = String(equipment.height || '');

    // 在订单设备项中查找匹配的类型和高度
    const items = ord.equipmentItems || [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemType = item.equipmentType || '';
      const itemHeight = String(item.height || '');
      
      // 匹配类型和高度
      if (itemType === equipmentType && itemHeight === equipmentHeight) {
        console.log(`[SettlementTab] 设备 ${code} 匹配到设备项 ${i}: ${itemType}/${itemHeight}`);
        return i;
      }
    }

    // 如果没有精确匹配，尝试只匹配类型
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if ((item.equipmentType || '') === equipmentType) {
        console.log(`[SettlementTab] 设备 ${code} 通过类型匹配到设备项 ${i}: ${equipmentType}`);
        return i;
      }
    }

    console.warn(`[SettlementTab] 设备 ${code} (${equipmentType}/${equipmentHeight}) 未能匹配任何订单设备项`);
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

  // 计算函数（calcDays 未使用，已移除）

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

  // 🆕 收集所有进场记录中的替代设备
  const substituteEquipments = useMemo(() => {
    const map: Record<string, { requiredHeight: number; actualHeight: number }> = {};
    (order.entries || []).forEach((entry: EntryRecord) => {
      if (entry.substituteEquipments) {
        Object.assign(map, entry.substituteEquipments);
      }
    });
    return map;
  }, [order.entries]);

  // 列定义（简化并聚焦计算与选择）
  const columns: any[] = [
    { title: '序号', dataIndex: 'idx', width: 60, align: 'center', render: (_: any, __: any, i: number) => i + 1 },
    {
      title: '设备信息', dataIndex: 'deviceInfo', align: 'center', render: (_: any, row: DeviceRow) => {
        const type = row.equipmentType || '—';
        const h = row.height || '—';
        const eq = equipmentByCode.get(row.key);
        const customCode = String(eq?.customCode || '').trim();
        const code = row.key || '—';
        
        // 🆕 检查是否为替代设备
        const isSubstitute = substituteEquipments[code];
        
        // 调试日志
        console.log(`[SettlementTab 设备信息] 设备编码: ${row.key}, 找到设备: ${!!eq}, 自编号: ${customCode}, 出厂编号: ${code}${isSubstitute ? ' {替}' : ''}`);
        if (eq) {
          console.log(`[SettlementTab 设备信息] 设备详情:`, eq);
        }
        
        // 第一行：高度米/设备类型
        const line1 = `${h}米 / ${type}`;
        // 第二行：出厂编号/自编号 + {替}标记
        const line2Base = customCode && customCode !== code 
          ? `${code} / ${customCode}` 
          : (customCode || code);
        const line2 = isSubstitute ? `${line2Base} {替}` : line2Base;
        
        console.log(`[SettlementTab 设备信息] 第二行显示: ${line2}`);
        
        return (
          <Space direction="vertical" size={0}>
            <Text>{line1}</Text>
            <Text type="secondary">
              {line2Base}
              {isSubstitute && <Tag color="orange" style={{ marginLeft: 4 }}>替</Tag>}
            </Text>
          </Space>
        );
      }
    },
    {
      title: (<div style={{ textAlign: 'center' }}>进退场时间</div>), dataIndex: 'entryExit', align: 'left', render: (_: any, row: DeviceRow) => {
        const start = row.leaseStartDate ? dayjs(row.leaseStartDate).format('YYYY-MM-DD') : '—';
        const end = row.settlementDate ? dayjs(row.settlementDate).format('YYYY-MM-DD') : '—';
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

  // 检查设备在指定日期区间是否已结算
  const isDateRangeSettled = (code: string, startDate: string, endDate: string): boolean => {
    if (!order.settlements || order.settlements.length === 0) return false;
    
    // 编辑模式：排除当前编辑的结算记录
    const otherSettlements = editRecord 
      ? order.settlements.filter((s: any) => s.id !== editRecord.id)
      : order.settlements;
    
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    
    // 检查是否有重叠的已结算区间
    return otherSettlements.some((settlement: any) => {
      const sStart = dayjs(settlement.cycleStartDate);
      const sEnd = dayjs(settlement.cycleEndDate);
      
      // 判断日期区间是否重叠
      const hasOverlap = start.isBefore(sEnd) && end.isAfter(sStart);
      
      // TODO: 这里需要检查该结算记录中是否包含此设备
      // 目前简化处理：假设所有结算记录都包含所有在租设备
      return hasOverlap;
    });
  };

  // 检查改装费/运费是否已结算
  const isOneTimeFeeSettled = (code: string, feeType: 'shipping' | 'modification'): boolean => {
    if (!order.settlements || order.settlements.length === 0) return false;
    
    // 编辑模式：排除当前编辑的结算记录
    const otherSettlements = editRecord 
      ? order.settlements.filter((s: any) => s.id !== editRecord.id)
      : order.settlements;
    
    // 如果有任何已存在的结算记录，则认为一次性费用已结算
    // TODO: 更精确的做法是在结算记录中标记哪些设备的哪些费用已结算
    return otherSettlements.length > 0;
  };

  // 检查索赔是否已结算
  const isClaimSettled = (claimId: string): boolean => {
    if (!order.settlements || order.settlements.length === 0) return false;
    
    // 编辑模式：排除当前编辑的结算记录
    const otherSettlements = editRecord 
      ? order.settlements.filter((s: any) => s.id !== editRecord.id)
      : order.settlements;
    
    // TODO: 需要在结算记录中记录已结算的索赔单号
    // 目前简化处理：检查索赔创建时间是否在已结算周期内
    const claim = (order.claims || []).find((c: any) => c.id === claimId);
    if (!claim) return false;
    
    const claimDate = dayjs(claim.createdAt || claim.claimDate);
    
    return otherSettlements.some((settlement: any) => {
      const sStart = dayjs(settlement.cycleStartDate);
      const sEnd = dayjs(settlement.cycleEndDate);
      return claimDate.isAfter(sStart) && claimDate.isBefore(sEnd);
    });
  };

  // 汇总计算（增加防重复结算逻辑）
  const calcSummary = () => {
    const rows = ((selectedRowKeys as string[]) || []).length ? (selectedRowKeys as string[]) : deviceRows.map(r => r.key);
    let rentSum = 0;
    let shipSum = 0;
    let modSum = 0;
    let claimsSum = 0;
    const auditAcc: Record<string, PricingLogEntry[]> = {};
    const warnings: string[] = [];
    
    rows.forEach((code) => {
      const row = deviceRows.find(r => r.key === code);
      if (!row) return;
      
      const entryDate = findLeaseStartDate(order, code);
      const exitDate = findSettlementDate(order, code);
      
      if (!entryDate) {
        warnings.push(`设备 ${code} 无进场日期`);
        return;
      }
      
      // 检查日期区间是否已结算
      const startDate = cycleStart?.format('YYYY-MM-DD') || entryDate;
      const endDate = cycleEnd?.format('YYYY-MM-DD') || exitDate || dayjs().format('YYYY-MM-DD');
      
      if (isDateRangeSettled(code, startDate, endDate)) {
        warnings.push(`设备 ${code} 在 ${startDate} 至 ${endDate} 期间已结算，将跳过租金计算`);
      } else {
        // 计算租金
        const usedDays = calcActualDaysForCode(code);
        const suspDays = calcSuspensionDaysForCode(code, cycleStart, cycleEnd);
        const actualDays = Math.max(usedDays - suspDays, 0);
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
      }
      
      // 运费：一次性收取，不可重复结算
      if (isOneTimeFeeSettled(code, 'shipping')) {
        warnings.push(`设备 ${code} 的运费已在之前结算中收取，本次不再计入`);
      } else {
        shipSum += toNum(row.shippingFee);
      }
      
      // 改装费：一次性收取，不可重复结算
      if (isOneTimeFeeSettled(code, 'modification')) {
        warnings.push(`设备 ${code} 的改装费已在之前结算中收取，本次不再计入`);
      } else {
        modSum += toNum(row.modificationFee);
      }
    });
    
    // 索赔：按索赔单号只结算一次
    (order.claims || []).forEach((claim: any) => {
      if (!claim.id) return;
      
      const claimDate = dayjs(claim.createdAt || claim.claimDate);
      const inCycle = cycleStart && cycleEnd && 
        claimDate.isAfter(cycleStart) && claimDate.isBefore(cycleEnd);
      
      if (inCycle) {
        if (isClaimSettled(claim.id)) {
          warnings.push(`索赔单 ${claim.claimNumber || claim.id} 已在之前结算中计入，本次不再计入`);
        } else {
          claimsSum += toNum(claim.claimAmount);
        }
      }
    });
    
    auditRef.current = auditAcc;
    
    // 显示警告信息
    if (warnings.length > 0) {
      console.warn('[SettlementTab] 结算警告:', warnings);
    }
    
    // 本期结算金额 = 租金 + 运费 + 改装费 + 索赔
    const currentReceivable = rentSum + shipSum + modSum + claimsSum;
    // 累计收款余额（收款 - 退款）
    const received = (order.receipts || []).reduce((s, r) => s + toNum(r.amount), 0);
    const refunded = (order.refunds || []).reduce((s, r) => s + toNum(r.amount), 0);
    const receivedBalance = Math.max(received - refunded, 0);
    const diff = Math.max(currentReceivable - receivedBalance, 0);
    return { rentSum, shipSum, modSum, claimsSum, currentReceivable, receivedBalance, diff, warnings };
  };

  const confirmSubmit = async (): Promise<boolean> => {
    const { currentReceivable, warnings } = calcSummary();
    
    let content: React.ReactNode = (
      <div>
        <p>本期结算金额：¥{currentReceivable.toFixed(2)}</p>
        {warnings && warnings.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <p style={{ color: '#ff4d4f', fontWeight: 'bold' }}>⚠️ 防重复结算提示：</p>
            <ul style={{ color: '#666', fontSize: 12, marginTop: 8 }}>
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}
      </div>
    );
    
    return new Promise((resolve) => {
      Modal.confirm({
        title: '确认提交结算',
        content,
        width: 600,
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
      if (!order || !order.id) return;
      if (!cycleStart || !cycleEnd) throw new Error('请设置结算周期');

      const { currentReceivable } = calcSummary();
      
      // 编辑模式：更新现有记录
      if (editRecord?.id) {
        const updates = {
          settlementNumber,
          contractName: `${order.customerName}/${order.projectName}`,
          settlementDate: dayjs().format('YYYY-MM-DD'),
          cycleStartDate: cycleStart?.format('YYYY-MM-DD'),
          cycleEndDate: cycleEnd?.format('YYYY-MM-DD'),
          settlementAmount: currentReceivable,
          remark: values.remark?.trim(),
          // 保留原有状态
          status: editRecord.status
        };
        
        await dispatch(updateSettlement({ 
          orderId: order.id, 
          settlementId: editRecord.id, 
          updates 
        })).unwrap();
        message.success('结算记录已更新');
        closeTab(tabKey);
        return;
      }
      
      // 新增模式
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

  const { rentSum, shipSum, modSum, claimsSum, currentReceivable, receivedBalance } = calcSummary();
  
  // 结算与收款汇总
  const previousSettlementAmount = (order.settlements || []).reduce((s, r) => s + toNum((r as any).settlementAmount), 0);
  
  // 往期欠款 = 往期结算总额 - (已收款 - 已退款)
  // 正数表示欠款，负数表示有余额（预收）
  const previousArrears = previousSettlementAmount - receivedBalance;
  
  // 累计结算金额（用于预览显示）
  const cumulativeSettlementAmount = previousSettlementAmount + currentReceivable;
  
  // 累计收款总额（用于预览显示）
  const receiptsTotalAmount = (order.receipts || []).reduce((s, r) => s + toNum((r as any).amount), 0);

  // 本期应付金额 = 本期结算金额 + 往期欠款
  const totalPayable = currentReceivable + previousArrears;

  // 如果设备列表正在加载，显示加载提示
  if (equipmentLoading || (!equipmentList || equipmentList.length === 0)) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <Text type="secondary">正在加载设备列表...</Text>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 12px' }}>
      {/* 头部区域：标题与结算周期 */}
      <Card 
        variant="borderless" 
        style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Space align="center" size={16}>
              <div style={{ 
                width: 48, height: 48, background: '#e6f7ff', borderRadius: 8, 
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              </div>
              <Space direction="vertical" size={2}>
                <Title level={4} style={{ margin: 0 }}>结算单</Title>
                <Space>
                  <Tag color="blue">{settlementNumber}</Tag>
                  <Tag color="orange">待提交</Tag>
                </Space>
              </Space>
            </Space>
          </Col>
          <Col>
            <Card size="small" style={{ background: '#f9f9f9', borderColor: '#f0f0f0' }}>
              <Space size={16} align="center">
                <Space>
                  <CalendarOutlined style={{ color: '#8c8c8c' }} />
                  <Text type="secondary">结算周期：</Text>
                  <DatePicker.RangePicker 
                    value={[cycleStart, cycleEnd]} 
                    onChange={(dates) => {
                      setCycleStart(dates?.[0] || null);
                      setCycleEnd(dates?.[1] || null);
                    }}
                    allowClear={false}
                    style={{ width: 260 }}
                  />
                </Space>
                <Divider type="vertical" />
                <Button 
                  icon={<CalculatorOutlined />} 
                  onClick={() => setAuditVisible(true)}
                >
                  复核计算过程
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 订单信息概览 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Descriptions column={3} size="small">
          <Descriptions.Item label="合同编号">{order.contractNumber || '—'}</Descriptions.Item>
          <Descriptions.Item label="项目名称">{order.projectName || '—'}</Descriptions.Item>
          <Descriptions.Item label="客户名称">{order.customerName || '—'}</Descriptions.Item>
          <Descriptions.Item label="业务负责人">{order.businessManagerName || '—'}</Descriptions.Item>
          <Descriptions.Item label="交机地点">{order.deliveryLocation || '—'}</Descriptions.Item>
          <Descriptions.Item label="结算方式">{order.paymentAgreement || '—'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 设备明细表 */}
      <Card 
        title="设备结算明细" 
        size="small" 
        style={{ marginBottom: 16 }}
        extra={
          <Space>
            <Text type="secondary">共 {deviceRows.length} 台设备</Text>
          </Space>
        }
      >
        <Table
          size="small"
          columns={columns as any}
          dataSource={data}
          rowKey="key"
          pagination={false}
          scroll={{ x: 'max-content', y: 400 }}
          bordered
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 500 }}>
                <Table.Summary.Cell index={0} colSpan={6}>
                  <div style={{ textAlign: 'right' }}>本页合计：</div>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6}>
                  <div style={{ textAlign: 'right', color: '#1890ff' }}>¥{rentSum.toFixed(2)}</div>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7}>
                  <div style={{ textAlign: 'right' }}>¥{shipSum.toFixed(2)}</div>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8} />
                <Table.Summary.Cell index={9}>
                  <div style={{ textAlign: 'right' }}>¥{modSum.toFixed(2)}</div>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={10}>
                  <div style={{ textAlign: 'right', color: '#ff4d4f' }}>¥{claimsSum.toFixed(2)}</div>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={11} />
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
        
        <div style={{ marginTop: 16, padding: '12px', background: '#f9f9f9', borderRadius: 4 }}>
          <Form
            form={form}
            layout="vertical"
            initialValues={{ remark: undefined }}
          >
            <Form.Item name="remark" label="结算备注" style={{ marginBottom: 0 }}>
              <Input.TextArea rows={2} placeholder="请输入备注信息（可选）" />
            </Form.Item>
          </Form>
        </div>
      </Card>

      {/* 底部左右面板 */}
      <Row gutter={16}>
        <Col xs={24} md={10}>
          <Card size="small" title="历史收款记录" style={{ height: '100%' }}>
            {/* 统计摘要 */}
            <Row gutter={8} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Statistic
                  title="累计收款"
                  value={(order.receipts || []).reduce((s, r) => s + toNum(r.amount), 0)}
                  precision={2}
                  valueStyle={{ color: '#52c41a', fontSize: 16 }}
                  suffix="元"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="累计退款"
                  value={(order.refunds || []).reduce((s, r) => s + toNum(r.amount), 0)}
                  precision={2}
                  valueStyle={{ color: '#ff4d4f', fontSize: 16 }}
                  suffix="元"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="已收余额"
                  value={receivedBalance}
                  precision={2}
                  valueStyle={{ color: '#1890ff', fontSize: 16, fontWeight: 600 }}
                  suffix="元"
                />
              </Col>
            </Row>
            
            <Table 
              size="small" 
              rowKey={(r: any) => r.id} 
              columns={[
                { title: '日期', dataIndex: 'receiptDate', width: 100, render: (v: string) => v ? dayjs(v).format('MM-DD') : '-' },
                { title: '支付方式', dataIndex: 'paymentMethod', width: 80 },
                { title: '金额', dataIndex: 'amount', align: 'right', render: (v: number) => <Text type="success">¥{toNum(v).toFixed(2)}</Text> },
              ] as any} 
              dataSource={order.receipts || []} 
              pagination={{ pageSize: 5, size: 'small' }} 
              scroll={{ y: 200 }}
            />
          </Card>
        </Col>
        
        <Col xs={24} md={14}>
          <Card 
            size="small" 
            title="本期结算汇总" 
            style={{ height: '100%' }}
            styles={{ header: { borderBottom: '1px solid #f0f0f0' } }}
          >
            <Row gutter={[12, 12]}>
              <Col span={12}>
                <Card size="small" variant="borderless" style={{ background: '#e6f7ff' }}>
                  <Statistic
                    title="本期结算金额"
                    value={currentReceivable}
                    precision={2}
                    prefix={<AccountBookOutlined />}
                    valueStyle={{ color: '#1890ff', fontSize: 20 }}
                    suffix="元"
                  />
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                    (租金+运费+改装费+索赔)
                  </div>
                </Card>
              </Col>
              
              <Col span={12}>
                <Card 
                  size="small" 
                  variant="borderless" 
                  style={{ background: previousArrears >= 0 ? '#fff7e6' : '#f9f0ff' }}
                >
                  <Statistic
                    title={previousArrears >= 0 ? "往期欠款" : "往期结余"}
                    value={Math.abs(previousArrears)}
                    precision={2}
                    prefix={previousArrears >= 0 ? <DollarOutlined /> : <WalletOutlined />}
                    valueStyle={{ color: previousArrears >= 0 ? '#fa8c16' : '#722ed1', fontSize: 20 }}
                    suffix="元"
                  />
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                    (往期结算 - 已收余额)
                  </div>
                </Card>
              </Col>
              
              <Col span={24}>
                <Card 
                  size="small" 
                  style={{ 
                    background: totalPayable >= 0 ? '#fff2e8' : '#f9f0ff',
                    border: totalPayable >= 0 ? '1px solid #ffbb96' : '1px solid #d3adf7'
                  }}
                >
                  <Row align="middle" justify="space-between">
                    <Col>
                      <Statistic
                        title="本期应付金额"
                        value={Math.abs(totalPayable)}
                        precision={2}
                        prefix={totalPayable >= 0 ? <RiseOutlined /> : <FallOutlined />}
                        valueStyle={{ 
                          color: totalPayable >= 0 ? '#ff4d4f' : '#722ed1', 
                          fontSize: 28,
                          fontWeight: 'bold'
                        }}
                        suffix="元"
                      />
                    </Col>
                    <Col>
                      <div style={{ textAlign: 'right', fontSize: 13, color: totalPayable >= 0 ? '#ff4d4f' : '#722ed1' }}>
                        <div style={{ marginBottom: 4 }}>{totalPayable >= 0 ? '需向客户收取' : '需退还客户/抵扣'}</div>
                        <div style={{ opacity: 0.8 }}>(本期结算 + 往期欠款)</div>
                      </div>
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 底部操作栏 */}
      <div style={{ 
        position: 'fixed', 
        bottom: 0, 
        right: 0, 
        left: 0, // 或者是 main content 的左边距
        padding: '12px 24px', 
        background: '#fff', 
        borderTop: '1px solid #f0f0f0',
        textAlign: 'right',
        zIndex: 100,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.05)'
      }}>
        <Space size={16}>
          <div style={{ marginRight: 16 }}>
            <Text>本期应付：</Text>
            <Text strong style={{ fontSize: 20, color: totalPayable >= 0 ? '#ff4d4f' : '#722ed1' }}>
              ¥{totalPayable.toFixed(2)}
            </Text>
          </div>
          <Button onClick={() => setPreviewVisible(true)}>预览结算单</Button>
          <Button onClick={() => closeTab(tabKey)}>取消</Button>
          <Button type="primary" size="large" onClick={handleSave} icon={<CheckCircleOutlined />}>
            确认提交
          </Button>
        </Space>
      </div>

      {/* 底部占位符，防止内容被操作栏遮挡 */}
      <div style={{ height: 80 }} />

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
        width={1000}
        style={{ top: 20 }}
      >
        <div ref={previewRef} style={{ padding: '20px', backgroundColor: '#fff', color: '#000' }}>
          {/* 标题区域 */}
          <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
            <Title level={3} style={{ margin: 0, letterSpacing: '4px' }}>费用结算单</Title>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px' }}>
              <span>结算单号：{settlementNumber}</span>
              <span>打印日期：{dayjs().format('YYYY-MM-DD HH:mm')}</span>
            </div>
          </div>

          {/* 基本信息 */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '12px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 8px', width: '80px', fontWeight: 'bold' }}>承租方(甲方):</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #ddd' }}>{order.customerName || '—'}</td>
                <td style={{ padding: '4px 8px', width: '80px', fontWeight: 'bold' }}>项目名称:</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #ddd' }}>{order.projectName || '—'}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 8px', fontWeight: 'bold' }}>出租方(乙方):</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #ddd' }}>{order.lessorName || '—'}</td>
                <td style={{ padding: '4px 8px', fontWeight: 'bold' }}>结算周期:</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #ddd' }}>
                  {cycleStart?.format('YYYY-MM-DD')} 至 {cycleEnd?.format('YYYY-MM-DD')}
                </td>
              </tr>
            </tbody>
          </table>

          {/* 设备明细表 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '13px' }}>一、租赁费用明细</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center', border: '1px solid #000' }}>
              <thead style={{ background: '#f0f0f0' }}>
                <tr>
                  <th style={{ border: '1px solid #000', padding: '6px 4px' }}>序号</th>
                  <th style={{ border: '1px solid #000', padding: '6px 4px' }}>设备信息</th>
                  <th style={{ border: '1px solid #000', padding: '6px 4px' }}>进场日期</th>
                  <th style={{ border: '1px solid #000', padding: '6px 4px' }}>退场日期</th>
                  <th style={{ border: '1px solid #000', padding: '6px 4px' }}>单价(元)</th>
                  <th style={{ border: '1px solid #000', padding: '6px 4px' }}>计费天数</th>
                  <th style={{ border: '1px solid #000', padding: '6px 4px' }}>租金</th>
                  <th style={{ border: '1px solid #000', padding: '6px 4px' }}>运费</th>
                  <th style={{ border: '1px solid #000', padding: '6px 4px' }}>改装/索赔</th>
                  <th style={{ border: '1px solid #000', padding: '6px 4px' }}>小计</th>
                </tr>
              </thead>
              <tbody>
                {deviceRows.map((row, index) => {
                  const eq = equipmentByCode.get(row.key);
                  const customCode = String(eq?.customCode || '').trim();
                  const code = row.key || '—';
                  const displayName = customCode && customCode !== code ? `${code}/${customCode}` : (customCode || code);
                  
                  const used = calcActualDaysForCode(row.key);
                  const susp = calcSuspensionDaysForCode(row.key, cycleStart, cycleEnd);
                  const actualDays = Math.max(used - susp, 0);
                  const { amount } = calculateRentWithAudit({
                    dailyRate: toNum(row.dailyRate),
                    monthlyRate: toNum(row.monthlyRate),
                    rentalDays: actualDays,
                    hasExited: Boolean(findSettlementDate(order, row.key)),
                    entryDate: findLeaseStartDate(order, row.key),
                    exitDate: findSettlementDate(order, row.key),
                  });
                  
                  const ship = toNum(row.shippingFee);
                  const mod = toNum(row.modificationFee);
                  const claim = calcClaimsForCode(row.key);
                  const subtotal = amount + ship + mod + claim;

                  return (
                    <tr key={row.key}>
                      <td style={{ border: '1px solid #000', padding: '4px' }}>{index + 1}</td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'left' }}>
                        <div>{row.height}米 {row.equipmentType}</div>
                        <div style={{ color: '#666' }}>{displayName}</div>
                      </td>
                      <td style={{ border: '1px solid #000', padding: '4px' }}>
                        {row.leaseStartDate ? dayjs(row.leaseStartDate).format('YYYY-MM-DD') : '-'}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '4px' }}>
                        {row.settlementDate ? dayjs(row.settlementDate).format('YYYY-MM-DD') : '-'}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>
                        <div>日: {toNum(row.dailyRate).toFixed(2)}</div>
                        <div>月: {toNum(row.monthlyRate).toFixed(2)}</div>
                      </td>
                      <td style={{ border: '1px solid #000', padding: '4px' }}>
                        {susp > 0 ? `${actualDays} (停${susp})` : actualDays}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>{amount.toFixed(2)}</td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>{ship.toFixed(2)}</td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>
                        {(mod + claim).toFixed(2)}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>{subtotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
                {/* 合计行 */}
                <tr style={{ background: '#fafafa', fontWeight: 'bold' }}>
                  <td colSpan={6} style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>本期合计</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>{rentSum.toFixed(2)}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>{shipSum.toFixed(2)}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>{(modSum + claimsSum).toFixed(2)}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>{currentReceivable.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 费用汇总 */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '13px' }}>二、费用汇总</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #000' }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '8px', background: '#f9f9f9', width: '15%' }}>本期结算金额</td>
                  <td style={{ border: '1px solid #000', padding: '8px', width: '35%', fontWeight: 'bold' }}>¥ {currentReceivable.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td style={{ border: '1px solid #000', padding: '8px', background: '#f9f9f9', width: '15%' }}>累计结算总额</td>
                  <td style={{ border: '1px solid #000', padding: '8px', width: '35%' }}>¥ {cumulativeSettlementAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '8px', background: '#f9f9f9' }}>已收金额</td>
                  <td style={{ border: '1px solid #000', padding: '8px' }}>¥ {receiptsTotalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td style={{ border: '1px solid #000', padding: '8px', background: '#f9f9f9' }}>往期欠款/余额</td>
                  <td style={{ border: '1px solid #000', padding: '8px' }}>
                    ¥ {previousArrears.toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '8px', background: '#f9f9f9' }}>备注</td>
                  <td colSpan={3} style={{ border: '1px solid #000', padding: '8px' }}>{form.getFieldValue('remark') || '无'}</td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ border: '0', padding: '0' }}></td>
                  <td style={{ border: '1px solid #000', padding: '8px', background: '#f9f9f9', fontWeight: 'bold' }}>本期应付</td>
                  <td style={{ border: '1px solid #000', padding: '8px', color: totalPayable >= 0 ? '#d32f2f' : '#1976d2', fontWeight: 'bold', fontSize: '14px' }}>
                    ¥ {totalPayable.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                      {totalPayable >= 0 ? '(需支付)' : '(已超付)'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 签字栏 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', padding: '0 20px', fontSize: '13px' }}>
            <div style={{ width: '40%' }}>
              <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>出租方(盖章): {order.lessorName || '________________'}</div>
              <div style={{ marginBottom: '10px' }}>经办人: ________________</div>
              <div>日期: ________________</div>
            </div>
            <div style={{ width: '40%' }}>
              <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>承租方(盖章): {order.customerName || '________________'}</div>
              <div style={{ marginBottom: '10px' }}>经办人: ________________</div>
              <div>日期: ________________</div>
            </div>
          </div>
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