-- ============================================
-- 多租户支持：补充缺失的 company_id 字段
-- ============================================
-- 执行时间：2024-12-23
-- 说明：为缺少 company_id 的表补充字段并创建索引
-- ============================================

USE gaokongche;

-- ============================================
-- 1. 设备型号表（系统级共享数据，允许 NULL）
-- ============================================
ALTER TABLE `equipment_models` 
ADD COLUMN `company_id` INT DEFAULT NULL COMMENT '所属公司ID（NULL表示系统级共享）' 
AFTER `id`;

ALTER TABLE `equipment_models` 
ADD INDEX `idx_company_id` (`company_id`);

-- ============================================
-- 2. 司机表
-- ============================================
ALTER TABLE `drivers` 
ADD COLUMN `company_id` INT DEFAULT NULL COMMENT '所属公司ID' 
AFTER `id`;

ALTER TABLE `drivers` 
ADD INDEX `idx_company_id` (`company_id`);

-- ============================================
-- 3. 物流公司表
-- ============================================
ALTER TABLE `logistics_companies` 
ADD COLUMN `company_id` INT DEFAULT NULL COMMENT '所属公司ID' 
AFTER `id`;

ALTER TABLE `logistics_companies` 
ADD INDEX `idx_company_id` (`company_id`);

-- ============================================
-- 4. 部门表
-- ============================================
ALTER TABLE `departments` 
ADD COLUMN `company_id` INT DEFAULT NULL COMMENT '所属公司ID' 
AFTER `id`;

ALTER TABLE `departments` 
ADD INDEX `idx_company_id` (`company_id`);

-- ============================================
-- 5. 员工表
-- ============================================
ALTER TABLE `employees` 
ADD COLUMN `company_id` INT DEFAULT NULL COMMENT '所属公司ID' 
AFTER `id`;

ALTER TABLE `employees` 
ADD INDEX `idx_company_id` (`company_id`);

-- ============================================
-- 6. 职位表
-- ============================================
ALTER TABLE `positions` 
ADD COLUMN `company_id` INT DEFAULT NULL COMMENT '所属公司ID' 
AFTER `id`;

ALTER TABLE `positions` 
ADD INDEX `idx_company_id` (`company_id`);

-- ============================================
-- 7. 权限表（系统级，保留 NULL）
-- ============================================
-- permissions 表通常是系统级的，不需要 company_id
-- 如果需要，可以取消下面的注释：
-- ALTER TABLE `permissions` 
-- ADD COLUMN `company_id` INT DEFAULT NULL COMMENT '所属公司ID（NULL表示系统级）' 
-- AFTER `id`;
-- 
-- ALTER TABLE `permissions` 
-- ADD INDEX `idx_company_id` (`company_id`);

-- ============================================
-- 8. 角色表
-- ============================================
ALTER TABLE `roles` 
ADD COLUMN `company_id` INT DEFAULT NULL COMMENT '所属公司ID（NULL表示系统级角色）' 
AFTER `id`;

ALTER TABLE `roles` 
ADD INDEX `idx_company_id` (`company_id`);

-- ============================================
-- 9. 工作流表
-- ============================================
ALTER TABLE `workflows` 
ADD COLUMN `company_id` INT DEFAULT NULL COMMENT '所属公司ID' 
AFTER `id`;

ALTER TABLE `workflows` 
ADD INDEX `idx_company_id` (`company_id`);

-- ============================================
-- 10. 审批配置表
-- ============================================
ALTER TABLE `approval_configs` 
ADD COLUMN `company_id` INT DEFAULT NULL COMMENT '所属公司ID' 
AFTER `id`;

ALTER TABLE `approval_configs` 
ADD INDEX `idx_company_id` (`company_id`);

-- ============================================
-- 11. 审批记录表
-- ============================================
ALTER TABLE `approvals` 
ADD COLUMN `company_id` INT DEFAULT NULL COMMENT '所属公司ID' 
AFTER `id`;

ALTER TABLE `approvals` 
ADD INDEX `idx_company_id` (`company_id`);

-- ============================================
-- 12. 模板表（系统级 + 公司级）
-- ============================================
ALTER TABLE `templates` 
ADD COLUMN `company_id` INT DEFAULT NULL COMMENT '所属公司ID（NULL表示系统级模板）' 
AFTER `id`;

ALTER TABLE `templates` 
ADD INDEX `idx_company_id` (`company_id`);

-- ============================================
-- 13. 提醒设置表
-- ============================================
ALTER TABLE `reminder_settings` 
ADD COLUMN `company_id` INT DEFAULT NULL COMMENT '所属公司ID' 
AFTER `id`;

ALTER TABLE `reminder_settings` 
ADD INDEX `idx_company_id` (`company_id`);

-- ============================================
-- 14. 提醒记录表
-- ============================================
ALTER TABLE `reminders` 
ADD COLUMN `company_id` INT DEFAULT NULL COMMENT '所属公司ID' 
AFTER `id`;

ALTER TABLE `reminders` 
ADD INDEX `idx_company_id` (`company_id`);

-- ============================================
-- 15. 印章表（已有 company_id，确保索引存在）
-- ============================================
-- seals 表已有 company_id，检查并添加索引（如果不存在）
-- 注意：MySQL不支持 IF NOT EXISTS for INDEX，需要先检查
-- 如果执行报错 "Duplicate key name"，说明索引已存在，可忽略
ALTER TABLE `seals` 
ADD INDEX `idx_seals_company_id` (`company_id`);

-- ============================================
-- 16. 操作证表（已有 company_id，确保索引存在）
-- ============================================
-- operator_certificates 表如果已有 company_id，确保索引
-- ALTER TABLE `operator_certificates` 
-- ADD INDEX IF NOT EXISTS `idx_company_id` (`company_id`);

-- ============================================
-- 验证：查看所有表的 company_id 字段
-- ============================================
-- 执行以下查询验证哪些表有 company_id：
/*
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    IS_NULLABLE,
    COLUMN_TYPE
FROM 
    INFORMATION_SCHEMA.COLUMNS
WHERE 
    TABLE_SCHEMA = 'gaokongche'
    AND COLUMN_NAME = 'company_id'
ORDER BY 
    TABLE_NAME;
*/

-- ============================================
-- 完成
-- ============================================
SELECT '多租户字段补充完成！' AS message;
