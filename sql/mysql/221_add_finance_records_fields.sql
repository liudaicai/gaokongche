-- =====================================================
-- 添加 finance_records 表缺失的字段
-- =====================================================

-- 添加 source_type 字段（记录来源类型：order/manual）
ALTER TABLE finance_records 
ADD COLUMN source_type VARCHAR(20) DEFAULT 'order' AFTER record_type;

-- 添加 source_id 字段（原始记录ID，用于关联 order_receipts/order_refunds）
ALTER TABLE finance_records 
ADD COLUMN source_id INT AFTER source_type;

-- 添加 customer_id 字段（客户ID）
ALTER TABLE finance_records 
ADD COLUMN customer_id INT AFTER order_id;

-- 添加 customer_name 字段（客户名称）
ALTER TABLE finance_records 
ADD COLUMN customer_name VARCHAR(200) AFTER customer_id;

-- 添加 order_number 字段（订单编号）
ALTER TABLE finance_records 
ADD COLUMN order_number VARCHAR(100) AFTER order_id;

-- 创建索引
CREATE INDEX idx_source ON finance_records(source_type, source_id);
CREATE INDEX idx_customer ON finance_records(customer_id);

SELECT '✓ finance_records 表字段已添加' AS result;

-- 验证字段
SELECT 
  COLUMN_NAME, 
  COLUMN_TYPE, 
  IS_NULLABLE,
  COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'finance_records'
  AND COLUMN_NAME IN ('source_type', 'source_id', 'customer_id', 'customer_name', 'order_number')
ORDER BY ORDINAL_POSITION;

