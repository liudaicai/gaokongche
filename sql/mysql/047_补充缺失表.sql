/**
 * 补充缺失的表：logistics 和 order_documents
 * 创建时间: 2025-11-21
 */

-- ============================================================
-- 1. 物流台账表（logistics）
-- ============================================================

CREATE TABLE IF NOT EXISTS `logistics` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL COMMENT '订单ID',
  `equipment_id` INT NULL COMMENT '设备ID',
  `logistics_type` VARCHAR(20) NOT NULL COMMENT '物流类型:delivery-配送/return-回收/transfer-调拨',
  
  -- 地点信息
  `departure_location` VARCHAR(255) NULL COMMENT '出发地点',
  `arrival_location` VARCHAR(255) NULL COMMENT '到达地点',
  
  -- 运输信息
  `transport_date` DATE NULL COMMENT '运输日期',
  `driver_name` VARCHAR(50) NULL COMMENT '司机姓名',
  `driver_phone` VARCHAR(20) NULL COMMENT '司机电话',
  `vehicle_number` VARCHAR(20) NULL COMMENT '车牌号',
  `vehicle_type` VARCHAR(50) NULL COMMENT '车辆类型',
  
  -- 费用信息
  `cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '物流费用',
  
  -- 状态
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态:pending-待发运/in_transit-运输中/completed-已完成/cancelled-已取消',
  
  -- 备注
  `notes` TEXT NULL COMMENT '备注',
  `attachments_json` JSON NULL COMMENT '附件（运单等）',
  
  -- 系统字段
  `company_id` INT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_equipment_id` (`equipment_id`),
  INDEX `idx_company_id` (`company_id`),
  INDEX `idx_transport_date` (`transport_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='物流台账表';

-- ============================================================
-- 2. 订单文档表（order_documents）
-- ============================================================

CREATE TABLE IF NOT EXISTS `order_documents` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL COMMENT '订单ID',
  `document_type` VARCHAR(20) NOT NULL COMMENT '文档类型:contract-合同/entry_form-进场单/exit_form-退场单/settlement-结算单/receipt-收据/other-其他',
  `document_name` VARCHAR(200) NOT NULL COMMENT '文档名称',
  `document_url` VARCHAR(500) NOT NULL COMMENT '文档URL',
  
  -- 文件信息
  `file_size` INT NULL COMMENT '文件大小（字节）',
  `file_type` VARCHAR(50) NULL COMMENT '文件类型（MIME）',
  
  -- 版本控制
  `version` INT NOT NULL DEFAULT 1 COMMENT '版本号',
  `is_latest` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否最新版本',
  
  -- 备注
  `notes` TEXT NULL COMMENT '备注',
  
  -- 系统字段
  `company_id` INT NULL,
  `uploaded_by` INT NULL COMMENT '上传人ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_document_type` (`document_type`),
  INDEX `idx_company_id` (`company_id`),
  INDEX `idx_is_latest` (`is_latest`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单文档表';

SELECT '✅ 缺失表补充完成（logistics, order_documents）' AS message;

