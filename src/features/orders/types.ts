// 订单相关类型定义
export interface Order {
  id: string;
  contractNumber: string;
  lessorId?: string;
  lessorCompanyId?: string;
  lessorName?: string;
  customerId: string;
  customerName?: string;
  projectName: string;
  businessManagerId?: string;
  businessManagerName?: string;
  monthCalculationMethod: string;
  paymentAgreement: string;
  shippingFeeReduction?: string;
  shippingFeeCalculation?: string;
  isTaxInvoice?: string;
  invoiceTaxRate?: number;
  constructionCategory?: string;
  deliveryLocation: string;
  otherAgreements?: string;
  equipmentItems?: OrderEquipmentItem[];
  rentedEquipmentIds?: string[][];
  estimatedAmount?: number;
  receipts?: ReceiptRecord[];
  refunds?: RefundRecord[];
  suspensions?: SuspensionRecord[];
  claims?: ClaimRecord[];
  settlements?: SettlementRecord[];
  clearances?: ClearanceRecord[];
  archivedAt?: string;
  entryAttachments?: Record<string, any[]>;
  exitAttachments?: Record<string, any[]>;
  entries?: EntryRecord[];
  exits?: ExitRecord[];
  status: OrderStatus;
  creationDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderStatus {
  entryCount: number;
  exitCount: number;
  performanceStatus: '履约' | '违约';
  actualReceivedAmount: number;
}

export interface OrderEquipmentItem {
  id?: string;
  equipmentCategory?: string;
  equipmentType: string;
  height: string | number;
  quantity: number;
  dailyRate: number;
  monthlyRate: number;
  deposit: number;
  shippingFee: number;
  modificationFee?: number;
  scheduledEntryDate: string;
  estimatedExitDate: string;
  rentalPeriod: number;
  shippingType: '单程' | '双程';
}

export interface OrderFormData {
  lessorId?: string;
  customerId?: string;
  projectName: string;
  businessManagerId?: string;
  monthCalculationMethod: string;
  paymentAgreement: string;
  shippingFeeReduction: string;
  shippingFeeCalculation: string;
  isTaxInvoice: string;
  invoiceTaxRate?: number;
  constructionCategory: string;
  deliveryLocation: string;
  otherAgreements?: string;
  equipmentItems: OrderEquipmentItem[];
}

export interface EntryRecord {
  id: string;
  entryNumber: string;
  entryDate: string;
  leaseStartDate?: string;
  equipmentCodes: string[];
  equipmentSummary?: string;
  equipmentCount?: number;
  transportMethod: '客户自提' | '我方物流' | '第三方物流' | '陆运' | '海运' | '空运';
  businessManagerName?: string;
  handoverPerson?: string;
  attachments?: Array<{ uid: string; name: string; type?: string; size?: number }>;
  // 🆕 替代设备信息：记录高度高于需求的设备，key为设备编码
  substituteEquipments?: Record<string, { requiredHeight: number; actualHeight: number }>;
  // 设备详情：包含设备的完整信息（code, customCode, type, model, brand, height等）
  equipmentDetails?: Array<{
    code: string;
    customCode?: string;
    type?: string;
    model?: string;
    brand?: string;
    height?: string | number;
    equipmentId?: string | number;
    id?: string | number;
  }>;
  vehicleId?: string;
  driverId?: string;
  companyId?: string;
  companyContactName?: string;
  companyContactPhone?: string;
  logisticsCost?: number;
  vehiclePlate?: string;
  driverName?: string;
  driverPhone?: string;
  companyName?: string;
  storeId?: string | number;
}

export interface ExitRecord {
  id: string;
  exitNumber: string;
  exitDate: string;
  rentEndDate?: string;
  settlementDate?: string;
  equipmentCodes: string[];
  equipmentSummary?: string;
  equipmentCount?: number;
  transportMethod: '客户自提' | '我方物流' | '第三方物流' | '陆运' | '海运' | '空运';
  businessManagerName?: string;
  handoverPerson?: string;
  attachments?: Array<{ uid: string; name: string; type?: string; size?: number }>;
  vehicleId?: string;
  driverId?: string;
  companyId?: string;
  companyContactName?: string;
  companyContactPhone?: string;
  logisticsCost?: number;
  vehiclePlate?: string;
  driverName?: string;
  driverPhone?: string;
  companyName?: string;
}

export interface ReceiptRecord {
  id: string;
  receiptNumber: string;
  contractName?: string;
  receiptDate: string;
  receiptAmount: number;
  amount?: number;  // 兼容旧字段
  paymentMethod: string;
  attachments?: any[];  // 附件（支持对象数组）
  createdAt?: string;  // 创建时间
  remark?: string;
}

export interface RefundRecord {
  id: string;
  refundNumber: string;
  contractName?: string;
  refundDate: string;
  refundAmount: number;
  amount?: number;  // 兼容旧字段
  paymentMethod: string;
  attachments?: any[];  // 附件（支持对象数组）
  createdAt?: string;  // 创建时间
  remark?: string;
}

export interface SuspensionRecord {
  id: string;
  suspensionNumber: string;
  contractName?: string;
  suspensionType?: string;  // 报停类型
  suspensionDays?: number;  // 报停天数
  startDate: string;
  endDate: string;
  equipmentSelections: string[][];
  attachments?: any[];  // 附件
  reason?: string;
}

export interface ClaimRecord {
  id: string;
  claimNumber: string;
  contractName?: string;  // 合同名称
  claimType?: string;  // 索赔类型
  claimDate: string;
  claimAmount?: number;  // 改为可选
  equipmentSelections: string[][];
  attachments?: any[];  // 附件
  reason?: string;
}

export interface SettlementRecord {
  id: string;
  settlementNumber: string;
  contractName?: string;
  settlementDate: string;
  settlementAmount: number;
  cycleStartDate: string;
  cycleEndDate: string;
  attachments?: any[];  // 附件（支持对象数组）
  createdAt?: string;  // 创建时间
  remark?: string;  // 备注
  status?: string;
}

export interface ClearanceRecord {
  id: string;
  clearanceNumber: string;
  contractName?: string;  // 合名称
  clearanceDate: string;
  clearanceAmount?: number;  // 改为可选
  remark?: string;  // 备注
  attachments?: any[];  // 附件（支持对象数组）
}

export interface OrderItem {
  id: string;
  orderId: string;
  equipmentType: string;
  height: string;
  quantity: number;
  dailyRate: number;
  monthlyRate: number;
  deposit: number;
  shippingFee: number;
  modificationFee: number;
  scheduledEntryDate: string;
  estimatedExitDate: string;
  rentalPeriod: number;
  shippingType: string;
}

export interface EquipmentFilter {
  equipmentType: string;
  height: string;
  status: string;
}

export interface OrdersState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  selectedOrder: Order | null;
  detailsById: Record<string, Order>;
  detailsLoadingById: Record<string, boolean>;
}

// 报停相关类型
export interface OrderSuspension {
  id: number;
  orderId: number;
  equipmentId?: number;
  equipmentCode?: string;
  suspensionType: 'weather' | 'site_stop' | 'maintenance' | 'customer_request';
  reason?: string;
  startDate: string;
  endDate?: string;
  suspensionDays?: number;
  isChargeFree: boolean;
  discountRate: number;
  status: 'pending' | 'approved' | 'rejected' | 'ended';
  attachments?: string[];
  notes?: string;
  approvedBy?: number;
  approvedAt?: string;
  approverName?: string;
  createdBy?: number;
  creatorName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SuspensionStats {
  totalSuspensions: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  endedCount: number;
  totalSuspensionDays: number;
  freeSuspensionDays: number;
}

export interface CreateSuspensionData {
  equipmentId?: number;
  suspensionType: string;
  reason?: string;
  startDate: string;
  endDate?: string;
  attachments?: string[];
}

export interface ApproveSuspensionData {
  status: 'approved' | 'rejected';
  isChargeFree?: boolean;
  discountRate?: number;
  notes?: string;
}

export interface EndSuspensionData {
  endDate: string;
  notes?: string;
}
