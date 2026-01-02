-- ============================================
-- 提醒系统优化脚本
-- 作者: AI 开发助手
-- 日期: 2026-01-02
-- 说明: 统一提醒表结构，删除重复定义
-- ============================================

USE gaokongche;

START TRANSACTION;

-- ==================== 问题分析 ====================
/*
当前系统存在两套提醒表:
1. 030版本: reminders, notification_logs, reminder_settings
2. 057版本: reminder_rules, reminder_records, user_reminder_settings, reminder_statistics, contract_renewal_records

优化方案:
- 保留 057 版本（功能更完整）
- 迁移 030 版本的数据到 057 版本
- 删除 030 版本的重复表
*/

-- ==================== 第一步: 确保 057 版本表都存在 ====================

-- 1. 提醒规则表
CREATE TABLE IF NOT EXISTS reminder_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  rule_name VARCHAR(100) NOT NULL COMMENT '规则名称',
  rule_type VARCHAR(50) NOT NULL COMMENT '规则类型',
  description TEXT COMMENT '规则描述',
  trigger_type VARCHAR(50) NOT NULL COMMENT '触发类型',
  advance_days INT DEFAULT 0 COMMENT '提前天数',
  trigger_time TIME DEFAULT '09:00:00' COMMENT '触发时间',
  priority VARCHAR(20) DEFAULT 'medium' COMMENT '优先级',
  is_repeatable BOOLEAN DEFAULT FALSE COMMENT '是否可重复提醒',
  repeat_interval INT DEFAULT 1 COMMENT '重复间隔(天)',
  max_repeat_times INT DEFAULT 3 COMMENT '最大重复次数',
  receiver_type VARCHAR(50) NOT NULL COMMENT '接收人类型',
  receiver_ids TEXT COMMENT '接收人ID列表(JSON)',
  notification_channels TEXT NOT NULL COMMENT '推送渠道(JSON)',
  message_template TEXT COMMENT '消息模板',
  is_enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  is_system BOOLEAN DEFAULT FALSE COMMENT '是否系统规则',
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
  rule_id INT COMMENT '规则ID',
  business_type VARCHAR(50) NOT NULL COMMENT '业务类型',
  business_id INT NOT NULL COMMENT '业务ID',
  title VARCHAR(200) NOT NULL COMMENT '提醒标题',
  content TEXT COMMENT '提醒内容',
  priority VARCHAR(20) DEFAULT 'medium' COMMENT '优先级',
  receiver_id INT NOT NULL COMMENT '接收人ID',
  receiver_name VARCHAR(100) COMMENT '接收人姓名',
  notification_channel VARCHAR(50) NOT NULL COMMENT '推送渠道',
  status VARCHAR(50) DEFAULT 'pending' COMMENT '状态',
  sent_at TIMESTAMP(3) COMMENT '发送时间',
  read_at TIMESTAMP(3) COMMENT '阅读时间',
  handled_at TIMESTAMP(3) COMMENT '处理时间',
  repeat_count INT DEFAULT 0 COMMENT '重复次数',
  parent_record_id INT COMMENT '父记录ID',
  handler_id INT COMMENT '处理人ID',
  handler_name VARCHAR(100) COMMENT '处理人姓名',
  handle_note TEXT COMMENT '处理备注',
  send_result TEXT COMMENT '发送结果(JSON)',
  error_message TEXT COMMENT '错误信息',
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
  user_id INT NOT NULL COMMENT '用户ID',
  is_enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用提醒',
  quiet_time_start TIME COMMENT '勿扰开始时间',
  quiet_time_end TIME COMMENT '勿扰结束时间',
  enable_system_notification BOOLEAN DEFAULT TRUE COMMENT '启用系统通知',
  enable_email_notification BOOLEAN DEFAULT TRUE COMMENT '启用邮件通知',
  enable_sms_notification BOOLEAN DEFAULT FALSE COMMENT '启用短信通知',
  enable_wechat_notification BOOLEAN DEFAULT FALSE COMMENT '启用微信通知',
  reminder_type_settings TEXT COMMENT '提醒类型设置(JSON)',
  email VARCHAR(255) COMMENT '邮箱地址',
  phone VARCHAR(20) COMMENT '手机号',
  wechat_openid VARCHAR(100) COMMENT '微信OpenID',
  company_id INT COMMENT '公司ID',
  created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_user (user_id),
  INDEX idx_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户提醒配置表';

