-- 添加设备字段到 equipments 表（仅添加缺少的字段）
-- 大部分字段已经存在，只需添加：store_id, purchase_date, factory_date, attachments

-- 添加门店ID字段
ALTER TABLE `equipments` ADD COLUMN `store_id` INT NULL COMMENT '所属门店ID' AFTER `custom_code`;

-- 添加采购日期字段
ALTER TABLE `equipments` ADD COLUMN `purchase_date` DATE NULL COMMENT '采购日期' AFTER `store_id`;

-- 添加出厂日期字段
ALTER TABLE `equipments` ADD COLUMN `factory_date` DATE NULL COMMENT '出厂日期' AFTER `purchase_date`;

-- 添加附件JSON字段
ALTER TABLE `equipments` ADD COLUMN `attachments` JSON NULL COMMENT '附件列表' AFTER `factory_date`;

-- 添加索引以提高查询性能
CREATE INDEX `idx_equipments_store_id` ON `equipments` (`store_id`);

-- 添加外键约束
ALTER TABLE `equipments` ADD CONSTRAINT `fk_equipments_store_id` 
  FOREIGN KEY (`store_id`) REFERENCES `stores` (`id`) ON DELETE SET NULL;
