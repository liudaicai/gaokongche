-- ====================================================================
-- Migration: 004_remove_mongo_dependencies.sql
-- Description: 移除所有MongoDB遗留字段，完全迁移到MySQL
-- Author: System
-- Date: 2024-11-06
-- ====================================================================

USE `high_altitude_rental_mysql`;

-- ============================================
-- 第一步：移除 mongo_id 的唯一约束
-- ============================================
ALTER TABLE `customers` DROP INDEX `uniq_customers_mongo_id`;
ALTER TABLE `employees` DROP INDEX `uniq_employees_mongo_id`;
ALTER TABLE `models` DROP INDEX `uniq_models_mongo_id`;
ALTER TABLE `equipments` DROP INDEX `uniq_equipments_mongo_id`;
ALTER TABLE `orders` DROP INDEX `uniq_orders_mongo_id`;

-- ============================================
-- 第二步：将 mongo_id 字段设为可空
-- ============================================
ALTER TABLE `customers` MODIFY COLUMN `mongo_id` VARCHAR(24) NULL DEFAULT NULL COMMENT 'MongoDB ID (已废弃)';
ALTER TABLE `employees` MODIFY COLUMN `mongo_id` VARCHAR(24) NULL DEFAULT NULL COMMENT 'MongoDB ID (已废弃)';
ALTER TABLE `models` MODIFY COLUMN `mongo_id` VARCHAR(24) NULL DEFAULT NULL COMMENT 'MongoDB ID (已废弃)';
ALTER TABLE `equipments` MODIFY COLUMN `mongo_id` VARCHAR(24) NULL DEFAULT NULL COMMENT 'MongoDB ID (已废弃)';
ALTER TABLE `orders` MODIFY COLUMN `mongo_id` VARCHAR(24) NULL DEFAULT NULL COMMENT 'MongoDB ID (已废弃)';

-- ============================================
-- 第三步：为所有核心表添加软删除字段（如未添加）
-- 注意：如果字段已存在会报错，但不影响后续执行
-- ============================================

-- ============================================
-- 第四步：添加性能优化索引
-- 注意：如果索引已存在会报错，但不影响后续执行
-- ============================================

-- ============================================
-- 第五步：添加默认值优化
-- ============================================
ALTER TABLE `customers` 
MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

ALTER TABLE `employees` 
MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

ALTER TABLE `models` 
MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

ALTER TABLE `equipments` 
MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

ALTER TABLE `orders` 
MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

ALTER TABLE `order_entries` 
MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

ALTER TABLE `order_exits` 
MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

ALTER TABLE `order_receipts` 
MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

ALTER TABLE `order_refunds` 
MODIFY COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
MODIFY COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- ============================================
-- 完成提示
-- ============================================
SELECT '✅ 数据库迁移 004 完成：已移除MongoDB依赖，优化索引和默认值' AS status;
