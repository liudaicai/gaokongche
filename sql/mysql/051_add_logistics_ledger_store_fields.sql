-- 为 logistics_ledger 表添加源门店和目标门店字段
-- 作者：系统
-- 日期：2025-11-28
-- 说明：支持进场、退场、调拨的不同门店显示需求

START TRANSACTION;

-- 添加源门店（出库门店）字段
ALTER TABLE logistics_ledger 
ADD COLUMN IF NOT EXISTS source_store_id INT NULL COMMENT '源门店ID（出库门店）',
ADD COLUMN IF NOT EXISTS source_store_name VARCHAR(255) NULL COMMENT '源门店名称（出库门店）';

-- 添加目标门店（入库门店）字段
ALTER TABLE logistics_ledger 
ADD COLUMN IF NOT EXISTS target_store_id INT NULL COMMENT '目标门店ID（入库门店）',
ADD COLUMN IF NOT EXISTS target_store_name VARCHAR(255) NULL COMMENT '目标门店名称（入库门店）';

-- 迁移现有数据：根据记录类型设置源/目标门店
-- 进场：store_id/store_name 作为源门店（出库门店）
UPDATE logistics_ledger 
SET source_store_id = store_id, 
    source_store_name = store_name
WHERE record_type = 'entry' AND store_id IS NOT NULL;

-- 退场：store_id/store_name 作为目标门店（入库门店）
UPDATE logistics_ledger 
SET target_store_id = store_id, 
    target_store_name = store_name
WHERE record_type = 'exit' AND store_id IS NOT NULL;

-- 调拨：需要同时设置源和目标门店（暂时都设为当前门店，后续手动维护）
UPDATE logistics_ledger 
SET source_store_id = store_id, 
    source_store_name = store_name,
    target_store_id = store_id,
    target_store_name = CONCAT(store_name, '-目标')
WHERE record_type = 'warehouse_transfer' AND store_id IS NOT NULL;

-- 添加索引
ALTER TABLE logistics_ledger 
ADD INDEX IF NOT EXISTS idx_source_store_id (source_store_id),
ADD INDEX IF NOT EXISTS idx_target_store_id (target_store_id);

COMMIT;

-- 验证更新
SELECT '✅ logistics_ledger 表源/目标门店字段添加成功' AS message;
SELECT record_type, 
       COUNT(*) as count,
       COUNT(source_store_id) as has_source,
       COUNT(target_store_id) as has_target
FROM logistics_ledger
GROUP BY record_type;

