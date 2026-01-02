/**
 * 审批流引擎 - 完整版
 * 支持：条件路由、会签/或签、动态审批人、委托、超时等
 */

// ============================================
// 核心引擎类
// ============================================
class ApprovalEngine {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * 注册事件监听器
   */
  on(eventName, handler) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(handler);
  }

  /**
   * 触发事件
   */
  async emit(eventName, ...args) {
    const handlers = this.listeners.get(eventName) || [];
    for (const handler of handlers) {
      try {
        await handler(...args);
      } catch (error) {
        console.error(`[ApprovalEngine] Event handler error for ${eventName}:`, error);
      }
    }
  }

  /**
   * 发起审批流程
   */
  async startApprovalFlow(params, connection) {
    const {
      templateCode,
      businessType,
      businessId,
      businessNumber,
      businessData,
      applicantId,
      applicantName,
      departmentId,
      departmentName,
      title,
      priority = 'normal',
      variables = {},
      customApprovers = null, // 自定义审批人配置（来自规则配置）
    } = params;

    console.log(`[ApprovalEngine] 发起审批流程: ${templateCode}, 业务: ${businessType}/${businessId}`);

    // 1. 查询模板
    const template = await this._getTemplate(templateCode, connection);
    if (!template) {
      throw new Error(`审批模板不存在: ${templateCode}`);
    }

    // 2. 生成实例编号
    const instanceNumber = this._generateInstanceNumber();

    // 3. 解析流程配置
    const flowConfig = typeof template.config === 'string'
      ? JSON.parse(template.config)
      : template.config;

    // 4. 创建审批实例
    const [result] = await connection.query(
      `INSERT INTO approval_instances (
        instance_number, template_id, template_code, template_version,
        business_type, business_id, business_number, business_data,
        title, applicant_id, applicant_name, department_id, department_name,
        status, flow_snapshot, variables, priority, started_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, NOW(3))`,
      [
        instanceNumber,
        template.id,
        templateCode,
        template.version,
        businessType,
        businessId,
        businessNumber,
        JSON.stringify(businessData),
        title,
        applicantId,
        applicantName,
        departmentId,
        departmentName,
        JSON.stringify(flowConfig),
        JSON.stringify(variables),
        priority,
      ]
    );

    const instanceId = result.insertId;

    // 5. 实例化流程节点
    await this._initializeNodes(instanceId, flowConfig, connection);

    // 6. 记录提交操作
    await this._recordAction({
      instanceId,
      nodeId: null,
      approverId: applicantId,
      approverName: applicantName,
      action: 'submit',
      comment: '发起审批',
      connection,
    });

    // 7. 启动第一个审批节点
    await this._startFirstNode(instanceId, flowConfig, businessData, connection, customApprovers);

    // 8. 触发事件
    await this.emit('instance.started', { instanceId, templateCode, businessType, businessId });

    // 9. 发送通知
    await this._sendNotifications(instanceId, 'pending', connection);

    console.log(`[ApprovalEngine] ✅ 审批实例创建成功: ${instanceNumber}`);

    return {
      id: instanceId,
      instanceNumber,
      templateCode,
    };
  }

  /**
   * 处理审批操作
   */
  async handleApproval(params, connection) {
    const {
      instanceId,
      approverId,
      approverName,
      action, // 'approve' or 'reject'
      comment = '',
      attachments = [],
      signature = null,
    } = params;

    console.log(`[ApprovalEngine] 处理审批: 实例${instanceId}, 操作${action}, 审批人${approverName}`);

    // 1. 查询实例
    const instance = await this._getInstance(instanceId, connection);
    if (!instance) {
      throw new Error('审批实例不存在');
    }

    if (instance.status !== 'pending') {
      throw new Error('该审批已完成，无法操作');
    }

    // 2. 查询当前节点
    const currentNode = await this._getCurrentNode(instanceId, instance.current_node_id, connection);
    if (!currentNode) {
      throw new Error('当前节点不存在');
    }

    // 3. 检查审批权限（包括委托）
    const hasPermission = await this._checkApprovalPermission(
      approverId,
      currentNode,
      instance,
      connection
    );

    if (!hasPermission) {
      throw new Error('您没有权限审批此单据');
    }

    // 4. 记录审批操作
    const startTime = Date.now();
    await this._recordAction({
      instanceId,
      nodeId: currentNode.id,
      approverId,
      approverName,
      action,
      result: action === 'approve' ? 'approved' : 'rejected',
      comment,
      attachments,
      signature,
      durationSeconds: Math.floor((Date.now() - startTime) / 1000),
      connection,
    });

    // 5. 更新节点状态
    await this._updateNodeApprovalStatus(currentNode, approverId, action, connection);

    // 6. 判断节点是否完成
    const nodeCompleted = await this._checkNodeCompleted(currentNode, connection);

    if (!nodeCompleted) {
      // 节点未完成（会签等待其他人）
      console.log(`[ApprovalEngine] 节点 ${currentNode.node_name} 等待其他审批人`);
      return {
        status: 'pending',
        finished: false,
        message: '审批已提交，等待其他审批人',
      };
    }

    // 7. 节点完成，判断结果
    const nodeResult = await this._getNodeResult(currentNode, connection);

    // 8. 触发节点完成事件
    await this.emit('node.completed', { instance, node: currentNode, result: nodeResult });

    // 9. 根据结果决定下一步
    if (nodeResult === 'rejected') {
      // 拒绝：结束流程
      await this._finishInstance(instanceId, 'rejected', connection);
      await this._sendNotifications(instanceId, 'rejected', connection);
      
      console.log(`[ApprovalEngine] ✅ 实例 ${instance.instance_number} 被拒绝`);
      
      return {
        status: 'rejected',
        finished: true,
        message: '审批已拒绝',
      };
    } else {
      // 通过：进入下一节点
      const hasNext = await this._moveToNextNode(instance, currentNode, connection);

      if (!hasNext) {
        // 所有节点完成，流程结束
        await this._finishInstance(instanceId, 'approved', connection);
        await this._sendNotifications(instanceId, 'approved', connection);
        
        console.log(`[ApprovalEngine] ✅ 实例 ${instance.instance_number} 审批通过`);
        
        return {
          status: 'approved',
          finished: true,
          message: '审批已通过',
        };
      } else {
        // 进入下一节点
        console.log(`[ApprovalEngine] 实例 ${instance.instance_number} 进入下一节点`);
        
        return {
          status: 'pending',
          finished: false,
          message: '审批已提交，进入下一级审批',
        };
      }
    }
  }

  /**
   * 撤回审批
   */
  async withdrawApproval(instanceId, applicantId, reason, connection) {
    console.log(`[ApprovalEngine] 撤回审批: ${instanceId}`);

    const instance = await this._getInstance(instanceId, connection);

    if (instance.applicant_id !== applicantId) {
      throw new Error('只有申请人可以撤回');
    }

    if (instance.status !== 'pending') {
      throw new Error('只能撤回待审批的申请');
    }

    await this._finishInstance(instanceId, 'withdrawn', connection);

    await this._recordAction({
      instanceId,
      nodeId: instance.current_node_id,
      approverId: applicantId,
      approverName: instance.applicant_name,
      action: 'withdraw',
      comment: reason || '申请人撤回',
      connection,
    });

    await this.emit('instance.withdrawn', { instance });

    console.log(`[ApprovalEngine] ✅ 实例已撤回: ${instance.instance_number}`);
  }

  /**
   * 转交审批
   */
  async transferApproval(params, connection) {
    const { instanceId, nodeId, fromUserId, toUserId, toUserName, reason } = params;

    console.log(`[ApprovalEngine] 转交审批: ${fromUserId} -> ${toUserId}`);

    // 更新节点的审批人
    const [nodes] = await connection.query(
      `SELECT actual_approvers FROM approval_nodes WHERE id = ?`,
      [nodeId]
    );

    if (nodes.length === 0) {
      throw new Error('节点不存在');
    }

    const actualApprovers = JSON.parse(nodes[0].actual_approvers || '[]');
    const approverIndex = actualApprovers.findIndex(a => a.id === fromUserId);

    if (approverIndex === -1) {
      throw new Error('您不是当前审批人');
    }

    // 替换审批人
    actualApprovers[approverIndex] = {
      id: toUserId,
      name: toUserName,
      status: 'pending',
      assignedAt: new Date().toISOString(),
      transferredFrom: fromUserId,
    };

    await connection.query(
      `UPDATE approval_nodes SET actual_approvers = ? WHERE id = ?`,
      [JSON.stringify(actualApprovers), nodeId]
    );

    // 记录转交操作
    await this._recordAction({
      instanceId,
      nodeId,
      approverId: fromUserId,
      action: 'transfer',
      result: 'transferred',
      comment: reason,
      transferToId: toUserId,
      transferToName: toUserName,
      connection,
    });

    // 发送通知给新审批人
    await this._sendNotificationToUser(toUserId, instanceId, 'transfer', connection);

    console.log(`[ApprovalEngine] ✅ 审批已转交`);
  }

  // ============================================
  // 私有方法
  // ============================================

  /**
   * 获取模板
   */
  async _getTemplate(templateCode, connection) {
    const [templates] = await connection.query(
      `SELECT * FROM approval_templates WHERE code = ? AND is_active = 1 AND is_deleted = 0`,
      [templateCode]
    );
    return templates[0] || null;
  }

  /**
   * 获取实例
   */
  async _getInstance(instanceId, connection) {
    const [instances] = await connection.query(
      `SELECT * FROM approval_instances WHERE id = ? AND is_deleted = 0`,
      [instanceId]
    );
    return instances[0] || null;
  }

  /**
   * 获取当前节点
   */
  async _getCurrentNode(instanceId, nodeId, connection) {
    const [nodes] = await connection.query(
      `SELECT * FROM approval_nodes WHERE id = ? AND instance_id = ?`,
      [nodeId, instanceId]
    );
    return nodes[0] || null;
  }

  /**
   * 生成实例编号
   */
  _generateInstanceNumber() {
    return `APV${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  }

  /**
   * 初始化流程节点
   */
  async _initializeNodes(instanceId, flowConfig, connection) {
    const nodes = flowConfig.nodes || [];
    
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      
      // 跳过开始和结束节点
      if (node.type === 'start' || node.type === 'end') {
        continue;
      }

      await connection.query(
        `INSERT INTO approval_nodes (
          instance_id, node_key, node_name, node_type,
          approver_type, approver_config, approval_mode,
          sequence, status, timeout_hours
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [
          instanceId,
          node.id,
          node.name,
          node.type || 'approval',
          node.approverType || 'user',
          JSON.stringify({
            roleCode: node.roleCode,
            level: node.level,
            userIds: node.userIds,
          }),
          node.mode || 'single',
          i,
          node.timeout || null,
        ]
      );
    }
  }

  /**
   * 启动第一个审批节点
   */
  async _startFirstNode(instanceId, flowConfig, businessData, connection, customApprovers = null) {
    const startNode = flowConfig.nodes.find(n => n.type === 'start');
    const firstApprovalNodeKey = startNode?.next;

    if (!firstApprovalNodeKey) {
      throw new Error('流程配置错误：找不到第一个审批节点');
    }

    const [nodes] = await connection.query(
      `SELECT * FROM approval_nodes WHERE instance_id = ? AND node_key = ?`,
      [instanceId, firstApprovalNodeKey]
    );

    if (nodes.length === 0) {
      throw new Error('第一个审批节点不存在');
    }

    const firstNode = nodes[0];

    // 解析审批人：优先使用 customApprovers（来自规则配置）
    let approvers;
    if (customApprovers && customApprovers.approvers && customApprovers.approvers.length > 0) {
      console.log('[ApprovalEngine] 使用自定义审批人配置');
      approvers = await this._resolveCustomApprovers(customApprovers, connection);
    } else {
      console.log('[ApprovalEngine] 使用模板默认审批人');
      approvers = await this._resolveApprovers(firstNode, businessData, connection);
    }

    // 更新节点
    await connection.query(
      `UPDATE approval_nodes 
       SET status = 'processing',
           actual_approvers = ?,
           started_at = NOW(3),
           timeout_at = DATE_ADD(NOW(3), INTERVAL ? HOUR)
       WHERE id = ?`,
      [JSON.stringify(approvers), firstNode.timeout_hours || null, firstNode.id]
    );

    // 更新实例的当前节点
    await connection.query(
      `UPDATE approval_instances SET current_node_id = ?, current_node_key = ? WHERE id = ?`,
      [firstNode.id, firstNode.node_key, instanceId]
    );

    console.log(`[ApprovalEngine] 启动第一个节点: ${firstNode.node_name}`);
  }

  /**
   * 解析审批人
   */
  async _resolveApprovers(node, businessData, connection) {
    const approverType = node.approver_type;
    const config = JSON.parse(node.approver_config || '{}');

    let approvers = [];

    if (approverType === 'user') {
      // 指定用户
      const userIds = config.userIds || [];
      const [users] = await connection.query(
        `SELECT id, COALESCE(NULLIF(name, ''), username) as name FROM users WHERE id IN (?) AND is_deleted = 0`,
        [userIds]
      );
      approvers = users.map(u => ({
        id: u.id,
        name: u.name,
        status: 'pending',
        assignedAt: new Date().toISOString(),
      }));

    } else if (approverType === 'role') {
      // 指定角色
      const [users] = await connection.query(
        `SELECT id, COALESCE(NULLIF(name, ''), username) as name FROM users WHERE role = ? AND is_deleted = 0`,
        [config.roleCode]
      );
      approvers = users.map(u => ({
        id: u.id,
        name: u.name,
        status: 'pending',
        assignedAt: new Date().toISOString(),
      }));

    } else if (approverType === 'superior') {
      // 直属上级
      const level = config.level || 1;
      // TODO: 实现上级查询逻辑
      console.warn('[ApprovalEngine] 上级审批人解析暂未实现');

    } else if (approverType === 'dynamic') {
      // 动态计算（从业务数据中获取）
      const userId = businessData?.businessManagerId;
      if (userId) {
        const [users] = await connection.query(
          `SELECT id, COALESCE(NULLIF(name, ''), username) as name FROM users WHERE id = ? AND is_deleted = 0`,
          [userId]
        );
        if (users.length > 0) {
          approvers = [{
            id: users[0].id,
            name: users[0].name,
            status: 'pending',
            assignedAt: new Date().toISOString(),
          }];
        }
      }
    }

    if (approvers.length === 0) {
      throw new Error(`无法解析审批人: ${node.node_name}`);
    }

    return approvers;
  }

  /**
   * 检查审批权限（包括委托）
   */
  async _checkApprovalPermission(approverId, node, instance, connection) {
    const actualApprovers = JSON.parse(node.actual_approvers || '[]');
    
    // 1. 直接是审批人
    const isDirectApprover = actualApprovers.some(a => a.id === approverId && a.status === 'pending');
    if (isDirectApprover) {
      return true;
    }

    // 2. 检查委托
    const today = new Date().toISOString().split('T')[0];
    const [delegations] = await connection.query(
      `SELECT * FROM approval_delegations 
       WHERE delegate_id = ? 
         AND is_active = 1
         AND start_date <= ? 
         AND end_date >= ?
         AND (business_types IS NULL OR JSON_CONTAINS(business_types, ?))`,
      [approverId, today, today, JSON.stringify(instance.business_type)]
    );

    if (delegations.length > 0) {
      // 检查委托人是否是审批人
      const delegatorId = delegations[0].delegator_id;
      const isDelegatorApprover = actualApprovers.some(
        a => a.id === delegatorId && a.status === 'pending'
      );
      return isDelegatorApprover;
    }

    return false;
  }

  /**
   * 更新节点审批状态
   */
  async _updateNodeApprovalStatus(node, approverId, action, connection) {
    const actualApprovers = JSON.parse(node.actual_approvers || '[]');
    const approverIndex = actualApprovers.findIndex(a => a.id === approverId);

    if (approverIndex !== -1) {
      actualApprovers[approverIndex].status = action === 'approve' ? 'approved' : 'rejected';
      actualApprovers[approverIndex].approvedAt = new Date().toISOString();
    }

    // 更新通过/拒绝计数
    const passCount = actualApprovers.filter(a => a.status === 'approved').length;
    const rejectCount = actualApprovers.filter(a => a.status === 'rejected').length;

    await connection.query(
      `UPDATE approval_nodes 
       SET actual_approvers = ?,
           pass_count = ?,
           reject_count = ?
       WHERE id = ?`,
      [JSON.stringify(actualApprovers), passCount, rejectCount, node.id]
    );
  }

  /**
   * 检查节点是否完成
   */
  async _checkNodeCompleted(node, connection) {
    const [nodes] = await connection.query(
      `SELECT approval_mode, required_count, pass_count, reject_count, actual_approvers 
       FROM approval_nodes WHERE id = ?`,
      [node.id]
    );

    if (nodes.length === 0) return false;

    const { approval_mode, required_count, pass_count, reject_count, actual_approvers } = nodes[0];
    const approvers = JSON.parse(actual_approvers || '[]');

    switch (approval_mode) {
      case 'single':
        // 单人审批：任意一人完成即可
        return pass_count > 0 || reject_count > 0;

      case 'and':
        // 会签：所有人都要审批
        return pass_count === approvers.length || reject_count > 0;

      case 'or':
        // 或签：任意N人通过即可
        return pass_count >= (required_count || 1) || reject_count > 0;

      case 'sequential':
        // 依次审批：按顺序审批
        const pendingIndex = approvers.findIndex(a => a.status === 'pending');
        return pendingIndex === -1; // 没有待审批的人

      default:
        return pass_count > 0 || reject_count > 0;
    }
  }

  /**
   * 获取节点结果
   */
  async _getNodeResult(node, connection) {
    const [nodes] = await connection.query(
      `SELECT reject_count FROM approval_nodes WHERE id = ?`,
      [node.id]
    );

    return nodes[0].reject_count > 0 ? 'rejected' : 'approved';
  }

  /**
   * 进入下一节点
   */
  async _moveToNextNode(instance, currentNode, connection) {
    // 1. 标记当前节点完成
    await connection.query(
      `UPDATE approval_nodes SET status = 'approved', finished_at = NOW(3) WHERE id = ?`,
      [currentNode.id]
    );

    // 2. 获取流程配置
    const flowConfig = JSON.parse(instance.flow_snapshot);
    const currentNodeConfig = flowConfig.nodes.find(n => n.id === currentNode.node_key);

    if (!currentNodeConfig) {
      console.error(`[ApprovalEngine] 找不到节点配置: ${currentNode.node_key}`);
      return false;
    }

    // 3. 确定下一节点
    let nextNodeKey = null;

    if (currentNodeConfig.type === 'condition') {
      // 条件节点：评估条件
      const variables = JSON.parse(instance.variables || '{}');
      const businessData = JSON.parse(instance.business_data || '{}');
      const context = { ...variables, ...businessData };

      const conditions = currentNodeConfig.conditions || [];
      for (const cond of conditions) {
        if (this._evaluateExpression(cond.expression, context)) {
          nextNodeKey = cond.next;
          break;
        }
      }
    } else {
      // 普通节点：直接取next
      nextNodeKey = currentNodeConfig.next;
    }

    if (!nextNodeKey) {
      console.log(`[ApprovalEngine] 没有下一节点，流程结束`);
      return false;
    }

    // 4. 检查是否是结束节点
    const nextNodeConfig = flowConfig.nodes.find(n => n.id === nextNodeKey);
    if (!nextNodeConfig || nextNodeConfig.type === 'end') {
      console.log(`[ApprovalEngine] 到达结束节点`);
      return false;
    }

    // 5. 查询下一节点
    const [nextNodes] = await connection.query(
      `SELECT * FROM approval_nodes WHERE instance_id = ? AND node_key = ?`,
      [instance.id, nextNodeKey]
    );

    if (nextNodes.length === 0) {
      console.error(`[ApprovalEngine] 下一节点不存在: ${nextNodeKey}`);
      return false;
    }

    const nextNode = nextNodes[0];

    // 6. 解析审批人
    const businessData = JSON.parse(instance.business_data || '{}');
    const approvers = await this._resolveApprovers(nextNode, businessData, connection);

    // 7. 启动下一节点
    await connection.query(
      `UPDATE approval_nodes 
       SET status = 'processing',
           actual_approvers = ?,
           started_at = NOW(3),
           timeout_at = DATE_ADD(NOW(3), INTERVAL ? HOUR)
       WHERE id = ?`,
      [JSON.stringify(approvers), nextNode.timeout_hours || null, nextNode.id]
    );

    // 8. 更新实例的当前节点
    await connection.query(
      `UPDATE approval_instances SET current_node_id = ?, current_node_key = ? WHERE id = ?`,
      [nextNode.id, nextNode.node_key, instance.id]
    );

    // 9. 发送通知
    await this._sendNotifications(instance.id, 'pending', connection);

    console.log(`[ApprovalEngine] 进入下一节点: ${nextNode.node_name}`);

    return true;
  }

  /**
   * 评估条件表达式
   */
  _evaluateExpression(expression, context) {
    try {
      // 简单的表达式评估
      // 支持: amount > 100000, status == 'active', department_id in [1,2,3]
      
      // 替换变量
      let expr = expression;
      Object.keys(context).forEach(key => {
        const value = context[key];
        const valueStr = typeof value === 'string' ? `"${value}"` : value;
        expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), valueStr);
      });

      // 评估表达式
      // 注意：这里使用 eval 仅作为示例，生产环境应使用安全的表达式引擎
      return eval(expr);
    } catch (error) {
      console.error(`[ApprovalEngine] 表达式评估失败: ${expression}`, error);
      return false;
    }
  }

  /**
   * 完成实例
   */
  async _finishInstance(instanceId, status, connection) {
    const now = new Date();
    
    await connection.query(
      `UPDATE approval_instances 
       SET status = ?, finished_at = NOW(3)
       WHERE id = ?`,
      [status, instanceId]
    );

    // 计算总耗时
    const [instances] = await connection.query(
      `SELECT TIMESTAMPDIFF(HOUR, started_at, finished_at) as duration 
       FROM approval_instances WHERE id = ?`,
      [instanceId]
    );

    if (instances.length > 0) {
      await connection.query(
        `UPDATE approval_instances SET total_duration_hours = ? WHERE id = ?`,
        [instances[0].duration, instanceId]
      );
    }
  }

  /**
   * 记录操作
   */
  async _recordAction(params) {
    const {
      instanceId,
      nodeId,
      approverId,
      approverName,
      action,
      result = null,
      comment = '',
      attachments = [],
      signature = null,
      transferToId = null,
      transferToName = null,
      durationSeconds = null,
      connection,
    } = params;

    await connection.query(
      `INSERT INTO approval_records (
        instance_id, node_id, approver_id, approver_name,
        action, result, comment, attachments,
        transfer_to_id, transfer_to_name,
        signature, duration_seconds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        instanceId,
        nodeId,
        approverId,
        approverName,
        action,
        result,
        comment,
        JSON.stringify(attachments),
        transferToId,
        transferToName,
        signature,
        durationSeconds,
      ]
    );
  }

  /**
   * 发送通知
   */
  async _sendNotifications(instanceId, notificationType, connection) {
    // 查询需要通知的人
    const [nodes] = await connection.query(
      `SELECT actual_approvers FROM approval_nodes 
       WHERE instance_id = ? AND status = 'processing'`,
      [instanceId]
    );

    if (nodes.length === 0) return;

    const approvers = JSON.parse(nodes[0].actual_approvers || '[]');

    for (const approver of approvers) {
      if (approver.status === 'pending') {
        await this._sendNotificationToUser(approver.id, instanceId, notificationType, connection);
      }
    }
  }

  /**
   * 发送通知给指定用户
   */
  async _sendNotificationToUser(userId, instanceId, notificationType, connection) {
    const [instances] = await connection.query(
      `SELECT title FROM approval_instances WHERE id = ?`,
      [instanceId]
    );

    if (instances.length === 0) return;

    const title = instances[0].title;

    await connection.query(
      `INSERT INTO approval_notifications (
        instance_id, recipient_id, notification_type,
        title, channels, status
      ) VALUES (?, ?, ?, ?, ?, 'pending')`,
      [
        instanceId,
        userId,
        notificationType,
        `待办审批: ${title}`,
        JSON.stringify(['in_app', 'email']),
      ]
    );
  }

  /**
   * 解析自定义审批人配置（来自规则配置）
   */
  async _resolveCustomApprovers(customApprovers, connection) {
    const { approvers, approval_mode } = customApprovers;
    const resolvedApprovers = [];

    for (const approver of approvers) {
      if (approver.type === 'user') {
        // 指定用户
        const [users] = await connection.query(
          `SELECT id, COALESCE(NULLIF(name, ''), username) as name FROM users WHERE id = ? AND is_deleted = 0`,
          [approver.value]
        );
        if (users.length > 0) {
          resolvedApprovers.push({
            id: users[0].id,
            name: users[0].name,
            type: 'user',
            status: 'pending',
          });
        }
      } else if (approver.type === 'role') {
        // 角色
        const [users] = await connection.query(
          `SELECT id, COALESCE(NULLIF(name, ''), username) as name FROM users WHERE role = ? AND is_deleted = 0`,
          [approver.value]
        );
        users.forEach(user => {
          resolvedApprovers.push({
            id: user.id,
            name: user.name,
            type: 'role',
            role: approver.value,
            status: 'pending',
          });
        });
      } else if (approver.type === 'department') {
        // 部门
        const [users] = await connection.query(
          `SELECT id, COALESCE(NULLIF(name, ''), username) as name FROM users WHERE department_id = ? AND is_deleted = 0`,
          [approver.value]
        );
        users.forEach(user => {
          resolvedApprovers.push({
            id: user.id,
            name: user.name,
            type: 'department',
            department_id: approver.value,
            status: 'pending',
          });
        });
      }
    }

    if (resolvedApprovers.length === 0) {
      throw new Error('未找到有效的审批人');
    }

    console.log(`[ApprovalEngine] 解析出 ${resolvedApprovers.length} 个审批人`);
    return resolvedApprovers;
  }
}

// ============================================
// 导出单例
// ============================================
const approvalEngine = new ApprovalEngine();

export default approvalEngine;

// 导出主要方法
export const {
  startApprovalFlow,
  handleApproval,
  withdrawApproval,
  transferApproval,
} = {
  startApprovalFlow: (params, conn) => approvalEngine.startApprovalFlow(params, conn),
  handleApproval: (params, conn) => approvalEngine.handleApproval(params, conn),
  withdrawApproval: (id, applicantId, reason, conn) => approvalEngine.withdrawApproval(id, applicantId, reason, conn),
  transferApproval: (params, conn) => approvalEngine.transferApproval(params, conn),
};
