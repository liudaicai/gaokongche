-- 045_create_order_suspensions.sql
-- 创建报停记录表
-- 作者：AI Assistant
-- 日期：2025-11-27

START TRANSACTION;

CREATE TABLE IF NOT EXISTS order_suspensions (
  id INT NOT NULL AUTO_INCREMENT,
  order_id INT NOT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  attachments_json JSON NULL COMMENT '存储报停单号、选择设备、附件、原因等详细信息',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_order_id (order_id),
  INDEX idx_start_date (start_date),
  INDEX idx_end_date (end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;

