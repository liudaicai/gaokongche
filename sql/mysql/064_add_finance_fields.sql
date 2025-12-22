-- 添加首付金额和贷款金额字段

ALTER TABLE equipment_purchases
ADD COLUMN down_payment DECIMAL(15,2) DEFAULT 0 COMMENT '首付金额' AFTER monthly_payment,
ADD COLUMN loan_amount DECIMAL(15,2) DEFAULT 0 COMMENT '贷款/分期金额' AFTER down_payment;

-- 完成
SELECT 'Finance fields added successfully' AS status;

