-- 074: 配件交易表添加维修单据关联字段

-- 检查并添加 repair_id 字段
SET @db_name = DATABASE();
SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'part_transactions'
    AND COLUMN_NAME = 'repair_id'
);

SET @sql_stmt = IF(
  @col_exists = 0,
  "ALTER TABLE part_transactions 
   ADD COLUMN repair_id INT NULL 
   COMMENT '关联维修单ID（核销时填写）' 
   AFTER equipment_id",
  'SELECT ''part_transactions.repair_id already exists'' AS status'
);

PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 repair_number 字段
SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'part_transactions'
    AND COLUMN_NAME = 'repair_number'
);

SET @sql_stmt = IF(
  @col_exists = 0,
  "ALTER TABLE part_transactions 
   ADD COLUMN repair_number VARCHAR(50) NULL 
   COMMENT '维修单号' 
   AFTER repair_id",
  'SELECT ''part_transactions.repair_number already exists'' AS status'
);

PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加索引
SET @index_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'part_transactions'
    AND INDEX_NAME = 'idx_repair_id'
);

SET @sql_stmt = IF(
  @index_exists = 0,
  'ALTER TABLE part_transactions ADD INDEX idx_repair_id (repair_id)',
  'SELECT ''Index idx_repair_id already exists'' AS status'
);

PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Part transactions repair association migration completed' AS status;
