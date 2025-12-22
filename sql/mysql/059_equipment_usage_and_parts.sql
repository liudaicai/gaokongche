-- =====================================================
-- 设备使用率分析 & 高价值配件更换追踪系统
-- 创建时间: 2025-12-10
-- 功能: 
--   1. 设备使用率统计分析
--   2. 高价值配件更换记录追踪
--   3. 配件保修管理
-- =====================================================

USE gaokongche;

-- =====================================================
-- 1. 设备使用率统计表
-- =====================================================

CREATE TABLE IF NOT EXISTS equipment_usage_statistics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  equipment_id INT NOT NULL COMMENT '设备ID',
  stat_month DATE NOT NULL COMMENT '统计月份（YYYY-MM-01）',
  
  -- 时间统计
  total_days INT DEFAULT 0 COMMENT '总天数',
  rental_days INT DEFAULT 0 COMMENT '出租天数',
  idle_days INT DEFAULT 0 COMMENT '闲置天数',
  maintenance_days INT DEFAULT 0 COMMENT '维修天数',
  
  -- 利用率指标
  utilization_rate DECIMAL(5,2) COMMENT '利用率(%)',
  availability_rate DECIMAL(5,2) COMMENT '可用率(%) = (总天数-维修天数)/总天数',
  
  -- 财务指标
  rental_income DECIMAL(12,2) DEFAULT 0 COMMENT '租金收入',
  maintenance_cost DECIMAL(12,2) DEFAULT 0 COMMENT '维护成本',
  parts_cost DECIMAL(12,2) DEFAULT 0 COMMENT '配件成本',
  net_profit DECIMAL(12,2) COMMENT '净利润',
  
  -- 运营指标
  rental_count INT DEFAULT 0 COMMENT '出租次数',
  customer_count INT DEFAULT 0 COMMENT '客户数量',
  average_rental_days DECIMAL(5,1) COMMENT '平均租期（天）',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_equipment_month (equipment_id, stat_month),
  INDEX idx_stat_month (stat_month),
  INDEX idx_utilization_rate (utilization_rate)
) COMMENT='设备使用率统计表';

-- =====================================================
-- 2. 高价值配件类别表
-- =====================================================

CREATE TABLE IF NOT EXISTS high_value_part_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(50) NOT NULL COMMENT '配件类别名称',
  category_code VARCHAR(20) NOT NULL COMMENT '类别代码',
  description TEXT COMMENT '描述',
  typical_price_range VARCHAR(50) COMMENT '典型价格范围',
  default_warranty_months INT DEFAULT 12 COMMENT '默认保修月数',
  is_critical BOOLEAN DEFAULT TRUE COMMENT '是否关键部件',
  sort_order INT DEFAULT 0 COMMENT '排序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_category_code (category_code)
) COMMENT='高价值配件类别表';

-- 插入预设配件类别
INSERT INTO high_value_part_categories (category_name, category_code, description, typical_price_range, default_warranty_months, is_critical, sort_order) VALUES
('电池组', 'BATTERY', '蓄电池、锂电池组等动力电池', '¥5,000-50,000', 12, TRUE, 1),
('电机', 'MOTOR', '驱动电机、升降电机等主要电机', '¥8,000-60,000', 18, TRUE, 2),
('液压系统', 'HYDRAULIC', '液压泵、液压缸、液压阀等', '¥10,000-80,000', 12, TRUE, 3),
('ECU控制器', 'ECU', '电子控制单元、主控板', '¥6,000-40,000', 24, TRUE, 4),
('变速箱', 'GEARBOX', '变速器总成', '¥15,000-100,000', 18, TRUE, 5),
('转向系统', 'STEERING', '转向机、转向泵等', '¥5,000-30,000', 12, TRUE, 6),
('制动系统', 'BRAKE', '制动器、制动泵等', '¥3,000-20,000', 12, TRUE, 7),
('显示屏', 'DISPLAY', '操作显示屏、仪表盘', '¥2,000-15,000', 12, FALSE, 8),
('传感器组', 'SENSOR', '各类传感器套件', '¥1,000-10,000', 12, FALSE, 9),
('其他高值件', 'OTHER', '其他高价值部件', '¥5,000+', 12, FALSE, 10)
ON DUPLICATE KEY UPDATE
  category_name = VALUES(category_name),
  description = VALUES(description),
  typical_price_range = VALUES(typical_price_range),
  default_warranty_months = VALUES(default_warranty_months);

