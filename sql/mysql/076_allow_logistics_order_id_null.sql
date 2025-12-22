-- 允许 logistics_ledger 表的 order_id 字段为 NULL
-- 用于支持转租设备等非订单关联的物流记录

ALTER TABLE logistics_ledger 
MODIFY COLUMN order_id INT NULL COMMENT '关联订单ID（可为空，转租等场景）';
























