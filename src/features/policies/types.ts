/**
 * 保单管理类型定义
 */

// 保单附件
export interface PolicyAttachment {
  id: string | number;
  policy_id: string | number;
  name: string;
  mime_type: string;
  size: number;
  storage_path: string;
  created_at: string;
}

// 保单信息
export interface Policy {
  id: string | number;
  number: string; // 保单编号
  company: string; // 投保公司
  rate: number; // 费率(%)
  start_date: string; // 起保日期
  end_date: string; // 止保日期
  equipments?: PolicyEquipment[]; // 关联设备
  equipment_count?: number; // 设备数量
  attachments?: PolicyAttachment[]; // 保单附件
  created_at: string;
  updated_at: string;
}

// 保单关联的设备
export interface PolicyEquipment {
  id: string | number;
  equipment_id: string | number;
  serial_no?: string;
  code?: string;
  custom_code?: string;
}

// 保单表单数据
export interface PolicyFormData {
  number: string;
  company: string;
  rate: number;
  start_date: string;
  end_date: string;
  equipment_ids: (string | number)[];
}

// 保单查询参数
export interface PolicyQueryParams {
  page?: number;
  pageSize?: number;
  number?: string;
  company?: string;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  sortBy?: 'number' | 'company' | 'start_date' | 'end_date';
  sortOrder?: 'asc' | 'desc';
}

// 保单状态
export type PolicyStatus = 'valid' | 'expiring' | 'expired';

// 保单状态配置
export interface PolicyStatusConfig {
  status: PolicyStatus;
  text: string;
  color: string;
}

