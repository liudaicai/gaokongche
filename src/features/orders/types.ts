// 订单相关类型定义

// 设备需求项类型
export interface OrderEquipmentItem {
  id: string;
  equipmentCategory: string; // 设备类别（如：高空车、叉车、吊车）
  equipmentType: string; // 设备类型（如：剪叉车、曲臂车、直臂车）
  height: string; // 高度
  quantity: number;
  dailyRate: number; // 日租单价
  monthlyRate: number; // 月租单价
  deposit: number; // 押金/台
  shippingFee: number; // 运费/台
  modificationFee: number; // 改装费/台
  scheduledEntryDate: string; // 约定进场日期
  estimatedExitDate: string; // 预计退场日期
  rentalPeriod: number; // 租期（天数）
  shippingType: '单程' | '双程'; // 运费类型
  // 新增：计算相关字段
  calculatedRentalAmount?: number; // 计算的租金金额
  isManualOverride?: boolean; // 是否手动覆盖租金
}

// 订单状态类型
export interface OrderStatus {
  entryCount: number; // 进场数量
  exitCount: number; // 退场数量
  performanceStatus: '履约' | '履欠';
  actualReceivedAmount: number; // 实收金额
}

// 进场记录类型
export interface EntryRecord {
  id: string;
  entryNumber: string; // 进场单号（唯一）
  entryDate: string; // 进场日期（YYYY-MM-DD HH:mm）
  leaseStartDate?: string; // 起租日期（YYYY-MM-DD）
  // 本次进场涉及的设备编码列表（用于统一显示编号）
  equipmentCodes?: string[];
  equipmentSummary: string; // 设备类型/高度/数量（如：塔吊/50米/2台；…）
  equipmentCount?: number; // 本次进场选择的设备数量（台）
  transportMethod: '陆运' | '海运' | '空运' | '客户自提' | '我方物流' | '第三方物流'; // 运输方式（与物流类型对齐）
  businessManagerName: string; // 业务负责人
  handoverPerson: string; // 交机人
  // 物流关联字段（根据物流类型联动）
  vehicleId?: string; // 我方物流：关联车辆ID（自有拖车列表）
  driverId?: string; // 我方物流：关联司机ID（自有司机列表）
  companyId?: string; // 第三方物流：关联公司ID（三方物流公司）
  companyContactName?: string; // 第三方联系人姓名
  companyContactPhone?: string; // 第三方联系人电话
  logisticsCost?: number; // 第三方物流费用
  // 显示字段（后端返回时可填充）
  vehiclePlate?: string;
  driverName?: string;
  driverPhone?: string;
  companyName?: string;
  attachments?: Array<{ uid: string; name: string; type?: string; size?: number }>; // 单据附件（记录级）
}

// 退场记录类型
export interface ExitRecord {
  id: string;
  exitNumber: string; // 退场单号（唯一）
  exitDate: string; // 退场日期（YYYY-MM-DD HH:mm）
  settlementDate?: string; // 租金结算日期（YYYY-MM-DD）
  // 本次退场涉及的设备编码列表（用于统一显示编号）
  equipmentCodes?: string[];
  equipmentSummary: string; // 设备类型/高度/数量（如：塔吊/50米/2台；…）
  transportMethod: '陆运' | '海运' | '空运' | '客户自提' | '我方物流' | '第三方物流'; // 运输方式（与物流类型对齐）
  businessManagerName: string; // 业务负责人
  handoverPerson: string; // 交机人
  // 物流关联字段（根据物流类型联动）
  vehicleId?: string; // 我方物流：关联车辆ID（自有拖车列表）
  driverId?: string; // 我方物流：关联司机ID（自有司机列表）
  companyId?: string; // 第三方物流：关联公司ID（三方物流公司）
  companyContactName?: string; // 第三方联系人姓名
  companyContactPhone?: string; // 第三方联系人电话
  logisticsCost?: number; // 第三方物流费用
  // 显示字段（后端返回时可填充）
  vehiclePlate?: string;
  driverName?: string;
  driverPhone?: string;
  companyName?: string;
  attachments?: Array<{ uid: string; name: string; type?: string; size?: number }>; // 单据附件（记录级）
}