-- =====================================================
-- 3. 设备配件更换记录表
-- =====================================================

CREATE TABLE IF NOT EXISTS equipment_part_replacements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  equipment_id INT NOT NULL COMMENT '设备ID',
  
  -- 配件信息
  part_category_id INT NOT NULL COMMENT '配件类别ID',
  part_name VARCHAR(100) NOT NULL COMMENT '配件名称',
  part_model VARCHAR(100) COMMENT '配件型号',
  part_brand VARCHAR(50) COMMENT '配件品牌',
  part_serial_number VARCHAR(100) COMMENT '配件序列号',
  
  -- 更换信息
  replacement_date DATE NOT NULL COMMENT '更换日期',
  replacement_reason ENUM('故障', '损坏', '老化', '升级', '保养', '其他') DEFAULT '故障' COMMENT '更换原因',
  failure_description TEXT COMMENT '故障描述',
  
  -- 旧件信息
  old_part_serial_number VARCHAR(100) COMMENT '旧件序列号',
  old_part_usage_days INT COMMENT '旧件使用天数',
  old_part_usage_hours INT COMMENT '旧件使用小时数',
  
  -- 财务信息
  part_cost DECIMAL(10,2) NOT NULL COMMENT '配件成本',
  labor_cost DECIMAL(10,2) DEFAULT 0 COMMENT '人工费用',
  total_cost DECIMAL(10,2) NOT NULL COMMENT '总费用',
  
  -- 保修信息
  warranty_months INT DEFAULT 12 COMMENT '保修月数',
  warranty_start_date DATE COMMENT '保修开始日期',
  warranty_end_date DATE COMMENT '保修结束日期',
  warranty_status ENUM('在保', '已过保', '即将过保') COMMENT '保修状态',
  
  -- 供应商信息
  supplier_name VARCHAR(100) COMMENT '供应商名称',
  supplier_contact VARCHAR(100) COMMENT '供应商联系方式',
  purchase_order_no VARCHAR(50) COMMENT '采购单号',
  
  -- 操作信息
  technician_name VARCHAR(50) COMMENT '更换技师',
  work_hours DECIMAL(5,2) COMMENT '工时',
  order_id INT COMMENT '关联订单ID（如果是租赁期间更换）',
  
  -- 附件
  invoice_file VARCHAR(255) COMMENT '发票文件路径',
  photo_files JSON COMMENT '照片文件路径数组',
  
  notes TEXT COMMENT '备注',
  created_by INT COMMENT '创建人',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_equipment_id (equipment_id),
  INDEX idx_replacement_date (replacement_date),
  INDEX idx_warranty_status (warranty_status),
  INDEX idx_part_category (part_category_id),
  FOREIGN KEY (equipment_id) REFERENCES equipments(id) ON DELETE CASCADE,
  FOREIGN KEY (part_category_id) REFERENCES high_value_part_categories(id)
) COMMENT='设备配件更换记录表';

-- =====================================================
-- 4. 配件保修提醒表
-- =====================================================

CREATE TABLE IF NOT EXISTS part_warranty_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  replacement_id INT NOT NULL COMMENT '更换记录ID',
  equipment_id INT NOT NULL COMMENT '设备ID',
  alert_type ENUM('即将过保', '已过保', '保修期内故障') COMMENT '提醒类型',
  alert_date DATE NOT NULL COMMENT '提醒日期',
  is_read BOOLEAN DEFAULT FALSE COMMENT '是否已读',
  is_handled BOOLEAN DEFAULT FALSE COMMENT '是否已处理',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_equipment_id (equipment_id),
  INDEX idx_alert_date (alert_date),
  INDEX idx_is_read (is_read),
  FOREIGN KEY (replacement_id) REFERENCES equipment_part_replacements(id) ON DELETE CASCADE,
  FOREIGN KEY (equipment_id) REFERENCES equipments(id) ON DELETE CASCADE
) COMMENT='配件保修提醒表';

-- =====================================================
-- 5. 创建视图：设备配件更换汇总
-- =====================================================

CREATE OR REPLACE VIEW v_equipment_part_summary AS
SELECT 
  e.id AS equipment_id,
  e.equipment_code,
  e.brand,
  e.model,
  COUNT(DISTINCT r.id) AS total_replacements,
  COUNT(DISTINCT r.part_category_id) AS replaced_part_types,
  SUM(r.total_cost) AS total_replacement_cost,
  MAX(r.replacement_date) AS last_replacement_date,
  SUM(CASE WHEN r.warranty_status = '在保' THEN 1 ELSE 0 END) AS parts_under_warranty,
  SUM(CASE WHEN r.warranty_status = '即将过保' THEN 1 ELSE 0 END) AS parts_expiring_soon,
  SUM(CASE WHEN r.warranty_status = '已过保' THEN 1 ELSE 0 END) AS parts_out_of_warranty
