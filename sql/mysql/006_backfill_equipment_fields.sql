-- 从 equipment_models 表回填设备字段
-- 将已有设备的 brand, type, category, height, model 字段从关联的型号表填充

UPDATE equipments e
INNER JOIN equipment_models m ON e.model_id = m.id
SET 
  e.brand = m.brand,
  e.type = m.type,
  e.category = m.category,
  e.height = m.height,
  e.model = m.model
WHERE e.model_id IS NOT NULL
  AND (e.brand IS NULL OR e.brand = '' 
       OR e.type IS NULL OR e.type = ''
       OR e.model IS NULL OR e.model = '');
