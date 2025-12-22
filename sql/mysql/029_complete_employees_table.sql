-- ============================================
-- 完善员工表结构
-- 作者: AI 开发助手
-- 日期: 2025-11-22
-- 说明: 添加员工管理所需的所有字段
-- ============================================

START TRANSACTION;

SET @dbname = DATABASE();
SET @tablename = 'employees';

-- 添加 user_id 字段（关联 users 表）
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'user_id');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN user_id INT NULL COMMENT ''关联用户ID'' AFTER id', 'SELECT ''Column user_id already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加 username 字段
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'username');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN username VARCHAR(100) NULL COMMENT ''用户名'' AFTER user_id', 'SELECT ''Column username already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加 id_card_number 字段
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'id_card_number');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN id_card_number VARCHAR(18) NULL COMMENT ''身份证号'' AFTER phone', 'SELECT ''Column id_card_number already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加 position 字段
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'position');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN position VARCHAR(100) NULL COMMENT ''职务'' AFTER id_card_number', 'SELECT ''Column position already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加 department 字段
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'department');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN department VARCHAR(100) NULL COMMENT ''部门'' AFTER position', 'SELECT ''Column department already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加 level 字段
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'level');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN level VARCHAR(50) DEFAULT ''staff'' COMMENT ''级别'' AFTER department', 'SELECT ''Column level already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加 store_id 字段
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'store_id');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN store_id INT NULL COMMENT ''所属门店ID'' AFTER level', 'SELECT ''Column store_id already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加 direct_leader_id 字段
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'direct_leader_id');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN direct_leader_id INT NULL COMMENT ''直属领导ID'' AFTER store_id', 'SELECT ''Column direct_leader_id already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加 direct_leader_name 字段
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'direct_leader_name');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN direct_leader_name VARCHAR(255) NULL COMMENT ''直属领导姓名'' AFTER direct_leader_id', 'SELECT ''Column direct_leader_name already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加 hire_date 字段
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'hire_date');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN hire_date DATE NULL COMMENT ''入职日期'' AFTER direct_leader_name', 'SELECT ''Column hire_date already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加 emergency_contact 字段
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'emergency_contact');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN emergency_contact VARCHAR(255) NULL COMMENT ''紧急联系人'' AFTER hire_date', 'SELECT ''Column emergency_contact already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加 emergency_phone 字段
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'emergency_phone');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN emergency_phone VARCHAR(50) NULL COMMENT ''紧急联系电话'' AFTER emergency_contact', 'SELECT ''Column emergency_phone already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加 status 字段
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'status');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN status VARCHAR(50) DEFAULT ''active'' COMMENT ''状态'' AFTER emergency_phone', 'SELECT ''Column status already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加 resign_date 字段
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'resign_date');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN resign_date DATE NULL COMMENT ''离职日期'' AFTER status', 'SELECT ''Column resign_date already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加 notes 字段
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'notes');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN notes TEXT NULL COMMENT ''备注'' AFTER resign_date', 'SELECT ''Column notes already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加 company_id 字段
SET @column_check = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'company_id');
SET @sql = IF(@column_check = 0, 'ALTER TABLE employees ADD COLUMN company_id INT NULL COMMENT ''公司ID'' AFTER notes', 'SELECT ''Column company_id already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 添加索引
SET @index_check = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND INDEX_NAME = 'idx_employees_user_id');
SET @sql = IF(@index_check = 0, 'CREATE INDEX idx_employees_user_id ON employees(user_id)', 'SELECT ''Index idx_employees_user_id already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @index_check = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND INDEX_NAME = 'idx_employees_store_id');
SET @sql = IF(@index_check = 0, 'CREATE INDEX idx_employees_store_id ON employees(store_id)', 'SELECT ''Index idx_employees_store_id already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @index_check = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND INDEX_NAME = 'idx_employees_status');
SET @sql = IF(@index_check = 0, 'CREATE INDEX idx_employees_status ON employees(status)', 'SELECT ''Index idx_employees_status already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @index_check = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND INDEX_NAME = 'idx_employees_company_id');
SET @sql = IF(@index_check = 0, 'CREATE INDEX idx_employees_company_id ON employees(company_id)', 'SELECT ''Index idx_employees_company_id already exists''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

COMMIT;

-- 验证
SELECT '✅ 员工表结构完善成功！' AS message;

