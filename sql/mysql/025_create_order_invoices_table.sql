-- 创建订单发票表
-- 作者：系统
-- 日期：2025-11-16
-- 描述：为订单系统增加发票管理功能

START TRANSACTION;

-- 创建订单发票表
CREATE TABLE IF NOT EXISTS `order_invoices` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL COMMENT '订单ID',
  `invoice_number` VARCHAR(50) NOT NULL COMMENT '发票号码',
  `invoice_type` VARCHAR(50) NOT NULL DEFAULT 'vat_normal' COMMENT '发票类型: vat_normal(增值税普通发票), vat_special(增值税专用发票), electronic(电子发票)',
  
  -- 开票信息
  `invoice_date` DATE NOT NULL COMMENT '开票日期',
  `invoice_title` VARCHAR(255) NOT NULL COMMENT '发票抬头',
  `tax_number` VARCHAR(100) NOT NULL COMMENT '纳税人识别号',
  `invoice_content` TEXT NULL COMMENT '开票内容',
  
  -- 金额信息
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '发票金额（不含税）',
  `tax_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '税率（%）',
  `tax_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '税额',
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '价税合计',
  
  -- 发票状态
  `invoice_status` VARCHAR(50) NOT NULL DEFAULT 'issued' COMMENT '发票状态: issued(已开具), sent(已寄出), received(已收到), cancelled(已作废), red_flushed(已红冲)',
  `sent_date` DATE NULL COMMENT '寄出日期',
  `received_date` DATE NULL COMMENT '收到日期',
  `cancelled_date` DATE NULL COMMENT '作废日期',
  `cancelled_reason` TEXT NULL COMMENT '作废原因',
  
  -- 附加信息
  `recipient_name` VARCHAR(100) NULL COMMENT '收件人姓名',
  `recipient_phone` VARCHAR(50) NULL COMMENT '收件人电话',
  `recipient_address` VARCHAR(500) NULL COMMENT '收件地址',
  `express_company` VARCHAR(100) NULL COMMENT '快递公司',
  `express_number` VARCHAR(100) NULL COMMENT '快递单号',
  
  -- 附件和备注
  `attachments` JSON NULL COMMENT '发票附件（PDF、图片等）',
  `notes` TEXT NULL COMMENT '备注',
  
  -- 操作人员
  `created_by` INT NULL COMMENT '制单人',
  `sent_by` INT NULL COMMENT '寄出操作人',
  `cancelled_by` INT NULL COMMENT '作废操作人',
  
  -- 时间戳
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_invoice_number` (`invoice_number`),
  INDEX `idx_order_invoices_order_id` (`order_id`),
  INDEX `idx_order_invoices_status` (`invoice_status`),
  INDEX `idx_order_invoices_date` (`invoice_date`),
  INDEX `idx_order_invoices_type` (`invoice_type`),
  CONSTRAINT `fk_order_invoices_order_id` 
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单发票表';

-- 为订单发票表添加操作日志索引
CREATE INDEX `idx_order_invoices_created_by` ON `order_invoices` (`created_by`);

COMMIT;

