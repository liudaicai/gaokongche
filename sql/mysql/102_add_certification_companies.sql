-- 添加认证公司测试数据
-- 用于操作证的认证公司选择
-- 数据存储在 company_verifications 表（门店管理-认证公司）

-- 添加认证公司数据到 company_verifications 表
INSERT INTO `company_verifications` (`company_name`, `company_address`, `credit_code`, `bank_account`, `bank_name`)
SELECT * FROM (
  SELECT 
    '北京市高空作业培训中心' as company_name, 
    '北京市朝阳区建国路88号' as company_address, 
    '91110000MA001234XY' as credit_code,
    '1100 1234 5678 9012 3456' as bank_account,
    '中国工商银行北京朝阳支行' as bank_name
  UNION ALL
  SELECT 
    '上海市特种设备培训学院', 
    '上海市浦东新区世纪大道1000号', 
    '91310000MA002345YZ',
    '6222 2345 6789 0123 4567',
    '中国建设银行上海浦东支行'
  UNION ALL
  SELECT 
    '广州市安全技术培训中心', 
    '广州市天河区天河路123号', 
    '91440000MA003456ZA',
    '5555 3456 7890 1234 5678',
    '中国农业银行广州天河支行'
  UNION ALL
  SELECT 
    '深圳市职业技能培训基地', 
    '深圳市南山区科技园南区', 
    '91440300MA004567AB',
    '6228 4567 8901 2345 6789',
    '招商银行深圳科技园支行'
  UNION ALL
  SELECT 
    '成都市高空作业认证中心', 
    '成都市武侯区天府大道南段', 
    '91510000MA005678BC',
    '6217 5678 9012 3456 7890',
    '中国银行成都武侯支行'
  UNION ALL
  SELECT 
    '武汉市特种作业培训中心', 
    '武汉市洪山区光谷大道', 
    '91420000MA006789CD',
    '6222 6789 0123 4567 8901',
    '中国工商银行武汉光谷支行'
  UNION ALL
  SELECT 
    '杭州市职业安全培训学院', 
    '杭州市西湖区文三路', 
    '91330000MA007890DE',
    '6228 7890 1234 5678 9012',
    '中国建设银行杭州西湖支行'
  UNION ALL
  SELECT 
    '南京市高空作业资格认证中心', 
    '南京市江宁区东山街道', 
    '91320000MA008901EF',
    '6217 8901 2345 6789 0123',
    '中国银行南京江宁支行'
) AS tmp
WHERE NOT EXISTS (
  SELECT 1 FROM `company_verifications` WHERE `credit_code` IN (
    '91110000MA001234XY', '91310000MA002345YZ', '91440000MA003456ZA', 
    '91440300MA004567AB', '91510000MA005678BC', '91420000MA006789CD',
    '91330000MA007890DE', '91320000MA008901EF'
  )
);

-- 添加注释说明
-- company_verifications 表用于存储认证公司（门店管理-认证公司）
-- operator_certificates.company_id 关联到 company_verifications.id
-- operator_certificates.company_name 冗余存储公司名称，提高查询性能
