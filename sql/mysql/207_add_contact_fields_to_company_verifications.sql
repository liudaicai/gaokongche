-- ============================================
-- 为公司认证表添加联系人信息字段
-- ============================================
-- 用途：存储租户联系人的姓名、电话、身份证号
-- 电话将用作管理员登录账号
-- ============================================

USE gaokongche;

-- 添加联系人字段
ALTER TABLE company_verifications 
ADD COLUMN contact_name VARCHAR(100) COMMENT '联系人姓名' AFTER bank_name,
ADD COLUMN contact_phone VARCHAR(20) COMMENT '联系人电话' AFTER contact_name,
ADD COLUMN id_card_number VARCHAR(18) COMMENT '身份证号码' AFTER contact_phone;

-- 添加索引以加快查询
ALTER TABLE company_verifications 
ADD INDEX idx_contact_phone (contact_phone);

-- 验证字段是否添加成功
SELECT 
  COLUMN_NAME AS '字段名',
  DATA_TYPE AS '数据类型',
  CHARACTER_MAXIMUM_LENGTH AS '最大长度',
  COLUMN_COMMENT AS '字段说明'
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = 'gaokongche' 
  AND TABLE_NAME = 'company_verifications'
  AND COLUMN_NAME IN ('contact_name', 'contact_phone', 'id_card_number');

SELECT '✅ 联系人字段添加完成' AS '完成';
