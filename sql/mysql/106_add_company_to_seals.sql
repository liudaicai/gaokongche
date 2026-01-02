-- 为印章表添加公司字段
-- 用于区分不同公司的印章

-- 添加 company_id 字段
ALTER TABLE `seals` 
ADD COLUMN `company_id` INT NULL COMMENT '所属公司ID' AFTER `id`,
ADD KEY `idx_company_id` (`company_id`);

-- 添加外键约束（如果 stores 表存在）
-- ALTER TABLE `seals` 
-- ADD CONSTRAINT `fk_seals_company` 
-- FOREIGN KEY (`company_id`) REFERENCES `stores`(`id`) 
-- ON DELETE SET NULL ON UPDATE CASCADE;

-- 更新说明
SELECT '印章表已添加 company_id 字段，用于区分不同公司的印章' as message;

-- 查看表结构
DESC seals;
