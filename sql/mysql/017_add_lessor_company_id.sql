-- 为 orders 表添加 lessor_company_id 字段，用于存储来自 company_verifications 表的出租方 ID
-- 这样可以区分出租方来自 customers 表还是 company_verifications 表

ALTER TABLE `orders` ADD COLUMN `lessor_company_id` INT NULL COMMENT '出租方公司ID（来自company_verifications表）' AFTER `lessor_id`;

-- 添加外键约束（如果需要的话）
-- ALTER TABLE `orders` ADD CONSTRAINT `fk_orders_lessor_company_id` FOREIGN KEY (`lessor_company_id`) REFERENCES `company_verifications` (`id`);
