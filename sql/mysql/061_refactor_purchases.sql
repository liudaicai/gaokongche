-- 061: 重构采购管理表结构
-- 删除旧表，创建新的采购管理表

-- 删除旧表（如果存在）
DROP TABLE IF EXISTS `purchase_payments`;
DROP VIEW IF EXISTS `v_purchase_statistics`;
DROP VIEW IF EXISTS `v_manufacturer_supply_stats`;
DROP TABLE IF EXISTS `equipment_purchases`;
DROP TABLE IF EXISTS `manufacturers`;

-- 创建采购主表
CREATE TABLE IF NOT EXISTS `equipment_purchases` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `purchase_number` VARCHAR(50) NOT NULL UNIQUE COMMENT '采购单号',
  `company_id` INT NOT NULL COMMENT '公司ID',
  
  -- 厂家信息（不关联表，直接存储）
  `manufacturer_name` VARCHAR(200) NOT NULL COMMENT '厂家名称',
  `manufacturer_contact` VARCHAR(100) COMMENT '厂家联系人',
  `manufacturer_phone` VARCHAR(50) COMMENT '厂家联系电话',
  
  -- 采购基本信息
  `purchase_date` DATE NOT NULL COMMENT '采购日期',
  `total_quantity` INT DEFAULT 0 COMMENT '总数量',
  `total_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '总金额（不含税）',
  `tax_rate` DECIMAL(5,2) DEFAULT 13.00 COMMENT '税率（%）',
  `tax_amount` DECIMAL(15,2) DEFAULT 0 COMMENT '税额',
  `total_with_tax` DECIMAL(15,2) DEFAULT 0 COMMENT '含税总额',
  
  -- 付款信息
  `payment_method` VARCHAR(100) COMMENT '付款方式',
  `payment_terms_months` INT DEFAULT 0 COMMENT '账期（月）',
  
  -- 融资分期信息
  `purchase_type` ENUM('full', 'installment', 'financing') DEFAULT 'full' COMMENT '购买方式：全款、分期、融资',
  `repayment_period_months` INT COMMENT '还款期限（月）',
  `repayment_start_date` DATE COMMENT '还款开始日期',
  `repayment_end_date` DATE COMMENT '还款结束日期',
  `monthly_payment` DECIMAL(15,2) COMMENT '月供金额',
  `down_payment` DECIMAL(15,2) COMMENT '首付金额',
  `financing_institution` VARCHAR(200) COMMENT '融资机构',
  `interest_rate` DECIMAL(5,2) COMMENT '利率（%）',
  
  -- 质保信息
  `warranty_period_months` INT DEFAULT 12 COMMENT '质保期（月）',
  `warranty_expiry_date` DATE COMMENT '质保到期日期',
  
  -- 附件
  `attachments` JSON COMMENT '附件列表 [{name, url, uploadDate}]',
  
  -- 备注
  `remark` TEXT COMMENT '备注',
  `specifications` TEXT COMMENT '规格说明',
  `purchase_reason` TEXT COMMENT '采购原因',
  
  -- 状态
  `status` ENUM('draft', 'confirmed', 'received', 'completed', 'cancelled') DEFAULT 'draft' COMMENT '状态',
  
  -- 审计字段
  `created_by` INT COMMENT '创建人ID',
  `creator_name` VARCHAR(100) COMMENT '创建人姓名',
  `updated_by` INT COMMENT '更新人ID',
  `updater_name` VARCHAR(100) COMMENT '更新人姓名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted` TINYINT(1) DEFAULT 0 COMMENT '是否删除',
  `deleted_at` TIMESTAMP NULL COMMENT '删除时间',
  
  INDEX `idx_company` (`company_id`),
  INDEX `idx_purchase_number` (`purchase_number`),
  INDEX `idx_purchase_date` (`purchase_date`),
  INDEX `idx_manufacturer` (`manufacturer_name`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备采购主表';

-- 创建采购明细表（设备列表）
CREATE TABLE IF NOT EXISTS `equipment_purchase_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `purchase_id` INT NOT NULL COMMENT '采购主表ID',
  `company_id` INT NOT NULL COMMENT '公司ID',
  
  -- 设备信息
  `equipment_category` VARCHAR(100) NOT NULL COMMENT '设备类别',
  `equipment_type` VARCHAR(100) NOT NULL COMMENT '设备类型',
  `equipment_model` VARCHAR(100) COMMENT '设备型号',
  `equipment_brand` VARCHAR(100) COMMENT '设备品牌',
  `equipment_height` DECIMAL(10,2) COMMENT '设备高度（米）',
  
  -- 数量和价格
  `quantity` INT NOT NULL DEFAULT 1 COMMENT '数量',
  `unit_price` DECIMAL(15,2) NOT NULL COMMENT '单价',
  `subtotal` DECIMAL(15,2) NOT NULL COMMENT '小计',
  
  -- 质保
  `warranty_period_months` INT DEFAULT 12 COMMENT '质保期（月）',
  
  -- 备注
  `specifications` TEXT COMMENT '规格说明',
  `remark` TEXT COMMENT '备注',
  
  -- 审计字段
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  INDEX `idx_purchase` (`purchase_id`),
  INDEX `idx_company` (`company_id`),
  INDEX `idx_category` (`equipment_category`),
  INDEX `idx_type` (`equipment_type`),
  FOREIGN KEY (`purchase_id`) REFERENCES `equipment_purchases`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备采购明细表';

-- 创建采购统计视图
CREATE OR REPLACE VIEW `v_purchase_statistics` AS
SELECT 
  p.company_id,
  COUNT(p.id) as total_purchases,
  SUM(p.total_quantity) as total_quantity,
  SUM(p.total_amount) as total_amount,
  SUM(p.total_with_tax) as total_with_tax,
  SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) as completed_count,
  SUM(CASE WHEN p.purchase_type = 'installment' OR p.purchase_type = 'financing' THEN 1 ELSE 0 END) as financing_count
FROM equipment_purchases p
WHERE p.is_deleted = 0
GROUP BY p.company_id;

-- 创建设备类别统计视图
CREATE OR REPLACE VIEW `v_equipment_category_stats` AS
SELECT 
  i.company_id,
  i.equipment_category,
  i.equipment_type,
  COUNT(DISTINCT i.purchase_id) as purchase_count,
  SUM(i.quantity) as total_quantity,
  SUM(i.subtotal) as total_amount
FROM equipment_purchase_items i
INNER JOIN equipment_purchases p ON i.purchase_id = p.id
WHERE p.is_deleted = 0
GROUP BY i.company_id, i.equipment_category, i.equipment_type;

-- 插入示例数据（可选）
-- INSERT INTO equipment_purchases (purchase_number, company_id, manufacturer_name, purchase_date, tax_rate, warranty_period_months)
-- VALUES ('PUR202512100001', 1, '某某设备制造有限公司', '2025-12-10', 13.00, 12);

