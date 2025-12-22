-- 给采购明细表添加设备高度字段

ALTER TABLE purchase_items
ADD COLUMN equipment_height DECIMAL(6,2) COMMENT '设备高度(米)' AFTER equipment_model;

-- 完成
SELECT 'Height field added to purchase_items successfully' AS status;

