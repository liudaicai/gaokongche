/**
 * Add missing order fields
 * Created at: 2025-12-03
 */

SET @dbname = DATABASE();

-- shipping_fee_reduction
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'shipping_fee_reduction');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN shipping_fee_reduction VARCHAR(50) DEFAULT ''无减免'' COMMENT ''运费减免:无减免/减免进场费/减免退场费/双程减免''',
  'SELECT ''Column shipping_fee_reduction already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- shipping_fee_calculation
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'shipping_fee_calculation');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN shipping_fee_calculation VARCHAR(50) DEFAULT ''按台计费'' COMMENT ''运费计费方式:按台计费/按车计费''',
  'SELECT ''Column shipping_fee_calculation already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- is_tax_invoice
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'is_tax_invoice');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN is_tax_invoice VARCHAR(50) DEFAULT ''不开票'' COMMENT ''是否开票:不开票/普票/专票''',
  'SELECT ''Column is_tax_invoice already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- invoice_tax_rate
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'invoice_tax_rate');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN invoice_tax_rate DECIMAL(5,2) NULL COMMENT ''税率''',
  'SELECT ''Column invoice_tax_rate already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- construction_category
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'construction_category');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN construction_category VARCHAR(50) DEFAULT ''其他'' COMMENT ''施工类别''',
  'SELECT ''Column construction_category already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- other_agreements
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'other_agreements');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN other_agreements TEXT NULL COMMENT ''其他约定''',
  'SELECT ''Column other_agreements already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT '✅ Missing order fields added successfully' AS message;
