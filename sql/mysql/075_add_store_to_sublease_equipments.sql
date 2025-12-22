-- 为转租设备表添加门店相关字段
-- 用于记录转租设备所在的门店，方便设备管理

USE gaokongche;

-- 检查并添加门店ID字段
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'gaokongche' 
  AND TABLE_NAME = 'sublease_equipments' 
  AND COLUMN_NAME = 'store_id';

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE sublease_equipments ADD COLUMN store_id INT NULL COMMENT ''所在门店ID'' AFTER company_name',
  'SELECT ''store_id already exists'' AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加门店名称字段
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'gaokongche' 
  AND TABLE_NAME = 'sublease_equipments' 
  AND COLUMN_NAME = 'store_name';

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE sublease_equipments ADD COLUMN store_name VARCHAR(255) NULL COMMENT ''所在门店名称'' AFTER store_id',
  'SELECT ''store_name already exists'' AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加索引
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists 
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = 'gaokongche' 
  AND TABLE_NAME = 'sublease_equipments' 
  AND INDEX_NAME = 'idx_store_id';

SET @sql = IF(@index_exists = 0,
  'ALTER TABLE sublease_equipments ADD INDEX idx_store_id (store_id)',
  'SELECT ''idx_store_id already exists'' AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ Migration 011_add_store_to_sublease_equipments completed successfully' AS status;

