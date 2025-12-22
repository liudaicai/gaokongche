-- 049_create_settlements_clearances.sql
-- 创建结算和结清表

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

CREATE TABLE IF NOT EXISTS order_clearances (
  id INT NOT NULL AUTO_INCREMENT,
  order_id INT NOT NULL,
  clearance_date DATE NULL,
  clearance_amount DECIMAL(12,2) DEFAULT 0.00,
  attachments_json JSON NULL COMMENT '存储结清单号、备注、状态等详细信息',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_order_id (order_id),
  INDEX idx_clearance_date (clearance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

