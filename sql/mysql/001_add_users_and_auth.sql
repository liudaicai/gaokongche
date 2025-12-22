-- 数据库迁移：添加用户认证相关表
-- 版本：001
-- 日期：2024-01-01
-- 描述：添加 users 表、user_sessions 表、audit_logs 表，支持 JWT 认证系统

USE `high_altitude_rental_mysql`;

-- ============================================
-- 用户表（Users）
-- ============================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名（登录用）',
  `email` VARCHAR(255) NULL COMMENT '邮箱',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'bcrypt 密码哈希',
  `name` VARCHAR(100) NOT NULL COMMENT '真实姓名',
  `role` VARCHAR(50) NOT NULL DEFAULT 'user' COMMENT '角色：admin, manager, user',
  `department` VARCHAR(100) NULL COMMENT '部门',
  `phone` VARCHAR(50) NULL COMMENT '联系电话',
  `avatar_url` VARCHAR(500) NULL COMMENT '头像URL',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '账号是否激活',
  `is_locked` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '账号是否锁定',
  `failed_login_attempts` INT NOT NULL DEFAULT 0 COMMENT '登录失败次数',
  `last_login_at` DATETIME(3) NULL COMMENT '最后登录时间',
  `last_login_ip` VARCHAR(45) NULL COMMENT '最后登录IP',
  `password_changed_at` DATETIME(3) NULL COMMENT '密码最后修改时间',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `created_by` INT NULL COMMENT '创建人ID',
  `updated_by` INT NULL COMMENT '更新人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_users_username` (`username`),
  UNIQUE KEY `uniq_users_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_is_active` (`is_active`),
  KEY `idx_users_created_at` (`created_at`),
  CONSTRAINT `fk_users_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_users_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ============================================
-- 用户权限表（User Permissions）
-- ============================================
CREATE TABLE IF NOT EXISTS `user_permissions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `permission` VARCHAR(100) NOT NULL COMMENT '权限标识，如：orders.create, customers.delete',
  `granted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '授权时间',
  `granted_by` INT NULL COMMENT '授权人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_permission` (`user_id`, `permission`),
  KEY `idx_user_permissions_permission` (`permission`),
  CONSTRAINT `fk_user_permissions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_permissions_granted_by` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户权限表';

-- ============================================
-- 用户会话表（User Sessions）- 可选，用于跟踪活跃会话
-- ============================================
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `token_jti` VARCHAR(64) NOT NULL COMMENT 'JWT Token ID (jti claim)',
  `ip_address` VARCHAR(45) NULL COMMENT '登录IP',
  `user_agent` VARCHAR(500) NULL COMMENT '用户代理（浏览器信息）',
  `device_info` VARCHAR(255) NULL COMMENT '设备信息',
  `expires_at` DATETIME(3) NOT NULL COMMENT 'Token过期时间',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `last_activity_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '最后活动时间',
  `revoked_at` DATETIME(3) NULL COMMENT '撤销时间（用于强制登出）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_sessions_token_jti` (`token_jti`),
  KEY `idx_sessions_user_id` (`user_id`),
  KEY `idx_sessions_expires_at` (`expires_at`),
  KEY `idx_sessions_revoked_at` (`revoked_at`),
  CONSTRAINT `fk_user_sessions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户会话表';

-- ============================================
-- Token 黑名单（Revoked Tokens）- 用于提前撤销 token
-- ============================================
CREATE TABLE IF NOT EXISTS `revoked_tokens` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `token_jti` VARCHAR(64) NOT NULL COMMENT 'JWT Token ID',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `revoked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '撤销时间',
  `reason` VARCHAR(255) NULL COMMENT '撤销原因',
  `expires_at` DATETIME(3) NOT NULL COMMENT 'Token原始过期时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_revoked_tokens_jti` (`token_jti`),
  KEY `idx_revoked_tokens_expires_at` (`expires_at`),
  KEY `idx_revoked_tokens_user_id` (`user_id`),
  CONSTRAINT `fk_revoked_tokens_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Token黑名单';

-- ============================================
-- 审计日志表（Audit Logs）
-- ============================================
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` INT NULL COMMENT '操作用户ID',
  `username` VARCHAR(50) NULL COMMENT '用户名（冗余，防止用户删除后无法追溯）',
  `action` VARCHAR(100) NOT NULL COMMENT '操作类型：login, logout, create, update, delete',
  `resource_type` VARCHAR(50) NULL COMMENT '资源类型：user, customer, order, equipment',
  `resource_id` VARCHAR(50) NULL COMMENT '资源ID',
  `details` JSON NULL COMMENT '操作详情（JSON格式）',
  `ip_address` VARCHAR(45) NULL COMMENT '操作IP',
  `user_agent` VARCHAR(500) NULL COMMENT '用户代理',
  `status` VARCHAR(20) NOT NULL DEFAULT 'success' COMMENT '操作状态：success, failed',
  `error_message` TEXT NULL COMMENT '错误信息（如果失败）',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_user_id` (`user_id`),
  KEY `idx_audit_logs_action` (`action`),
  KEY `idx_audit_logs_resource` (`resource_type`, `resource_id`),
  KEY `idx_audit_logs_created_at` (`created_at`),
  KEY `idx_audit_logs_username` (`username`),
  CONSTRAINT `fk_audit_logs_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审计日志表';

