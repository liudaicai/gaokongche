-- 更新 order_suspensions 表结构，添加缺失的字段
-- 作者：系统
-- 日期：2025-01-23

START TRANSACTION;

-- 添加 suspension_type 字段（如果不存在）
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'order_suspensions' 
    AND COLUMN_NAME = 'suspension_type'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_suspensions ADD COLUMN suspension_type VARCHAR(50) NULL COMMENT ''报停类型：weather, site_stop, maintenance, customer_request'' AFTER equipment_id',
  'SELECT ''suspension_type column already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 start_date 字段（如果不存在，重命名 suspension_date）
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'order_suspensions' 
    AND COLUMN_NAME = 'start_date'
);

SET @sql = IF(@col_exists = 0,
  IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_suspensions' AND COLUMN_NAME = 'suspension_date') > 0,
    'ALTER TABLE order_suspensions CHANGE COLUMN suspension_date start_date DATE NOT NULL COMMENT ''报停开始日期''',
    'ALTER TABLE order_suspensions ADD COLUMN start_date DATE NOT NULL COMMENT ''报停开始日期'' AFTER suspension_type'
  ),
  'SELECT ''start_date column already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 end_date 字段（如果不存在，重命名 resume_date）
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'order_suspensions' 
    AND COLUMN_NAME = 'end_date'
);

SET @sql = IF(@col_exists = 0,
  IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_suspensions' AND COLUMN_NAME = 'resume_date') > 0,
    'ALTER TABLE order_suspensions CHANGE COLUMN resume_date end_date DATE NULL COMMENT ''报停结束日期（NULL表示未恢复）''',
    'ALTER TABLE order_suspensions ADD COLUMN end_date DATE NULL COMMENT ''报停结束日期（NULL表示未恢复）'' AFTER start_date'
  ),
  'SELECT ''end_date column already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 suspension_days 字段
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'order_suspensions' 
    AND COLUMN_NAME = 'suspension_days'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_suspensions ADD COLUMN suspension_days INT NULL COMMENT ''报停天数'' AFTER end_date',
  'SELECT ''suspension_days column already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 is_charge_free 字段
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'order_suspensions' 
    AND COLUMN_NAME = 'is_charge_free'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_suspensions ADD COLUMN is_charge_free TINYINT(1) DEFAULT 1 COMMENT ''是否免费（1=免费，0=照常计费）'' AFTER suspension_days',
  'SELECT ''is_charge_free column already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 discount_rate 字段
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'order_suspensions' 
    AND COLUMN_NAME = 'discount_rate'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_suspensions ADD COLUMN discount_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT ''折扣率（0-100，100表示免费）'' AFTER is_charge_free',
  'SELECT ''discount_rate column already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 status 字段
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'order_suspensions' 
    AND COLUMN_NAME = 'status'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_suspensions ADD COLUMN status VARCHAR(20) DEFAULT ''pending'' COMMENT ''状态：pending, approved, rejected, ended'' AFTER discount_rate',
  'SELECT ''status column already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 attachments 字段（如果不存在，重命名 attachments_json）
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'order_suspensions' 
    AND COLUMN_NAME = 'attachments'
);

SET @sql = IF(@col_exists = 0,
  IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_suspensions' AND COLUMN_NAME = 'attachments_json') > 0,
    'ALTER TABLE order_suspensions CHANGE COLUMN attachments_json attachments JSON NULL COMMENT ''附件（证明文件）''',
    'ALTER TABLE order_suspensions ADD COLUMN attachments JSON NULL COMMENT ''附件（证明文件）'' AFTER status'
  ),
  'SELECT ''attachments column already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 notes 字段
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'order_suspensions' 
    AND COLUMN_NAME = 'notes'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_suspensions ADD COLUMN notes TEXT NULL COMMENT ''备注'' AFTER attachments',
  'SELECT ''notes column already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 approved_by 字段
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'order_suspensions' 
    AND COLUMN_NAME = 'approved_by'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_suspensions ADD COLUMN approved_by INT NULL COMMENT ''审批人ID'' AFTER notes',
  'SELECT ''approved_by column already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 approved_at 字段
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'order_suspensions' 
    AND COLUMN_NAME = 'approved_at'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_suspensions ADD COLUMN approved_at DATETIME NULL COMMENT ''审批时间'' AFTER approved_by',
  'SELECT ''approved_at column already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加 created_by 字段
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'order_suspensions' 
    AND COLUMN_NAME = 'created_by'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE order_suspensions ADD COLUMN created_by INT NULL COMMENT ''创建人ID'' AFTER approved_at',
  'SELECT ''created_by column already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_order_suspensions_status ON order_suspensions(status);
CREATE INDEX IF NOT EXISTS idx_order_suspensions_dates ON order_suspensions(start_date, end_date);

COMMIT;

