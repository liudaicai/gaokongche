-- 073: 配件核销功能支持

-- 检查并添加 status 字段
SET @db_name = DATABASE();
SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'part_transactions'
    AND COLUMN_NAME = 'status'
);

SET @sql_stmt = IF(
  @col_exists = 0,
  "ALTER TABLE part_transactions 
   ADD COLUMN status ENUM('pending', 'completed', 'cancelled') 
   DEFAULT 'completed' 
   COMMENT '状态：pending待核销/completed已完成/cancelled已取消' 
   AFTER quantity",
  'SELECT ''part_transactions.status already exists'' AS status'
);

PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 equipment_id 字段
SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'part_transactions'
    AND COLUMN_NAME = 'equipment_id'
);

SET @sql_stmt = IF(
  @col_exists = 0,
  "ALTER TABLE part_transactions 
   ADD COLUMN equipment_id INT NULL 
   COMMENT '关联设备ID（核销时填写）' 
   AFTER status",
  'SELECT ''part_transactions.equipment_id already exists'' AS status'
);

PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 equipment_code 字段
SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'part_transactions'
    AND COLUMN_NAME = 'equipment_code'
);

SET @sql_stmt = IF(
  @col_exists = 0,
  "ALTER TABLE part_transactions 
   ADD COLUMN equipment_code VARCHAR(50) NULL 
   COMMENT '关联设备编号' 
   AFTER equipment_id",
  'SELECT ''part_transactions.equipment_code already exists'' AS status'
);

PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 write_off_time 字段
SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'part_transactions'
    AND COLUMN_NAME = 'write_off_time'
);

SET @sql_stmt = IF(
  @col_exists = 0,
  "ALTER TABLE part_transactions 
   ADD COLUMN write_off_time DATETIME NULL 
   COMMENT '核销时间' 
   AFTER equipment_code",
  'SELECT ''part_transactions.write_off_time already exists'' AS status'
);

PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 write_off_by 字段
SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'part_transactions'
    AND COLUMN_NAME = 'write_off_by'
);

SET @sql_stmt = IF(
  @col_exists = 0,
  "ALTER TABLE part_transactions 
   ADD COLUMN write_off_by INT NULL 
   COMMENT '核销人ID' 
   AFTER write_off_time",
  'SELECT ''part_transactions.write_off_by already exists'' AS status'
);

PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 write_off_remark 字段
SET @col_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'part_transactions'
    AND COLUMN_NAME = 'write_off_remark'
);

SET @sql_stmt = IF(
  @col_exists = 0,
  "ALTER TABLE part_transactions 
   ADD COLUMN write_off_remark TEXT NULL 
   COMMENT '核销备注' 
   AFTER write_off_by",
  'SELECT ''part_transactions.write_off_remark already exists'' AS status'
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
    AND INDEX_NAME = 'idx_equipment_id'
);

SET @sql_stmt = IF(
  @index_exists = 0,
  'ALTER TABLE part_transactions ADD INDEX idx_equipment_id (equipment_id)',
  'SELECT ''Index idx_equipment_id already exists'' AS status'
);

PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'part_transactions'
    AND INDEX_NAME = 'idx_status'
);

SET @sql_stmt = IF(
  @index_exists = 0,
  'ALTER TABLE part_transactions ADD INDEX idx_status (status)',
  'SELECT ''Index idx_status already exists'' AS status'
);

PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Part write-off support migration completed' AS status;
