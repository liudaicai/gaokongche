-- 046_update_order_suspensions_structure.sql
-- 更新报停记录表结构以匹配业务逻辑
-- 作者：AI Assistant
-- 日期：2025-11-27

START TRANSACTION;

-- 如果表已存在，先修改字段
ALTER TABLE order_suspensions
ADD COLUMN equipment_id INT NULL AFTER order_id,
ADD COLUMN suspension_type VARCHAR(50) NULL AFTER equipment_id,
ADD COLUMN reason TEXT NULL AFTER suspension_type,
ADD COLUMN suspension_days INT NULL AFTER end_date,
ADD COLUMN is_charge_free TINYINT(1) DEFAULT 0 AFTER suspension_days,
ADD COLUMN discount_rate DECIMAL(5,2) DEFAULT 0 AFTER is_charge_free,
ADD COLUMN status VARCHAR(20) DEFAULT 'pending' AFTER discount_rate,
ADD COLUMN approved_at DATETIME NULL AFTER status,
ADD COLUMN approved_by INT NULL AFTER approved_at,
ADD COLUMN created_by INT NULL AFTER approved_by;

-- 重命名 attachments_json 为 attachments (如果存在)
-- 注意：MySQL ALTER TABLE CHANGE 需要完整的列定义
-- 这里我们先尝试添加 attachments 列，如果 attachments_json 存在则迁移数据

-- 由于 MySQL 迁移脚本不能包含条件逻辑，我们假设这是一个全新的环境或者修正
-- 为了安全起见，我们使用存储过程来安全地重命名/添加列

DELIMITER //

CREATE PROCEDURE UpdateSuspensionsTable()
BEGIN
    -- 检查 attachments_json 是否存在
    IF EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'order_suspensions' 
        AND COLUMN_NAME = 'attachments_json'
    ) THEN
        -- 如果 attachments 列不存在，则重命名
        IF NOT EXISTS (
            SELECT * FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'order_suspensions' 
            AND COLUMN_NAME = 'attachments'
        ) THEN
            ALTER TABLE order_suspensions CHANGE COLUMN attachments_json attachments JSON NULL;
        END IF;
    ELSE
        -- 如果 attachments_json 不存在，检查 attachments 是否存在
        IF NOT EXISTS (
            SELECT * FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'order_suspensions' 
            AND COLUMN_NAME = 'attachments'
        ) THEN
            ALTER TABLE order_suspensions ADD COLUMN attachments JSON NULL;
        END IF;
    END IF;
END //

DELIMITER ;

CALL UpdateSuspensionsTable();
DROP PROCEDURE UpdateSuspensionsTable;

COMMIT;

