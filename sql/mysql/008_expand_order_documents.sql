-- 扩展进场记录表，支持完整的进场单据信息
ALTER TABLE `order_entries` 
  ADD COLUMN `entry_number` VARCHAR(50) NULL COMMENT '进场单号' AFTER `id`,
  ADD COLUMN `contract_name` VARCHAR(255) NULL COMMENT '合同名称' AFTER `entry_number`,
  ADD COLUMN `equipment_summary` TEXT NULL COMMENT '设备摘要' AFTER `entry_date`,
  ADD COLUMN `equipment_codes` JSON NULL COMMENT '设备编码列表' AFTER `equipment_summary`,
  ADD COLUMN `transport_method` VARCHAR(50) NULL COMMENT '运输方式' AFTER `equipment_codes`,
  ADD COLUMN `business_manager_name` VARCHAR(100) NULL COMMENT '业务经理' AFTER `transport_method`,
  ADD COLUMN `handover_person` VARCHAR(100) NULL COMMENT '交接人' AFTER `business_manager_name`,
  ADD COLUMN `vehicle_id` INT NULL COMMENT '车辆ID' AFTER `handover_person`,
  ADD COLUMN `driver_id` INT NULL COMMENT '司机ID' AFTER `vehicle_id`,
  ADD COLUMN `company_id` INT NULL COMMENT '物流公司ID' AFTER `driver_id`,
  ADD COLUMN `company_contact_name` VARCHAR(100) NULL COMMENT '物流公司联系人' AFTER `company_id`,
  ADD COLUMN `company_contact_phone` VARCHAR(50) NULL COMMENT '物流公司联系电话' AFTER `company_contact_name`,
  ADD COLUMN `logistics_cost` DECIMAL(12,2) NULL COMMENT '物流费用' AFTER `company_contact_phone`,
  ADD COLUMN `vehicle_plate` VARCHAR(50) NULL COMMENT '车牌号' AFTER `logistics_cost`,
  ADD COLUMN `driver_name` VARCHAR(100) NULL COMMENT '司机姓名' AFTER `vehicle_plate`,
  ADD COLUMN `driver_phone` VARCHAR(50) NULL COMMENT '司机电话' AFTER `driver_name`,
  ADD COLUMN `company_name` VARCHAR(255) NULL COMMENT '物流公司名称' AFTER `driver_phone`;

-- 扩展退场记录表，支持完整的退场单据信息
ALTER TABLE `order_exits` 
  ADD COLUMN `exit_number` VARCHAR(50) NULL COMMENT '退场单号' AFTER `id`,
  ADD COLUMN `contract_name` VARCHAR(255) NULL COMMENT '合同名称' AFTER `exit_number`,
  ADD COLUMN `equipment_summary` TEXT NULL COMMENT '设备摘要' AFTER `exit_date`,
  ADD COLUMN `equipment_codes` JSON NULL COMMENT '设备编码列表' AFTER `equipment_summary`,
  ADD COLUMN `transport_method` VARCHAR(50) NULL COMMENT '运输方式' AFTER `equipment_codes`,
  ADD COLUMN `business_manager_name` VARCHAR(100) NULL COMMENT '业务经理' AFTER `transport_method`,
  ADD COLUMN `handover_person` VARCHAR(100) NULL COMMENT '交接人' AFTER `business_manager_name`,
  ADD COLUMN `vehicle_id` INT NULL COMMENT '车辆ID' AFTER `handover_person`,
  ADD COLUMN `driver_id` INT NULL COMMENT '司机ID' AFTER `vehicle_id`,
  ADD COLUMN `company_id` INT NULL COMMENT '物流公司ID' AFTER `driver_id`,
  ADD COLUMN `company_contact_name` VARCHAR(100) NULL COMMENT '物流公司联系人' AFTER `company_id`,
  ADD COLUMN `company_contact_phone` VARCHAR(50) NULL COMMENT '物流公司联系电话' AFTER `company_contact_name`,
  ADD COLUMN `logistics_cost` DECIMAL(12,2) NULL COMMENT '物流费用' AFTER `company_contact_phone`,
  ADD COLUMN `vehicle_plate` VARCHAR(50) NULL COMMENT '车牌号' AFTER `logistics_cost`,
  ADD COLUMN `driver_name` VARCHAR(100) NULL COMMENT '司机姓名' AFTER `vehicle_plate`,
  ADD COLUMN `driver_phone` VARCHAR(50) NULL COMMENT '司机电话' AFTER `driver_name`,
  ADD COLUMN `company_name` VARCHAR(255) NULL COMMENT '物流公司名称' AFTER `driver_phone`;

