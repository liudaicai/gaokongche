-- 047_create_order_settlements.sql
-- 创建结算记录表
-- 作者：AI Assistant
-- 日期：2025-11-27

START TRANSACTION;

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

COMMIT;

