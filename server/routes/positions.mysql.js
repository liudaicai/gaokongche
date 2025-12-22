/**
 * 职务管理API
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';

export default function buildPositionsRouter(pool) {
  const router = express.Router();

  /**
   * GET /api/positions
   * 获取职务列表
   */
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { category, department_id, can_approve, is_active } = req.query;

      let sql = `
        SELECT 
          p.id,
          p.name,
          p.code,
          p.level,
          p.category,
          p.department_id,
          p.can_approve,
          p.approval_level,
          p.description,
          p.responsibilities,
          p.sort_order,
          p.is_active,
          p.created_at,
          p.updated_at,
          (SELECT COUNT(*) FROM users WHERE position_id = p.id AND is_deleted = 0) as employee_count
        FROM positions p
        WHERE p.is_deleted = 0
      `;

      const params = [];

      if (category) {
        sql += ' AND p.category = ?';
        params.push(category);
      }

      if (department_id !== undefined) {
        if (department_id === 'null' || department_id === '') {
          sql += ' AND p.department_id IS NULL';
        } else {
          sql += ' AND p.department_id = ?';
          params.push(department_id);
        }
      }

      if (can_approve !== undefined) {
        sql += ' AND p.can_approve = ?';
        params.push(can_approve === 'true' ? 1 : 0);
      }

      if (is_active !== undefined) {
        sql += ' AND p.is_active = ?';
        params.push(is_active === 'true' ? 1 : 0);
      }

      sql += ' ORDER BY p.level DESC, p.sort_order, p.id';

      const connection = await pool.getConnection();
      try {
        const [positions] = await connection.query(sql, params);

        res.json({
          ok: true,
          data: positions,
          total: positions.length,
        });
      } finally {
        connection.release();
      }
    })
  );

  /**
   * GET /api/positions/:id
   * 获取职务详情
   */
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const connection = await pool.getConnection();
      try {
        const [positions] = await connection.query(
          `SELECT 
            p.*,
            d.name as department_name,
            (SELECT COUNT(*) FROM users WHERE position_id = p.id AND is_deleted = 0) as employee_count
           FROM positions p
           LEFT JOIN departments d ON p.department_id = d.id
           WHERE p.id = ? AND p.is_deleted = 0`,
          [id]
        );

        if (positions.length === 0) {
          return res.status(404).json({
            ok: false,
            error: '职务不存在',
          });
        }

        // 获取该职务的员工
        const [employees] = await connection.query(
          `SELECT 
            u.id, u.username, u.name, u.email, u.phone, u.role,
            u.department_id, d.name as department_name
           FROM users u
           LEFT JOIN departments d ON u.department_id = d.id
           WHERE u.position_id = ? AND u.is_deleted = 0
           ORDER BY u.name`,
          [id]
        );

        res.json({
          ok: true,
          data: {
            ...positions[0],
            employees,
          },
        });
      } finally {
        connection.release();
      }
    })
  );

  /**
   * POST /api/positions
   * 创建职务
   */
  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const {
        name,
        code,
        level,
        category,
        department_id,
        can_approve,
        approval_level,
        description,
        responsibilities,
        sort_order,
      } = req.body;

      const userId = req.user.id;

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        const [result] = await connection.query(
          `INSERT INTO positions (
            name, code, level, category, department_id,
            can_approve, approval_level, description, responsibilities,
            sort_order, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))`,
          [
            name,
            code || null,
            level || 0,
            category || 'staff',
            department_id || null,
            can_approve || false,
            approval_level || 0,
            description || null,
            responsibilities || null,
            sort_order || 0,
            userId,
          ]
        );

        await connection.commit();

        res.json({
          ok: true,
          data: {
            id: result.insertId,
            message: '职务创建成功',
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
   * PUT /api/positions/:id
   * 更新职务
   */
  router.put(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const {
        name,
        code,
        level,
        category,
        department_id,
        can_approve,
        approval_level,
        description,
        responsibilities,
        sort_order,
        is_active,
      } = req.body;

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        await connection.query(
          `UPDATE positions SET
            name = ?,
            code = ?,
            level = ?,
            category = ?,
            department_id = ?,
            can_approve = ?,
            approval_level = ?,
            description = ?,
            responsibilities = ?,
            sort_order = ?,
            is_active = ?,
            updated_at = NOW(3)
           WHERE id = ? AND is_deleted = 0`,
          [
            name,
            code,
            level,
            category,
            department_id || null,
            can_approve,
            approval_level,
            description,
            responsibilities,
            sort_order,
            is_active,
            id,
          ]
        );

        await connection.commit();

        res.json({
          ok: true,
          data: { message: '职务更新成功' },
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
   * DELETE /api/positions/:id
   * 删除职务（软删除）
   */
  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // 检查是否有员工
        const [employees] = await connection.query(
          `SELECT COUNT(*) as count FROM users WHERE position_id = ? AND is_deleted = 0`,
          [id]
        );

        if (employees[0].count > 0) {
          return res.status(400).json({
            ok: false,
            error: '该职务下有员工，无法删除',
          });
        }

        await connection.query(
          `UPDATE positions SET is_deleted = 1, deleted_at = NOW(3) WHERE id = ?`,
          [id]
        );

        await connection.commit();

        res.json({
          ok: true,
          data: { message: '职务删除成功' },
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    })
  );

  return router;
}
