-- ============================================
-- 检查表结构脚本
-- 用于确定 order_receipts 和 order_refunds 的实际字段
-- ============================================

USE gaokongche;

SELECT '========== order_receipts 表结构 ==========' AS info;

SELECT 
  COLUMN_NAME AS 字段名,
  COLUMN_TYPE AS 类型,
  IS_NULLABLE AS 可空,
  COLUMN_DEFAULT AS 默认值,
  COLUMN_COMMENT AS 注释
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'order_receipts'
ORDER BY ORDINAL_POSITION;

SELECT '========== order_refunds 表结构 ==========' AS info;

SELECT 
  COLUMN_NAME AS 字段名,
  COLUMN_TYPE AS 类型,
  IS_NULLABLE AS 可空,
  COLUMN_DEFAULT AS 默认值,
  COLUMN_COMMENT AS 注释
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'order_refunds'
ORDER BY ORDINAL_POSITION;

SELECT '========== 数据示例 ==========' AS info;

SELECT '收款表前3条数据:' AS sample;
SELECT * FROM order_receipts LIMIT 3;

SELECT '退款表前3条数据:' AS sample;
SELECT * FROM order_refunds LIMIT 3;

