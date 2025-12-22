-- 修复字符集整理规则不一致的问题
-- 某些表在创建时使用了 utf8mb4_0900_ai_ci，导致与数据库默认的 utf8mb4_unicode_ci 不兼容
-- 这会导致 JOIN 操作时出现 "Illegal mix of collations" 错误

-- 修复 equipment_repairs 表
ALTER TABLE equipment_repairs CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 验证修复
SELECT TABLE_NAME, TABLE_COLLATION 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_COLLATION LIKE '%0900%';
