-- ============================================
-- 设备租金统计功能 - 性能优化索引
-- 作者: AI 开发助手  
-- 日期: 2025-12-16
-- 说明: 为设备租金统计查询添加必要的索引，提升10万+记录查询性能
-- ============================================

-- 注意：如果索引已存在，执行会报错，这是正常的，可以忽略
START TRANSACTION;

-- 1. 订单表优化索引
-- 用于按时间段筛选订单
CREATE INDEX `idx_orders_created_at_status` 
ON `orders` (`created_at`, `status`, `deleted_at`);

-- 2. 进场记录表优化索引  
-- 用于按进场日期筛选和关联设备
CREATE INDEX `idx_order_entries_date_equipment` 
ON `order_entries` (`entry_date`, `equipment_id`, `order_id`);

-- 3. 退场记录表优化索引
-- 用于按退场日期筛选和关联设备  
CREATE INDEX `idx_order_exits_date_equipment`
ON `order_exits` (`exit_date`, `equipment_id`, `order_id`);

-- 4. 设备表优化索引
-- 用于关联查询设备信息
CREATE INDEX `idx_equipments_code_status`
ON `equipments` (`code`, `custom_code`, `deleted_at`);

-- 5. 设备需求表优化索引
-- 用于获取价格信息
CREATE INDEX `idx_demands_order_rates`
ON `order_equipment_demands` (`order_id`, `daily_rate`, `monthly_rate`);

COMMIT;

-- 验证索引创建
SELECT '✅ 设备租金统计索引创建成功' AS message;

SELECT 
  TABLE_NAME as '表名',
  INDEX_NAME as '索引名', 
  COLUMN_NAME as '列名',
  INDEX_TYPE as '索引类型'
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('orders', 'order_entries', 'order_exits', 'equipments', 'order_equipment_demands')
  AND INDEX_NAME LIKE 'idx_%'
ORDER BY TABLE_NAME, INDEX_NAME;