FROM equipments e
LEFT JOIN equipment_part_replacements r ON e.id = r.equipment_id
GROUP BY e.id, e.equipment_code, e.brand, e.model;

-- =====================================================
-- 6. 创建视图：设备使用率概览
-- =====================================================

CREATE OR REPLACE VIEW v_equipment_usage_overview AS
SELECT 
  e.id AS equipment_id,
  e.equipment_code,
  e.brand,
  e.model,
  e.status,
  COALESCE(AVG(s.utilization_rate), 0) AS avg_utilization_rate,
  COALESCE(AVG(s.availability_rate), 0) AS avg_availability_rate,
  COALESCE(SUM(s.rental_income), 0) AS total_rental_income,
  COALESCE(SUM(s.net_profit), 0) AS total_net_profit,
  COALESCE(SUM(s.rental_days), 0) AS total_rental_days,
  COALESCE(SUM(s.idle_days), 0) AS total_idle_days,
  COALESCE(SUM(s.maintenance_days), 0) AS total_maintenance_days,
  MAX(s.stat_month) AS last_stat_month
FROM equipments e
LEFT JOIN equipment_usage_statistics s ON e.id = s.equipment_id
GROUP BY e.id, e.equipment_code, e.brand, e.model, e.status;

-- =====================================================
-- 7. 添加示例数据（可选，用于测试）
-- =====================================================

-- 注意：以下INSERT语句仅用于开发测试，生产环境请注释掉

-- 示例：为设备ID=1添加使用率统计数据
-- INSERT INTO equipment_usage_statistics 
-- (equipment_id, stat_month, total_days, rental_days, idle_days, maintenance_days, 
--  utilization_rate, availability_rate, rental_income, maintenance_cost, parts_cost, net_profit,
--  rental_count, customer_count, average_rental_days)
-- VALUES
-- (1, '2024-01-01', 31, 25, 5, 1, 80.65, 96.77, 45000, 5000, 2000, 38000, 3, 3, 8.3),
-- (1, '2024-02-01', 29, 22, 6, 1, 75.86, 96.55, 38000, 4000, 1000, 33000, 2, 2, 11.0),
-- (1, '2024-03-01', 31, 28, 3, 0, 90.32, 100.00, 52000, 3000, 0, 49000, 4, 4, 7.0);

-- 示例：为设备ID=1添加配件更换记录
-- INSERT INTO equipment_part_replacements
-- (equipment_id, part_category_id, part_name, part_model, part_brand, part_serial_number,
--  replacement_date, replacement_reason, failure_description, 
--  old_part_serial_number, old_part_usage_days, old_part_usage_hours,
--  part_cost, labor_cost, total_cost,
--  warranty_months, warranty_start_date, warranty_end_date, warranty_status,
--  supplier_name, supplier_contact, technician_name, work_hours, notes, created_by)
-- VALUES
-- (1, 1, '锂电池组 48V 400Ah', 'LFP-48-400', '宁德时代', 'CATL20240101001',
--  '2024-01-15', '故障', '电池容量衰减超过30%，无法满足工作需求',
--  'CATL20220305012', 680, 5440,
--  35000, 2000, 37000,
--  18, '2024-01-15', '2025-07-15', '在保',
--  '宁德时代授权经销商', '13800138000', '张师傅', 4.0, '更换后测试正常', 1);

-- =====================================================
-- 8. 创建存储过程：计算设备月度使用率
-- =====================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_calculate_equipment_usage$$