-- ============================================
-- 密码重置表（Password Reset Tokens）
-- ============================================
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `token` VARCHAR(255) NOT NULL COMMENT '重置令牌（哈希后存储）',
  `expires_at` DATETIME(3) NOT NULL COMMENT '过期时间',
  `used_at` DATETIME(3) NULL COMMENT '使用时间',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_password_reset_token` (`token`),
  KEY `idx_password_reset_user_id` (`user_id`),
  KEY `idx_password_reset_expires_at` (`expires_at`),
  CONSTRAINT `fk_password_reset_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='密码重置令牌表';

-- ============================================
-- 系统配置表（System Settings）
-- ============================================
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(100) NOT NULL COMMENT '配置键',
  `value` TEXT NULL COMMENT '配置值',
  `type` VARCHAR(20) NOT NULL DEFAULT 'string' COMMENT '值类型：string, number, boolean, json',
  `description` VARCHAR(500) NULL COMMENT '配置说明',
  `is_public` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否公开（前端可访问）',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `updated_by` INT NULL COMMENT '更新人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_system_settings_key` (`key`),
  CONSTRAINT `fk_system_settings_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- ============================================
-- 添加 email 字段到 insurance_policies 表（如果不存在）
-- 注意：如果字段已存在会报错，但不影响后续执行
-- ============================================
-- ALTER TABLE `insurance_policies` 
-- ADD COLUMN `email` VARCHAR(255) NULL COMMENT '联系邮箱' AFTER `rate`;
-- 暂时注释掉，因为不是核心功能

-- ============================================
-- 为现有表添加索引优化
-- 注意：索引可能已存在，会产生警告但不影响
-- ============================================

-- 注意：下面的索引添加可能会因为已存在而报错，这是正常的
-- 如果表已有索引，MySQL 会报错但继续执行后续语句

-- order_items 表（如果存在）
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL COMMENT '订单ID',
  `equipment_type` VARCHAR(100) NULL COMMENT '设备类型',
  `height` VARCHAR(50) NULL COMMENT '高度',
  `quantity` INT NULL DEFAULT 1 COMMENT '数量',
  `daily_rate` DECIMAL(10,2) NULL COMMENT '日租金',
  `monthly_rate` DECIMAL(10,2) NULL COMMENT '月租金',
  `deposit` DECIMAL(10,2) NULL COMMENT '押金',
  `shipping_fee` DECIMAL(10,2) NULL COMMENT '运费',
  `modification_fee` DECIMAL(10,2) NULL COMMENT '改装费',
  `scheduled_entry_date` DATE NULL COMMENT '计划进场日期',
  `estimated_exit_date` DATE NULL COMMENT '预计退场日期',
  `rental_period` INT NULL COMMENT '租赁周期（天）',
  `shipping_type` VARCHAR(50) NULL COMMENT '运输方式',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_order_items_order_id` (`order_id`),
  CONSTRAINT `fk_order_items_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单明细表';

