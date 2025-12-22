-- ====================================================================
-- Migration: 003_fix_mongo_id_field.sql
-- Description: 修复 mongo_id 字段为可空（遗留字段，已不再使用）
-- Author: System
-- Date: 2024-11-06
-- ====================================================================

-- 将 mongo_id 字段改为可空
ALTER TABLE `equipments`
MODIFY COLUMN `mongo_id` VARCHAR(24) NULL DEFAULT NULL COMMENT 'MongoDB ID (遗留字段)';

-- 说明：
-- 1. mongo_id 是从 MongoDB 迁移过来的遗留字段
-- 2. 现在使用 MySQL 的自增 ID，不再需要 mongo_id
-- 3. 将其改为可空避免插入新记录时出错
-- 4. 保留字段是为了兼容可能存在的旧数据引用

