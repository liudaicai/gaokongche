-- ============================================
-- 创建订单退款表
-- 作者: AI 开发助手
-- 日期: 2025-11-22
-- 说明: 创建 order_refunds 表用于记录订单退款信息
-- ============================================

START TRANSACTION;

-- 创建 order_refunds 表
CREATE TABLE IF NOT EXISTS order_refunds (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL COMMENT '订单ID',
  amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '退款金额',
  refund_date DATE NOT NULL COMMENT '退款日期',
  refund_method VARCHAR(50) NULL COMMENT '退款方式',
  refund_reason TEXT NULL COMMENT '退款原因',
  attachments_json JSON NULL COMMENT '附件（JSON格式）',
  notes TEXT NULL COMMENT '备注',
  created_by INT NULL COMMENT '创建人ID',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  
  INDEX idx_order_refunds_order_id (order_id),
  INDEX idx_order_refunds_refund_date (refund_date),
  CONSTRAINT fk_order_refunds_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单退款表';

COMMIT;

-- 验证
SELECT '✅ order_refunds 表创建成功！' AS message;
SELECT TABLE_NAME, TABLE_COMMENT 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'order_refunds';

