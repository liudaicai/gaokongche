-- 添加清款记录表
CREATE TABLE IF NOT EXISTS `order_clearances` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `clearance_number` VARCHAR(50) NULL COMMENT '清款单号',
  `contract_name` VARCHAR(255) NULL COMMENT '合同名称',
  `clearance_date` DATE NULL COMMENT '清款日期',
  `clearance_amount` DECIMAL(12,2) NULL DEFAULT 0.00 COMMENT '清款金额',
  `payment_method` VARCHAR(50) NULL COMMENT '支付方式（现金、转账、支票等）',
  `payment_account` VARCHAR(255) NULL COMMENT '收款账户',
  `remark` TEXT NULL COMMENT '备注说明',
  `attachments_json` JSON NULL COMMENT '清款单据附件',
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_clearance_number` (`clearance_number`),
  KEY `idx_clearance_date` (`clearance_date`),
  KEY `fk_order_clearances_order_id` (`order_id`),
  CONSTRAINT `fk_order_clearances_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

