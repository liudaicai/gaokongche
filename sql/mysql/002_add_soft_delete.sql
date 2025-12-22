-- ====================================================================
-- Migration: 002_add_soft_delete.sql
-- Description: 为核心业务表添加软删除功能
-- Author: System
-- Date: 2024-11-06
-- ====================================================================

-- 为 equipments 表添加软删除字段
ALTER TABLE `equipments`
ADD COLUMN `deleted_at` DATETIME(3) NULL DEFAULT NULL COMMENT '软删除时间戳' AFTER `updated_at`;

-- 为已删除设备创建索引，提高查询性能
CREATE INDEX `idx_equipments_deleted_at` ON `equipments` (`deleted_at`);

-- 为其他核心表添加软删除字段（可选，根据需要）
-- ALTER TABLE `customers`
-- ADD COLUMN `deleted_at` DATETIME(3) NULL DEFAULT NULL COMMENT '软删除时间戳' AFTER `updated_at`;

-- ALTER TABLE `orders`
-- ADD COLUMN `deleted_at` DATETIME(3) NULL DEFAULT NULL COMMENT '软删除时间戳' AFTER `updated_at`;

-- ALTER TABLE `insurance_policies`
-- ADD COLUMN `deleted_at` DATETIME(3) NULL DEFAULT NULL COMMENT '软删除时间戳' AFTER `updated_at`;

-- 说明：
-- 1. deleted_at 为 NULL 表示记录有效
-- 2. deleted_at 不为 NULL 表示记录已被软删除
-- 3. 查询时需要添加 WHERE deleted_at IS NULL 过滤条件
-- 4. 删除操作改为 UPDATE 设置 deleted_at = NOW()
-- 5. 可通过设置 deleted_at = NULL 来恢复记录

