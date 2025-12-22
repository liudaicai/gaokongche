-- 创建采购还款记录表
-- 记录每个采购单每月的还款情况

CREATE TABLE IF NOT EXISTS purchase_repayments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  purchase_id INT NOT NULL COMMENT '采购单ID',
  company_id INT NOT NULL COMMENT '公司ID',
  
  -- 还款期次信息
  repayment_year INT NOT NULL COMMENT '还款年份',
  repayment_month INT NOT NULL COMMENT '还款月份（1-12）',
  repayment_date DATE COMMENT '实际还款日期',
  
  -- 金额信息
  scheduled_amount DECIMAL(15,2) NOT NULL COMMENT '应还金额',
  actual_amount DECIMAL(15,2) COMMENT '实际还款金额',
  
  -- 状态
  is_paid BOOLEAN DEFAULT FALSE COMMENT '是否已还款',
  
  -- 备注
  remark TEXT COMMENT '备注',
  
  -- 审计字段
  created_by INT COMMENT '创建人ID',
  updated_by INT COMMENT '更新人ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  INDEX idx_purchase_id (purchase_id),
  INDEX idx_company_id (company_id),
  INDEX idx_repayment_year_month (repayment_year, repayment_month),
  INDEX idx_is_paid (is_paid),
  UNIQUE KEY uk_purchase_year_month (purchase_id, repayment_year, repayment_month),
  FOREIGN KEY (purchase_id) REFERENCES equipment_purchases(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购还款记录表';

-- 创建当月还款统计视图
CREATE OR REPLACE VIEW v_monthly_repayment_stats AS
SELECT 
  company_id,
  repayment_year,
  repayment_month,
  COUNT(*) AS total_count,
  SUM(scheduled_amount) AS total_scheduled,
  SUM(CASE WHEN is_paid THEN actual_amount ELSE 0 END) AS total_paid,
  SUM(CASE WHEN NOT is_paid THEN scheduled_amount ELSE 0 END) AS total_unpaid,
  COUNT(CASE WHEN is_paid THEN 1 END) AS paid_count,
  COUNT(CASE WHEN NOT is_paid THEN 1 END) AS unpaid_count
FROM purchase_repayments
GROUP BY company_id, repayment_year, repayment_month;

SELECT 'Purchase repayments table created successfully' AS status;

