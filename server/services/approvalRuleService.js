/**
 * 审批规则判断服务
 * 支持灵活的审批触发条件配置
 */

/**
 * 检查是否需要审批
 * @param {object} params - 参数
 * @param {string} params.businessType - 业务类型
 * @param {object} params.businessData - 业务数据
 * @param {object} params.connection - 数据库连接
 * @returns {Promise<{needApproval: boolean, templateCode: string|null, matchedRule: object|null}>}
 */
export async function checkApprovalRequired(params) {
  const { businessType, businessData, connection } = params;

  // 1. 检查审批系统总开关
  const [configRows] = await connection.query(
    `SELECT config_value FROM approval_config WHERE config_key = 'approval_system_enabled'`
  );

  if (configRows.length === 0 || configRows[0].config_value !== 'true') {
    console.log(`[ApprovalRule] 审批系统已关闭，无需审批`);
    return {
      needApproval: false,
      templateCode: null,
      matchedRule: null,
      reason: '审批系统已关闭',
    };
  }

  // 2. 查询该业务类型的启用规则
  const [rules] = await connection.query(
    `SELECT * FROM approval_business_rules 
     WHERE business_type = ? 
       AND is_enabled = TRUE 
       AND is_deleted = FALSE
     ORDER BY priority DESC`,
    [businessType]
  );

  if (rules.length === 0) {
    console.log(`[ApprovalRule] 业务类型 ${businessType} 无审批规则`);
    return {
      needApproval: false,
      templateCode: null,
      matchedRule: null,
      reason: '无匹配的审批规则',
    };
  }

  // 3. 逐条评估规则
  for (const rule of rules) {
    const condition = typeof rule.trigger_condition === 'string'
      ? JSON.parse(rule.trigger_condition)
      : rule.trigger_condition;
    const match = evaluateCondition(condition, businessData);

    if (match) {
      console.log(`[ApprovalRule] 匹配规则: ${rule.rule_name}`);
      
      // 检查规则类型
      if (condition.type === 'never') {
        // never 类型：永不审批
        return {
          needApproval: false,
          templateCode: null,
          matchedRule: {
            id: rule.id,
            name: rule.rule_name,
            code: rule.rule_code,
          },
          reason: '规则配置为无需审批',
        };
      }

      // 需要审批
      return {
        needApproval: true,
        templateCode: rule.template_code,
        approverConfig: typeof rule.approver_config === 'string'
          ? JSON.parse(rule.approver_config)
          : rule.approver_config,
        matchedRule: {
          id: rule.id,
          name: rule.rule_name,
          code: rule.rule_code,
          description: rule.description,
        },
        reason: `匹配规则：${rule.rule_name}`,
      };
    }
  }

  // 4. 无规则匹配，默认不需要审批
  console.log(`[ApprovalRule] 无规则匹配，默认无需审批`);
  return {
    needApproval: false,
    templateCode: null,
    matchedRule: null,
    reason: '无规则匹配，默认无需审批',
  };
}

/**
 * 评估条件是否满足
 * @param {object} condition - 条件配置
 * @param {object} data - 业务数据
 * @returns {boolean}
 */
function evaluateCondition(condition, data) {
  const { type } = condition;

  switch (type) {
    case 'always':
      // 总是触发
      return true;

    case 'never':
      // 永不触发（但返回true表示匹配到此规则）
      return true;

    case 'threshold':
      // 阈值判断
      return evaluateThreshold(condition, data);

    case 'condition':
      // 条件判断
      return evaluateFieldCondition(condition, data);

    case 'expression':
      // 表达式判断（复杂条件）
      return evaluateExpression(condition, data);

    default:
      console.warn(`[ApprovalRule] 未知条件类型: ${type}`);
      return false;
  }
}

/**
 * 评估阈值条件
 * @param {object} condition - 条件配置
 * @param {object} data - 业务数据
 * @returns {boolean}
 */
function evaluateThreshold(condition, data) {
  const { field, operator, value } = condition;
  const fieldValue = getFieldValue(data, field);

  if (fieldValue === undefined || fieldValue === null) {
    return false;
  }

  const numValue = Number(fieldValue);
  const numThreshold = Number(value);

  switch (operator) {
    case '>':
      return numValue > numThreshold;
    case '>=':
      return numValue >= numThreshold;
    case '<':
      return numValue < numThreshold;
    case '<=':
      return numValue <= numThreshold;
    case '==':
    case '===':
      return numValue === numThreshold;
    case '!=':
    case '!==':
      return numValue !== numThreshold;
    default:
      return false;
  }
}

/**
 * 评估字段条件
 * @param {object} condition - 条件配置
 * @param {object} data - 业务数据
 * @returns {boolean}
 */
