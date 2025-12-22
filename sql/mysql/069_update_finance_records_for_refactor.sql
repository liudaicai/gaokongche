-- 更新财务记录表以支持新的收款付款管理
-- 添加合同编号字段，调整记录类型
-- 日期：2025-12-12
-- 兼容 MySQL 5.7+

USE gaokongche;

START TRANSACTION;

-- 添加合同编号字段（如果不存在）
-- 使用存储过程检查列是否存在
SET @dbname = DATABASE();
SET @tablename = 'finance_records';
SET @columnname = 'contract_number';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE 
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE finance_records ADD COLUMN contract_number VARCHAR(100) NULL COMMENT '合同编号' AFTER order_number"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 添加is_from_order字段（如果不存在）
SET @columnname = 'is_from_order';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE 
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE finance_records ADD COLUMN is_from_order TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否来自订单：0否，1是' AFTER source_id"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 添加索引（如果不存在）
SET @indexname = 'idx_contract_number';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE 
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (INDEX_NAME = @indexname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE finance_records ADD INDEX idx_contract_number (contract_number)"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 更新现有记录的is_from_order标记
UPDATE finance_records 
SET is_from_order = 1 
WHERE source_type = 'order' AND order_id IS NOT NULL;

COMMIT;

-- 验证结果
SELECT 
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'finance_records'
  AND COLUMN_NAME IN ('contract_number', 'is_from_order')
ORDER BY ORDINAL_POSITION;
