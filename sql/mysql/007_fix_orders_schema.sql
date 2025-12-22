-- 修复订单相关的数据库schema问题

-- 1. 删除有问题的外键约束（lessor_id 应该允许任意值或NULL）
ALTER TABLE `orders` DROP FOREIGN KEY `fk_orders_lessor_id`;
ALTER TABLE `orders` DROP FOREIGN KEY `fk_orders_customer_id`;
ALTER TABLE `orders` DROP FOREIGN KEY `fk_orders_business_manager_id`;

-- 2. 重新添加外键，设置为 ON DELETE SET NULL（允许删除关联记录）
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_lessor_id` 
  FOREIGN KEY (`lessor_id`) REFERENCES `customers` (`id`) 
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_customer_id` 
  FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) 
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_business_manager_id` 
  FOREIGN KEY (`business_manager_id`) REFERENCES `employees` (`id`) 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. 创建 order_items 表（订单设备项）
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `equipment_type` VARCHAR(100) NULL COMMENT '设备类型',
  `height` VARCHAR(50) NULL COMMENT '高度',
  `quantity` INT DEFAULT 0 COMMENT '数量',
  `daily_rate` DECIMAL(12,2) DEFAULT 0.00 COMMENT '日租价',
  `monthly_rate` DECIMAL(12,2) DEFAULT 0.00 COMMENT '月租价',
  `deposit` DECIMAL(12,2) DEFAULT 0.00 COMMENT '押金',
  `shipping_fee` DECIMAL(12,2) DEFAULT 0.00 COMMENT '运费',
  `modification_fee` DECIMAL(12,2) DEFAULT 0.00 COMMENT '改装费',
  `scheduled_entry_date` DATE NULL COMMENT '计划进场日期',
  `estimated_exit_date` DATE NULL COMMENT '预计退场日期',
  `rental_period` INT DEFAULT 0 COMMENT '租期（天）',
  `shipping_type` VARCHAR(50) NULL COMMENT '运输类型：单程/双程',
  `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order_id` (`order_id`),
  CONSTRAINT `fk_order_items_order_id` 
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单设备项';

-- 4. 移除 orders 表的 mongo_id 唯一约束（允许NULL值）
ALTER TABLE `orders` DROP INDEX `uniq_orders_mongo_id`;
ALTER TABLE `orders` ADD INDEX `idx_orders_mongo_id` (`mongo_id`);

-- 5. 修改 mongo_id 字段允许 NULL（新订单不需要这个字段）
ALTER TABLE `orders` MODIFY COLUMN `mongo_id` VARCHAR(24) NULL;
