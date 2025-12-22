-- ============================================
-- 订单履约全流程表结构
-- 包含：报停、索赔、账单、对账、优惠、增收、结算
-- 版本: v1.0
-- 日期: 2025-11-15
-- ============================================

-- 1️⃣ 设备报停记录表
CREATE TABLE IF NOT EXISTS `order_suspensions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL COMMENT '订单ID',
  `equipment_id` INT NULL COMMENT '设备ID（NULL表示整个订单报停）',
  `suspension_type` VARCHAR(50) NOT NULL COMMENT '报停类型：weather, site_stop, maintenance, customer_request',
  `reason` TEXT NULL COMMENT '报停原因',
  `start_date` DATE NOT NULL COMMENT '报停开始日期',
  `end_date` DATE NULL COMMENT '报停结束日期（NULL表示未恢复）',
  `suspension_days` INT NULL COMMENT '报停天数',
  `is_charge_free` TINYINT(1) DEFAULT 1 COMMENT '是否免费（1=免费，0=照常计费）',
  `discount_rate` DECIMAL(5,2) DEFAULT 0.00 COMMENT '折扣率（0-100，100表示免费）',
  `approved_by` INT NULL COMMENT '审批人ID',
  `approved_at` DATETIME NULL COMMENT '审批时间',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态：pending, approved, rejected, ended',
  `attachments` JSON NULL COMMENT '附件（证明文件）',
  `notes` TEXT NULL COMMENT '备注',
  `created_by` INT NULL COMMENT '创建人ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_order_suspensions_order_id` (`order_id`),
  INDEX `idx_order_suspensions_equipment_id` (`equipment_id`),
  INDEX `idx_order_suspensions_status` (`status`),
  INDEX `idx_order_suspensions_dates` (`start_date`, `end_date`),
  CONSTRAINT `fk_order_suspensions_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单报停记录表';

-- 2️⃣ 设备损坏索赔表
CREATE TABLE IF NOT EXISTS `order_claims` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `claim_number` VARCHAR(50) NOT NULL COMMENT '索赔单号',
  `order_id` INT NOT NULL COMMENT '订单ID',
  `equipment_id` INT NOT NULL COMMENT '设备ID',
  `claim_type` VARCHAR(50) NOT NULL COMMENT '索赔类型：damage, loss, accident, wear',
  `responsibility` VARCHAR(50) NOT NULL COMMENT '责任方：customer, company, third_party, natural, wear',
  `damage_description` TEXT NOT NULL COMMENT '损坏描述',
  `damage_level` VARCHAR(20) NOT NULL COMMENT '损坏程度：minor, moderate, severe, total_loss',
  `occurred_at` DATETIME NOT NULL COMMENT '发生时间',
  `reported_at` DATETIME NOT NULL COMMENT '报告时间',
  `repair_cost` DECIMAL(12,2) NULL COMMENT '维修费用',
  `compensation_amount` DECIMAL(12,2) NULL COMMENT '赔偿金额',
  `insurance_coverage` DECIMAL(12,2) NULL COMMENT '保险赔付金额',
  `customer_payment` DECIMAL(12,2) NULL COMMENT '客户支付金额',
  `claim_status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态：pending, investigating, approved, rejected, settled',
  `investigation_notes` TEXT NULL COMMENT '调查记录',
  `settlement_notes` TEXT NULL COMMENT '结算说明',
  `photos` JSON NULL COMMENT '损坏照片',
  `documents` JSON NULL COMMENT '相关文档（维修单、保险单等）',
  `handled_by` INT NULL COMMENT '处理人ID',
  `approved_by` INT NULL COMMENT '审批人ID',
  `settled_at` DATETIME NULL COMMENT '结算时间',
  `created_by` INT NULL COMMENT '创建人ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_claim_number` (`claim_number`),
  INDEX `idx_order_claims_order_id` (`order_id`),
  INDEX `idx_order_claims_equipment_id` (`equipment_id`),
  INDEX `idx_order_claims_status` (`claim_status`),
  CONSTRAINT `fk_order_claims_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备损坏索赔表';

-- 3️⃣ 订单账单表
CREATE TABLE IF NOT EXISTS `order_bills` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `bill_number` VARCHAR(50) NOT NULL COMMENT '账单号',
  `order_id` INT NOT NULL COMMENT '订单ID',
  `bill_type` VARCHAR(20) NOT NULL COMMENT '账单类型：monthly, stage, final',
  `bill_period_start` DATE NOT NULL COMMENT '账期开始',
  `bill_period_end` DATE NOT NULL COMMENT '账期结束',
  `rental_days` INT NOT NULL COMMENT '租赁天数',
  `suspension_days` INT DEFAULT 0 COMMENT '报停天数',
  `chargeable_days` INT NOT NULL COMMENT '实际计费天数',
  
  -- 费用明细
  `rent_amount` DECIMAL(12,2) NOT NULL COMMENT '租金',
  `deposit_amount` DECIMAL(12,2) DEFAULT 0.00 COMMENT '押金（首期）',
  `transport_fee` DECIMAL(12,2) DEFAULT 0.00 COMMENT '运费',
  `modification_fee` DECIMAL(12,2) DEFAULT 0.00 COMMENT '改装费',
  `claim_amount` DECIMAL(12,2) DEFAULT 0.00 COMMENT '索赔金额',
  `additional_charges` DECIMAL(12,2) DEFAULT 0.00 COMMENT '其他增收',
  `subtotal` DECIMAL(12,2) NOT NULL COMMENT '小计',
  
  -- 优惠
  `discount_amount` DECIMAL(12,2) DEFAULT 0.00 COMMENT '优惠金额',
  `discount_reason` VARCHAR(255) NULL COMMENT '优惠原因',
  
  -- 总计
  `total_amount` DECIMAL(12,2) NOT NULL COMMENT '应收总额',
  `paid_amount` DECIMAL(12,2) DEFAULT 0.00 COMMENT '已收金额',
  `outstanding_amount` DECIMAL(12,2) NOT NULL COMMENT '未收金额',
  
  -- 状态
  `bill_status` VARCHAR(20) DEFAULT 'draft' COMMENT '状态：draft, sent, confirmed, paid, overdue, cancelled',
  `sent_at` DATETIME NULL COMMENT '发送时间',
  `confirmed_at` DATETIME NULL COMMENT '客户确认时间',
  `due_date` DATE NULL COMMENT '付款期限',
  `paid_at` DATETIME NULL COMMENT '付款时间',
  
  -- 附件和备注
  `attachments` JSON NULL COMMENT '账单附件',
  `notes` TEXT NULL COMMENT '备注',
  `reconciliation_notes` TEXT NULL COMMENT '对账说明',
  
  `created_by` INT NULL COMMENT '制单人',
  `approved_by` INT NULL COMMENT '审批人',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_bill_number` (`bill_number`),
  INDEX `idx_order_bills_order_id` (`order_id`),
  INDEX `idx_order_bills_status` (`bill_status`),
  INDEX `idx_order_bills_period` (`bill_period_start`, `bill_period_end`),
  CONSTRAINT `fk_order_bills_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单账单表';

-- 4️⃣ 订单对账记录表
CREATE TABLE IF NOT EXISTS `order_reconciliations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `reconciliation_number` VARCHAR(50) NOT NULL COMMENT '对账单号',
  `order_id` INT NOT NULL COMMENT '订单ID',
  `reconciliation_period_start` DATE NOT NULL COMMENT '对账期间开始',
  `reconciliation_period_end` DATE NOT NULL COMMENT '对账期间结束',
  
  -- 我方数据
  `our_rental_days` INT NOT NULL COMMENT '我方统计租赁天数',
  `our_total_amount` DECIMAL(12,2) NOT NULL COMMENT '我方统计应收金额',
  `our_paid_amount` DECIMAL(12,2) NOT NULL COMMENT '我方统计已收金额',
  `our_outstanding` DECIMAL(12,2) NOT NULL COMMENT '我方统计未收金额',
  
  -- 客户数据
  `customer_rental_days` INT NULL COMMENT '客户统计租赁天数',
  `customer_total_amount` DECIMAL(12,2) NULL COMMENT '客户统计应付金额',
  `customer_paid_amount` DECIMAL(12,2) NULL COMMENT '客户统计已付金额',
  `customer_outstanding` DECIMAL(12,2) NULL COMMENT '客户统计未付金额',
  
  -- 差异
  `days_difference` INT NULL COMMENT '天数差异',
  `amount_difference` DECIMAL(12,2) NULL COMMENT '金额差异',
  `discrepancy_notes` TEXT NULL COMMENT '差异说明',
  
  -- 最终结果
  `agreed_rental_days` INT NULL COMMENT '确认租赁天数',
  `agreed_total_amount` DECIMAL(12,2) NULL COMMENT '确认应收金额',
  `agreed_paid_amount` DECIMAL(12,2) NULL COMMENT '确认已收金额',
  `agreed_outstanding` DECIMAL(12,2) NULL COMMENT '确认未收金额',
  
  -- 状态
  `reconciliation_status` VARCHAR(20) DEFAULT 'draft' COMMENT '状态：draft, sent, confirmed, disputed, resolved',
  `sent_at` DATETIME NULL COMMENT '发送时间',
  `confirmed_at` DATETIME NULL COMMENT '确认时间',
  `confirmed_by_customer` VARCHAR(100) NULL COMMENT '客户确认人',
  
  -- 附件
  `attachments` JSON NULL COMMENT '对账附件',
  `customer_feedback` TEXT NULL COMMENT '客户反馈',
  
  `created_by` INT NULL COMMENT '制单人',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_reconciliation_number` (`reconciliation_number`),
  INDEX `idx_order_reconciliations_order_id` (`order_id`),
  INDEX `idx_order_reconciliations_status` (`reconciliation_status`),
  CONSTRAINT `fk_order_reconciliations_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单对账记录表';

