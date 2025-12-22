-- 为equipments表添加采购价格字段
-- 用于直接存储设备的采购价格，支持资产利用率计算

USE gaokongche;

-- 1. 添加采购价格字段
ALTER TABLE equipments 
ADD COLUMN purchase_price DECIMAL(15,2) DEFAULT 0.00 COMMENT '采购价格（元）' 
AFTER purchase_date;

-- 2. 添加索引以提高查询性能
CREATE INDEX idx_purchase_price ON equipments(purchase_price);

-- 3. 从purchase_items表回填历史数据（使用COLLATE解决字符集冲突）
UPDATE equipments e
LEFT JOIN (
    SELECT 
        pi.equipment_category,
        pi.equipment_model,
        pi.equipment_height,
        pi.unit_price,
        pi.created_at
    FROM purchase_items pi
    WHERE pi.unit_price > 0
) pi ON (
    pi.equipment_category COLLATE utf8mb4_unicode_ci = e.category
    AND (pi.equipment_model COLLATE utf8mb4_unicode_ci = e.model OR pi.equipment_model IS NULL)
    AND (pi.equipment_height = e.height OR pi.equipment_height IS NULL)
)
SET e.purchase_price = COALESCE(pi.unit_price, 0)
WHERE e.source = 'self-owned' 
  AND e.purchase_price = 0
  AND pi.unit_price IS NOT NULL;

-- 4. 添加注释
ALTER TABLE equipments 
MODIFY COLUMN purchase_price DECIMAL(15,2) DEFAULT 0.00 COMMENT '设备采购价格（元），用于资产利用率计算';

-- 5. 验证
SELECT 
    COUNT(*) as total_equipment,
    COUNT(CASE WHEN purchase_price > 0 THEN 1 END) as has_price,
    COUNT(CASE WHEN purchase_price = 0 THEN 1 END) as no_price,
    SUM(purchase_price) as total_value
FROM equipments
WHERE deleted_at IS NULL AND source = 'self-owned';

-- 输出提示
SELECT '✅ 采购价格字段添加成功！' as message;
SELECT CONCAT('📊 自有设备总数: ', COUNT(*)) as stats 
FROM equipments 
WHERE deleted_at IS NULL AND source = 'self-owned';

SELECT CONCAT('💰 有价格设备: ', COUNT(*), ' 台，总价值: ¥', FORMAT(SUM(purchase_price), 2)) as stats
FROM equipments 
WHERE deleted_at IS NULL 
  AND source = 'self-owned' 
  AND purchase_price > 0;

SELECT CONCAT('⚠️ 无价格设备: ', COUNT(*), ' 台') as stats
FROM equipments 
WHERE deleted_at IS NULL 
  AND source = 'self-owned' 
  AND (purchase_price = 0 OR purchase_price IS NULL);
