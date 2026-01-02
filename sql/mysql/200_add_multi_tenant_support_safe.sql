-- ============================================
-- 多租户支持：补充缺失的 company_id 字段（安全版）
-- ============================================
-- 执行时间：2024-12-23
-- 说明：自动检查表是否存在，只处理存在的表
-- ============================================

USE gaokongche;

-- ============================================
-- 辅助函数：为存在的表添加 company_id
-- ============================================

-- 1. equipment_models（设备型号）
SET @table_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'equipment_models');
SET @column_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                      WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'equipment_models' AND COLUMN_NAME = 'company_id');

SET @sql := IF(@table_exist > 0 AND @column_exist = 0,
  'ALTER TABLE `equipment_models` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID'' AFTER `id`',
  'SELECT ''equipment_models: 表不存在或字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加索引
SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'equipment_models' 
                     AND INDEX_NAME = 'idx_equipment_models_company_id');
SET @sql := IF(@table_exist > 0 AND @index_exist = 0,
  'ALTER TABLE `equipment_models` ADD INDEX `idx_equipment_models_company_id` (`company_id`)',
  'SELECT ''equipment_models: 索引已存在或表不存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. drivers（司机）
SET @table_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'drivers');
SET @column_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                      WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'drivers' AND COLUMN_NAME = 'company_id');

SET @sql := IF(@table_exist > 0 AND @column_exist = 0,
  'ALTER TABLE `drivers` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID'' AFTER `id`',
  'SELECT ''drivers: 表不存在或字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'drivers' 
                     AND INDEX_NAME = 'idx_drivers_company_id');
SET @sql := IF(@table_exist > 0 AND @index_exist = 0,
  'ALTER TABLE `drivers` ADD INDEX `idx_drivers_company_id` (`company_id`)',
  'SELECT ''drivers: 索引已存在或表不存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. logistics_companies（物流公司）
SET @table_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'logistics_companies');
SET @column_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                      WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'logistics_companies' AND COLUMN_NAME = 'company_id');

SET @sql := IF(@table_exist > 0 AND @column_exist = 0,
  'ALTER TABLE `logistics_companies` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID'' AFTER `id`',
  'SELECT ''logistics_companies: 表不存在或字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'logistics_companies' 
                     AND INDEX_NAME = 'idx_logistics_companies_company_id');
SET @sql := IF(@table_exist > 0 AND @index_exist = 0,
  'ALTER TABLE `logistics_companies` ADD INDEX `idx_logistics_companies_company_id` (`company_id`)',
  'SELECT ''logistics_companies: 索引已存在或表不存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. departments（部门）
SET @table_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'departments');
SET @column_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                      WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'departments' AND COLUMN_NAME = 'company_id');

SET @sql := IF(@table_exist > 0 AND @column_exist = 0,
  'ALTER TABLE `departments` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID'' AFTER `id`',
  'SELECT ''departments: 表不存在或字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'departments' 
                     AND INDEX_NAME = 'idx_departments_company_id');
SET @sql := IF(@table_exist > 0 AND @index_exist = 0,
  'ALTER TABLE `departments` ADD INDEX `idx_departments_company_id` (`company_id`)',
  'SELECT ''departments: 索引已存在或表不存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. employees（员工）
SET @table_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'employees');
SET @column_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                      WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'company_id');

SET @sql := IF(@table_exist > 0 AND @column_exist = 0,
  'ALTER TABLE `employees` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID'' AFTER `id`',
  'SELECT ''employees: 表不存在或字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'employees' 
                     AND INDEX_NAME = 'idx_employees_company_id');
SET @sql := IF(@table_exist > 0 AND @index_exist = 0,
  'ALTER TABLE `employees` ADD INDEX `idx_employees_company_id` (`company_id`)',
  'SELECT ''employees: 索引已存在或表不存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6. positions（职位）
SET @table_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'positions');
SET @column_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                      WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'positions' AND COLUMN_NAME = 'company_id');

SET @sql := IF(@table_exist > 0 AND @column_exist = 0,
  'ALTER TABLE `positions` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID'' AFTER `id`',
  'SELECT ''positions: 表不存在或字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'positions' 
                     AND INDEX_NAME = 'idx_positions_company_id');
SET @sql := IF(@table_exist > 0 AND @index_exist = 0,
  'ALTER TABLE `positions` ADD INDEX `idx_positions_company_id` (`company_id`)',
  'SELECT ''positions: 索引已存在或表不存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 7. roles（角色）
SET @table_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'roles');
SET @column_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                      WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'company_id');

SET @sql := IF(@table_exist > 0 AND @column_exist = 0,
  'ALTER TABLE `roles` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID'' AFTER `id`',
  'SELECT ''roles: 表不存在或字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'roles' 
                     AND INDEX_NAME = 'idx_roles_company_id');
SET @sql := IF(@table_exist > 0 AND @index_exist = 0,
  'ALTER TABLE `roles` ADD INDEX `idx_roles_company_id` (`company_id`)',
  'SELECT ''roles: 索引已存在或表不存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 8. workflows（工作流）
SET @table_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'workflows');
SET @column_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                      WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'workflows' AND COLUMN_NAME = 'company_id');

