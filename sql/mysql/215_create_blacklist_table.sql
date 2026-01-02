-- 215_create_blacklist_table.sql
-- 创建黑名单表（所有租户共享数据）

-- 黑名单记录表
CREATE TABLE IF NOT EXISTS `blacklist` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_name` VARCHAR(255) NOT NULL COMMENT '客户名称',
  `customer_phone` VARCHAR(50) NULL COMMENT '客户电话',
  `customer_id_card` VARCHAR(50) NULL COMMENT '客户身份证号',
  `reason` TEXT NOT NULL COMMENT '加入黑名单原因',
  `evidence_files` JSON NULL COMMENT '证据文件列表',
  `severity` ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium' COMMENT '严重程度',
  `status` ENUM('active', 'removed') DEFAULT 'active' COMMENT '黑名单状态',
  
  -- 上传者信息
  `uploaded_by` INT NOT NULL COMMENT '上传用户ID',
  `uploader_tenant_id` INT NOT NULL COMMENT '上传者租户ID',
  `uploader_name` VARCHAR(255) NULL COMMENT '上传者姓名',
  `upload_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
  
  -- 审核信息（超管可以审核）
  `verified` TINYINT(1) DEFAULT 0 COMMENT '是否已审核',
  `verified_by` INT NULL COMMENT '审核人ID',
  `verify_time` DATETIME NULL COMMENT '审核时间',
  `verify_note` TEXT NULL COMMENT '审核备注',
  
  -- 移除信息（超管可以移除）
  `removed_by` INT NULL COMMENT '移除人ID',
  `remove_time` DATETIME NULL COMMENT '移除时间',
  `remove_reason` TEXT NULL COMMENT '移除原因',
  
  -- 时间戳
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- 索引优化查询
  INDEX `idx_customer_name` (`customer_name`),
  INDEX `idx_customer_phone` (`customer_phone`),
  INDEX `idx_customer_id_card` (`customer_id_card`),
  INDEX `idx_status` (`status`),
  INDEX `idx_uploaded_by` (`uploaded_by`),
  INDEX `idx_uploader_tenant_id` (`uploader_tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='黑名单记录表（跨租户共享）';

-- 黑名单查询日志表（记录谁在什么时候查询了黑名单）
CREATE TABLE IF NOT EXISTS `blacklist_query_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `blacklist_id` INT NOT NULL COMMENT '黑名单记录ID',
  `query_by` INT NOT NULL COMMENT '查询用户ID',
  `query_tenant_id` INT NOT NULL COMMENT '查询租户ID',
  `query_context` VARCHAR(100) NULL COMMENT '查询场景（新增客户/新增订单等）',
  `customer_info` VARCHAR(500) NULL COMMENT '查询的客户信息',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX `idx_blacklist_id` (`blacklist_id`),
  INDEX `idx_query_by` (`query_by`),
  INDEX `idx_query_tenant_id` (`query_tenant_id`),
  FOREIGN KEY (`blacklist_id`) REFERENCES `blacklist`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='黑名单查询日志';

-- 插入初始测试数据（可选）
INSERT INTO `blacklist` (
  `customer_name`, 
  `customer_phone`, 
  `customer_id_card`, 
  `reason`, 
  `severity`, 
  `uploaded_by`, 
  `uploader_tenant_id`, 
  `uploader_name`, 
  `verified`
) VALUES 
(
  '测试黑名单客户', 
  '13800138000', 
  '110101199001011234', 
  '多次拖欠租金，态度恶劣，拒不归还设备', 
  'high', 
  1, 
  1, 
  '系统管理员', 
  1
);

SELECT 'Blacklist tables created successfully' AS status;

