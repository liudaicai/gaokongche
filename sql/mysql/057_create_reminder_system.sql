-- ============================================================
-- 智能提醒中心 - 数据库迁移脚本
-- 版本: 1.0
-- 创建时间: 2025-01-09
-- 描述: 创建提醒系统相关表
-- ============================================================

-- 1. 提醒规则表
CREATE TABLE IF NOT EXISTS reminder_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- 基本信息
  rule_name VARCHAR(100) NOT NULL COMMENT '规则名称',
  rule_type VARCHAR(50) NOT NULL COMMENT '规则类型: contract_expire, contract_renewal, equipment_exit, reconciliation, policy_expire',
  description TEXT COMMENT '规则描述',
  
  -- 触发条件
  trigger_type VARCHAR(50) NOT NULL COMMENT '触发类型: time_based(时间触发), event_based(事件触发)',
  advance_days INT DEFAULT 0 COMMENT '提前天数',
  trigger_time TIME DEFAULT '09:00:00' COMMENT '触发时间',
  
  -- 提醒配置
  priority VARCHAR(20) DEFAULT 'medium' COMMENT '优先级: low, medium, high, urgent',
  is_repeatable BOOLEAN DEFAULT FALSE COMMENT '是否可重复提醒',
  repeat_interval INT DEFAULT 1 COMMENT '重复间隔(天)',
  max_repeat_times INT DEFAULT 3 COMMENT '最大重复次数',
  
  -- 接收人配置
  receiver_type VARCHAR(50) NOT NULL COMMENT '接收人类型: specific_user(指定用户), role(角色), department(部门)',
  receiver_ids TEXT COMMENT '接收人ID列表(JSON)',
  
  -- 推送渠道
  notification_channels TEXT NOT NULL COMMENT '推送渠道(JSON): ["system", "email", "sms", "wechat"]',
  
  -- 消息模板
  message_template TEXT COMMENT '消息模板',
  
  -- 状态控制
  is_enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  is_system BOOLEAN DEFAULT FALSE COMMENT '是否系统规则(不可删除)',
  
  -- 租户和审计
  company_id INT COMMENT '公司ID',
  created_by INT COMMENT '创建人',
  updated_by INT COMMENT '更新人',
  created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  INDEX idx_rule_type (rule_type),
  INDEX idx_company (company_id),
  INDEX idx_enabled (is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='提醒规则表';

-- 2. 提醒记录表
CREATE TABLE IF NOT EXISTS reminder_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- 关联信息
  rule_id INT COMMENT '规则ID',
  business_type VARCHAR(50) NOT NULL COMMENT '业务类型',
  business_id INT NOT NULL COMMENT '业务ID',
  
  -- 提醒信息
  title VARCHAR(200) NOT NULL COMMENT '提醒标题',
  content TEXT COMMENT '提醒内容',
  priority VARCHAR(20) DEFAULT 'medium' COMMENT '优先级',
  
  -- 接收人
  receiver_id INT NOT NULL COMMENT '接收人ID',
  receiver_name VARCHAR(100) COMMENT '接收人姓名',
  
  -- 推送渠道
  notification_channel VARCHAR(50) NOT NULL COMMENT '推送渠道: system, email, sms, wechat',
  
  -- 状态
  status VARCHAR(50) DEFAULT 'pending' COMMENT '状态: pending, sent, read, handled, expired, failed',
  sent_at TIMESTAMP(3) COMMENT '发送时间',
  read_at TIMESTAMP(3) COMMENT '阅读时间',
  handled_at TIMESTAMP(3) COMMENT '处理时间',
  
  -- 重复提醒
  repeat_count INT DEFAULT 0 COMMENT '重复次数',
  parent_record_id INT COMMENT '父记录ID(重复提醒)',
  
  -- 处理结果
  handler_id INT COMMENT '处理人ID',
  handler_name VARCHAR(100) COMMENT '处理人姓名',
  handle_note TEXT COMMENT '处理备注',
  
  -- 发送结果
  send_result TEXT COMMENT '发送结果(JSON)',
  error_message TEXT COMMENT '错误信息',
  
  -- 租户和审计
  company_id INT COMMENT '公司ID',
  created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  INDEX idx_rule (rule_id),
  INDEX idx_business (business_type, business_id),
  INDEX idx_receiver (receiver_id, status),
  INDEX idx_company (company_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='提醒记录表';

-- 3. 用户提醒配置表
CREATE TABLE IF NOT EXISTS user_reminder_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- 用户信息
  user_id INT NOT NULL COMMENT '用户ID',
  
  -- 全局设置
  is_enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用提醒',
  quiet_time_start TIME COMMENT '勿扰开始时间',
  quiet_time_end TIME COMMENT '勿扰结束时间',
  
  -- 渠道设置
  enable_system_notification BOOLEAN DEFAULT TRUE COMMENT '启用系统通知',
  enable_email_notification BOOLEAN DEFAULT TRUE COMMENT '启用邮件通知',
  enable_sms_notification BOOLEAN DEFAULT FALSE COMMENT '启用短信通知',
  enable_wechat_notification BOOLEAN DEFAULT FALSE COMMENT '启用微信通知',
  
  -- 提醒类型设置(JSON)
  reminder_type_settings TEXT COMMENT '提醒类型设置',
  
  -- 联系方式
  email VARCHAR(255) COMMENT '邮箱地址',
  phone VARCHAR(20) COMMENT '手机号',
  wechat_openid VARCHAR(100) COMMENT '微信OpenID',
  
  -- 租户和审计
  company_id INT COMMENT '公司ID',
  created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  UNIQUE KEY uk_user (user_id),
  INDEX idx_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户提醒配置表';

-- 4. 合同续约记录表
CREATE TABLE IF NOT EXISTS contract_renewal_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- 关联信息
  order_id INT NOT NULL COMMENT '订单ID',
  contract_number VARCHAR(100) COMMENT '合同编号',
  customer_id INT COMMENT '客户ID',
  customer_name VARCHAR(100) COMMENT '客户名称',
  
  -- 续约信息
  renewal_type VARCHAR(50) NOT NULL COMMENT '续约类型: specific_date(指定日期), renewal_period(续约期限)',
  
  -- 模式一：指定日期
  next_reminder_date DATE COMMENT '下次提醒日期',
  
  -- 模式二：续约期限
  renewal_period_months INT COMMENT '续约期限(月)',
  renewal_start_date DATE COMMENT '续约开始日期',
  calculated_reminder_date DATE COMMENT '计算的提醒日期',
  
  -- 提醒配置
  advance_days INT DEFAULT 7 COMMENT '提前提醒天数',
  is_reminded BOOLEAN DEFAULT FALSE COMMENT '是否已提醒',
  reminded_at TIMESTAMP(3) COMMENT '提醒时间',
  
  -- 处理状态
  status VARCHAR(50) DEFAULT 'pending' COMMENT '状态: pending(待处理), completed(已完成), cancelled(已取消)',
  handled_by INT COMMENT '处理人ID',
  handled_at TIMESTAMP(3) COMMENT '处理时间',
  handle_note TEXT COMMENT '处理备注',
  
  -- 租户和审计
  company_id INT COMMENT '公司ID',
  created_by INT COMMENT '创建人',
  created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  INDEX idx_order (order_id),
  INDEX idx_customer (customer_id),
  INDEX idx_reminder_date (next_reminder_date),
  INDEX idx_calculated_date (calculated_reminder_date),
  INDEX idx_company (company_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='合同续约记录表';

-- 5. 提醒统计表
CREATE TABLE IF NOT EXISTS reminder_statistics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- 统计维度
  stat_date DATE NOT NULL COMMENT '统计日期',
  rule_type VARCHAR(50) COMMENT '规则类型',
  
  -- 统计数据
  total_sent INT DEFAULT 0 COMMENT '发送总数',
  total_read INT DEFAULT 0 COMMENT '已读总数',
  total_handled INT DEFAULT 0 COMMENT '已处理总数',
  total_expired INT DEFAULT 0 COMMENT '已过期总数',
  total_failed INT DEFAULT 0 COMMENT '发送失败总数',
  
  -- 渠道统计
  system_sent INT DEFAULT 0 COMMENT '系统消息发送数',
  email_sent INT DEFAULT 0 COMMENT '邮件发送数',
  sms_sent INT DEFAULT 0 COMMENT '短信发送数',
  wechat_sent INT DEFAULT 0 COMMENT '微信发送数',
  
  -- 响应时间
  avg_read_time_minutes INT COMMENT '平均阅读时间(分钟)',
  avg_handle_time_minutes INT COMMENT '平均处理时间(分钟)',
  
  -- 租户
  company_id INT COMMENT '公司ID',
  created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  UNIQUE KEY uk_stat (stat_date, rule_type, company_id),
  INDEX idx_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='提醒统计表';

-- 插入默认提醒规则
INSERT INTO reminder_rules (
  rule_name, rule_type, description, trigger_type, advance_days,
  receiver_type, receiver_ids, notification_channels, message_template,
  is_enabled, is_system, priority
) VALUES
(
  '合同到期提醒',
  'contract_expire',
  '合同到期前1天提醒',
  'time_based',
  1,
  'role',
  '["business_manager"]',
  '["system"]',
  '您好，合同【{contractNumber}】将于{expiryDate}到期，请及时处理。',
  TRUE,
  TRUE,
  'high'
),
(
  '设备退场提醒',
  'equipment_exit',
  '设备退场前2天提醒',
  'time_based',
  2,
  'role',
  '["logistics_manager"]',
  '["system"]',
  '设备【{equipmentNumber}】计划于{scheduledDate}退场，请做好准备。',
  TRUE,
  TRUE,
  'medium'
),
(
  '月度对账提醒',
  'reconciliation',
  '每月25日对账提醒',
  'time_based',
  0,
  'role',
  '["finance_manager", "business_manager"]',
  '["system"]',
  '请及时完成{period}期的对账工作。',
  TRUE,
  TRUE,
  'high'
),
(
  '保单到期提醒',
  'policy_expire',
  '保单到期前7天提醒',
  'time_based',
  7,
  'role',
  '["insurance_manager"]',
  '["system"]',
  '设备保单【{policyNumber}】将于{expiryDate}到期，请及时续保。',
  TRUE,
  TRUE,
  'high'
);

-- 完成提示
SELECT '智能提醒中心数据库表创建完成！' AS message;

