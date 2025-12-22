-- 将付款方式字段改为首付比例

-- 修改字段类型和名称
ALTER TABLE equipment_purchases
CHANGE COLUMN payment_method down_payment_ratio DECIMAL(5,2) DEFAULT 0 COMMENT '首付比例（%）';

-- 完成
SELECT 'Payment method changed to down payment ratio successfully' AS status;

