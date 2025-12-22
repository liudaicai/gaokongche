-- ============================================
-- 创建系统管理员账户
-- ============================================

USE gaokongche;

-- 插入管理员账户（密码: admin123）
-- Hash使用 bcrypt, rounds=10 生成
INSERT INTO users (username, password_hash, role, name, phone, email, created_at, updated_at)
VALUES (
  'admin',
  '$2b$10$atrkeAndF8jM2cn6kl7v8.3aoOmNtwFElDb3hmX7PKIfoatvbpiz2',
  'admin',
  '系统管理员',
  '13800138000',
  'admin@example.com',
  NOW(3),
  NOW(3)
)
ON DUPLICATE KEY UPDATE 
  role = 'admin',
  updated_at = NOW(3);

SELECT '✅ 管理员账户创建成功！' as message;
SELECT '用户名: admin' as info;
SELECT '密码: admin123' as info;
SELECT '⚠️ 请登录后立即修改密码！' as warning;
