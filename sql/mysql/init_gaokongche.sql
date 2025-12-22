-- ============================================
-- 高空车租赁系统数据库初始化脚本
-- 数据库名: gaokongche
-- ============================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS `gaokongche`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `gaokongche`;

-- ============================================
-- 1. 基础数据表
-- ============================================

-- 客户表
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `mongo_id` VARCHAR(24) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `contact` VARCHAR(255) NULL,
  `phone` VARCHAR(50) NULL,
  `address` VARCHAR(255) NULL,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_customers_mongo_id` (`mongo_id`),
  KEY `idx_customers_is_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 员工表
CREATE TABLE IF NOT EXISTS `employees` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `mongo_id` VARCHAR(24) NOT NULL,
  `user_id` INT NULL COMMENT '关联用户ID',
  `company_id` INT NULL COMMENT '公司ID',
  `name` VARCHAR(255) NOT NULL,
  `role` VARCHAR(100) NULL,
  `email` VARCHAR(255) NULL,
  `phone` VARCHAR(50) NULL,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_employees_mongo_id` (`mongo_id`),
  KEY `idx_employees_is_deleted` (`is_deleted`),
  KEY `idx_employees_user_id` (`user_id`),
  KEY `idx_employees_company_id` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 型号表
CREATE TABLE IF NOT EXISTS `models` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `mongo_id` VARCHAR(24) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `spec` VARCHAR(255) NULL,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_models_mongo_id` (`mongo_id`),
  KEY `idx_models_is_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 设备型号表（新版）
CREATE TABLE IF NOT EXISTS `equipment_models` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `category` VARCHAR(100) NOT NULL COMMENT '设备类别',
  `brand` VARCHAR(100) NOT NULL COMMENT '品牌',
  `model` VARCHAR(100) NOT NULL COMMENT '型号',
  `type` VARCHAR(100) NOT NULL COMMENT '类型',
  `height` DECIMAL(6,2) NOT NULL COMMENT '高度(米)',
  `drive_type` VARCHAR(50) NOT NULL COMMENT '驱动方式',
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_equipment_models_brand_model` (`brand`, `model`),
  KEY `idx_equipment_models_is_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 设备表
CREATE TABLE IF NOT EXISTS `equipments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `mongo_id` VARCHAR(24) NOT NULL,
  `model_id` INT NULL,
  `serial_no` VARCHAR(100) NULL,
  `status` VARCHAR(50) NULL,
  `equipment_code` VARCHAR(50) NULL COMMENT '设备编码',
  `category` VARCHAR(100) NULL COMMENT '设备类别',
  `brand` VARCHAR(100) NULL COMMENT '品牌',
  `model` VARCHAR(100) NULL COMMENT '型号',
  `type` VARCHAR(100) NULL COMMENT '类型',
  `height` DECIMAL(6,2) NULL COMMENT '高度',
  `drive_type` VARCHAR(50) NULL COMMENT '驱动方式',
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_equipments_mongo_id` (`mongo_id`),
  UNIQUE KEY `uniq_equipments_equipment_code` (`equipment_code`),
  KEY `fk_equipments_model_id` (`model_id`),
  KEY `idx_equipments_is_deleted` (`is_deleted`),
  CONSTRAINT `fk_equipments_model_id` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. 订单相关表
-- ============================================

-- 订单主表
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `mongo_id` VARCHAR(24) NOT NULL,
  `contract_number` VARCHAR(50) NULL,
  `lessor_id` INT NULL COMMENT '出租方ID',
  `lessor_company_id` INT NULL COMMENT '出租方公司ID',
  `customer_id` INT NULL COMMENT '客户ID',
  `project_name` VARCHAR(255) NULL,
  `business_manager_id` INT NULL,
  `delivery_location` VARCHAR(255) NULL,
  `payment_agreement` VARCHAR(255) NULL,
  `month_calculation_method` VARCHAR(100) NULL,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_orders_mongo_id` (`mongo_id`),
  UNIQUE KEY `uniq_orders_contract_number` (`contract_number`),
  KEY `fk_orders_lessor_id` (`lessor_id`),
  KEY `fk_orders_customer_id` (`customer_id`),
  KEY `fk_orders_business_manager_id` (`business_manager_id`),
  KEY `idx_orders_is_deleted` (`is_deleted`),
  CONSTRAINT `fk_orders_lessor_id` FOREIGN KEY (`lessor_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_orders_customer_id` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_orders_business_manager_id` FOREIGN KEY (`business_manager_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 订单明细表
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL COMMENT '订单ID',
  `equipment_type` VARCHAR(100) NULL COMMENT '设备类型',
  `height` VARCHAR(50) NULL COMMENT '高度',
  `quantity` INT NULL DEFAULT 1 COMMENT '数量',
  `daily_rate` DECIMAL(10,2) NULL COMMENT '日租金',
  `monthly_rate` DECIMAL(10,2) NULL COMMENT '月租金',
  `deposit` DECIMAL(10,2) NULL COMMENT '押金',
  `shipping_fee` DECIMAL(10,2) NULL COMMENT '运费',
  `modification_fee` DECIMAL(10,2) NULL COMMENT '改装费',
  `scheduled_entry_date` DATE NULL COMMENT '计划进场日期',
  `estimated_exit_date` DATE NULL COMMENT '预计退场日期',
  `rental_period` INT NULL COMMENT '租赁周期（天）',
  `shipping_type` VARCHAR(50) NULL COMMENT '运输方式',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_order_items_order_id` (`order_id`),
  CONSTRAINT `fk_order_items_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 进场记录表
CREATE TABLE IF NOT EXISTS `order_entries` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `equipment_id` INT NULL,
  `entry_date` DATE NULL,
  `entry_location` VARCHAR(255) NULL COMMENT '进场地点',
  `entry_person` VARCHAR(100) NULL COMMENT '进场负责人',
  `entry_contact` VARCHAR(50) NULL COMMENT '进场联系电话',
  `attachments_json` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_order_entries_order_id` (`order_id`),
  KEY `fk_order_entries_equipment_id` (`equipment_id`),
  CONSTRAINT `fk_order_entries_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `fk_order_entries_equipment_id` FOREIGN KEY (`equipment_id`) REFERENCES `equipments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 退场记录表
CREATE TABLE IF NOT EXISTS `order_exits` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `equipment_id` INT NULL,
  `exit_date` DATE NULL,
  `attachments_json` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_order_exits_order_id` (`order_id`),
  KEY `fk_order_exits_equipment_id` (`equipment_id`),
  CONSTRAINT `fk_order_exits_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `fk_order_exits_equipment_id` FOREIGN KEY (`equipment_id`) REFERENCES `equipments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 收款记录表
CREATE TABLE IF NOT EXISTS `order_receipts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `receipt_date` DATE NULL,
  `attachments_json` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_order_receipts_order_id` (`order_id`),
  CONSTRAINT `fk_order_receipts_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 退款记录表
CREATE TABLE IF NOT EXISTS `order_refunds` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `refund_date` DATE NULL,
  `attachments_json` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_order_refunds_order_id` (`order_id`),
  CONSTRAINT `fk_order_refunds_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 结算记录表
CREATE TABLE IF NOT EXISTS `order_settlements` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `settlement_date` DATE NULL,
  `diff_json` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_order_settlements_order_id` (`order_id`),
  CONSTRAINT `fk_order_settlements_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 清账记录表
CREATE TABLE IF NOT EXISTS `order_clearances` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `clearance_date` DATE NULL,
  `attachments_json` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_order_clearances_order_id` (`order_id`),
  CONSTRAINT `fk_order_clearances_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 索赔记录表
CREATE TABLE IF NOT EXISTS `order_claims` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `claim_date` DATE NULL,
  `attachments_json` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_order_claims_order_id` (`order_id`),
  CONSTRAINT `fk_order_claims_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 报停记录表
CREATE TABLE IF NOT EXISTS `order_suspensions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `equipment_id` INT NULL,
  `suspension_date` DATE NULL COMMENT '报停日期',
  `resume_date` DATE NULL COMMENT '恢复日期',
  `reason` VARCHAR(500) NULL COMMENT '报停原因',
  `attachments_json` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_order_suspensions_order_id` (`order_id`),
  KEY `fk_order_suspensions_equipment_id` (`equipment_id`),
  CONSTRAINT `fk_order_suspensions_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `fk_order_suspensions_equipment_id` FOREIGN KEY (`equipment_id`) REFERENCES `equipments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. 保险相关表
-- ============================================

-- 保险保单表
CREATE TABLE IF NOT EXISTS `insurance_policies` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `number` VARCHAR(64) NOT NULL COMMENT '保单号',
  `company` VARCHAR(255) NOT NULL COMMENT '保险公司',
  `rate` DECIMAL(5,2) NOT NULL COMMENT '费率',
  `start_date` DATE NOT NULL COMMENT '起保日期',
  `end_date` DATE NOT NULL COMMENT '止保日期',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_insurance_number` (`number`),
  KEY `idx_insurance_company` (`company`),
  KEY `idx_insurance_start_date` (`start_date`),
  KEY `idx_insurance_end_date` (`end_date`),
  CHECK (`rate` >= 0 AND `rate` <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 保单设备关联表
CREATE TABLE IF NOT EXISTS `policy_equipments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `policy_id` INT NOT NULL,
  `equipment_id` INT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_policy_equipments_policy_id` (`policy_id`),
  KEY `fk_policy_equipments_equipment_id` (`equipment_id`),
  CONSTRAINT `fk_policy_equipments_policy_id` FOREIGN KEY (`policy_id`) REFERENCES `insurance_policies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_policy_equipments_equipment_id` FOREIGN KEY (`equipment_id`) REFERENCES `equipments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 保单设备关联表(规范命名)
CREATE TABLE IF NOT EXISTS `policy_devices` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `policy_id` INT NOT NULL,
  `device_id` INT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_policy_devices_policy_id` (`policy_id`),
  KEY `fk_policy_devices_device_id` (`device_id`),
  KEY `idx_policy_devices_policy_device` (`policy_id`, `device_id`),
  CONSTRAINT `fk_policy_devices_policy_id` FOREIGN KEY (`policy_id`) REFERENCES `insurance_policies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_policy_devices_device_id` FOREIGN KEY (`device_id`) REFERENCES `equipments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 保单附件表
CREATE TABLE IF NOT EXISTS `policy_attachments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `policy_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `size` INT NOT NULL,
  `storage_path` VARCHAR(255) NOT NULL,
  `iv` VARBINARY(16) NOT NULL,
  `auth_tag` VARBINARY(16) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_policy_attachments_policy_id` (`policy_id`),
  CONSTRAINT `fk_policy_attachments_policy_id` FOREIGN KEY (`policy_id`) REFERENCES `insurance_policies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. 门店和公司相关表
-- ============================================

-- 门店表
CREATE TABLE IF NOT EXISTS `stores` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  `manager_id` INT DEFAULT NULL,
  `manager_name` VARCHAR(255) DEFAULT NULL,
  `manager_phone` VARCHAR(50) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_stores_manager_id` (`manager_id`),
  CONSTRAINT `fk_stores_manager_id` FOREIGN KEY (`manager_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 公司认证表
CREATE TABLE IF NOT EXISTS `company_verifications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `company_name` VARCHAR(255) NOT NULL,
  `company_address` VARCHAR(255) DEFAULT NULL,
  `credit_code` VARCHAR(18) NOT NULL,
  `bank_account` VARCHAR(64) DEFAULT NULL,
  `bank_name` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_company_verifications_credit_code` (`credit_code`),
  KEY `idx_company_verifications_company_name` (`company_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. 物流相关表
-- ============================================

-- 物流车辆表
CREATE TABLE IF NOT EXISTS `logistics_vehicles` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `plate_number` VARCHAR(50) NOT NULL COMMENT '车牌号',
  `spec` VARCHAR(255) DEFAULT NULL COMMENT '规格',
  `remark` VARCHAR(255) DEFAULT NULL COMMENT '备注',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_logistics_vehicles_plate` (`plate_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 物流司机表
CREATE TABLE IF NOT EXISTS `logistics_drivers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL COMMENT '姓名',
  `phone` VARCHAR(50) NOT NULL COMMENT '电话',
  `remark` VARCHAR(255) DEFAULT NULL COMMENT '备注',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_logistics_drivers_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 物流公司表
CREATE TABLE IF NOT EXISTS `logistics_companies` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL COMMENT '公司名称',
  `contact_person` VARCHAR(100) DEFAULT NULL COMMENT '联系人',
  `contact_phone` VARCHAR(50) DEFAULT NULL COMMENT '联系电话',
  `pricing_rule` VARCHAR(255) DEFAULT NULL COMMENT '计价规则',
  `remark` VARCHAR(255) DEFAULT NULL COMMENT '备注',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_logistics_companies_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 物流台账表
CREATE TABLE IF NOT EXISTS `logistics_ledger` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL COMMENT '订单ID',
  `transport_type` VARCHAR(50) NOT NULL COMMENT '运输类型：进场/退场',
  `transport_date` DATE NOT NULL COMMENT '运输日期',
  `driver_id` INT NULL COMMENT '司机ID',
  `vehicle_id` INT NULL COMMENT '车辆ID',
  `company_id` INT NULL COMMENT '物流公司ID',
  `freight_amount` DECIMAL(10,2) NULL COMMENT '运费金额',
  `remark` VARCHAR(500) NULL COMMENT '备注',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `fk_logistics_ledger_order_id` (`order_id`),
  KEY `fk_logistics_ledger_driver_id` (`driver_id`),
  KEY `fk_logistics_ledger_vehicle_id` (`vehicle_id`),
  KEY `fk_logistics_ledger_company_id` (`company_id`),
  CONSTRAINT `fk_logistics_ledger_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `fk_logistics_ledger_driver_id` FOREIGN KEY (`driver_id`) REFERENCES `logistics_drivers` (`id`),
  CONSTRAINT `fk_logistics_ledger_vehicle_id` FOREIGN KEY (`vehicle_id`) REFERENCES `logistics_vehicles` (`id`),
  CONSTRAINT `fk_logistics_ledger_company_id` FOREIGN KEY (`company_id`) REFERENCES `logistics_companies` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. 用户认证和权限表
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名（登录用）',
  `email` VARCHAR(255) NULL COMMENT '邮箱',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'bcrypt密码哈希',
  `name` VARCHAR(100) NOT NULL COMMENT '真实姓名',
  `role` VARCHAR(50) NOT NULL DEFAULT 'user' COMMENT '角色：admin, manager, user',
  `department` VARCHAR(100) NULL COMMENT '部门',
  `phone` VARCHAR(50) NULL COMMENT '联系电话',
  `avatar_url` VARCHAR(500) NULL COMMENT '头像URL',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '账号是否激活',
  `is_locked` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '账号是否锁定',
  `failed_login_attempts` INT NOT NULL DEFAULT 0 COMMENT '登录失败次数',
  `last_login_at` DATETIME(3) NULL COMMENT '最后登录时间',
  `last_login_ip` VARCHAR(45) NULL COMMENT '最后登录IP',
  `password_changed_at` DATETIME(3) NULL COMMENT '密码最后修改时间',
  `company_id` INT NULL COMMENT '所属公司ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `created_by` INT NULL COMMENT '创建人ID',
  `updated_by` INT NULL COMMENT '更新人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_users_username` (`username`),
  UNIQUE KEY `uniq_users_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_is_active` (`is_active`),
  KEY `idx_users_company_id` (`company_id`),
  KEY `idx_users_created_at` (`created_at`),
  CONSTRAINT `fk_users_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_users_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 用户权限表
CREATE TABLE IF NOT EXISTS `user_permissions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `permission` VARCHAR(100) NOT NULL COMMENT '权限标识',
  `granted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '授权时间',
  `granted_by` INT NULL COMMENT '授权人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_permission` (`user_id`, `permission`),
  KEY `idx_user_permissions_permission` (`permission`),
  CONSTRAINT `fk_user_permissions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_permissions_granted_by` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户权限表';

-- 用户会话表
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `token_jti` VARCHAR(64) NOT NULL COMMENT 'JWT Token ID',
  `ip_address` VARCHAR(45) NULL COMMENT '登录IP',
  `user_agent` VARCHAR(500) NULL COMMENT '用户代理',
  `device_info` VARCHAR(255) NULL COMMENT '设备信息',
  `expires_at` DATETIME(3) NOT NULL COMMENT 'Token过期时间',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `last_activity_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '最后活动时间',
  `revoked_at` DATETIME(3) NULL COMMENT '撤销时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_sessions_token_jti` (`token_jti`),
  KEY `idx_sessions_user_id` (`user_id`),
  KEY `idx_sessions_expires_at` (`expires_at`),
  KEY `idx_sessions_revoked_at` (`revoked_at`),
  CONSTRAINT `fk_user_sessions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户会话表';

-- Token黑名单
CREATE TABLE IF NOT EXISTS `revoked_tokens` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `token_jti` VARCHAR(64) NOT NULL COMMENT 'JWT Token ID',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `revoked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '撤销时间',
  `reason` VARCHAR(255) NULL COMMENT '撤销原因',
  `expires_at` DATETIME(3) NOT NULL COMMENT 'Token原始过期时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_revoked_tokens_jti` (`token_jti`),
  KEY `idx_revoked_tokens_expires_at` (`expires_at`),
  KEY `idx_revoked_tokens_user_id` (`user_id`),
  CONSTRAINT `fk_revoked_tokens_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Token黑名单';

-- 审计日志表
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` INT NULL COMMENT '操作用户ID',
  `username` VARCHAR(50) NULL COMMENT '用户名',
  `action` VARCHAR(100) NOT NULL COMMENT '操作类型',
  `resource_type` VARCHAR(50) NULL COMMENT '资源类型',
  `resource_id` VARCHAR(50) NULL COMMENT '资源ID',
  `details` JSON NULL COMMENT '操作详情',
  `ip_address` VARCHAR(45) NULL COMMENT '操作IP',
  `user_agent` VARCHAR(500) NULL COMMENT '用户代理',
  `status` VARCHAR(20) NOT NULL DEFAULT 'success' COMMENT '操作状态',
  `error_message` TEXT NULL COMMENT '错误信息',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_user_id` (`user_id`),
  KEY `idx_audit_logs_action` (`action`),
  KEY `idx_audit_logs_resource` (`resource_type`, `resource_id`),
  KEY `idx_audit_logs_created_at` (`created_at`),
  KEY `idx_audit_logs_username` (`username`),
  CONSTRAINT `fk_audit_logs_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审计日志表';

-- 密码重置令牌表
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `token` VARCHAR(255) NOT NULL COMMENT '重置令牌',
  `expires_at` DATETIME(3) NOT NULL COMMENT '过期时间',
  `used_at` DATETIME(3) NULL COMMENT '使用时间',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_password_reset_token` (`token`),
  KEY `idx_password_reset_user_id` (`user_id`),
  KEY `idx_password_reset_expires_at` (`expires_at`),
  CONSTRAINT `fk_password_reset_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='密码重置令牌表';

-- 系统配置表
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(100) NOT NULL COMMENT '配置键',
  `value` TEXT NULL COMMENT '配置值',
  `type` VARCHAR(20) NOT NULL DEFAULT 'string' COMMENT '值类型',
  `description` VARCHAR(500) NULL COMMENT '配置说明',
  `is_public` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否公开',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `updated_by` INT NULL COMMENT '更新人ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_system_settings_key` (`key`),
  CONSTRAINT `fk_system_settings_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- ============================================
-- 7. 多租户支持表
-- ============================================

-- 公司表（多租户）
CREATE TABLE IF NOT EXISTS `companies` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL COMMENT '公司名称',
  `code` VARCHAR(50) NOT NULL COMMENT '公司编码',
  `contact_person` VARCHAR(100) NULL COMMENT '联系人',
  `contact_phone` VARCHAR(50) NULL COMMENT '联系电话',
  `address` VARCHAR(500) NULL COMMENT '公司地址',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否激活',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_companies_code` (`code`),
  KEY `idx_companies_name` (`name`),
  KEY `idx_companies_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公司表（多租户）';

-- 权限表
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(100) NOT NULL COMMENT '权限代码',
  `name` VARCHAR(100) NOT NULL COMMENT '权限名称',
  `description` VARCHAR(500) NULL COMMENT '权限描述',
  `resource` VARCHAR(50) NOT NULL COMMENT '资源类型',
  `action` VARCHAR(50) NOT NULL COMMENT '操作类型',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_permissions_code` (`code`),
  KEY `idx_permissions_resource_action` (`resource`, `action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

-- 角色表
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL COMMENT '角色名称',
  `description` VARCHAR(500) NULL COMMENT '角色描述',
  `company_id` INT NULL COMMENT '所属公司ID（NULL表示系统级角色）',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_roles_name_company` (`name`, `company_id`),
  KEY `idx_roles_company_id` (`company_id`),
  CONSTRAINT `fk_roles_company_id` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- 角色权限关联表
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `role_id` INT NOT NULL,
  `permission_id` INT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_role_permission` (`role_id`, `permission_id`),
  KEY `idx_role_permissions_role_id` (`role_id`),
  KEY `idx_role_permissions_permission_id` (`permission_id`),
  CONSTRAINT `fk_role_permissions_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_role_permissions_permission_id` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

-- 用户角色关联表
CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `role_id` INT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_role` (`user_id`, `role_id`),
  KEY `idx_user_roles_user_id` (`user_id`),
  KEY `idx_user_roles_role_id` (`role_id`),
  CONSTRAINT `fk_user_roles_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_role_id` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';

-- ============================================
-- 8. 初始化数据
-- ============================================

-- 插入默认系统配置
INSERT INTO `system_settings` (`key`, `value`, `type`, `description`, `is_public`) VALUES
  ('site_name', '高空车租赁管理系统', 'string', '系统名称', 1),
  ('password_min_length', '8', 'number', '密码最小长度', 0),
  ('max_login_attempts', '5', 'number', '最大登录尝试次数', 0),
  ('session_timeout', '86400', 'number', '会话超时时间（秒）', 0),
  ('enable_audit_log', 'true', 'boolean', '是否启用审计日志', 0)
ON DUPLICATE KEY UPDATE `key`=`key`;

-- 插入默认公司（系统公司）
INSERT INTO `companies` (`id`, `name`, `code`, `is_active`) VALUES
  (1, '系统默认公司', 'SYSTEM', 1)
ON DUPLICATE KEY UPDATE `code`=`code`;

-- 插入默认管理员用户（密码：Admin@123）
-- 注意：这是bcrypt加密后的密码，对应明文：Admin@123
INSERT INTO `users` (`username`, `email`, `password_hash`, `name`, `role`, `is_active`, `company_id`) VALUES
  ('admin', 'admin@gaokongche.com', '$2a$10$YourBcryptHashHere', '系统管理员', 'admin', 1, 1)
ON DUPLICATE KEY UPDATE `username`=`username`;

-- ============================================
-- 完成
-- ============================================
SELECT 'Database gaokongche initialized successfully!' AS status;
