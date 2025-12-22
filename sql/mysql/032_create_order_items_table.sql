-- ============================================
-- 创建订单设备项表 (order_items)
-- 作者: AI 开发助手
-- 日期: 2025-11-23
-- 说明: 存储订单的设备需求项
-- ============================================

START TRANSACTION;

-- 创建 order_items 表（订单设备项）
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '设备项ID',
  `order_id` INT NOT NULL COMMENT '订单ID',
  `equipment_type` VARCHAR(100) NULL COMMENT '设备类型',
  `height` VARCHAR(50) NULL COMMENT '高度',
  `quantity` INT DEFAULT 0 COMMENT '数量',
  `daily_rate` DECIMAL(12,2) DEFAULT 0.00 COMMENT '日租价',
  `monthly_rate` DECIMAL(12,2) DEFAULT 0.00 COMMENT '月租价',
  `deposit` DECIMAL(12,2) DEFAULT 0.00 COMMENT '押金',
  `shipping_fee` DECIMAL(12,2) DEFAULT 0.00 COMMENT '运费',
  `modification_fee` DECIMAL(12,2) DEFAULT 0.00 COMMENT '改装费',
  `scheduled_entry_date` DATE NULL COMMENT '计划进场日期',
  `estimated_exit_date` DATE NULL COMMENT '预计退场日期',
  `rental_period` INT DEFAULT 0 COMMENT '租期（天）',
  `shipping_type` VARCHAR(50) NULL COMMENT '运输类型：单程/双程',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order_id` (`order_id`),
  CONSTRAINT `fk_order_items_order_id` 
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单设备需求项表';

COMMIT;

-- 验证表结构
SELECT '✅ order_items 表创建成功' AS message;
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'order_items'
ORDER BY ORDINAL_POSITION;