// 订单类型
export interface Order {
  id: string;
  contractNumber: string; // 合同编号
  lessorId: string; // 出租方ID
  lessorName: string; // 出租方名称
  customerId: string; // 客户ID
  customerName: string; // 客户名称
  projectName: string; // 项目名称
  businessManagerId: string; // 业务负责人ID
  businessManagerName: string; // 业务负责人姓名
  
  // 结算信息
  monthCalculationMethod: '30天为一月' | '自然月';
  paymentAgreement: '预付' | '月结' | '退场付清';
  shippingFeeReduction: '无减免' | '三个月免运费' | '三个月免单程半年免双程' | '两个月免单程三个月免双程';
  shippingFeeCalculation: '按台计费' | '按趟计费';
  isTaxInvoice: '不开票' | '专票' | '普票';
  invoiceTaxRate?: number; // 发票税额
  
  // 项目信息
  constructionCategory: '消防' | '水电' | '安装' | '机电' | '保温' | '外墙非油漆' | '涂装' | '其他';
  deliveryLocation: string; // 交机地点
  otherAgreements: string; // 其他约定
  
  // 设备需求
  equipmentItems: OrderEquipmentItem[];
  // 在租设备编号（与equipmentItems按索引对应，每项存储选择的设备ID列表）
  rentedEquipmentIds?: string[][];
  estimatedAmount: number; // 合同预估金额
  // 收款记录
  receipts?: ReceiptRecord[];
  // 退款记录
  refunds?: RefundRecord[];
  // 报停记录
  suspensions?: SuspensionRecord[];
  // 索赔记录
  claims?: ClaimRecord[];
  // 结算记录
  settlements?: SettlementRecord[];
  // 结清记录
  clearances?: ClearanceRecord[];
  // 归档时间（归档标记）
  archivedAt?: string;
  // 设备进场附件（按设备编码映射）
  entryAttachments?: Record<string, Array<{ uid: string; name: string; type?: string; size?: number }>>;
  // 设备退场附件（按设备编码映射）
  exitAttachments?: Record<string, Array<{ uid: string; name: string; type?: string; size?: number }>>;
  // 进场记录列表（记录级）
  entries?: EntryRecord[];
  // 退场记录列表（记录级）
  exits?: ExitRecord[];
  
  // 状态信息
  status: OrderStatus;
  creationDate: string;
}

// 订单状态管理类型
export interface OrdersState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  selectedOrder: Order | null;
  // 订单详情缓存：通过 id 存储完整订单详情
  detailsById?: Record<string, Order>;
  // 订单详情加载状态：按 id 标记请求状态，避免重复请求
  detailsLoadingById?: Record<string, boolean>;
}

// 新增订单表单数据类型
export interface OrderFormData {
  lessorId: string;
  customerId: string;
  businessManagerId: string;
  monthCalculationMethod: '30天为一月' | '自然月';
  paymentAgreement: '预付' | '月结' | '退场付清';
  shippingFeeReduction: '无减免' | '三个月免运费' | '三个月免单程半年免双程' | '两个月免单程三个月免双程';
  shippingFeeCalculation: '按台计费' | '按趟计费';
  isTaxInvoice: '不开票' | '专票' | '普票';
  invoiceTaxRate?: number;
  projectName: string;
  constructionCategory: '消防' | '水电' | '安装' | '机电' | '保温' | '外墙非油漆' | '涂装' | '其他';
  deliveryLocation: string;
  returnAddress?: string;
  otherAgreements: string;
  equipmentItems: OrderEquipmentItem[];
}

// 设备选择界面的筛选条件类型
export interface EquipmentFilter {
  equipmentType: string;
  height: string;
  status: '待租' | '全部';
}

