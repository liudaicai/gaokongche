/**
 * 财务管理类型定义 - 重构版
 */

// 附件信息
export interface Attachment {
  filename: string;
  path: string;
  size: number;
  mimetype: string;
}

// 财务记录（统一收款和付款）
export interface FinanceRecord {
  id: number;
  record_number: string;              // 单号（SK20251212-1 或 FK20251212-1）
  record_type: 'receipt' | 'payment';  // 类型：receipt收款, payment付款
  source_type: string;                // 来源类型：order订单, other其他
  source_id?: number;                 // 来源ID
  order_id?: number;                  // 关联订单ID
  order_number?: string;              // 订单编号
  contract_number?: string;           // 合同编号
  amount: number;                     // 金额
  payment_method: 'cash' | 'wechat' | 'alipay' | 'bank_transfer'; // 支付方式
  record_date: string;                // 日期
  customer_id?: number;               // 客户ID
  customer_name?: string;             // 客户名称
  remark?: string;                    // 备注
  attachments_json?: string;          // 附件JSON字符串
  attachments?: Attachment[];         // 解析后的附件数组
  is_from_order?: number | boolean;   // 是否来自订单（用于判断是否可编辑删除）
  created_at: string;
  updated_at: string;
}

// 创建/编辑表单数据
export interface FinanceFormData {
  record_type: 'receipt' | 'payment';
  record_date: string;
  payment_method: 'cash' | 'wechat' | 'alipay' | 'bank_transfer';
  amount: number;
  customer_id?: number;
  customer_name?: string;
  order_id?: number;
  order_number?: string;
  contract_number?: string;
  remark?: string;
  attachments?: File[];
}

// 查询参数
export interface FinanceQueryParams {
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
  customerName?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  pageSize?: number;
}

// 分页信息
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

// API响应
export interface FinanceResponse<T> {
  ok: boolean;
  data?: T;
  pagination?: Pagination;
  error?: string;
  message?: string;
}

// 导出旧类型以保持兼容性（标记为废弃）
/** @deprecated 使用 FinanceRecord 替代 */
export type Receipt = FinanceRecord;

/** @deprecated 使用 FinanceRecord 替代 */
export type Refund = FinanceRecord;
