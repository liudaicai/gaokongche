-- ============================================
-- 为组织管理表添加 company_id 字段
-- 实现多租户数据隔离
-- ============================================

-- 1. 为 departments 表添加 company_id
ALTER TABLE departments 
ADD COLUMN company_id INT NOT NULL DEFAULT 1 COMMENT '所属公司ID（多租户隔离）' AFTER id;

-- 添加索引
ALTER TABLE departments 
ADD INDEX idx_company_id (company_id);

-- 添加外键约束（如果 company_verifications 表存在）
-- ALTER TABLE departments 
-- ADD CONSTRAINT fk_departments_company 
-- FOREIGN KEY (company_id) REFERENCES company_verifications(id) ON DELETE CASCADE;

-- 2. 为 positions 表添加 company_id
ALTER TABLE positions 
ADD COLUMN company_id INT NOT NULL DEFAULT 1 COMMENT '所属公司ID（多租户隔离）' AFTER id;

-- 添加索引
ALTER TABLE positions 
ADD INDEX idx_company_id (company_id);

-- 添加外键约束（如果 company_verifications 表存在）
-- ALTER TABLE positions 
-- ADD CONSTRAINT fk_positions_company 
-- FOREIGN KEY (company_id) REFERENCES company_verifications(id) ON DELETE CASCADE;

-- ============================================
-- 说明
-- ============================================
-- 1. 默认 company_id = 1 是为了兼容现有数据
-- 2. 新创建的部门和职位必须指定 company_id
-- 3. 查询时必须使用 company_id 过滤，确保租户隔离
-- 4. 如果需要，可以手动启用外键约束