-- 5️⃣ 订单优惠记录表
CREATE TABLE IF NOT EXISTS `order_discounts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL COMMENT '订单ID',
  `discount_type` VARCHAR(50) NOT NULL COMMENT '优惠类型：long_term, bulk, loyalty, promotion, special',
  `discount_name` VARCHAR(100) NOT NULL COMMENT '优惠名称',
  `discount_method` VARCHAR(20) NOT NULL COMMENT '优惠方式：percentage, fixed_amount',
  `discount_value` DECIMAL(10,2) NOT NULL COMMENT '优惠值（百分比或金额）',
  `discount_amount` DECIMAL(12,2) NOT NULL COMMENT '优惠金额',
  `apply_to` VARCHAR(50) DEFAULT 'total' COMMENT '应用到：total, rent, deposit, transport',
  `valid_from` DATE NULL COMMENT '有效期开始',
  `valid_to` DATE NULL COMMENT '有效期结束',
  `conditions` JSON NULL COMMENT '优惠条件',
  `reason` TEXT NULL COMMENT '优惠原因',
  `approved_by` INT NULL COMMENT '审批人',
  `approved_at` DATETIME NULL COMMENT '审批时间',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态：active, expired, cancelled',
  `created_by` INT NULL COMMENT '创建人ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_order_discounts_order_id` (`order_id`),
  INDEX `idx_order_discounts_type` (`discount_type`),
  INDEX `idx_order_discounts_status` (`status`),
  CONSTRAINT `fk_order_discounts_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单优惠记录表';

-- 6️⃣ 订单增收记录表
CREATE TABLE IF NOT EXISTS `order_additional_charges` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL COMMENT '订单ID',
  `charge_type` VARCHAR(50) NOT NULL COMMENT '费用类型：overtime, out_of_scope, rush, special_service, penalty',
  `charge_name` VARCHAR(100) NOT NULL COMMENT '费用名称',
  `charge_amount` DECIMAL(12,2) NOT NULL COMMENT '费用金额',
  `quantity` DECIMAL(10,2) DEFAULT 1.00 COMMENT '数量/次数',
  `unit_price` DECIMAL(12,2) NULL COMMENT '单价',
  `calculation_basis` TEXT NULL COMMENT '计算依据',
  `reason` TEXT NOT NULL COMMENT '收费原因',
  `occurred_at` DATETIME NOT NULL COMMENT '发生时间',
  `approved_by` INT NULL COMMENT '审批人',
  `approved_at` DATETIME NULL COMMENT '审批时间',
  `status` VARCHAR(20) DEFAULT 'pending' COMMENT '状态：pending, approved, rejected, billed',
  `bill_id` INT NULL COMMENT '关联账单ID',
  `attachments` JSON NULL COMMENT '附件',
  `notes` TEXT NULL COMMENT '备注',
  `created_by` INT NULL COMMENT '创建人ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_order_additional_charges_order_id` (`order_id`),
  INDEX `idx_order_additional_charges_type` (`charge_type`),
  INDEX `idx_order_additional_charges_status` (`status`),
  CONSTRAINT `fk_order_additional_charges_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单增收记录表';

-- 7️⃣ 订单结算表
CREATE TABLE IF NOT EXISTS `order_settlements` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `settlement_number` VARCHAR(50) NOT NULL COMMENT '结算单号',
  `order_id` INT NOT NULL COMMENT '订单ID',
  
  -- 费用汇总
  `total_rent` DECIMAL(12,2) NOT NULL COMMENT '总租金',
  `total_deposit` DECIMAL(12,2) NOT NULL COMMENT '总押金',
  `total_transport` DECIMAL(12,2) NOT NULL COMMENT '总运费',
  `total_claims` DECIMAL(12,2) NOT NULL COMMENT '总索赔',
  `total_additional` DECIMAL(12,2) NOT NULL COMMENT '总增收',
  `gross_amount` DECIMAL(12,2) NOT NULL COMMENT '费用合计',
  
  -- 优惠
  `total_discount` DECIMAL(12,2) NOT NULL COMMENT '总优惠',
  
  -- 应收
  `net_amount` DECIMAL(12,2) NOT NULL COMMENT '应收总额',
  
  -- 已付
  `total_paid` DECIMAL(12,2) NOT NULL COMMENT '已付总额',
  `deposit_paid` DECIMAL(12,2) NOT NULL COMMENT '已付押金',
  `rent_paid` DECIMAL(12,2) NOT NULL COMMENT '已付租金',
  
  -- 押金处理
  `deposit_refund` DECIMAL(12,2) NOT NULL COMMENT '应退押金',
  `deposit_deduction` DECIMAL(12,2) DEFAULT 0.00 COMMENT '押金扣除',
  `deposit_deduction_reason` TEXT NULL COMMENT '扣除原因',
  
  -- 最终结算
  `final_outstanding` DECIMAL(12,2) NOT NULL COMMENT '最终欠款（正数=客户欠，负数=我方欠）',
  `settlement_status` VARCHAR(20) DEFAULT 'draft' COMMENT '状态：draft, confirmed, paid, archived',
  
  -- 时间
  `settlement_date` DATE NOT NULL COMMENT '结算日期',
  `confirmed_at` DATETIME NULL COMMENT '确认时间',
  `paid_at` DATETIME NULL COMMENT '付款时间',
  
  -- 附件
  `attachments` JSON NULL COMMENT '结算附件',
  `notes` TEXT NULL COMMENT '备注',
  
  `created_by` INT NULL COMMENT '制单人',
  `approved_by` INT NULL COMMENT '审批人',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_settlement_number` (`settlement_number`),
  UNIQUE KEY `uniq_settlement_order_id` (`order_id`),
  INDEX `idx_order_settlements_status` (`settlement_status`),
  CONSTRAINT `fk_order_settlements_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单结算表';

-- 8️⃣ 扩展 orders 表，添加归档字段
ALTER TABLE `orders` 
ADD COLUMN `archived_at` DATETIME NULL COMMENT '归档时间',
ADD COLUMN `archived_by` INT NULL COMMENT '归档人',
ADD COLUMN `archive_notes` TEXT NULL COMMENT '归档说明',
ADD COLUMN `archive_status` VARCHAR(20) DEFAULT 'active' COMMENT '归档状态：active, archived',
ADD COLUMN `archive_file` VARCHAR(500) NULL COMMENT '归档文件路径';

-- 为归档字段添加索引
ALTER TABLE `orders` 
ADD INDEX `idx_orders_archive_status` (`archive_status`);

-- 9️⃣ 增强 order_entries 和 order_exits 表，添加设备关联
ALTER TABLE `order_entries` 
ADD COLUMN `equipment_id` INT NULL COMMENT '关联设备ID' AFTER `order_id`,
ADD INDEX `idx_order_entries_equipment_id` (`equipment_id`);

ALTER TABLE `order_exits` 
ADD COLUMN `equipment_id` INT NULL COMMENT '关联设备ID' AFTER `order_id`,
ADD INDEX `idx_order_exits_equipment_id` (`equipment_id`);

-- 🔟 确保 equipments 表有正确的租赁状态字段
ALTER TABLE `equipments` 
MODIFY COLUMN `rental_status` VARCHAR(50) DEFAULT 'available' 
COMMENT '租赁状态: available, rented, maintenance, reserved, damaged, scrapped';

ALTER TABLE `equipments`
ADD INDEX `idx_equipments_rental_status` (`rental_status`);

-- ============================================
-- 数据初始化（可选）
-- ============================================

-- 插入一些示例报停类型配置（可选，也可以在应用层管理）
-- CREATE TABLE IF NOT EXISTS `suspension_type_configs` (...);

-- ============================================
-- 迁移完成
-- ============================================

SELECT '✅ 订单履约全流程表结构创建完成！' AS message;
SELECT '📋 新增表：' AS info;
SELECT '  - order_suspensions (报停记录)' AS tables;
SELECT '  - order_claims (索赔记录)' AS tables;
SELECT '  - order_bills (账单)' AS tables;
SELECT '  - order_reconciliations (对账记录)' AS tables;
SELECT '  - order_discounts (优惠记录)' AS tables;
SELECT '  - order_additional_charges (增收记录)' AS tables;
SELECT '  - order_settlements (结算)' AS tables;
SELECT '🔧 扩展表：' AS info;
SELECT '  - orders (添加归档字段)' AS tables;
SELECT '  - order_entries (添加 equipment_id)' AS tables;
SELECT '  - order_exits (添加 equipment_id)' AS tables;
SELECT '  - equipments (优化 rental_status)' AS tables;

