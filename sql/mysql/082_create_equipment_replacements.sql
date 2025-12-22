-- ============================================
-- 换机记录表
-- ============================================
-- 用途：记录订单中设备更换的历史记录
-- 场景：设备维修但客户着急使用，需要更换设备
-- 创建时间：2024-12-17
-- ============================================

USE gaokongche;

-- 创建换机记录表
CREATE TABLE IF NOT EXISTS equipment_replacements (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '换机记录ID',
  
  -- 订单信息
  order_id VARCHAR(50) NOT NULL COMMENT '订单ID',
  order_number VARCHAR(50) COMMENT '订单编号',
  
  -- 设备信息
  old_equipment_id INT NOT NULL COMMENT '原设备ID',
  old_equipment_code VARCHAR(100) COMMENT '原设备编号',
  new_equipment_id INT NOT NULL COMMENT '新设备ID',
  new_equipment_code VARCHAR(100) COMMENT '新设备编号',
  
  -- 更换原因和责任
  reason VARCHAR(500) NOT NULL COMMENT '更换原因',
  responsibility_party ENUM('customer', 'company') NOT NULL DEFAULT 'company' COMMENT '责任方：customer-客户，company-我方',
  
  -- 费用信息
  transport_fee DECIMAL(10, 2) DEFAULT 0.00 COMMENT '运输费用',
  transport_fee_payer ENUM('customer', 'company') NOT NULL DEFAULT 'company' COMMENT '运输费用承担方',
  
  -- 价格信息（保持原价格）
  original_daily_rate DECIMAL(10, 2) COMMENT '原设备日租金',
  original_monthly_rate DECIMAL(10, 2) COMMENT '原设备月租金',
  keep_original_rate TINYINT(1) DEFAULT 1 COMMENT '是否保持原价格（1-是，0-否）',
  
  -- 更换时间
  replacement_date DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) COMMENT '更换时间',
  
  -- 操作信息
  operator_id INT COMMENT '操作人ID',
  operator_name VARCHAR(100) COMMENT '操作人姓名',
  
  -- 备注
  remarks TEXT COMMENT '备注',
  
  -- 审核状态
  status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending' COMMENT '状态：pending-待审核，approved-已审核，rejected-已拒绝，completed-已完成',
  approved_by INT COMMENT '审核人ID',
  approved_at DATETIME(3) COMMENT '审核时间',
  
  -- 系统字段
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  is_deleted TINYINT(1) DEFAULT 0 COMMENT '软删除标记',
  deleted_at DATETIME(3) COMMENT '删除时间',
  
  -- 索引
  INDEX idx_order_id (order_id),
  INDEX idx_old_equipment (old_equipment_id),
  INDEX idx_new_equipment (new_equipment_id),
  INDEX idx_replacement_date (replacement_date),
  INDEX idx_status (status),
  INDEX idx_is_deleted (is_deleted),
  
  -- 外键
  FOREIGN KEY (old_equipment_id) REFERENCES equipments(id) ON DELETE RESTRICT,
  FOREIGN KEY (new_equipment_id) REFERENCES equipments(id) ON DELETE RESTRICT
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='换机记录表';

-- ============================================
-- 初始化说明
-- ============================================
-- 
-- 业务流程：
-- 1. 客户设备出现问题需要更换
-- 2. 创建换机申请（状态：pending）
-- 3. 管理员审核（approved/rejected）
-- 4. 审核通过后执行换机操作：
--    - 原设备退回仓库（状态：available）
--    - 新设备进场（状态：renting）
--    - 更新订单的设备信息
--    - 记录换机历史（状态：completed）
-- 
-- 价格规则：
-- - 默认保持原设备价格
-- - 即使新设备高度不同，租金仍按原设备计算
-- - 运输费用另计，根据责任方收取
-- 
-- ============================================

SELECT '✅ 换机记录表创建成功！' as message;
