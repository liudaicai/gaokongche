import React, { useEffect, useMemo, useState, useRef } from 'react';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Row, Col, Space, Tag, Typography, Tabs, Descriptions, Table, Skeleton, Button, Dropdown, Popconfirm, message, Modal, Upload, Form, Input, Select, DatePicker, Collapse, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AppDispatch, RootState } from '../../../app/store';
import { Order, OrderEquipmentItem, EntryRecord, ExitRecord } from '../types';
import { fetchOrderById, selectOrderById, updateOrder, deleteOrder, deleteEntry, deleteExit, deleteReceipt, deleteRefund, updateSettlement, deleteSettlement } from '../ordersSlice';
import { useTabs } from '../../common/TabsContext';
import EntryOperationTab from './EntryOperationTab';
import ExitOperationTab from './ExitOperationTab';
import ReceiptOperationTab from './ReceiptOperationTab';
import RefundOperationTab from './RefundOperationTab';
import SuspensionOperationTab from './SuspensionOperationTab';
import ClaimOperationTab from './ClaimOperationTab';
import SettlementTab from './SettlementTab';
import ClearanceOperationTab from './ClearanceOperationTab';
import ContractPreviewTab from './ContractPreviewTab';
import NewOrderTab from './NewOrderTab';
import InvoiceManagement from '../InvoiceManagement';
import OrderRepairModal from '../components/OrderRepairModal';
import SuspensionClaimDocuments from '../components/SuspensionClaimDocuments';
import OrderLogs from '../components/OrderLogs';
import EquipmentReplacementModal from '../EquipmentReplacementModal';
import EquipmentReplacementHistory from '../components/EquipmentReplacementHistory';
import { PlusOutlined, DownOutlined, EditOutlined, CheckCircleOutlined, ExportOutlined, DeleteOutlined, FileWordOutlined } from '@ant-design/icons';
import { selectEquipmentList, fetchEquipmentsStart, fetchEquipmentsSuccess, fetchEquipmentsFailure, Equipment } from '../../equipment/equipmentslice';
import { apiGet } from '../../../api/client';
import { calculateRentWithAudit } from '../pricing';
import { ContractGenerator } from '../../contracts/ContractGenerator';

interface OrderDetailTabProps {
  orderId: string;
  tabKey: string;
  initialOrder?: Order;
}

