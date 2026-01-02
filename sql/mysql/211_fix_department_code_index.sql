-- =============================================
-- 修复部门编号唯一索引（多租户隔离）
-- =============================================
-- 
-- 问题：当前 idx_code 是全局唯一，导致不同租户无法使用相同编号
-- 解决：改为复合唯一索引 (company_id, code)，实现租户内唯一
--
-- =============================================

-- 1. 删除旧的唯一索引（code, is_deleted）
-- 注意：如果索引不存在会报错，可以忽略
ALTER TABLE departments DROP INDEX idx_code;

-- 2. 创建新的复合唯一索引（租户内编号唯一，支持软删除）
ALTER TABLE departments ADD UNIQUE INDEX idx_company_code (company_id, code, is_deleted);

-- 验证
SELECT '✅ 部门编号索引已修复！' AS '状态';
SELECT '📝 说明：不同租户现在可以使用相同的部门编号了' AS '功能';
SELECT '🔒 唯一约束：同一租户内、未删除状态下编号唯一' AS '规则';

-- 查看当前索引
SHOW INDEX FROM departments WHERE Key_name LIKE '%code%';
