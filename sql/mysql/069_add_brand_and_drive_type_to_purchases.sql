-- 069: 给采购表添加品牌字段和驱动类型字段

-- 给采购主表添加品牌字段（在第一排显示）
ALTER TABLE equipment_purchases
ADD COLUMN brand VARCHAR(100) COMMENT '设备品牌' AFTER manufacturer_name;

-- 给采购明细表添加驱动类型字段
ALTER TABLE purchase_items
ADD COLUMN drive_type VARCHAR(50) COMMENT '驱动类型' AFTER equipment_height;

-- 完成
SELECT 'Added brand to equipment_purchases and drive_type to purchase_items successfully' AS status;
