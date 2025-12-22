/**
 * 补充订单核心流程的表结构
 * 包括：订单创建、进场、退场、收款、报停所需的所有字段
 * 创建时间: 2025-11-21
 */

SET @dbname = DATABASE();

-- ============================================================
-- 1. 订单表（orders）- 添加缺失字段
-- ============================================================

-- project_address
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'project_address');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN project_address VARCHAR(255) NULL COMMENT ''项目地址''',
  'SELECT ''Column project_address already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- start_date
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'start_date');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN start_date DATE NULL COMMENT ''开始日期''',
  'SELECT ''Column start_date already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- end_date
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'end_date');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN end_date DATE NULL COMMENT ''结束日期''',
  'SELECT ''Column end_date already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- rental_period
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'rental_period');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN rental_period INT NULL COMMENT ''租赁天数''',
  'SELECT ''Column rental_period already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- status
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'status');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT ''draft'' COMMENT ''订单状态:draft-草稿/pending_entry-待进场/active-进行中/exited-已退场/settled-已结算/cleared-已结清/archived-已归档''',
  'SELECT ''Column status already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- total_amount
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'total_amount');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT ''订单总金额''',
  'SELECT ''Column total_amount already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- deposit_amount
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'deposit_amount');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN deposit_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT ''押金总额''',
  'SELECT ''Column deposit_amount already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- transport_fee
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'transport_fee');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN transport_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT ''运费总额''',
  'SELECT ''Column transport_fee already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- modification_fee
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'modification_fee');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN modification_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT ''改装费总额''',
  'SELECT ''Column modification_fee already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- payment_method
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'payment_method');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT ''cash'' COMMENT ''支付方式:cash-现金/transfer-转账/check-支票/credit-信用支付''',
  'SELECT ''Column payment_method already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- billing_method
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'billing_method');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN billing_method VARCHAR(20) NOT NULL DEFAULT ''daily'' COMMENT ''计费方式:daily-日租/monthly-月租''',
  'SELECT ''Column billing_method already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- notes
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'notes');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN notes TEXT NULL COMMENT ''备注''',
  'SELECT ''Column notes already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- created_by
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'created_by');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN created_by INT NULL COMMENT ''创建人ID''',
  'SELECT ''Column created_by already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
-- 2. 订单设备需求表（order_equipment_demands）- 新建
-- ============================================================

CREATE TABLE IF NOT EXISTS `order_equipment_demands` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL COMMENT '订单ID',
  `equipment_type` VARCHAR(50) NOT NULL COMMENT '设备类型',
  `equipment_brand` VARCHAR(50) NULL COMMENT '设备品牌',
  `equipment_height` VARCHAR(50) NULL COMMENT '设备高度',
  `equipment_model` VARCHAR(100) NULL COMMENT '设备型号',
  
  -- 租赁信息
  `quantity` INT NOT NULL DEFAULT 1 COMMENT '数量',
  `rental_period` INT NOT NULL COMMENT '租赁天数',
  `daily_rate` DECIMAL(12,2) NOT NULL COMMENT '日租金',
  `monthly_rate` DECIMAL(12,2) NOT NULL COMMENT '月租金',
  `calculated_rent` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '计算后租金',
  
  -- 其他费用
  `deposit` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '押金',
  `transport_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '运费',
  `modification_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '改装费',
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '小计金额',
  
  -- 备注
  `notes` TEXT NULL COMMENT '备注',
  
  -- 系统字段
  `company_id` INT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_company_id` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单设备需求表';

-- ============================================================
-- 3. 进场记录表（order_entries）- 添加缺失字段
-- ============================================================

-- meter_reading
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_entries' AND COLUMN_NAME = 'meter_reading');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_entries ADD COLUMN meter_reading DECIMAL(10,2) NULL COMMENT ''仪表读数（小时表）''',
  'SELECT ''Column meter_reading already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fuel_level
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_entries' AND COLUMN_NAME = 'fuel_level');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_entries ADD COLUMN fuel_level VARCHAR(20) NULL COMMENT ''油量/电量:full-满/half-半/low-低''',
  'SELECT ''Column fuel_level already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- equipment_condition
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_entries' AND COLUMN_NAME = 'equipment_condition');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_entries ADD COLUMN equipment_condition VARCHAR(20) NOT NULL DEFAULT ''good'' COMMENT ''设备状况:good-良好/normal-正常/damaged-损坏''',
  'SELECT ''Column equipment_condition already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- inspection_photos
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_entries' AND COLUMN_NAME = 'inspection_photos');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_entries ADD COLUMN inspection_photos JSON NULL COMMENT ''验收照片''',
  'SELECT ''Column inspection_photos already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- inspection_notes
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_entries' AND COLUMN_NAME = 'inspection_notes');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_entries ADD COLUMN inspection_notes TEXT NULL COMMENT ''验收备注''',
  'SELECT ''Column inspection_notes already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- inspector_name
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_entries' AND COLUMN_NAME = 'inspector_name');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_entries ADD COLUMN inspector_name VARCHAR(50) NULL COMMENT ''验收人姓名''',
  'SELECT ''Column inspector_name already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- driver_name
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_entries' AND COLUMN_NAME = 'driver_name');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_entries ADD COLUMN driver_name VARCHAR(50) NULL COMMENT ''司机姓名''',
  'SELECT ''Column driver_name already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- vehicle_number
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_entries' AND COLUMN_NAME = 'vehicle_number');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_entries ADD COLUMN vehicle_number VARCHAR(20) NULL COMMENT ''车牌号''',
  'SELECT ''Column vehicle_number already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- entry_number
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_entries' AND COLUMN_NAME = 'entry_number');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_entries ADD COLUMN entry_number VARCHAR(50) NOT NULL COMMENT ''进场单号''',
  'SELECT ''Column entry_number already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- status
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_entries' AND COLUMN_NAME = 'status');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_entries ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT ''pending'' COMMENT ''状态:pending-待确认/confirmed-已确认''',
  'SELECT ''Column status already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- company_id
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_entries' AND COLUMN_NAME = 'company_id');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_entries ADD COLUMN company_id INT NULL',
  'SELECT ''Column company_id already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- created_by
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_entries' AND COLUMN_NAME = 'created_by');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_entries ADD COLUMN created_by INT NULL',
  'SELECT ''Column created_by already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- confirmed_by
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_entries' AND COLUMN_NAME = 'confirmed_by');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_entries ADD COLUMN confirmed_by INT NULL',
  'SELECT ''Column confirmed_by already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- confirmed_at
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_entries' AND COLUMN_NAME = 'confirmed_at');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_entries ADD COLUMN confirmed_at DATETIME(3) NULL',
  'SELECT ''Column confirmed_at already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
