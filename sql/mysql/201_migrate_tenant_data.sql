-- ============================================
-- 多租户数据迁移脚本
-- ============================================
-- 执行时间：2024-12-23
-- 说明：为现有数据分配默认的 company_id
-- 警告：执行前请先备份数据库！
-- ============================================

USE gaokongche;

-- ============================================
-- 重要：执行前先查看当前公司列表
-- ============================================
SELECT 
    id,
    company_name,
    credit_code,
    created_at
FROM 
    company_verifications
ORDER BY 
    id;

-- ============================================
-- 策略说明：
-- 1. 如果只有一个公司，所有数据分配给该公司
-- 2. 如果有多个公司，需要手动确认分配策略
-- 3. 系统级数据（如设备型号、模板）保留 NULL
-- ============================================

-- ============================================
-- 方式一：假设只有一个公司（ID=1）
-- ============================================
-- 如果你的系统当前只有一个公司在运营，使用以下语句：

-- 1. 订单数据
UPDATE orders 
SET company_id = 1 
WHERE company_id IS NULL;

-- 2. 设备数据
UPDATE equipments 
SET company_id = 1 
WHERE company_id IS NULL;

-- 3. 客户数据
UPDATE customers 
SET company_id = 1 
WHERE company_id IS NULL;

-- 4. 用户数据（排除超级管理员）
UPDATE users 
SET company_id = 1 
WHERE company_id IS NULL 
  AND role NOT IN ('super_admin', 'superadmin');

-- 5. 财务数据
UPDATE equipment_purchases 
SET company_id = 1 
WHERE company_id IS NULL;

UPDATE payments 
SET company_id = 1 
WHERE company_id IS NULL;

UPDATE receipts 
SET company_id = 1 
WHERE company_id IS NULL;

-- 6. 配件数据
UPDATE part_stocks 
SET company_id = 1 
WHERE company_id IS NULL;

UPDATE part_transactions 
SET company_id = 1 
WHERE company_id IS NULL;

-- 7. 保单数据
UPDATE policies 
SET company_id = 1 
WHERE company_id IS NULL;

-- 8. 转租数据
UPDATE sublease_companies 
SET company_id = 1 
WHERE company_id IS NULL;

UPDATE sublease_equipment_items 
SET company_id = 1 
WHERE company_id IS NULL;

-- 9. 物流数据
UPDATE logistics_records 
SET company_id = 1 
WHERE company_id IS NULL;

UPDATE drivers 
SET company_id = 1 
WHERE company_id IS NULL;

UPDATE logistics_companies 
SET company_id = 1 
WHERE company_id IS NULL;

-- 10. 人事数据
UPDATE employees 
SET company_id = 1 
WHERE company_id IS NULL;

UPDATE departments 
SET company_id = 1 
WHERE company_id IS NULL;

UPDATE positions 
SET company_id = 1 
WHERE company_id IS NULL;

-- 11. 工作流数据
UPDATE workflows 
SET company_id = 1 
WHERE company_id IS NULL;

UPDATE approval_configs 
SET company_id = 1 
WHERE company_id IS NULL;

UPDATE approvals 
SET company_id = 1 
WHERE company_id IS NULL;

-- 12. 提醒数据
UPDATE reminders 
SET company_id = 1 
WHERE company_id IS NULL;

UPDATE reminder_settings 
SET company_id = 1 
WHERE company_id IS NULL;

-- 13. 印章数据
UPDATE seals 
SET company_id = 1 
WHERE company_id IS NULL;

-- ============================================
-- 系统级数据保留 NULL
-- ============================================
-- 以下数据保留为系统级（company_id = NULL）：

-- 设备型号（系统级，所有公司共享）
UPDATE equipment_models 
SET company_id = NULL;

-- 系统级模板（可以被所有公司使用）
-- 如果你希望某些模板是系统级的，执行：
-- UPDATE templates 
-- SET company_id = NULL 
-- WHERE is_system_template = 1;

-- 系统级角色
-- UPDATE roles 
-- SET company_id = NULL 
-- WHERE is_system_role = 1;

-- ============================================
-- 验证：检查迁移结果
-- ============================================
-- 查看各表的 company_id 分布
SELECT 
    'orders' AS table_name,
    COUNT(*) AS total_count,
    COUNT(company_id) AS has_company_id,
    COUNT(*) - COUNT(company_id) AS null_company_id
FROM orders

UNION ALL

SELECT 
    'equipments' AS table_name,
    COUNT(*) AS total_count,
    COUNT(company_id) AS has_company_id,
    COUNT(*) - COUNT(company_id) AS null_company_id
FROM equipments

UNION ALL

SELECT 
    'customers' AS table_name,
    COUNT(*) AS total_count,
    COUNT(company_id) AS has_company_id,
    COUNT(*) - COUNT(company_id) AS null_company_id
FROM customers

UNION ALL

SELECT 
    'users' AS table_name,
    COUNT(*) AS total_count,
    COUNT(company_id) AS has_company_id,
    COUNT(*) - COUNT(company_id) AS null_company_id
FROM users;

-- ============================================
-- 方式二：多公司场景
-- ============================================
-- 如果你的系统已经有多个公司在运营，需要根据业务逻辑分配
-- 例如：根据订单的 lessor_company_id 分配：
/*
UPDATE orders o
JOIN company_verifications cv ON o.lessor_company_id = cv.id
SET o.company_id = cv.id
WHERE o.company_id IS NULL;

-- 设备根据其所属门店的公司分配：
UPDATE equipments e
JOIN stores s ON e.store_id = s.id
SET e.company_id = s.company_id
WHERE e.company_id IS NULL;

-- 客户根据创建人的公司分配：
UPDATE customers c
JOIN users u ON c.created_by = u.id
SET c.company_id = u.company_id
WHERE c.company_id IS NULL;
*/

-- ============================================
-- 完成
-- ============================================
SELECT 
    '数据迁移完成！' AS message,
    '请执行上面的验证查询检查结果' AS next_step;
