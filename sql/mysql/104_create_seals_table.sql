-- 印章管理表
-- 用于存储操作证所需的印章图片

CREATE TABLE IF NOT EXISTS `seals` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  `name` VARCHAR(100) NOT NULL COMMENT '印章名称',
  `type` VARCHAR(50) NOT NULL DEFAULT 'official' COMMENT '印章类型：official-公章, finance-财务章, hr-人事章, training-培训章',
  `description` TEXT NULL COMMENT '印章描述/用途说明',
  `image_url` VARCHAR(500) NOT NULL COMMENT '印章图片URL',
  `image_width` INT NULL COMMENT '图片宽度（像素）',
  `image_height` INT NULL COMMENT '图片高度（像素）',
  `file_size` INT NULL COMMENT '文件大小（字节）',
  `format` VARCHAR(20) DEFAULT 'PNG' COMMENT '图片格式：PNG, JPG, SVG等',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用：1-启用，0-禁用',
  `usage_count` INT NOT NULL DEFAULT 0 COMMENT '使用次数统计',
  `last_used_at` DATETIME(3) NULL COMMENT '最后使用时间',
  `created_by` INT NULL COMMENT '创建人ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  `deleted_at` DATETIME(3) NULL COMMENT '删除时间（软删除）',
  
  KEY `idx_name` (`name`),
  KEY `idx_type` (`type`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_deleted_at` (`deleted_at`),
  KEY `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='印章管理表';

-- 添加印章使用记录表（可选，用于审计）
CREATE TABLE IF NOT EXISTS `seal_usage_logs` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  `seal_id` INT NOT NULL COMMENT '印章ID',
  `used_for` VARCHAR(50) NOT NULL COMMENT '使用场景：certificate-操作证, contract-合同, document-文档等',
  `reference_id` INT NULL COMMENT '关联记录ID（如操作证ID）',
  `used_by` INT NULL COMMENT '使用人ID',
  `used_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '使用时间',
  
  KEY `idx_seal_id` (`seal_id`),
  KEY `idx_used_for` (`used_for`),
  KEY `idx_reference_id` (`reference_id`),
  KEY `idx_used_at` (`used_at`),
  FOREIGN KEY (`seal_id`) REFERENCES `seals`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='印章使用记录表';
