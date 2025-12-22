-- 重新设计采购管理表结构
-- 支持一个采购单包含多个设备型号

-- 1. 删除旧表
DROP TABLE IF EXISTS equipment_purchases;
DROP TABLE IF EXISTS manufacturers;
DROP VIEW IF EXISTS v_purchase_statistics;
DROP VIEW IF EXISTS v_manufacturer_supply_stats;

-- 2. 创建采购主表
CREATE TABLE IF NOT EXISTS equipment_purchases (
  id INT PRIMARY KEY AUTO_INCREMENT,
  company_id INT NOT NULL COMMENT '公司ID',
  purchase_number VARCHAR(50) NOT NULL UNIQUE COMMENT '采购单号',
  
  -- 厂家信息
  manufacturer_name VARCHAR(200) NOT NULL COMMENT '厂家名称',
  
  -- 日期信息
  purchase_date DATE NOT NULL COMMENT '采购日期',
  
  -- 财务信息
  payment_method VARCHAR(100) COMMENT '付款方式',
  payment_terms INT DEFAULT 0 COMMENT '账期（月）',
  tax_rate DECIMAL(5,2) DEFAULT 13.00 COMMENT '税率（%）',
  
  -- 购买方式
  purchase_type ENUM('cash', 'installment', 'financing') DEFAULT 'cash' COMMENT '购买方式：现金、分期、融资',
  repayment_period INT COMMENT '还款期限（月）',
  repayment_start_date DATE COMMENT '还款开始日期',
  repayment_end_date DATE COMMENT '还款结束日期',
  monthly_payment DECIMAL(15,2) COMMENT '月供金额',
  
  -- 质保信息
  warranty_period INT DEFAULT 12 COMMENT '质保期（月）',
  warranty_expiry_date DATE COMMENT '质保到期日期',
  
  -- 总计金额
  total_amount DECIMAL(15,2) DEFAULT 0 COMMENT '总金额（不含税）',
  tax_amount DECIMAL(15,2) DEFAULT 0 COMMENT '税额',
  total_with_tax DECIMAL(15,2) DEFAULT 0 COMMENT '含税总额',
  
  -- 附件
  attachments JSON COMMENT '附件列表',
  
  -- 备注
  remark TEXT COMMENT '备注',
  
  -- 审计字段
  created_by INT COMMENT '创建人ID',
  updated_by INT COMMENT '更新人ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  is_deleted BOOLEAN DEFAULT FALSE COMMENT '是否删除',
  deleted_at TIMESTAMP NULL COMMENT '删除时间',
  
  INDEX idx_company_id (company_id),
  INDEX idx_purchase_number (purchase_number),
  INDEX idx_purchase_date (purchase_date),
  INDEX idx_manufacturer_name (manufacturer_name),
  INDEX idx_is_deleted (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备采购主表';

-- 3. 创建采购明细表
CREATE TABLE IF NOT EXISTS purchase_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  purchase_id INT NOT NULL COMMENT '采购单ID',
  
  -- 设备信息
  equipment_category VARCHAR(100) NOT NULL COMMENT '设备类别',
  equipment_type VARCHAR(100) NOT NULL COMMENT '设备类型',
  equipment_model VARCHAR(200) NOT NULL COMMENT '设备型号',
  
  -- 数量和价格
  quantity INT NOT NULL DEFAULT 1 COMMENT '数量',
  unit_price DECIMAL(15,2) NOT NULL COMMENT '单价',
  subtotal DECIMAL(15,2) NOT NULL COMMENT '小计金额',
  
  -- 审计字段
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  INDEX idx_purchase_id (purchase_id),
  INDEX idx_equipment_category (equipment_category),
  INDEX idx_equipment_type (equipment_type),
  FOREIGN KEY (purchase_id) REFERENCES equipment_purchases(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购明细表';

-- 4. 创建统计视图
CREATE OR REPLACE VIEW v_purchase_statistics AS
SELECT 
  ep.company_id,
  COUNT(DISTINCT ep.id) AS total_purchases,
  SUM(pi.quantity) AS total_quantity,
  SUM(ep.total_amount) AS total_amount,
  SUM(ep.total_with_tax) AS total_with_tax,
  SUM(CASE WHEN ep.purchase_type = 'cash' THEN ep.total_with_tax ELSE 0 END) AS cash_amount,
  SUM(CASE WHEN ep.purchase_type IN ('installment', 'financing') THEN ep.total_with_tax ELSE 0 END) AS financing_amount,
  COUNT(DISTINCT ep.manufacturer_name) AS manufacturer_count,
  MAX(ep.purchase_date) AS latest_purchase_date
FROM equipment_purchases ep
LEFT JOIN purchase_items pi ON ep.id = pi.purchase_id
WHERE ep.is_deleted = FALSE
GROUP BY ep.company_id;

-- 5. 创建设备类型统计视图
CREATE OR REPLACE VIEW v_purchase_equipment_stats AS
SELECT 
  ep.company_id,
  pi.equipment_category,
  pi.equipment_type,
  COUNT(DISTINCT ep.id) AS purchase_count,
  SUM(pi.quantity) AS total_quantity,
  SUM(pi.subtotal) AS total_amount,
  AVG(pi.unit_price) AS avg_unit_price,
  MIN(ep.purchase_date) AS first_purchase_date,
  MAX(ep.purchase_date) AS latest_purchase_date
FROM equipment_purchases ep
INNER JOIN purchase_items pi ON ep.id = pi.purchase_id
WHERE ep.is_deleted = FALSE
GROUP BY ep.company_id, pi.equipment_category, pi.equipment_type;

-- 6. 创建厂家采购统计视图
CREATE OR REPLACE VIEW v_manufacturer_purchase_stats AS
SELECT 
  ep.company_id,
  ep.manufacturer_name,
  COUNT(DISTINCT ep.id) AS purchase_count,
  SUM(ep.total_with_tax) AS total_amount,
  AVG(ep.payment_terms) AS avg_payment_terms,
  MIN(ep.purchase_date) AS first_purchase_date,
  MAX(ep.purchase_date) AS latest_purchase_date
FROM equipment_purchases ep
WHERE ep.is_deleted = FALSE
GROUP BY ep.company_id, ep.manufacturer_name;

-- 完成
SELECT 'Purchase tables redesigned successfully' AS status;

