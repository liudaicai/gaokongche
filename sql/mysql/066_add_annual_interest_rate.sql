-- 添加年利率字段

ALTER TABLE equipment_purchases
ADD COLUMN annual_interest_rate DECIMAL(5,2) DEFAULT 0 COMMENT '年利率（%）' AFTER loan_amount;

-- 完成
SELECT 'Annual interest rate field added successfully' AS status;

