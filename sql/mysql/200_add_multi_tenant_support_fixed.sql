-- ============================================
-- 多租户支持：补充缺失的 company_id 字段（修复版）
-- ============================================
-- 执行时间：2024-12-23
-- 说明：为缺少 company_id 的表补充字段并创建索引
-- 修复：移除已有 company_id 的表，避免重复
-- ============================================

USE gaokongche;

-- ============================================
-- 1. 设备型号表（系统级共享数据，允许 NULL）
-- ============================================
-- 检查字段是否存在，避免重复
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'gaokongche' 
               AND TABLE_NAME = 'equipment_models' 
               AND COLUMN_NAME = 'company_id');

SET @sql := IF(@exist = 0, 
  'ALTER TABLE `equipment_models` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID（NULL表示系统级共享）'' AFTER `id`',
  'SELECT ''equipment_models.company_id 字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加索引
SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' 
                     AND TABLE_NAME = 'equipment_models' 
                     AND INDEX_NAME = 'idx_equipment_models_company_id');

SET @sql := IF(@index_exist = 0,
  'ALTER TABLE `equipment_models` ADD INDEX `idx_equipment_models_company_id` (`company_id`)',
  'SELECT ''equipment_models 索引已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 2. 司机表
-- ============================================
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'gaokongche' 
               AND TABLE_NAME = 'drivers' 
               AND COLUMN_NAME = 'company_id');

SET @sql := IF(@exist = 0,
  'ALTER TABLE `drivers` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID'' AFTER `id`',
  'SELECT ''drivers.company_id 字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' 
                     AND TABLE_NAME = 'drivers' 
                     AND INDEX_NAME = 'idx_drivers_company_id');

SET @sql := IF(@index_exist = 0,
  'ALTER TABLE `drivers` ADD INDEX `idx_drivers_company_id` (`company_id`)',
  'SELECT ''drivers 索引已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 3. 物流公司表
-- ============================================
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'gaokongche' 
               AND TABLE_NAME = 'logistics_companies' 
               AND COLUMN_NAME = 'company_id');

SET @sql := IF(@exist = 0,
  'ALTER TABLE `logistics_companies` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID'' AFTER `id`',
  'SELECT ''logistics_companies.company_id 字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' 
                     AND TABLE_NAME = 'logistics_companies' 
                     AND INDEX_NAME = 'idx_logistics_companies_company_id');

SET @sql := IF(@index_exist = 0,
  'ALTER TABLE `logistics_companies` ADD INDEX `idx_logistics_companies_company_id` (`company_id`)',
  'SELECT ''logistics_companies 索引已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 4. 部门表
-- ============================================
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'gaokongche' 
               AND TABLE_NAME = 'departments' 
               AND COLUMN_NAME = 'company_id');

SET @sql := IF(@exist = 0,
  'ALTER TABLE `departments` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID'' AFTER `id`',
  'SELECT ''departments.company_id 字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' 
                     AND TABLE_NAME = 'departments' 
                     AND INDEX_NAME = 'idx_departments_company_id');

SET @sql := IF(@index_exist = 0,
  'ALTER TABLE `departments` ADD INDEX `idx_departments_company_id` (`company_id`)',
  'SELECT ''departments 索引已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 5. 员工表
-- ============================================
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'gaokongche' 
               AND TABLE_NAME = 'employees' 
               AND COLUMN_NAME = 'company_id');

SET @sql := IF(@exist = 0,
  'ALTER TABLE `employees` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID'' AFTER `id`',
  'SELECT ''employees.company_id 字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' 
                     AND TABLE_NAME = 'employees' 
                     AND INDEX_NAME = 'idx_employees_company_id');

SET @sql := IF(@index_exist = 0,
  'ALTER TABLE `employees` ADD INDEX `idx_employees_company_id` (`company_id`)',
  'SELECT ''employees 索引已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 6. 职位表
-- ============================================
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'gaokongche' 
               AND TABLE_NAME = 'positions' 
               AND COLUMN_NAME = 'company_id');

SET @sql := IF(@exist = 0,
  'ALTER TABLE `positions` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID'' AFTER `id`',
  'SELECT ''positions.company_id 字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' 
                     AND TABLE_NAME = 'positions' 
                     AND INDEX_NAME = 'idx_positions_company_id');

SET @sql := IF(@index_exist = 0,
  'ALTER TABLE `positions` ADD INDEX `idx_positions_company_id` (`company_id`)',
  'SELECT ''positions 索引已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 7. 角色表
-- ============================================
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'gaokongche' 
               AND TABLE_NAME = 'roles' 
               AND COLUMN_NAME = 'company_id');

SET @sql := IF(@exist = 0,
  'ALTER TABLE `roles` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID（NULL表示系统级角色）'' AFTER `id`',
  'SELECT ''roles.company_id 字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' 
                     AND TABLE_NAME = 'roles' 
                     AND INDEX_NAME = 'idx_roles_company_id');

