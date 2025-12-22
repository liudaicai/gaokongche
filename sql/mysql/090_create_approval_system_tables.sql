-- ============================================
-- 审批流系统 - 完整版数据库表
-- 创建时间: 2025-12-18
-- 说明: 支持可视化配置、条件路由、会签、委托等高级功能
-- ============================================

-- ============================================
-- 1. 审批流模板表
-- ============================================
CREATE TABLE IF NOT EXISTS approval_templates (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE COMMENT '模板编码',
  name VARCHAR(100) NOT NULL COMMENT '模板名称',
  business_type VARCHAR(50) NOT NULL COMMENT '业务类型 (order/purchase/equipment_replacement/repair/etc)',
  description TEXT COMMENT '模板描述',
  
  -- 流程配置 (JSON格式，支持可视化设计)
  config JSON NOT NULL COMMENT '流程配置 {nodes: [], edges: [], variables: {}}',
  
  -- 表单配置 (可选，用于动态表单)
  form_config JSON COMMENT '表单配置',
  
  -- 版本管理
  version INT DEFAULT 1 COMMENT '版本号',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  published_at DATETIME(3) COMMENT '发布时间',
  
  -- 统计信息
  usage_count INT DEFAULT 0 COMMENT '使用次数',
  avg_approval_hours DECIMAL(10, 2) COMMENT '平均审批时长(小时)',
  
  created_by INT COMMENT '创建人ID',
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at DATETIME(3),
  
  INDEX idx_business_type (business_type),
  INDEX idx_code (code),
  INDEX idx_is_active (is_active),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批流模板表';

-- ============================================
-- 2. 审批实例表
-- ============================================
CREATE TABLE IF NOT EXISTS approval_instances (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  instance_number VARCHAR(50) NOT NULL UNIQUE COMMENT '实例编号',
  template_id INT NOT NULL COMMENT '模板ID',
  template_code VARCHAR(50) COMMENT '模板编码 (冗余)',
  template_version INT COMMENT '模板版本 (冗余)',
  
  -- 业务关联
  business_type VARCHAR(50) NOT NULL COMMENT '业务类型',
  business_id INT NOT NULL COMMENT '业务单据ID',
  business_number VARCHAR(100) COMMENT '业务单据编号 (冗余)',
  business_data JSON COMMENT '业务数据快照',
  
  -- 申请信息
  title VARCHAR(200) NOT NULL COMMENT '审批标题',
  applicant_id INT NOT NULL COMMENT '申请人ID',
  applicant_name VARCHAR(100) COMMENT '申请人姓名 (冗余)',
  department_id INT COMMENT '申请部门ID',
  department_name VARCHAR(100) COMMENT '申请部门名称 (冗余)',
  
  -- 流程状态
  status ENUM('pending', 'approved', 'rejected', 'withdrawn', 'cancelled', 'terminated') DEFAULT 'pending' COMMENT '状态',
  current_node_id INT COMMENT '当前节点ID',
  current_node_key VARCHAR(50) COMMENT '当前节点KEY',
  
  -- 流程快照 (保存实例化后的完整流程配置)
  flow_snapshot JSON COMMENT '流程快照',
  
  -- 流程变量 (用于条件判断)
  variables JSON COMMENT '流程变量 {amount: 100000, priority: "high"}',
  
  -- 时间信息
  started_at DATETIME(3) COMMENT '发起时间',
  finished_at DATETIME(3) COMMENT '完成时间',
  
  -- 优先级
  priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal' COMMENT '优先级',
  
  -- 统计信息
  total_duration_hours DECIMAL(10, 2) COMMENT '总耗时(小时)',
  approval_path TEXT COMMENT '审批路径记录',
  
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at DATETIME(3),
  
  INDEX idx_business (business_type, business_id),
  INDEX idx_applicant (applicant_id),
  INDEX idx_status (status),
  INDEX idx_current_node (current_node_id),
  INDEX idx_created_at (created_at),
  INDEX idx_priority (priority),
  INDEX idx_composite (status, applicant_id, business_type, created_at),
  
  FOREIGN KEY (template_id) REFERENCES approval_templates(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批实例表';

-- ============================================
-- 3. 审批节点表 (实例化后的节点)
-- ============================================
CREATE TABLE IF NOT EXISTS approval_nodes (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  instance_id INT NOT NULL COMMENT '实例ID',
  
  -- 节点标识
  node_key VARCHAR(50) NOT NULL COMMENT '节点唯一标识',
  node_name VARCHAR(100) NOT NULL COMMENT '节点名称',
  node_type ENUM('start', 'approval', 'condition', 'parallel', 'end') DEFAULT 'approval' COMMENT '节点类型',
  
  -- 审批人配置
  approver_type ENUM('user', 'role', 'department', 'superior', 'dynamic', 'initiator') COMMENT '审批人类型',
  approver_config JSON COMMENT '审批人配置 {userIds: [], roleCode: "", expression: ""}',
  actual_approvers JSON COMMENT '实际审批人列表 [{id, name, status, assignedAt}]',
  
  -- 审批规则
  approval_mode ENUM('single', 'and', 'or', 'sequential') DEFAULT 'single' COMMENT '审批模式: single-单人 and-会签 or-或签 sequential-依次',
  required_count INT DEFAULT 1 COMMENT '需要审批人数',
  pass_count INT DEFAULT 0 COMMENT '已通过人数',
  reject_count INT DEFAULT 0 COMMENT '已拒绝人数',
  
  -- 节点状态
  status ENUM('pending', 'processing', 'approved', 'rejected', 'skipped', 'timeout') DEFAULT 'pending',
  sequence INT NOT NULL COMMENT '节点顺序',
  
  -- 条件配置 (仅条件节点使用)
  conditions JSON COMMENT '条件配置 [{expression: "amount > 100000", next: "ceo"}]',
  
  -- 时间配置
  started_at DATETIME(3) COMMENT '节点开始时间',
  finished_at DATETIME(3) COMMENT '节点完成时间',
  timeout_hours INT COMMENT '超时小时数',
  timeout_at DATETIME(3) COMMENT '超时时间',
  is_timeout BOOLEAN DEFAULT FALSE COMMENT '是否已超时',
  
  -- 节点变量 (用于动态配置)
  variables JSON COMMENT '节点变量',
  
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  INDEX idx_instance (instance_id),
  INDEX idx_status (status),
  INDEX idx_node_key (node_key),
  INDEX idx_timeout (is_timeout, timeout_at),
  
  FOREIGN KEY (instance_id) REFERENCES approval_instances(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批节点表';

-- ============================================
-- 4. 审批记录表
-- ============================================
CREATE TABLE IF NOT EXISTS approval_records (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  instance_id INT NOT NULL COMMENT '实例ID',
  node_id INT NOT NULL COMMENT '节点ID',
  
  -- 审批人信息
  approver_id INT NOT NULL COMMENT '审批人ID',
  approver_name VARCHAR(100) COMMENT '审批人姓名 (冗余)',
  approver_role VARCHAR(50) COMMENT '审批人角色 (冗余)',
  
  -- 操作信息
  action ENUM('approve', 'reject', 'transfer', 'delegate', 'add_sign', 'withdraw', 'comment', 'timeout') NOT NULL COMMENT '操作类型',
  result ENUM('approved', 'rejected', 'transferred', 'withdrawn') COMMENT '审批结果',
  comment TEXT COMMENT '审批意见',
  
  -- 附件
  attachments JSON COMMENT '附件 [{name: "", url: "", size: 0}]',
  
  -- 转交/委托信息
  transfer_to_id INT COMMENT '转交给谁',
  transfer_to_name VARCHAR(100) COMMENT '转交人姓名',
  transfer_reason VARCHAR(200) COMMENT '转交原因',
  
  -- 加签信息
  add_sign_users JSON COMMENT '加签用户 [{id, name}]',
  
  -- 电子签名
  signature TEXT COMMENT '电子签名(base64)',
  signature_time DATETIME(3) COMMENT '签名时间',
  
  -- 审批时长
  duration_seconds INT COMMENT '审批耗时(秒)',
  
  -- 请求信息
  ip_address VARCHAR(50) COMMENT 'IP地址',
  user_agent TEXT COMMENT '用户代理',
  client_type ENUM('web', 'mobile', 'api') DEFAULT 'web' COMMENT '客户端类型',
  
  -- 数据完整性
  data_hash VARCHAR(64) COMMENT '数据哈希(防篡改)',
  
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  
  INDEX idx_instance (instance_id),
  INDEX idx_node (node_id),
  INDEX idx_approver (approver_id),
  INDEX idx_created_at (created_at),
  INDEX idx_action (action),
  INDEX idx_composite (instance_id, approver_id, action),
  
  FOREIGN KEY (instance_id) REFERENCES approval_instances(id) ON DELETE CASCADE,
  FOREIGN KEY (node_id) REFERENCES approval_nodes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批记录表';

-- ============================================
-- 5. 审批人配置表 (模板级别的审批人配置)
-- ============================================
CREATE TABLE IF NOT EXISTS approval_assignees (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL COMMENT '模板ID',
  node_key VARCHAR(50) NOT NULL COMMENT '节点标识',
  
  -- 审批人类型和配置
  assignee_type ENUM('user', 'role', 'department', 'superior', 'dynamic', 'custom') NOT NULL COMMENT '类型',
  assignee_value VARCHAR(200) COMMENT '值 (用户ID/角色ID/部门ID/表达式)',
  assignee_config JSON COMMENT '详细配置',
  
  -- 优先级和顺序
  sequence INT DEFAULT 0 COMMENT '顺序',
  priority INT DEFAULT 0 COMMENT '优先级',
  
  -- 条件
  conditions TEXT COMMENT '生效条件表达式',
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  INDEX idx_template (template_id, node_key),
  INDEX idx_type (assignee_type),
  
  FOREIGN KEY (template_id) REFERENCES approval_templates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批人配置表';

-- ============================================
-- 6. 审批委托表
-- ============================================
CREATE TABLE IF NOT EXISTS approval_delegations (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  
  -- 委托人和受托人
  delegator_id INT NOT NULL COMMENT '委托人ID',
  delegator_name VARCHAR(100) COMMENT '委托人姓名',
  delegate_id INT NOT NULL COMMENT '受托人ID',
  delegate_name VARCHAR(100) COMMENT '受托人姓名',
  
  -- 委托范围
  business_types JSON COMMENT '委托的业务类型 (null=全部)',
  template_codes JSON COMMENT '委托的模板编码 (null=全部)',
  
  -- 委托时间
  start_date DATE NOT NULL COMMENT '生效日期',
  end_date DATE NOT NULL COMMENT '失效日期',
  
  -- 委托状态
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  reason VARCHAR(200) COMMENT '委托原因',
  
  -- 使用统计
  usage_count INT DEFAULT 0 COMMENT '使用次数',
  last_used_at DATETIME(3) COMMENT '最后使用时间',
  
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  INDEX idx_delegator (delegator_id),
  INDEX idx_delegate (delegate_id),
  INDEX idx_dates (start_date, end_date),
  INDEX idx_active (is_active, start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批委托表';

-- ============================================
-- 7. 审批通知表
-- ============================================
CREATE TABLE IF NOT EXISTS approval_notifications (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  instance_id INT NOT NULL COMMENT '实例ID',
  
  -- 接收人
  recipient_id INT NOT NULL COMMENT '接收人ID',
  recipient_name VARCHAR(100) COMMENT '接收人姓名',
  
  -- 通知类型
  notification_type ENUM('pending', 'approved', 'rejected', 'timeout', 'transfer', 'comment', 'withdrawn') NOT NULL COMMENT '通知类型',
  
  -- 通知内容
  title VARCHAR(200) NOT NULL COMMENT '通知标题',
  content TEXT COMMENT '通知内容',
  
  -- 通知渠道
  channels JSON COMMENT '通知渠道 ["email", "sms", "push", "in_app"]',
  
  -- 发送状态
  status ENUM('pending', 'sent', 'failed', 'read') DEFAULT 'pending' COMMENT '状态',
  sent_at DATETIME(3) COMMENT '发送时间',
  read_at DATETIME(3) COMMENT '阅读时间',
  
  -- 重试信息
  retry_count INT DEFAULT 0 COMMENT '重试次数',
  error_message TEXT COMMENT '错误信息',
  
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  INDEX idx_instance (instance_id),
  INDEX idx_recipient (recipient_id, status),
  INDEX idx_status (status, created_at),
  INDEX idx_type (notification_type),
  
  FOREIGN KEY (instance_id) REFERENCES approval_instances(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批通知表';

-- ============================================
-- 8. 审批统计表 (用于性能优化)
-- ============================================
CREATE TABLE IF NOT EXISTS approval_statistics (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  
  stat_date DATE NOT NULL COMMENT '统计日期',
  business_type VARCHAR(50) COMMENT '业务类型',
  template_code VARCHAR(50) COMMENT '模板编码',
  department_id INT COMMENT '部门ID',
  
  -- 统计指标
  total_count INT DEFAULT 0 COMMENT '总数',
  pending_count INT DEFAULT 0 COMMENT '待审批数',
  approved_count INT DEFAULT 0 COMMENT '已通过数',
  rejected_count INT DEFAULT 0 COMMENT '已拒绝数',
  timeout_count INT DEFAULT 0 COMMENT '超时数',
  
  -- 时长统计
  avg_duration_hours DECIMAL(10, 2) COMMENT '平均时长(小时)',
  max_duration_hours DECIMAL(10, 2) COMMENT '最长时长(小时)',
  min_duration_hours DECIMAL(10, 2) COMMENT '最短时长(小时)',
  
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  UNIQUE INDEX idx_unique_stat (stat_date, business_type, template_code, department_id),
  INDEX idx_date (stat_date),
  INDEX idx_business_type (business_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批统计表';

-- ============================================
-- 9. 审批规则表 (高级规则配置)
-- ============================================
CREATE TABLE IF NOT EXISTS approval_rules (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  
  rule_name VARCHAR(100) NOT NULL COMMENT '规则名称',
  rule_type ENUM('auto_skip', 'auto_approve', 'dynamic_approver', 'condition', 'notification') NOT NULL COMMENT '规则类型',
  
  -- 规则配置
  template_codes JSON COMMENT '适用模板 (null=全部)',
  business_types JSON COMMENT '适用业务类型 (null=全部)',
  
  -- 规则表达式
  condition_expression TEXT COMMENT '条件表达式',
  action_config JSON COMMENT '动作配置',
  
  -- 优先级
  priority INT DEFAULT 0 COMMENT '优先级(数字越大越优先)',
  
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  INDEX idx_rule_type (rule_type),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批规则表';

-- ============================================
-- 10. 审批事件日志表 (用于审计和追溯)
-- ============================================
CREATE TABLE IF NOT EXISTS approval_event_logs (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  instance_id INT NOT NULL COMMENT '实例ID',
  
  event_type VARCHAR(50) NOT NULL COMMENT '事件类型',
  event_name VARCHAR(100) NOT NULL COMMENT '事件名称',
  event_data JSON COMMENT '事件数据',
  
  -- 操作人
  operator_id INT COMMENT '操作人ID',
  operator_name VARCHAR(100) COMMENT '操作人姓名',
  
  -- 时间戳
  event_time DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) COMMENT '事件时间',
  
  -- 请求信息
  ip_address VARCHAR(50),
  user_agent TEXT,
  
  INDEX idx_instance (instance_id),
  INDEX idx_event_type (event_type),
  INDEX idx_event_time (event_time),
  INDEX idx_operator (operator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批事件日志表';

-- ============================================
-- 插入默认模板
-- ============================================

-- 设备换机审批模板
INSERT INTO approval_templates (code, name, business_type, description, config, version, is_active, created_by, published_at) 
VALUES (
  'EQUIPMENT_REPLACEMENT',
  '设备换机审批',
  'equipment_replacement',
  '设备换机审批流程，支持多级审批和条件路由',
  JSON_OBJECT(
    'nodes', JSON_ARRAY(
      JSON_OBJECT('id', 'start', 'type', 'start', 'name', '开始', 'next', 'dept_manager'),
      JSON_OBJECT('id', 'dept_manager', 'type', 'approval', 'name', '部门主管审批', 
        'approverType', 'superior', 'level', 1, 'timeout', 24, 
        'next', 'operation_manager', 'onReject', 'end'
      ),
      JSON_OBJECT('id', 'operation_manager', 'type', 'approval', 'name', '运营经理审批',
        'approverType', 'role', 'roleCode', 'OPERATION_MANAGER', 'timeout', 48,
        'next', 'end', 'onReject', 'end'
      ),
      JSON_OBJECT('id', 'end', 'type', 'end', 'name', '结束')
    ),
    'edges', JSON_ARRAY(
      JSON_OBJECT('from', 'start', 'to', 'dept_manager'),
      JSON_OBJECT('from', 'dept_manager', 'to', 'operation_manager'),
      JSON_OBJECT('from', 'operation_manager', 'to', 'end')
    )
  ),
  1,
  TRUE,
  1,
  NOW(3)
);

-- 订单审批模板
INSERT INTO approval_templates (code, name, business_type, description, config, version, is_active, created_by, published_at)
VALUES (
  'ORDER_APPROVAL',
  '订单审批',
  'order',
  '订单审批流程，根据金额自动路由',
  JSON_OBJECT(
    'nodes', JSON_ARRAY(
      JSON_OBJECT('id', 'start', 'type', 'start', 'name', '开始', 'next', 'sales_manager'),
      JSON_OBJECT('id', 'sales_manager', 'type', 'approval', 'name', '销售主管审批',
        'approverType', 'superior', 'level', 1, 'timeout', 24,
        'next', 'condition_amount', 'onReject', 'end'
      ),
      JSON_OBJECT('id', 'condition_amount', 'type', 'condition', 'name', '金额判断',
        'conditions', JSON_ARRAY(
          JSON_OBJECT('expression', 'amount > 100000', 'next', 'ceo'),
          JSON_OBJECT('expression', 'amount > 50000', 'next', 'finance_manager'),
          JSON_OBJECT('expression', 'amount <= 50000', 'next', 'end')
        )
      ),
      JSON_OBJECT('id', 'finance_manager', 'type', 'approval', 'name', '财务经理审批',
        'approverType', 'role', 'roleCode', 'FINANCE_MANAGER', 'timeout', 48,
        'next', 'end', 'onReject', 'end'
      ),
      JSON_OBJECT('id', 'ceo', 'type', 'approval', 'name', '总经理审批',
        'approverType', 'role', 'roleCode', 'CEO', 'timeout', 72,
        'next', 'end', 'onReject', 'end'
      ),
      JSON_OBJECT('id', 'end', 'type', 'end', 'name', '结束')
    ),
    'edges', JSON_ARRAY(
      JSON_OBJECT('from', 'start', 'to', 'sales_manager'),
      JSON_OBJECT('from', 'sales_manager', 'to', 'condition_amount'),
      JSON_OBJECT('from', 'condition_amount', 'to', 'finance_manager', 'condition', 'amount > 50000 && amount <= 100000'),
      JSON_OBJECT('from', 'condition_amount', 'to', 'ceo', 'condition', 'amount > 100000'),
      JSON_OBJECT('from', 'condition_amount', 'to', 'end', 'condition', 'amount <= 50000'),
      JSON_OBJECT('from', 'finance_manager', 'to', 'end'),
      JSON_OBJECT('from', 'ceo', 'to', 'end')
    )
  ),
  1,
  TRUE,
  1,
  NOW(3)
);

-- ============================================
-- 创建视图：我的待办审批
-- ============================================
CREATE OR REPLACE VIEW v_my_pending_approvals AS
SELECT 
  ai.id as instance_id,
  ai.instance_number,
  ai.title,
  ai.business_type,
  ai.business_number,
  ai.applicant_id,
  ai.applicant_name,
  ai.started_at,
  ai.priority,
  an.id as node_id,
  an.node_name,
  an.timeout_at,
  an.is_timeout,
  TIMESTAMPDIFF(HOUR, ai.started_at, NOW()) as pending_hours,
  JSON_UNQUOTE(JSON_EXTRACT(an.actual_approvers, CONCAT('$[', idx.idx, '].id'))) as approver_id
FROM approval_instances ai
JOIN approval_nodes an ON ai.id = an.instance_id AND ai.current_node_id = an.id
JOIN JSON_TABLE(
  an.actual_approvers,
  '$[*]' COLUMNS (
    idx FOR ORDINALITY,
    id INT PATH '$.id',
    status VARCHAR(20) PATH '$.status'
  )
) idx ON idx.status = 'pending'
WHERE ai.status = 'pending'
  AND an.status IN ('pending', 'processing')
  AND ai.is_deleted = 0;

-- ============================================
-- 创建视图：审批统计汇总
-- ============================================
CREATE OR REPLACE VIEW v_approval_summary AS
SELECT
  DATE(ai.started_at) as approval_date,
  ai.business_type,
  at.name as template_name,
  COUNT(*) as total_count,
  SUM(CASE WHEN ai.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
  SUM(CASE WHEN ai.status = 'approved' THEN 1 ELSE 0 END) as approved_count,
  SUM(CASE WHEN ai.status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
  AVG(TIMESTAMPDIFF(HOUR, ai.started_at, ai.finished_at)) as avg_hours,
  MAX(TIMESTAMPDIFF(HOUR, ai.started_at, ai.finished_at)) as max_hours
FROM approval_instances ai
LEFT JOIN approval_templates at ON ai.template_id = at.id
WHERE ai.is_deleted = 0
GROUP BY DATE(ai.started_at), ai.business_type, at.name;

-- ============================================
-- 完成
-- ============================================
