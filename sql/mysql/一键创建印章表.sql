-- 为印章表添加公司字段
ALTER TABLE `seals` 
ADD COLUMN `company_id` INT NULL COMMENT '所属公司ID' AFTER `id`,
ADD KEY `idx_company_id` (`company_id`);

SELECT '✅ 字段添加成功！' as message;

-- 查看表结构
DESC seals;