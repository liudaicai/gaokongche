-- 操作证管理表
-- 用于管理员工的操作资格证书（高空作业证、特种设备操作证等）

CREATE TABLE IF NOT EXISTS `operator_certificates` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  `certificate_no` VARCHAR(100) NOT NULL COMMENT '证书编号',
  `certificate_type` VARCHAR(100) NOT NULL COMMENT '证书类型（高空作业证、叉车证、电工证等）',
  `employee_id` INT NULL COMMENT '员工ID',
  `employee_name` VARCHAR(255) NOT NULL COMMENT '持证人姓名',
  `id_card_number` VARCHAR(18) NULL COMMENT '身份证号',
  `issue_date` DATE NOT NULL COMMENT '发证日期',
  `expire_date` DATE NOT NULL COMMENT '有效期至',
  `issue_authority` VARCHAR(255) NULL COMMENT '发证机关',
  `certificate_level` VARCHAR(50) NULL COMMENT '证书等级（初级、中级、高级等）',
  `status` VARCHAR(50) NOT NULL DEFAULT 'valid' COMMENT '状态：valid-有效,expired-过期,revoked-吊销,suspended-暂停',
  `attachments` JSON NULL COMMENT '证书附件（照片、扫描件等）',
  `notes` TEXT NULL COMMENT '备注',
  `reminder_days` INT DEFAULT 30 COMMENT '到期提醒天数',
  `created_by` INT NULL COMMENT '创建人ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间（软删除）',
  
  UNIQUE KEY `uniq_certificate_no` (`certificate_no`),
  KEY `idx_employee_id` (`employee_id`),
  KEY `idx_certificate_type` (`certificate_type`),
  KEY `idx_status` (`status`),
  KEY `idx_expire_date` (`expire_date`),
  KEY `idx_deleted_at` (`deleted_at`),
  KEY `idx_id_card_number` (`id_card_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作证管理表';

-- 添加外键约束（如果employees表存在）
ALTER TABLE `operator_certificates` 
ADD CONSTRAINT `fk_operator_certificates_employee` 
FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) 
ON DELETE SET NULL ON UPDATE CASCADE;
