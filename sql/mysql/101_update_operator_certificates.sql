-- 更新操作证管理表结构
-- 添加新字段：操作机型、培训人、区域、头像等

-- 删除旧的字段（如果存在）
ALTER TABLE `operator_certificates` 
DROP COLUMN IF EXISTS `certificate_no`,
DROP COLUMN IF EXISTS `certificate_type`,
DROP COLUMN IF EXISTS `issue_date`,
DROP COLUMN IF EXISTS `issue_authority`,
DROP COLUMN IF EXISTS `certificate_level`,
DROP COLUMN IF EXISTS `reminder_days`;

-- 添加新字段
ALTER TABLE `operator_certificates`
ADD COLUMN `equipment_type` VARCHAR(100) NULL COMMENT '操作机型（关联设备类型）' AFTER `employee_name`,
ADD COLUMN `training_date` DATE NOT NULL COMMENT '培训时间' AFTER `equipment_type`,
ADD COLUMN `trainer_id` INT NULL COMMENT '培训人ID（关联员工）' AFTER `training_date`,
ADD COLUMN `trainer_name` VARCHAR(255) NULL COMMENT '培训人姓名' AFTER `trainer_id`,
ADD COLUMN `validity_period` INT NOT NULL DEFAULT 12 COMMENT '有效期（月数）1,3,6,12' AFTER `trainer_name`,
ADD COLUMN `company_id` INT NULL COMMENT '公司ID（门店认证）' AFTER `validity_period`,
ADD COLUMN `company_name` VARCHAR(255) NULL COMMENT '公司名称' AFTER `company_id`,
ADD COLUMN `photo_url` VARCHAR(500) NULL COMMENT '头像照片URL' AFTER `company_name`,
ADD COLUMN `certificate_url` VARCHAR(500) NULL COMMENT '生成的证书图片URL' AFTER `photo_url`;

-- 修改现有字段
ALTER TABLE `operator_certificates`
MODIFY COLUMN `expire_date` DATE NOT NULL COMMENT '到期时间（培训时间+有效期自动计算）';

-- 添加索引
ALTER TABLE `operator_certificates`
ADD INDEX `idx_equipment_type` (`equipment_type`),
ADD INDEX `idx_trainer_id` (`trainer_id`),
ADD INDEX `idx_company_id` (`company_id`),
ADD INDEX `idx_training_date` (`training_date`);

-- 添加外键约束
ALTER TABLE `operator_certificates`
ADD CONSTRAINT `fk_operator_certificates_trainer` 
FOREIGN KEY (`trainer_id`) REFERENCES `employees`(`id`) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- 添加认证公司外键（关联到 company_verifications 表）
-- company_verifications 表存储的是门店管理-认证公司的数据
ALTER TABLE `operator_certificates`
ADD CONSTRAINT `fk_operator_certificates_company` 
FOREIGN KEY (`company_id`) REFERENCES `company_verifications`(`id`) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- 更新状态枚举（如果需要）
ALTER TABLE `operator_certificates`
MODIFY COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'valid' COMMENT '状态：valid-有效,expired-过期,revoked-吊销';

-- 注释说明
ALTER TABLE `operator_certificates` COMMENT = '高空作业车操作证管理表';
