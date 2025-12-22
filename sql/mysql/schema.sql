-- MySQL schema for high_altitude_rental_mysql
-- Charset and collation
CREATE DATABASE IF NOT EXISTS `high_altitude_rental_mysql`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE `high_altitude_rental_mysql`;

-- Customers
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `mongo_id` VARCHAR(24) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `contact` VARCHAR(255) NULL,
  `phone` VARCHAR(50) NULL,
  `address` VARCHAR(255) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_customers_mongo_id` (`mongo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Employees
CREATE TABLE IF NOT EXISTS `employees` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `mongo_id` VARCHAR(24) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `role` VARCHAR(100) NULL,
  `email` VARCHAR(255) NULL,
  `phone` VARCHAR(50) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_employees_mongo_id` (`mongo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Models
CREATE TABLE IF NOT EXISTS `models` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `mongo_id` VARCHAR(24) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `spec` VARCHAR(255) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_models_mongo_id` (`mongo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Equipments
CREATE TABLE IF NOT EXISTS `equipments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `mongo_id` VARCHAR(24) NOT NULL,
  `model_id` INT NULL,
  `serial_no` VARCHAR(100) NULL,
  `status` VARCHAR(50) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_equipments_mongo_id` (`mongo_id`),
  KEY `fk_equipments_model_id` (`model_id`),
  CONSTRAINT `fk_equipments_model_id` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Orders
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `mongo_id` VARCHAR(24) NOT NULL,
  `contract_number` VARCHAR(50) NULL,
  `lessor_id` INT NULL,
  `customer_id` INT NULL,
  `project_name` VARCHAR(255) NULL,
  `business_manager_id` INT NULL,
  `delivery_location` VARCHAR(255) NULL,
  `payment_agreement` VARCHAR(255) NULL,
  `month_calculation_method` VARCHAR(100) NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_orders_mongo_id` (`mongo_id`),
  UNIQUE KEY `uniq_orders_contract_number` (`contract_number`),
  KEY `fk_orders_lessor_id` (`lessor_id`),
  KEY `fk_orders_customer_id` (`customer_id`),
  KEY `fk_orders_business_manager_id` (`business_manager_id`),
  CONSTRAINT `fk_orders_lessor_id` FOREIGN KEY (`lessor_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_orders_customer_id` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_orders_business_manager_id` FOREIGN KEY (`business_manager_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Order entries
CREATE TABLE IF NOT EXISTS `order_entries` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `equipment_id` INT NULL,
  `entry_date` DATE NULL,
  `attachments_json` JSON NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_order_entries_order_id` (`order_id`),
  KEY `fk_order_entries_equipment_id` (`equipment_id`),
  CONSTRAINT `fk_order_entries_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `fk_order_entries_equipment_id` FOREIGN KEY (`equipment_id`) REFERENCES `equipments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Order exits
CREATE TABLE IF NOT EXISTS `order_exits` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `equipment_id` INT NULL,
  `exit_date` DATE NULL,
  `attachments_json` JSON NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_order_exits_order_id` (`order_id`),
  KEY `fk_order_exits_equipment_id` (`equipment_id`),
  CONSTRAINT `fk_order_exits_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `fk_order_exits_equipment_id` FOREIGN KEY (`equipment_id`) REFERENCES `equipments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Receipts
CREATE TABLE IF NOT EXISTS `order_receipts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `receipt_date` DATE NULL,
  `attachments_json` JSON NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_order_receipts_order_id` (`order_id`),
  CONSTRAINT `fk_order_receipts_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Refunds
CREATE TABLE IF NOT EXISTS `order_refunds` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `refund_date` DATE NULL,
  `attachments_json` JSON NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_order_refunds_order_id` (`order_id`),
  CONSTRAINT `fk_order_refunds_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Settlements
CREATE TABLE IF NOT EXISTS `order_settlements` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `settlement_date` DATE NULL,
  `diff_json` JSON NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_order_settlements_order_id` (`order_id`),
  CONSTRAINT `fk_order_settlements_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Clearances
CREATE TABLE IF NOT EXISTS `order_clearances` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `clearance_date` DATE NULL,
  `attachments_json` JSON NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_order_clearances_order_id` (`order_id`),
  CONSTRAINT `fk_order_clearances_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Claims
CREATE TABLE IF NOT EXISTS `order_claims` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `claim_date` DATE NULL,
  `attachments_json` JSON NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_order_claims_order_id` (`order_id`),
  CONSTRAINT `fk_order_claims_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insurance policies (设备保单)
CREATE TABLE IF NOT EXISTS `insurance_policies` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `number` VARCHAR(64) NOT NULL,
  `company` VARCHAR(255) NOT NULL,
  `rate` DECIMAL(5,2) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_insurance_number` (`number`),
  KEY `idx_insurance_company` (`company`),
  KEY `idx_insurance_start_date` (`start_date`),
  KEY `idx_insurance_end_date` (`end_date`),
  CHECK (`rate` >= 0 AND `rate` <= 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Policy to equipments mapping
CREATE TABLE IF NOT EXISTS `policy_equipments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `policy_id` INT NOT NULL,
  `equipment_id` INT NOT NULL,
  `created_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_policy_equipments_policy_id` (`policy_id`),
  KEY `fk_policy_equipments_equipment_id` (`equipment_id`),
  CONSTRAINT `fk_policy_equipments_policy_id` FOREIGN KEY (`policy_id`) REFERENCES `insurance_policies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_policy_equipments_equipment_id` FOREIGN KEY (`equipment_id`) REFERENCES `equipments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Policy to devices mapping (规范要求表名 policy_devices)
-- 与 policy_equipments 结构一致，作为规范化命名使用
CREATE TABLE IF NOT EXISTS `policy_devices` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `policy_id` INT NOT NULL,
  `device_id` INT NOT NULL,
  `created_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_policy_devices_policy_id` (`policy_id`),
  KEY `fk_policy_devices_device_id` (`device_id`),
  KEY `idx_policy_devices_policy_device` (`policy_id`, `device_id`),
  CONSTRAINT `fk_policy_devices_policy_id` FOREIGN KEY (`policy_id`) REFERENCES `insurance_policies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_policy_devices_device_id` FOREIGN KEY (`device_id`) REFERENCES `equipments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Policy attachments (加密存储元数据)
CREATE TABLE IF NOT EXISTS `policy_attachments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `policy_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `size` INT NOT NULL,
  `storage_path` VARCHAR(255) NOT NULL,
  `iv` VARBINARY(16) NOT NULL,
  `auth_tag` VARBINARY(16) NULL,
  `created_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_policy_attachments_policy_id` (`policy_id`),
  CONSTRAINT `fk_policy_attachments_policy_id` FOREIGN KEY (`policy_id`) REFERENCES `insurance_policies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 门店表：存储门店基本信息及店长信息
CREATE TABLE IF NOT EXISTS `stores` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  `manager_id` INT DEFAULT NULL,
  `manager_name` VARCHAR(255) DEFAULT NULL,
  `manager_phone` VARCHAR(50) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_stores_manager_id` (`manager_id`),
  CONSTRAINT `fk_stores_manager_id` FOREIGN KEY (`manager_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 公司认证表：存储企业认证与结算信息
CREATE TABLE IF NOT EXISTS `company_verifications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `company_name` VARCHAR(255) NOT NULL,
  `company_address` VARCHAR(255) DEFAULT NULL,
  `credit_code` VARCHAR(18) NOT NULL,
  `bank_account` VARCHAR(64) DEFAULT NULL,
  `bank_name` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_company_verifications_credit_code` (`credit_code`),
  KEY `idx_company_verifications_company_name` (`company_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 设备型号（前端 EquipmentModel 对应）
CREATE TABLE IF NOT EXISTS `equipment_models` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `category` VARCHAR(100) NOT NULL,
  `brand` VARCHAR(100) NOT NULL,
  `model` VARCHAR(100) NOT NULL,
  `type` VARCHAR(100) NOT NULL,
  `height` DECIMAL(6,2) NOT NULL,
  `drive_type` VARCHAR(50) NOT NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_equipment_models_brand_model` (`brand`, `model`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 物流车辆
CREATE TABLE IF NOT EXISTS `logistics_vehicles` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `plate_number` VARCHAR(50) NOT NULL,
  `spec` VARCHAR(255) DEFAULT NULL,
  `remark` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_logistics_vehicles_plate` (`plate_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 物流司机
CREATE TABLE IF NOT EXISTS `logistics_drivers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `remark` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_logistics_drivers_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 物流公司
CREATE TABLE IF NOT EXISTS `logistics_companies` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `contact_person` VARCHAR(100) DEFAULT NULL,
  `contact_phone` VARCHAR(50) DEFAULT NULL,
  `pricing_rule` VARCHAR(255) DEFAULT NULL,
  `remark` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_logistics_companies_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;