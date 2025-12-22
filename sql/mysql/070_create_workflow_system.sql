-- 070: 创建工作流系统表结构

-- 1. 工作流定义表（流程模板）
CREATE TABLE IF NOT EXISTS `workflow_definitions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL COMMENT '公司ID',
  `code` VARCHAR(100) NOT NULL COMMENT '流程编码（唯一标识）',
  `name` VARCHAR(200) NOT NULL COMMENT '流程名称',
  `category` VARCHAR(100) NOT NULL COMMENT '流程分类：业务/售后/财务/仓库',
  `description` TEXT COMMENT '流程描述',
  `business_type` VARCHAR(100) COMMENT '关联业务类型：order/purchase/repair/customer_service',
  
  -- 流程配置（JSON格式）
  `config` JSON COMMENT '流程配置：节点、流转规则等',
  `form_config` JSON COMMENT '表单配置',
  
  -- 状态和版本
  `version` INT DEFAULT 1 COMMENT '版本号',
  `status` ENUM('draft', 'active', 'archived') DEFAULT 'draft' COMMENT '状态',
  `is_default` TINYINT(1) DEFAULT 0 COMMENT '是否默认流程',
  
  -- 审计字段
  `created_by` INT COMMENT '创建人ID',
  `updated_by` INT COMMENT '更新人ID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  `deleted_at` TIMESTAMP NULL,
  
  INDEX `idx_company` (`company_id`),
  INDEX `idx_code` (`code`),
  INDEX `idx_category` (`category`),
  INDEX `idx_status` (`status`),
  UNIQUE KEY `uk_company_code` (`company_id`, `code`, `is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作流定义表';

