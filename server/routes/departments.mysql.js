/**
 * 部门管理API
 */

import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';

export default function buildDepartmentsRouter(pool) {
  const router = express.Router();

  /**
   * GET /api/departments
   * 获取部门列表（支持树形结构）
   */
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { type, parent_id, is_active } = req.query;

      let sql = `
        SELECT 
          d.id,
          d.name,
          d.code,
          d.parent_id,
          d.type,
          d.manager_id,
          d.manager_name,
          d.phone,
          d.email,
          d.address,
          d.sort_order,
          d.is_active,
          d.description,
          d.created_at,
          d.updated_at,
          (SELECT COUNT(*) FROM users WHERE department_id = d.id AND is_deleted = 0) as employee_count,
          (SELECT COUNT(*) FROM departments WHERE parent_id = d.id AND is_deleted = 0) as children_count
        FROM departments d
        WHERE d.is_deleted = 0
      `;

      const params = [];

      if (type) {
        sql += ' AND d.type = ?';
        params.push(type);
      }

      if (parent_id !== undefined) {
        if (parent_id === 'null' || parent_id === '') {
          sql += ' AND d.parent_id IS NULL';
        } else {
          sql += ' AND d.parent_id = ?';
          params.push(parent_id);
        }
      }

      if (is_active !== undefined) {
        sql += ' AND d.is_active = ?';
        params.push(is_active === 'true' ? 1 : 0);
      }

      sql += ' ORDER BY d.sort_order, d.id';

      const connection = await pool.getConnection();
      try {
        const [departments] = await connection.query(sql, params);

        res.json({
          ok: true,
          data: departments,
          total: departments.length,
        });
      } finally {
        connection.release();
      }
    })
  );

  /**
   * GET /api/departments/tree
   * 获取部门树形结构
   */
  router.get(
    '/tree',
    asyncHandler(async (req, res) => {
      const connection = await pool.getConnection();
      try {
        const [departments] = await connection.query(`
          SELECT 
            id, name, code, parent_id, type,
            manager_id, manager_name,
            is_active, sort_order,
            (SELECT COUNT(*) FROM users WHERE department_id = d.id AND is_deleted = 0) as employee_count
          FROM departments d
          WHERE is_deleted = 0
          ORDER BY sort_order, id
        `);

        // 构建树形结构
        const tree = buildTree(departments, null);

        res.json({
          ok: true,
          data: tree,
        });
      } finally {
        connection.release();
      }
    })
  );

  /**
   * GET /api/departments/:id
   * 获取部门详情
   */
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const connection = await pool.getConnection();
      try {
        const [departments] = await connection.query(
          `SELECT 
            d.*,
            (SELECT COUNT(*) FROM users WHERE department_id = d.id AND is_deleted = 0) as employee_count,
            (SELECT COUNT(*) FROM departments WHERE parent_id = d.id AND is_deleted = 0) as children_count
           FROM departments d
           WHERE d.id = ? AND d.is_deleted = 0`,
          [id]
        );

        if (departments.length === 0) {
          return res.status(404).json({
            ok: false,
            error: '部门不存在',
          });
        }

        // 获取部门成员
        const [employees] = await connection.query(
          `SELECT 
            u.id, u.username, u.name, u.role,
            u.position_id, p.name as position_name, p.level as position_level
           FROM users u
           LEFT JOIN positions p ON u.position_id = p.id
           WHERE u.department_id = ? AND u.is_deleted = 0
           ORDER BY p.level DESC, u.name`,
          [id]
        );

        res.json({
          ok: true,
          data: {
            ...departments[0],
            employees,
          },
        });
      } finally {
        connection.release();
      }
    })
  );

  /**
   * POST /api/departments
   * 创建部门
   */
  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const {
        name,
        code,
        parent_id,
        type,
        manager_id,
        manager_name,
        phone,
        email,
        address,
        sort_order,
        description,
      } = req.body;

      const userId = req.user.id;

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        const [result] = await connection.query(
          `INSERT INTO departments (
            name, code, parent_id, type, manager_id, manager_name,
            phone, email, address, sort_order, description,
            created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))`,
          [
            name,
            code || null,
            parent_id || null,
            type || 'department',
            manager_id || null,
            manager_name || null,
            phone || null,
            email || null,
            address || null,
            sort_order || 0,
            description || null,
            userId,
          ]
        );

        await connection.commit();

        res.json({
          ok: true,
          data: {
            id: result.insertId,
            message: '部门创建成功',
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
   * PUT /api/departments/:id
   * 更新部门
   */
  router.put(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const {
        name,
        code,
        parent_id,
        type,
        manager_id,
        manager_name,
        phone,
        email,
        address,
        sort_order,
        is_active,
        description,
      } = req.body;

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        await connection.query(
          `UPDATE departments SET
            name = ?,
            code = ?,
            parent_id = ?,
            type = ?,
            manager_id = ?,
            manager_name = ?,
            phone = ?,
            email = ?,
            address = ?,
            sort_order = ?,
            is_active = ?,
            description = ?,
            updated_at = NOW(3)
           WHERE id = ? AND is_deleted = 0`,
          [
            name,
            code,
            parent_id || null,
            type,
            manager_id || null,
            manager_name || null,
            phone,
            email,
            address,
            sort_order,
            is_active,
            description,
            id,
          ]
        );

        await connection.commit();

        res.json({
          ok: true,
          data: { message: '部门更新成功' },
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
   * DELETE /api/departments/:id
   * 删除部门（软删除）
   */
  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // 检查是否有子部门
        const [children] = await connection.query(
          `SELECT COUNT(*) as count FROM departments WHERE parent_id = ? AND is_deleted = 0`,
          [id]
        );

        if (children[0].count > 0) {
          return res.status(400).json({
            ok: false,
            error: '该部门下有子部门，无法删除',
          });
        }

        // 检查是否有员工
        const [employees] = await connection.query(
          `SELECT COUNT(*) as count FROM users WHERE department_id = ? AND is_deleted = 0`,
          [id]
        );

        if (employees[0].count > 0) {
          return res.status(400).json({
            ok: false,
            error: '该部门下有员工，无法删除',
          });
        }

        await connection.query(
          `UPDATE departments SET is_deleted = 1, deleted_at = NOW(3) WHERE id = ?`,
          [id]
        );

        await connection.commit();

        res.json({
          ok: true,
          data: { message: '部门删除成功' },
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

/**
 * 构建树形结构
 */
function buildTree(items, parentId) {
  const result = [];

  for (const item of items) {
    if (item.parent_id === parentId) {
      const children = buildTree(items, item.id);
      const node = {
        ...item,
        key: item.id,
        value: item.id,
        title: item.name,
      };

      if (children.length > 0) {
        node.children = children;
      }

      result.push(node);
    }
  }

  return result;
}
