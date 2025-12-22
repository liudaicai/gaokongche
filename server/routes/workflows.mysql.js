import express from 'express';

function buildWorkflowsRouter(pool) {
  const router = express.Router();

  // 辅助函数：转换为驼峰命名
  function toCamelCase(str) {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  }

  function keysToCamelCase(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(keysToCamelCase);
    
    const result = {};
    for (const key in obj) {
      result[toCamelCase(key)] = obj[key];
    }
    return result;
  }

  // 辅助函数：获取公司ID
  function getCompanyId(req) {
    const isSuperAdmin = req.user?.role === 'superadmin';
    return isSuperAdmin ? req.query.companyId || req.body.companyId : req.user?.company_id;
  }

  // ==================== 工作流定义管理 ====================

  // 获取工作流定义列表
  router.get('/definitions', async (req, res) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) {
        return res.json({ ok: false, error: '未找到公司信息' });
      }

      const { category, status } = req.query;
      let whereConditions = ['company_id = ?', 'is_deleted = FALSE'];
      const params = [companyId];

      if (category) {
        whereConditions.push('category = ?');
        params.push(category);
      }
      if (status) {
        whereConditions.push('status = ?');
        params.push(status);
      }

      const whereClause = whereConditions.join(' AND ');

      const [definitions] = await pool.query(
        `SELECT * FROM workflow_definitions WHERE ${whereClause} ORDER BY category, created_at DESC`,
        params
      );

      res.json({
        ok: true,
        data: definitions.map(d => keysToCamelCase(d))
      });
    } catch (error) {
      console.error('获取工作流定义列表失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  // 创建工作流定义
  router.post('/definitions', async (req, res) => {
    try {
      const companyId = getCompanyId(req);
      if (!companyId) {
        return res.json({ ok: false, error: '未找到公司信息' });
      }

      const { code, name, category, businessType, description, config, formConfig } = req.body;
      const userId = req.user?.id;

      if (!code || !name || !category) {
        return res.json({ ok: false, error: '缺少必填字段' });
      }

      const [result] = await pool.query(
        `INSERT INTO workflow_definitions (
          company_id, code, name, category, business_type, description,
          config, form_config, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
        [companyId, code, name, category, businessType, description,
         JSON.stringify(config || {}), JSON.stringify(formConfig || {}), userId]
      );

      res.json({
        ok: true,
        data: { id: result.insertId }
      });
    } catch (error) {
      console.error('创建工作流定义失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  // ==================== 流程实例管理 ====================

  // 启动工作流
  router.post('/instances/start', async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const companyId = getCompanyId(req);
      const userId = req.user?.id;
      const userName = req.user?.name || req.user?.username;

      const {
        workflowDefinitionId,
        businessType,
        businessId,
        businessNo,
        title,
        formData,
        priority = 'normal'
      } = req.body;

      if (!workflowDefinitionId || !title) {
        throw new Error('缺少必填字段');
      }

      // 获取工作流定义
      const [[definition]] = await connection.query(
        'SELECT * FROM workflow_definitions WHERE id = ? AND company_id = ? AND status = "active"',
        [workflowDefinitionId, companyId]
      );

      if (!definition) {
        throw new Error('工作流定义不存在或未激活');
      }

      // 生成实例编号
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const [[{ count }]] = await connection.query(
        'SELECT COUNT(*) as count FROM workflow_instances WHERE DATE(created_at) = CURDATE() AND company_id = ?',
        [companyId]
      );
      const instanceNo = `WF${dateStr}${String(count + 1).padStart(4, '0')}`;

      // 创建流程实例
      const [instanceResult] = await connection.query(
        `INSERT INTO workflow_instances (
          company_id, workflow_definition_id, instance_no,
          business_type, business_id, business_no,
          title, current_node, status, priority,
          started_at, initiator_id, initiator_name, form_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'running', ?, NOW(), ?, ?, ?)`,
        [companyId, workflowDefinitionId, instanceNo,
         businessType, businessId, businessNo,
         title, 'start', priority, userId, userName, JSON.stringify(formData || {})]
      );

      const instanceId = instanceResult.insertId;

      // 记录历史
      await connection.query(
        `INSERT INTO workflow_history (
          company_id, workflow_instance_id, action,
          from_node, to_node, from_status, to_status,
          operator_id, operator_name, operator_ip, operated_at
        ) VALUES (?, ?, 'start', NULL, 'start', NULL, 'running', ?, ?, ?, NOW())`,
        [companyId, instanceId, userId, userName, req.ip]
      );

      await connection.commit();

      res.json({
        ok: true,
        data: { instanceId, instanceNo }
      });
    } catch (error) {
      await connection.rollback();
      console.error('启动工作流失败:', error);
      res.json({ ok: false, error: error.message });
    } finally {
      connection.release();
    }
  });

  // 获取我的待办任务
  router.get('/tasks/pending', async (req, res) => {
    try {
      const companyId = getCompanyId(req);
      const userId = req.user?.id;

      if (!companyId || !userId) {
        return res.json({ ok: false, error: '未找到用户信息' });
      }

      const [tasks] = await pool.query(
        `SELECT 
          t.*,
          i.instance_no,
          i.title as instance_title,
          i.business_type,
          i.business_no,
          i.priority as instance_priority,
          d.name as workflow_name
        FROM workflow_tasks t
        INNER JOIN workflow_instances i ON t.workflow_instance_id = i.id
        INNER JOIN workflow_definitions d ON i.workflow_definition_id = d.id
        WHERE t.company_id = ?
          AND t.assignee_id = ?
          AND t.status IN ('pending', 'claimed', 'in_progress')
          AND t.is_deleted = FALSE
        ORDER BY t.priority DESC, t.created_at ASC`,
        [companyId, userId]
      );

      res.json({
        ok: true,
        data: tasks.map(t => keysToCamelCase(t))
      });
    } catch (error) {
      console.error('获取待办任务失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  // 处理任务（审批/拒绝）
  router.post('/tasks/:id/complete', async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const taskId = req.params.id;
      const userId = req.user?.id;
      const userName = req.user?.name || req.user?.username;
      const { result, comment, attachments } = req.body;

      if (!result || !['approved', 'rejected'].includes(result)) {
        throw new Error('无效的处理结果');
      }

      // 获取任务信息
      const [[task]] = await connection.query(
        'SELECT * FROM workflow_tasks WHERE id = ? AND assignee_id = ? AND is_deleted = FALSE',
        [taskId, userId]
      );

      if (!task) {
        throw new Error('任务不存在或无权处理');
      }

      if (task.status === 'completed') {
        throw new Error('任务已完成');
      }

      // 更新任务状态
      await connection.query(
        `UPDATE workflow_tasks SET
          status = 'completed',
          result = ?,
          comment = ?,
          attachments = ?,
          completed_at = NOW()
        WHERE id = ?`,
        [result, comment, JSON.stringify(attachments || []), taskId]
      );

      // 获取流程实例
      const [[instance]] = await connection.query(
        'SELECT * FROM workflow_instances WHERE id = ?',
        [task.workflow_instance_id]
      );

      // 更新流程实例状态
      let newStatus = instance.status;
      if (result === 'approved') {
        // 检查是否还有其他待办任务
        const [[{ pendingCount }]] = await connection.query(
          `SELECT COUNT(*) as pendingCount FROM workflow_tasks 
           WHERE workflow_instance_id = ? AND status IN ('pending', 'claimed', 'in_progress') AND is_deleted = FALSE`,
          [instance.id]
        );

        if (pendingCount === 0) {
          newStatus = 'completed';
        }
      } else {
        newStatus = 'rejected';
      }

      await connection.query(
        'UPDATE workflow_instances SET status = ?, completed_at = NOW() WHERE id = ?',
        [newStatus, instance.id]
      );

      // 记录历史
      await connection.query(
        `INSERT INTO workflow_history (
          company_id, workflow_instance_id, task_id, action,
          from_node, to_node, from_status, to_status,
          operator_id, operator_name, comment, operated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [instance.company_id, instance.id, taskId, result,
         task.node_key, null, task.status, 'completed',
         userId, userName, comment]
      );

      await connection.commit();

      res.json({ ok: true, message: '处理成功' });
    } catch (error) {
      await connection.rollback();
      console.error('处理任务失败:', error);
      res.json({ ok: false, error: error.message });
    } finally {
      connection.release();
    }
  });

  // 获取流程实例详情
  router.get('/instances/:id', async (req, res) => {
    try {
      const instanceId = req.params.id;
      const companyId = getCompanyId(req);

      const [[instance]] = await pool.query(
        `SELECT 
          i.*,
          d.name as workflow_name,
          d.category,
          d.config
        FROM workflow_instances i
        INNER JOIN workflow_definitions d ON i.workflow_definition_id = d.id
        WHERE i.id = ? AND i.company_id = ?`,
        [instanceId, companyId]
      );

      if (!instance) {
        return res.json({ ok: false, error: '流程实例不存在' });
      }

      // 获取任务列表
      const [tasks] = await pool.query(
        'SELECT * FROM workflow_tasks WHERE workflow_instance_id = ? ORDER BY created_at',
        [instanceId]
      );

      // 获取历史记录
      const [history] = await pool.query(
        'SELECT * FROM workflow_history WHERE workflow_instance_id = ? ORDER BY operated_at',
        [instanceId]
      );

      res.json({
        ok: true,
        data: {
          ...keysToCamelCase(instance),
          tasks: tasks.map(t => keysToCamelCase(t)),
          history: history.map(h => keysToCamelCase(h))
        }
      });
    } catch (error) {
      console.error('获取流程详情失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  // 获取流程实例列表
  router.get('/instances', async (req, res) => {
    try {
      const companyId = getCompanyId(req);
      const { page = 1, pageSize = 20, status, businessType, initiatorId } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      let whereConditions = ['i.company_id = ?', 'i.is_deleted = FALSE'];
      const params = [companyId];

      if (status) {
        whereConditions.push('i.status = ?');
        params.push(status);
      }
      if (businessType) {
        whereConditions.push('i.business_type = ?');
        params.push(businessType);
      }
      if (initiatorId) {
        whereConditions.push('i.initiator_id = ?');
        params.push(initiatorId);
      }

      const whereClause = whereConditions.join(' AND ');

      const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) as total FROM workflow_instances i WHERE ${whereClause}`,
        params
      );

      const [instances] = await pool.query(
        `SELECT 
          i.*,
          d.name as workflow_name,
          d.category
        FROM workflow_instances i
        INNER JOIN workflow_definitions d ON i.workflow_definition_id = d.id
        WHERE ${whereClause}
        ORDER BY i.created_at DESC
        LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      res.json({
        ok: true,
        data: instances.map(i => keysToCamelCase(i)),
        pagination: {
          page: parseInt(page),
          pageSize: limit,
          total
        }
      });
    } catch (error) {
      console.error('获取流程实例列表失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  // ==================== 操作日志 ====================

  // 记录操作日志
  router.post('/logs/operation', async (req, res) => {
    try {
      const companyId = getCompanyId(req);
      const userId = req.user?.id;
      const username = req.user?.username;
      const userName = req.user?.name;

      const {
        module,
        action,
        resourceType,
        resourceId,
        description,
        requestParams,
        oldValue,
        newValue
      } = req.body;

      await pool.query(
        `INSERT INTO system_operation_logs (
          company_id, module, action, resource_type, resource_id, description,
          user_id, username, user_name, ip_address, user_agent,
          request_method, request_url, request_params,
          old_value, new_value, success, operated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
        [companyId, module, action, resourceType, resourceId, description,
         userId, username, userName, req.ip, req.get('user-agent'),
         req.method, req.originalUrl, JSON.stringify(requestParams || {}),
         JSON.stringify(oldValue || {}), JSON.stringify(newValue || {})]
      );

      res.json({ ok: true });
    } catch (error) {
      console.error('记录操作日志失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  // 查询操作日志
  router.get('/logs/operation', async (req, res) => {
    try {
      const companyId = getCompanyId(req);
      const { page = 1, pageSize = 50, module, userId, startDate, endDate } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      let whereConditions = ['company_id = ?'];
      const params = [companyId];

      if (module) {
        whereConditions.push('module = ?');
        params.push(module);
      }
      if (userId) {
        whereConditions.push('user_id = ?');
        params.push(userId);
      }
      if (startDate) {
        whereConditions.push('operated_at >= ?');
        params.push(startDate);
      }
      if (endDate) {
        whereConditions.push('operated_at <= ?');
        params.push(endDate);
      }

      const whereClause = whereConditions.join(' AND ');

      const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) as total FROM system_operation_logs WHERE ${whereClause}`,
        params
      );

      const [logs] = await pool.query(
        `SELECT * FROM system_operation_logs WHERE ${whereClause} ORDER BY operated_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      res.json({
        ok: true,
        data: logs.map(l => keysToCamelCase(l)),
        pagination: {
          page: parseInt(page),
          pageSize: limit,
          total
        }
      });
    } catch (error) {
      console.error('查询操作日志失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  // ==================== 统计数据 ====================

  // 获取工作流统计数据
  router.get('/stats/dashboard', async (req, res) => {
    try {
      const companyId = getCompanyId(req);

      // 我的待办任务数
      const userId = req.user?.id;
      const [[{ pendingTasks }]] = await pool.query(
        `SELECT COUNT(*) as pendingTasks FROM workflow_tasks 
         WHERE company_id = ? AND assignee_id = ? AND status IN ('pending', 'claimed') AND is_deleted = FALSE`,
        [companyId, userId]
      );

      // 进行中的流程
      const [[{ runningInstances }]] = await pool.query(
        'SELECT COUNT(*) as runningInstances FROM workflow_instances WHERE company_id = ? AND status = "running"',
        [companyId]
      );

      // 今日完成的任务
      const [[{ todayCompleted }]] = await pool.query(
        `SELECT COUNT(*) as todayCompleted FROM workflow_tasks 
         WHERE company_id = ? AND status = 'completed' AND DATE(completed_at) = CURDATE()`,
        [companyId]
      );

      // 本月流程统计
      const [monthlyStats] = await pool.query(
        `SELECT 
          status,
          COUNT(*) as count
        FROM workflow_instances
        WHERE company_id = ? AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())
        GROUP BY status`,
        [companyId]
      );

      res.json({
        ok: true,
        data: {
          pendingTasks,
          runningInstances,
          todayCompleted,
          monthlyStats: monthlyStats.map(s => keysToCamelCase(s))
        }
      });
    } catch (error) {
      console.error('获取统计数据失败:', error);
      res.json({ ok: false, error: error.message });
    }
  });

  return router;
}

export default buildWorkflowsRouter;
