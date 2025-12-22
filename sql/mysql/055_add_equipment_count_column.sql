-- ============================================
-- 添加进退场设备数量字段
-- 作者: AI 开发助手
-- 日期: 2025-12-06
-- 说明: 添加 equipment_count 列用于存储每条进退场记录中的设备数量
-- ============================================

SET @dbname = DATABASE();

-- 为 order_entries 添加 equipment_count 列
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_entries' AND COLUMN_NAME = 'equipment_count');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_entries ADD COLUMN equipment_count INT NOT NULL DEFAULT 1 COMMENT ''进场设备数量''',
  'SELECT ''Column equipment_count already exists in order_entries'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 为 order_exits 添加 equipment_count 列
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_exits' AND COLUMN_NAME = 'equipment_count');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_exits ADD COLUMN equipment_count INT NOT NULL DEFAULT 1 COMMENT ''退场设备数量''',
  'SELECT ''Column equipment_count already exists in order_exits'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================
-- 回填已有记录的 equipment_count 值
-- 从 attachments_json 中解析 equipmentCodes 数组长度
-- ============================================

-- 更新 order_entries 表
UPDATE order_entries 
SET equipment_count = COALESCE(
  JSON_LENGTH(JSON_EXTRACT(attachments_json, '$.equipmentCodes')),
  1
)
WHERE attachments_json IS NOT NULL 
  AND JSON_VALID(attachments_json)
  AND JSON_CONTAINS_PATH(attachments_json, 'one', '$.equipmentCodes');

-- 更新 order_exits 表  
UPDATE order_exits
SET equipment_count = COALESCE(
  JSON_LENGTH(JSON_EXTRACT(attachments_json, '$.equipmentCodes')),
  1
)
WHERE attachments_json IS NOT NULL 
  AND JSON_VALID(attachments_json)
  AND JSON_CONTAINS_PATH(attachments_json, 'one', '$.equipmentCodes');

-- 验证
SELECT '✅ equipment_count 列添加完成' AS message;
SELECT 
  'order_entries' AS table_name,
  COUNT(*) AS total_records,
  SUM(equipment_count) AS total_equipment_count
FROM order_entries
UNION ALL
SELECT 
  'order_exits' AS table_name,
  COUNT(*) AS total_records,
  SUM(equipment_count) AS total_equipment_count
FROM order_exits;
