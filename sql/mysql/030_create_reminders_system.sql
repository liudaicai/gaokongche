-- 创建提醒系统相关表
-- 作者：System
-- 日期：2025-11-19

START TRANSACTION;

-- ==================== 提醒记录表 ====================
CREATE TABLE IF NOT EXISTS `reminders` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `company_id` INT NULL COMMENT '公司ID（多租户）',
  `type` VARCHAR(50) NOT NULL COMMENT '提醒类型：equipment_expiring, equipment_overdue, payment_overdue, contract_expiring',
  `priority` VARCHAR(20) NOT NULL DEFAULT 'normal' COMMENT '优先级：low, normal, high, urgent',
  `title` VARCHAR(255) NOT NULL COMMENT '提醒标题',
  `content` TEXT NOT NULL COMMENT '提醒内容',
  `related_type` VARCHAR(50) NULL COMMENT '关联对象类型：order, billing, equipment, policy',
  `related_id` INT NULL COMMENT '关联对象ID',
  `target_user_id` INT NULL COMMENT '目标用户ID',
  `target_role` VARCHAR(50) NULL COMMENT '目标角色：admin, business_manager, all',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态：pending, sent, read, dismissed',
  `send_method` VARCHAR(50) NOT NULL DEFAULT 'system' COMMENT '发送方式：system, email, sms, wechat',
  `scheduled_at` DATETIME NULL COMMENT '计划发送时间',
  `sent_at` DATETIME NULL COMMENT '实际发送时间',
  `read_at` DATETIME NULL COMMENT '阅读时间',
  `metadata` JSON NULL COMMENT '额外元数据',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_reminders_company_id` (`company_id`),
  KEY `idx_reminders_type` (`type`),
  KEY `idx_reminders_status` (`status`),
  KEY `idx_reminders_target_user_id` (`target_user_id`),
  KEY `idx_reminders_related` (`related_type`, `related_id`),
  KEY `idx_reminders_scheduled_at` (`scheduled_at`),
  KEY `idx_reminders_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提醒记录表';

-- ==================== 通知日志表 ====================
CREATE TABLE IF NOT EXISTS `notification_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `company_id` INT NULL COMMENT '公司ID',
  `reminder_id` INT NULL COMMENT '关联提醒ID',
  `type` VARCHAR(50) NOT NULL COMMENT '通知类型',
  `channel` VARCHAR(50) NOT NULL COMMENT '发送渠道：system, email, sms, wechat',
  `recipient` VARCHAR(255) NOT NULL COMMENT '接收人（用户ID、邮箱、手机号等）',
  `subject` VARCHAR(255) NULL COMMENT '主题',
  `content` TEXT NOT NULL COMMENT '内容',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态：pending, sent, failed',
  `send_attempts` INT NOT NULL DEFAULT 0 COMMENT '发送尝试次数',
  `error_message` TEXT NULL COMMENT '错误信息',
  `sent_at` DATETIME NULL COMMENT '发送时间',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_notification_logs_company_id` (`company_id`),
  KEY `idx_notification_logs_reminder_id` (`reminder_id`),
  KEY `idx_notification_logs_status` (`status`),
  KEY `idx_notification_logs_created_at` (`created_at`),
  CONSTRAINT `fk_notification_logs_reminder_id` 
    FOREIGN KEY (`reminder_id`) REFERENCES `reminders` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知发送日志表';

-- ==================== 提醒设置表（已存在则跳过）====================
CREATE TABLE IF NOT EXISTS `reminder_settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `company_id` INT NULL COMMENT '公司ID（NULL表示系统默认）',
  `setting_key` VARCHAR(100) NOT NULL COMMENT '设置键',
  `setting_value` JSON NOT NULL COMMENT '设置值',
  `description` VARCHAR(255) NULL COMMENT '描述',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_reminder_settings_company_key` (`company_id`, `setting_key`),
  KEY `idx_reminder_settings_company_id` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提醒设置表';

-- ==================== 插入默认设置 ====================
INSERT INTO `reminder_settings` (`company_id`, `setting_key`, `setting_value`, `description`)
VALUES 
  (NULL, 'equipment_expiry_days', '[7, 3, 1]', '设备到期提前提醒天数'),
  (NULL, 'equipment_overdue_days', '[1, 3, 7]', '设备超期未退提醒天数'),
  (NULL, 'payment_overdue_days', '[1, 3, 7, 15]', '账单逾期提醒天数'),
  (NULL, 'contract_expiry_days', '[30, 15, 7, 3]', '合同到期提前提醒天数'),
  (NULL, 'auto_generate_billing', 'true', '是否自动生成账单'),
  (NULL, 'billing_generation_day', '1', '账单生成日（每月第几天）'),
  (NULL, 'billing_due_days', '15', '账单到期天数'),
  (NULL, 'late_fee_rate', '1', '滞纳金费率（千分之几/天）'),
  (NULL, 'notification_channels', '["system", "email"]', '通知渠道')
ON DUPLICATE KEY UPDATE
  `setting_value` = VALUES(`setting_value`),
  `description` = VALUES(`description`);

COMMIT;

