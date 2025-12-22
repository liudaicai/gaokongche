// 配件类别
export type PartCategory = '电控系统' | '液压系统' | '结构件' | '易损件';

// 交易类型
export type TransactionType = 'stock_in' | 'use' | 'return' | 'scrap';

// 配件库存信息
export interface PartStock {
  storeId: number;
  storeName: string;
  quantity: number;
}

// 配件基础信息
export interface Part {
  id: number;
  code: string; // 配件编号，格式：PJ+YYYYMMDD+序号
  category: PartCategory; // 配件类别
  name?: string; // 配件名称
  brand?: string; // 品牌
  model?: string; // 规格型号
  purchasePrice?: number; // 采购价格
  applicableRange?: string; // 适用范围
  remark?: string; // 备注
  companyId?: number;
  createdBy?: number;
  creatorName?: string;
  stocks?: PartStock[]; // 各门店库存
  totalQuantity?: number; // 总库存数量
  createdAt?: string;
  updatedAt?: string;
}

// 交易状态类型
export type TransactionStatus = 'pending' | 'completed' | 'cancelled';

// 配件出入库记录
export interface PartTransaction {
  id: number;
  transactionId?: number; // 交易ID（用于待核销列表）
  transactionNo: string; // 单号
  transactionType: TransactionType; // 交易类型
  status?: TransactionStatus; // 状态：pending待核销/completed已完成/cancelled已取消
  partId: number;
  partCode?: string; // 配件编号
  partName?: string; // 配件名称
  partBrand?: string; // 品牌
  partModel?: string; // 规格型号
  partCategory?: string; // 配件类别
  storeId: number;
  storeName?: string;
  quantity: number; // 数量（正数为入库/退回/待核销，负数为领用已核销/报废）
  remainingStock?: number; // 剩余库存
  operatorId?: number;
  operatorName?: string;
  operatorRealName?: string; // 操作人真实姓名
  transactionTime: string;
  remark?: string;
  companyId?: number;
  // 核销相关字段
  equipmentId?: number;
  equipmentCode?: string;
  repairId?: number; // 维修单ID
  repairNumber?: string; // 维修单号
  writeOffTime?: string;
  writeOffBy?: number;
  writeOffRemark?: string;
  createdAt?: string;
}

// 配件核销表单数据
export interface WriteOffFormData {
  transactionId: number;
  equipmentId?: number;
  equipmentCode?: string;
  repairId?: number; // 维修单ID
  repairNumber?: string; // 维修单号
  quantity: number;
  remark?: string;
}

// 退回待核销配件表单数据
export interface ReturnPendingFormData {
  transactionId: number;
  quantity: number;
  remark?: string;
}

// 新增配件表单数据
export interface AddPartFormData {
  code: string;
  category: PartCategory;
  name: string;
  brand?: string;
  model?: string;
  purchasePrice?: number;
  applicableRange?: string;
  remark?: string;
}

// 入库表单数据
export interface StockInFormData {
  transactionNo: string;
  storeId: number;
  operatorName: string;
  parts: {
    partId: number;
    quantity: number;
  }[];
}

// 配件选择项
export interface PartSelectItem {
  partId: number;
  quantity: number;
}

// 操作类型（领用、退回、报废）
export interface PartOperationData {
  partId: number;
  storeId: number;
  quantity: number;
  remark?: string;
}
