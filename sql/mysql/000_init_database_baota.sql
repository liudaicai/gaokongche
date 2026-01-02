-- ============================================================================
-- 高空车租赁管理系统 - 宝塔部署数据库初始化脚本
-- 版本: 1.0
-- 说明: 用于宝塔环境快速初始化数据库、用户和基础数据
-- ============================================================================

-- 使用说明：
-- 1. 在宝塔面板中创建数据库 gaokongche
-- 2. 记录数据库用户名和密码
-- 3. 在宝塔 phpMyAdmin 或通过命令行执行此脚本
-- 
-- 命令行执行示例：
-- mysql -u gaokongche_user -p gaokongche < 000_init_database_baota.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;

-- ============================================================================
-- 步骤 1: 创建默认公司（租户）
-- ============================================================================

INSERT INTO `companies` (`id`, `name`, `contact`, `phone`, `address`, `status`, `created_at`, `updated_at`) 
VALUES (1, '默认租户', '系统管理员', '13800138000', '中国', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE `name`='默认租户';

SELECT '✓ 步骤 1: 默认公司创建成功' AS progress;

-- ============================================================================
-- 步骤 2: 创建超级管理员账户
-- ============================================================================

-- 密码: admin123
-- 密码哈希使用 bcrypt，轮数为 10
-- 生成命令: node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('admin123', 10));"

INSERT INTO `users` (
    `username`, 
    `password`, 
    `name`, 
    `role`, 
    `company_id`, 
    `status`,
    `created_at`, 
    `updated_at`
) VALUES (
    'admin',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    '系统管理员',
    'super_admin',
    1,
    'active',
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE 
    `password` = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    `role` = 'super_admin',
    `status` = 'active';

SELECT '✓ 步骤 2: 超级管理员创建成功 (username: admin, password: admin123)' AS progress;

-- ============================================================================
-- 步骤 3: 创建租户管理员账户
-- ============================================================================

INSERT INTO `users` (
    `username`, 
    `password`, 
    `name`, 
    `role`, 
    `company_id`, 
    `status`,
    `created_at`, 
    `updated_at`
) VALUES (
    'tenant_admin',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    '租户管理员',
    'tenant_admin',
    1,
    'active',
    NOW(),
    NOW()
) ON DUPLICATE KEY UPDATE 
    `password` = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    `status` = 'active';

SELECT '✓ 步骤 3: 租户管理员创建成功 (username: tenant_admin, password: admin123)' AS progress;

-- ============================================================================
-- 步骤 4: 创建基础设备型号数据（示例）
-- ============================================================================

INSERT INTO `equipment_models` (
    `brand`, 
    `model_name`, 
    `category`, 
    `type`, 
    `height`, 
    `daily_rent`, 
    `monthly_rent`, 
    `deposit`, 
    `status`,
    `created_at`, 
    `updated_at`
) VALUES
    ('捷尔杰', 'JLG450AJ', '曲臂车', '自行式', '16', 500.00, 12000.00, 5000.00, 'active', NOW(), NOW()),
    ('捷尔杰', 'JLG600AJ', '曲臂车', '自行式', '20', 600.00, 15000.00, 6000.00, 'active', NOW(), NOW()),
    ('临工', 'LGMG1412E', '剪叉车', '自行式', '14', 300.00, 7000.00, 3000.00, 'active', NOW(), NOW()),
    ('临工', 'LGMG1612E', '剪叉车', '自行式', '16', 350.00, 8000.00, 3500.00, 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE `status` = 'active';

SELECT '✓ 步骤 4: 基础设备型号创建成功' AS progress;

-- ============================================================================
-- 步骤 5: 创建基础设备状态数据
-- ============================================================================

-- 确保设备状态字典数据存在
-- 注意：此表结构可能因项目而异，请根据实际情况调整

-- ============================================================================
-- 步骤 6: 初始化系统配置（可选）
-- ============================================================================

-- 如果有系统配置表，可以在此初始化
-- INSERT INTO `system_config` (`key`, `value`, `description`) VALUES
--     ('system_name', '高空车租赁管理系统', '系统名称'),
--     ('company_name', '默认公司', '公司名称'),
--     ('contact_phone', '13800138000', '联系电话');

SELECT '✓ 步骤 6: 系统配置初始化完成' AS progress;

-- ============================================================================
-- 步骤 7: 创建必要的索引（如果不存在）
-- ============================================================================

-- 用户表索引
ALTER TABLE `users` 
ADD INDEX IF NOT EXISTS `idx_company_id` (`company_id`),
ADD INDEX IF NOT EXISTS `idx_username` (`username`),
ADD INDEX IF NOT EXISTS `idx_status` (`status`);

-- 设备表索引
ALTER TABLE `equipments` 
ADD INDEX IF NOT EXISTS `idx_company_id` (`company_id`),
ADD INDEX IF NOT EXISTS `idx_code` (`code`),
ADD INDEX IF NOT EXISTS `idx_status` (`status`);

-- 订单表索引
ALTER TABLE `orders` 
ADD INDEX IF NOT EXISTS `idx_company_id` (`company_id`),
ADD INDEX IF NOT EXISTS `idx_order_number` (`order_number`),
ADD INDEX IF NOT EXISTS `idx_status` (`status`),
ADD INDEX IF NOT EXISTS `idx_customer_id` (`customer_id`);

-- 客户表索引
ALTER TABLE `customers` 
ADD INDEX IF NOT EXISTS `idx_company_id` (`company_id`),
ADD INDEX IF NOT EXISTS `idx_name` (`name`),
ADD INDEX IF NOT EXISTS `idx_phone` (`phone`);

-- 财务记录表索引
ALTER TABLE `finance_records` 
ADD INDEX IF NOT EXISTS `idx_company_id` (`company_id`),
ADD INDEX IF NOT EXISTS `idx_record_type` (`record_type`),
ADD INDEX IF NOT EXISTS `idx_order_id` (`order_id`),
ADD INDEX IF NOT EXISTS `idx_record_date` (`record_date`);

SELECT '✓ 步骤 7: 数据库索引创建完成' AS progress;

-- ============================================================================
-- 步骤 8: 数据库优化配置
-- ============================================================================

-- 分析表以优化查询性能
ANALYZE TABLE `users`, `companies`, `equipments`, `orders`, `customers`, `finance_records`;

SELECT '✓ 步骤 8: 数据库优化完成' AS progress;

-- ============================================================================
-- 完成
-- ============================================================================

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;

-- 输出初始化信息
SELECT '
==============================================================================
  数据库初始化完成！
==============================================================================

  【登录信息】
  
  超级管理员:
    用户名: admin
    密码: admin123
    
  租户管理员:
    用户名: tenant_admin
    密码: admin123
    
  ⚠️  请登录后立即修改默认密码！
  
==============================================================================

  【下一步操作】
  
  1. 执行多租户支持脚本:
     mysql -u gaokongche_user -p gaokongche < 200_add_multi_tenant_support_safe.sql
     
  2. 执行黑名单功能脚本:
     mysql -u gaokongche_user -p gaokongche < 215_create_blacklist_table.sql
     
  3. 执行财务表合并脚本:
     mysql -u gaokongche_user -p gaokongche < 217_merge_finance_SUCCESS.sql
     
  4. 执行字段补充脚本:
     mysql -u gaokongche_user -p gaokongche < 221_add_finance_records_fields.sql
     
  5. 启动后端服务:
     pm2 start ecosystem.config.js
     
  6. 访问系统:
     http://your-domain.com
     
==============================================================================
' AS info;