// 收款记录类型
export interface ReceiptRecord {
  id: string;
  receiptNumber: string; // 收款单号（唯一）
  contractName: string; // 合同显示名（客户/项目）
  receiptDate: string; // 收款日期（YYYY-MM-DD）
  paymentMethod: '二维码' | '微信' | '支付宝' | '公账' | '银行卡'; // 收款方式
  amount: number; // 收款金额
  attachments?: Array<{ uid: string; name: string; type?: string; size?: number }>; // 凭证
  remark?: string; // 备注（选填）
  createdAt: string; // 记录创建时间
}

// 退款记录类型（结构与收款一致）
export interface RefundRecord {
  id: string;
  refundNumber: string; // 退款单号（唯一）
  contractName: string; // 合同显示名（客户/项目）
  refundDate: string; // 退款日期（YYYY-MM-DD）
  paymentMethod: '二维码' | '微信' | '支付宝' | '公账' | '银行卡'; // 退款方式
  amount: number; // 退款金额
  attachments?: Array<{ uid: string; name: string; type?: string; size?: number }>; // 凭证
  remark?: string; // 备注（选填）
  createdAt: string; // 记录创建时间
}

// 报停记录类型
export interface SuspensionRecord {
  id: string;
  suspensionNumber: string; // 报停单号（唯一）
  contractName: string; // 合同显示名（客户/项目）
  suspensionType: '维修报停' | '假期报停'; // 报停类型
  reason?: string; // 原因备注
  startDate: string; // 报停开始日期（YYYY-MM-DD）
  endDate: string; // 报停结束日期（YYYY-MM-DD）
  suspensionDays: number; // 报停天数（自动计算）
  equipmentSelections: string[][]; // 选择的在租设备编码/自编码，按设备项索引存储
  attachments?: Array<{ uid: string; name: string; type?: string; size?: number }>; // 报停单据附件
  createdAt: string; // 记录创建时间
}

// 索赔记录类型
export interface ClaimRecord {
  id: string;
  claimNumber: string; // 索赔单号（唯一）
  contractName: string; // 合同显示名（客户/项目）
  claimType: '设备损坏' | '物料损耗' | '延误赔偿' | '其他'; // 索赔类型
  // 金额为选填，允许缺省
  claimAmount?: number; // 索赔金额（选填）
  // 兼容业务表单的字段（选填）
  claimDate?: string; // 索赔日期（YYYY-MM-DD）
  reason?: string; // 索赔原因（选填）
  equipmentSelections?: string[][]; // 选择的在租设备编码/自编码（选填）
  attachments?: Array<{ uid: string; name: string; type?: string; size?: number }>; // 索赔单据附件
  createdAt: string; // 记录创建时间
}

// 结算记录类型
export interface SettlementRecord {
  id: string;
  settlementNumber: string; // 结算单号（唯一）
  contractName: string; // 合同显示名（客户/项目）
  settlementDate: string; // 结算日期（YYYY-MM-DD）
  cycleStartDate?: string; // 结算周期开始（YYYY-MM-DD）
  cycleEndDate?: string; // 结算周期结束（YYYY-MM-DD）
  status?: '待对账' | '对账中' | '已确认' | '已驳回'; // 对账状态
  settlementAmount: number; // 结算金额（元，必填）
  attachments?: Array<{ uid: string; name: string; type?: string; size?: number }>; // 单据附件
  remark?: string; // 备注（选填）
  createdAt: string; // 记录创建时间
}

// 结清记录类型
export interface ClearanceRecord {
  id: string;
  clearanceNumber: string; // 结清单号（唯一）
  contractName: string; // 合同显示名（客户/项目）
  clearanceDate: string; // 结清日期（YYYY-MM-DD）
  clearanceAmount?: number; // 结清金额（元，选填）
  attachments?: Array<{ uid: string; name: string; type?: string; size?: number }>; // 单据附件
  remark?: string; // 备注（选填）
  createdAt: string; // 记录创建时间
}