-- 015_add_unique_indexes_equipment.sql
-- 为 equipments.code 与 equipments.custom_code 添加唯一索引

ALTER TABLE `equipments`
  ADD UNIQUE INDEX `uniq_equipments_code` (`code`),
  ADD UNIQUE INDEX `uniq_equipments_custom_code` (`custom_code`);