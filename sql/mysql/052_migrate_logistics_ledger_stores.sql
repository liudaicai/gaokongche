-- 迁移物流台账的门店数据
-- 作者：系统
-- 日期：2025-11-28
-- 说明：从 stores 表查询真实门店名称，更新现有台账记录

START TRANSACTION;

-- 更新进场记录：设置源门店（出库门店）
UPDATE logistics_ledger ll
LEFT JOIN orders o ON ll.order_id = o.id
LEFT JOIN stores s ON s.id = o.lessor_company_id
SET 
  ll.source_store_id = o.lessor_company_id,
  ll.source_store_name = COALESCE(s.name, ll.store_name),
  ll.store_name = COALESCE(s.name, ll.store_name)
WHERE ll.record_type = 'entry' 
  AND ll.source_store_id IS NULL;

-- 更新退场记录：设置目标门店（入库门店）
UPDATE logistics_ledger ll
LEFT JOIN orders o ON ll.order_id = o.id
LEFT JOIN stores s ON s.id = o.lessor_company_id
SET 
  ll.target_store_id = o.lessor_company_id,
  ll.target_store_name = COALESCE(s.name, ll.store_name),
  ll.store_name = COALESCE(s.name, ll.store_name)
WHERE ll.record_type = 'exit' 
  AND ll.target_store_id IS NULL;

-- 更新调拨记录：设置源和目标门店
UPDATE logistics_ledger ll
LEFT JOIN orders o ON ll.order_id = o.id
LEFT JOIN stores s ON s.id = o.lessor_company_id
SET 
  ll.source_store_id = o.lessor_company_id,
  ll.source_store_name = COALESCE(s.name, ll.store_name),
  ll.target_store_id = o.lessor_company_id,
  ll.target_store_name = COALESCE(s.name, ll.store_name),
  ll.store_name = COALESCE(s.name, ll.store_name)
WHERE ll.record_type = 'warehouse_transfer' 
  AND ll.source_store_id IS NULL;

COMMIT;

-- 验证更新结果
SELECT '✅ 物流台账门店数据迁移完成' AS message;
SELECT 
  record_type,
  COUNT(*) as total,
  COUNT(source_store_name) as has_source,
  COUNT(target_store_name) as has_target,
  COUNT(DISTINCT store_name) as distinct_stores
FROM logistics_ledger
GROUP BY record_type;

-- 显示门店名称分布
SELECT 
  COALESCE(source_store_name, target_store_name, store_name) as store,
  COUNT(*) as count
FROM logistics_ledger
GROUP BY store
ORDER BY count DESC;