-- 4. 退场记录表（order_exits）- 添加缺失字段
-- ============================================================

-- return_location
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_exits' AND COLUMN_NAME = 'return_location');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_exits ADD COLUMN return_location VARCHAR(255) NULL COMMENT ''归还地点''',
  'SELECT ''Column return_location already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- meter_reading
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_exits' AND COLUMN_NAME = 'meter_reading');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_exits ADD COLUMN meter_reading DECIMAL(10,2) NULL COMMENT ''仪表读数''',
  'SELECT ''Column meter_reading already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- fuel_level
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_exits' AND COLUMN_NAME = 'fuel_level');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_exits ADD COLUMN fuel_level VARCHAR(20) NULL COMMENT ''油量/电量''',
  'SELECT ''Column fuel_level already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- equipment_condition
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_exits' AND COLUMN_NAME = 'equipment_condition');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_exits ADD COLUMN equipment_condition VARCHAR(20) NOT NULL DEFAULT ''good'' COMMENT ''设备状况''',
  'SELECT ''Column equipment_condition already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- damage_description
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_exits' AND COLUMN_NAME = 'damage_description');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_exits ADD COLUMN damage_description TEXT NULL COMMENT ''损坏描述''',
  'SELECT ''Column damage_description already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- damage_photos
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_exits' AND COLUMN_NAME = 'damage_photos');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_exits ADD COLUMN damage_photos JSON NULL COMMENT ''损坏照片''',
  'SELECT ''Column damage_photos already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- damage_cost
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_exits' AND COLUMN_NAME = 'damage_cost');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_exits ADD COLUMN damage_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT ''损坏赔偿金额''',
  'SELECT ''Column damage_cost already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- inspection_notes
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_exits' AND COLUMN_NAME = 'inspection_notes');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_exits ADD COLUMN inspection_notes TEXT NULL COMMENT ''验收备注''',
  'SELECT ''Column inspection_notes already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- inspector_name
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_exits' AND COLUMN_NAME = 'inspector_name');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_exits ADD COLUMN inspector_name VARCHAR(50) NULL COMMENT ''验收人姓名''',
  'SELECT ''Column inspector_name already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- driver_name
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_exits' AND COLUMN_NAME = 'driver_name');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_exits ADD COLUMN driver_name VARCHAR(50) NULL COMMENT ''司机姓名''',
  'SELECT ''Column driver_name already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- vehicle_number
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_exits' AND COLUMN_NAME = 'vehicle_number');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_exits ADD COLUMN vehicle_number VARCHAR(20) NULL COMMENT ''车牌号''',
  'SELECT ''Column vehicle_number already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- exit_number
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_exits' AND COLUMN_NAME = 'exit_number');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_exits ADD COLUMN exit_number VARCHAR(50) NOT NULL COMMENT ''退场单号''',
  'SELECT ''Column exit_number already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- status
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_exits' AND COLUMN_NAME = 'status');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_exits ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT ''pending'' COMMENT ''状态:pending-待确认/confirmed-已确认''',
  'SELECT ''Column status already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- company_id
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_exits' AND COLUMN_NAME = 'company_id');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_exits ADD COLUMN company_id INT NULL',
  'SELECT ''Column company_id already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- created_by
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_exits' AND COLUMN_NAME = 'created_by');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_exits ADD COLUMN created_by INT NULL',
  'SELECT ''Column created_by already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- confirmed_by
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_exits' AND COLUMN_NAME = 'confirmed_by');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_exits ADD COLUMN confirmed_by INT NULL',
  'SELECT ''Column confirmed_by already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- confirmed_at
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_exits' AND COLUMN_NAME = 'confirmed_at');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_exits ADD COLUMN confirmed_at DATETIME(3) NULL',
  'SELECT ''Column confirmed_at already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
