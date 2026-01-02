-- ============================================
-- 检查company_verifications表的字段结构
-- ============================================

USE gaokongche;

-- 查看所有字段
SELECT 
  COLUMN_NAME AS '字段名',
  DATA_TYPE AS '数据类型',
  CHARACTER_MAXIMUM_LENGTH AS '最大长度',
  IS_NULLABLE AS '可为空',
  COLUMN_DEFAULT AS '默认值',
  COLUMN_COMMENT AS '字段说明'
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'gaokongche' 
  AND TABLE_NAME = 'company_verifications'
ORDER BY ORDINAL_POSITION;

-- 检查是否有联系人字段
SELECT 
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ 联系人字段已存在，无需迁移'
    ELSE '❌ 联系人字段不完整'
  END AS '状态',
  COUNT(*) AS '已有字段数'
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'gaokongche' 
  AND TABLE_NAME = 'company_verifications'
  AND COLUMN_NAME IN ('contact_name', 'contact_phone', 'id_card_number');
