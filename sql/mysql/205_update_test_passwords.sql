-- ============================================
-- 更新测试账号密码为 123456
-- ============================================
-- 生成的bcrypt哈希对应密码：123456
-- ============================================

USE gaokongche;

-- 统一更新所有测试账号的密码为 123456
-- 使用刚才生成的正确哈希
UPDATE users 
SET password_hash = '$2b$10$.h/ckH161VamWtVkzt8zjuz9m7CuJ4Fo0iZWojN3/EjCYk/wJ.vsa'
WHERE username IN ('test_admin_a', 'test_admin_b', 'superadmin');

-- 验证更新结果
SELECT 
  username AS '用户名',
  name AS '姓名',
  role AS '角色',
  company_id AS '公司ID',
  '123456' AS '密码',
  'Updated' AS '状态'
FROM users
WHERE username IN ('test_admin_a', 'test_admin_b', 'superadmin');

SELECT '✅ 测试账号密码已更新为: 123456' AS '完成';
