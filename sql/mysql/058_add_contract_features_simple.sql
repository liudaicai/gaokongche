/**
 * 合同模板功能 - 简化版数据库迁移
 */

-- 1. 修改document_templates表
ALTER TABLE document_templates ADD COLUMN file_url VARCHAR(500) COMMENT '原始DOCX文件URL';
ALTER TABLE document_templates ADD COLUMN file_size INT COMMENT '文件大小（字节）';
ALTER TABLE document_templates ADD COLUMN template_variables JSON COMMENT '模板变量定义';
ALTER TABLE document_templates ADD COLUMN is_contract_template BOOLEAN DEFAULT FALSE COMMENT '是否为合同模板';

-- 2. 创建order_contracts表
CREATE TABLE order_contracts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL COMMENT '订单ID',
  template_id INT COMMENT '使用的模板ID',
  contract_number VARCHAR(50) NOT NULL COMMENT '合同编号',
  contract_file_url VARCHAR(500) COMMENT '生成的合同文件URL',
  file_size INT COMMENT '合同文件大小（字节）',
  status ENUM('draft', 'generated', 'signed', 'cancelled') DEFAULT 'draft' COMMENT '合同状态',
  generated_at DATETIME COMMENT '生成时间',
  signed_at DATETIME COMMENT '签署时间',
  signed_by_customer VARCHAR(100) COMMENT '客户签署人',
  signed_by_company VARCHAR(100) COMMENT '公司签署人',
  effective_date DATE COMMENT '合同生效日期',
  expiry_date DATE COMMENT '合同到期日期',
  created_by INT COMMENT '创建人ID',
  company_id INT COMMENT '公司ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_order_id (order_id),
  INDEX idx_contract_number (contract_number),
  INDEX idx_status (status),
  INDEX idx_company_id (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单合同表';

-- 3. 修改orders表
ALTER TABLE orders ADD COLUMN contract_template_id INT COMMENT '使用的合同模板ID';
ALTER TABLE orders ADD COLUMN has_contract BOOLEAN DEFAULT FALSE COMMENT '是否已生成合同';

-- 4. 创建视图
CREATE OR REPLACE VIEW v_contract_overview AS
SELECT 
  oc.id AS contract_id,
  oc.contract_number,
  oc.status AS contract_status,
  oc.generated_at,
  oc.signed_at,
  o.id AS order_id,
  o.order_number,
  o.customer_name,
  o.total_amount,
  t.name AS template_name,
  t.document_type,
  oc.company_id
FROM order_contracts oc
LEFT JOIN orders o ON oc.order_id = o.id
LEFT JOIN document_templates t ON oc.template_id = t.id;

-- 5. 插入默认合同模板
INSERT INTO document_templates (
  name,
  description,
  document_type,
  content,
  is_contract_template,
  is_enabled,
  is_default,
  template_variables
) VALUES (
  '标准租赁合同模板',
  '适用于设备租赁的标准合同模板',
  'contract',
  '<h1>设备租赁合同</h1><p>合同编号：{contractNumber}</p><p>客户：{customerName}</p>',
  TRUE,
  TRUE,
  TRUE,
  '["contractNumber","customerName","orderNumber","totalAmount"]'
) ON DUPLICATE KEY UPDATE name=name;

