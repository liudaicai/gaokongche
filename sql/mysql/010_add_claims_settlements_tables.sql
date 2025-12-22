-- 添加索赔记录表
CREATE TABLE IF NOT EXISTS `order_claims` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `claim_number` VARCHAR(50) NULL COMMENT '索赔单号',
  `contract_name` VARCHAR(255) NULL COMMENT '合同名称',
  `claim_date` DATE NULL COMMENT '索赔日期',
  `claim_amount` DECIMAL(12,2) NULL DEFAULT 0.00 COMMENT '索赔金额',
  `claim_reason` TEXT NULL COMMENT '索赔原因',
  `equipment_selections` JSON NULL COMMENT '索赔设备选择',
  `attachments_json` JSON NULL COMMENT '索赔单据附件',
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_claim_number` (`claim_number`),
  KEY `idx_claim_date` (`claim_date`),
  KEY `fk_order_claims_order_id` (`order_id`),
  CONSTRAINT `fk_order_claims_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 添加结算记录表
CREATE TABLE IF NOT EXISTS `order_settlements` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `settlement_number` VARCHAR(50) NULL COMMENT '结算单号',
  `contract_name` VARCHAR(255) NULL COMMENT '合同名称',
  `cycle_start` DATE NULL COMMENT '结算周期开始日期',
  `cycle_end` DATE NULL COMMENT '结算周期结束日期',
  `equipment_pricing` JSON NULL COMMENT '设备计价明细',
  `total_amount` DECIMAL(12,2) NULL DEFAULT 0.00 COMMENT '结算总额',
  `deduction` DECIMAL(12,2) NULL DEFAULT 0.00 COMMENT '抵扣额',
  `labor_cost` DECIMAL(12,2) NULL DEFAULT 0.00 COMMENT '人工费',
  `other_cost` DECIMAL(12,2) NULL DEFAULT 0.00 COMMENT '其他费用',
  `final_amount` DECIMAL(12,2) NULL DEFAULT 0.00 COMMENT '最终结算金额',
  `attachments_json` JSON NULL COMMENT '结算单据附件',
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_settlement_number` (`settlement_number`),
  KEY `idx_cycle_dates` (`cycle_start`, `cycle_end`),
  KEY `fk_order_settlements_order_id` (`order_id`),
  CONSTRAINT `fk_order_settlements_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

