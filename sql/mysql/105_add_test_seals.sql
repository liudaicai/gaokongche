-- 添加印章测试数据
-- 用于测试印章管理功能

-- 获取第一个门店的ID作为测试公司ID
SET @company_id = (SELECT id FROM stores ORDER BY id LIMIT 1);

INSERT INTO `seals` (`company_id`, `name`, `type`, `description`, `image_url`, `image_width`, `image_height`, `file_size`, `format`, `is_active`, `usage_count`)
VALUES
-- 公章
(@company_id, '深圳中达机械设备有限公司公章', 'official', '公司正式公章，用于各类正式文件和合同', '/uploads/seals/company-seal-1.png', 200, 200, 50000, 'PNG', 1, 0),
(@company_id, '深圳中达机械设备有限公司合同专用章', 'official', '合同专用章，仅用于签订各类合同', '/uploads/seals/contract-seal-1.png', 200, 200, 48000, 'PNG', 1, 0),

-- 财务章
(@company_id, '深圳中达机械财务专用章', 'finance', '财务部门专用章，用于财务相关文件', '/uploads/seals/finance-seal.png', 180, 180, 45000, 'PNG', 1, 0),
(@company_id, '深圳中达机械发票专用章', 'finance', '发票专用章，用于开具发票', '/uploads/seals/invoice-seal.png', 180, 180, 44000, 'PNG', 1, 0),

-- 人事章
(@company_id, '深圳中达机械人事专用章', 'hr', '人事部门专用章，用于人事相关文件', '/uploads/seals/hr-seal.png', 180, 180, 46000, 'PNG', 1, 0),

-- 培训章
(@company_id, '培训专用章', 'training', '培训部门专用章，用于操作证和培训证明', '/uploads/seals/training-seal.png', 200, 200, 52000, 'PNG', 1, 0),
(@company_id, '操作证专用章', 'training', '操作证专用章，仅用于高空作业操作证', '/uploads/seals/certificate-seal.png', 200, 200, 50000, 'PNG', 1, 0)

ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`);

-- 提示
SELECT 
  '已添加印章测试数据' as message,
  COUNT(*) as total_seals
FROM seals
WHERE deleted_at IS NULL;

-- 查看添加的印章
SELECT 
  id,
  name,
  type,
  CASE type
    WHEN 'official' THEN '公章'
    WHEN 'finance' THEN '财务章'
    WHEN 'hr' THEN '人事章'
    WHEN 'training' THEN '培训章'
    ELSE type
  END as type_name,
  is_active as '是否启用',
  usage_count as '使用次数'
FROM seals
WHERE deleted_at IS NULL
ORDER BY type, id;
