/**
 * 审批流API路由 - 完整版
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import approvalEngine from '../services/approvalEngine.js';

export default function buildApprovalsRouter(pool) {
  const router = express.Router();

  // ============================================
  // 审批实例管理
  // ============================================

  /**
   * POST /api/approvals/start
   * 发起审批流程
   */
  router.post(
    '/start',
    asyncHandler(async (req, res) => {
      const {
        templateCode,
        businessType,
        businessId,
        businessNumber,
        businessData,
        title,
        priority,
        variables,
      } = req.body;

      const userId = req.user.id;
      const userName = req.user.name || req.user.username;

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        const result = await approvalEngine.startApprovalFlow(
          {
            templateCode,
            businessType,
            businessId,
            businessNumber,
            businessData,
            applicantId: userId,
            applicantName: userName,
            title,
            priority: priority || 'normal',
            variables: variables || {},
          },
          connection
        );

        await connection.commit();

        res.json({
          ok: true,
          data: result,
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    })
  );

  /**
   * POST /api/approvals/:id/approve
   * 审批操作（同意/拒绝）
   */
  router.post(
    '/:id/approve',
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { approved, comment, attachments, signature } = req.body;

      const userId = req.user.id;
      const userName = req.user.name || req.user.username;

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        const result = await approvalEngine.handleApproval(
          {
            instanceId: parseInt(id),
            approverId: userId,
            approverName: userName,
            action: approved ? 'approve' : 'reject',
            comment: comment || '',
            attachments: attachments || [],
            signature: signature || null,
          },
          connection
        );

        await connection.commit();

        res.json({
          ok: true,
          data: result,
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    })
  );

  /**
   * POST /api/approvals/:id/withdraw
   * 撤回审批
   */
  router.post(
    '/:id/withdraw',
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { reason } = req.body;

      const userId = req.user.id;

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        await approvalEngine.withdrawApproval(
          parseInt(id),
          userId,
          reason || '申请人撤回',
          connection
        );

        await connection.commit();

        res.json({
          ok: true,
          data: { message: '审批已撤回' },
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    })
  );

  /**
   * POST /api/approvals/:id/transfer
   * 转交审批
   */
  router.post(
    '/:id/transfer',
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { nodeId, targetUserId, targetUserName, reason } = req.body;

      const userId = req.user.id;

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        await approvalEngine.transferApproval(
          {
            instanceId: parseInt(id),
            nodeId: parseInt(nodeId),
            fromUserId: userId,
            toUserId: targetUserId,
            toUserName: targetUserName,
            reason: reason || '审批转交',
          },
          connection
        );

        await connection.commit();

        res.json({
          ok: true,
          data: { message: '审批已转交' },
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    })
  );

  /**
   * GET /api/approvals/todo
   * 获取待办列表
   */
  router.get(
    '/todo',
    asyncHandler(async (req, res) => {
      const { page = 1, limit = 20, businessType, priority } = req.query;
      const userId = req.user.id;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // 使用视图查询待办
      let whereConditions = ['approver_id = ?'];
      const queryParams = [userId];

      if (businessType) {
        whereConditions.push('business_type = ?');
        queryParams.push(businessType);
      }

      if (priority) {
        whereConditions.push('priority = ?');
        queryParams.push(priority);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // 查询总数
      const [countResult] = await pool.query(
        `SELECT COUNT(DISTINCT instance_id) as total 
         FROM v_my_pending_approvals 
         ${whereClause}`,
        queryParams
      );

      const total = countResult[0].total;

      // 查询列表
      const [rows] = await pool.query(
        `SELECT DISTINCT
           instance_id, instance_number, title, business_type, business_number,
           applicant_id, applicant_name, started_at, priority,
           node_id, node_name, timeout_at, is_timeout, pending_hours
         FROM v_my_pending_approvals
         ${whereClause}
         ORDER BY priority DESC, started_at DESC
         LIMIT ? OFFSET ?`,
        [...queryParams, parseInt(limit), offset]
      );

      res.json({
        ok: true,
        data: {
          items: rows,
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    })
  );

  /**
   * GET /api/approvals/done
   * 获取已办列表
   */
  router.get(
    '/done',
    asyncHandler(async (req, res) => {
      const { page = 1, limit = 20, businessType, status } = req.query;
      const userId = req.user.id;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      let whereConditions = [`ar.approver_id = ?`, `ar.action IN ('approve', 'reject')`];
      const queryParams = [userId];

      if (businessType) {
        whereConditions.push('ai.business_type = ?');
        queryParams.push(businessType);
      }

      if (status) {
        whereConditions.push('ai.status = ?');
        queryParams.push(status);
      }

      const whereClause = whereConditions.join(' AND ');

      // 查询总数
      const [countResult] = await pool.query(
        `SELECT COUNT(DISTINCT ai.id) as total
         FROM approval_instances ai
         JOIN approval_records ar ON ai.id = ar.instance_id
         WHERE ${whereClause}`,
        queryParams
      );

      const total = countResult[0].total;

      // 查询列表
      const [rows] = await pool.query(
        `SELECT DISTINCT
           ai.id, ai.instance_number, ai.title, ai.business_type, ai.business_number,
           ai.applicant_name, ai.started_at, ai.finished_at, ai.status,
           ar.action, ar.comment, ar.created_at as approval_time
         FROM approval_instances ai
         JOIN approval_records ar ON ai.id = ar.instance_id
         WHERE ${whereClause}
         ORDER BY ar.created_at DESC
         LIMIT ? OFFSET ?`,
        [...queryParams, parseInt(limit), offset]
      );

      res.json({
        ok: true,
        data: {
          items: rows,
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    })
  );

  /**
   * GET /api/approvals/initiated
   * 获取我发起的审批
   */
  router.get(
    '/initiated',
    asyncHandler(async (req, res) => {
      const { page = 1, limit = 20, status, businessType } = req.query;
      const userId = req.user.id;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      let whereConditions = ['applicant_id = ?', 'is_deleted = 0'];
      const queryParams = [userId];

      if (status) {
        whereConditions.push('status = ?');
        queryParams.push(status);
      }

      if (businessType) {
        whereConditions.push('business_type = ?');
        queryParams.push(businessType);
      }

      const whereClause = whereConditions.join(' AND ');

      // 查询总数
      const [countResult] = await pool.query(
        `SELECT COUNT(*) as total FROM approval_instances WHERE ${whereClause}`,
        queryParams
      );

      const total = countResult[0].total;

      // 查询列表
      const [rows] = await pool.query(
        `SELECT 
           id, instance_number, title, business_type, business_number,
           status, priority, started_at, finished_at, current_node_key
         FROM approval_instances
         WHERE ${whereClause}
         ORDER BY started_at DESC
         LIMIT ? OFFSET ?`,
        [...queryParams, parseInt(limit), offset]
      );

      res.json({
        ok: true,
        data: {
          items: rows,
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    })
  );

  /**
   * GET /api/approvals/:id
   * 获取审批详情
   */
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      // 查询实例
      const [instances] = await pool.query(
        `SELECT * FROM approval_instances WHERE id = ? AND is_deleted = 0`,
        [id]
      );

      if (instances.length === 0) {
        return res.status(404).json({
          ok: false,
          error: '审批实例不存在',
        });
      }

      const instance = instances[0];

      // 查询节点
      const [nodes] = await pool.query(
        `SELECT * FROM approval_nodes WHERE instance_id = ? ORDER BY sequence`,
        [id]
      );

      // 查询记录
      const [records] = await pool.query(
        `SELECT * FROM approval_records WHERE instance_id = ? ORDER BY created_at`,
        [id]
      );

      res.json({
        ok: true,
        data: {
          instance,
          nodes,
          records,
        },
      });
    })
  );

  // ============================================
  // 审批委托管理
  // ============================================

  /**
   * POST /api/approvals/delegations
   * 创建委托
   */
  router.post(
    '/delegations',
    asyncHandler(async (req, res) => {
      const { delegateId, delegateName, businessTypes, startDate, endDate, reason } = req.body;

      const userId = req.user.id;
      const userName = req.user.name || req.user.username;

      const [result] = await pool.query(
        `INSERT INTO approval_delegations (
          delegator_id, delegator_name, delegate_id, delegate_name,
          business_types, start_date, end_date, reason, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          userId,
          userName,
          delegateId,
          delegateName,
          JSON.stringify(businessTypes || null),
          startDate,
          endDate,
          reason || '',
        ]
      );

      res.json({
        ok: true,
        data: {
          id: result.insertId,
          message: '委托创建成功',
        },
      });
    })
  );

  /**
   * GET /api/approvals/delegations
   * 获取我的委托列表
   */
  router.get(
    '/delegations',
    asyncHandler(async (req, res) => {
      const userId = req.user.id;

      const [rows] = await pool.query(
        `SELECT * FROM approval_delegations 
         WHERE (delegator_id = ? OR delegate_id = ?)
           AND is_active = 1
         ORDER BY created_at DESC`,
        [userId, userId]
      );

      res.json({
        ok: true,
        data: rows,
      });
    })
  );

  /**
   * DELETE /api/approvals/delegations/:id
   * 删除委托
   */
  router.delete(
    '/delegations/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const userId = req.user.id;

      await pool.query(
        `UPDATE approval_delegations SET is_active = 0 
         WHERE id = ? AND delegator_id = ?`,
        [id, userId]
      );

      res.json({
        ok: true,
        data: { message: '委托已删除' },
      });
    })
  );

  // ============================================
  // 审批模板管理
  // ============================================

  /**
   * GET /api/approvals/templates
   * 获取模板列表
   */
  router.get(
    '/templates',
    asyncHandler(async (req, res) => {
      const { businessType, isActive } = req.query;

      let whereConditions = ['is_deleted = 0'];
      const queryParams = [];

      if (businessType) {
        whereConditions.push('business_type = ?');
        queryParams.push(businessType);
      }

      if (isActive !== undefined) {
        whereConditions.push('is_active = ?');
        queryParams.push(isActive === 'true' ? 1 : 0);
      }

      const whereClause = whereConditions.join(' AND ');

      const [rows] = await pool.query(
        `SELECT * FROM approval_templates WHERE ${whereClause} ORDER BY created_at DESC`,
        queryParams
      );

      res.json({
        ok: true,
        data: rows,
      });
    })
  );

  /**
   * GET /api/approvals/templates/:id
   * 获取模板详情
   */
  router.get(
    '/templates/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const [templates] = await pool.query(
        `SELECT * FROM approval_templates WHERE id = ? AND is_deleted = 0`,
        [id]
      );

      if (templates.length === 0) {
        return res.status(404).json({
          ok: false,
          error: '模板不存在',
        });
      }

      res.json({
        ok: true,
        data: templates[0],
      });
    })
  );

  /**
   * POST /api/approvals/templates
   * 创建模板（管理员）
   */
  router.post(
    '/templates',
    asyncHandler(async (req, res) => {
      const { code, name, businessType, description, config } = req.body;

      const userId = req.user.id;

      const [result] = await pool.query(
        `INSERT INTO approval_templates (
          code, name, business_type, description, config, created_by
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [code, name, businessType, description || '', JSON.stringify(config), userId]
      );

      res.json({
        ok: true,
        data: {
          id: result.insertId,
          message: '模板创建成功',
        },
      });
    })
  );

  /**
   * PUT /api/approvals/templates/:id
   * 更新模板
   */
  router.put(
    '/templates/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { name, description, config } = req.body;

      await pool.query(
        `UPDATE approval_templates 
         SET name = ?, description = ?, config = ?, version = version + 1
         WHERE id = ?`,
        [name, description, JSON.stringify(config), id]
      );

      res.json({
        ok: true,
        data: { message: '模板更新成功' },
      });
    })
  );

  /**
   * POST /api/approvals/templates/:id/publish
   * 发布模板
   */
  router.post(
    '/templates/:id/publish',
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      await pool.query(
        `UPDATE approval_templates 
         SET is_active = 1, published_at = NOW(3)
         WHERE id = ?`,
        [id]
      );

      res.json({
        ok: true,
        data: { message: '模板已发布' },
      });
    })
  );

  // ============================================
  // 审批统计
  // ============================================

  /**
   * GET /api/approvals/statistics
   * 获取审批统计
   */
  router.get(
    '/statistics',
    asyncHandler(async (req, res) => {
      const { startDate, endDate, businessType } = req.query;

      let whereConditions = ['is_deleted = 0'];
      const queryParams = [];

      if (startDate && endDate) {
        whereConditions.push('DATE(started_at) BETWEEN ? AND ?');
        queryParams.push(startDate, endDate);
      }

      if (businessType) {
        whereConditions.push('business_type = ?');
        queryParams.push(businessType);
      }

      const whereClause = whereConditions.join(' AND ');

      // 总体统计
      const [summary] = await pool.query(
        `SELECT 
           COUNT(*) as total,
           SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
           SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
           SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
           AVG(total_duration_hours) as avg_duration
         FROM approval_instances
         WHERE ${whereClause}`,
        queryParams
      );

      // 按业务类型统计
      const [byType] = await pool.query(
        `SELECT 
           business_type,
           COUNT(*) as count,
           AVG(total_duration_hours) as avg_duration
         FROM approval_instances
         WHERE ${whereClause}
         GROUP BY business_type`,
        queryParams
      );

      // 按日期统计
      const [byDate] = await pool.query(
        `SELECT 
           DATE(started_at) as date,
           COUNT(*) as count
         FROM approval_instances
         WHERE ${whereClause}
         GROUP BY DATE(started_at)
         ORDER BY date DESC
         LIMIT 30`,
        queryParams
      );

      res.json({
        ok: true,
        data: {
          summary: summary[0],
          byType,
          byDate,
        },
      });
    })
  );

  return router;
}