CREATE PROCEDURE sp_calculate_equipment_usage(
  IN p_equipment_id INT,
  IN p_month DATE  -- 格式：'2024-01-01'
)
BEGIN
  DECLARE v_total_days INT;
  DECLARE v_rental_days INT;
  DECLARE v_maintenance_days INT;
  DECLARE v_idle_days INT;
  DECLARE v_utilization_rate DECIMAL(5,2);
  DECLARE v_availability_rate DECIMAL(5,2);
  DECLARE v_rental_income DECIMAL(12,2);
  DECLARE v_maintenance_cost DECIMAL(12,2);
  DECLARE v_parts_cost DECIMAL(12,2);
  DECLARE v_net_profit DECIMAL(12,2);
  DECLARE v_rental_count INT;
  DECLARE v_customer_count INT;
  DECLARE v_average_rental_days DECIMAL(5,1);
  DECLARE v_month_start DATE;
  DECLARE v_month_end DATE;
  
  -- 计算月份的开始和结束日期
  SET v_month_start = DATE_FORMAT(p_month, '%Y-%m-01');
  SET v_month_end = LAST_DAY(v_month_start);
  SET v_total_days = DAY(v_month_end);
  
  -- 1. 统计出租天数（从订单表）
  SELECT COALESCE(COUNT(DISTINCT DATE(start_date_actual)), 0) INTO v_rental_days
  FROM orders
  WHERE equipment_id = p_equipment_id
    AND status IN ('in_progress', 'completed', 'exited')
    AND start_date_actual IS NOT NULL
    AND start_date_actual <= v_month_end
    AND (end_date_actual IS NULL OR end_date_actual >= v_month_start);
  
  -- 2. 统计维修天数（从维修记录表，如果有的话）
  -- 这里假设有 maintenance_records 表
  -- 如果没有，可以设置为0
  SET v_maintenance_days = 0;
  
  -- 3. 计算闲置天数
  SET v_idle_days = v_total_days - v_rental_days - v_maintenance_days;
  IF v_idle_days < 0 THEN
    SET v_idle_days = 0;
  END IF;
  
  -- 4. 计算利用率
  IF v_total_days > 0 THEN
    SET v_utilization_rate = (v_rental_days / v_total_days) * 100;
  ELSE
    SET v_utilization_rate = 0;
  END IF;
  
  -- 5. 计算可用率
  IF v_total_days > 0 THEN
    SET v_availability_rate = ((v_total_days - v_maintenance_days) / v_total_days) * 100;
  ELSE
    SET v_availability_rate = 0;
  END IF;
  
  -- 6. 统计租金收入（从订单表）
  SELECT COALESCE(SUM(actual_rent), 0) INTO v_rental_income
  FROM orders
  WHERE equipment_id = p_equipment_id
    AND status IN ('in_progress', 'completed', 'exited')
    AND start_date_actual >= v_month_start
    AND start_date_actual <= v_month_end;
  
  -- 7. 统计维护成本（从配件更换记录）
  SELECT COALESCE(SUM(total_cost), 0) INTO v_parts_cost
  FROM equipment_part_replacements
  WHERE equipment_id = p_equipment_id
    AND replacement_date >= v_month_start
    AND replacement_date <= v_month_end;
  
  SET v_maintenance_cost = v_parts_cost;
  
  -- 8. 计算净利润
  SET v_net_profit = v_rental_income - v_maintenance_cost - v_parts_cost;
  
  -- 9. 统计出租次数
  SELECT COUNT(*) INTO v_rental_count
  FROM orders
  WHERE equipment_id = p_equipment_id
    AND status IN ('in_progress', 'completed', 'exited')
    AND start_date_actual >= v_month_start
    AND start_date_actual <= v_month_end;
  
  -- 10. 统计客户数量
  SELECT COUNT(DISTINCT customer_id) INTO v_customer_count
  FROM orders
  WHERE equipment_id = p_equipment_id
    AND status IN ('in_progress', 'completed', 'exited')
    AND start_date_actual >= v_month_start
    AND start_date_actual <= v_month_end;
  
  -- 11. 计算平均租期
  IF v_rental_count > 0 THEN
    SET v_average_rental_days = v_rental_days / v_rental_count;
  ELSE
    SET v_average_rental_days = 0;
  END IF;
  
  -- 12. 插入或更新统计数据
  INSERT INTO equipment_usage_statistics (
    equipment_id, stat_month, total_days, rental_days, idle_days, maintenance_days,
    utilization_rate, availability_rate, rental_income, maintenance_cost, parts_cost, net_profit,
    rental_count, customer_count, average_rental_days
  ) VALUES (
    p_equipment_id, v_month_start, v_total_days, v_rental_days, v_idle_days, v_maintenance_days,
    v_utilization_rate, v_availability_rate, v_rental_income, v_maintenance_cost, v_parts_cost, v_net_profit,
    v_rental_count, v_customer_count, v_average_rental_days
  )
  ON DUPLICATE KEY UPDATE
    total_days = v_total_days,
    rental_days = v_rental_days,
    idle_days = v_idle_days,
    maintenance_days = v_maintenance_days,
    utilization_rate = v_utilization_rate,
    availability_rate = v_availability_rate,
    rental_income = v_rental_income,
    maintenance_cost = v_maintenance_cost,
    parts_cost = v_parts_cost,
    net_profit = v_net_profit,
    rental_count = v_rental_count,
    customer_count = v_customer_count,
    average_rental_days = v_average_rental_days,
    updated_at = CURRENT_TIMESTAMP;
    
