-- ============================================
-- 多租户数据迁移脚本（自动检测）
-- ============================================
-- 执行时间：2024-12-23
-- 说明：自动检测第一个公司ID并为现有数据分配
-- ============================================

USE gaokongche;

-- ============================================
-- 第一步：查看当前公司列表
-- ============================================
SELECT '当前系统中的公司:' AS '说明';
SELECT id, company_name, created_at FROM company_verifications ORDER BY id;

-- ============================================
-- 第二步：获取第一个公司ID（假设为默认公司）
-- ============================================
SET @default_company_id := (SELECT id FROM company_verifications ORDER BY id LIMIT 1);

SELECT CONCAT('将使用公司ID: ', @default_company_id, ' 作为默认公司') AS '迁移策略';

-- ============================================
-- 第三步：为现有数据分配 company_id
-- ============================================

-- 1. 订单数据
UPDATE orders 
SET company_id = @default_company_id 
WHERE company_id IS NULL;

-- 2. 设备数据
UPDATE equipments 
SET company_id = @default_company_id 
WHERE company_id IS NULL;

-- 3. 客户数据
UPDATE customers 
SET company_id = @default_company_id 
WHERE company_id IS NULL;

-- 4. 用户数据（排除超级管理员）
UPDATE users 
SET company_id = @default_company_id 
WHERE company_id IS NULL 
  AND role NOT IN ('super_admin', 'superadmin');

-- 5. 设备采购
UPDATE equipment_purchases 
SET company_id = @default_company_id 
WHERE company_id IS NULL;

-- 6. 付款记录
UPDATE payments 
SET company_id = @default_company_id 
WHERE company_id IS NULL;

-- 7. 收款记录
UPDATE receipts 
SET company_id = @default_company_id 
WHERE company_id IS NULL;

-- 8. 配件库存
UPDATE part_stocks 
SET company_id = @default_company_id 
WHERE company_id IS NULL;

-- 9. 配件交易
UPDATE part_transactions 
SET company_id = @default_company_id 
WHERE company_id IS NULL;

-- 10. 保单数据
UPDATE policies 
SET company_id = @default_company_id 
WHERE company_id IS NULL;

-- 11. 转租公司
UPDATE sublease_companies 
SET company_id = @default_company_id 
WHERE company_id IS NULL;

-- 12. 转租设备
UPDATE sublease_equipment_items 
SET company_id = @default_company_id 
WHERE company_id IS NULL;

-- 13. 物流记录
UPDATE logistics_records 
SET company_id = @default_company_id 
WHERE company_id IS NULL;

-- 14. 印章数据
UPDATE seals 
SET company_id = @default_company_id 
WHERE company_id IS NULL;

-- 15. 操作证数据
UPDATE operator_certificates 
SET company_id = @default_company_id 
WHERE company_id IS NULL;

-- 16. 门店数据
UPDATE stores 
SET company_id = @default_company_id 
WHERE company_id IS NULL;

-- ============================================
-- 系统级数据保留 NULL（所有租户共享）
-- ============================================
-- 设备型号保留为系统级
UPDATE equipment_models SET company_id = NULL;

-- ============================================
-- 验证：检查迁移结果
-- ============================================
SELECT '✅ 数据迁移完成！以下是各表的统计：' AS '结果';

SELECT 
    'orders' AS '表名',
    COUNT(*) AS '总记录数',
    COUNT(company_id) AS '已分配company_id',
    COUNT(*) - COUNT(company_id) AS 'NULL数量'
FROM orders

UNION ALL SELECT 'equipments', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM equipments
UNION ALL SELECT 'customers', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM customers
UNION ALL SELECT 'users', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM users
UNION ALL SELECT 'equipment_purchases', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM equipment_purchases
UNION ALL SELECT 'payments', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM payments
UNION ALL SELECT 'seals', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM seals
UNION ALL SELECT 'operator_certificates', COUNT(*), COUNT(company_id), COUNT(*) - COUNT(company_id) FROM operator_certificates;

SELECT '✅ 迁移完成！现在可以开始改造后端路由了。' AS '下一步';
