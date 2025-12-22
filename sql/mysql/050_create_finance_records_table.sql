-- 创建财务记录表
-- 用于统一记录所有财务相关的收支
-- 作者：系统
-- 日期：2025-11-27

USE gaokongche;

START TRANSACTION;

-- 创建财务记录表
CREATE TABLE IF NOT EXISTS finance_records (
  id INT NOT NULL AUTO_INCREMENT,
  record_number VARCHAR(50) NOT NULL COMMENT '财务记录编号',
  record_type VARCHAR(20) NOT NULL COMMENT '记录类型：receipt收款, refund退款',
  source_type VARCHAR(20) NOT NULL COMMENT '来源类型：order订单, other其他',
  source_id INT NULL COMMENT '来源ID（如订单ID）',
  order_id INT NULL COMMENT '关联订单ID',
  order_number VARCHAR(50) NULL COMMENT '订单编号',
  
  -- 金额信息
  amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '金额',
  payment_method VARCHAR(50) NULL COMMENT '支付方式：cash现金, bank_transfer银行转账, alipay支付宝, wechat微信, other其他',
  
  -- 日期信息
  record_date DATE NOT NULL COMMENT '记录日期',
  
  -- 关联信息
  customer_id INT NULL COMMENT '客户ID',
  customer_name VARCHAR(255) NULL COMMENT '客户名称',
  
  -- 备注
  remark TEXT NULL COMMENT '备注',
  
  -- 附件
  attachments_json JSON NULL COMMENT '附件信息',
  
  -- 时间戳
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  PRIMARY KEY (id),
  UNIQUE KEY uniq_record_number (record_number),
  INDEX idx_record_type (record_type),
  INDEX idx_source_type (source_type),
  INDEX idx_order_id (order_id),
  INDEX idx_customer_id (customer_id),
  INDEX idx_record_date (record_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='财务记录表';

COMMIT;

