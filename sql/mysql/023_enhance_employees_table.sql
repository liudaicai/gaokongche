-- ============================================
-- 员工模块增强 - 数据库表扩展脚本
-- 作者: AI 开发助手
-- 日期: 2025-11-15
-- 说明: 扩展员工表字段，添加员工编号、部门、职位、状态等
-- ============================================

START TRANSACTION;

-- ============================================
-- 1. 扩展员工表字段
-- ============================================

SET @dbname = DATABASE();
SET @tablename = 'employees';

-- 员工编号
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'employee_number');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN employee_number VARCHAR(50) NULL COMMENT ''员工编号''', 'SELECT ''Column employee_number already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 部门
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'department');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN department VARCHAR(100) NULL COMMENT ''部门''', 'SELECT ''Column department already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 职位
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'position');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN position VARCHAR(100) NULL COMMENT ''职位''', 'SELECT ''Column position already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 级别
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'level');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN level VARCHAR(50) DEFAULT ''staff'' COMMENT ''级别：intern/staff/senior/manager/director''', 'SELECT ''Column level already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 直属上级ID
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'direct_leader_id');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN direct_leader_id INT NULL COMMENT ''直属上级ID''', 'SELECT ''Column direct_leader_id already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 直属上级姓名（冗余字段）
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'direct_leader_name');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN direct_leader_name VARCHAR(255) NULL COMMENT ''直属上级姓名''', 'SELECT ''Column direct_leader_name already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 入职日期
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'hire_date');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN hire_date DATE NULL COMMENT ''入职日期''', 'SELECT ''Column hire_date already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 身份证号
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'id_card_number');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN id_card_number VARCHAR(18) NULL COMMENT ''身份证号''', 'SELECT ''Column id_card_number already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 紧急联系人
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'emergency_contact');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN emergency_contact VARCHAR(255) NULL COMMENT ''紧急联系人''', 'SELECT ''Column emergency_contact already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 紧急联系电话
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'emergency_phone');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN emergency_phone VARCHAR(50) NULL COMMENT ''紧急联系电话''', 'SELECT ''Column emergency_phone already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 状态
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'status');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN status VARCHAR(50) DEFAULT ''active'' COMMENT ''状态：active/inactive/resigned''', 'SELECT ''Column status already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 离职日期
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'resign_date');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN resign_date DATE NULL COMMENT ''离职日期''', 'SELECT ''Column resign_date already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 备注
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'notes');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN notes TEXT NULL COMMENT ''备注''', 'SELECT ''Column notes already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================
-- 2. 添加索引
-- ============================================

-- 员工编号唯一索引（如果有company_id则创建复合索引，否则创建单列索引）
SET @has_company_id = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'company_id');
SET @index_check = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND INDEX_NAME = 'idx_employee_number');

SET @sql = IF(@index_check = 0 AND @has_company_id > 0, 
  'CREATE UNIQUE INDEX uniq_employee_number_company ON employees(employee_number, company_id)',
  IF(@index_check = 0, 'CREATE INDEX idx_employee_number ON employees(employee_number)', 
  'SELECT ''Index already exists''')
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 部门索引
SET @index_check = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND INDEX_NAME = 'idx_employees_department');
SET @sql = IF(@index_check = 0, 'CREATE INDEX idx_employees_department ON employees(department)', 'SELECT ''Index idx_employees_department already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 状态索引
SET @index_check = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND INDEX_NAME = 'idx_employees_status');
SET @sql = IF(@index_check = 0, 'CREATE INDEX idx_employees_status ON employees(status)', 'SELECT ''Index idx_employees_status already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 直属上级索引
SET @index_check = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND INDEX_NAME = 'idx_employees_leader');
SET @sql = IF(@index_check = 0, 'CREATE INDEX idx_employees_leader ON employees(direct_leader_id)', 'SELECT ''Index idx_employees_leader already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================
-- 3. 更新现有数据
-- ============================================

UPDATE employees 
SET 
  level = 'staff',
  status = 'active'
WHERE level IS NULL OR status IS NULL;

COMMIT;

-- ============================================
-- 4. 验证
-- ============================================
SELECT '✅ 员工表扩展完成！' AS message;
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'employees'
  AND COLUMN_NAME IN (
    'employee_number', 'department', 'position', 'level',
    'direct_leader_id', 'direct_leader_name', 'hire_date',
    'id_card_number', 'emergency_contact', 'emergency_phone',
    'status', 'resign_date', 'notes'
  )
ORDER BY ORDINAL_POSITION;

