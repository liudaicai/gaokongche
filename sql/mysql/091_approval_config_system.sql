-- ============================================
-- 审批配置系统 - 支持开关和条件触发
-- 创建时间: 2025-12-19
-- ============================================

-- ============================================
-- 1. 审批配置表（全局配置）
-- ============================================
CREATE TABLE IF NOT EXISTS approval_config (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
  config_value TEXT COMMENT '配置值',
  config_type VARCHAR(50) DEFAULT 'string' COMMENT '配置类型: string/boolean/number/json',
  description VARCHAR(200) COMMENT '配置描述',
  updated_by INT COMMENT '更新人ID',
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  
  INDEX idx_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批配置表';

-- ============================================
-- 2. 业务审批规则表
-- ============================================
CREATE TABLE IF NOT EXISTS approval_business_rules (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  business_type VARCHAR(50) NOT NULL COMMENT '业务类型: order/repair/refund/etc',
  rule_name VARCHAR(100) NOT NULL COMMENT '规则名称',
  rule_code VARCHAR(50) NOT NULL COMMENT '规则编码',
  
  -- 规则配置
  is_enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
  trigger_condition JSON NOT NULL COMMENT '触发条件配置',
  template_code VARCHAR(50) COMMENT '关联的审批模板编码',
  
  -- 规则描述
  description TEXT COMMENT '规则描述',
  example JSON COMMENT '示例说明',
  
  -- 优先级（数字越大越优先）
  priority INT DEFAULT 0 COMMENT '优先级',
  
  created_by INT COMMENT '创建人ID',
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  is_deleted BOOLEAN DEFAULT FALSE,
  
  INDEX idx_business_type (business_type),
  INDEX idx_enabled (is_enabled),
  INDEX idx_priority (priority),
  UNIQUE INDEX idx_business_rule (business_type, rule_code, is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='业务审批规则表';

-- ============================================
-- 插入默认配置
-- ============================================

-- 全局审批开关（默认开启）
INSERT INTO approval_config (config_key, config_value, config_type, description)
VALUES 
  ('approval_system_enabled', 'true', 'boolean', '审批系统总开关'),
  ('approval_auto_approve_enabled', 'false', 'boolean', '是否启用自动审批（符合条件自动通过）'),
  ('approval_notification_enabled', 'true', 'boolean', '是否启用审批通知'),
  ('approval_timeout_hours_default', '48', 'number', '默认审批超时时间（小时）')
ON DUPLICATE KEY UPDATE 
  config_value = VALUES(config_value),
  description = VALUES(description);

-- ============================================
-- 插入默认业务审批规则
-- ============================================

-- 1. 订单创建审批规则（价格红线）
INSERT INTO approval_business_rules (
  business_type, rule_name, rule_code, is_enabled, 
  trigger_condition, template_code, description, example, priority
) VALUES (
  'order_create',
  '订单价格低于红线审批',
  'ORDER_PRICE_THRESHOLD',
  TRUE,
  JSON_OBJECT(
    'type', 'threshold',
    'field', 'estimatedAmount',
    'operator', '<',
    'value', 10000,
    'description', '订单金额低于1万元需要审批'
  ),
  'ORDER_APPROVAL',
  '当订单预估金额低于设定的价格红线时，需要审批。防止低价订单导致亏损。',
  JSON_OBJECT(
    'scenario', '订单金额8000元',
    'result', '触发审批',
    'reason', '低于10000元红线'
  ),
  100
) ON DUPLICATE KEY UPDATE
  trigger_condition = VALUES(trigger_condition),
  description = VALUES(description);

-- 2. 订单退款审批规则（退款必须审批）
INSERT INTO approval_business_rules (
  business_type, rule_name, rule_code, is_enabled,
  trigger_condition, template_code, description, example, priority
) VALUES (
  'order_refund',
  '退款必须审批',
  'REFUND_REQUIRED',
  TRUE,
  JSON_OBJECT(
    'type', 'always',
    'description', '所有退款操作都需要审批'
  ),
  'ORDER_APPROVAL',
  '退款涉及资金流出，必须经过审批。无论金额大小。',
  JSON_OBJECT(
    'scenario', '任何退款申请',
    'result', '触发审批',
    'reason', '退款必须审批'
  ),
  200
) ON DUPLICATE KEY UPDATE
  trigger_condition = VALUES(trigger_condition),
  description = VALUES(description);

-- 3. 设备维修审批规则（更换配件）
INSERT INTO approval_business_rules (
  business_type, rule_name, rule_code, is_enabled,
  trigger_condition, template_code, description, example, priority
) VALUES (
  'equipment_repair',
  '更换配件需要审批',
  'REPAIR_WITH_PARTS',
  TRUE,
  JSON_OBJECT(
    'type', 'condition',
    'field', 'hasPartReplacement',
    'operator', '==',
    'value', true,
    'description', '维修包含配件更换时需要审批'
  ),
  'EQUIPMENT_REPLACEMENT',
  '维修更换配件涉及额外成本，需要审批。普通维修（不换配件）无需审批。',
  JSON_OBJECT(
    'scenario', '维修更换电池',
    'result', '触发审批',
    'reason', '包含配件更换'
  ),
  150
) ON DUPLICATE KEY UPDATE
  trigger_condition = VALUES(trigger_condition),
  description = VALUES(description);

-- 4. 设备维修成本审批规则（高成本维修）
INSERT INTO approval_business_rules (
  business_type, rule_name, rule_code, is_enabled,
  trigger_condition, template_code, description, example, priority
) VALUES (
  'equipment_repair',
  '高成本维修审批',
  'REPAIR_HIGH_COST',
  TRUE,
  JSON_OBJECT(
    'type', 'threshold',
    'field', 'repairCost',
    'operator', '>',
    'value', 5000,
    'description', '维修成本超过5000元需要审批'
  ),
  'EQUIPMENT_REPLACEMENT',
  '维修成本过高时需要审批，评估是否值得维修。',
  JSON_OBJECT(
    'scenario', '维修费用8000元',
    'result', '触发审批',
    'reason', '超过5000元成本红线'
  ),
  140
) ON DUPLICATE KEY UPDATE
  trigger_condition = VALUES(trigger_condition),
  description = VALUES(description);

-- 5. 设备换机审批规则（任何换机都需要审批）
INSERT INTO approval_business_rules (
  business_type, rule_name, rule_code, is_enabled,
  trigger_condition, template_code, description, example, priority
) VALUES (
  'equipment_replacement',
  '设备换机必须审批',
  'REPLACEMENT_REQUIRED',
  TRUE,
  JSON_OBJECT(
    'type', 'always',
    'description', '所有设备换机操作都需要审批'
  ),
  'EQUIPMENT_REPLACEMENT',
  '设备换机影响客户体验和设备调度，必须经过审批。',
  JSON_OBJECT(
    'scenario', '任何换机申请',
    'result', '触发审批',
    'reason', '换机必须审批'
  ),
  200
) ON DUPLICATE KEY UPDATE
  trigger_condition = VALUES(trigger_condition),
  description = VALUES(description);

-- 6. 收款操作（无需审批）
INSERT INTO approval_business_rules (
  business_type, rule_name, rule_code, is_enabled,
  trigger_condition, template_code, description, example, priority
) VALUES (
  'order_receipt',
  '收款无需审批',
  'RECEIPT_NO_APPROVAL',
  TRUE,
  JSON_OBJECT(
    'type', 'never',
    'description', '收款操作无需审批，直接记录'
  ),
  NULL,
  '收款是资金流入，风险较低，无需审批。但需要完整记录。',
  JSON_OBJECT(
    'scenario', '客户付款10000元',
    'result', '无需审批',
    'reason', '收款直接记录'
  ),
  0
) ON DUPLICATE KEY UPDATE
  trigger_condition = VALUES(trigger_condition),
  description = VALUES(description);

-- ============================================
-- 创建辅助函数和视图
-- ============================================

-- 查询启用的审批规则
CREATE OR REPLACE VIEW v_active_approval_rules AS
SELECT 
  id,
  business_type,
  rule_name,
  rule_code,
  trigger_condition,
  template_code,
  description,
  priority
FROM approval_business_rules
WHERE is_enabled = TRUE 
  AND is_deleted = FALSE
ORDER BY business_type, priority DESC;

-- 查询审批配置
CREATE OR REPLACE VIEW v_approval_config AS
SELECT 
  config_key,
  CASE 
    WHEN config_type = 'boolean' THEN config_value = 'true'
    WHEN config_type = 'number' THEN CAST(config_value AS UNSIGNED)
    ELSE config_value
  END as config_value,
  config_type,
  description,
  updated_at
FROM approval_config;

-- ============================================
-- 完成
-- ============================================