-- 5. 收款记录表（order_receipts）- 添加缺失字段
-- ============================================================

-- receipt_number
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_receipts' AND COLUMN_NAME = 'receipt_number');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_receipts ADD COLUMN receipt_number VARCHAR(50) NOT NULL COMMENT ''收款单号''',
  'SELECT ''Column receipt_number already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- type
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_receipts' AND COLUMN_NAME = 'type');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_receipts ADD COLUMN type VARCHAR(20) NOT NULL COMMENT ''收款类型:deposit-押金/rent-租金/transport-运费/claim-索赔/other-其他''',
  'SELECT ''Column type already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- payment_method
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_receipts' AND COLUMN_NAME = 'payment_method');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_receipts ADD COLUMN payment_method VARCHAR(20) NOT NULL DEFAULT ''cash'' COMMENT ''支付方式:cash-现金/transfer-转账/check-支票/other-其他''',
  'SELECT ''Column payment_method already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- payer_name
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_receipts' AND COLUMN_NAME = 'payer_name');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_receipts ADD COLUMN payer_name VARCHAR(100) NULL COMMENT ''付款人姓名''',
  'SELECT ''Column payer_name already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- bank_account
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_receipts' AND COLUMN_NAME = 'bank_account');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_receipts ADD COLUMN bank_account VARCHAR(50) NULL COMMENT ''银行账号''',
  'SELECT ''Column bank_account already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- transaction_id
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_receipts' AND COLUMN_NAME = 'transaction_id');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_receipts ADD COLUMN transaction_id VARCHAR(100) NULL COMMENT ''交易流水号''',
  'SELECT ''Column transaction_id already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- notes
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_receipts' AND COLUMN_NAME = 'notes');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_receipts ADD COLUMN notes TEXT NULL COMMENT ''备注''',
  'SELECT ''Column notes already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- status
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_receipts' AND COLUMN_NAME = 'status');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_receipts ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT ''pending'' COMMENT ''状态:pending-待审核/approved-已审核/rejected-已拒绝/voided-已作废''',
  'SELECT ''Column status already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- company_id
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_receipts' AND COLUMN_NAME = 'company_id');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_receipts ADD COLUMN company_id INT NULL',
  'SELECT ''Column company_id already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- received_by
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_receipts' AND COLUMN_NAME = 'received_by');
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_receipts' AND COLUMN_NAME = 'received_by');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_receipts ADD COLUMN received_by INT NULL COMMENT ''收款人ID''',
  'SELECT ''Column received_by already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- audited_by
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_receipts' AND COLUMN_NAME = 'audited_by');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_receipts ADD COLUMN audited_by INT NULL COMMENT ''审核人ID''',
  'SELECT ''Column audited_by already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- audited_at
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_receipts' AND COLUMN_NAME = 'audited_at');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_receipts ADD COLUMN audited_at DATETIME(3) NULL COMMENT ''审核时间''',
  'SELECT ''Column audited_at already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- audit_notes
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_receipts' AND COLUMN_NAME = 'audit_notes');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_receipts ADD COLUMN audit_notes TEXT NULL COMMENT ''审核备注''',
  'SELECT ''Column audit_notes already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- void_reason
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_receipts' AND COLUMN_NAME = 'void_reason');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_receipts ADD COLUMN void_reason TEXT NULL COMMENT ''作废原因''',
  'SELECT ''Column void_reason already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- voided_by
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_receipts' AND COLUMN_NAME = 'voided_by');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_receipts ADD COLUMN voided_by INT NULL COMMENT ''作废人ID''',
  'SELECT ''Column voided_by already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- voided_at
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_receipts' AND COLUMN_NAME = 'voided_at');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_receipts ADD COLUMN voided_at DATETIME(3) NULL COMMENT ''作废时间''',
  'SELECT ''Column voided_at already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
