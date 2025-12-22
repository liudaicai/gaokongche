
-- 048_fix_order_settlements.sql
-- 修复 order_settlements 表结构，确保 attachments_json 列存在

START TRANSACTION;

-- 确保表存在
CREATE TABLE IF NOT EXISTS order_settlements (
  id INT NOT NULL AUTO_INCREMENT,
  order_id INT NOT NULL,
  settlement_date DATE NULL,
  settlement_amount DECIMAL(12,2) DEFAULT 0.00,
  attachments_json JSON NULL COMMENT '存储结算单号、周期、备注、状态等详细信息',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_order_id (order_id),
  INDEX idx_settlement_date (settlement_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 检查并修复列
DROP PROCEDURE IF EXISTS FixOrderSettlements;
DELIMITER //
CREATE PROCEDURE FixOrderSettlements()
BEGIN
    -- 1. 检查是否存在 attachments 列但没有 attachments_json 列（可能是旧名）
    IF EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'order_settlements' 
        AND COLUMN_NAME = 'attachments'
    ) AND NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'order_settlements' 
        AND COLUMN_NAME = 'attachments_json'
    ) THEN
        ALTER TABLE order_settlements CHANGE COLUMN attachments attachments_json JSON NULL;
    END IF;

    -- 2. 如果 attachments_json 仍不存在，则添加
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'order_settlements' 
        AND COLUMN_NAME = 'attachments_json'
    ) THEN
        ALTER TABLE order_settlements ADD COLUMN attachments_json JSON NULL;
    END IF;

    -- 3. 确保 settlement_amount 存在
     IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'order_settlements' 
        AND COLUMN_NAME = 'settlement_amount'
    ) THEN
        ALTER TABLE order_settlements ADD COLUMN settlement_amount DECIMAL(12,2) DEFAULT 0.00;
    END IF;
    
    -- 4. 确保 settlement_date 存在
     IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'order_settlements' 
        AND COLUMN_NAME = 'settlement_date'
    ) THEN
        ALTER TABLE order_settlements ADD COLUMN settlement_date DATE NULL;
    END IF;

END //
DELIMITER ;
CALL FixOrderSettlements();
DROP PROCEDURE FixOrderSettlements;

COMMIT;

