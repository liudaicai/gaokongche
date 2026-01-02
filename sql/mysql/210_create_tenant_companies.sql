-- =============================================
-- 租户公司主体表（每个租户可以有多个公司）
-- 用于：合同出租方主体、发票开具主体等业务场景
-- =============================================

CREATE TABLE IF NOT EXISTS `tenant_companies` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `company_id` INT NOT NULL COMMENT '所属租户ID（多租户隔离）',
  `company_name` VARCHAR(255) NOT NULL COMMENT '公司名称',
  `company_address` VARCHAR(255) DEFAULT NULL COMMENT '公司地址',
  `credit_code` VARCHAR(18) NOT NULL COMMENT '统一社会信用代码',
  `bank_account` VARCHAR(64) DEFAULT NULL COMMENT '银行账号',
  `bank_name` VARCHAR(255) DEFAULT NULL COMMENT '开户行',
  `legal_person` VARCHAR(100) DEFAULT NULL COMMENT '法人代表',
  `contact_name` VARCHAR(100) DEFAULT NULL COMMENT '联系人姓名',
  `contact_phone` VARCHAR(20) DEFAULT NULL COMMENT '联系人电话',
  `is_default` TINYINT(1) DEFAULT 0 COMMENT '是否默认公司主体',
  `status` ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
  `remark` TEXT DEFAULT NULL COMMENT '备注',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `idx_company_id` (`company_id`),
  INDEX `idx_company_name` (`company_name`),
  UNIQUE KEY `uniq_credit_code_per_company` (`company_id`, `credit_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户公司主体表';

-- 说明：
-- 1. company_id: 关联到 company_verifications.id（租户ID）
-- 2. 每个租户可以有多个公司主体
-- 3. 同一租户内信用代码唯一
-- 4. is_default: 标记默认公司，用于快速选择
-- 5. status: 支持启用/停用状态管理

SELECT '✅ 租户公司主体表创建成功！' AS '状态';
SELECT '📝 说明：每个租户现在可以管理多个公司主体' AS '功能';
SELECT '🔒 数据隔离：已通过 company_id 实现租户隔离' AS '安全';
