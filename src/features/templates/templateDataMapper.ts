/**
 * 模板数据映射工具
 * 将订单数据映射为模板变量
 */

import type { TemplateType } from './types';

/**
 * 通用数据映射接口
 */
export interface TemplateData {
  [key: string]: any;
}

/**
 * 订单数据结构（简化版，根据实际需要扩展）
 */
export interface OrderData {
  id?: number;
  contractNumber?: string;
  customerName?: string;
  projectName?: string;
  deliveryLocation?: string;
  paymentTerms?: string;
  monthCalculationMethod?: string;
  vendorName?: string;
  storeName?: string;
  equipmentDemands?: any[];
  entryEquipments?: any[];
  exitEquipments?: any[];
  settlementItems?: any[];
  settlementPeriodStart?: string;
  settlementPeriodEnd?: string;
  totalAmount?: number;
  outstandingAmount?: number;
  [key: string]: any;
}

/**
 * 格式化日期为中文格式
 */
const formatDate = (date?: string | Date): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN');
};

/**
 * 格式化金额
 */
const formatCurrency = (amount?: number): string => {
  if (amount === undefined || amount === null) return '0.00';
  return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * 将订单数据映射为模板数据
 * @param order 订单数据
 * @param type 模板类型
 * @param extra 额外数据（如物流信息）
 */
export const mapOrderToTemplateData = (
  order: OrderData,
  type: TemplateType,
  extra?: Record<string, any>
): TemplateData => {
  // 基础数据（所有模板通用）
  const baseData: TemplateData = {
    // 系统信息
    print_date: formatDate(new Date()),
    
    // 公司信息
    lessor_name: order.vendorName || '出租方公司名称',
    lessee_name: order.customerName || '承租方',
    
    // 订单信息
    contract_number: order.contractNumber || '',
    contract_name: order.contractNumber || '',
    project_name: order.projectName || '',
    customer_name: order.customerName || '',
    delivery_location: order.deliveryLocation || '',
    payment_agreement: order.paymentTerms || '',
    month_calc_method: order.monthCalculationMethod === 'natural' ? '自然月' : '30天',
    
    // 门店信息
    store_name: order.storeName || '',
    
    // 合并额外数据
    ...extra,
  };

  // 根据不同模板类型映射特定数据
  switch (type) {
    case '合同':
      return {
        ...baseData,
        items: (order.equipmentDemands || []).map((item: any, index: number) => ({
          index: index + 1,
          equipment_type: item.equipmentType || item.type || '',
          height: item.height || '',
          daily_price: formatCurrency(item.dailyRate),
          monthly_rate: formatCurrency(item.monthlyRate),
          quantity: item.quantity || 1,
        })),
      };

    case '进场':
      return {
        ...baseData,
        entry_number: `ENTRY-${order.id || Date.now()}`,
        logistics_type: extra?.logisticsType || '自送',
        entry_current_count: (order.entryEquipments || []).length,
        rented_total_count: extra?.rentedTotalCount || 0,
        items: (order.entryEquipments || []).map((item: any, index: number) => ({
          index: index + 1,
          equipment_code: item.code || item.equipmentCode || '',
          equipment_type: item.type || item.equipmentType || '',
          height: item.height || '',
          brand: item.brand || '',
          model: item.model || '',
        })),
      };

    case '退场':
    case '收车':
      return {
        ...baseData,
        exit_number: `EXIT-${order.id || Date.now()}`,
        pickup_location: extra?.pickupLocation || order.deliveryLocation || '',
        return_store_name: extra?.returnStoreName || order.storeName || '',
        driver_name: extra?.driverName || '',
        logistics_type: extra?.logisticsType || '自提',
        settlement_date: formatDate(extra?.settlementDate),
        items: (order.exitEquipments || []).map((item: any, index: number) => ({
          index: index + 1,
          equipment_code: item.code || item.equipmentCode || '',
          equipment_type: item.type || item.equipmentType || '',
          height: item.height || '',
        })),
      };

    case '结算':
      return {
        ...baseData,
        period_start: formatDate(order.settlementPeriodStart),
        period_end: formatDate(order.settlementPeriodEnd),
        total_amount: formatCurrency(order.totalAmount),
        total_outstanding: formatCurrency(order.outstandingAmount),
        items: (order.settlementItems || []).map((item: any, index: number) => ({
          index: index + 1,
          equipment_code: item.code || item.equipmentCode || '',
          days: item.rentalDays || 0,
          daily_price: formatCurrency(item.dailyRate),
          amount: formatCurrency(item.amount),
        })),
      };

    case '索赔':
      return {
        ...baseData,
        claim_number: `CLAIM-${order.id || Date.now()}`,
        claim_date: formatDate(extra?.claimDate),
        claim_reason: extra?.claimReason || '',
        claim_amount: formatCurrency(extra?.claimAmount),
        items: (extra?.claimItems || []).map((item: any, index: number) => ({
          index: index + 1,
          equipment_code: item.code || '',
          damage_description: item.damageDescription || '',
          repair_cost: formatCurrency(item.repairCost),
        })),
      };

    case '报停':
      return {
        ...baseData,
        suspension_number: `SUSP-${order.id || Date.now()}`,
        suspension_start_date: formatDate(extra?.suspensionStartDate),
        suspension_end_date: formatDate(extra?.suspensionEndDate),
        suspension_reason: extra?.suspensionReason || '',
        items: (extra?.suspensionEquipments || []).map((item: any, index: number) => ({
          index: index + 1,
          equipment_code: item.code || '',
          equipment_type: item.type || '',
        })),
      };

    case '清场':
      return {
        ...baseData,
        clearance_number: `CLEAR-${order.id || Date.now()}`,
        clearance_date: formatDate(extra?.clearanceDate),
        items: (extra?.clearanceEquipments || []).map((item: any, index: number) => ({
          index: index + 1,
          equipment_code: item.code || '',
          equipment_type: item.type || '',
          return_condition: item.returnCondition || '正常',
        })),
      };

    default:
      return baseData;
  }
};

/**
 * 预览数据（用于测试模板）
 */
export const getPreviewData = (type: TemplateType): TemplateData => {
  const mockOrder: OrderData = {
    id: 1001,
    contractNumber: 'HT-2025-001',
    customerName: '示例建筑公司',
    projectName: '示例项目工程',
    deliveryLocation: '北京市朝阳区示例路100号',
    paymentTerms: '月结30天',
    monthCalculationMethod: 'natural',
    vendorName: '高空车租赁公司',
    storeName: '北京朝阳门店',
    equipmentDemands: [
      { equipmentType: '臂式高空车', height: '18米', dailyRate: 500, monthlyRate: 12000, quantity: 2 },
      { equipmentType: '剪叉式高空车', height: '12米', dailyRate: 350, monthlyRate: 8400, quantity: 1 },
    ],
    entryEquipments: [
      { code: 'EQ-001', type: '臂式高空车', height: '18米', brand: '吉尼', model: 'Z-45' },
      { code: 'EQ-002', type: '臂式高空车', height: '18米', brand: '吉尼', model: 'Z-45' },
    ],
    exitEquipments: [
      { code: 'EQ-001', type: '臂式高空车', height: '18米' },
    ],
    settlementItems: [
      { code: 'EQ-001', rentalDays: 30, dailyRate: 500, amount: 15000 },
      { code: 'EQ-002', rentalDays: 25, dailyRate: 500, amount: 12500 },
    ],
    settlementPeriodStart: '2025-01-01',
    settlementPeriodEnd: '2025-01-31',
    totalAmount: 27500,
    outstandingAmount: 5000,
  };

  const mockExtra = {
    logisticsType: '自送',
    rentedTotalCount: 3,
    driverName: '张师傅',
    returnStoreName: '北京朝阳门店',
    settlementDate: '2025-02-01',
  };

  return mapOrderToTemplateData(mockOrder, type, mockExtra);
};


