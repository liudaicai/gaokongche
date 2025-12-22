/**
 * 审批配置系统 API 测试脚本
 * 使用方法: node test_approval_config_api.mjs
 */

import http from 'http';

// 配置
const API_BASE = 'http://localhost:3001';
let authToken = null;

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// HTTP 请求函数
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// 测试函数
async function test(name, fn) {
  try {
    log(`\n🧪 测试: ${name}`, 'cyan');
    await fn();
    log(`✅ ${name} - 通过`, 'green');
  } catch (error) {
    log(`❌ ${name} - 失败: ${error.message}`, 'red');
    if (error.data) {
      console.log('响应数据:', JSON.stringify(error.data, null, 2));
    }
  }
}

// 登录获取 token
async function login() {
  log('\n🔐 正在登录...', 'yellow');
  
  // 尝试多个账号
  const accounts = [
    { username: 'admin', password: 'admin123' },
    { username: 'liudaicai', password: '123456' },
    { username: '刘代才', password: '123456' },
  ];
  
  for (const account of accounts) {
    try {
      log(`尝试登录: ${account.username}...`, 'yellow');
      const response = await makeRequest('POST', '/api/auth/login', account);

      if (response.status === 200 && response.data.ok) {
        // Token可能在 data.token 或 data.data.token
        authToken = response.data.token || response.data.data?.token;
        
        if (authToken) {
          log(`✅ 登录成功！用户: ${account.username}`, 'green');
          log(`Token: ${authToken.substring(0, 30)}...`, 'blue');
          return true;
        } else {
          log(`❌ ${account.username} 登录失败: 未获取到token`, 'red');
        }
      } else {
        log(`❌ ${account.username} 登录失败 [状态码: ${response.status}]`, 'red');
      }
    } catch (error) {
      log(`❌ ${account.username} 登录出错: ${error.message}`, 'red');
    }
  }
  
  throw new Error('所有账号都无法登录，请检查账号密码或后端服务');
}

// 测试用例
async function testGetConfig() {
  const response = await makeRequest('GET', '/api/approval-config', null, authToken);
  
  if (response.status !== 200 || !response.data.ok) {
    throw new Error(`请求失败: ${JSON.stringify(response.data)}`);
  }

  const config = response.data.data;
  log(`审批系统状态: ${config.approval_system_enabled ? '✅ 开启' : '❌ 关闭'}`, 'blue');
  log(`自动审批: ${config.approval_auto_approve_enabled ? '开启' : '关闭'}`, 'blue');
  log(`审批通知: ${config.approval_notification_enabled ? '开启' : '关闭'}`, 'blue');
  log(`默认超时: ${config.approval_timeout_hours_default} 小时`, 'blue');

  return config;
}

async function testToggleSystem(enabled) {
  log(`\n${enabled ? '开启' : '关闭'}审批系统...`, 'yellow');
  
  const response = await makeRequest(
    'POST',
    '/api/approval-config/toggle',
    { enabled },
    authToken
  );

  if (response.status !== 200 || !response.data.ok) {
    throw new Error(`操作失败: ${JSON.stringify(response.data)}`);
  }

  log(`✅ ${response.data.data.message}`, 'green');
}

async function testGetRules() {
  const response = await makeRequest('GET', '/api/approval-config/rules', null, authToken);

  if (response.status !== 200 || !response.data.ok) {
    throw new Error(`请求失败: ${JSON.stringify(response.data)}`);
  }

  const rules = response.data.data;
  log(`\n📋 共有 ${rules.length} 条规则:`, 'blue');

  rules.forEach((rule, index) => {
    const status = rule.is_enabled ? '✅ 启用' : '❌ 禁用';
    log(`  ${index + 1}. [${status}] ${rule.rule_name} (优先级: ${rule.priority})`, 'cyan');
    
    const cond = rule.trigger_condition;
    if (cond.type === 'threshold') {
      log(`     触发条件: ${cond.field} ${cond.operator} ${cond.value}`, 'yellow');
    } else if (cond.type === 'always') {
      log(`     触发条件: 总是触发`, 'yellow');
    } else if (cond.type === 'never') {
      log(`     触发条件: 永不触发`, 'yellow');
    }
  });

  return rules;
}

async function testCheckApproval(businessType, businessData, expectedResult) {
  log(`\n检查业务: ${businessType}`, 'yellow');
  log(`业务数据: ${JSON.stringify(businessData)}`, 'yellow');

  const response = await makeRequest(
    'POST',
    '/api/approval-config/check',
    { businessType, businessData },
    authToken
  );

  if (response.status !== 200 || !response.data.ok) {
    throw new Error(`请求失败: ${JSON.stringify(response.data)}`);
  }

  const result = response.data.data;
  log(`判断结果: ${result.needApproval ? '🔴 需要审批' : '🟢 无需审批'}`, result.needApproval ? 'red' : 'green');
  log(`原因: ${result.reason}`, 'blue');
  
  if (result.matchedRule) {
    log(`匹配规则: ${result.matchedRule.name}`, 'cyan');
  }

  if (expectedResult !== undefined && result.needApproval !== expectedResult) {
    throw new Error(`期望 ${expectedResult ? '需要审批' : '无需审批'}，但实际为 ${result.needApproval ? '需要审批' : '无需审批'}`);
  }

  return result;
}

