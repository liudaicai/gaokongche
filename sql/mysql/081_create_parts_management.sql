-- ================================================================
-- 配件管理系统表
-- ================================================================

-- 1. 配件基础信息表
CREATE TABLE IF NOT EXISTS parts (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '配件ID',
    code VARCHAR(50) NOT NULL UNIQUE COMMENT '配件编号，格式：PJ+YYYYMMDD+序号',
    category ENUM('电控系统', '液压系统', '结构件', '易损件') NOT NULL COMMENT '配件类别',
    brand VARCHAR(100) COMMENT '品牌',
    model VARCHAR(100) COMMENT '规格型号',
    purchase_price DECIMAL(10, 2) COMMENT '采购价格',
    applicable_range VARCHAR(500) COMMENT '适用范围',
    remark TEXT COMMENT '备注',
    company_id INT COMMENT '公司ID',
    created_by INT COMMENT '创建人ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '软删除时间',
    INDEX idx_code (code),
    INDEX idx_category (category),
    INDEX idx_company (company_id),
    INDEX idx_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='配件基础信息表';

-- 2. 配件库存表（按门店分库存）
CREATE TABLE IF NOT EXISTS part_stocks (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '库存ID',
    part_id INT NOT NULL COMMENT '配件ID',
    store_id INT NOT NULL COMMENT '门店ID',
    quantity INT NOT NULL DEFAULT 0 COMMENT '库存数量',
    company_id INT COMMENT '公司ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    UNIQUE KEY uk_part_store (part_id, store_id),
    INDEX idx_part (part_id),
    INDEX idx_store (store_id),
    INDEX idx_company (company_id),
    FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='配件库存表';

-- 3. 配件出入库记录表
CREATE TABLE IF NOT EXISTS part_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录ID',
    transaction_no VARCHAR(50) NOT NULL UNIQUE COMMENT '单号',
    transaction_type ENUM('stock_in', 'use', 'return', 'scrap') NOT NULL COMMENT '交易类型：入库、领用、退回、报废',
    part_id INT NOT NULL COMMENT '配件ID',
    store_id INT NOT NULL COMMENT '门店ID',
    quantity INT NOT NULL COMMENT '数量（正数为入库/退回，负数为领用/报废）',
    operator_id INT COMMENT '操作人ID',
    operator_name VARCHAR(100) COMMENT '操作人姓名',
    transaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '交易时间',
    remark TEXT COMMENT '备注',
    company_id INT COMMENT '公司ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_transaction_no (transaction_no),
    INDEX idx_type (transaction_type),
    INDEX idx_part (part_id),
    INDEX idx_store (store_id),
    INDEX idx_company (company_id),
    INDEX idx_time (transaction_time),
    FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='配件出入库记录表';

-- 初始化测试数据（可选）
-- INSERT INTO parts (code, category, brand, model, purchase_price, applicable_range, company_id, created_by) VALUES
-- ('PJ2025011201', '电控系统', '施耐德', 'LC1D25M7C', 350.00, '18米以下剪叉车', 5, 1),
-- ('PJ2025011202', '液压系统', '力士乐', 'A10VSO28DR/31R', 2800.00, '全系列剪叉车', 5, 1),
-- ('PJ2025011203', '易损件', '通用', '液压油5L', 85.00, '全系列高空作业车', 5, 1);