-- ============================================
-- 插入默认系统配置
-- ============================================
INSERT INTO `system_settings` (`key`, `value`, `type`, `description`, `is_public`) VALUES
  ('site_name', '高空车租赁管理系统', 'string', '系统名称', 1),
  ('password_min_length', '8', 'number', '密码最小长度', 0),
  ('max_login_attempts', '5', 'number', '最大登录尝试次数', 0),
  ('session_timeout', '7d', 'string', '会话超时时间', 0),
  ('require_email_verification', 'false', 'boolean', '是否需要邮箱验证', 0)
ON DUPLICATE KEY UPDATE `key` = `key`;

-- ============================================
-- 创建视图：活跃用户统计
-- ============================================
CREATE OR REPLACE VIEW `v_active_users` AS
SELECT 
  u.id,
  u.username,
  u.name,
  u.role,
  u.department,
  u.last_login_at,
  COUNT(DISTINCT s.id) AS active_sessions
FROM users u
LEFT JOIN user_sessions s ON s.user_id = u.id 
  AND s.expires_at > NOW() 
  AND s.revoked_at IS NULL
WHERE u.is_active = 1 AND u.is_locked = 0
GROUP BY u.id, u.username, u.name, u.role, u.department, u.last_login_at;

-- ============================================
-- 创建视图：今日审计日志
-- ============================================
CREATE OR REPLACE VIEW `v_today_audit_logs` AS
SELECT 
  id,
  user_id,
  username,
  action,
  resource_type,
  resource_id,
  ip_address,
  status,
  created_at
FROM audit_logs
WHERE DATE(created_at) = CURDATE()
ORDER BY created_at DESC;

-- ============================================
-- 创建触发器：记录用户创建审计日志
-- 注意：触发器创建需要在 MySQL 命令行中执行
-- 这里暂时注释掉，因为 DELIMITER 在 Node.js 中不支持
-- ============================================
-- 如需创建触发器，请在 MySQL 命令行中手动执行以下代码：
/*
DELIMITER $$
CREATE TRIGGER IF NOT EXISTS `trg_users_after_insert`
AFTER INSERT ON `users`
FOR EACH ROW
BEGIN
  INSERT INTO audit_logs (user_id, username, action, resource_type, resource_id, details)
  VALUES (NEW.created_by, (SELECT username FROM users WHERE id = NEW.created_by), 
          'create', 'user', NEW.id, 
          JSON_OBJECT('username', NEW.username, 'name', NEW.name, 'role', NEW.role));
END$$
DELIMITER ;
*/

-- ============================================
-- 清理过期数据的存储过程
-- 注意：存储过程需要在 MySQL 命令行中创建
-- 这里暂时注释掉，清理功能在 Node.js 脚本中实现
-- ============================================
-- 如需创建存储过程，请在 MySQL 命令行中手动执行以下代码：
/*
DELIMITER $$
CREATE PROCEDURE IF NOT EXISTS `sp_cleanup_expired_tokens`()
BEGIN
  DELETE FROM revoked_tokens WHERE expires_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
  DELETE FROM user_sessions WHERE expires_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
  DELETE FROM password_reset_tokens WHERE used_at IS NOT NULL AND used_at < DATE_SUB(NOW(), INTERVAL 7 DAY);
  DELETE FROM password_reset_tokens WHERE used_at IS NULL AND expires_at < NOW();
  SELECT ROW_COUNT() AS deleted_rows;
END$$
DELIMITER ;
*/

-- ============================================
-- 完成提示
-- ============================================
SELECT '✅ 数据库迁移 001 完成：用户认证系统表已创建' AS status;

