-- =============================================
-- 为转租管理表添加多租户隔离字段
-- =============================================
-- 
-- 功能：为 sublease_companies 和 sublease_equipments 添加 company_id
--
-- =============================================

-- 1. 转租公司表添加 company_id
ALTER TABLE sublease_companies 
ADD COLUMN company_id INT NULL COMMENT '所属租户ID（多租户隔离）' 
AFTER id;

ALTER TABLE sublease_companies 
ADD INDEX idx_company_id (company_id);

-- 2. 转租设备表添加 tenant_company_id（所属租户）
ALTER TABLE sublease_equipments 
ADD COLUMN tenant_company_id INT NULL COMMENT '设备所属租户ID（多租户隔离）' 
AFTER id;

ALTER TABLE sublease_equipments 
ADD INDEX idx_tenant_company_id (tenant_company_id);

-- 3. 更新现有数据（将 NULL 的 company_id 设置为第一个租户ID）
SET @default_company_id := (SELECT id FROM company_verifications ORDER BY id LIMIT 1);

UPDATE sublease_companies 
SET company_id = @default_company_id 
WHERE company_id IS NULL;

UPDATE sublease_equipments 
SET tenant_company_id = @default_company_id 
WHERE tenant_company_id IS NULL;

-- 4. 验证数据
SELECT '✅ 转租管理表已添加多租户隔离字段！' AS '状态';
SELECT CONCAT('更新了 ', ROW_COUNT(), ' 条设备记录') AS '设备更新结果';

-- 5. 查看数据分布
SELECT 
  '转租公司数据分布' AS '说明',
  company_id AS '租户ID',
  COUNT(*) AS '公司数量'
FROM sublease_companies
GROUP BY company_id;

SELECT 
  '转租设备数据分布' AS '说明',
  tenant_company_id AS '租户ID',
  COUNT(*) AS '设备数量'
FROM sublease_equipments
GROUP BY tenant_company_id;

-- 6. 查看索引
SHOW INDEX FROM sublease_companies WHERE Key_name LIKE '%company%';
SHOW INDEX FROM sublease_equipments WHERE Key_name LIKE '%company%';
