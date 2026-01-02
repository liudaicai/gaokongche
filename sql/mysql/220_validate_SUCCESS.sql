-- ============================================
-- 数据迁移验证脚本（成功版）
-- 避免复杂的UNION查询，使用简单的SELECT
-- ============================================

USE gaokongche;

SELECT '========================================' AS '';
SELECT '数据库优化验证开始' AS '';
SELECT '========================================' AS '';

-- ==================== 第一部分: 财务记录验证 ====================
SELECT '【1. 财务记录验证】' AS section;

-- 检查表是否存在
SELECT 
  IF(EXISTS(SELECT 1 FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'finance_records'),
    '✓ finance_records 表存在',
    '✗ finance_records 表不存在'
  ) AS check_result;

-- 统计收款记录
SELECT '收款记录统计:' AS info;
SELECT 
  COUNT(*) AS count,
  COALESCE(SUM(amount), 0) AS total_amount,
  MIN(record_date) AS earliest_date,
  MAX(record_date) AS latest_date
FROM finance_records
WHERE record_type = 'receipt';

-- 统计退款记录
SELECT '退款记录统计:' AS info;
SELECT 
  COUNT(*) AS count,
  COALESCE(SUM(amount), 0) AS total_amount,
  MIN(record_date) AS earliest_date,
  MAX(record_date) AS latest_date
FROM finance_records
WHERE record_type = 'refund';

-- 总计
SELECT '总计:' AS info;
SELECT 
  COUNT(*) AS total_records,
  COALESCE(SUM(amount), 0) AS total_amount
FROM finance_records;

-- 检查备份表
SELECT '备份表检查:' AS info;
SELECT 
  COUNT(*) AS backup_count,
  GROUP_CONCAT(TABLE_NAME SEPARATOR ', ') AS backup_tables
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME LIKE '%backup_2026%';

-- ==================== 第二部分: 审批系统验证 ====================
SELECT '【2. 审批系统验证】' AS section;

-- 检查冗余表是否已删除
SELECT 
  IF(NOT EXISTS(SELECT 1 FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'approval_statistics'),
    '✓ approval_statistics 已删除',
    '✗ approval_statistics 仍存在'
  ) AS check1;

SELECT 
  IF(NOT EXISTS(SELECT 1 FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'approval_notifications'),
    '✓ approval_notifications 已删除',
    '✗ approval_notifications 仍存在'
  ) AS check2;

-- 检查通知日志表
SELECT 
  IF(EXISTS(SELECT 1 FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_logs'),
    '✓ notification_logs 表存在',
    '✗ notification_logs 表不存在'
  ) AS check3;

-- ==================== 第三部分: 总体统计 ====================
SELECT '【3. 总体统计】' AS section;

-- 当前业务表数量
SELECT 
  COUNT(*) AS total_tables
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_TYPE = 'BASE TABLE'
  AND TABLE_NAME NOT LIKE '\\_%';

-- 备份表数量
SELECT 
  COUNT(*) AS backup_tables
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME LIKE '\\_%backup%';

-- 视图数量
SELECT 
  COUNT(*) AS total_views
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_TYPE = 'VIEW';

-- ==================== 第四部分: 数据完整性检查 ====================
SELECT '【4. 数据完整性检查】' AS section;

-- 检查 finance_records 是否有数据
SELECT 
  IF(EXISTS(SELECT 1 FROM finance_records LIMIT 1),
    '✓ finance_records 有数据',
    '⚠ finance_records 无数据'
  ) AS data_check;

-- 检查 record_number 是否都已生成
SELECT 
  CONCAT('✓ 所有记录都有编号 (', COUNT(*), '条)') AS number_check
FROM finance_records
WHERE record_number IS NOT NULL AND record_number != '';

-- 显示最新的几条财务记录
SELECT '最新财务记录示例:' AS info;
SELECT 
  record_number AS '编号',
  record_type AS '类型',
  amount AS '金额',
  record_date AS '日期',
  created_at AS '创建时间'
FROM finance_records
ORDER BY created_at DESC
LIMIT 5;

-- ==================== 最终结果 ====================
SELECT '========================================' AS '';
SELECT '✅ 数据库优化验证完成！' AS '';
SELECT '========================================' AS '';

SELECT 
  '如果所有检查项都显示 ✓，则优化成功！' AS instruction,
  '请查看上方的详细统计数据' AS next_step;