function evaluateFieldCondition(condition, data) {
  const { field, operator, value } = condition;
  const fieldValue = getFieldValue(data, field);

  switch (operator) {
    case '==':
    case '===':
      return fieldValue === value;
    case '!=':
    case '!==':
      return fieldValue !== value;
    case 'in':
      return Array.isArray(value) && value.includes(fieldValue);
    case 'not_in':
      return Array.isArray(value) && !value.includes(fieldValue);
    case 'contains':
      return String(fieldValue).includes(String(value));
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null;
    case 'not_exists':
      return fieldValue === undefined || fieldValue === null;
    default:
      return false;
  }
}

/**
 * 评估表达式（复杂条件）
 * @param {object} condition - 条件配置
 * @param {object} data - 业务数据
 * @returns {boolean}
 */
function evaluateExpression(condition, data) {
  const { expression } = condition;

  try {
    // 替换表达式中的变量
    let expr = expression;
    Object.keys(data).forEach(key => {
      const value = data[key];
      const valueStr = typeof value === 'string' ? `"${value}"` : value;
      expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), valueStr);
    });

    // 评估表达式
    // 注意：这里使用 eval 仅作为示例，生产环境应使用安全的表达式引擎
    return eval(expr);
  } catch (error) {
    console.error(`[ApprovalRule] 表达式评估失败: ${expression}`, error);
    return false;
  }
}

/**
 * 获取字段值（支持嵌套）
 * @param {object} data - 数据对象
 * @param {string} fieldPath - 字段路径（支持点号分隔）
 * @returns {any}
 */
function getFieldValue(data, fieldPath) {
  if (!fieldPath) return undefined;

  const keys = fieldPath.split('.');
  let value = data;

  for (const key of keys) {
    if (value === undefined || value === null) {
      return undefined;
    }
    value = value[key];
  }

  return value;
}

/**
 * 获取所有启用的审批规则
 * @param {object} connection - 数据库连接
 * @returns {Promise<Array>}
 */
export async function getActiveApprovalRules(connection) {
  const [rules] = await connection.query(
    `SELECT 
      id, business_type, rule_name, rule_code,
      trigger_condition, template_code, description, priority, is_enabled
     FROM approval_business_rules
     WHERE is_deleted = FALSE
     ORDER BY business_type, priority DESC`
  );

  return rules.map(rule => ({
    ...rule,
    trigger_condition: typeof rule.trigger_condition === 'string'
      ? JSON.parse(rule.trigger_condition)
      : rule.trigger_condition,
  }));
}

/**
 * 获取审批系统配置
 * @param {object} connection - 数据库连接
 * @returns {Promise<object>}
 */
export async function getApprovalConfig(connection) {
  const [configs] = await connection.query(
    `SELECT config_key, config_value, config_type FROM approval_config`
  );

  const result = {};
  configs.forEach(config => {
    let value = config.config_value;

    // 类型转换
    if (config.config_type === 'boolean') {
      value = value === 'true';
    } else if (config.config_type === 'number') {
      value = Number(value);
    } else if (config.config_type === 'json') {
      try {
        value = JSON.parse(value);
      } catch (e) {
        console.error(`[ApprovalConfig] JSON解析失败: ${config.config_key}`);
      }
    }

    result[config.config_key] = value;
  });

  return result;
}

/**
 * 更新审批配置
 * @param {string} key - 配置键
 * @param {any} value - 配置值
 * @param {number} userId - 操作用户ID
 * @param {object} connection - 数据库连接
 */
export async function updateApprovalConfig(key, value, userId, connection) {
  let valueStr = String(value);

  if (typeof value === 'object') {
    valueStr = JSON.stringify(value);
  }

  await connection.query(
    `UPDATE approval_config 
     SET config_value = ?, updated_by = ?, updated_at = NOW(3)
     WHERE config_key = ?`,
    [valueStr, userId, key]
  );

  console.log(`[ApprovalConfig] 更新配置: ${key} = ${valueStr}`);
}

/**
 * 更新业务审批规则
 * @param {object} ruleData - 规则数据
 * @param {object} connection - 数据库连接
 */
export async function updateApprovalRule(ruleData, connection) {
  const { id, is_enabled, trigger_condition, template_code, description } = ruleData;

  await connection.query(
    `UPDATE approval_business_rules
     SET is_enabled = ?,
         trigger_condition = ?,
         template_code = ?,
         description = ?,
         updated_at = NOW(3)
     WHERE id = ?`,
    [
      is_enabled,
      JSON.stringify(trigger_condition),
      template_code,
      description,
      id,
    ]
  );

  console.log(`[ApprovalRule] 更新规则: ID=${id}`);
}
