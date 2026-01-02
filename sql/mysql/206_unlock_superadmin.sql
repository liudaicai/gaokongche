-- ============================================
-- 解锁superadmin账号
-- ============================================
-- 重置锁定状态和失败登录次数
-- ============================================

USE gaokongche;

-- 解锁superadmin账号并重置失败次数
UPDATE users
SET 
  is_locked = 0,
  failed_login_attempts = 0
WHERE username = 'superadmin';

-- 同时解锁所有测试账号（以防它们也被锁定）
UPDATE users
SET 
  is_locked = 0,
  failed_login_attempts = 0
WHERE username IN ('test_admin_a', 'test_admin_b');

-- 验证解锁结果
SELECT
  username AS '用户名',
  name AS '姓名',
  role AS '角色',
  is_locked AS '是否锁定',
  failed_login_attempts AS '失败次数',
  CASE 
    WHEN is_locked = 0 THEN '✅ 已解锁'
    ELSE '⚠️ 仍被锁定'
  END AS '状态'
FROM users
WHERE username IN ('superadmin', 'test_admin_a', 'test_admin_b');

SELECT '✅ 所有测试账号已解锁，失败次数已重置' AS '完成';
