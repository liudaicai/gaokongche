-- ==========================================
-- 转租管理系统数据库表
-- ==========================================

-- 1. 转租公司表
CREATE TABLE IF NOT EXISTS `sublease_companies` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `company_name` VARCHAR(255) NOT NULL COMMENT '公司名称',
  `contact_person` VARCHAR(100) NULL COMMENT '联系人',
  `contact_phone` VARCHAR(50) NULL COMMENT '联系电话',
  `contact_email` VARCHAR(255) NULL COMMENT '联系邮箱',
  `address` VARCHAR(500) NULL COMMENT '公司地址',
  `business_license` VARCHAR(100) NULL COMMENT '营业执照号',
  `tax_id` VARCHAR(100) NULL COMMENT '税号',
  `bank_name` VARCHAR(100) NULL COMMENT '开户银行',
  `bank_account` VARCHAR(100) NULL COMMENT '银行账号',
  `credit_rating` DECIMAL(3,1) DEFAULT 5.0 COMMENT '信用评分（0-5）',
  `renting_count` INT DEFAULT 0 COMMENT '转租中设备数量',
  `returned_count` INT DEFAULT 0 COMMENT '已还租设备数量',
  `idle_count` INT DEFAULT 0 COMMENT '闲置设备数量',
  `total_payable` DECIMAL(12,2) DEFAULT 0.00 COMMENT '应付总金额',
  `total_paid` DECIMAL(12,2) DEFAULT 0.00 COMMENT '已付总金额',
  `outstanding_amount` DECIMAL(12,2) DEFAULT 0.00 COMMENT '剩余应付金额',
  `remark` TEXT COMMENT '备注',
  `status` ENUM('active', 'inactive', 'blacklist') DEFAULT 'active' COMMENT '状态：正常/停用/黑名单',
  `created_by` INT NULL COMMENT '创建人ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `idx_company_name` (`company_name`),
  INDEX `idx_contact_person` (`contact_person`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='转租公司表';

-- 2. 转租设备表
CREATE TABLE IF NOT EXISTS `sublease_equipments` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL COMMENT '转租公司ID',
  `company_name` VARCHAR(255) NOT NULL COMMENT '转租公司名称',
  `equipment_code` VARCHAR(100) NULL COMMENT '自编号',
  `factory_number` VARCHAR(100) NULL COMMENT '出厂编码',
  `category` VARCHAR(50) NOT NULL COMMENT '设备类别',
  `equipment_type` VARCHAR(100) NOT NULL COMMENT '设备类型',
  `model` VARCHAR(100) NULL COMMENT '型号',
  `brand` VARCHAR(100) NULL COMMENT '品牌',
  `height` VARCHAR(50) NULL COMMENT '高度',
  `daily_rate` DECIMAL(10,2) DEFAULT 0.00 COMMENT '日租金',
  `monthly_rate` DECIMAL(10,2) DEFAULT 0.00 COMMENT '月租金',
  `deposit` DECIMAL(10,2) DEFAULT 0.00 COMMENT '押金',
  `start_date` DATE NULL COMMENT '起租日期',
  `end_date` DATE NULL COMMENT '计划还租日期',
  `actual_return_date` DATE NULL COMMENT '实际还租日期',
  `rental_days` INT DEFAULT 0 COMMENT '租赁天数',
  `total_cost` DECIMAL(12,2) DEFAULT 0.00 COMMENT '总成本',
  `paid_amount` DECIMAL(12,2) DEFAULT 0.00 COMMENT '已付金额',
  `outstanding_amount` DECIMAL(12,2) DEFAULT 0.00 COMMENT '未付金额',
  `status` ENUM('idle', 'renting', 'returned', 'suspended', 'maintenance') DEFAULT 'idle' COMMENT '状态：闲置/转租中/已还租/报停/维修中',
  `suspension_reason` TEXT COMMENT '报停原因',
  `suspension_start_date` DATE NULL COMMENT '报停开始日期',
  `suspension_end_date` DATE NULL COMMENT '报停结束日期',
  `linked_order_id` INT NULL COMMENT '关联的客户订单ID',
  `linked_order_number` VARCHAR(100) NULL COMMENT '关联的客户订单编号',
  `remark` TEXT COMMENT '备注',
  `created_by` INT NULL COMMENT '创建人ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `idx_company_id` (`company_id`),
  INDEX `idx_equipment_code` (`equipment_code`),
  INDEX `idx_factory_number` (`factory_number`),
  INDEX `idx_status` (`status`),
  INDEX `idx_start_date` (`start_date`),
  FOREIGN KEY (`company_id`) REFERENCES `sublease_companies`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='转租设备表';

-- 3. 转租付款记录表
CREATE TABLE IF NOT EXISTS `sublease_payments` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL COMMENT '转租公司ID',
  `company_name` VARCHAR(255) NOT NULL COMMENT '转租公司名称',
  `payment_number` VARCHAR(50) NOT NULL UNIQUE COMMENT '付款单号',
  `payment_date` DATE NOT NULL COMMENT '付款日期',
  `payment_amount` DECIMAL(12,2) NOT NULL COMMENT '付款金额',
  `payment_method` ENUM('cash', 'transfer', 'check', 'other') DEFAULT 'transfer' COMMENT '付款方式',
  `payment_account` VARCHAR(100) NULL COMMENT '付款账户',
  `related_equipment_ids` JSON NULL COMMENT '关联设备ID列表',
  `receipt_url` VARCHAR(500) NULL COMMENT '收据URL',
  `handler_id` INT NULL COMMENT '经办人ID',
  `handler_name` VARCHAR(50) NULL COMMENT '经办人姓名',
  `remark` TEXT COMMENT '备注',
  `created_by` INT NULL COMMENT '创建人ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `idx_company_id` (`company_id`),
  INDEX `idx_payment_number` (`payment_number`),
  INDEX `idx_payment_date` (`payment_date`),
  FOREIGN KEY (`company_id`) REFERENCES `sublease_companies`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='转租付款记录表';

-- 4. 转租对账记录表
CREATE TABLE IF NOT EXISTS `sublease_reconciliations` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `company_id` INT NOT NULL COMMENT '转租公司ID',
  `company_name` VARCHAR(255) NOT NULL COMMENT '转租公司名称',
  `reconciliation_number` VARCHAR(50) NOT NULL UNIQUE COMMENT '对账单号',
  `reconciliation_date` DATE NOT NULL COMMENT '对账日期',
  `start_date` DATE NULL COMMENT '对账起始日期',
  `end_date` DATE NULL COMMENT '对账结束日期',
  `reconciliation_amount` DECIMAL(12,2) NOT NULL COMMENT '对账金额',
  `related_equipment_ids` JSON NULL COMMENT '关联设备ID列表',
  `status` ENUM('pending', 'confirmed', 'rejected') DEFAULT 'pending' COMMENT '状态：待确认/已确认/已拒绝',
  `confirmed_by` INT NULL COMMENT '确认人ID',
  `confirmed_at` DATETIME(3) NULL COMMENT '确认时间',
  `attachment_url` VARCHAR(500) NULL COMMENT '附件URL',
  `remark` TEXT COMMENT '备注',
  `created_by` INT NULL COMMENT '创建人ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX `idx_company_id` (`company_id`),
  INDEX `idx_reconciliation_number` (`reconciliation_number`),
  INDEX `idx_status` (`status`),
  FOREIGN KEY (`company_id`) REFERENCES `sublease_companies`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='转租对账记录表';

-- 5. 创建视图：转租公司统计
CREATE OR REPLACE VIEW `sublease_company_stats` AS
SELECT 
  sc.id,
  sc.company_name,
  sc.contact_person,
  sc.contact_phone,
  COUNT(CASE WHEN se.status = 'renting' THEN 1 END) as renting_count,
  COUNT(CASE WHEN se.status = 'returned' THEN 1 END) as returned_count,
  COUNT(CASE WHEN se.status = 'idle' THEN 1 END) as idle_count,
  SUM(se.total_cost) as total_payable,
  SUM(se.paid_amount) as total_paid,
  SUM(se.outstanding_amount) as outstanding_amount
FROM sublease_companies sc
LEFT JOIN sublease_equipments se ON sc.id = se.company_id
GROUP BY sc.id;

SELECT '✅ 转租管理系统表创建完成' AS result;

