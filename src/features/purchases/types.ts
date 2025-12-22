// 采购管理类型定义（重新设计）

// 购买方式
export type PurchaseType = 'cash' | 'installment' | 'financing';

// 驱动类型
export type DriveType = '电驱' | '液驱' | '油动';

// 采购明细项
export interface PurchaseItem {
  id?: number;
  purchaseId?: number;
  modelId?: number | string; // 型号ID（仅用于前端选择联动，提交时可剔除）
  equipmentCategory: string;
  brand: string; // 品牌
  equipmentType: string;
  equipmentModel: string;
  equipmentHeight?: number; // 设备高度（米）
  driveType?: string; // 驱动类型
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt?: string;
  updatedAt?: string;
}

// 还款计划
export interface RepaymentPlan {
  startDate: string;
  endDate: string;
}

// 还款账户信息
export interface RepaymentAccount {
  accountName: string;
  accountNumber: string;
  bank: string;
}

// 附件
export interface Attachment {
  name: string;
  url: string;
  size?: number;
  uploadTime?: string;
}

// 设备采购记录（主表）
export interface EquipmentPurchase {
  id: number;
  companyId: number;
  purchaseNumber: string;
  
  // 日期信息
  purchaseDate: string;
  
  // 财务信息
  downPaymentRatio?: number; // 首付比例（%）
  paymentTerms: number; // 账期（月）
  taxRate: number; // 税率（%）
  
  // 购买方式
  purchaseType: PurchaseType;
  downPayment?: number; // 首付金额
  loanAmount?: number; // 贷款/融资金额
  
  // 分期相关
  installmentPeriods?: number; // 分期期数
  installmentStartMonth?: string; // 月供起始月份
  installmentEndMonth?: string; // 月供结束月份
  
  // 融资相关
  annualInterestRate?: number; // 融资年利率（%）
  financingPeriods?: number; // 融资期数
  flexibleLoanPeriods?: number; // 灵活贷期数（月）
  financingStartMonth?: string; // 融资还款起始月份
  financingEndMonth?: string; // 融资还款结束月份
  
  // 后端还款字段（从数据库返回）
  repaymentPeriod?: number; // 还款期数（月）
  repaymentStartDate?: string; // 还款开始日期
  repaymentEndDate?: string; // 还款结束日期
  
  // 月供金额
  monthlyPayment?: number;
  repaymentAccountName?: string; // 还款账户名称
  repaymentAccountNumber?: string; // 还款账号
  repaymentBank?: string; // 还款银行
  
  // 质保信息
  warrantyPeriod: number; // 质保期（月）
  warrantyExpiryDate?: string;
  
  // 金额信息
  totalAmount: number;
  taxAmount: number;
  totalWithTax: number;
  
  // 附件
  attachments?: Attachment[];
  
  // 备注
  remark?: string;
  
  // 采购明细
  items?: PurchaseItem[];
  
  // 审计信息
  createdBy?: number;
  updatedBy?: number;
  creatorName?: string;
  updaterName?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt?: string;
}

// 采购表单数据
export interface PurchaseFormData {
  purchaseDate: string;
  downPaymentRatio?: number;
  paymentTerms?: number;
  taxRate?: number;
  purchaseType?: PurchaseType;
  downPayment?: number;
  loanAmount?: number;
  
  // 分期相关
  installmentPeriods?: number;
  installmentStartMonth?: string;
  installmentEndMonth?: string;
  
  // 融资相关
  annualInterestRate?: number;
  financingPeriods?: number;
  flexibleLoanPeriods?: number;
  financingStartMonth?: string;
  financingEndMonth?: string;
  
  // 后端字段（从前端字段映射）
  repaymentPeriod?: number;
  repaymentStartDate?: string;
  repaymentEndDate?: string;
  
  monthlyPayment?: number;
  repaymentAccountName?: string;
  repaymentAccountNumber?: string;
  repaymentBank?: string;
  warrantyPeriod?: number;
  items: PurchaseItem[];
  attachments?: Attachment[];
  remark?: string;
}

// 采购统计数据
export interface PurchaseStatistics {
  totalPurchases: number;
  totalQuantity: number;
  totalAmount: number;
  totalWithTax: number;
  cashAmount: number;
  financingAmount: number;
  manufacturerCount: number;
  latestPurchaseDate?: string;
}

// 设备类型统计
export interface EquipmentTypeStats {
  equipmentCategory: string;
  equipmentType: string;
  purchaseCount: number;
  totalQuantity: number;
  totalAmount: number;
  avgUnitPrice: number;
  firstPurchaseDate: string;
  latestPurchaseDate: string;
}

// 厂家采购统计
export interface ManufacturerStats {
  manufacturerName: string;
  purchaseCount: number;
  totalAmount: number;
  avgPaymentTerms: number;
  firstPurchaseDate: string;
  latestPurchaseDate: string;
}