-- 扩展收款记录表
ALTER TABLE `order_receipts`
  ADD COLUMN `receipt_number` VARCHAR(50) NULL COMMENT '收款单号' AFTER `id`,
  ADD COLUMN `contract_name` VARCHAR(255) NULL COMMENT '合同名称' AFTER `receipt_number`,
  ADD COLUMN `payment_method` VARCHAR(50) NULL COMMENT '支付方式' AFTER `amount`,
  ADD COLUMN `remark` TEXT NULL COMMENT '备注' AFTER `payment_method`;

-- 扩展退款记录表
ALTER TABLE `order_refunds`
  ADD COLUMN `refund_number` VARCHAR(50) NULL COMMENT '退款单号' AFTER `id`,
  ADD COLUMN `contract_name` VARCHAR(255) NULL COMMENT '合同名称' AFTER `refund_number`,
  ADD COLUMN `refund_method` VARCHAR(50) NULL COMMENT '退款方式' AFTER `amount`,
  ADD COLUMN `reason` TEXT NULL COMMENT '退款原因' AFTER `refund_method`;

-- 扩展索赔记录表
ALTER TABLE `order_claims`
  ADD COLUMN `claim_number` VARCHAR(50) NULL COMMENT '索赔单号' AFTER `id`,
  ADD COLUMN `contract_name` VARCHAR(255) NULL COMMENT '合同名称' AFTER `claim_number`,
  ADD COLUMN `claim_type` VARCHAR(50) NULL COMMENT '索赔类型' AFTER `amount`,
  ADD COLUMN `reason` TEXT NULL COMMENT '索赔原因' AFTER `claim_type`,
  ADD COLUMN `equipment_selections` JSON NULL COMMENT '索赔设备选择' AFTER `reason`;

-- 扩展结算记录表
ALTER TABLE `order_settlements`
  ADD COLUMN `settlement_number` VARCHAR(50) NULL COMMENT '结算单号' AFTER `id`,
  ADD COLUMN `contract_name` VARCHAR(255) NULL COMMENT '合同名称' AFTER `settlement_number`;

-- 扩展结清记录表
ALTER TABLE `order_clearances`
  ADD COLUMN `clearance_number` VARCHAR(50) NULL COMMENT '结清单号' AFTER `id`,
  ADD COLUMN `contract_name` VARCHAR(255) NULL COMMENT '合同名称' AFTER `clearance_number`;

-- 为单号字段添加索引以提升查询性能
ALTER TABLE `order_entries` ADD INDEX `idx_entry_number` (`entry_number`);
ALTER TABLE `order_exits` ADD INDEX `idx_exit_number` (`exit_number`);
ALTER TABLE `order_receipts` ADD INDEX `idx_receipt_number` (`receipt_number`);
ALTER TABLE `order_refunds` ADD INDEX `idx_refund_number` (`refund_number`);
ALTER TABLE `order_claims` ADD INDEX `idx_claim_number` (`claim_number`);
ALTER TABLE `order_settlements` ADD INDEX `idx_settlement_number` (`settlement_number`);
ALTER TABLE `order_clearances` ADD INDEX `idx_clearance_number` (`clearance_number`);