async function testUpdateRule(ruleId, updates) {
  log(`\n更新规则 ID: ${ruleId}`, 'yellow');
  log(`更新内容: ${JSON.stringify(updates)}`, 'yellow');

  const response = await makeRequest(
    'PUT',
    `/api/approval-config/rules/${ruleId}`,
    updates,
    authToken
  );

  if (response.status !== 200 || !response.data.ok) {
    throw new Error(`更新失败: ${JSON.stringify(response.data)}`);
  }

  log(`✅ ${response.data.data.message}`, 'green');
}

// 主测试流程
async function runTests() {
  log('='.repeat(60), 'cyan');
  log('审批配置系统 API 测试', 'cyan');
  log('='.repeat(60), 'cyan');

  try {
    // 登录
    await login();

    // 测试1: 获取配置
    await test('获取审批配置', async () => {
      await testGetConfig();
    });

    // 测试2: 获取规则列表
    let rules = [];
    await test('获取审批规则列表', async () => {
      rules = await testGetRules();
    });

    // 测试3: 测试订单创建审批（低于红线）
    await test('订单创建 - 金额8000元（低于红线）', async () => {
      await testCheckApproval(
        'order_create',
        { estimatedAmount: 8000 },
        true // 期望需要审批
      );
    });

    // 测试4: 测试订单创建审批（高于红线）
    await test('订单创建 - 金额15000元（高于红线）', async () => {
      await testCheckApproval(
        'order_create',
        { estimatedAmount: 15000 },
        false // 期望无需审批
      );
    });

    // 测试5: 测试退款审批
    await test('订单退款 - 必须审批', async () => {
      await testCheckApproval(
        'order_refund',
        { amount: 5000 },
        true // 期望需要审批
      );
    });

    // 测试6: 测试收款（无需审批）
    await test('订单收款 - 无需审批', async () => {
      await testCheckApproval(
        'order_receipt',
        { amount: 10000 },
        false // 期望无需审批
      );
    });

    // 测试7: 测试维修（更换配件）
    await test('设备维修 - 更换配件', async () => {
      await testCheckApproval(
        'equipment_repair',
        { hasPartReplacement: true, repairCost: 3000 },
        true // 期望需要审批
      );
    });

    // 测试8: 测试维修（高成本）
    await test('设备维修 - 高成本8000元', async () => {
      await testCheckApproval(
        'equipment_repair',
        { hasPartReplacement: false, repairCost: 8000 },
        true // 期望需要审批（超过5000元）
      );
    });

    // 测试9: 测试维修（普通维修）
    await test('设备维修 - 普通维修2000元', async () => {
      await testCheckApproval(
        'equipment_repair',
        { hasPartReplacement: false, repairCost: 2000 },
        false // 期望无需审批
      );
    });

    // 测试10: 测试换机审批
    await test('设备换机 - 必须审批', async () => {
      await testCheckApproval(
        'equipment_replacement',
        { oldCode: 'EQ001', newCode: 'EQ002' },
        true // 期望需要审批
      );
    });

    // 测试11: 关闭审批系统
    await test('关闭审批系统', async () => {
      await testToggleSystem(false);
    });

    // 测试12: 关闭后测试（应该无需审批）
    await test('关闭后 - 订单创建8000元', async () => {
      await testCheckApproval(
        'order_create',
        { estimatedAmount: 8000 },
        false // 期望无需审批（系统已关闭）
      );
    });

    // 测试13: 重新开启审批系统
    await test('重新开启审批系统', async () => {
      await testToggleSystem(true);
    });

    // 测试14: 开启后测试（应该需要审批）
    await test('开启后 - 订单创建8000元', async () => {
      await testCheckApproval(
        'order_create',
        { estimatedAmount: 8000 },
        true // 期望需要审批
      );
    });

    // 测试15: 修改规则（如果有订单价格红线规则）
    const orderPriceRule = rules.find(r => r.rule_code === 'ORDER_PRICE_THRESHOLD');
    if (orderPriceRule) {
      await test('修改订单价格红线为5000元', async () => {
        await testUpdateRule(orderPriceRule.id, {
          is_enabled: true,
          trigger_condition: {
            ...orderPriceRule.trigger_condition,
            value: 5000,
          },
        });
      });

      // 测试16: 验证修改后的规则
      await test('修改后 - 订单创建4000元（低于新红线5000）', async () => {
        await testCheckApproval(
          'order_create',
          { estimatedAmount: 4000 },
          true // 期望需要审批
        );
      });

      await test('修改后 - 订单创建6000元（高于新红线5000）', async () => {
        await testCheckApproval(
          'order_create',
          { estimatedAmount: 6000 },
          false // 期望无需审批
        );
      });

      // 恢复原来的阈值
      await test('恢复订单价格红线为10000元', async () => {
        await testUpdateRule(orderPriceRule.id, {
          is_enabled: true,
          trigger_condition: {
            ...orderPriceRule.trigger_condition,
            value: 10000,
          },
        });
      });
    }

    // 测试总结
    log('\n' + '='.repeat(60), 'cyan');
    log('🎉 所有测试完成！', 'green');
    log('='.repeat(60), 'cyan');

  } catch (error) {
    log('\n' + '='.repeat(60), 'red');
    log(`💥 测试失败: ${error.message}`, 'red');
    log('='.repeat(60), 'red');
    process.exit(1);
  }
}

// 运行测试
runTests();
