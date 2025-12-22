-- 添加报停记录表
CREATE TABLE IF NOT EXISTS `order_suspensions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `suspension_number` VARCHAR(50) NULL COMMENT '报停单号',
  `contract_name` VARCHAR(255) NULL COMMENT '合同名称',
  `suspension_type` VARCHAR(50) NULL COMMENT '报停类型（维修报停、假期报停）',
  `reason` TEXT NULL COMMENT '报停原因',
  `start_date` DATE NULL COMMENT '报停开始日期',
  `end_date` DATE NULL COMMENT '报停结束日期',
  `suspension_days` INT NULL COMMENT '报停天数',
  `equipment_selections` JSON NULL COMMENT '报停设备选择',
  `attachments_json` JSON NULL COMMENT '报停单据附件',
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_suspension_number` (`suspension_number`),
  KEY `fk_order_suspensions_order_id` (`order_id`),
  CONSTRAINT `fk_order_suspensions_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

