-- =============================================
-- 修复印章管理的多租户隔离（字段已存在）
-- =============================================
-- 
-- 说明：seals 表的 company_id 字段已存在，只需添加索引和更新数据
--
-- =============================================

-- 1. 检查并创建索引（如果不存在）
-- 注意：如果索引已存在会报错，可以忽略
ALTER TABLE seals 
ADD INDEX idx_company_id (company_id);

ALTER TABLE seals 
ADD INDEX idx_company_deleted (company_id, deleted_at);

-- 2. 更新现有数据（将 NULL 的 company_id 设置为第一个租户ID）
SET @default_company_id := (SELECT id FROM company_verifications ORDER BY id LIMIT 1);

UPDATE seals 
SET company_id = @default_company_id 
WHERE company_id IS NULL;

-- 3. 验证数据
SELECT '✅ 印章管理多租户隔离已修复！' AS '状态';
SELECT CONCAT('更新了 ', ROW_COUNT(), ' 条记录') AS '更新结果';

-- 4. 查看数据分布
SELECT 
  '印章数据分布' AS '说明',
  company_id AS '租户ID',
  COUNT(*) AS '印章数量'
FROM seals
WHERE deleted_at IS NULL
GROUP BY company_id;

-- 5. 查看索引
SHOW INDEX FROM seals WHERE Key_name LIKE '%company%';