-- 2. 流程实例表（具体的流程执行记录）
CREATE TABLE IF NOT EXISTS `workflow_instances` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL COMMENT '公司ID',
  `workflow_definition_id` INT NOT NULL COMMENT '流程定义ID',
  `instance_no` VARCHAR(100) NOT NULL COMMENT '流程实例编号',
  
  -- 关联业务
  `business_type` VARCHAR(100) COMMENT '业务类型',
  `business_id` INT COMMENT '业务记录ID',
  `business_no` VARCHAR(100) COMMENT '业务单号',
  
  -- 流程信息
  `title` VARCHAR(500) NOT NULL COMMENT '流程标题',
  `current_node` VARCHAR(100) COMMENT '当前节点',
  `status` ENUM('pending', 'running', 'completed', 'rejected', 'cancelled', 'suspended') DEFAULT 'pending' COMMENT '流程状态',
  `priority` ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal' COMMENT '优先级',
  
  -- 时间节点
  `started_at` TIMESTAMP NULL COMMENT '开始时间',
  `completed_at` TIMESTAMP NULL COMMENT '完成时间',
  `due_date` TIMESTAMP NULL COMMENT '截止时间',
  
  -- 执行人信息
  `initiator_id` INT COMMENT '发起人ID',
  `initiator_name` VARCHAR(100) COMMENT '发起人姓名',
  `current_assignee_id` INT COMMENT '当前处理人ID',
  `current_assignee_name` VARCHAR(100) COMMENT '当前处理人姓名',
  
  -- 流程数据
  `form_data` JSON COMMENT '表单数据',
  `variables` JSON COMMENT '流程变量',
  
  -- 审计字段
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  `deleted_at` TIMESTAMP NULL,
  
  INDEX `idx_company` (`company_id`),
  INDEX `idx_workflow_definition` (`workflow_definition_id`),
  INDEX `idx_business` (`business_type`, `business_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_initiator` (`initiator_id`),
  INDEX `idx_assignee` (`current_assignee_id`),
  INDEX `idx_created_at` (`created_at`),
  UNIQUE KEY `uk_instance_no` (`instance_no`, `is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='流程实例表';

-- 3. 任务表（流程中的具体任务/审批节点）
CREATE TABLE IF NOT EXISTS `workflow_tasks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL COMMENT '公司ID',
  `workflow_instance_id` INT NOT NULL COMMENT '流程实例ID',
  `task_no` VARCHAR(100) NOT NULL COMMENT '任务编号',
  
  -- 任务信息
  `node_key` VARCHAR(100) NOT NULL COMMENT '节点标识',
  `node_name` VARCHAR(200) NOT NULL COMMENT '节点名称',
  `task_type` ENUM('approval', 'notify', 'action', 'decision') DEFAULT 'approval' COMMENT '任务类型',
  `title` VARCHAR(500) NOT NULL COMMENT '任务标题',
  `description` TEXT COMMENT '任务描述',
  
  -- 执行人信息
  `assignee_id` INT COMMENT '指定处理人ID',
  `assignee_name` VARCHAR(100) COMMENT '指定处理人姓名',
  `assignee_type` ENUM('user', 'role', 'department') DEFAULT 'user' COMMENT '处理人类型',
  
  -- 任务状态
  `status` ENUM('pending', 'claimed', 'in_progress', 'completed', 'rejected', 'cancelled') DEFAULT 'pending' COMMENT '任务状态',
  `result` ENUM('approved', 'rejected', 'transferred', 'cancelled') COMMENT '处理结果',
  `priority` ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal' COMMENT '优先级',
  
  -- 时间节点
  `claimed_at` TIMESTAMP NULL COMMENT '认领时间',
  `started_at` TIMESTAMP NULL COMMENT '开始处理时间',
  `completed_at` TIMESTAMP NULL COMMENT '完成时间',
  `due_date` TIMESTAMP NULL COMMENT '截止时间',
  
  -- 处理意见
  `comment` TEXT COMMENT '处理意见',
  `attachments` JSON COMMENT '附件',
  
  -- 审计字段
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  `deleted_at` TIMESTAMP NULL,
  
  INDEX `idx_company` (`company_id`),
  INDEX `idx_instance` (`workflow_instance_id`),
  INDEX `idx_assignee` (`assignee_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`),
  UNIQUE KEY `uk_task_no` (`task_no`, `is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作流任务表';

-- 4. 流程历史记录表（过程留痕）
CREATE TABLE IF NOT EXISTS `workflow_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL COMMENT '公司ID',
  `workflow_instance_id` INT NOT NULL COMMENT '流程实例ID',
  `task_id` INT COMMENT '任务ID',
  
  -- 操作信息
  `action` VARCHAR(100) NOT NULL COMMENT '操作类型：start/approve/reject/transfer/cancel/suspend/resume',
  `from_node` VARCHAR(100) COMMENT '源节点',
  `to_node` VARCHAR(100) COMMENT '目标节点',
  `from_status` VARCHAR(50) COMMENT '原状态',
  `to_status` VARCHAR(50) COMMENT '新状态',
  
  -- 操作人信息
  `operator_id` INT COMMENT '操作人ID',
  `operator_name` VARCHAR(100) COMMENT '操作人姓名',
  `operator_ip` VARCHAR(50) COMMENT '操作IP',
  
  -- 操作内容
  `comment` TEXT COMMENT '操作意见',
  `reason` TEXT COMMENT '操作原因',
  `attachments` JSON COMMENT '附件',
  `data_snapshot` JSON COMMENT '数据快照',
  
  -- 时间信息
  `duration` INT COMMENT '处理耗时（秒）',
  `operated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  
  INDEX `idx_company` (`company_id`),
  INDEX `idx_instance` (`workflow_instance_id`),
  INDEX `idx_task` (`task_id`),
  INDEX `idx_operator` (`operator_id`),
  INDEX `idx_operated_at` (`operated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工作流历史记录表';

-- 5. 流程节点配置表
CREATE TABLE IF NOT EXISTS `workflow_nodes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `workflow_definition_id` INT NOT NULL COMMENT '流程定义ID',
  `node_key` VARCHAR(100) NOT NULL COMMENT '节点标识',
  `node_name` VARCHAR(200) NOT NULL COMMENT '节点名称',
  `node_type` ENUM('start', 'approval', 'notify', 'decision', 'action', 'end') NOT NULL COMMENT '节点类型',
  `sequence` INT DEFAULT 0 COMMENT '排序',
  
  -- 节点配置
  `assignee_type` ENUM('user', 'role', 'department', 'initiator', 'dynamic') COMMENT '处理人类型',
  `assignee_config` JSON COMMENT '处理人配置',
  `conditions` JSON COMMENT '流转条件',
  `timeout_config` JSON COMMENT '超时配置',
  `form_permissions` JSON COMMENT '表单权限配置',
  
  -- 审计字段
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `idx_workflow_definition` (`workflow_definition_id`),
  INDEX `idx_node_key` (`node_key`),
  UNIQUE KEY `uk_definition_key` (`workflow_definition_id`, `node_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='流程节点配置表';

-- 6. 操作日志表（详细的系统操作记录）
CREATE TABLE IF NOT EXISTS `system_operation_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL COMMENT '公司ID',
  
  -- 操作信息
  `module` VARCHAR(100) NOT NULL COMMENT '模块：workflow/order/finance/equipment',
  `action` VARCHAR(100) NOT NULL COMMENT '操作：create/update/delete/approve/reject',
  `resource_type` VARCHAR(100) COMMENT '资源类型',
  `resource_id` VARCHAR(100) COMMENT '资源ID',
  `description` VARCHAR(500) COMMENT '操作描述',
  
  -- 操作人信息
  `user_id` INT COMMENT '操作人ID',
  `username` VARCHAR(100) COMMENT '操作人账号',
  `user_name` VARCHAR(100) COMMENT '操作人姓名',
  `user_role` VARCHAR(100) COMMENT '操作人角色',
  `department` VARCHAR(100) COMMENT '所属部门',
  
  -- 请求信息
  `ip_address` VARCHAR(50) COMMENT 'IP地址',
  `user_agent` VARCHAR(500) COMMENT '用户代理',
  `request_method` VARCHAR(20) COMMENT '请求方法',
  `request_url` VARCHAR(500) COMMENT '请求URL',
  `request_params` JSON COMMENT '请求参数',
  
  -- 响应信息
  `response_status` INT COMMENT '响应状态码',
  `response_time` INT COMMENT '响应时间（毫秒）',
  `success` TINYINT(1) DEFAULT 1 COMMENT '是否成功',
  `error_message` TEXT COMMENT '错误信息',
  
  -- 数据变更
  `old_value` JSON COMMENT '原值',
  `new_value` JSON COMMENT '新值',
  `diff` JSON COMMENT '变更差异',
  
  -- 时间信息
  `operated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  
  INDEX `idx_company` (`company_id`),
  INDEX `idx_module` (`module`),
  INDEX `idx_user` (`user_id`),
  INDEX `idx_resource` (`resource_type`, `resource_id`),
  INDEX `idx_operated_at` (`operated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统操作日志表';

-- 7. 数据变更历史表（数据版本控制）
CREATE TABLE IF NOT EXISTS `data_change_history` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL COMMENT '公司ID',
  `table_name` VARCHAR(100) NOT NULL COMMENT '表名',
  `record_id` INT NOT NULL COMMENT '记录ID',
  `version` INT DEFAULT 1 COMMENT '版本号',
  
  -- 变更信息
  `change_type` ENUM('insert', 'update', 'delete') NOT NULL COMMENT '变更类型',
  `changed_fields` JSON COMMENT '变更字段列表',
  `old_data` JSON COMMENT '变更前数据',
  `new_data` JSON COMMENT '变更后数据',
  
  -- 操作人信息
  `changed_by` INT COMMENT '变更人ID',
  `changed_by_name` VARCHAR(100) COMMENT '变更人姓名',
  `changed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '变更时间',
  `reason` TEXT COMMENT '变更原因',
  
  INDEX `idx_company` (`company_id`),
  INDEX `idx_record` (`table_name`, `record_id`),
  INDEX `idx_changed_at` (`changed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据变更历史表';

-- 插入默认工作流定义
INSERT INTO `workflow_definitions` (`company_id`, `code`, `name`, `category`, `business_type`, `description`, `status`, `is_default`, `version`) VALUES
(1, 'ORDER_RENTAL_FLOW', '租赁订单审批流程', '业务', 'order', '高空车租赁订单的标准审批流程', 'active', 1, 1),
(1, 'PURCHASE_APPROVAL_FLOW', '采购审批流程', '财务', 'purchase', '设备采购单的审批流程', 'active', 1, 1),
(1, 'REPAIR_SERVICE_FLOW', '维修服务流程', '售后', 'repair', '设备维修服务的标准流程', 'active', 1, 1),
(1, 'PAYMENT_APPROVAL_FLOW', '付款审批流程', '财务', 'payment', '财务付款的审批流程', 'active', 1, 1),
(1, 'CUSTOMER_SERVICE_FLOW', '客户服务流程', '售后', 'customer_service', '客户投诉和服务请求处理流程', 'active', 1, 1);

SELECT 'Workflow system tables created successfully' AS status;
