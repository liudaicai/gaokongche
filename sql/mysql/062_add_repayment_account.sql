-- 添加还款账户信息字段

ALTER TABLE equipment_purchases
ADD COLUMN repayment_account_name VARCHAR(200) COMMENT '还款账户名称' AFTER monthly_payment,
ADD COLUMN repayment_account_number VARCHAR(100) COMMENT '还款账号' AFTER repayment_account_name,
ADD COLUMN repayment_bank VARCHAR(200) COMMENT '还款银行' AFTER repayment_account_number;

-- 完成
SELECT 'Repayment account fields added successfully' AS status;

