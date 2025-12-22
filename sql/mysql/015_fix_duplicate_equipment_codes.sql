-- 015_fix_duplicate_equipment_codes.sql
-- 清理 equipments 表中因软删除导致的编码重复，避免唯一索引失败

-- 对 custom_code：仅调整软删除记录的重复值，追加 _<id> 后缀
UPDATE equipments e
JOIN (
  SELECT custom_code
  FROM equipments
  WHERE custom_code IS NOT NULL AND custom_code <> ''
  GROUP BY custom_code
  HAVING COUNT(*) > 1
) d ON d.custom_code = e.custom_code
SET e.custom_code = CONCAT(e.custom_code, '_', e.id)
WHERE e.deleted_at IS NOT NULL;

-- 对 code：仅调整软删除记录的重复值，追加 _<id> 后缀
UPDATE equipments e
JOIN (
  SELECT code
  FROM equipments
  WHERE code IS NOT NULL AND code <> ''
  GROUP BY code
  HAVING COUNT(*) > 1
) d2 ON d2.code = e.code
SET e.code = CONCAT(e.code, '_', e.id)
WHERE e.deleted_at IS NOT NULL;