import express from 'express';
import bcrypt from 'bcryptjs';
import { tenantMiddleware, setTenantId, buildWhereClause, sharedResourceMiddleware } from '../middleware/tenant.js';

// 角色检查中间件
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ ok: false, error: '权限不足' });
  }
  next();
};

/**
 * 密码强度验证
 * @param {string} password - 密码
 * @returns {Object} { valid: boolean, message: string }
 */
function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    return { valid: false, message: '密码长度不能少于8位' };
  }
  
  // 至少包含一个大写字母
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: '密码必须包含至少一个大写字母' };
  }
  
  // 至少包含一个小写字母
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: '密码必须包含至少一个小写字母' };
  }
  
  // 至少包含一个数字
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: '密码必须包含至少一个数字' };
  }
  
  return { valid: true, message: '' };
}

export default function buildUsersRouterMySQL(pool) {
  const router = express.Router();

  // 获取用户列表（分页、搜索）
  router.get('/', tenantMiddleware, async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 10;
      const search = req.query.search || '';

      const offset = (page - 1) * pageSize;

      // ✅ 多租户过滤
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;
      let whereConditions = [tenantWhere];
      let params = [...tenantParams];

      // 搜索条件
      if (search) {
        whereConditions.push('(u.username LIKE ? OR u.name LIKE ? OR u.email LIKE ?)');
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      const whereClause = 'WHERE u.' + whereConditions.join(' AND u.');

      // 查询用户列表
      const [rows] = await pool.query(
        `SELECT u.id, u.username, u.role, u.name, u.email, u.phone, u.company_id,
                u.is_active, u.is_locked, u.created_at, u.updated_at,
                u.department_id, u.position_id, u.superior_id,
                cv.company_name AS company_name,
                d.name AS department_name,
                p.name AS position_name,
                p.level AS position_level,
                sup.name AS superior_name
         FROM users u
         LEFT JOIN company_verifications cv ON cv.id = u.company_id
         LEFT JOIN departments d ON d.id = u.department_id
         LEFT JOIN positions p ON p.id = u.position_id
         LEFT JOIN users sup ON sup.id = u.superior_id
         ${whereClause}
         ORDER BY u.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );

      // 查询总数
      const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM users u ${whereClause}`,
        params
      );
      const total = countRows[0]?.total || 0;

      const users = rows.map(row => ({
        id: String(row.id),
        username: row.username,
        role: row.role,
        name: row.name || '',
        email: row.email || '',
        phone: row.phone || '',
        company_id: row.company_id,
        company_name: row.company_name || '',
        is_active: Boolean(row.is_active),
        is_locked: Boolean(row.is_locked),
        created_at: row.created_at,
        updated_at: row.updated_at,
        department_id: row.department_id,
        department_name: row.department_name || '',
        position_id: row.position_id,
        position_name: row.position_name || '',
        position_level: row.position_level,
        superior_id: row.superior_id,
        superior_name: row.superior_name || '',
      }));

      res.json({
        ok: true,
        data: users,
        pagination: {
          page,
          pageSize,
          total,
        },
      });
    } catch (err) {
      console.error('[Users.MySQL] List error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'List error' });
    }
  });

  // 获取单个用户详情
  router.get('/:id', tenantMiddleware, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid user id' });
    }

    try {
      // ✅ 多租户过滤
      const { where, params } = buildWhereClause(req, ['u.id = ?'], [id]);
      
      const [rows] = await pool.query(
        `SELECT u.id, u.username, u.role, u.name, u.email, u.phone, u.company_id,
                u.is_active, u.is_locked, u.created_at, u.updated_at,
                cv.company_name AS company_name
         FROM users u
         LEFT JOIN company_verifications cv ON cv.id = u.company_id
         WHERE ${where}`,
        params
      );

      if (!rows || rows.length === 0) {
        return res.status(404).json({ ok: false, error: '用户不存在或无权访问' });
      }

      const user = rows[0];
      res.json({
        ok: true,
        data: {
          id: String(user.id),
          username: user.username,
          role: user.role,
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          company_id: user.company_id,
          company_name: user.company_name || '',
          is_active: Boolean(user.is_active),
          is_locked: Boolean(user.is_locked),
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      });
    } catch (err) {
      console.error('[Users.MySQL] Get error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Get error' });
    }
  });

  // 创建用户（仅管理员）
  router.post('/', tenantMiddleware, requireRole('superadmin', 'admin', 'super_admin', 'manager'), async (req, res) => {
    try {
      const { username, password, role, name, email, phone, company_id } = req.body;

      if (!username || !password) {
        return res.status(400).json({ ok: false, error: 'Username and password are required' });
      }

      // 验证密码强度
      const passwordCheck = validatePasswordStrength(password);
      if (!passwordCheck.valid) {
        return res.status(400).json({ ok: false, error: passwordCheck.message });
      }

      // ✅ 多租户：自动设置 company_id
      // 如果是超级管理员创建用户，可以指定company_id；否则使用当前用户的company_id
      const finalCompanyId = req.user.role === 'super_admin' ? (company_id || req.tenantId) : req.tenantId;

      // 检查用户名是否已存在
      const [existing] = await pool.query(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );
      if (existing && existing.length > 0) {
        return res.status(409).json({ ok: false, error: 'Username already exists' });
      }

      // 加密密码
      const passwordHash = await bcrypt.hash(password, 10);

      // 创建用户
      const [result] = await pool.query(
        `INSERT INTO users (username, password_hash, role, name, email, phone, company_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [username, passwordHash, role || 'user', name || '', email || '', phone || '', finalCompanyId]
      );

      res.json({
        ok: true,
        data: {
          id: String(result.insertId),
        },
      });
    } catch (err) {
      console.error('[Users.MySQL] Create error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Create error' });
    }
  });

  // 更新用户（仅管理员）
  router.put('/:id', requireRole('superadmin', 'admin'), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid user id' });
    }

    try {
      const { username, password, role, name, email, phone, company_id, is_active, is_locked } = req.body;

      // 构建更新字段
      const updates = [];
      const params = [];

      if (username !== undefined) {
        updates.push('username = ?');
        params.push(username);
      }
      if (password) {
        // 验证密码强度
        const passwordCheck = validatePasswordStrength(password);
        if (!passwordCheck.valid) {
          return res.status(400).json({ ok: false, error: passwordCheck.message });
        }
        
        const passwordHash = await bcrypt.hash(password, 10);
        updates.push('password_hash = ?');
        params.push(passwordHash);
      }
      if (role !== undefined) {
        updates.push('role = ?');
        params.push(role);
      }
      if (name !== undefined) {
        updates.push('name = ?');
        params.push(name);
      }
      if (email !== undefined) {
        updates.push('email = ?');
        params.push(email);
      }
      if (phone !== undefined) {
        updates.push('phone = ?');
        params.push(phone);
      }
      if (company_id !== undefined && isSuperAdmin(req)) {
        // 只有超级管理员可以更改用户所属公司
        updates.push('company_id = ?');
        params.push(company_id);
      }
      if (is_active !== undefined) {
        updates.push('is_active = ?');
        params.push(is_active ? 1 : 0);
      }
      if (is_locked !== undefined) {
        updates.push('is_locked = ?');
        params.push(is_locked ? 1 : 0);
      }
      if (req.body.department_id !== undefined) {
        updates.push('department_id = ?');
        params.push(req.body.department_id || null);
      }
      if (req.body.position_id !== undefined) {
        updates.push('position_id = ?');
        params.push(req.body.position_id || null);
      }
      if (req.body.superior_id !== undefined) {
        updates.push('superior_id = ?');
        params.push(req.body.superior_id || null);
      }
      if (req.body.position_level !== undefined) {
        updates.push('position_level = ?');
        params.push(req.body.position_level || 0);
      }

      updates.push('updated_at = NOW()');

      if (updates.length === 1) {
        return res.json({ ok: true, message: 'No fields to update' });
      }

      // 租户过滤
      // 一户一库，不需要租户过滤
      params.push(id);
      params.push(...tenantFilter.params);

      const [result] = await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ? AND ${tenantFilter.where}`,
        params
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ ok: false, error: 'User not found or no permission' });
      }

      res.json({ ok: true });
    } catch (err) {
      console.error('[Users.MySQL] Update error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Update error' });
    }
  });

  // 删除用户（仅管理员）
  router.delete('/:id', requireRole('superadmin', 'admin'), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid user id' });
    }

    try {
      // 不能删除自己
      if (id === Number(req.user.id)) {
        return res.status(403).json({ ok: false, error: 'Cannot delete yourself' });
      }

      // 租户过滤
      // 一户一库，不需要租户过滤
      const [result] = await pool.query(
        `DELETE FROM users WHERE id = ? AND ${tenantFilter.where}`,
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ ok: false, error: 'User not found or no permission' });
      }

      res.json({ ok: true });
    } catch (err) {
      console.error('[Users.MySQL] Delete error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete error' });
    }
  });

  // 获取用户活动日志
  router.get('/:id/logs', requireRole('superadmin', 'admin'), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid user id' });
    }

    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 20;
      const offset = (page - 1) * pageSize;

      // 租户过滤
      // 一户一库，不需要租户过滤
      // 验证用户是否存在且有权限访问
      const [userRows] = await pool.query(
        `SELECT id FROM users u WHERE u.id = ? AND ${tenantFilter.where}`,
        [id]
      );

      if (!userRows || userRows.length === 0) {
        return res.status(404).json({ ok: false, error: 'User not found or no permission' });
      }

      // 查询活动日志
      const [logs] = await pool.query(
        `SELECT id, user_id, username, action, resource_type, resource_id, 
                ip_address, user_agent, status, error_message, created_at
         FROM audit_logs
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [id, pageSize, offset]
      );

      // 查询总数
      const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM audit_logs WHERE user_id = ?`,
        [id]
      );
      const total = countRows[0]?.total || 0;

      res.json({
        ok: true,
        data: logs.map(log => ({
          id: String(log.id),
          user_id: String(log.user_id),
          username: log.username,
          action: log.action,
          resource_type: log.resource_type,
          resource_id: log.resource_id ? String(log.resource_id) : null,
          ip_address: log.ip_address,
          user_agent: log.user_agent,
          status: log.status,
          error_message: log.error_message,
          created_at: log.created_at,
        })),
        pagination: {
          page,
          pageSize,
          total,
        },
      });
    } catch (err) {
      console.error('[Users.MySQL] Get logs error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Get logs error' });
    }
  });

  // 解锁用户账号（仅管理员）
  router.post('/:id/unlock', requireRole('superadmin', 'admin'), async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid user id' });
    }

    try {
      // 租户过滤
      // 一户一库，不需要租户过滤
      const [result] = await pool.query(
        `UPDATE users 
         SET is_locked = 0, failed_login_attempts = 0 
         WHERE id = ? AND ${tenantFilter.where}`,
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ ok: false, error: 'User not found or no permission' });
      }

      res.json({ ok: true, message: 'User unlocked successfully' });
    } catch (err) {
      console.error('[Users.MySQL] Unlock error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Unlock error' });
    }
  });

  // 修改当前用户密码
  router.put('/me/change-password', async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ ok: false, error: '未登录' });
      }

      if (!oldPassword || !newPassword) {
        return res.status(400).json({ ok: false, error: '旧密码和新密码不能为空' });
      }

      if (oldPassword === newPassword) {
        return res.status(400).json({ ok: false, error: '新密码不能与旧密码相同' });
      }

      // 验证新密码强度（简化版：至少8位）
      if (newPassword.length < 8) {
        return res.status(400).json({ ok: false, error: '新密码长度不能少于8位' });
      }

      // 查询当前用户的密码哈希
      const [users] = await pool.query(
        'SELECT id, username, password_hash FROM users WHERE id = ?',
        [userId]
      );

      if (!users || users.length === 0) {
        return res.status(404).json({ ok: false, error: '用户不存在' });
      }

      const user = users[0];

      // 验证旧密码
      const isValidOldPassword = await bcrypt.compare(oldPassword, user.password_hash);
      if (!isValidOldPassword) {
        return res.status(400).json({ ok: false, error: '旧密码不正确' });
      }

      // 加密新密码
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // 更新密码
      await pool.query(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [newPasswordHash, userId]
      );

      console.log(`[Users] Password changed for user: ${user.username} (ID: ${userId})`);

      res.json({ ok: true, message: '密码修改成功' });
    } catch (err) {
      console.error('[Users.MySQL] Change password error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Change password error' });
    }
  });

  return router;
}
