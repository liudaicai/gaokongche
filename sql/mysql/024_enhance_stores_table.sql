-- ============================================
-- 门店模块增强 - 数据库表扩展脚本
-- 作者: AI 开发助手
-- 日期: 2025-11-15
-- 说明: 扩展门店表字段，添加门店编号、类型、经纬度、状态等
-- ============================================

START TRANSACTION;

-- ============================================
-- 1. 扩展门店表字段
-- ============================================

SET @dbname = DATABASE();
SET @tablename = 'stores';

-- 门店编号
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'store_code');
SET @sql = IF(@column_check = 0, 'ALTER TABLE stores ADD COLUMN store_code VARCHAR(50) NULL COMMENT ''门店编号''', 'SELECT ''Column store_code already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 门店类型
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'store_type');
SET @sql = IF(@column_check = 0, 'ALTER TABLE stores ADD COLUMN store_type VARCHAR(50) DEFAULT ''branch'' COMMENT ''门店类型：headquarters(总部)/branch(分店)/warehouse(仓库)''', 'SELECT ''Column store_type already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 纬度
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'latitude');
SET @sql = IF(@column_check = 0, 'ALTER TABLE stores ADD COLUMN latitude DECIMAL(10,7) NULL COMMENT ''纬度''', 'SELECT ''Column latitude already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 经度
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'longitude');
SET @sql = IF(@column_check = 0, 'ALTER TABLE stores ADD COLUMN longitude DECIMAL(10,7) NULL COMMENT ''经度''', 'SELECT ''Column longitude already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 联系电话
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'contact_phone');
SET @sql = IF(@column_check = 0, 'ALTER TABLE stores ADD COLUMN contact_phone VARCHAR(50) NULL COMMENT ''门店联系电话''', 'SELECT ''Column contact_phone already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 联系人
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'contact_person');
SET @sql = IF(@column_check = 0, 'ALTER TABLE stores ADD COLUMN contact_person VARCHAR(100) NULL COMMENT ''联系人''', 'SELECT ''Column contact_person already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 营业时间
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'business_hours');
SET @sql = IF(@column_check = 0, 'ALTER TABLE stores ADD COLUMN business_hours VARCHAR(255) NULL COMMENT ''营业时间（如：周一至周五 9:00-18:00）''', 'SELECT ''Column business_hours already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 状态
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'status');
SET @sql = IF(@column_check = 0, 'ALTER TABLE stores ADD COLUMN status VARCHAR(50) DEFAULT ''active'' COMMENT ''状态：active(营业中)/inactive(已关闭)''', 'SELECT ''Column status already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 面积
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'area_sqm');
SET @sql = IF(@column_check = 0, 'ALTER TABLE stores ADD COLUMN area_sqm DECIMAL(10,2) NULL COMMENT ''面积（平方米）''', 'SELECT ''Column area_sqm already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 备注
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'notes');
SET @sql = IF(@column_check = 0, 'ALTER TABLE stores ADD COLUMN notes TEXT NULL COMMENT ''备注''', 'SELECT ''Column notes already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================
-- 2. 添加索引
-- ============================================

-- 门店编号索引（如果有company_id则创建复合索引）
SET @has_company_id = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'company_id');
SET @index_check = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND INDEX_NAME = 'idx_store_code');

SET @sql = IF(@index_check = 0 AND @has_company_id > 0, 
  'CREATE UNIQUE INDEX uniq_store_code_company ON stores(store_code, company_id)',
  IF(@index_check = 0, 'CREATE INDEX idx_store_code ON stores(store_code)', 
  'SELECT ''Index already exists''')
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 门店类型索引
SET @index_check = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND INDEX_NAME = 'idx_stores_type');
SET @sql = IF(@index_check = 0, 'CREATE INDEX idx_stores_type ON stores(store_type)', 'SELECT ''Index idx_stores_type already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 状态索引
SET @index_check = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND INDEX_NAME = 'idx_stores_status');
SET @sql = IF(@index_check = 0, 'CREATE INDEX idx_stores_status ON stores(status)', 'SELECT ''Index idx_stores_status already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================
-- 3. 更新现有数据
-- ============================================

UPDATE stores 
SET 
  store_type = 'branch',
  status = 'active'
WHERE store_type IS NULL OR status IS NULL;

COMMIT;

-- ============================================
-- 4. 验证
-- ============================================
SELECT '✅ 门店表扩展完成！' AS message;
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'stores'
  AND COLUMN_NAME IN (
    'store_code', 'store_type', 'latitude', 'longitude',
    'contact_phone', 'contact_person', 'business_hours',
    'status', 'area_sqm', 'notes'
  )
ORDER BY ORDINAL_POSITION;


