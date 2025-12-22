/**
 * 智能提醒中心 - TypeScript类型定义
 */

// ==================== 提醒规则相关类型 ====================

export interface ReminderRule {
  id: number;
  ruleName: string;
  ruleType: RuleType;
  description?: string;
  triggerType: TriggerType;
  advanceDays: number;
  triggerTime: string; // HH:mm:ss
  priority: Priority;
  isRepeatable: boolean;
  repeatInterval: number;
  maxRepeatTimes: number;
  receiverType: ReceiverType;
  receiverIds: string[];
  notificationChannels: NotificationChannel[];
  messageTemplate?: string;
  isEnabled: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RuleType = 
  | 'contract_expire'      // 合同到期
  | 'contract_renewal'     // 合同续约
  | 'equipment_exit'       // 设备退场
  | 'reconciliation'       // 对账
  | 'policy_expire';       // 保单到期

export type TriggerType = 
  | 'time_based'   // 时间触发
  | 'event_based'; // 事件触发

export type Priority = 
  | 'low'      // 低
  | 'medium'   // 中
  | 'high'     // 高
  | 'urgent';  // 紧急

export type ReceiverType = 
  | 'specific_user'  // 指定用户
  | 'role'           // 角色
  | 'department';    // 部门

export type NotificationChannel = 
  | 'system'   // 系统消息
  | 'email'    // 邮件
  | 'sms'      // 短信
  | 'wechat';  // 微信

export interface RuleFormData {
  ruleName: string;
  ruleType: RuleType;
  description?: string;
  triggerType: TriggerType;
  advanceDays: number;
  triggerTime: string;
  priority: Priority;
  isRepeatable: boolean;
  repeatInterval: number;
  maxRepeatTimes: number;
  receiverType: ReceiverType;
  receiverIds: string[];
  notificationChannels: NotificationChannel[];
  messageTemplate?: string;
}

// ==================== 提醒记录相关类型 ====================

export interface ReminderRecord {
  id: number;
  ruleId?: number;
  businessType: string;
  businessId: number;
  title: string;
  content?: string;
  priority: Priority;
  receiverId: number;
  receiverName?: string;
  notificationChannel: NotificationChannel;
  status: ReminderStatus;
  sentAt?: string;
  readAt?: string;
  handledAt?: string;
  handlerId?: number;
  handlerName?: string;
  handleNote?: string;
  repeatCount: number;
  createdAt: string;
}

export type ReminderStatus = 
  | 'pending'   // 待发送
  | 'sent'      // 已发送
  | 'read'      // 已读
  | 'handled'   // 已处理
  | 'expired'   // 已过期
  | 'failed';   // 发送失败

export interface ReminderSearchParams {
  page?: number;
  pageSize?: number;
  status?: ReminderStatus;
  businessType?: string;
  priority?: Priority;
  startDate?: string;
  endDate?: string;
}

// ==================== 用户设置相关类型 ====================

export interface UserReminderSettings {
  id?: number;
  userId: number;
  isEnabled: boolean;
  quietTimeStart?: string; // HH:mm:ss
  quietTimeEnd?: string;   // HH:mm:ss
  enableSystemNotification: boolean;
  enableEmailNotification: boolean;
  enableSmsNotification: boolean;
  enableWechatNotification: boolean;
  reminderTypeSettings?: Record<string, boolean>;
  email?: string;
  phone?: string;
  wechatOpenid?: string;
}

// ==================== 合同续约相关类型 ====================

export interface ContractRenewalRecord {
  id: number;
  orderId: number;
  contractNumber?: string;
  customerId?: number;
  customerName?: string;
  renewalType: RenewalType;
  nextReminderDate?: string; // YYYY-MM-DD
  renewalPeriodMonths?: number;
  renewalStartDate?: string; // YYYY-MM-DD
  calculatedReminderDate?: string; // YYYY-MM-DD
  advanceDays: number;
  isReminded: boolean;
  remindedAt?: string;
  status: RenewalStatus;
  handledBy?: number;
  handledAt?: string;
  handleNote?: string;
  createdAt: string;
}

export type RenewalType = 
  | 'specific_date'    // 指定日期
  | 'renewal_period';  // 续约期限

export type RenewalStatus = 
  | 'pending'      // 待处理
  | 'completed'    // 已完成
  | 'cancelled';   // 已取消

export interface RenewalFormData {
  renewalType: RenewalType;
  nextReminderDate?: string;
  renewalPeriodMonths?: number;
  renewalStartDate?: string;
  advanceDays: number;
  note?: string;
}

// ==================== 统计相关类型 ====================

export interface ReminderStatistics {
  statDate: string;
  ruleType?: RuleType;
  totalSent: number;
  totalRead: number;
  totalHandled: number;
  totalExpired: number;
  totalFailed: number;
  systemSent: number;
  emailSent: number;
  smsSent: number;
  wechatSent: number;
  avgReadTimeMinutes?: number;
  avgHandleTimeMinutes?: number;
}

// ==================== API响应类型 ====================

export interface RuleListResponse {
  ok: boolean;
  data: ReminderRule[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface RuleDetailResponse {
  ok: boolean;
  data: ReminderRule;
}

export interface ReminderListResponse {
  ok: boolean;
  data: ReminderRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export interface ReminderDetailResponse {
  ok: boolean;
  data: ReminderRecord;
}

export interface UnreadCountResponse {
  ok: boolean;
  data: {
    count: number;
  };
}

export interface SettingsResponse {
  ok: boolean;
  data: UserReminderSettings;
}

export interface RenewalListResponse {
  ok: boolean;
  data: ContractRenewalRecord[];
}

export interface StatisticsResponse {
  ok: boolean;
  data: ReminderStatistics[];
}

export interface ApiResponse {
  ok: boolean;
  message?: string;
  error?: string;
}

// ==================== UI组件Props类型 ====================

export interface ReminderCenterProps {
  // 提醒中心主界面props
}

export interface ReminderListProps {
  reminders: ReminderRecord[];
  loading: boolean;
  onRead: (id: number) => void;
  onHandle: (id: number, note?: string) => void;
  onDelete: (id: number) => void;
  onBatchRead: (ids: number[]) => void;
}

export interface ReminderDetailProps {
  reminder: ReminderRecord;
  visible: boolean;
  onClose: () => void;
  onRead: () => void;
  onHandle: (note?: string) => void;
}

export interface RuleConfigProps {
  // 规则配置界面props
}

export interface RuleFormProps {
  rule?: ReminderRule;
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export interface RenewalReminderModalProps {
  orderId: number;
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export interface UserSettingsProps {
  // 用户设置界面props
}

// ==================== 常量定义 ====================

export const RULE_TYPE_LABELS: Record<RuleType, string> = {
  contract_expire: '合同到期',
  contract_renewal: '合同续约',
  equipment_exit: '设备退场',
  reconciliation: '对账提醒',
  policy_expire: '保单到期'
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急'
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: '#52c41a',      // 绿色
  medium: '#1890ff',   // 蓝色
  high: '#fa8c16',     // 橙色
  urgent: '#f5222d'    // 红色
};

export const STATUS_LABELS: Record<ReminderStatus, string> = {
  pending: '待发送',
  sent: '已发送',
  read: '已读',
  handled: '已处理',
  expired: '已过期',
  failed: '发送失败'
};

export const STATUS_COLORS: Record<ReminderStatus, string> = {
  pending: '#faad14',    // 黄色
  sent: '#1890ff',       // 蓝色
  read: '#52c41a',       // 绿色
  handled: '#52c41a',    // 绿色
  expired: '#d9d9d9',    // 灰色
  failed: '#f5222d'      // 红色
};

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  system: '系统消息',
  email: '邮件',
  sms: '短信',
  wechat: '微信'
};

export const RENEWAL_TYPE_LABELS: Record<RenewalType, string> = {
  specific_date: '指定日期',
  renewal_period: '续约期限'
};

export const RENEWAL_STATUS_LABELS: Record<RenewalStatus, string> = {
  pending: '待处理',
  completed: '已完成',
  cancelled: '已取消'
};

