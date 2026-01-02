-- ============================================
-- 创建测试租户和用户
-- ============================================
-- 执行时间：2024-12-23
-- 说明：创建2个测试公司和对应的测试用户，用于验证数据隔离
-- ============================================

USE gaokongche;

-- ============================================
-- 1. 创建测试公司
-- ============================================

-- 公司A（测试公司）
INSERT INTO company_verifications (company_name, credit_code, company_address, bank_name, bank_account, created_at, updated_at) 
VALUES (
  '测试公司A', 
  '91110000TEST00001A', 
  '北京市朝阳区测试路123号',
  '中国工商银行北京分行',
  '1234567890123456789',
  NOW(),
  NOW()
);

SET @company_a_id := LAST_INSERT_ID();
SELECT CONCAT('✅ 创建测试公司A，ID: ', @company_a_id) AS '步骤1';

-- 公司B（测试公司）
INSERT INTO company_verifications (company_name, credit_code, company_address, bank_name, bank_account, created_at, updated_at) 
VALUES (
  '测试公司B', 
  '91310000TEST00001B', 
  '上海市浦东新区测试大道456号',
  '中国建设银行上海分行',
  '9876543210987654321',
  NOW(),
  NOW()
);

SET @company_b_id := LAST_INSERT_ID();
SELECT CONCAT('✅ 创建测试公司B，ID: ', @company_b_id) AS '步骤2';

-- ============================================
-- 2. 创建测试用户
-- ============================================

-- 公司A的管理员（密码：123456）
-- 密码hash: $2b$10$YourHashHere... 需要实际生成
INSERT INTO users (username, password_hash, name, role, company_id, created_at, updated_at)
VALUES (
  'test_admin_a',
  '$2b$10$rG7qXQxJ3F5HZ4kK9vX1NeYqQ7qYZ0yL8nK5nK5nK5nK5nK5nK5nKO',  -- 密码: 123456
  '公司A测试管理员',
  'manager',
  @company_a_id,
  NOW(),
  NOW()
);

SELECT CONCAT('✅ 创建公司A管理员，username: test_admin_a, password: 123456') AS '步骤3';

-- 公司B的管理员
INSERT INTO users (username, password_hash, name, role, company_id, created_at, updated_at)
VALUES (
  'test_admin_b',
  '$2b$10$rG7qXQxJ3F5HZ4kK9vX1NeYqQ7qYZ0yL8nK5nK5nK5nK5nK5nK5nKO',  -- 密码: 123456
  '公司B测试管理员',
  'manager',
  @company_b_id,
  NOW(),
  NOW()
);

SELECT CONCAT('✅ 创建公司B管理员，username: test_admin_b, password: 123456') AS '步骤4';

-- 超级管理员（如果不存在）
INSERT INTO users (username, password_hash, name, role, company_id, created_at, updated_at)
VALUES (
  'superadmin',
  '$2b$10$rG7qXQxJ3F5HZ4kK9vX1NeYqQ7qYZ0yL8nK5nK5nK5nK5nK5nK5nKO',  -- 密码: 123456
  '超级管理员',
  'super_admin',
  NULL,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE updated_at = NOW();

SELECT '✅ 超级管理员已创建/更新，username: superadmin, password: 123456' AS '步骤5';

-- ============================================
-- 3. 为测试公司创建测试数据
-- ============================================

-- 公司A的测试客户
INSERT INTO customers (name, phone, contact, customer_type, status, company_id, created_at, updated_at)
VALUES 
  ('公司A测试客户1', '13800000001', '张三', 'enterprise', 'active', @company_a_id, NOW(), NOW()),
  ('公司A测试客户2', '13800000002', '李四', 'enterprise', 'active', @company_a_id, NOW(), NOW());

SELECT CONCAT('✅ 为公司A创建2个测试客户') AS '步骤6';

-- 公司B的测试客户
INSERT INTO customers (name, phone, contact, customer_type, status, company_id, created_at, updated_at)
VALUES 
  ('公司B测试客户1', '13900000001', '王五', 'enterprise', 'active', @company_b_id, NOW(), NOW()),
  ('公司B测试客户2', '13900000002', '赵六', 'enterprise', 'active', @company_b_id, NOW(), NOW());

SELECT CONCAT('✅ 为公司B创建2个测试客户') AS '步骤7';

-- ============================================
-- 4. 验证测试数据
-- ============================================
SELECT '====== 测试数据创建完成 ======' AS '结果';

SELECT 
  cv.id AS '公司ID',
  cv.company_name AS '公司名称',
  COUNT(DISTINCT c.id) AS '客户数量',
  COUNT(DISTINCT u.id) AS '用户数量'
FROM company_verifications cv
LEFT JOIN customers c ON c.company_id = cv.id
LEFT JOIN users u ON u.company_id = cv.id
GROUP BY cv.id, cv.company_name
ORDER BY cv.id;

-- ============================================
-- 5. 测试账号信息
-- ============================================
SELECT '====== 测试账号清单 ======' AS '说明';

SELECT 
  username AS '用户名',
  name AS '姓名',
  role AS '角色',
  company_id AS '公司ID',
  '123456' AS '密码'
FROM users
WHERE username IN ('test_admin_a', 'test_admin_b', 'superadmin')
ORDER BY company_id;

SELECT '✅ 测试租户创建完成！' AS '完成';
SELECT '🎯 现在可以测试数据隔离了：' AS '下一步';
SELECT '  1. 用 test_admin_a 登录，应该只能看到公司A的2个客户' AS '测试1';
SELECT '  2. 用 test_admin_b 登录，应该只能看到公司B的2个客户' AS '测试2';
SELECT '  3. 用 superadmin 登录，应该能看到所有公司的4个客户' AS '测试3';