END$$

DELIMITER ;

-- =====================================================
-- 9. 创建事件：每月自动计算所有设备的使用率
-- =====================================================

-- 启用事件调度器
SET GLOBAL event_scheduler = ON;

-- 删除已存在的事件
DROP EVENT IF EXISTS evt_monthly_usage_calculation;

-- 创建每月计算事件（每月1号凌晨2点执行）
CREATE EVENT IF NOT EXISTS evt_monthly_usage_calculation
ON SCHEDULE EVERY 1 MONTH
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 MONTH + INTERVAL 2 HOUR)
DO
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE v_equipment_id INT;
  DECLARE v_last_month DATE;
  DECLARE cur CURSOR FOR SELECT id FROM equipments WHERE status != 'retired';
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
  
  -- 计算上个月
  SET v_last_month = DATE_FORMAT(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH), '%Y-%m-01');
  
  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_equipment_id;
    IF done THEN
      LEAVE read_loop;
    END IF;
    
    -- 调用存储过程计算使用率
    CALL sp_calculate_equipment_usage(v_equipment_id, v_last_month);
  END LOOP;
  CLOSE cur;
END;

-- =====================================================
-- 10. 创建触发器：自动更新保修状态
-- =====================================================

DELIMITER $$

DROP TRIGGER IF EXISTS trg_update_warranty_status_before_insert$$

CREATE TRIGGER trg_update_warranty_status_before_insert
BEFORE INSERT ON equipment_part_replacements
FOR EACH ROW
BEGIN
  -- 如果设置了保修月数，自动计算保修结束日期
  IF NEW.warranty_months IS NOT NULL AND NEW.warranty_months > 0 THEN
    IF NEW.warranty_start_date IS NULL THEN
      SET NEW.warranty_start_date = NEW.replacement_date;
    END IF;
    SET NEW.warranty_end_date = DATE_ADD(NEW.warranty_start_date, INTERVAL NEW.warranty_months MONTH);
    
    -- 自动设置保修状态
    SET NEW.warranty_status = CASE
      WHEN DATEDIFF(NEW.warranty_end_date, CURDATE()) < 0 THEN '已过保'
      WHEN DATEDIFF(NEW.warranty_end_date, CURDATE()) <= 30 THEN '即将过保'
      ELSE '在保'
    END;
  END IF;
  
  -- 自动计算总费用
  SET NEW.total_cost = NEW.part_cost + COALESCE(NEW.labor_cost, 0);
END$$

DROP TRIGGER IF EXISTS trg_update_warranty_status_before_update$$

CREATE TRIGGER trg_update_warranty_status_before_update
BEFORE UPDATE ON equipment_part_replacements
FOR EACH ROW
BEGIN
  -- 如果保修月数或开始日期发生变化，重新计算
  IF NEW.warranty_months != OLD.warranty_months OR NEW.warranty_start_date != OLD.warranty_start_date THEN
    IF NEW.warranty_months IS NOT NULL AND NEW.warranty_months > 0 THEN
      SET NEW.warranty_end_date = DATE_ADD(NEW.warranty_start_date, INTERVAL NEW.warranty_months MONTH);
    END IF;
  END IF;
  
  -- 更新保修状态
  IF NEW.warranty_end_date IS NOT NULL THEN
    SET NEW.warranty_status = CASE
      WHEN DATEDIFF(NEW.warranty_end_date, CURDATE()) < 0 THEN '已过保'
      WHEN DATEDIFF(NEW.warranty_end_date, CURDATE()) <= 30 THEN '即将过保'
      ELSE '在保'
    END;
  END IF;
  
  -- 自动更新总费用
  SET NEW.total_cost = NEW.part_cost + COALESCE(NEW.labor_cost, 0);
END$$

DELIMITER ;

-- =====================================================
-- 完成！
-- =====================================================

SELECT '✅ 设备使用率分析 & 配件追踪系统数据库创建完成！' AS message;
SELECT COUNT(*) AS '配件类别数量' FROM high_value_part_categories;

