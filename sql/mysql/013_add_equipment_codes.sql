-- 013_add_equipment_codes.sql
-- 目标：为 equipments 表补充“设备编码(code)”与“自编码(custom_code)”字段
-- 说明：如果列已存在，迁移执行器会忽略“Duplicate column name”错误并继续

START TRANSACTION;

-- 添加自编码（若不存在）
ALTER TABLE `equipments`
  ADD COLUMN `custom_code` VARCHAR(100) NULL COMMENT '自编码' AFTER `serial_no`;

-- 添加设备编码（若不存在）
ALTER TABLE `equipments`
  ADD COLUMN `code` VARCHAR(100) NULL COMMENT '设备编码' AFTER `custom_code`;

COMMIT;