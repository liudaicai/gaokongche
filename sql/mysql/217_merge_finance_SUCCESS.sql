-- ============================================
-- 财务记录表合并 - 成功版
-- 禁用安全更新模式，确保执行成功
-- ============================================

USE gaokongche;

-- 临时禁用安全更新模式
SET SQL_SAFE_UPDATES = 0;

START TRANSACTION;

-- 第1步：创建表
DROP TABLE IF EXISTS finance_records;

CREATE TABLE finance_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  record_number VARCHAR(50),
  record_type VARCHAR(20) NOT NULL,
  company_id INT,
  order_id INT,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  record_date DATE NOT NULL,
  payment_method VARCHAR(50),
  remark TEXT,
  attachments_json JSON,
  created_by INT,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX(record_type),
  INDEX(company_id),
  INDEX(order_id)
) ENGINE=InnoDB CHARSET=utf8mb4;

SELECT '✓ Step 1: 表已创建' AS progress;

-- 第2步：迁移退款记录
INSERT INTO finance_records 
  (record_number, record_type, company_id, order_id, amount, record_date, 
   payment_method, remark, attachments_json, created_by, created_at, updated_at)
SELECT 
  refund_number,
  'refund',
  company_id,
  order_id,
  amount,
  refund_date,
  refund_method,
  refund_reason,
  attachments_json,
  created_by,
  created_at,
  updated_at
FROM order_refunds;

SELECT CONCAT('✓ Step 2: 退款迁移完成 - ', ROW_COUNT(), ' 条') AS progress;

-- 第3步：迁移收款记录
INSERT INTO finance_records 
  (record_type, order_id, amount, record_date, attachments_json, created_at, updated_at)
SELECT 
  'receipt',
  order_id,
  amount,
  receipt_date,
  COALESCE(attachments_json, JSON_ARRAY()),
  created_at,
  updated_at
FROM order_receipts;

SELECT CONCAT('✓ Step 3: 收款迁移完成 - ', ROW_COUNT(), ' 条') AS progress;

-- 第4步：生成record_number（这里需要禁用安全模式）
UPDATE finance_records 
SET record_number = CONCAT(
  IF(record_type = 'receipt', 'REC-', 'REF-'),
  LPAD(id, 8, '0')
)
WHERE record_number IS NULL OR record_number = '';

SELECT CONCAT('✓ Step 4: 记录编号已生成 - ', ROW_COUNT(), ' 条') AS progress;

-- 第5步：添加唯一索引
ALTER TABLE finance_records ADD UNIQUE KEY uniq_record_number (record_number);

SELECT '✓ Step 5: 唯一索引已添加' AS progress;

-- 第6步：统计数据
SELECT '✓ Step 6: 数据统计' AS progress;

SELECT 
  COALESCE(record_type, 'TOTAL') AS '类型',
  COUNT(*) AS '数量',
  COALESCE(SUM(amount), 0) AS '总金额'
FROM finance_records
GROUP BY record_type WITH ROLLUP;

-- 第7步：备份原表
RENAME TABLE order_receipts TO _order_receipts_backup_20260102;
RENAME TABLE order_refunds TO _order_refunds_backup_20260102;

SELECT '✓ Step 7: 原表已备份' AS progress;

COMMIT;

-- 恢复安全更新模式
SET SQL_SAFE_UPDATES = 1;

-- 最终结果
SELECT '========================================' AS '';
SELECT '✅ 财务记录合并成功完成！' AS '结果';
SELECT '========================================' AS '';

-- 显示前10条数据
SELECT '最新数据预览:' AS '';
SELECT * FROM finance_records ORDER BY id DESC LIMIT 10;