-- 6. 报停记录表（order_suspensions）- 添加缺失字段
-- ============================================================

-- pause_reason (替代reason)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_suspensions' AND COLUMN_NAME = 'pause_reason');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_suspensions ADD COLUMN pause_reason TEXT NULL COMMENT ''报停原因''',
  'SELECT ''Column pause_reason already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- pause_start_date (替代suspension_date)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_suspensions' AND COLUMN_NAME = 'pause_start_date');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_suspensions ADD COLUMN pause_start_date DATE NOT NULL COMMENT ''报停开始日期''',
  'SELECT ''Column pause_start_date already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- pause_end_date (替代resume_date)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_suspensions' AND COLUMN_NAME = 'pause_end_date');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_suspensions ADD COLUMN pause_end_date DATE NULL COMMENT ''报停结束日期''',
  'SELECT ''Column pause_end_date already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- estimated_days
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_suspensions' AND COLUMN_NAME = 'estimated_days');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_suspensions ADD COLUMN estimated_days INT NULL COMMENT ''预计报停天数''',
  'SELECT ''Column estimated_days already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- actual_days
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_suspensions' AND COLUMN_NAME = 'actual_days');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_suspensions ADD COLUMN actual_days INT NULL COMMENT ''实际报停天数''',
  'SELECT ''Column actual_days already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- status
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_suspensions' AND COLUMN_NAME = 'status');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_suspensions ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT ''pending'' COMMENT ''状态:pending-待审批/active-生效中/ended-已结束/cancelled-已取消''',
  'SELECT ''Column status already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- company_id
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_suspensions' AND COLUMN_NAME = 'company_id');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_suspensions ADD COLUMN company_id INT NULL',
  'SELECT ''Column company_id already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- created_by
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'order_suspensions' AND COLUMN_NAME = 'created_by');
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_suspensions ADD COLUMN created_by INT NULL',
  'SELECT ''Column created_by already exists'' AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 完成
SELECT '✅ 订单核心流程表结构补充完成' AS message;

