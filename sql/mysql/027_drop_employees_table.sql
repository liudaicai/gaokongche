-- 027_drop_employees_table.sql
-- 删除 employees 表及其所有关联
-- 作者：系统维护
-- 日期：2025-11-16
-- 警告：此操作不可逆！请确保已备份数据！

-- 1. 删除 orders 表的外键约束
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'orders' 
    AND CONSTRAINT_NAME = 'fk_orders_business_manager_id'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @sql = IF(@fk_exists > 0,
  'ALTER TABLE orders DROP FOREIGN KEY fk_orders_business_manager_id',
  'SELECT ''Foreign key fk_orders_business_manager_id does not exist'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 删除 stores 表的外键约束
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'stores' 
    AND CONSTRAINT_NAME = 'fk_stores_manager_id'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @sql = IF(@fk_exists > 0,
  'ALTER TABLE stores DROP FOREIGN KEY fk_stores_manager_id',
  'SELECT ''Foreign key fk_stores_manager_id does not exist'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. 删除 orders 表的 business_manager_id 索引
SET @idx_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'orders' 
    AND INDEX_NAME = 'fk_orders_business_manager_id'
);

SET @sql = IF(@idx_exists > 0,
  'ALTER TABLE orders DROP INDEX fk_orders_business_manager_id',
  'SELECT ''Index fk_orders_business_manager_id does not exist'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. 删除 employees 表
SET @table_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.TABLES 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'employees'
);

SET @sql = IF(@table_exists > 0,
  'DROP TABLE employees',
  'SELECT ''Table employees does not exist'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. 验证删除结果
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ employees 表已成功删除'
    ELSE '❌ employees 表仍然存在'
  END AS '删除状态'
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'employees';

SELECT '✅ 员工管理模块数据库清理完成' AS '状态';

