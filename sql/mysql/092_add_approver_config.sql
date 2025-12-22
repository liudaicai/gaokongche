-- ============================================
-- 为审批规则添加审批人配置
-- 创建时间: 2025-12-19
-- ============================================

-- 1. 为 approval_business_rules 表添加审批人配置字段（如果不存在）
-- 检查并添加字段
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'gaokongche' 
    AND TABLE_NAME = 'approval_business_rules' 
    AND COLUMN_NAME = 'approver_config'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE approval_business_rules ADD COLUMN approver_config JSON COMMENT ''审批人配置'' AFTER template_code',
  'SELECT ''Column approver_config already exists'' as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 更新现有规则的审批人配置（示例）
UPDATE approval_business_rules 
SET approver_config = JSON_OBJECT(
  'type', 'role',
  'approvers', JSON_ARRAY(
    JSON_OBJECT('type', 'role', 'value', 'manager', 'name', '经理')
  ),
  'approval_mode', 'single',
  'description', '默认由经理审批'
)
WHERE approver_config IS NULL;

-- 3. 创建用户查询视图（用于审批人选择）
CREATE OR REPLACE VIEW v_approval_users AS
SELECT 
  id,
  username,
  name,
  role
FROM users;

-- 4. 创建部门/门店视图（用于审批人选择）
CREATE OR REPLACE VIEW v_approval_stores AS
SELECT 
  id,
  name as store_name,
  address
FROM stores;

-- ============================================
-- 审批人配置JSON结构说明
-- ============================================
/*
approver_config 字段结构：
{
  "type": "user|role|department|dynamic",
  "approvers": [
    {
      "type": "user",           // 用户
      "value": 15,              // 用户ID
      "name": "刘代才"
    },
    {
      "type": "role",           // 角色
      "value": "manager",       // 角色代码
      "name": "经理"
    },
    {
      "type": "department",     // 部门
      "value": 8,               // 门店ID
      "name": "惠州镇隆店"
    }
  ],
  "approval_mode": "single|and|or|sequential",
  "description": "审批人说明"
}

审批模式说明：
- single: 任意一人审批即可（默认）
- and: 所有人都需要审批（会签）
- or: 任意一人审批即可（或签）
- sequential: 按顺序审批（串行）
*/

-- ============================================
-- 完成
-- ============================================
