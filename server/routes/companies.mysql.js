/**
 * 公司管理 API
 * 提供公司信息的CRUD操作和公开查询
 */
import express from 'express';
import bcrypt from 'bcryptjs';
// ✅ 多租户已移除 (2025-12-21)

export default function buildCompaniesRouter(pool) {
  const router = express.Router();
  
  // 单租户模式：角色检查已禁用，所有用户平等
  const requireRole = (...roles) => (req, res, next) => next();

  // ==================== 超级管理员接口 ====================

  // 获取所有公司列表（超级管理员）
  router.get('/', requireRole('superadmin', 'super_admin'), async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 10;
      const search = req.query.search || '';
      const offset = (page - 1) * pageSize;

      let whereClause = 'WHERE 1=1';
      const params = [];

      if (search) {
        whereClause += ' AND (name LIKE ? OR code LIKE ? OR contact_person LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      const [countRows] = await pool.query(
        `SELECT COUNT(*) as total FROM companies ${whereClause}`,
        params
      );

      const [rows] = await pool.query(
        `SELECT id, code, name, contact_person, contact_phone, address, is_active, created_at, updated_at
         FROM companies ${whereClause}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );

      res.json({
        ok: true,
        data: rows.map(row => ({
          id: String(row.id),
          code: row.code,
          name: row.name,
          contactPerson: row.contact_person,
          contactPhone: row.contact_phone,
          address: row.address,
          isActive: Boolean(row.is_active),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        })),
        pagination: {
          page,
          pageSize,
          total: countRows[0].total,
          totalPages: Math.ceil(countRows[0].total / pageSize)
        }
      });
    } catch (error) {
      console.error('[Companies] List error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 创建新公司（超级管理员）
  router.post('/', requireRole('superadmin', 'super_admin'), async (req, res) => {
    try {
      const { code, name, contactPerson, contactPhone, address, adminUsername, adminPassword } = req.body;

      if (!code || !name) {
        return res.status(400).json({ ok: false, error: '公司编码和名称不能为空' });
      }

      // 创建公司时必须创建管理员
      if (!adminUsername || !adminPassword) {
        return res.status(400).json({ ok: false, error: '创建公司时必须指定管理员账号和密码' });
      }

      if (adminPassword.length < 8) {
        return res.status(400).json({ ok: false, error: '管理员密码至少8位' });
      }

      // 检查编码是否重复
      const [existing] = await pool.query('SELECT id FROM companies WHERE code = ?', [code]);
      if (existing.length > 0) {
        return res.status(409).json({ ok: false, error: '公司编码已存在' });
      }

      // 检查管理员用户名是否重复
      const [existingUser] = await pool.query('SELECT id FROM users WHERE username = ?', [adminUsername]);
      if (existingUser.length > 0) {
        return res.status(409).json({ ok: false, error: `用户名 "${adminUsername}" 已存在` });
      }

      // 创建公司
      const [result] = await pool.query(
        `INSERT INTO companies (code, name, contact_person, contact_phone, address, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [code, name, contactPerson || null, contactPhone || null, address || null]
      );

      const companyId = result.insertId;

      // 创建公司管理员
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const [adminResult] = await pool.query(
        `INSERT INTO users (username, password_hash, role, name, company_id, is_active, created_at, updated_at)
         VALUES (?, ?, 'admin', ?, ?, 1, NOW(), NOW())`,
        [adminUsername, passwordHash, `${name}管理员`, companyId]
      );
      const adminUserId = adminResult?.insertId;

      console.log(`[Companies] Created company: ${name} (ID: ${companyId})`);

      // 方案B：如果启用每租户一库，则创建并初始化该公司的租户库
      try {
        const mysql = req.app?.locals?.mysql;
        if (mysql?.tenantMode === 'database' && mysql?.ensureTenantReady) {
          await mysql.ensureTenantReady(companyId, { id: adminUserId, username: adminUsername, role: 'admin', company_id: companyId, name: `${name}管理员` });
        }
      } catch (e) {
        console.warn('[Companies] Provision tenant DB failed (non-blocking):', e?.message || e);
        // 不阻断公司创建；可后续用 /provision-db 手工触发
      }

      res.json({ ok: true, data: { id: String(companyId) } });
    } catch (error) {
      console.error('[Companies] Create error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ===== 方案B：为公司自动创建租户库并初始化表结构 =====
  // 说明：
  // - 需要设置环境变量 MYSQL_TENANT_MODE=database 才会真正执行（否则返回 skipped）
  // - 会创建数据库 `${MYSQL_TENANT_DB_PREFIX}${companyId}` 并执行 baseline + 迁移
  router.post('/:id/provision-db', requireRole('superadmin', 'super_admin'), async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      if (!Number.isFinite(companyId) || companyId <= 0) {
        return res.status(400).json({ ok: false, error: 'companyId不合法' });
      }

      const mysql = req.app?.locals?.mysql;
      if (!mysql?.ensureTenantReady) {
        return res.status(500).json({ ok: false, error: '租户数据库能力未初始化' });
      }

      const result = await mysql.ensureTenantReady(companyId);
      res.json({ ok: true, data: result });
    } catch (error) {
      console.error('[Companies] Provision tenant DB error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 获取公司详情（超级管理员）
  router.get('/:id', requireRole('superadmin', 'super_admin', 'admin'), async (req, res) => {
    try {
      const companyId = Number(req.params.id);

      // 不再检查 company_id（多租户已移除）
      // 允许查看所有公司信息

      const [rows] = await pool.query('SELECT * FROM companies WHERE id = ?', [companyId]);
      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: '公司不存在' });
      }

      const row = rows[0];
      res.json({
        ok: true,
        data: {
          id: String(row.id),
          code: row.code,
          name: row.name,
          contactPerson: row.contact_person,
          contactPhone: row.contact_phone,
          address: row.address,
          isActive: Boolean(row.is_active),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }
      });
    } catch (error) {
      console.error('[Companies] Get detail error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 更新公司（超级管理员）
  router.put('/:id', requireRole('superadmin', 'super_admin'), async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const { name, contactPerson, contactPhone, address, isActive } = req.body;

      const updateFields = [];
      const updateValues = [];

      if (name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(name);
      }
      if (contactPerson !== undefined) {
        updateFields.push('contact_person = ?');
        updateValues.push(contactPerson);
      }
      if (contactPhone !== undefined) {
        updateFields.push('contact_phone = ?');
        updateValues.push(contactPhone);
      }
      if (address !== undefined) {
        updateFields.push('address = ?');
        updateValues.push(address);
      }
      if (isActive !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(isActive ? 1 : 0);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ ok: false, error: '没有需要更新的字段' });
      }

      updateFields.push('updated_at = NOW()');
      await pool.query(
        `UPDATE companies SET ${updateFields.join(', ')} WHERE id = ?`,
        [...updateValues, companyId]
      );

      res.json({ ok: true, message: '公司信息更新成功' });
    } catch (error) {
      console.error('[Companies] Update error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 删除公司（超级管理员）
  router.delete('/:id', requireRole('superadmin', 'super_admin'), async (req, res) => {
    try {
      const companyId = Number(req.params.id);

      // 检查是否有关联用户
      const [users] = await pool.query('SELECT COUNT(*) as count FROM users WHERE company_id = ?', [companyId]);
      if (users[0].count > 0) {
        return res.status(400).json({ ok: false, error: `该公司下还有 ${users[0].count} 个用户，请先转移或删除用户` });
      }

      await pool.query('DELETE FROM companies WHERE id = ?', [companyId]);
      res.json({ ok: true, message: '公司删除成功' });
    } catch (error) {
      console.error('[Companies] Delete error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 为公司创建管理员（超级管理员）
  router.post('/:id/admin', requireRole('superadmin', 'super_admin'), async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const { username, password, name } = req.body;

      if (!username || !password) {
        return res.status(400).json({ ok: false, error: '用户名和密码不能为空' });
      }

      // 检查公司是否存在
      const [company] = await pool.query('SELECT name FROM companies WHERE id = ?', [companyId]);
      if (company.length === 0) {
        return res.status(404).json({ ok: false, error: '公司不存在' });
      }

      // 检查用户名是否重复
      const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
      if (existing.length > 0) {
        return res.status(409).json({ ok: false, error: '用户名已存在' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const [result] = await pool.query(
        `INSERT INTO users (username, password_hash, role, name, company_id, is_active, created_at, updated_at)
         VALUES (?, ?, 'admin', ?, ?, 1, NOW(), NOW())`,
        [username, passwordHash, name || `${company[0].name}管理员`, companyId]
      );

      res.json({ ok: true, data: { id: String(result.insertId) } });
    } catch (error) {
      console.error('[Companies] Create admin error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 重置公司管理员密码（超级管理员）
  router.post('/:id/reset-password', requireRole('superadmin', 'super_admin'), async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      const defaultPassword = '12345678';

      // 检查公司是否存在
      const [company] = await pool.query('SELECT name FROM companies WHERE id = ?', [companyId]);
      if (company.length === 0) {
        return res.status(404).json({ ok: false, error: '公司不存在' });
      }

      // 查找公司管理员（role = 'admin'）
      const [admins] = await pool.query(
        'SELECT id, username FROM users WHERE company_id = ? AND role = ? LIMIT 1',
        [companyId, 'admin']
      );

      if (admins.length === 0) {
        return res.status(404).json({ ok: false, error: '该公司没有管理员账号' });
      }

      const admin = admins[0];
      const passwordHash = await bcrypt.hash(defaultPassword, 10);

      // 重置密码
      await pool.query(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [passwordHash, admin.id]
      );

      console.log(`[Companies] Reset password for admin: ${admin.username} (Company: ${company[0].name})`);
      res.json({ 
        ok: true, 
        message: `已将管理员 ${admin.username} 的密码重置为: ${defaultPassword}`,
        data: { 
          username: admin.username,
          newPassword: defaultPassword
        }
      });
    } catch (error) {
      console.error('[Companies] Reset password error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 解除公司管理员登录限制（超级管理员）
  router.post('/:id/unlock', requireRole('superadmin', 'super_admin'), async (req, res) => {
    try {
      const companyId = Number(req.params.id);

      // 检查公司是否存在
      const [company] = await pool.query('SELECT name FROM companies WHERE id = ?', [companyId]);
      if (company.length === 0) {
        return res.status(404).json({ ok: false, error: '公司不存在' });
      }

      // 解锁该公司的所有管理员账号（清除锁定状态、重置失败次数）
      const [result] = await pool.query(
        `UPDATE users 
         SET is_active = 1,
             login_failed_count = 0,
             locked_until = NULL,
             updated_at = NOW()
         WHERE company_id = ? AND role = 'admin'`,
        [companyId]
      );

      console.log(`[Companies] Unlocked ${result.affectedRows} admin(s) for company: ${company[0].name}`);
      res.json({ 
        ok: true, 
        message: `已解除该公司 ${result.affectedRows} 个管理员账号的登录限制`,
        data: {
          unlockedCount: result.affectedRows
        }
      });
    } catch (error) {
      console.error('[Companies] Unlock error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 获取公司用户列表（超级管理员）
  router.get('/:id/users', requireRole('superadmin', 'super_admin', 'admin'), async (req, res) => {
    try {
      const companyId = Number(req.params.id);

      // 不再检查 company_id（多租户已移除）
      // 允许查看所有公司用户

      const [rows] = await pool.query(
        `SELECT id, username, role, name, email, phone, is_active, created_at
         FROM users WHERE company_id = ? ORDER BY created_at DESC`,
        [companyId]
      );

      res.json({
        ok: true,
        data: rows.map(row => ({
          id: String(row.id),
          username: row.username,
          role: row.role,
          name: row.name,
          email: row.email,
          phone: row.phone,
          isActive: Boolean(row.is_active),
          createdAt: row.created_at
        }))
      });
    } catch (error) {
      console.error('[Companies] Get users error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 获取公司统计信息（超级管理员和公司管理员）
  router.get('/:id/stats', requireRole('superadmin', 'super_admin', 'admin'), async (req, res) => {
    try {
      const companyId = Number(req.params.id);

      // 不再检查 company_id（多租户已移除）
      // 允许查看所有公司统计

      // 用户数
      const [userCount] = await pool.query(
        'SELECT COUNT(*) as count FROM users WHERE company_id = ?',
        [companyId]
      );

      // 客户数
      const [customerCount] = await pool.query(
        'SELECT COUNT(*) as count FROM customers WHERE company_id = ?',
        [companyId]
      );

      // 设备数
      const [equipmentCount] = await pool.query(
        'SELECT COUNT(*) as count FROM equipments WHERE company_id = ?',
        [companyId]
      );

      // 订单数
      const [orderCount] = await pool.query(
        'SELECT COUNT(*) as count FROM orders WHERE company_id = ?',
        [companyId]
      );

      res.json({
        ok: true,
        data: {
          userCount: userCount[0].count,
          customerCount: customerCount[0].count,
          equipmentCount: equipmentCount[0].count,
          orderCount: orderCount[0].count
        }
      });
    } catch (error) {
      console.error('[Companies] Get stats error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================== 公开接口（不需要认证） ====================

  // 获取公司列表（公开信息，用于市场浏览）
  router.get('/public', async (req, res) => {
    try {
      const {
        page = 1,
        pageSize = 20,
        serviceArea,
        creditRating
      } = req.query;

      const offset = (Number(page) - 1) * Number(pageSize);
      
      let whereConditions = ['status = "active"', 'is_deleted = 0', 'verification_status = "verified"'];
      const params = [];

      if (serviceArea) {
        whereConditions.push('JSON_CONTAINS(service_areas, ?)');
        params.push(JSON.stringify(serviceArea));
      }

      if (creditRating) {
        whereConditions.push('credit_rating >= ?');
        params.push(Number(creditRating));
      }

      const whereClause = whereConditions.join(' AND ');

      // 查询总数
      const [countRows] = await pool.query(
        `SELECT COUNT(*) as total FROM companies WHERE ${whereClause}`,
        params
      );

      // 查询列表（仅返回公开信息）
      const [rows] = await pool.query(`
        SELECT 
          id, code, name, short_name, logo_url,
          contact_person, contact_phone, contact_email,
          service_areas, equipment_categories,
          verification_status, credit_rating,
          total_orders_completed, completion_rate,
          allow_sublease, allow_repair,
          can_receive_orders, can_publish_demands
        FROM companies
        WHERE ${whereClause}
        ORDER BY credit_rating DESC, total_orders_completed DESC
        LIMIT ? OFFSET ?
      `, [...params, Number(pageSize), offset]);

      res.json({
        ok: true,
        data: rows.map(row => ({
          ...row,
          service_areas: row.service_areas ? JSON.parse(row.service_areas) : [],
          equipment_categories: row.equipment_categories ? JSON.parse(row.equipment_categories) : []
        })),
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total: countRows[0].total,
          totalPages: Math.ceil(countRows[0].total / Number(pageSize))
        }
      });
    } catch (error) {
      console.error('[Companies] Public list error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 获取公司详情（公开信息）
  router.get('/public/:id', async (req, res) => {
    const companyId = Number(req.params.id);

    try {
      const [rows] = await pool.query(`
        SELECT 
          id, code, name, short_name, logo_url,
          contact_person, contact_phone, contact_email,
          address, business_scope,
          service_areas, equipment_categories,
          verification_status, credit_rating,
          total_orders_completed, total_orders_cancelled,
          completion_rate,
          allow_sublease, allow_repair,
          can_receive_orders, can_publish_demands
        FROM companies
        WHERE id = ? AND status = 'active' AND is_deleted = 0
      `, [companyId]);

      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: '公司不存在' });
      }

      const company = rows[0];
      res.json({
        ok: true,
        data: {
          ...company,
          service_areas: company.service_areas ? JSON.parse(company.service_areas) : [],
          equipment_categories: company.equipment_categories ? JSON.parse(company.equipment_categories) : []
        }
      });
    } catch (error) {
      console.error('[Companies] Public detail error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 获取公司统计信息
  router.get('/public/:id/stats', async (req, res) => {
    const companyId = Number(req.params.id);

    try {
      const [company] = await pool.query(
        'SELECT credit_rating, total_orders_completed, completion_rate FROM companies WHERE id = ?',
        [companyId]
      );

      if (company.length === 0) {
        return res.status(404).json({ ok: false, error: '公司不存在' });
      }

      // 计算平均响应时间（从marketplace_orders表）
      const [responseTime] = await pool.query(`
        SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, confirmed_at)) as avg_response_hours
        FROM marketplace_orders
        WHERE provider_company_id = ? AND status IN ('confirmed', 'completed')
      `, [companyId]);

      res.json({
        ok: true,
        data: {
          totalOrdersCompleted: company[0].total_orders_completed,
          completionRate: parseFloat(company[0].completion_rate || 0),
          creditRating: parseFloat(company[0].credit_rating || 0),
          avgResponseHours: responseTime[0].avg_response_hours || null
        }
      });
    } catch (error) {
      console.error('[Companies] Stats error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================== 认证接口（需要登录） ====================

  // 获取当前公司信息（完整信息）
  router.get('/current', async (req, res) => {
    try {
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(400).json({ ok: false, error: '无法识别公司信息' });
      }

      const [rows] = await pool.query(
        'SELECT * FROM companies WHERE id = ? AND is_deleted = 0',
        [companyId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: '公司不存在' });
      }

      const company = rows[0];
      res.json({
        ok: true,
        data: {
          ...company,
          service_areas: company.service_areas ? JSON.parse(company.service_areas) : [],
          equipment_categories: company.equipment_categories ? JSON.parse(company.equipment_categories) : []
        }
      });
    } catch (error) {
      console.error('[Companies] Current company error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 更新当前公司信息
  router.put('/current', async (req, res) => {
    try {
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(400).json({ ok: false, error: '无法识别公司信息' });
      }

      const {
        name,
        shortName,
        logoUrl,
        contactPerson,
        contactPhone,
        contactEmail,
        address,
        businessScope,
        serviceAreas,
        equipmentCategories
      } = req.body;

      const updateFields = [];
      const updateValues = [];

      if (name) {
        updateFields.push('name = ?');
        updateValues.push(name);
      }
      if (shortName !== undefined) {
        updateFields.push('short_name = ?');
        updateValues.push(shortName);
      }
      if (logoUrl !== undefined) {
        updateFields.push('logo_url = ?');
        updateValues.push(logoUrl);
      }
      if (contactPerson !== undefined) {
        updateFields.push('contact_person = ?');
        updateValues.push(contactPerson);
      }
      if (contactPhone !== undefined) {
        updateFields.push('contact_phone = ?');
        updateValues.push(contactPhone);
      }
      if (contactEmail !== undefined) {
        updateFields.push('contact_email = ?');
        updateValues.push(contactEmail);
      }
      if (address !== undefined) {
        updateFields.push('address = ?');
        updateValues.push(address);
      }
      if (businessScope !== undefined) {
        updateFields.push('business_scope = ?');
        updateValues.push(businessScope);
      }
      if (serviceAreas) {
        updateFields.push('service_areas = ?');
        updateValues.push(JSON.stringify(serviceAreas));
      }
      if (equipmentCategories) {
        updateFields.push('equipment_categories = ?');
        updateValues.push(JSON.stringify(equipmentCategories));
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ ok: false, error: '没有需要更新的字段' });
      }

      await pool.query(
        `UPDATE companies SET ${updateFields.join(', ')} WHERE id = ?`,
        [...updateValues, companyId]
      );

      res.json({ ok: true, message: '公司信息更新成功' });
    } catch (error) {
      console.error('[Companies] Update error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}
