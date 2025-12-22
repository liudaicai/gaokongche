-- ============================================
-- 部门和职务管理系统
-- 创建时间: 2025-12-19
-- 方案: 简化版（方案A）
-- ============================================

-- ============================================
-- 1. 部门表（departments）
-- ============================================
CREATE TABLE IF NOT EXISTS departments (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '部门名称',
  code VARCHAR(50) COMMENT '部门编码',
  parent_id INT DEFAULT NULL COMMENT '上级部门ID（支持树形结构）',
  
  -- 部门类型
  type ENUM('headquarters', 'branch', 'store', 'department') DEFAULT 'department' COMMENT '部门类型：总部/分公司/门店/部门',
  
  -- 负责人
  manager_id INT COMMENT '部门负责人用户ID',
  manager_name VARCHAR(100) COMMENT '部门负责人姓名',
  
  -- 联系信息
  phone VARCHAR(50) COMMENT '联系电话',
  email VARCHAR(100) COMMENT '邮箱',
  address TEXT COMMENT '地址',
  
  -- 排序和状态
  sort_order INT DEFAULT 0 COMMENT '排序号',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  description TEXT COMMENT '部门描述',
  
  -- 元信息
  created_by INT COMMENT '创建人',
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at DATETIME(3),
  
  INDEX idx_parent_id (parent_id),
  INDEX idx_type (type),
  INDEX idx_manager_id (manager_id),
  INDEX idx_is_active (is_active),
  INDEX idx_is_deleted (is_deleted),
  UNIQUE INDEX idx_code (code, is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='部门表';

-- ============================================
-- 2. 职务表（positions）
-- ============================================
CREATE TABLE IF NOT EXISTS positions (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '职务名称',
  code VARCHAR(50) COMMENT '职务编码',
  
  -- 职级
  level INT DEFAULT 0 COMMENT '职级（1-10，数字越大职级越高，用于审批路由）',
  category ENUM('leadership', 'management', 'staff', 'other') DEFAULT 'staff' COMMENT '职务类别：领导/管理/员工/其他',
  
  -- 关联部门（可选，如果职务属于特定部门）
  department_id INT COMMENT '所属部门ID（NULL表示通用职务）',
  
  -- 描述
  description TEXT COMMENT '职务描述',
  responsibilities TEXT COMMENT '岗位职责',
  
  -- 审批权限
  can_approve BOOLEAN DEFAULT FALSE COMMENT '是否有审批权限',
  approval_level INT DEFAULT 0 COMMENT '审批级别（用于审批流）',
  
  -- 排序和状态
  sort_order INT DEFAULT 0 COMMENT '排序号',
  is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  
  -- 元信息
  created_by INT COMMENT '创建人',
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at DATETIME(3),
  
  INDEX idx_level (level),
  INDEX idx_category (category),
  INDEX idx_department_id (department_id),
  INDEX idx_is_active (is_active),
  INDEX idx_is_deleted (is_deleted),
  UNIQUE INDEX idx_code (code, is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='职务表';

-- ============================================
-- 3. 扩展 users 表
-- ============================================

-- 检查并添加 department_id 字段
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'gaokongche' 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'department_id'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN department_id INT COMMENT ''所属部门ID'' AFTER role',
  'SELECT ''Column department_id already exists'' as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 position_id 字段
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'gaokongche' 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'position_id'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN position_id INT COMMENT ''主职务ID'' AFTER department_id',
  'SELECT ''Column position_id already exists'' as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 superior_id 字段
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'gaokongche' 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'superior_id'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN superior_id INT COMMENT ''直属上级用户ID'' AFTER position_id',
  'SELECT ''Column superior_id already exists'' as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加 position_level 字段
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'gaokongche' 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'position_level'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN position_level INT DEFAULT 0 COMMENT ''职级（用于审批路由）'' AFTER superior_id',
  'SELECT ''Column position_level already exists'' as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加索引
SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = 'gaokongche' 
    AND TABLE_NAME = 'users' 
    AND INDEX_NAME = 'idx_department_id'
);
SET @sql = IF(@index_exists = 0,
  'ALTER TABLE users ADD INDEX idx_department_id (department_id)',
  'SELECT ''Index idx_department_id already exists'' as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = 'gaokongche' 
    AND TABLE_NAME = 'users' 
    AND INDEX_NAME = 'idx_position_id'
);
SET @sql = IF(@index_exists = 0,
  'ALTER TABLE users ADD INDEX idx_position_id (position_id)',
  'SELECT ''Index idx_position_id already exists'' as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = 'gaokongche' 
    AND TABLE_NAME = 'users' 
    AND INDEX_NAME = 'idx_superior_id'
);
SET @sql = IF(@index_exists = 0,
  'ALTER TABLE users ADD INDEX idx_superior_id (superior_id)',
  'SELECT ''Index idx_superior_id already exists'' as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 4. 插入默认数据
-- ============================================

-- 默认部门数据
INSERT INTO departments (name, code, type, description, sort_order, is_active) VALUES
  ('总部', 'HQ', 'headquarters', '公司总部', 1, TRUE),
  ('业务部', 'SALES', 'department', '负责业务开拓和客户管理', 2, TRUE),
  ('财务部', 'FINANCE', 'department', '负责财务管理和核算', 3, TRUE),
  ('设备部', 'EQUIPMENT', 'department', '负责设备管理和维护', 4, TRUE),
  ('行政部', 'ADMIN', 'department', '负责行政和人事管理', 5, TRUE)
ON DUPLICATE KEY UPDATE 
  name = VALUES(name),
  description = VALUES(description);

-- 默认职务数据
INSERT INTO positions (name, code, level, category, can_approve, approval_level, description, sort_order, is_active) VALUES
  ('总经理', 'CEO', 10, 'leadership', TRUE, 10, '公司最高管理者', 1, TRUE),
  ('副总经理', 'VP', 9, 'leadership', TRUE, 9, '协助总经理管理公司', 2, TRUE),
  ('部门经理', 'MANAGER', 7, 'management', TRUE, 7, '部门负责人', 3, TRUE),
  ('主管', 'SUPERVISOR', 5, 'management', TRUE, 5, '团队负责人', 4, TRUE),
  ('专员', 'SPECIALIST', 3, 'staff', FALSE, 3, '专业人员', 5, TRUE),
  ('操作员', 'OPERATOR', 2, 'staff', FALSE, 2, '操作人员', 6, TRUE),
  ('财务经理', 'FINANCE_MANAGER', 7, 'management', TRUE, 7, '财务部门负责人', 7, TRUE),
  ('设备经理', 'EQUIPMENT_MANAGER', 7, 'management', TRUE, 7, '设备部门负责人', 8, TRUE)
ON DUPLICATE KEY UPDATE 
  name = VALUES(name),
  level = VALUES(level),
  description = VALUES(description);

-- ============================================
-- 5. 创建视图（暂时跳过，后续单独创建）
-- ============================================
-- 视图创建因字段歧义问题暂时跳过，将在后端API中直接查询

-- ============================================
-- 完成
-- ============================================

SELECT 'Departments and Positions system created successfully!' as message;
