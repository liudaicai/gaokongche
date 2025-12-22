-- ============================================
-- 为员工表添加 store_id 字段
-- 作者: AI 开发助手
-- 日期: 2025-11-22
-- 说明: 添加员工所属门店字段
-- ============================================

START TRANSACTION;

-- 检查 store_id 字段是否存在
SET @dbname = DATABASE();
SET @tablename = 'employees';
SET @columnname = 'store_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 'Column store_id already exists' AS message",
  "ALTER TABLE employees ADD COLUMN store_id INT NULL COMMENT '所属门店ID' AFTER level"
));

PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 添加索引（如果字段是新添加的）
SET @indexname = 'idx_employees_store_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND INDEX_NAME = @indexname
  ) > 0,
  "SELECT 'Index idx_employees_store_id already exists' AS message",
  "CREATE INDEX idx_employees_store_id ON employees(store_id)"
));

PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

COMMIT;

-- 验证
SELECT '✅ store_id 字段添加成功！' AS message;
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'employees'
  AND COLUMN_NAME = 'store_id';