SET @sql := IF(@index_exist = 0,
  'ALTER TABLE `roles` ADD INDEX `idx_roles_company_id` (`company_id`)',
  'SELECT ''roles 索引已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 8. 工作流表
-- ============================================
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'gaokongche' 
               AND TABLE_NAME = 'workflows' 
               AND COLUMN_NAME = 'company_id');

SET @sql := IF(@exist = 0,
  'ALTER TABLE `workflows` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID'' AFTER `id`',
  'SELECT ''workflows.company_id 字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' 
                     AND TABLE_NAME = 'workflows' 
                     AND INDEX_NAME = 'idx_workflows_company_id');

SET @sql := IF(@index_exist = 0,
  'ALTER TABLE `workflows` ADD INDEX `idx_workflows_company_id` (`company_id`)',
  'SELECT ''workflows 索引已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 9. 审批配置表
-- ============================================
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'gaokongche' 
               AND TABLE_NAME = 'approval_configs' 
               AND COLUMN_NAME = 'company_id');

SET @sql := IF(@exist = 0,
  'ALTER TABLE `approval_configs` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID'' AFTER `id`',
  'SELECT ''approval_configs.company_id 字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' 
                     AND TABLE_NAME = 'approval_configs' 
                     AND INDEX_NAME = 'idx_approval_configs_company_id');

SET @sql := IF(@index_exist = 0,
  'ALTER TABLE `approval_configs` ADD INDEX `idx_approval_configs_company_id` (`company_id`)',
  'SELECT ''approval_configs 索引已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 10. 审批记录表
-- ============================================
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'gaokongche' 
               AND TABLE_NAME = 'approvals' 
               AND COLUMN_NAME = 'company_id');

SET @sql := IF(@exist = 0,
  'ALTER TABLE `approvals` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID'' AFTER `id`',
  'SELECT ''approvals.company_id 字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' 
                     AND TABLE_NAME = 'approvals' 
                     AND INDEX_NAME = 'idx_approvals_company_id');

SET @sql := IF(@index_exist = 0,
  'ALTER TABLE `approvals` ADD INDEX `idx_approvals_company_id` (`company_id`)',
  'SELECT ''approvals 索引已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 11. 模板表（系统级 + 公司级）
-- ============================================
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'gaokongche' 
               AND TABLE_NAME = 'templates' 
               AND COLUMN_NAME = 'company_id');

SET @sql := IF(@exist = 0,
  'ALTER TABLE `templates` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID（NULL表示系统级模板）'' AFTER `id`',
  'SELECT ''templates.company_id 字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' 
                     AND TABLE_NAME = 'templates' 
                     AND INDEX_NAME = 'idx_templates_company_id');

SET @sql := IF(@index_exist = 0,
  'ALTER TABLE `templates` ADD INDEX `idx_templates_company_id` (`company_id`)',
  'SELECT ''templates 索引已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 12. 提醒设置表
-- ============================================
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'gaokongche' 
               AND TABLE_NAME = 'reminder_settings' 
               AND COLUMN_NAME = 'company_id');

SET @sql := IF(@exist = 0,
  'ALTER TABLE `reminder_settings` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID'' AFTER `id`',
  'SELECT ''reminder_settings.company_id 字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' 
                     AND TABLE_NAME = 'reminder_settings' 
                     AND INDEX_NAME = 'idx_reminder_settings_company_id');

SET @sql := IF(@index_exist = 0,
  'ALTER TABLE `reminder_settings` ADD INDEX `idx_reminder_settings_company_id` (`company_id`)',
  'SELECT ''reminder_settings 索引已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 13. 提醒记录表
-- ============================================
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = 'gaokongche' 
               AND TABLE_NAME = 'reminders' 
               AND COLUMN_NAME = 'company_id');

SET @sql := IF(@exist = 0,
  'ALTER TABLE `reminders` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID'' AFTER `id`',
  'SELECT ''reminders.company_id 字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' 
                     AND TABLE_NAME = 'reminders' 
                     AND INDEX_NAME = 'idx_reminders_company_id');

SET @sql := IF(@index_exist = 0,
  'ALTER TABLE `reminders` ADD INDEX `idx_reminders_company_id` (`company_id`)',
  'SELECT ''reminders 索引已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 14. 印章表（已有 company_id，只检查索引）
-- ============================================
SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' 
                     AND TABLE_NAME = 'seals' 
                     AND INDEX_NAME = 'idx_seals_company_id');

SET @sql := IF(@index_exist = 0,
  'ALTER TABLE `seals` ADD INDEX `idx_seals_company_id` (`company_id`)',
  'SELECT ''seals 索引已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 完成
-- ============================================
SELECT '✅ 多租户字段补充完成！' AS message;

-- 验证：查看所有表的 company_id 字段
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    IS_NULLABLE,
    COLUMN_TYPE,
    COLUMN_COMMENT
FROM 
    INFORMATION_SCHEMA.COLUMNS
WHERE 
    TABLE_SCHEMA = 'gaokongche'
    AND COLUMN_NAME = 'company_id'
ORDER BY 
    TABLE_NAME;