const OrderDetailTab: React.FC<OrderDetailTabProps> = ({ orderId, tabKey, initialOrder }) => {
  const dispatch = useDispatch<AppDispatch>();
  const cached = useSelector((state: any) => selectOrderById(state, orderId));
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
  // ⚠️ 使用 useRef 避免无限循环
  const equipmentLoadedRef = React.useRef(false);
  
  useEffect(() => {
    // 只在组件挂载时加载一次，避免无限循环
    if (!equipmentLoadedRef.current && (!equipmentList || equipmentList.length === 0)) {
      console.log('[OrderDetailTab] 开始加载设备列表...');
      equipmentLoadedRef.current = true;
      dispatch(fetchEquipmentsStart());
      apiGet<any>('/equipments')
        .then((response: any) => {
          // apiGet 已自动提取 data，response 是 { items: [...], total: ... }
          const list = response.items || [];
          console.log(`[OrderDetailTab] ✅ 设备列表加载成功，数量: ${list.length}`);
          if (list.length > 0) {
            console.log('[OrderDetailTab] 设备示例:', list[0]);
            console.log('[OrderDetailTab] 前3个设备编号:', list.slice(0, 3).map((e: any) => e.code));
          }
          dispatch(fetchEquipmentsSuccess(list));
        })
        .catch((err: any) => {
          console.error('[OrderDetailTab] ❌ 设备列表加载失败:', err);
          dispatch(fetchEquipmentsFailure(err?.message || '获取设备列表失败'));
          equipmentLoadedRef.current = false; // 失败时重置，允许重试
        });
    }
  }, [dispatch]); // ⚠️ 移除 equipmentList 依赖，避免无限循环

  // 加载换机记录（用于动态计算实际设备）
  const loadEquipmentReplacements = async () => {
    try {
      const response = await apiGet<any>(`/equipment-replacements?order_id=${orderId}&status=completed`);
      const items = response?.items || [];
      console.log(`[OrderDetailTab] ✅ 换机记录加载成功，数量: ${items.length}`);
      setEquipmentReplacements(items);
    } catch (err: any) {
      console.error('[OrderDetailTab] ❌ 换机记录加载失败:', err);
      setEquipmentReplacements([]);
    }
  };

  // 封装设备列表加载函数（供外部调用）
  const loadEquipmentList = () => {
    dispatch(fetchEquipmentsStart());
    apiGet<any>('/equipments')
      .then((response: any) => {
        const list = response.items || [];
        dispatch(fetchEquipmentsSuccess(list));
      })
      .catch((err: any) => {
        console.error('[OrderDetailTab] ❌ 设备列表加载失败:', err);
        dispatch(fetchEquipmentsFailure(err?.message || '获取设备列表失败'));
      });
  };

  // 加载换机记录
  useEffect(() => {
    loadEquipmentReplacements();
  }, [orderId]);

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
      case '已对账': return 'green';
      case '已确认': return 'green';
      case '已驳回': return 'red';
      default: return 'default';
    }
  };

  const fmtCurrency = (v: number): string => `¥${Number(v || 0).toFixed(2)}`;
  const fmtDateTime = (s?: string): string => {
    if (!s) return '—';
    const d = dayjs(s);
    if (!d.isValid()) {
      // 若仅为 YYYY-MM-DD 字符串，则简接返回
      return s.slice(0, 10);
    }
    return d.format('YYYY-MM-DD');
  };

  // 导出结算单为 DOC 文档（与预览界面完全一致）
  const handleExportSettlement = (record: any) => {
    // 获取订单数据
    const entries = order.entries || [];
    const exits = order.exits || [];
    const equipmentItems = order.equipmentItems || [];
    const receipts = order.receipts || [];
    const refunds = order.refunds || [];
    const settlements = order.settlements || [];
    const suspensions = order.suspensions || [];
    const claims = order.claims || [];
    
    // 计算财务汇总数据
    const receiptsTotalAmount = receipts.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const refundsTotalAmount = refunds.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const receivedBalance = receiptsTotalAmount - refundsTotalAmount;
    const previousSettlementAmount = settlements
      .filter((s: any) => s.id !== record.id)
      .reduce((s: number, r: any) => s + Number(r.settlementAmount || 0), 0);
    const previousArrears = previousSettlementAmount - receivedBalance;
    const cumulativeSettlementAmount = previousSettlementAmount + Number(record.settlementAmount || 0);
    const totalPayable = Number(record.settlementAmount || 0) + previousArrears;
    
    // 辅助函数：计算设备的报停天数
    const calcSuspDays = (code: string) => {
      const cycleStart = dayjs(record.cycleStartDate);
      const cycleEnd = dayjs(record.cycleEndDate);
      let total = 0;
      (suspensions || []).forEach((susp: any) => {
        const equipmentCodes = susp.equipmentSelections?.map((s: any) => s.equipmentCode) || [];
        if (!equipmentCodes.includes(code)) return;
        const ss = dayjs(susp.startDate);
        const se = dayjs(susp.endDate);
        if (ss.isAfter(cycleEnd) || se.isBefore(cycleStart)) return;
        const overlapStart = ss.isAfter(cycleStart) ? ss : cycleStart;
        const overlapEnd = se.isBefore(cycleEnd) ? se : cycleEnd;
        total += Math.max(overlapEnd.diff(overlapStart, 'day') + 1, 0);
      });
      return total;
    };
    
    // 辅助函数：计算设备的索赔金额
    const calcClaims = (code: string) => {
      return (claims || [])
        .filter((c: any) => c.equipmentCode === code)
        .reduce((sum: number, c: any) => sum + Number(c.claimAmount || 0), 0);
    };
    
    // 辅助函数：计算租金
    const calcRent = (dailyRate: number, monthlyRate: number, days: number) => {
      if (days <= 0) return 0;
      const dailyTotal = dailyRate * days;
      if (dailyTotal > monthlyRate) {
        if (days <= 30) return monthlyRate;
        return monthlyRate + (monthlyRate / 30) * (days - 30);
      }
      return dailyTotal;
    };
    
    // 构建设备明细行（与预览完全一致）
    let deviceRowsHtml = '';
    let rentSum = 0;
    let shipSum = 0;
    let modClaimSum = 0;
    
    entries.forEach((entry: any, index: number) => {
      const codes = entry.equipmentCodes || [];
      codes.forEach((code: string) => {
        const eqDetail = entry.equipmentDetails?.find((d: any) => d.code === code) || {};
        const equipment = equipmentList.find(eq => eq.code === code);
        const exitRecord = exits.find((ex: any) => (ex.equipmentCodes || []).includes(code));
        
        // 查找对应的设备项获取价格
        const item = equipmentItems.find((it: any) => 
          it.equipmentType === (eqDetail.type || equipment?.type) && 
          String(it.height) === String(eqDetail.height || equipment?.height)
        );
        
        const customCode = eqDetail.customCode || equipment?.customCode || '';
        const displayName = customCode && customCode !== code ? `${code}/${customCode}` : (customCode || code);
        
        // 计算天数和金额
        const cycleStart = dayjs(record.cycleStartDate);
        const cycleEnd = dayjs(record.cycleEndDate);
        const entryDate = dayjs(entry.entryDate);
        const exitDate = exitRecord?.exitDate ? dayjs(exitRecord.exitDate) : cycleEnd;
        
        const overlapStart = entryDate.isAfter(cycleStart) ? entryDate : cycleStart;
        const overlapEnd = exitDate.isBefore(cycleEnd) ? exitDate : cycleEnd;
        const usedDays = Math.max(overlapEnd.diff(overlapStart, 'day') + 1, 0);
        const suspDays = calcSuspDays(code);
        const actualDays = Math.max(usedDays - suspDays, 0);
        
        const dailyRate = Number(item?.dailyRate || 0);
        const monthlyRate = Number(item?.monthlyRate || 0);
        const rent = calcRent(dailyRate, monthlyRate, actualDays);
        const ship = Number(item?.shippingFee || 0);
        const mod = Number(item?.modificationFee || 0);
        const claim = calcClaims(code);
        const modClaim = mod + claim;
        const subtotal = rent + ship + modClaim;
        
        rentSum += rent;
        shipSum += ship;
        modClaimSum += modClaim;
        
        deviceRowsHtml += `
          <tr>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${index + 1}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: left;">
              <div>${eqDetail.height || equipment?.height || '—'}米 ${eqDetail.type || equipment?.type || '—'}</div>
              <div style="color: #666; font-size: 10px;">${displayName}</div>
            </td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${entry.entryDate ? dayjs(entry.entryDate).format('YYYY-MM-DD') : '—'}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${exitRecord?.exitDate ? dayjs(exitRecord.exitDate).format('YYYY-MM-DD') : '—'}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: right;">
              <div>日: ${dailyRate.toFixed(2)}</div>
              <div>月: ${monthlyRate.toFixed(2)}</div>
            </td>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">${suspDays > 0 ? `${actualDays} (停${suspDays})` : actualDays}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: right;">${rent.toFixed(2)}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: right;">${ship.toFixed(2)}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: right;">${modClaim.toFixed(2)}</td>
            <td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${subtotal.toFixed(2)}</td>
          </tr>
        `;
      });
    });
    
    // 如果没有进场记录，显示提示
    if (!deviceRowsHtml) {
      deviceRowsHtml = '<tr><td colspan="10" style="border: 1px solid #000; padding: 20px; text-align: center;">暂无设备数据</td></tr>';
    }

    // 生成与预览界面完全一致的 HTML（用于 DOC 格式）
    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="UTF-8">
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>100</w:Zoom>
            </w:WordDocument>
          </xml>
          <style>
            @page {
              size: A4;
              margin: 2cm;
            }
            body { 
              font-family: 'Microsoft YaHei', '微软雅黑', Arial, sans-serif; 
              padding: 20px;
              background: #fff;
              color: #000;
            }
            table { 
              border-collapse: collapse; 
              width: 100%; 
              margin: 16px 0;
              mso-table-lspace: 0pt;
              mso-table-rspace: 0pt;
            }
            th, td { 
              border: 1px solid #000; 
              padding: 6px 8px;
              mso-border-alt: solid #000 0.5pt;
            }
            th { 
              background: #f0f0f0; 
              font-weight: bold; 
              text-align: center;
              mso-pattern: gray-15;
            }
            .header { 
              text-align: center; 
              margin-bottom: 24px; 
              border-bottom: 2px solid #000; 
              padding-bottom: 10px;
              mso-border-bottom-alt: solid #000 1.5pt;
            }
            .title { 
              font-size: 20pt; 
              font-weight: bold; 
              letter-spacing: 4px; 
              margin-bottom: 8px; 
            }
            .meta { 
              display: flex; 
              justify-content: space-between; 
              font-size: 12px; 
            }
            .section-title { 
              font-weight: bold; 
              font-size: 13px; 
              margin: 16px 0 4px 0; 
            }
            .info-table td {
              border: none;
              border-bottom: 1px solid #ddd;
              mso-border-bottom-alt: solid #ddd 0.5pt;
            }
            .summary-table { font-size: 12px; }
            .summary-table td { padding: 8px; }
            .summary-table .label { 
              background: #f9f9f9; 
              width: 15%; 
              font-weight: bold;
              mso-pattern: gray-10;
            }
            .summary-table .highlight { 
              font-weight: bold; 
              font-size: 14px; 
              color: #d32f2f; 
            }
            .signature { 
              display: flex; 
              justify-content: space-between; 
              margin-top: 40px; 
              padding: 0 20px; 
              font-size: 13px; 
            }
            .signature > div { width: 40%; }
            .signature .line { margin: 10px 0; }
          </style>
        </head>
        <body>
          <!-- 标题区域 -->
          <div class="header">
            <div class="title">费用结算单</div>
            <div class="meta">
              <span>结算单号：${record.settlementNumber || ''}</span>
              <span>打印日期：${dayjs().format('YYYY-MM-DD HH:mm')}</span>
            </div>
          </div>

          <!-- 基本信息 -->
          <table class="info-table" style="margin-bottom: 16px; font-size: 12px;">
            <tbody>
              <tr>
                <td style="padding: 4px 8px; width: 100px; font-weight: bold;">承租方(甲方):</td>
                <td style="padding: 4px 8px;">${order.customerName || '—'}</td>
                <td style="padding: 4px 8px; width: 100px; font-weight: bold;">项目名称:</td>
                <td style="padding: 4px 8px;">${order.projectName || '—'}</td>
              </tr>
              <tr>
                <td style="padding: 4px 8px; font-weight: bold;">出租方(乙方):</td>
                <td style="padding: 4px 8px;">${order.lessorName || '—'}</td>
                <td style="padding: 4px 8px; font-weight: bold;">结算周期:</td>
                <td style="padding: 4px 8px;">
                  ${fmtDateTime(record.cycleStartDate)} 至 ${fmtDateTime(record.cycleEndDate)}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- 设备明细表 -->
          <div class="section-title">一、租赁费用明细</div>
          <table style="font-size: 11px; text-align: center;">
            <thead style="background: #f0f0f0;">
              <tr>
                <th style="padding: 6px 4px;">序号</th>
                <th style="padding: 6px 4px;">设备信息</th>
                <th style="padding: 6px 4px;">进场日期</th>
                <th style="padding: 6px 4px;">退场日期</th>
                <th style="padding: 6px 4px;">单价(元)</th>
                <th style="padding: 6px 4px;">计费天数</th>
                <th style="padding: 6px 4px;">租金</th>
                <th style="padding: 6px 4px;">运费</th>
                <th style="padding: 6px 4px;">改装/索赔</th>
                <th style="padding: 6px 4px;">小计</th>
              </tr>
            </thead>
            <tbody>
              ${deviceRowsHtml}
              <tr style="background: #fafafa; font-weight: bold;">
                <td colspan="6" style="border: 1px solid #000; padding: 6px; text-align: center;">本期合计</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${rentSum.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${shipSum.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${modClaimSum.toFixed(2)}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: right;">${Number(record.settlementAmount || 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <!-- 费用汇总 -->
          <div class="section-title">二、费用汇总</div>
          <table class="summary-table">
            <tbody>
              <tr>
                <td class="label">本期结算金额</td>
                <td style="font-weight: bold; width: 35%;">¥ ${Number(record.settlementAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="label">累计结算总额</td>
                <td style="width: 35%;">¥ ${cumulativeSettlementAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
              <tr>
                <td class="label">已收金额</td>
                <td>¥ ${receiptsTotalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="label">往期欠款/余额</td>
                <td>¥ ${previousArrears.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
              <tr>
                <td class="label">备注</td>
                <td colspan="3">${record.remark || '无'}</td>
              </tr>
              <tr>
                <td colspan="2" style="border: none;"></td>
                <td class="label">本期应付</td>
                <td class="highlight">
                  ¥ ${totalPayable.toLocaleString(undefined, {minimumFractionDigits: 2})}
                  <span style="font-size: 11px; font-weight: normal; color: #666; margin-left: 8px;">
                    ${totalPayable >= 0 ? '(需支付)' : '(已超付)'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- 签字栏 -->
          <div class="signature">
            <div>
              <div class="line" style="font-weight: bold;">出租方(盖章): ${order.lessorName || '________________'}</div>
              <div class="line">经办人: ________________</div>
              <div class="line">日期: ________________</div>
            </div>
            <div>
              <div class="line" style="font-weight: bold;">承租方(盖章): ${order.customerName || '________________'}</div>
              <div class="line">经办人: ________________</div>
              <div class="line">日期: ________________</div>
            </div>
          </div>
        </body>
      </html>
    `;
    
    // 创建 Blob 并下载为 DOC 文档
    const blob = new Blob(['\ufeff', html], { 
      type: 'application/msword;charset=utf-8' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `结算单_${record.settlementNumber || record.id}_${dayjs().format('YYYYMMDD')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success('已导出为 Word 文档');
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
      const itemIndex = (order.equipmentItems || []).findIndex((it: any, idx: number) => { void it; return (order.rentedEquipmentIds?.[idx] || []).includes(code); });
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
  
  // 换机模态框状态
  const [equipmentReplacementModalOpen, setEquipmentReplacementModalOpen] = useState(false);
  const [currentReplacementEquipmentId, setCurrentReplacementEquipmentId] = useState<number | null>(null);
  const [currentReplacementEquipmentCode, setCurrentReplacementEquipmentCode] = useState<string>('');
  
  // 换机记录（用于动态计算实际设备）
  const [equipmentReplacements, setEquipmentReplacements] = useState<any[]>([]);
  const [entryEditOpen, setEntryEditOpen] = useState(false);
  const [exitEditOpen, setExitEditOpen] = useState(false);
  const [entryEditForm] = Form.useForm();
  const [exitEditForm] = Form.useForm();
  const [entryFileList, setEntryFileList] = useState<any[]>([]);
  const [exitFileList, setExitFileList] = useState<any[]>([]);
  const [selectedOrderForRepair, setSelectedOrderForRepair] = useState<Order | null>(null);

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
    if (key === 'contract') {
      const tabKey = `order-contract-${order.id}`;
      openTab({
        key: tabKey,
        label: `合同预览：${order.projectName || order.contractNumber || order.customerName || order.id}`,
        content: <ContractPreviewTab tabKey={tabKey} order={order} />
      });
      return;
    }
    if (key === 'invoice') {
      const tabKey = `order-invoice-${order.id}`;
      openTab({
        key: tabKey,
        label: `发票管理：${order.projectName || order.contractNumber || order.customerName || order.id}`,
        content: <InvoiceManagement orderId={order.id} />
      });
      return;
    }
    if (key === 'repair') {
      setSelectedOrderForRepair(order);
      return;
    }
    if (key === 'change') {
      // 变更功能：打开订单编辑页面
      const tabKey = `order-edit-${order.id}`;
      openTab({
        key: tabKey,
        label: `变更：${order.projectName || order.contractNumber || order.customerName || order.id}`,
        content: <NewOrderTab tabKey={tabKey} orderId={order.id} />
      });
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
  };

  // confirmDeleteOrder 已不再使用，移除以消除未使用警告

  const operationMenuItems = [
    { key: 'contract', label: <Button size="small">合同预览</Button> },
    { key: 'entry', label: <Button size="small">进场</Button> },
    { key: 'exit', label: <Button size="small">退场</Button> },
    { key: 'payment', label: <Button size="small">收款</Button> },
    { key: 'refund', label: <Button size="small">退款</Button> },
    { key: 'stop', label: <Button size="small">报停</Button> },
    { key: 'claim', label: <Button size="small">索赔</Button> },
    { key: 'settlement', label: <Button size="small">结算</Button> },
    { key: 'closing', label: <Button size="small">结清</Button> },
    { key: 'invoice', label: <Button size="small">发票</Button> },
    { key: 'repair', label: <Button size="small">报修</Button> },
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
    { title: '约定进场', dataIndex: 'scheduledEntryDate', key: 'scheduledEntryDate', render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-' },
    { title: '预计退场', dataIndex: 'estimatedExitDate', key: 'estimatedExitDate', render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-' },
  ];

  // 已进场设备（设备清单）列与数据：按需求显示合并属性
  interface EnteredEquipmentRow {
    id?: number; // ⚠️ 设备ID，用于换机功能
    code: string;
    customCode?: string;
    equipmentType?: string;
    model?: string;
    height?: string | number;
    isSublease?: boolean;
    rentalStatus: '租赁中' | '已退租';
    entryDate?: string;
    exitDate?: string;
    originalCode?: string; // 🔄 原始设备编号（换机前）
  }

  // 🆕 收集所有进场记录中的替代设备（用于设备清单显示）
  const substituteEquipmentsForList = useMemo(() => {
    const map: Record<string, { requiredHeight: number; actualHeight: number }> = {};
    (order?.entries || []).forEach((entry: EntryRecord) => {
      if (entry.substituteEquipments) {
        Object.assign(map, entry.substituteEquipments);
      }
    });
    return map;
  }, [order?.entries]);

  const enteredEquipmentColumns: ColumnsType<EnteredEquipmentRow> = [
    { title: '序号', key: 'index', render: (_: any, __: EnteredEquipmentRow, index: number) => index + 1 },
    { title: '出厂编号/自编号', key: 'displayCode', sorter: (a: EnteredEquipmentRow, b: EnteredEquipmentRow) => {
      const av = String((a.customCode || a.code || '')).trim();
      const bv = String((b.customCode || b.code || '')).trim();
      return av.localeCompare(bv);
    }, render: (_: any, r: EnteredEquipmentRow) => {
      // 显示格式：出厂编号/自编号
      const custom = String(r.customCode || '').trim();
      const code = String(r.code || '').trim();
      
      // 🆕 检查是否为替代设备
      const isSubstitute = code && substituteEquipmentsForList[code];
      
      let displayText = '';
      // 如果自编号和出厂编号都存在且不同，显示：出厂编号/自编号
      if (custom && custom !== '-' && code && code !== '-' && custom !== code) {
        displayText = `${code} / ${custom}`;
      }
      // 如果只有自编号
      else if (custom && custom !== '-') {
        displayText = custom;
      }
      // 如果只有出厂编号
      else if (code && code !== '-') {
        displayText = code;
      }
      else {
        displayText = '—';
      }
      
      // 🆕 添加{替}标记
      return isSubstitute ? (
        <span>
          {displayText} <Tag color="orange">替</Tag>
        </span>
      ) : displayText;
    } },
    { title: '设备类型', dataIndex: 'equipmentType', key: 'equipmentType', render: (v?: string) => v || '-', sorter: (a, b) => String(a.equipmentType || '').localeCompare(String(b.equipmentType || '')) },
    { title: '设备型号', dataIndex: 'model', key: 'model', render: (v?: string) => v || '-' },
    { title: '高度', dataIndex: 'height', key: 'height', render: (v?: string | number) => {
      if (v == null || v === '' || v === '-') return '-';
      // 将高度转换为数字并添加米单位
      const heightNum = typeof v === 'number' ? v : parseFloat(String(v));
      if (isNaN(heightNum)) return String(v);
      return `${heightNum}米`;
    } },
    { title: '是否转租', key: 'sublease', render: (_: any, r: EnteredEquipmentRow) => (r.isSublease ? '是' : '否') },
    { title: '租赁状态', dataIndex: 'rentalStatus', key: 'rentalStatus', render: (v: string, r: EnteredEquipmentRow) => {
      // 如果有退场日期，显示"已退租"，否则显示"租赁中"
      if (r.exitDate) return '已退租';
      return '租赁中';
    } },
    { title: '进场日期/退场日期', key: 'entryExit', render: (_: any, r: EnteredEquipmentRow) => {
      const entryDate = r.entryDate ? dayjs(r.entryDate).format('YYYY-MM-DD') : '-';
      const exitDate = r.exitDate ? dayjs(r.exitDate).format('YYYY-MM-DD') : '-';
      return `${entryDate} / ${exitDate}`;
    } },
    { 
      title: '操作', 
      key: 'actions', 
      fixed: 'right' as 'right',
      width: 100,
      render: (_: any, record: EnteredEquipmentRow) => {
        // 只有租赁中的设备才能换机，使用设备编号作为标识
        if (record.rentalStatus !== '租赁中' || !record.code) {
          return '-';
        }
        
        return (
          <Button 
            type="link" 
            size="small"
            onClick={() => {
              // 🆕 使用设备编号而不是ID（支持从进场记录中获取设备）
              setCurrentReplacementEquipmentId(record.id || 0); // 临时使用0
              setCurrentReplacementEquipmentCode(record.code);
              setEquipmentReplacementModalOpen(true);
            }}
          >
            换机
          </Button>
        );
      } 
    },
  ];

  const enteredEquipmentData = useMemo(() => {
    const items = order.equipmentItems || [];
    const entries = order.entries || [];
    const exits = order.exits || [];

    console.log('[设备清单] 构建数据...');
    console.log(`[设备清单] 全局设备列表数量: ${equipmentList?.length || 0}`);
    console.log(`[设备清单] 进场记录数量: ${entries.length}`);
    console.log(`[设备清单] 退场记录数量: ${exits.length}`);
    console.log(`[设备清单] 换机记录数量: ${equipmentReplacements.length}`);
    
    // ⚠️ 优先使用全局设备列表，如果为空则从进场记录的 equipmentDetails 构建
    let equipmentByCode = new Map((equipmentList || []).map((e: Equipment) => [String(e.code), e]));
    
    // 🆕 如果全局设备列表为空，从进场记录的 equipmentDetails 中提取设备信息
    if (equipmentByCode.size === 0) {
      console.log('[设备清单] ⚠️ 全局设备列表为空，使用进场记录中的设备详情');
      entries.forEach((entry) => {
        if (entry.equipmentDetails && Array.isArray(entry.equipmentDetails)) {
          entry.equipmentDetails.forEach((detail: any) => {
            if (detail.code) {
              // 注意：这里没有 id，后续需要根据 code 查询
              equipmentByCode.set(String(detail.code), {
                code: detail.code,
                customCode: detail.customCode,
                type: detail.type,
                model: detail.model,
                brand: detail.brand,
                height: detail.height,
                id: undefined, // 暂时没有ID，使用code作为标识
              } as any);
            }
          });
        }
      });
      console.log(`[设备清单] ✅ 从进场记录提取了 ${equipmentByCode.size} 个设备`);
    }
    
    // 🔄 新逻辑：按进场记录展开，支持同一设备多次进场
    const rows: EnteredEquipmentRow[] = [];
    
    // 遍历每条进场记录
    entries.forEach((entryRecord) => {
      const entryDate = entryRecord.entryDate;
      const equipmentCodes = entryRecord.equipmentCodes || [];
      
      // 为该进场记录中的每个设备创建一行
      equipmentCodes.forEach((code) => {
        const codeStr = String(code);
        
        // 🔄 检查是否有换机记录：该设备被替换为其他设备
        let actualCode = codeStr;
        let replacementInfo: any = null;
        const replacement = equipmentReplacements.find(
          (r) => r.old_equipment_code === codeStr && r.status === 'completed'
        );
        if (replacement) {
          actualCode = replacement.new_equipment_code;
          replacementInfo = replacement;
          console.log(`[设备清单] 🔄 设备 ${codeStr} 已换机 → ${actualCode}`);
        }
        
        const eq = equipmentByCode.get(actualCode);
        
        // 🐛 调试：检查设备匹配情况
        if (!eq) {
          console.log(`[设备清单] ⚠️ 设备编号 ${actualCode} 未在设备列表中找到`);
          console.log(`[设备清单] 可用设备编号:`, Array.from(equipmentByCode.keys()).slice(0, 5));
        } else {
          console.log(`[设备清单] ✅ 设备 ${actualCode} 匹配成功, ID: ${eq.id}`);
        }
        
        // 查找该设备在该进场记录之后最近的一次退场日期
        // 逻辑：找到所有包含该设备且退场日期>=进场日期的退场记录，取最早的一个
        let matchedExitDate: string | undefined = undefined;
        
        const matchingExits = exits.filter(exitRecord => {
          const exitCodes = exitRecord.equipmentCodes || [];
          const hasCode = exitCodes.includes(codeStr) || exitCodes.includes(code);
          const exitDate = exitRecord.exitDate;
          // 退场日期必须大于等于进场日期
          return hasCode && exitDate && entryDate && exitDate >= entryDate;
        });
        
        if (matchingExits.length > 0) {
          // 取最早的一次退场（按退场日期排序）
          matchingExits.sort((a, b) => {
            const dateA = a.exitDate || '';
            const dateB = b.exitDate || '';
            return dateA.localeCompare(dateB);
          });
          matchedExitDate = matchingExits[0].exitDate;
        }
        
        // 高度优先取设备库，其次取需求项对应高度
        const demandIndex = items.findIndex(item => 
          item.equipmentType === eq?.type && item.height === eq?.height
        );
        const fallbackHeight = demandIndex >= 0 ? items[demandIndex]?.height : undefined;
        
        // ⚠️ 修复：当找不到设备详情时，至少显示设备编号本身
        const displayCode = eq?.customCode || eq?.code || actualCode;
        
        rows.push({
          id: eq?.id, // ⚠️ 添加设备ID，用于换机功能
          code: actualCode, // 🔄 使用实际设备编号（可能已换机）
          customCode: replacementInfo 
            ? `${displayCode} (换机)` // 标注已换机
            : displayCode,
          equipmentType: eq?.type ?? (items?.[demandIndex]?.equipmentType ?? '-'),
          model: eq?.model ?? '-',
          height: eq?.height ?? fallbackHeight ?? '-',
          isSublease: eq?.source === 'sublease',
          rentalStatus: matchedExitDate ? '已退租' : '租赁中',
          entryDate: entryDate,
          exitDate: matchedExitDate, // 该设备在本次进场后的退场日期
          originalCode: replacementInfo ? codeStr : undefined, // 保存原始编号
        });
      });
    });
    
    // 按进场日期排序（最新的在前）
    rows.sort((a, b) => {
      const dateA = a.entryDate || '';
      const dateB = b.entryDate || '';
      return dateB.localeCompare(dateA); // 降序
    });
    
    console.log(`[设备清单] ✅ 构建完成，设备行数: ${rows.length}（包含多次进场的设备）`);
    return rows;
  }, [order.equipmentItems, order.entries, order.exits, equipmentList, equipmentReplacements]);

  

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
            await dispatch(deleteEntry({ orderId: order.id, entryId: record.id })).unwrap();
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
            await dispatch(deleteExit({ orderId: order.id, exitId: record.id })).unwrap();
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
    { title: '进场日期', dataIndex: 'entryDate', key: 'entryDate', sorter: (a, b) => (a.entryDate || '').localeCompare(b.entryDate || ''), render: (text) => text ? (text.split('T')[0] || text.substring(0, 10)) : '—' },
    { title: '起租日期', dataIndex: 'leaseStartDate', key: 'leaseStartDate', sorter: (a, b) => (a.leaseStartDate || '').localeCompare(b.leaseStartDate || ''), render: (text) => text ? (text.split('T')[0] || text.substring(0, 10)) : '—' },
   { title: '进场设备编号', key: 'equipmentCodes', render: (_, r) => {
      const codes = r.equipmentCodes || [];
      if (!codes.length) return '—';
      // 🆕 获取替代设备信息
      const substituteEquipments = (r as EntryRecord).substituteEquipments || {};
      
      // 优先使用后端返回的 equipmentDetails 显示自编号
      const details = (r as any).equipmentDetails || [];
      if (Array.isArray(details) && details.length) {
        return details
          .map((d: any) => {
            const customCode = String(d?.customCode ?? '').trim();
            const code = String(d?.code ?? '').trim();
            const displayCode = customCode || code || '—';
            // 🆕 检查是否为替代设备
            const isSubstitute = code && substituteEquipments[code];
            return isSubstitute ? `${displayCode}{替}` : displayCode;
          })
          .filter(code => code !== '—')
          .join(' / ');
      }
      // 兜底：使用设备列表映射出自编号
      // ⚠️ 关键修复：同时使用 code 和 customCode 作为 key 进行查找
      const eqMap = new Map<string, Equipment>();
      (equipmentList || []).forEach((e: Equipment) => {
        // 使用出厂编号作为key
        if (e.code) eqMap.set(String(e.code), e);
        // 使用自编号作为key（如果存在且不同）
        if (e.customCode && e.customCode !== e.code) eqMap.set(String(e.customCode), e);
      });
      
      const displayList = codes.map(code => {
        const eq = eqMap.get(String(code));
        // 优先显示自编号，如果没有则显示出厂编号
        const custom = String(eq?.customCode || '').trim();
        const displayCode = custom || String(code || '').trim() || '—';
        // 🆕 检查是否为替代设备
        const isSubstitute = substituteEquipments[String(code)];
        return isSubstitute ? `${displayCode}{替}` : displayCode;
      }).filter(code => code !== '—');
      return displayList.length > 0 ? displayList.join(' / ') : '—';
    } },
    { title: '运输方式', dataIndex: 'transportMethod', key: 'transportMethod', render: (text) => text || '—' },
    { title: '业务负责人', dataIndex: 'businessManagerName', key: 'businessManagerName', render: (text) => text || '—' },
    { title: '交机人', dataIndex: 'handoverPerson', key: 'handoverPerson', render: (text) => text || '—' },
    { title: '物流车辆', dataIndex: 'vehiclePlate', key: 'vehiclePlate', render: (text) => text || '—' },
    { title: '司机', key: 'driver', render: (_, r) => (r.driverName ? `${r.driverName}${r.driverPhone ? ' / ' + r.driverPhone : ''}` : '—') },
    { title: '物流公司', dataIndex: 'companyName', key: 'companyName', render: (text) => text || '—' },
    { title: '物流成本', dataIndex: 'logisticsCost', key: 'logisticsCost', render: (v?: number) => (v != null ? `¥${(v||0).toLocaleString()}` : '—') },
    { title: '操作', key: 'action', render: (_, record) => (
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            { key: 'attach', label: '附件上传/查看' },
            { key: 'download', label: '下载进场单' },
            { key: 'edit', label: '修改信息' },
            { key: 'delete', label: '删除记录' },
          ],
          onClick: ({ key }) => onEntryRowAction(key as string, record),
        }}
      >
        <Button size="small">操作</Button>
      </Dropdown>
    ) },
  ];

  const exitColumns: ColumnsType<ExitRecord> = [
    { title: '序号', key: 'index', render: (_, __, index) => index + 1, width: 80 },
    { title: '退场单号', dataIndex: 'exitNumber', key: 'exitNumber', render: (text) => text || '—' },
    { title: '退场日期', dataIndex: 'exitDate', key: 'exitDate', sorter: (a, b) => (a.exitDate || '').localeCompare(b.exitDate || ''), render: (text) => text ? (text.split('T')[0] || text.substring(0, 10)) : '—' },
    { title: '租金截止日期', dataIndex: 'rentEndDate', key: 'rentEndDate', sorter: (a, b) => (a.rentEndDate || '').localeCompare(b.rentEndDate || ''), render: (text) => text ? (text.split('T')[0] || text.substring(0, 10)) : '—' },
   { title: '退场设备编号', key: 'equipmentCodes', render: (_, r) => {
      const codes = r.equipmentCodes || [];
      if (!codes.length) return '—';
      // 优先使用后端返回的 equipmentDetails 显示自编号
      const details = (r as any).equipmentDetails || [];
      if (Array.isArray(details) && details.length) {
        return details
          .map((d: any) => {
            const customCode = String(d?.customCode ?? '').trim();
            return customCode || String(d?.code ?? '').trim() || '—';
          })
          .filter(code => code !== '—')
          .join(' / ');
      }
      // 兜底：使用设备列表映射出自编号
      // ⚠️ 关键修复：同时使用 code 和 customCode 作为 key 进行查找
      const eqMap = new Map<string, Equipment>();
      (equipmentList || []).forEach((e: Equipment) => {
        // 使用出厂编号作为key
        if (e.code) eqMap.set(String(e.code), e);
        // 使用自编号作为key（如果存在且不同）
        if (e.customCode && e.customCode !== e.code) eqMap.set(String(e.customCode), e);
      });
      
      const displayList = codes.map(code => {
        const eq = eqMap.get(String(code));
        // 优先显示自编号，如果没有则显示出厂编号
        const custom = String(eq?.customCode || '').trim();
        return custom || String(code || '').trim() || '—';
      }).filter(code => code !== '—');
      return displayList.length > 0 ? displayList.join(' / ') : '—';
    } },
    { title: '运输方式', dataIndex: 'transportMethod', key: 'transportMethod', render: (text) => text || '—' },
    { title: '业务负责人', dataIndex: 'businessManagerName', key: 'businessManagerName', render: (text) => text || '—' },
    { title: '交机人', dataIndex: 'handoverPerson', key: 'handoverPerson', render: (text) => text || '—' },
    { title: '物流车辆', dataIndex: 'vehiclePlate', key: 'vehiclePlate', render: (text) => text || '—' },
    { title: '司机', key: 'driver', render: (_, r) => (r.driverName ? `${r.driverName}${r.driverPhone ? ' / ' + r.driverPhone : ''}` : '—') },
    { title: '物流公司', dataIndex: 'companyName', key: 'companyName', render: (text) => text || '—' },
    { title: '物流成本', dataIndex: 'logisticsCost', key: 'logisticsCost', render: (v?: number) => (v != null ? `¥${(v||0).toLocaleString()}` : '—') },
    { title: '操作', key: 'action', render: (_, record) => (
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            { key: 'attach', label: '附件上传/查看' },
            { key: 'download', label: '下载退场单' },
            { key: 'edit', label: '修改信息' },
            { key: 'delete', label: '删除记录' },
          ],
          onClick: ({ key }) => onExitRowAction(key as string, record),
        }}
      >
        <Button size="small">操作</Button>
      </Dropdown>
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
      {/* 合同管理 */}
      {order.contractTemplateId && (
        <Card 
          title={
            <Space>
              <FileWordOutlined />
              <span>合同管理</span>
              {order.hasContract && <Tag color="success">已生成</Tag>}
            </Space>
          }
          size="small"
          extra={
            <ContractGenerator
              orderId={order.id}
              templateId={order.contractTemplateId}
              buttonText="生成合同"
              type="primary"
              onSuccess={() => {
                message.success('合同生成成功！文件已下载');
                dispatch(fetchOrderById(orderId));
              }}
            />
          }
        >
          <Descriptions column={2} size="small">
            <Descriptions.Item label="合同模板">
              {order.templateName || '默认模板'}
            </Descriptions.Item>
            <Descriptions.Item label="合同状态">
              {order.hasContract ? (
                <Tag color="success" icon={<CheckCircleOutlined />}>已生成</Tag>
              ) : (
                <Tag>未生成</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Card title="结算信息" size="small">
        <Row gutter={[16, 8]}>
          <Col xs={24} md={8}><Descriptions column={1} size="small"><Descriptions.Item label="月计费方式">{order.monthCalculationMethod}</Descriptions.Item></Descriptions></Col>
          <Col xs={24} md={8}><Descriptions column={1} size="small"><Descriptions.Item label="支付方式">{order.paymentAgreement}</Descriptions.Item></Descriptions></Col>
          <Col xs={24} md={8}><Descriptions column={1} size="small"><Descriptions.Item label="运费减免">{order.shippingFeeReduction}</Descriptions.Item></Descriptions></Col>
          <Col xs={24} md={8}><Descriptions column={1} size="small"><Descriptions.Item label="运费计费方式">{order.shippingFeeCalculation}</Descriptions.Item></Descriptions></Col>
          <Col xs={24} md={8}><Descriptions column={1} size="small"><Descriptions.Item label="开票类型">{order.isTaxInvoice}</Descriptions.Item></Descriptions></Col>
          <Col xs={24} md={8}><Descriptions column={1} size="small"><Descriptions.Item label="发票税额">{order.invoiceTaxRate ?? '-'}</Descriptions.Item></Descriptions></Col>
        </Row>
      </Card>

      <Card title="项目信息" size="small">
        <Row gutter={[16, 8]}>
          <Col xs={24} md={8}><Descriptions column={1} size="small"><Descriptions.Item label="项目名称">{order.projectName}</Descriptions.Item></Descriptions></Col>
          <Col xs={24} md={8}><Descriptions column={1} size="small"><Descriptions.Item label="交机地点">{order.deliveryLocation}</Descriptions.Item></Descriptions></Col>
          <Col xs={24} md={8}><Descriptions column={1} size="small"><Descriptions.Item label="施工类别">{order.constructionCategory}</Descriptions.Item></Descriptions></Col>
          <Col xs={24} md={24}><Descriptions column={1} size="small"><Descriptions.Item label="其他约定">{order.otherAgreements || '-'}</Descriptions.Item></Descriptions></Col>
        </Row>
      </Card>

      <Card title="电子签章" size="small">
        <Row gutter={[16, 8]}>
          <Col xs={24} md={8}><Descriptions column={1} size="small"><Descriptions.Item label="签署方">{order.customerName}</Descriptions.Item></Descriptions></Col>
          <Col xs={24} md={8}><Descriptions column={1} size="small"><Descriptions.Item label="签署进度">{order.archivedAt ? '已归档' : '进行中'}</Descriptions.Item></Descriptions></Col>
          <Col xs={24} md={8}><Descriptions column={1} size="small"><Descriptions.Item label="操作">{order.archivedAt ? '—' : '详情'}</Descriptions.Item></Descriptions></Col>
        </Row>
      </Card>

      <Card title="设备需求" size="small">
        <Table<OrderEquipmentItem>
          size="small"
          rowKey={(r) => r.id || String(Math.random())}
          columns={equipmentColumns}
          dataSource={order.equipmentItems || []}
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      {/* 订单日志 */}
      <OrderLogs orderId={orderId} />

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
          // ⚠️ 关键修复：保留 equipmentItems，避免后端清空设备需求
          const updated = { 
            ...order, 
            entries: next,
            equipmentItems: order.equipmentItems // 明确保留原有的设备需求
          };
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
        <Button icon={<PlusOutlined />}>上传附件</Button>
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
          // ⚠️ 关键修复：保留 equipmentItems，避免后端清空设备需求
          const updated = { 
            ...order, 
            exits: next,
            equipmentItems: order.equipmentItems // 明确保留原有的设备需求
          };
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
        <Button icon={<PlusOutlined />}>上传附件</Button>
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
          // ⚠️ 关键修复：保留 equipmentItems，避免后端清空设备需求
          const updated = { 
            ...order, 
            entries: next,
            equipmentItems: order.equipmentItems // 明确保留原有的设备需求
          };
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
          // ⚠️ 关键修复：保留 equipmentItems，避免后端清空设备需求
          const updated = { 
            ...order, 
            exits: next,
            equipmentItems: order.equipmentItems // 明确保留原有的设备需求
          };
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
                  { title: '收款日期', dataIndex: 'receiptDate', key: 'receiptDate', render: (text: string) => text ? (text.split('T')[0] || text.substring(0, 10)) : '—' },
                  { title: '收款方式', dataIndex: 'paymentMethod', key: 'paymentMethod' },
                  { title: '金额', dataIndex: 'amount', key: 'amount', render: (v: number) => `¥${(v||0).toLocaleString()}` },
                  { 
                    title: '操作', 
                    key: 'action', 
                    width: 100,
                    render: (_: any, record: any) => (
                      <Popconfirm
                        title="确认删除"
                        description="确定要删除这条收款记录吗？"
                        onConfirm={async () => {
                          try {
                            await dispatch(deleteReceipt({ orderId, receiptId: record.id })).unwrap();
                            message.success('收款记录已删除');
                            await dispatch(fetchOrderById(orderId));
                          } catch (err: any) {
                            message.error(err || '删除失败');
                          }
                        }}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button size="small" danger>删除</Button>
                      </Popconfirm>
                    )
                  },
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
                  { title: '退款日期', dataIndex: 'refundDate', key: 'refundDate', render: (text: string) => text ? (text.split('T')[0] || text.substring(0, 10)) : '—' },
                  { title: '退款方式', dataIndex: 'paymentMethod', key: 'paymentMethod' },
                  { title: '金额', dataIndex: 'amount', key: 'amount', render: (v: number) => `¥${(v||0).toLocaleString()}` },
                  { 
                    title: '操作', 
                    key: 'action', 
                    width: 100,
                    render: (_: any, record: any) => (
                      <Popconfirm
                        title="确认删除"
                        description="确定要删除这条退款记录吗？"
                        onConfirm={async () => {
                          try {
                            await dispatch(deleteRefund({ orderId, refundId: record.id })).unwrap();
                            message.success('退款记录已删除');
                            await dispatch(fetchOrderById(orderId));
                          } catch (err: any) {
                            message.error(err || '删除失败');
                          }
                        }}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button size="small" danger>删除</Button>
                      </Popconfirm>
                    )
                  },
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
                  { title: '结算周期', key: 'cycle', render: (_: any, r: any) => `${fmtDateTime(r.cycleStartDate)} 至 ${fmtDateTime(r.cycleEndDate)}` },
                  { title: '生成日期', key: 'createdAt', render: (_: any, r: any) => (r.createdAt ? dayjs(r.createdAt).format('YYYY-MM-DD HH:mm:ss') : '—') },
                  { title: '结算金额', dataIndex: 'settlementAmount', key: 'settlementAmount', render: (v: number, r: any) => (
                    <Tooltip title="查看详细计算过程">
                      <Button type="link" onClick={() => openCalc(r)}>{fmtCurrency(v)}</Button>
                    </Tooltip>
                  ) },
                  { title: '对账状态', dataIndex: 'status', key: 'status', render: (s: string) => (<Tag color={statusColor(s)}>{s || '待对账'}</Tag>) },
                  { title: '操作', key: 'op', render: (_: any, r: any) => {
                    const isReconciled = r.status === '已对账';
                    const menuItems = [
                      {
                        key: 'edit',
                        icon: <EditOutlined />,
                        label: '修改',
                        onClick: () => {
                          // 打开结算界面用于修改
                          const editTabKey = `settlement-edit-${orderId}-${r.id}`;
                          openTab({
                            key: editTabKey,
                            label: `修改结算单 ${r.settlementNumber || ''}`,
                            content: <SettlementTab order={order} tabKey={editTabKey} editRecord={r} />
                          });
                        }
                      },
                      {
                        key: 'reconcile',
                        icon: <CheckCircleOutlined />,
                        label: isReconciled ? '取消对账' : '对账',
                        onClick: () => {
                          Modal.confirm({
                            title: isReconciled ? '确认取消对账？' : '确认对账？',
                            content: isReconciled 
                              ? '取消对账后，状态将变为"待对账"' 
                              : '确认对账后，状态将变为"已对账"',
                            okText: '确认',
                            cancelText: '取消',
                            onOk: async () => {
                              try {
                                await dispatch(updateSettlement({
                                  orderId,
                                  settlementId: r.id,
                                  updates: { status: isReconciled ? '待对账' : '已对账' }
                                })).unwrap();
                                message.success(isReconciled ? '已取消对账' : '对账成功');
                                dispatch(fetchOrderById(orderId));
                              } catch (e: any) {
                                message.error(e?.message || '操作失败');
                              }
                            }
                          });
                        }
                      },
                      {
                        key: 'export',
                        icon: <ExportOutlined />,
                        label: '导出',
                        onClick: () => {
                          // 导出为可编辑的表格
                          handleExportSettlement(r);
                        }
                      },
                      {
                        type: 'divider' as const
                      },
                      {
                        key: 'delete',
                        icon: <DeleteOutlined />,
                        label: '删除',
                        danger: true,
                        onClick: () => {
                          Modal.confirm({
                            title: '确认删除结算单？',
                            content: `确定要删除结算单 ${r.settlementNumber || ''} 吗？此操作不可恢复。`,
                            okText: '删除',
                            okType: 'danger',
                            cancelText: '取消',
                            onOk: async () => {
                              try {
                                await dispatch(deleteSettlement({
                                  orderId,
                                  settlementId: r.id
                                })).unwrap();
                                message.success('删除成功');
                                dispatch(fetchOrderById(orderId));
                              } catch (e: any) {
                                message.error(e?.message || '删除失败');
                              }
                            }
                          });
                        }
                      }
                    ];
                    return (
                      <Dropdown menu={{ items: menuItems }} trigger={['click']}>
                        <Button type="link">
                          操作 <DownOutlined />
                        </Button>
                      </Dropdown>
                    );
                  } },
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
                          <Typography.Text>{`${fmtDateTime(settlementDetailRecord.cycleStartDate)} 至 ${fmtDateTime(settlementDetailRecord.cycleEndDate)}`}</Typography.Text>
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
                rowKey={(r: any) => `${r.code}_${r.entryDate}_${r.entryId || ''}`}
                columns={enteredEquipmentColumns as any}
                dataSource={enteredEquipmentData}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 'max-content' }}
              />
            </Card>
          ) },
          { key: 'suspensionClaim', label: '报停索赔', children: (
            <SuspensionClaimDocuments orderId={orderId} order={order} />
          ) },
          { key: 'equipmentReplacement', label: '换机记录', children: (
            <EquipmentReplacementHistory
              orderId={orderId}
              onReplacementComplete={() => {
                // 刷新订单详情、设备列表和换机记录
                dispatch(fetchOrderById(orderId));
                loadEquipmentList();
                loadEquipmentReplacements();
              }}
            />
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
                  { title: '出厂编号', dataIndex: 'code', key: 'code' },
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

      {/* 报修模态框 */}
      {selectedOrderForRepair && (
        <OrderRepairModal
          open={!!selectedOrderForRepair}
          onCancel={() => setSelectedOrderForRepair(null)}
          order={selectedOrderForRepair}
        />
      )}

      {/* 换机模态框 */}
      {currentReplacementEquipmentCode && (
        <EquipmentReplacementModal
          visible={equipmentReplacementModalOpen}
          onClose={() => {
            setEquipmentReplacementModalOpen(false);
            setCurrentReplacementEquipmentId(null);
            setCurrentReplacementEquipmentCode('');
          }}
          onSuccess={() => {
            // 刷新订单详情
            dispatch(fetchOrderById(orderId));
          }}
          order={order}
          currentEquipmentId={currentReplacementEquipmentCode}
        />
      )}
    </div>
  );
};

export default OrderDetailTab;