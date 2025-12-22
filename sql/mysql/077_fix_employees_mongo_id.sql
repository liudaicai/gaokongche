-- ============================================
-- 修复员工表的 mongo_id 字段
-- 作者: AI 开发助手
-- 日期: 2025-11-22
-- 说明: 将 mongo_id 字段改为可选，并移除唯一索引
-- ============================================

START TRANSACTION;

-- 修改 mongo_id 字段为可选（允许 NULL）
ALTER TABLE employees MODIFY COLUMN mongo_id VARCHAR(24) NULL;

-- 移除 mongo_id 的唯一索引（如果存在）
SET @dbname = DATABASE();
SET @tablename = 'employees';
SET @indexname = 'mongo_id';

SET @drop_index = (SELECT IF(
  (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND INDEX_NAME = @indexname
  ) > 0,
  'DROP INDEX mongo_id ON employees',
  'SELECT ''Index mongo_id does not exist'' AS message'
));

PREPARE dropIndexIfExists FROM @drop_index;
EXECUTE dropIndexIfExists;
DEALLOCATE PREPARE dropIndexIfExists;

COMMIT;

-- 验证
SELECT '✅ mongo_id 字段修复成功！' AS message;
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'employees'
  AND COLUMN_NAME = 'mongo_id';

