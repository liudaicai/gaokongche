// 工作流系统类型定义

// 流程状态
export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'rejected' | 'cancelled' | 'suspended';

// 任务状态
export type TaskStatus = 'pending' | 'claimed' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';

// 任务结果
export type TaskResult = 'approved' | 'rejected' | 'transferred' | 'cancelled';

// 优先级
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

// 流程分类
export type WorkflowCategory = '业务' | '售后' | '财务' | '仓库';

// 业务类型
export type BusinessType = 'order' | 'purchase' | 'repair' | 'customer_service' | 'payment';

// 节点类型
export type NodeType = 'start' | 'approval' | 'notify' | 'decision' | 'action' | 'end';

// 工作流定义
export interface WorkflowDefinition {
  id: number;
  companyId: number;
  code: string;
  name: string;
  category: WorkflowCategory;
  businessType?: BusinessType;
  description?: string;
  config?: any; // JSON配置
  formConfig?: any; // 表单配置
  version: number;
  status: 'draft' | 'active' | 'archived';
  isDefault: boolean;
  createdBy?: number;
  updatedBy?: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt?: string;
}

// 流程实例
export interface WorkflowInstance {
  id: number;
  companyId: number;
  workflowDefinitionId: number;
  instanceNo: string;
  businessType?: BusinessType;
  businessId?: number;
  businessNo?: string;
  title: string;
  currentNode?: string;
  status: WorkflowStatus;
  priority: Priority;
  startedAt?: string;
  completedAt?: string;
  dueDate?: string;
  initiatorId?: number;
  initiatorName?: string;
  currentAssigneeId?: number;
  currentAssigneeName?: string;
  formData?: any;
  variables?: any;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt?: string;
  // 关联信息
  workflowName?: string;
  category?: string;
}

// 任务
export interface WorkflowTask {
  id: number;
  companyId: number;
  workflowInstanceId: number;
  taskNo: string;
  nodeKey: string;
  nodeName: string;
  taskType: 'approval' | 'notify' | 'action' | 'decision';
  title: string;
  description?: string;
  assigneeId?: number;
  assigneeName?: string;
  assigneeType: 'user' | 'role' | 'department';
  status: TaskStatus;
  result?: TaskResult;
  priority: Priority;
  claimedAt?: string;
  startedAt?: string;
  completedAt?: string;
  dueDate?: string;
  comment?: string;
  attachments?: any[];
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt?: string;
  // 关联信息
  instanceNo?: string;
  instanceTitle?: string;
  businessType?: BusinessType;
  businessNo?: string;
  instancePriority?: Priority;
  workflowName?: string;
}

// 流程历史记录
export interface WorkflowHistory {
  id: number;
  companyId: number;
  workflowInstanceId: number;
  taskId?: number;
  action: string;
  fromNode?: string;
  toNode?: string;
  fromStatus?: string;
  toStatus?: string;
  operatorId?: number;
  operatorName?: string;
  operatorIp?: string;
  comment?: string;
  reason?: string;
  attachments?: any[];
  dataSnapshot?: any;
  duration?: number;
  operatedAt: string;
}

// 操作日志
export interface OperationLog {
  id: number;
  companyId: number;
  module: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  description?: string;
  userId?: number;
  username?: string;
  userName?: string;
  userRole?: string;
  department?: string;
  ipAddress?: string;
  userAgent?: string;
  requestMethod?: string;
  requestUrl?: string;
  requestParams?: any;
  responseStatus?: number;
  responseTime?: number;
  success: boolean;
  errorMessage?: string;
  oldValue?: any;
  newValue?: any;
  diff?: any;
  operatedAt: string;
}

// 工作流统计数据
export interface WorkflowStats {
  pendingTasks: number;
  runningInstances: number;
  todayCompleted: number;
  monthlyStats: Array<{
    status: WorkflowStatus;
    count: number;
  }>;
}

// 任务处理表单数据
export interface TaskCompleteForm {
  result: TaskResult;
  comment?: string;
  attachments?: any[];
}

// 启动流程表单数据
export interface StartWorkflowForm {
  workflowDefinitionId: number;
  businessType?: BusinessType;
  businessId?: number;
  businessNo?: string;
  title: string;
  formData?: any;
  priority?: Priority;
}