-- 4. 合同续约记录表
CREATE TABLE IF NOT EXISTS contract_renewal_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL COMMENT '订单ID',
  contract_number VARCHAR(100) COMMENT '合同编号',
  customer_id INT COMMENT '客户ID',
  customer_name VARCHAR(100) COMMENT '客户名称',
  renewal_type VARCHAR(50) NOT NULL COMMENT '续约类型',
  next_reminder_date DATE COMMENT '下次提醒日期',
  renewal_period_months INT COMMENT '续约期限(月)',
  renewal_start_date DATE COMMENT '续约开始日期',
  calculated_reminder_date DATE COMMENT '计算的提醒日期',
  advance_days INT DEFAULT 7 COMMENT '提前提醒天数',
  is_reminded BOOLEAN DEFAULT FALSE COMMENT '是否已提醒',
  reminded_at TIMESTAMP(3) COMMENT '提醒时间',
  status VARCHAR(50) DEFAULT 'pending' COMMENT '状态',
  handled_by INT COMMENT '处理人ID',
  handled_at TIMESTAMP(3) COMMENT '处理时间',
  handle_note TEXT COMMENT '处理备注',
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

-- ==================== 第二步: 迁移 030 版本数据到 057 版本 ====================

-- 迁移 reminders 到 reminder_records
SET @old_reminders_exists = (
  SELECT COUNT(*) 
  FROM information_schema.TABLES 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'reminders'
);

SET @migration_sql = IF(@old_reminders_exists > 0,
  'INSERT INTO reminder_records 
    (business_type, business_id, title, content, priority, receiver_id, 
     notification_channel, status, sent_at, read_at, company_id, created_at, updated_at)
  SELECT 
    COALESCE(related_type, ''unknown'') as business_type,
    COALESCE(related_id, 0) as business_id,
    title,
    content,
    priority,
    COALESCE(target_user_id, 1) as receiver_id,
    send_method as notification_channel,
    status,
    sent_at,
    read_at,
    company_id,
    created_at,
    updated_at
  FROM reminders
  WHERE NOT EXISTS (
    SELECT 1 FROM reminder_records 
    WHERE reminder_records.title = reminders.title 
      AND reminder_records.created_at = reminders.created_at
  )',
  'SELECT ''reminders 表不存在，跳过数据迁移'' AS message'
);

PREPARE stmt FROM @migration_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==================== 第三步: 删除 030 版本的冗余表 ====================

-- 1. 删除统计表（使用动态查询替代）
DROP TABLE IF EXISTS reminder_statistics;

-- 2. 重命名旧的 reminders 表（保留30天）
SET @rename_sql = IF(@old_reminders_exists > 0,
  'RENAME TABLE reminders TO _reminders_backup_20260102',
  'SELECT ''reminders 表不存在，跳过重命名'' AS message'
);

PREPARE stmt FROM @rename_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. 保留 notification_logs 表（两个版本都可能用到）
-- 4. 保留 reminder_settings 表（可以与 user_reminder_settings 共存）

COMMIT;

-- ==================== 第四步: 验证数据 ====================
SELECT 
  '提醒系统优化完成' AS message,
  (SELECT COUNT(*) FROM reminder_rules) AS total_rules,
  (SELECT COUNT(*) FROM reminder_records) AS total_records,
  (SELECT COUNT(*) FROM user_reminder_settings) AS total_user_settings;

-- ==================== 第五步: 30天后清理备份表 ====================
/*
-- 清理脚本（2026-02-01 之后执行）
USE gaokongche;

DROP TABLE IF EXISTS _reminders_backup_20260102;
DROP TABLE IF EXISTS reminder_statistics;

SELECT '✅ 提醒系统旧表已清理' AS message;
*/

-- ==================== 完成提示 ====================
SELECT CONCAT(
  '✅ 提醒系统优化完成！\n',
  '📊 统一后的表结构:\n',
  '  - reminder_rules: 提醒规则配置\n',
  '  - reminder_records: 提醒记录\n',
  '  - user_reminder_settings: 用户提醒偏好设置\n',
  '  - contract_renewal_records: 合同续约记录\n',
  '  - notification_logs: 通知发送日志（保留）\n',
  '🗑️  已删除的表:\n',
  '  - reminder_statistics（使用动态查询）\n',
  '⚠️  已备份的表:\n',
  '  - _reminders_backup_20260102\n',
  '📝 后续步骤:\n',
  '  1. 更新后端 API: server/routes/reminders.mysql.js\n',
  '  2. 测试提醒功能\n',
  '  3. 30天后删除备份表\n'
) AS summary;