SET @sql := IF(@table_exist > 0 AND @column_exist = 0,
  'ALTER TABLE `workflows` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID'' AFTER `id`',
  'SELECT ''workflows: 表不存在或字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'workflows' 
                     AND INDEX_NAME = 'idx_workflows_company_id');
SET @sql := IF(@table_exist > 0 AND @index_exist = 0,
  'ALTER TABLE `workflows` ADD INDEX `idx_workflows_company_id` (`company_id`)',
  'SELECT ''workflows: 索引已存在或表不存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 9. approval_configs（审批配置）
SET @table_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'approval_configs');
SET @column_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                      WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'approval_configs' AND COLUMN_NAME = 'company_id');

SET @sql := IF(@table_exist > 0 AND @column_exist = 0,
  'ALTER TABLE `approval_configs` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID'' AFTER `id`',
  'SELECT ''approval_configs: 表不存在或字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'approval_configs' 
                     AND INDEX_NAME = 'idx_approval_configs_company_id');
SET @sql := IF(@table_exist > 0 AND @index_exist = 0,
  'ALTER TABLE `approval_configs` ADD INDEX `idx_approval_configs_company_id` (`company_id`)',
  'SELECT ''approval_configs: 索引已存在或表不存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 10. approvals（审批记录）
SET @table_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'approvals');
SET @column_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                      WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'approvals' AND COLUMN_NAME = 'company_id');

SET @sql := IF(@table_exist > 0 AND @column_exist = 0,
  'ALTER TABLE `approvals` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID'' AFTER `id`',
  'SELECT ''approvals: 表不存在或字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'approvals' 
                     AND INDEX_NAME = 'idx_approvals_company_id');
SET @sql := IF(@table_exist > 0 AND @index_exist = 0,
  'ALTER TABLE `approvals` ADD INDEX `idx_approvals_company_id` (`company_id`)',
  'SELECT ''approvals: 索引已存在或表不存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 11. templates（模板）
SET @table_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'templates');
SET @column_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                      WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'templates' AND COLUMN_NAME = 'company_id');

SET @sql := IF(@table_exist > 0 AND @column_exist = 0,
  'ALTER TABLE `templates` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID'' AFTER `id`',
  'SELECT ''templates: 表不存在或字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'templates' 
                     AND INDEX_NAME = 'idx_templates_company_id');
SET @sql := IF(@table_exist > 0 AND @index_exist = 0,
  'ALTER TABLE `templates` ADD INDEX `idx_templates_company_id` (`company_id`)',
  'SELECT ''templates: 索引已存在或表不存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 12. reminder_settings（提醒设置）
SET @table_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'reminder_settings');
SET @column_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                      WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'reminder_settings' AND COLUMN_NAME = 'company_id');

SET @sql := IF(@table_exist > 0 AND @column_exist = 0,
  'ALTER TABLE `reminder_settings` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID'' AFTER `id`',
  'SELECT ''reminder_settings: 表不存在或字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'reminder_settings' 
                     AND INDEX_NAME = 'idx_reminder_settings_company_id');
SET @sql := IF(@table_exist > 0 AND @index_exist = 0,
  'ALTER TABLE `reminder_settings` ADD INDEX `idx_reminder_settings_company_id` (`company_id`)',
  'SELECT ''reminder_settings: 索引已存在或表不存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 13. reminders（提醒记录）
SET @table_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'reminders');
SET @column_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                      WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'reminders' AND COLUMN_NAME = 'company_id');

SET @sql := IF(@table_exist > 0 AND @column_exist = 0,
  'ALTER TABLE `reminders` ADD COLUMN `company_id` INT DEFAULT NULL COMMENT ''所属公司ID'' AFTER `id`',
  'SELECT ''reminders: 表不存在或字段已存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'reminders' 
                     AND INDEX_NAME = 'idx_reminders_company_id');
SET @sql := IF(@table_exist > 0 AND @index_exist = 0,
  'ALTER TABLE `reminders` ADD INDEX `idx_reminders_company_id` (`company_id`)',
  'SELECT ''reminders: 索引已存在或表不存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 14. seals（印章）- 只添加索引
SET @table_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'seals');
SET @index_exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
                     WHERE TABLE_SCHEMA = 'gaokongche' AND TABLE_NAME = 'seals' 
                     AND INDEX_NAME = 'idx_seals_company_id');
SET @sql := IF(@table_exist > 0 AND @index_exist = 0,
  'ALTER TABLE `seals` ADD INDEX `idx_seals_company_id` (`company_id`)',
  'SELECT ''seals: 索引已存在或表不存在，跳过'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 完成并显示结果
-- ============================================
SELECT '✅ 多租户字段补充完成！' AS status;

SELECT 
    TABLE_NAME AS '表名',
    COLUMN_NAME AS '字段名',
    COLUMN_TYPE AS '类型',
    IS_NULLABLE AS '允许NULL',
    COLUMN_COMMENT AS '注释'
FROM 
    INFORMATION_SCHEMA.COLUMNS
WHERE 
    TABLE_SCHEMA = 'gaokongche'
    AND COLUMN_NAME = 'company_id'
ORDER BY 
    TABLE_NAME;
