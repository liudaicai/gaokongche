-- 迁移操作证数据：从 stores 表关联改为 company_verifications 表关联
-- 如果之前使用了 stores 表作为认证公司，此脚本可以帮助迁移数据

-- 步骤1：检查是否存在旧的外键约束
-- 如果存在旧的外键约束，先删除
SET @constraint_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'operator_certificates'
      AND CONSTRAINT_NAME = 'fk_operator_certificates_company'
      AND REFERENCED_TABLE_NAME = 'stores'
);

-- 如果外键关联的是 stores 表，先删除
SET @drop_fk_sql = IF(
    @constraint_exists > 0,
    'ALTER TABLE operator_certificates DROP FOREIGN KEY fk_operator_certificates_company',
    'SELECT "No old foreign key to drop" as message'
);
PREPARE stmt FROM @drop_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 步骤2：如果 operator_certificates 表中有关联到 stores 的数据，提示需要手动处理
-- 这里我们只做提示，不自动迁移数据，因为 stores 和 company_verifications 的数据结构不同

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 
            CONCAT('警告：发现 ', COUNT(*), ' 条操作证记录关联到非 company_verifications 表的数据。')
        ELSE 
            '成功：没有发现需要迁移的数据。'
    END as migration_status
FROM operator_certificates oc
WHERE oc.company_id IS NOT NULL
  AND oc.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM company_verifications cv WHERE cv.id = oc.company_id
  );

-- 步骤3：添加新的外键约束（关联到 company_verifications 表）
-- 检查新外键是否已存在
SET @new_fk_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'operator_certificates'
      AND CONSTRAINT_NAME = 'fk_operator_certificates_company'
      AND REFERENCED_TABLE_NAME = 'company_verifications'
);

-- 如果新外键不存在，则添加
SET @add_fk_sql = IF(
    @new_fk_exists = 0,
    'ALTER TABLE operator_certificates 
     ADD CONSTRAINT fk_operator_certificates_company 
     FOREIGN KEY (company_id) REFERENCES company_verifications(id) 
     ON DELETE SET NULL ON UPDATE CASCADE',
    'SELECT "Foreign key already exists" as message'
);
PREPARE stmt FROM @add_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 步骤4：显示迁移结果
SELECT 
    'operator_certificates' as table_name,
    COUNT(*) as total_records,
    SUM(CASE WHEN company_id IS NOT NULL THEN 1 ELSE 0 END) as with_company,
    SUM(CASE WHEN company_id IS NULL THEN 1 ELSE 0 END) as without_company
FROM operator_certificates
WHERE deleted_at IS NULL;

-- 步骤5：显示认证公司列表（供参考）
SELECT 
    id,
    company_name,
    company_address,
    credit_code,
    '可用于操作证认证' as status
FROM company_verifications
ORDER BY company_name;

-- 使用说明：
-- 1. 如果之前的 company_id 关联的是 stores 表，需要手动更新这些记录
-- 2. 建议在更新前备份数据：mysqldump -u user -p database operator_certificates > backup.sql
-- 3. 手动更新示例：
--    UPDATE operator_certificates 
--    SET company_id = NULL, company_name = NULL 
--    WHERE company_id NOT IN (SELECT id FROM company_verifications);
-- 4. 然后重新在操作证管理界面选择正确的认证公司
