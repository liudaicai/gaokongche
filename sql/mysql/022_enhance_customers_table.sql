-- ============================================
-- 客户模块增强 - 数据库表扩展脚本
-- 作者: AI 开发助手
-- 日期: 2025-11-15
-- 说明: 扩展客户表字段，添加客户类型、信用等级、业务负责人等
-- ============================================

START TRANSACTION;

-- ============================================
-- 1. 扩展客户表字段
-- ============================================

-- 检查字段是否存在，避免重复添加
SET @dbname = DATABASE();
SET @tablename = 'customers';

-- 客户类型
SET @column_check = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname 
    AND TABLE_NAME = @tablename 
    AND COLUMN_NAME = 'customer_type'
);

SET @sql = IF(@column_check = 0,
  'ALTER TABLE customers ADD COLUMN customer_type VARCHAR(50) DEFAULT ''enterprise'' COMMENT ''客户类型：enterprise(企业)/personal(个人)''',
  'SELECT ''Column customer_type already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 信用等级
SET @column_check = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname 
    AND TABLE_NAME = @tablename 
    AND COLUMN_NAME = 'credit_level'
);

SET @sql = IF(@column_check = 0,
  'ALTER TABLE customers ADD COLUMN credit_level VARCHAR(50) DEFAULT ''normal'' COMMENT ''信用等级：excellent(优秀)/good(良好)/normal(一般)/poor(较差)''',
  'SELECT ''Column credit_level already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 业务负责人ID
SET @column_check = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname 
    AND TABLE_NAME = @tablename 
    AND COLUMN_NAME = 'business_manager_id'
);

SET @sql = IF(@column_check = 0,
  'ALTER TABLE customers ADD COLUMN business_manager_id INT NULL COMMENT ''业务负责人ID（关联users表）''',
  'SELECT ''Column business_manager_id already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 业务负责人姓名（冗余字段，方便查询）
SET @column_check = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname 
    AND TABLE_NAME = @tablename 
    AND COLUMN_NAME = 'business_manager_name'
);

SET @sql = IF(@column_check = 0,
  'ALTER TABLE customers ADD COLUMN business_manager_name VARCHAR(255) NULL COMMENT ''业务负责人姓名''',
  'SELECT ''Column business_manager_name already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 结算方式
SET @column_check = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname 
    AND TABLE_NAME = @tablename 
    AND COLUMN_NAME = 'settlement_method'
);

SET @sql = IF(@column_check = 0,
  'ALTER TABLE customers ADD COLUMN settlement_method VARCHAR(50) DEFAULT ''monthly'' COMMENT ''结算方式：daily(日结)/monthly(月结)/quarterly(季结)''',
  'SELECT ''Column settlement_method already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 税号（企业客户）
SET @column_check = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname 
    AND TABLE_NAME = @tablename 
    AND COLUMN_NAME = 'tax_number'
);

SET @sql = IF(@column_check = 0,
  'ALTER TABLE customers ADD COLUMN tax_number VARCHAR(100) NULL COMMENT ''税号（企业客户）''',
  'SELECT ''Column tax_number already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 银行账号
SET @column_check = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname 
    AND TABLE_NAME = @tablename 
    AND COLUMN_NAME = 'bank_account'
);

SET @sql = IF(@column_check = 0,
  'ALTER TABLE customers ADD COLUMN bank_account VARCHAR(100) NULL COMMENT ''银行账号''',
  'SELECT ''Column bank_account already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 开户行
SET @column_check = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname 
    AND TABLE_NAME = @tablename 
    AND COLUMN_NAME = 'bank_name'
);

SET @sql = IF(@column_check = 0,
  'ALTER TABLE customers ADD COLUMN bank_name VARCHAR(255) NULL COMMENT ''开户行''',
  'SELECT ''Column bank_name already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 客户状态
SET @column_check = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname 
    AND TABLE_NAME = @tablename 
    AND COLUMN_NAME = 'status'
);

SET @sql = IF(@column_check = 0,
  'ALTER TABLE customers ADD COLUMN status VARCHAR(50) DEFAULT ''active'' COMMENT ''状态：active(活跃)/inactive(不活跃)/blacklist(黑名单)''',
  'SELECT ''Column status already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 客户标签（JSON格式）
SET @column_check = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname 
    AND TABLE_NAME = @tablename 
    AND COLUMN_NAME = 'tags'
);

SET @sql = IF(@column_check = 0,
  'ALTER TABLE customers ADD COLUMN tags JSON NULL COMMENT ''客户标签（如：[\"VIP\", \"长期合作\"]）''',
  'SELECT ''Column tags already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 备注
SET @column_check = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname 
    AND TABLE_NAME = @tablename 
    AND COLUMN_NAME = 'notes'
);

SET @sql = IF(@column_check = 0,
  'ALTER TABLE customers ADD COLUMN notes TEXT NULL COMMENT ''备注''',
  'SELECT ''Column notes already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 2. 添加索引
-- ============================================

-- 业务负责人索引
SET @index_check = (
  SELECT COUNT(*) 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = @dbname 
    AND TABLE_NAME = @tablename 
    AND INDEX_NAME = 'idx_customers_business_manager'
);

SET @sql = IF(@index_check = 0,
  'CREATE INDEX idx_customers_business_manager ON customers(business_manager_id)',
  'SELECT ''Index idx_customers_business_manager already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 状态索引
SET @index_check = (
  SELECT COUNT(*) 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = @dbname 
    AND TABLE_NAME = @tablename 
    AND INDEX_NAME = 'idx_customers_status'
);

SET @sql = IF(@index_check = 0,
  'CREATE INDEX idx_customers_status ON customers(status)',
  'SELECT ''Index idx_customers_status already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 信用等级索引
SET @index_check = (
  SELECT COUNT(*) 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = @dbname 
    AND TABLE_NAME = @tablename 
    AND INDEX_NAME = 'idx_customers_credit_level'
);

SET @sql = IF(@index_check = 0,
  'CREATE INDEX idx_customers_credit_level ON customers(credit_level)',
  'SELECT ''Index idx_customers_credit_level already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 客户类型索引
SET @index_check = (
  SELECT COUNT(*) 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = @dbname 
    AND TABLE_NAME = @tablename 
    AND INDEX_NAME = 'idx_customers_type'
);

SET @sql = IF(@index_check = 0,
  'CREATE INDEX idx_customers_type ON customers(customer_type)',
  'SELECT ''Index idx_customers_type already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 3. 更新现有数据（可选）
-- ============================================

-- 为现有客户设置默认值
UPDATE customers 
SET 
  customer_type = 'enterprise',
  credit_level = 'normal',
  settlement_method = 'monthly',
  status = 'active'
WHERE customer_type IS NULL OR credit_level IS NULL;

COMMIT;

-- ============================================
-- 4. 验证
-- ============================================
SELECT '✅ 客户表扩展完成！' AS message;
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'customers'
  AND COLUMN_NAME IN (
    'customer_type', 'credit_level', 'business_manager_id', 
    'business_manager_name', 'settlement_method', 'tax_number',
    'bank_account', 'bank_name', 'status', 'tags', 'notes'
  )
ORDER BY ORDINAL_POSITION;

