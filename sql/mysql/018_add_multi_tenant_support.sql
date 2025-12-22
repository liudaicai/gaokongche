-- 多租户支持：添加公司表和租户ID字段
-- 时间: 2025-11-14

-- 1. 创建公司表
CREATE TABLE IF NOT EXISTS `companies` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL COMMENT '公司名称',
  `code` VARCHAR(50) NOT NULL COMMENT '公司编码',
  `contact_name` VARCHAR(100) NULL COMMENT '联系人',
  `contact_phone` VARCHAR(50) NULL COMMENT '联系电话',
  `contact_email` VARCHAR(100) NULL COMMENT '联系邮箱',
  `address` VARCHAR(500) NULL COMMENT '公司地址',
  `status` VARCHAR(20) DEFAULT 'active' COMMENT '状态: active, disabled',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_companies_code` (`code`),
  INDEX `idx_companies_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公司/租户表';

-- 2. 为 users 表添加 company_id 字段（如果不存在）
SET @dbname = DATABASE();
SET @tablename = 'users';
SET @columnname = 'company_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' INT NULL COMMENT ''所属公司ID'' AFTER role')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 3. 为 customers 表添加 company_id
ALTER TABLE `customers` ADD COLUMN `company_id` INT NULL COMMENT '所属公司ID';
ALTER TABLE `customers` ADD INDEX `idx_customers_company` (`company_id`);

-- 4. 为 employees 表添加 company_id
ALTER TABLE `employees` ADD COLUMN `company_id` INT NULL COMMENT '所属公司ID';
ALTER TABLE `employees` ADD INDEX `idx_employees_company` (`company_id`);

-- 5. 为 equipments 表添加 company_id
ALTER TABLE `equipments` ADD COLUMN `company_id` INT NULL COMMENT '所属公司ID';
ALTER TABLE `equipments` ADD INDEX `idx_equipments_company` (`company_id`);

-- 6. 为 equipment_models 表添加 company_id
ALTER TABLE `equipment_models` ADD COLUMN `company_id` INT NULL COMMENT '所属公司ID';
ALTER TABLE `equipment_models` ADD INDEX `idx_equipment_models_company` (`company_id`);

-- 7. 为 orders 表添加 company_id
ALTER TABLE `orders` ADD COLUMN `company_id` INT NULL COMMENT '所属公司ID';
ALTER TABLE `orders` ADD INDEX `idx_orders_company` (`company_id`);

-- 8. 为 stores 表添加 company_id
ALTER TABLE `stores` ADD COLUMN `company_id` INT NULL COMMENT '所属公司ID';
ALTER TABLE `stores` ADD INDEX `idx_stores_company` (`company_id`);

-- 9. 为 insurance_policies 表添加 company_id
ALTER TABLE `insurance_policies` ADD COLUMN `company_id` INT NULL COMMENT '所属公司ID';
ALTER TABLE `insurance_policies` ADD INDEX `idx_insurance_policies_company` (`company_id`);

-- 10. 为 logistics_vehicles 表添加 company_id
ALTER TABLE `logistics_vehicles` ADD COLUMN `company_id` INT NULL COMMENT '所属公司ID';
ALTER TABLE `logistics_vehicles` ADD INDEX `idx_logistics_vehicles_company` (`company_id`);

-- 11. 为 logistics_drivers 表添加 company_id
ALTER TABLE `logistics_drivers` ADD COLUMN `company_id` INT NULL COMMENT '所属公司ID';
ALTER TABLE `logistics_drivers` ADD INDEX `idx_logistics_drivers_company` (`company_id`);

-- 12. 为 logistics_companies 表添加 company_id（改名为owner_company_id避免冲突）
ALTER TABLE `logistics_companies` ADD COLUMN `owner_company_id` INT NULL COMMENT '所属公司ID';
ALTER TABLE `logistics_companies` ADD INDEX `idx_logistics_companies_owner` (`owner_company_id`);

-- 13. 添加外键约束（可选，建议先运行测试后再添加）
-- ALTER TABLE `users` ADD CONSTRAINT `fk_users_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL;
-- ALTER TABLE `customers` ADD CONSTRAINT `fk_customers_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL;
-- ALTER TABLE `employees` ADD CONSTRAINT `fk_employees_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL;
-- ALTER TABLE `equipments` ADD CONSTRAINT `fk_equipments_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL;
-- ALTER TABLE `equipment_models` ADD CONSTRAINT `fk_equipment_models_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL;
-- ALTER TABLE `orders` ADD CONSTRAINT `fk_orders_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL;

-- 14. 插入默认公司（用于现有数据）
INSERT INTO `companies` (`id`, `name`, `code`, `is_active`, `created_at`, `updated_at`)
VALUES (1, '默认公司', 'DEFAULT', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `name` = `name`;

-- 15. 更新现有数据，设置默认公司ID（如果为NULL）
UPDATE `users` SET `company_id` = 1 WHERE `company_id` IS NULL;
UPDATE `customers` SET `company_id` = 1 WHERE `company_id` IS NULL;
UPDATE `employees` SET `company_id` = 1 WHERE `company_id` IS NULL;
UPDATE `equipments` SET `company_id` = 1 WHERE `company_id` IS NULL;
UPDATE `equipment_models` SET `company_id` = 1 WHERE `company_id` IS NULL;
UPDATE `orders` SET `company_id` = 1 WHERE `company_id` IS NULL;
UPDATE `stores` SET `company_id` = 1 WHERE `company_id` IS NULL AND EXISTS (SELECT 1 FROM `companies` WHERE id = 1);
UPDATE `insurance_policies` SET `company_id` = 1 WHERE `company_id` IS NULL AND EXISTS (SELECT 1 FROM `companies` WHERE id = 1);
UPDATE `logistics_vehicles` SET `company_id` = 1 WHERE `company_id` IS NULL AND EXISTS (SELECT 1 FROM `companies` WHERE id = 1);
UPDATE `logistics_drivers` SET `company_id` = 1 WHERE `company_id` IS NULL AND EXISTS (SELECT 1 FROM `companies` WHERE id = 1);
UPDATE `logistics_companies` SET `owner_company_id` = 1 WHERE `owner_company_id` IS NULL AND EXISTS (SELECT 1 FROM `companies` WHERE id = 1);
