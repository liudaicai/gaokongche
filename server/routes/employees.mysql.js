/**
 * 员工管理路由 (MySQL)
 * 提供员工的完整CRUD操作
 * 
 * 注意：采用一户一库模式，不需要租户隔离过滤
 */
import express from 'express';
import { tenantMiddleware } from '../middleware/tenant.js';
import bcrypt from 'bcryptjs';

export default function buildEmployeesRouter(pool) {
  const router = express.Router();

  // DTO转换函数
  const toDto = (row) => ({
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : undefined,
    username: row.username || '',
    name: row.name || '',
    phone: row.phone || '',
    email: row.email || '',
    idCardNumber: row.id_card_number || '',
    position: row.position || '',
    department: row.department || '',
    level: row.level || 'staff',
    storeId: row.store_id ? String(row.store_id) : null,
    storeName: row.store_name || '',
    directLeaderId: row.direct_leader_id ? String(row.direct_leader_id) : null,
    directLeaderName: row.direct_leader_name || '',
    hireDate: row.hire_date,
    emergencyContact: row.emergency_contact || '',
    emergencyPhone: row.emergency_phone || '',
    status: row.status || 'active',
    resignDate: row.resign_date,
    notes: row.notes || '',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    // 新增字段
    department_id: row.department_id,
    department_name: row.department_name || '',
    position_id: row.position_id,
    position_name: row.position_name || '',
    position_level: row.position_level,
    superior_id: row.superior_id,
    superior_name: row.superior_name || '',
  });

  // ==================== 获取员工列表 ====================
  // GET /api/employees?page=1&pageSize=10&search=&status=
  router.get('/', tenantMiddleware, async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 10;
      const offset = (page - 1) * pageSize;
      const search = req.query.search || '';
      const status = req.query.status || '';

      // 一户一库，不需要租户过滤
      let whereClause = 'WHERE 1=1';
      const params = [];

      // 搜索条件（姓名、用户名、手机号）
      if (search) {
        whereClause += ' AND (e.name LIKE ? OR e.username LIKE ? OR e.phone LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      // 状态过滤
      if (status) {
        whereClause += ' AND e.status = ?';
        params.push(status);
      }

      // 查询总数
      const [countRows] = await pool.query(
        `SELECT COUNT(*) as total FROM employees e ${whereClause}`,
        params
      );
      const total = countRows[0]?.total || 0;

      // 查询列表（关联门店表和用户表获取门店名称和用户名）
      const [rows] = await pool.query(
        `SELECT
          e.*,
          s.name as store_name,
          u.username as username,
          u.department_id,
          u.position_id,
          u.superior_id,
          d.name as department_name,
          p.name as position_name,
          p.level as position_level,
          sup.name as superior_name
         FROM employees e
         LEFT JOIN stores s ON e.store_id = s.id
         LEFT JOIN users u ON e.user_id = u.id
         LEFT JOIN departments d ON d.id = u.department_id AND d.is_deleted = 0
         LEFT JOIN positions p ON p.id = u.position_id AND p.is_deleted = 0
         LEFT JOIN users sup ON sup.id = u.superior_id
         ${whereClause}
         ORDER BY e.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );

      res.json({
        ok: true,
        data: rows.map(toDto),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      });
    } catch (error) {
      console.error('[Employees] List error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================== 获取单个员工详情 ====================
  // GET /api/employees/:id
  router.get('/:id', tenantMiddleware, async (req, res) => {
    const idNum = Number(req.params.id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid employee id' });
    }

    try {
      const tenantFilter = getTenantFilter(req);

      // 检查是否有company_id字段
      const [companyCols] = await pool.query(
        `SELECT COUNT(*) as count FROM information_schema.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'company_id'`
      );
      const hasCompanyId = companyCols[0].count > 0;

      let whereClause = 'WHERE e.id = ?';
      const params = [idNum];

      // 不再检查 company_id（多租户已移除）
      // 允许访问所有员工数据

      const [rows] = await pool.query(
        `SELECT 
          e.*, 
          s.name as store_name,
          u.username as username
         FROM employees e
         LEFT JOIN stores s ON e.store_id = s.id
         LEFT JOIN users u ON e.user_id = u.id
         ${whereClause}
         LIMIT 1`,
        params
      );

      if (!rows || rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Employee not found' });
      }

      res.json({ ok: true, data: toDto(rows[0]) });
    } catch (error) {
      console.error('[Employees] Get error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================== 创建员工 ====================
  // POST /api/employees
  router.post('/', tenantMiddleware, async (req, res) => {
    console.log('[Employees.POST] Creating employee, user:', req.user);

    try {
      const {
        username,
        name,
        phone,
        email,
        idCardNumber,
        position,
        department,
        level = 'staff',
        storeId,
        directLeaderId,
        directLeaderName,
        password,
        hireDate,
        emergencyContact,
        emergencyPhone,
        status = 'active',
        notes,
        department_id,
        position_id,
        superior_id
      } = req.body;

      // 使用手机号作为用户名（如果没有提供 username）
      const finalUsername = username || phone;

      // 验证必填字段
      if (!name || !phone) {
        return res.status(400).json({ ok: false, error: '姓名和手机号不能为空' });
      }

      if (!password) {
        return res.status(400).json({ ok: false, error: '密码不能为空' });
      }

      // 检查用户名（手机号）是否已存在
      const [existingUsers] = await pool.query(
        'SELECT id FROM users WHERE username = ?',
        [finalUsername]
      );

      if (existingUsers.length > 0) {
        return res.status(409).json({ ok: false, error: '该手机号已被注册' });
      }

      // 生成密码哈希
      const passwordHash = await bcrypt.hash(password, 10);

      // 开始事务
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // 1. 创建用户账号（一户一库，不需要 company_id）
        const [userResult] = await conn.query(
          `INSERT INTO users (
            username, password_hash, name, phone, email,
            role, department_id, position_id, superior_id,
            is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'employee', ?, ?, ?, 1, NOW(), NOW())`,
          [
            finalUsername, 
            passwordHash, 
            name, 
            phone, 
            email || null,
            department_id || null,
            position_id || null,
            superior_id || null
          ]
        );

        const userId = userResult.insertId;

        // 2. 创建员工记录（一户一库，不需要 company_id）
        const [empResult] = await conn.query(
          `INSERT INTO employees (
            user_id, name, phone, email, id_card_number,
            position, department, level, store_id, 
            direct_leader_id, direct_leader_name,
            hire_date, emergency_contact, emergency_phone,
            status, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            userId,
            name,
            phone,
            email || null,
            idCardNumber || null,
            position || null,
            department || null,
            level,
            storeId || null,
            directLeaderId || null,
            directLeaderName || null,
            hireDate || null,
            emergencyContact || null,
            emergencyPhone || null,
            status,
            notes || null
          ]
        );

        await conn.commit();

        console.log(`[Employees] Created employee: ${name} (ID: ${empResult.insertId}, User ID: ${userId})`);

        res.status(201).json({
          ok: true,
          data: { id: String(empResult.insertId), userId: String(userId) }
        });
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('[Employees] Create error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================== 重置员工密码 ====================
  // PUT /api/employees/:id/reset-password
  // 注意：这个路由必须在 PUT /:id 之前定义，避免被通配路由拦截
  router.put('/:id/reset-password', tenantMiddleware, async (req, res) => {
    console.log('[Employees.PUT] Resetting password for employee, user:', req.user);

    const idNum = Number(req.params.id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid employee id' });
    }

    try {
      // 查询员工对应的用户ID
      const [existingRows] = await pool.query(
        'SELECT id, user_id, name FROM employees WHERE id = ? LIMIT 1',
        [idNum]
      );

      if (!existingRows || existingRows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Employee not found' });
      }

      const userId = existingRows[0].user_id;
      const employeeName = existingRows[0].name;

      // 生成默认密码的哈希值
      const defaultPassword = '88888888';
      const passwordHash = await bcrypt.hash(defaultPassword, 10);

      // 更新用户密码
      await pool.query(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [passwordHash, userId]
      );

      console.log(`[Employees] Reset password for employee: ${employeeName} (ID: ${idNum}, User ID: ${userId})`);

      res.json({ ok: true, message: '密码已重置为默认密码：88888888' });
    } catch (error) {
      console.error('[Employees] Reset password error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================== 更新员工 ====================
  // PUT /api/employees/:id
  router.put('/:id', tenantMiddleware, async (req, res) => {
    console.log('[Employees.PUT] Updating employee, user:', req.user);

    const idNum = Number(req.params.id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid employee id' });
    }

    try {
      const {
        name,
        phone,
        email,
        idCardNumber,
        position,
        department,
        level,
        storeId,
        directLeaderId,
        directLeaderName,
        hireDate,
        emergencyContact,
        emergencyPhone,
        status,
        resignDate,
        notes,
        department_id,
        position_id,
        superior_id
      } = req.body;

      // 验证员工是否存在
      const [existingRows] = await pool.query(
        'SELECT id, user_id FROM employees WHERE id = ? LIMIT 1',
        [idNum]
      );

      if (!existingRows || existingRows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Employee not found' });
      }

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // 更新员工信息
        await conn.query(
          `UPDATE employees SET
            name = COALESCE(?, name),
            phone = COALESCE(?, phone),
            email = ?,
            id_card_number = ?,
            position = ?,
            department = ?,
            level = COALESCE(?, level),
            store_id = ?,
            direct_leader_id = ?,
            direct_leader_name = ?,
            hire_date = ?,
            emergency_contact = ?,
            emergency_phone = ?,
            status = COALESCE(?, status),
            resign_date = ?,
            notes = ?,
            updated_at = NOW()
           WHERE id = ?`,
          [
            name || null,
            phone || null,
            email || null,
            idCardNumber || null,
            position || null,
            department || null,
            level || null,
            storeId || null,
            directLeaderId || null,
            directLeaderName || null,
            hireDate || null,
            emergencyContact || null,
            emergencyPhone || null,
            status || null,
            resignDate || null,
            notes || null,
            idNum
          ]
        );

        // 同步更新 users 表
        if (name || phone || email || department_id !== undefined || position_id !== undefined || superior_id !== undefined) {
          await conn.query(
            `UPDATE users SET
              name = COALESCE(?, name),
              phone = COALESCE(?, phone),
              email = COALESCE(?, email),
              department_id = ?,
              position_id = ?,
              superior_id = ?,
              updated_at = NOW()
             WHERE id = ?`,
            [
              name || null, 
              phone || null, 
              email || null,
              department_id !== undefined ? department_id : null,
              position_id !== undefined ? position_id : null,
              superior_id !== undefined ? superior_id : null,
              existingRows[0].user_id
            ]
          );
        }

        await conn.commit();

        console.log(`[Employees] Updated employee ID: ${idNum}`);

        res.json({ ok: true });
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('[Employees] Update error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================== 删除员工 ====================
  // DELETE /api/employees/:id
  router.delete('/:id', tenantMiddleware, async (req, res) => {
    console.log('[Employees.DELETE] Deleting employee, user:', req.user);

    const idNum = Number(req.params.id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid employee id' });
    }

    try {
      // 验证员工是否存在
      const [existingRows] = await pool.query(
        'SELECT id, user_id, name FROM employees WHERE id = ? LIMIT 1',
        [idNum]
      );

      if (!existingRows || existingRows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Employee not found' });
      }

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // 删除员工记录
        await conn.query('DELETE FROM employees WHERE id = ?', [idNum]);

        // 删除关联的用户账号
        await conn.query('DELETE FROM users WHERE id = ?', [existingRows[0].user_id]);

        await conn.commit();

        console.log(`[Employees] Deleted employee: ${existingRows[0].name} (ID: ${idNum})`);

        res.json({ ok: true });
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('[Employees] Delete error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}

