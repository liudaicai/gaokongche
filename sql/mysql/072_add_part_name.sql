-- 072: parts 表增加配件名称字段（name）
-- 说明：
-- 1) 避免使用 MySQL 不支持的 `ADD COLUMN IF NOT EXISTS`
-- 2) 通过 INFORMATION_SCHEMA 判断是否已存在，做到可重复执行

SET @db_name = DATABASE();
SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'parts'
    AND COLUMN_NAME = 'name'
);

SET @sql_stmt = IF(
  @col_exists = 0,
  'ALTER TABLE parts ADD COLUMN name VARCHAR(100) COMMENT ''配件名称'' AFTER category',
  'SELECT ''parts.name already exists'' AS status'
);

PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'parts.name migration done' AS status;
