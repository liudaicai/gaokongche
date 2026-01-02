/**
 * 审批配置管理API
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  getApprovalConfig,
  updateApprovalConfig,
  getActiveApprovalRules,
  updateApprovalRule,
  checkApprovalRequired,
} from '../services/approvalRuleService.js';

export default function buildApprovalConfigRouter(pool) {
  const router = express.Router();

  /**
   * GET /api/approval-config
   * 获取审批系统配置
   */
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const connection = await pool.getConnection();
      try {
        const config = await getApprovalConfig(connection);

        res.json({
          ok: true,
          data: config,
        });
      } finally {
        connection.release();
      }
    })
  );

  /**
   * PUT /api/approval-config/:key
   * 更新审批配置
   */
  router.put(
    '/:key',
    asyncHandler(async (req, res) => {
      const { key } = req.params;
      const { value } = req.body;
      const userId = req.user.id;

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        await updateApprovalConfig(key, value, userId, connection);

        await connection.commit();

        res.json({
          ok: true,
          data: { message: '配置更新成功' },
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
   * GET /api/approval-config/rules
   * 获取所有审批规则
   */
  router.get(
    '/rules',
    asyncHandler(async (req, res) => {
      const connection = await pool.getConnection();
      try {
        const [rules] = await connection.query(
          `SELECT * FROM approval_business_rules
           WHERE is_deleted = FALSE
           ORDER BY business_type, priority DESC`
        );

        // 解析trigger_condition
        const parsedRules = rules.map(rule => ({
          ...rule,
          trigger_condition: typeof rule.trigger_condition === 'string' 
            ? JSON.parse(rule.trigger_condition)
            : rule.trigger_condition,
        }));

        res.json({
          ok: true,
          data: parsedRules,
        });
      } finally {
        connection.release();
      }
    })
  );

  /**
   * GET /api/approval-config/rules/:businessType
   * 获取指定业务类型的审批规则
   */
  router.get(
    '/rules/:businessType',
    asyncHandler(async (req, res) => {
      const { businessType } = req.params;

      const connection = await pool.getConnection();
      try {
        const [rules] = await connection.query(
          `SELECT * FROM approval_business_rules
           WHERE business_type = ? AND is_deleted = FALSE
           ORDER BY priority DESC`,
          [businessType]
        );

        res.json({
          ok: true,
          data: rules.map(rule => ({
            ...rule,
            trigger_condition: typeof rule.trigger_condition === 'string'
              ? JSON.parse(rule.trigger_condition)
              : rule.trigger_condition,
          })),
        });
      } finally {
        connection.release();
      }
    })
  );

  /**
   * PUT /api/approval-config/rules/:id
   * 更新审批规则
   */
  router.put(
    '/rules/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const ruleData = { id: parseInt(id), ...req.body };

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        await updateApprovalRule(ruleData, connection);

        await connection.commit();

        res.json({
          ok: true,
          data: { message: '规则更新成功' },
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
   * POST /api/approval-config/check
   * 检查是否需要审批（测试接口）
   */
  router.post(
    '/check',
    asyncHandler(async (req, res) => {
      const { businessType, businessData } = req.body;

      const connection = await pool.getConnection();
      try {
        const result = await checkApprovalRequired({
          businessType,
          businessData,
          connection,
        });

        res.json({
          ok: true,
          data: result,
        });
      } finally {
        connection.release();
      }
    })
  );

  /**
   * POST /api/approval-config/toggle
   * 快速开关审批系统
   */
  router.post(
    '/toggle',
    asyncHandler(async (req, res) => {
      const { enabled } = req.body;
      const userId = req.user.id;

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        await updateApprovalConfig(
          'approval_system_enabled',
          enabled,
          userId,
          connection
        );

        await connection.commit();

        res.json({
          ok: true,
          data: {
            message: enabled ? '审批系统已开启' : '审批系统已关闭',
            enabled,
          },
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
   * GET /api/approval-config/users
   * 获取可选审批人列表
   */
  router.get(
    '/users',
    asyncHandler(async (req, res) => {
      const connection = await pool.getConnection();
      try {
        const [users] = await connection.query(
          `SELECT 
             id, 
             username, 
             COALESCE(NULLIF(name, ''), username) as name,
             role, 
             company_id
           FROM users
           ORDER BY name`
        );

        res.json({
          ok: true,
          data: users,
        });
      } finally {
        connection.release();
      }
    })
  );

  /**
   * GET /api/approval-config/stores
   * 获取门店/部门列表
   */
  router.get(
    '/stores',
    asyncHandler(async (req, res) => {
      const connection = await pool.getConnection();
      try {
        const [stores] = await connection.query(
          `SELECT id, name, address
           FROM stores
           WHERE is_deleted = 0
           ORDER BY name`
        );

        res.json({
          ok: true,
          data: stores,
        });
      } finally {
        connection.release();
      }
    })
  );

  return router;
}
