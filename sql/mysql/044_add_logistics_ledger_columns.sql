-- 为 logistics_ledger 表添加缺失的列
-- 作者：系统
-- 日期：2025-11-26
-- 说明：添加台账编号、门店ID和门店名称列

START TRANSACTION;

-- 添加台账编号列（唯一）
ALTER TABLE logistics_ledger 
ADD COLUMN ledger_number VARCHAR(50) NULL COMMENT '台账编号';

-- 添加门店ID列
ALTER TABLE logistics_ledger 
ADD COLUMN store_id INT NULL COMMENT '门店ID';

-- 添加门店名称列
ALTER TABLE logistics_ledger 
ADD COLUMN store_name VARCHAR(255) NULL COMMENT '门店名称';

-- 为已有记录生成台账编号（基于ID）
UPDATE logistics_ledger 
SET ledger_number = CONCAT('LG', DATE_FORMAT(record_date, '%Y%m%d'), LPAD(id, 6, '0'))
WHERE ledger_number IS NULL AND record_date IS NOT NULL;

-- 将 ledger_number 设置为 NOT NULL（在更新之后）
ALTER TABLE logistics_ledger 
MODIFY COLUMN ledger_number VARCHAR(50) NOT NULL;

-- 添加唯一索引
ALTER TABLE logistics_ledger 
ADD UNIQUE INDEX uniq_ledger_number (ledger_number);

-- 添加门店ID索引
ALTER TABLE logistics_ledger 
ADD INDEX idx_store_id (store_id);

COMMIT;

