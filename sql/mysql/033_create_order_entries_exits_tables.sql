-- ============================================
-- 创建订单进退场记录表
-- 作者: AI 开发助手
-- 日期: 2025-11-23
-- 说明: 创建 order_entries 和 order_exits 表
-- ============================================

START TRANSACTION;

-- 创建进场记录表
CREATE TABLE IF NOT EXISTS `order_entries` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '进场记录ID',
  `order_id` INT NOT NULL COMMENT '订单ID',
  `equipment_id` INT NULL COMMENT '设备ID',
  `entry_date` DATE NULL COMMENT '进场日期',
  `entry_location` VARCHAR(255) NULL COMMENT '进场地点',
  `entry_person` VARCHAR(100) NULL COMMENT '进场负责人',
  `entry_contact` VARCHAR(50) NULL COMMENT '进场联系电话',
  `attachments_json` JSON NULL COMMENT '附件和扩展数据（JSON格式）',
  `logistics_cost` DECIMAL(12,2) DEFAULT 0.00 COMMENT '物流成本',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_order_entries_order_id` (`order_id`),
  KEY `idx_order_entries_equipment_id` (`equipment_id`),
  CONSTRAINT `fk_order_entries_order_id` 
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单进场记录表';

-- 创建退场记录表
CREATE TABLE IF NOT EXISTS `order_exits` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '退场记录ID',
  `order_id` INT NOT NULL COMMENT '订单ID',
  `equipment_id` INT NULL COMMENT '设备ID',
  `exit_date` DATE NULL COMMENT '退场日期',
  `exit_location` VARCHAR(255) NULL COMMENT '退场地点',
  `exit_person` VARCHAR(100) NULL COMMENT '退场负责人',
  `exit_contact` VARCHAR(50) NULL COMMENT '退场联系电话',
  `attachments_json` JSON NULL COMMENT '附件和扩展数据（JSON格式）',
  `logistics_cost` DECIMAL(12,2) DEFAULT 0.00 COMMENT '物流成本',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_order_exits_order_id` (`order_id`),
  KEY `idx_order_exits_equipment_id` (`equipment_id`),
  CONSTRAINT `fk_order_exits_order_id` 
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单退场记录表';

COMMIT;

-- 验证表结构
SELECT '✅ order_entries 表创建成功' AS message;
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'order_entries'
ORDER BY ORDINAL_POSITION;

SELECT '✅ order_exits 表创建成功' AS message;
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'order_exits'
ORDER BY ORDINAL_POSITION;

