// 设备维修相关类型定义

/**
 * 维修单状态
 */
export type RepairStatus = 'pending' | 'repairing' | 'completed' | 'cancelled';

/**
 * 损坏类型
 */
export type DamageType =
  | 'structural'      // 结构损坏
  | 'electrical'      // 电气故障
  | 'mechanical'      // 机械故障
  | 'wear'            // 磨损
  | 'corrosion'       // 腐蚀
  | 'other';          // 其他

/**
 * 损坏部件
 */
export type DamagePart =
  | 'main_body'       // 主体结构
  | 'accessory'       // 配件
  | 'electrical_system' // 电气系统
  | 'hydraulic_system'  // 液压系统
  | 'safety_device'     // 安全装置
  | 'control_system'    // 控制系统
  | 'other';            // 其他

/**
 * 维修单接口
 */
export interface EquipmentRepair {
  id: string;
  repairNumber: string;              // 维修单号
  equipmentCode: string;             // 设备编号
  equipmentId?: string;              // 设备ID
  customCode?: string;               // 自编号
  equipmentType?: string;            // 设备类型
  equipmentModel?: string;           // 设备型号
  orderId?: string;                  // 关联订单ID
  exitId?: string;                   // 关联退场记录ID
  damageType?: string;               // 损坏类型
  damageParts?: string[];            // 损坏部件列表
  damageDescription?: string;        // 损坏描述
  repairPerson?: string;             // 维修人员
  repairCost?: number;               // 维修费用
  repairStartDate?: string;          // 开始维修日期
  repairEndDate?: string;            // 完成维修日期
  status: RepairStatus;              // 维修状态
  remark?: string;                   // 备注
  attachments?: string[];            // 附件
  createdBy?: string;                // 创建人ID
  creatorName?: string;              // 创建人姓名
  createdAt?: string;                // 创建时间
  updatedAt?: string;                // 更新时间
  isVideoDiagnosis?: boolean;        // 是否视频判断
  contactName?: string;              // 联系人
  contactPhone?: string;             // 联系电话
}

/**
 * 创建维修单请求
 */
export interface CreateRepairRequest {
  equipmentCode: string;
  equipmentId?: string;
  orderId?: string;
  exitId?: string;
  damageType?: string;
  damageParts?: string[];
  damageDescription?: string;
  repairPerson?: string;
  repairCost?: number;
  repairStartDate?: string;
  remark?: string;
  attachments?: string[];
  isVideoDiagnosis?: boolean;
  contactName?: string;
  contactPhone?: string;
}

/**
 * 更新维修单请求
 */
export interface UpdateRepairRequest {
  damageType?: string;
  damageParts?: string[];
  damageDescription?: string;
  repairPerson?: string;
  repairCost?: number;
  repairStartDate?: string;
  repairEndDate?: string;
  status?: RepairStatus;
  remark?: string;
  attachments?: string[];
}

/**
 * 完成维修请求
 */
export interface CompleteRepairRequest {
  repairCost?: number;
  remark?: string;
}

/**
 * 维修单列表查询参数
 */
export interface RepairListParams {
  page?: number;
  pageSize?: number;
  equipmentCode?: string;
  status?: RepairStatus;
  startDate?: string;
  endDate?: string;
}

/**
 * 维修单列表响应
 */
export interface RepairListResponse {
  ok: boolean;
  data: EquipmentRepair[];
  page: number;
  pageSize: number;
  total: number;
}

/**
 * 损坏类型选项
 */
export const DAMAGE_TYPE_OPTIONS = [
  { value: 'structural', label: '结构损坏' },
  { value: 'electrical', label: '电气故障' },
  { value: 'mechanical', label: '机械故障' },
  { value: 'wear', label: '磨损' },
  { value: 'corrosion', label: '腐蚀' },
  { value: 'other', label: '其他' },
];

/**
 * 损坏部件选项
 */
export const DAMAGE_PART_OPTIONS = [
  { value: 'main_body', label: '主体结构' },
  { value: 'accessory', label: '配件' },
  { value: 'electrical_system', label: '电气系统' },
  { value: 'hydraulic_system', label: '液压系统' },
  { value: 'safety_device', label: '安全装置' },
  { value: 'control_system', label: '控制系统' },
  { value: 'other', label: '其他' },
];

/**
 * 维修状态选项
 */
export const REPAIR_STATUS_OPTIONS = [
  { value: 'pending', label: '待维修' },
  { value: 'repairing', label: '维修中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

/**
 * 获取维修状态标签
 */
export function getRepairStatusLabel(status: RepairStatus): string {
  const option = REPAIR_STATUS_OPTIONS.find(opt => opt.value === status);
  return option?.label || status;
}

/**
 * 获取维修状态颜色
 */
export function getRepairStatusColor(status: RepairStatus): string {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'repairing':
      return 'processing';
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'default';
    default:
      return 'default';
  }
}

/**
 * 获取损坏类型标签
 */
export function getDamageTypeLabel(type: string): string {
  const option = DAMAGE_TYPE_OPTIONS.find(opt => opt.value === type);
  return option?.label || type;
}

/**
 * 获取损坏部件标签
 */
export function getDamagePartLabel(part: string): string {
  const option = DAMAGE_PART_OPTIONS.find(opt => opt.value === part);
  return option?.label || part;
}
