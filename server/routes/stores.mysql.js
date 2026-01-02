/**
 * 门店管理路由 (MySQL - 增强版)
 * 提供门店的完整CRUD操作、统计功能、关联查询
 */
import express from 'express';
import { tenantMiddleware } from '../middleware/tenant.js';
import { requireSuperAdmin } from '../middleware/auth.js';

export default function buildStoresRouterMySQL(pool) {
  const router = express.Router();

  // DTO转换函数
  const toDto = (row) => ({
    id: String(row.id),
    storeCode: row.store_code,
    name: row.name || '',
    address: row.address || '',
    storeType: row.store_type,
    latitude: row.latitude,
    longitude: row.longitude,
    contactPhone: row.contact_phone,
    contactPerson: row.contact_person,
    businessHours: row.business_hours,
    status: row.status,
    areaSqm: row.area_sqm,
    notes: row.notes,
    managerId: row.manager_id != null ? String(row.manager_id) : '',
    managerName: row.manager_name || '',
    managerPhone: row.manager_phone || '',
    companyId: row.company_id,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  });

  // ==================== 门店列表（增强：分页、搜索） ====================
  // GET /api/stores?page=1&pageSize=10&search=&storeType=&status=
  router.get('/', tenantMiddleware, async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 10;
      const offset = (page - 1) * pageSize;
      const search = req.query.search || '';
      const storeType = req.query.storeType || '';
      const status = req.query.status || '';
      
      // ✅ 多租户过滤
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;
      let whereClause = `WHERE ${tenantWhere}`;
      const params = [...tenantParams];
      
      // 检查stores表是否有company_id字段
      const [companyCols] = await pool.query(
        `SELECT COUNT(*) as count FROM information_schema.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stores' AND COLUMN_NAME = 'company_id'`
      );
      const hasCompanyId = companyCols[0].count > 0;
      
      // 不再检查 company_id（多租户已移除）
      // 查询所有门店数据
      
      // 搜索条件（名称、地址、编号）
      if (search) {
        whereClause += ' AND (name LIKE ? OR address LIKE ? OR store_code LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }
      
      // 类型过滤
      if (storeType) {
        whereClause += ' AND store_type = ?';
        params.push(storeType);
      }
      
      // 状态过滤
      if (status) {
        whereClause += ' AND status = ?';
        params.push(status);
      }
      
      // 查询总数
      const [countRows] = await pool.query(
        `SELECT COUNT(*) as total FROM stores ${whereClause}`,
        params
      );
      const total = countRows[0]?.total || 0;
      
      // 查询列表
      const [rows] = await pool.query(
        `SELECT 
          id, store_code, name, address, store_type,
          latitude, longitude, contact_phone, contact_person,
          business_hours, status, area_sqm, notes,
          manager_id, manager_name, manager_phone,
          ${hasCompanyId ? 'company_id,' : ''} created_at, updated_at
         FROM stores
         ${whereClause}
         ORDER BY created_at DESC
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
      console.error('[Stores] List error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================== 门店统计 ====================
  // GET /api/stores/stats
  router.get('/stats', tenantMiddleware, async (req, res) => {
    try {
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;
      const tenantFilter = { where: tenantWhere, params: tenantParams };
      
      // 总门店数
      const [totalRows] = await pool.query(
        `SELECT COUNT(*) as count FROM stores WHERE ${tenantFilter.where}`,
        tenantFilter.params
      );
      
      // 营业中门店数
      const [activeRows] = await pool.query(
        `SELECT COUNT(*) as count FROM stores WHERE ${tenantFilter.where} AND status = 'active'`,
        tenantFilter.params
      );
      
      // 按类型统计
      const [byType] = await pool.query(
        `SELECT store_type, COUNT(*) as count 
         FROM stores 
         WHERE ${tenantFilter.where}
         GROUP BY store_type`,
        tenantFilter.params
      );
      
      // 按状态统计
      const [byStatus] = await pool.query(
        `SELECT status, COUNT(*) as count 
         FROM stores 
         WHERE ${tenantFilter.where}
         GROUP BY status`,
        tenantFilter.params
      );
      
      // 检查equipments表是否有store_id字段
      const [equipmentCols] = await pool.query(
        `SELECT COUNT(*) as count FROM information_schema.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipments' AND COLUMN_NAME = 'store_id'`
      );
      const hasEquipmentStoreId = equipmentCols[0].count > 0;
      
      // 检查orders表是否有store_id字段
      const [orderCols] = await pool.query(
        `SELECT COUNT(*) as count FROM information_schema.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'store_id'`
      );
      const hasOrderStoreId = orderCols[0].count > 0;
      
      // 设备统计（如果支持）
      let totalEquipments = 0;
      if (hasEquipmentStoreId) {
        const [equipmentRows] = await pool.query(
          `SELECT COUNT(*) as count FROM equipments WHERE store_id IS NOT NULL`
        );
        totalEquipments = equipmentRows[0].count;
      }
      
      // 订单统计（如果支持）
      let totalOrders = 0;
      if (hasOrderStoreId) {
        const [orderRows] = await pool.query(
          `SELECT COUNT(*) as count FROM orders WHERE store_id IS NOT NULL`
        );
        totalOrders = orderRows[0].count;
      }
      
      res.json({
        ok: true,
        data: {
          totalCount: totalRows[0].count,
          activeCount: activeRows[0].count,
          inactiveCount: totalRows[0].count - activeRows[0].count,
          totalEquipments,
          totalOrders,
          byType: byType.map(t => ({
            storeType: t.store_type,
            count: t.count
          })),
          byStatus: byStatus.map(s => ({
            status: s.status,
            count: s.count
          })),
          note: (!hasEquipmentStoreId || !hasOrderStoreId) 
            ? '部分统计功能未启用（设备/订单未关联门店）' 
            : null
        }
      });
    } catch (error) {
      console.error('[Stores] Stats error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================== 获取门店的设备列表 ====================
  // GET /api/stores/:id/equipments
  router.get('/:id/equipments', tenantMiddleware, async (req, res) => {
    const idNum = Number(req.params.id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid store id' });
    }
    
    try {
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;
      const tenantFilter = { where: tenantWhere, params: tenantParams };
      
      // 检查门店是否存在
      const [storeRows] = await pool.query(
        `SELECT id FROM stores WHERE id = ? AND ${tenantFilter.where} LIMIT 1`,
        [idNum, ...tenantFilter.params]
      );
      
      if (!storeRows || storeRows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Store not found' });
      }
      
      // 检查equipments表是否有store_id字段
      const [equipmentCols] = await pool.query(
        `SELECT COUNT(*) as count FROM information_schema.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipments' AND COLUMN_NAME = 'store_id'`
      );
      
      if (equipmentCols[0].count === 0) {
        return res.json({
          ok: true,
          data: [],
          note: 'equipments表未支持store_id关联'
        });
      }
      
      // 查询门店设备
      const [equipments] = await pool.query(
        `SELECT id, code, custom_code, brand, type, category, height, model,
                status, purchase_date, last_maintenance_date, notes
         FROM equipments
         WHERE store_id = ?
         ORDER BY created_at DESC
         LIMIT 100`,
        [idNum]
      );
      
      res.json({
        ok: true,
        data: equipments,
        total: equipments.length
      });
    } catch (error) {
      console.error('[Stores] Get equipments error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================== 获取门店的订单列表 ====================
  // GET /api/stores/:id/orders
  router.get('/:id/orders', tenantMiddleware, async (req, res) => {
    const idNum = Number(req.params.id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid store id' });
    }
    
    try {
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;
      const tenantFilter = { where: tenantWhere, params: tenantParams };
      
      // 检查门店是否存在
      const [storeRows] = await pool.query(
        `SELECT id FROM stores WHERE id = ? AND ${tenantFilter.where} LIMIT 1`,
        [idNum, ...tenantFilter.params]
      );
      
      if (!storeRows || storeRows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Store not found' });
      }
      
      // 检查orders表是否有store_id字段
      const [orderCols] = await pool.query(
        `SELECT COUNT(*) as count FROM information_schema.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'store_id'`
      );
      
      if (orderCols[0].count === 0) {
        return res.json({
          ok: true,
          data: [],
          note: 'orders表未支持store_id关联'
        });
      }
      
      // 查询门店订单
      const [orders] = await pool.query(
        `SELECT id, contract_number, customer_id, project_name,
                start_date, end_date, status, total_amount,
                created_at, updated_at
         FROM orders
         WHERE store_id = ?
         ORDER BY created_at DESC
         LIMIT 50`,
        [idNum]
      );
      
      res.json({
        ok: true,
        data: orders,
        total: orders.length
      });
    } catch (error) {
      console.error('[Stores] Get orders error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================== 公司认证管理 ====================
  
  // 获取公司认证列表
  // GET /api/stores/company-verifications
  router.get('/company-verifications', requireSuperAdmin, async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT 
          cv.id, cv.company_name, cv.company_address, cv.credit_code,
          cv.bank_account, cv.bank_name, cv.contact_name, cv.contact_phone,
          cv.id_card_number, cv.created_at, cv.updated_at,
          u.is_active
         FROM company_verifications cv
         LEFT JOIN users u ON cv.id = u.company_id AND u.username = cv.contact_phone
         ORDER BY cv.created_at DESC`
      );
      
      const data = rows.map(row => ({
        id: String(row.id),
        companyName: row.company_name,
        companyAddress: row.company_address,
        creditCode: row.credit_code,
        bankAccount: row.bank_account,
        bankName: row.bank_name,
        contactName: row.contact_name,
        contactPhone: row.contact_phone,
        idCardNumber: row.id_card_number,
        isActive: row.is_active === 1,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
      }));
      
      res.json({ ok: true, data });
    } catch (error) {
      console.error('[Stores] Get company verifications error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 获取单个公司认证
  // GET /api/stores/company-verifications/:id
  router.get('/company-verifications/:id', requireSuperAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      
      const [rows] = await pool.query(
        `SELECT id, company_name, company_address, credit_code,
                bank_account, bank_name, contact_name, contact_phone,
                id_card_number, created_at, updated_at
         FROM company_verifications
         WHERE id = ?`,
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Company verification not found' });
      }
      
      const row = rows[0];
      const data = {
        id: String(row.id),
        companyName: row.company_name,
        companyAddress: row.company_address,
        creditCode: row.credit_code,
        bankAccount: row.bank_account,
        bankName: row.bank_name,
        contactName: row.contact_name,
        contactPhone: row.contact_phone,
        idCardNumber: row.id_card_number,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
      };
      
      res.json({ ok: true, data });
    } catch (error) {
      console.error('[Stores] Get company verification error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 创建公司认证
  // POST /api/stores/company-verifications
  router.post('/company-verifications', requireSuperAdmin, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const { 
        companyName, 
        companyAddress, 
        creditCode, 
        bankAccount, 
        bankName,
        contactName,
        contactPhone,
        idCardNumber
      } = req.body;
      
      // 验证必填字段
      if (!companyName || !creditCode) {
        return res.status(400).json({ ok: false, error: '公司名称和信用代码不能为空' });
      }
      
      if (!contactName || !contactPhone) {
        return res.status(400).json({ ok: false, error: '联系人姓名和电话不能为空' });
      }
      
      // 验证电话格式（手机号）
      if (!/^1[3-9]\d{9}$/.test(contactPhone)) {
        return res.status(400).json({ ok: false, error: '请输入有效的手机号码' });
      }
      
      // 验证身份证号格式（如果提供）
      if (idCardNumber && !/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(idCardNumber)) {
        return res.status(400).json({ ok: false, error: '请输入有效的身份证号码' });
      }
      
      // 检查信用代码是否已存在
      const [existing] = await connection.query(
        'SELECT id FROM company_verifications WHERE credit_code = ?',
        [creditCode]
      );
      
      if (existing.length > 0) {
        await connection.rollback();
        return res.status(409).json({ ok: false, error: '该信用代码已存在' });
      }
      
      // 检查电话号码是否已被使用（作为用户名）
      const [existingUser] = await connection.query(
        'SELECT id FROM users WHERE username = ?',
        [contactPhone]
      );
      
      if (existingUser.length > 0) {
        await connection.rollback();
        return res.status(409).json({ ok: false, error: '该电话号码已被注册为账号' });
      }
      
      // 1. 插入公司认证
      const [companyResult] = await connection.query(
        `INSERT INTO company_verifications 
         (company_name, company_address, credit_code, bank_account, bank_name, 
          contact_name, contact_phone, id_card_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          companyName, 
          companyAddress || null, 
          creditCode, 
          bankAccount || null, 
          bankName || null,
          contactName,
          contactPhone,
          idCardNumber || null
        ]
      );
      
      const companyId = companyResult.insertId;
      
      // 2. 自动创建管理员账号
      // 导入bcrypt来生成密码hash
      const bcrypt = await import('bcryptjs');
      const defaultPassword = '123456';
      const passwordHash = await bcrypt.default.hash(defaultPassword, 10);
      
      await connection.query(
        `INSERT INTO users 
         (username, password_hash, name, phone, role, company_id, is_active, is_locked, failed_login_attempts)
         VALUES (?, ?, ?, ?, 'admin', ?, 1, 0, 0)`,
        [contactPhone, passwordHash, contactName, contactPhone, companyId]
      );
      
      // 3. ✅ 为租户在 tenant_companies 创建默认公司主体
      await connection.query(
        `INSERT INTO tenant_companies (
          company_id, company_name, company_address, credit_code,
          bank_account, bank_name, contact_name, contact_phone,
          is_default, status, remark
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          companyId,                                       // 关联到租户ID
          companyName,                                     // 使用租户的公司名称
          companyAddress || null,                          // 使用租户的公司地址
          creditCode,                                      // 使用租户的信用代码
          bankAccount || null,                             // 使用租户的银行账号
          bankName || null,                                // 使用租户的开户行
          contactName,                                     // 使用租户的联系人
          contactPhone,                                    // 使用租户的联系电话
          1,                                               // 设为默认公司
          'active',                                        // 状态为启用
          '创建租户时自动生成的默认公司主体'                // 备注
        ]
      );
      
      await connection.commit();
      
      console.log(`[Stores] ✅ 租户创建成功 - ID: ${companyId}, 公司: ${companyName}`);
      console.log(`[Stores] ✅ 已自动创建默认公司主体和管理员账号`);
      
      res.json({ 
        ok: true, 
        data: { 
          id: String(companyId),
          adminUsername: contactPhone,
          defaultPassword: defaultPassword,
          message: '租户创建成功（已自动创建默认公司主体和管理员账号）'
        } 
      });
    } catch (error) {
      await connection.rollback();
      console.error('[Stores] Create company verification error:', error);
      res.status(500).json({ ok: false, error: error.message });
    } finally {
      connection.release();
    }
  });

  // 更新公司认证
  // PUT /api/stores/company-verifications/:id
  router.put('/company-verifications/:id', requireSuperAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { 
        companyName, 
        companyAddress, 
        creditCode, 
        bankAccount, 
        bankName,
        contactName,
        contactPhone,
        idCardNumber
      } = req.body;
      
      // 验证必填字段
      if (!companyName || !creditCode) {
        return res.status(400).json({ ok: false, error: '公司名称和信用代码不能为空' });
      }
      
      if (!contactName || !contactPhone) {
        return res.status(400).json({ ok: false, error: '联系人姓名和电话不能为空' });
      }
      
      // 验证电话格式
      if (!/^1[3-9]\d{9}$/.test(contactPhone)) {
        return res.status(400).json({ ok: false, error: '请输入有效的手机号码' });
      }
      
      // 验证身份证号格式（如果提供）
      if (idCardNumber && !/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(idCardNumber)) {
        return res.status(400).json({ ok: false, error: '请输入有效的身份证号码' });
      }
      
      // 检查公司认证是否存在
      const [existing] = await pool.query(
        'SELECT id FROM company_verifications WHERE id = ?',
        [id]
      );
      
      if (existing.length === 0) {
        return res.status(404).json({ ok: false, error: 'Company verification not found' });
      }
      
      // 检查信用代码是否被其他公司使用
      const [duplicate] = await pool.query(
        'SELECT id FROM company_verifications WHERE credit_code = ? AND id != ?',
        [creditCode, id]
      );
      
      if (duplicate.length > 0) {
        return res.status(409).json({ ok: false, error: 'Credit code already exists' });
      }
      
      // 更新公司认证
      await pool.query(
        `UPDATE company_verifications
         SET company_name = ?, company_address = ?, credit_code = ?,
             bank_account = ?, bank_name = ?,
             contact_name = ?, contact_phone = ?, id_card_number = ?
         WHERE id = ?`,
        [
          companyName, 
          companyAddress || null, 
          creditCode, 
          bankAccount || null, 
          bankName || null,
          contactName,
          contactPhone,
          idCardNumber || null,
          id
        ]
      );
      
      res.json({ ok: true });
    } catch (error) {
      console.error('[Stores] Update company verification error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 删除公司认证
  // DELETE /api/stores/company-verifications/:id
  router.delete('/company-verifications/:id', requireSuperAdmin, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const id = Number(req.params.id);
      
      // 检查租户是否存在
      const [companies] = await connection.query(
        'SELECT id FROM company_verifications WHERE id = ?',
        [id]
      );
      
      if (companies.length === 0) {
        await connection.rollback();
        return res.status(404).json({ ok: false, error: 'Company verification not found' });
      }
      
      // 检查是否有订单使用此公司认证
      const [orders] = await connection.query(
        'SELECT COUNT(*) as count FROM orders WHERE lessor_company_id = ?',
        [id]
      );
      
      if (orders[0].count > 0) {
        await connection.rollback();
        return res.status(400).json({
          ok: false,
          error: `该公司认证被 ${orders[0].count} 个订单使用，不能删除`
        });
      }
      
      // 1. 删除该租户的公司主体（tenant_companies）
      const [tenantCompanies] = await connection.query(
        'DELETE FROM tenant_companies WHERE company_id = ?',
        [id]
      );
      
      // 2. 删除该租户下的所有用户（防止孤儿账号）
      const [users] = await connection.query(
        'DELETE FROM users WHERE company_id = ?',
        [id]
      );
      
      // 3. 删除租户记录
      await connection.query(
        'DELETE FROM company_verifications WHERE id = ?',
        [id]
      );
      
      await connection.commit();
      
      console.log(`[Stores] ✅ 租户删除成功 - ID: ${id}`);
      console.log(`[Stores] ✅ 已删除 ${tenantCompanies.affectedRows} 个公司主体, ${users.affectedRows} 个用户账号`);
      
      res.json({ 
        ok: true, 
        message: `租户删除成功（已删除 ${tenantCompanies.affectedRows} 个公司主体和 ${users.affectedRows} 个用户账号）` 
      });
    } catch (error) {
      await connection.rollback();
      console.error('[Stores] Delete company verification error:', error);
      res.status(500).json({ ok: false, error: error.message });
    } finally {
      connection.release();
    }
  });

  // 重置租户管理员密码
  // PUT /api/stores/company-verifications/:id/reset-password
  router.put('/company-verifications/:id/reset-password', requireSuperAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      
      // 查询租户的联系电话（管理员账号）
      const [companies] = await pool.query(
        'SELECT contact_phone, contact_name FROM company_verifications WHERE id = ?',
        [id]
      );
      
      if (companies.length === 0) {
        return res.status(404).json({ ok: false, error: '租户不存在' });
      }
      
      const contactPhone = companies[0].contact_phone;
      const contactName = companies[0].contact_name;
      
      if (!contactPhone) {
        return res.status(400).json({ ok: false, error: '租户没有关联的管理员账号' });
      }
      
      // 查找管理员账号
      const [users] = await pool.query(
        'SELECT id FROM users WHERE username = ? AND company_id = ?',
        [contactPhone, id]
      );
      
      if (users.length === 0) {
        return res.status(404).json({ ok: false, error: '未找到管理员账号' });
      }
      
      // 重置密码为 123456
      const bcrypt = await import('bcryptjs');
      const newPassword = '123456';
      const passwordHash = await bcrypt.default.hash(newPassword, 10);
      
      await pool.query(
        'UPDATE users SET password_hash = ?, failed_login_attempts = 0, is_locked = 0 WHERE id = ?',
        [passwordHash, users[0].id]
      );
      
      res.json({ 
        ok: true, 
        data: { 
          username: contactPhone,
          newPassword: newPassword,
          message: '密码已重置为 123456'
        }
      });
    } catch (error) {
      console.error('[Stores] Reset password error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 解除登录限制（解锁账号）
  // PUT /api/stores/company-verifications/:id/unlock
  router.put('/company-verifications/:id/unlock', requireSuperAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      
      // 查询租户的联系电话（管理员账号）
      const [companies] = await pool.query(
        'SELECT contact_phone FROM company_verifications WHERE id = ?',
        [id]
      );
      
      if (companies.length === 0) {
        return res.status(404).json({ ok: false, error: '租户不存在' });
      }
      
      const contactPhone = companies[0].contact_phone;
      
      if (!contactPhone) {
        return res.status(400).json({ ok: false, error: '租户没有关联的管理员账号' });
      }
      
      // 解锁管理员账号
      const [result] = await pool.query(
        'UPDATE users SET is_locked = 0, failed_login_attempts = 0 WHERE username = ? AND company_id = ?',
        [contactPhone, id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ ok: false, error: '未找到管理员账号' });
      }
      
      res.json({ ok: true, message: '账号已解锁' });
    } catch (error) {
      console.error('[Stores] Unlock account error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 启用/停用租户
  // PUT /api/stores/company-verifications/:id/toggle-status
  router.put('/company-verifications/:id/toggle-status', requireSuperAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      
      // 查询租户的联系电话和当前状态
      const [companies] = await pool.query(
        'SELECT contact_phone FROM company_verifications WHERE id = ?',
        [id]
      );
      
      if (companies.length === 0) {
        return res.status(404).json({ ok: false, error: '租户不存在' });
      }
      
      const contactPhone = companies[0].contact_phone;
      
      if (!contactPhone) {
        return res.status(400).json({ ok: false, error: '租户没有关联的管理员账号' });
      }
      
      // 查询管理员账号当前状态
      const [users] = await pool.query(
        'SELECT id, is_active FROM users WHERE username = ? AND company_id = ?',
        [contactPhone, id]
      );
      
      if (users.length === 0) {
        return res.status(404).json({ ok: false, error: '未找到管理员账号' });
      }
      
      const currentStatus = users[0].is_active;
      const newStatus = currentStatus ? 0 : 1;
      
      // 切换状态
      await pool.query(
        'UPDATE users SET is_active = ? WHERE id = ?',
        [newStatus, users[0].id]
      );
      
      res.json({ 
        ok: true, 
        data: { 
          isActive: newStatus === 1,
          message: newStatus === 1 ? '租户已启用' : '租户已停用'
        }
      });
    } catch (error) {
      console.error('[Stores] Toggle status error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================== 获取单个门店详情 ====================
  // GET /api/stores/:id
  router.get('/:id', tenantMiddleware, async (req, res) => {
    const idNum = Number(req.params.id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid store id' });
    }
    
    try {
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;
      const tenantFilter = { where: tenantWhere, params: tenantParams };
      
      const [rows] = await pool.query(
        `SELECT * FROM stores 
         WHERE id = ? AND ${tenantFilter.where}
         LIMIT 1`,
        [idNum, ...tenantFilter.params]
      );
      
      if (!rows || rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Store not found' });
      }
      
      res.json({ ok: true, data: toDto(rows[0]) });
    } catch (error) {
      console.error('[Stores] Get error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================== 创建门店 ====================
  // POST /api/stores
  router.post('/', tenantMiddleware, async (req, res) => {
    console.log('[Stores.POST] Creating store, user:', req.user);
    try {
      const {
        storeCode,
        name,
        address,
        storeType = 'branch',
        latitude,
        longitude,
        contactPhone,
        contactPerson,
        businessHours,
        status = 'active',
        areaSqm,
        notes,
        managerId,
        managerName,
        managerPhone
      } = req.body;
      
      // 验证必填字段
      if (!name) {
        return res.status(400).json({ ok: false, error: '门店名称不能为空' });
      }
      
      // ✅ 从当前用户获取 company_id（多租户隔离）
      const companyId = req.user.company_id;
      
      // 如果有门店编号，检查是否重复
      if (storeCode) {
        const { where: tenantWhere, params: tenantParams } = req.tenantFilter;
      const tenantFilter = { where: tenantWhere, params: tenantParams };
        const [existing] = await pool.query(
          `SELECT id FROM stores WHERE store_code = ? AND ${tenantFilter.where} LIMIT 1`,
          [storeCode, ...tenantFilter.params]
        );
        
        if (existing.length > 0) {
          return res.status(409).json({ ok: false, error: '门店编号已存在' });
        }
      }
      
      // 插入数据
      const [result] = await pool.query(
        `INSERT INTO stores (
          store_code, name, address, store_type,
          latitude, longitude, contact_phone, contact_person,
          business_hours, status, area_sqm, notes,
          manager_id, manager_name, manager_phone,
          company_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          storeCode || null,
          name,
          address || null,
          storeType,
          latitude || null,
          longitude || null,
          contactPhone || null,
          contactPerson || null,
          businessHours || null,
          status,
          areaSqm || null,
          notes || null,
          managerId || null,
          managerName || null,
          managerPhone || null,
          companyId
        ]
      );
      
      console.log(`[Stores] Created store: ${name} (ID: ${result.insertId})`);
      
      res.status(201).json({
        ok: true,
        data: { id: String(result.insertId) }
      });
    } catch (error) {
      console.error('[Stores] Create error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================== 更新门店 ====================
  // PUT /api/stores/:id
  router.put('/:id', tenantMiddleware, async (req, res) => {
    console.log('[Stores.PUT] Updating store, user:', req.user);
    const idNum = Number(req.params.id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid store id' });
    }
    
    try {
      const {
        storeCode,
        name,
        address,
        storeType,
        latitude,
        longitude,
        contactPhone,
        contactPerson,
        businessHours,
        status,
        areaSqm,
        notes,
        managerId,
        managerName,
        managerPhone
      } = req.body;
      
      // 验证门店是否存在
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;
      const tenantFilter = { where: tenantWhere, params: tenantParams };
      const [existingRows] = await pool.query(
        `SELECT id FROM stores WHERE id = ? AND ${tenantFilter.where} LIMIT 1`,
        [idNum, ...tenantFilter.params]
      );
      
      if (!existingRows || existingRows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Store not found' });
      }
      
      // 如果修改了门店编号，检查是否重复
      if (storeCode) {
        const [duplicate] = await pool.query(
          `SELECT id FROM stores 
           WHERE store_code = ? AND id != ? AND ${tenantFilter.where} 
           LIMIT 1`,
          [storeCode, idNum, ...tenantFilter.params]
        );
        
        if (duplicate.length > 0) {
          return res.status(409).json({ ok: false, error: '门店编号已存在' });
        }
      }
      
      // 更新数据
      await pool.query(
        `UPDATE stores SET
          store_code = COALESCE(?, store_code),
          name = COALESCE(?, name),
          address = ?,
          store_type = COALESCE(?, store_type),
          latitude = ?,
          longitude = ?,
          contact_phone = ?,
          contact_person = ?,
          business_hours = ?,
          status = COALESCE(?, status),
          area_sqm = ?,
          notes = ?,
          manager_id = ?,
          manager_name = ?,
          manager_phone = ?,
          updated_at = NOW()
         WHERE id = ? AND ${tenantFilter.where}`,
        [
          storeCode || null,
          name || null,
          address || null,
          storeType || null,
          latitude || null,
          longitude || null,
          contactPhone || null,
          contactPerson || null,
          businessHours || null,
          status || null,
          areaSqm || null,
          notes || null,
          managerId || null,
          managerName || null,
          managerPhone || null,
          idNum,
          ...tenantFilter.params
        ]
      );
      
      console.log(`[Stores] Updated store ID: ${idNum}`);
      
      res.json({ ok: true });
    } catch (error) {
      console.error('[Stores] Update error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================== 删除门店 ====================
  // DELETE /api/stores/:id
  router.delete('/:id', tenantMiddleware, async (req, res) => {
    console.log('[Stores.DELETE] Deleting store, user:', req.user);
    const idNum = Number(req.params.id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid store id' });
    }
    
    try {
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;
      const tenantFilter = { where: tenantWhere, params: tenantParams };
      
      // 验证门店是否存在
      const [existingRows] = await pool.query(
        `SELECT id, name FROM stores WHERE id = ? AND ${tenantFilter.where} LIMIT 1`,
        [idNum, ...tenantFilter.params]
      );
      
      if (!existingRows || existingRows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Store not found' });
      }
      
      // 检查是否有关联设备
      const [equipmentCols] = await pool.query(
        `SELECT COUNT(*) as count FROM information_schema.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipments' AND COLUMN_NAME = 'store_id'`
      );
      
      if (equipmentCols[0].count > 0) {
        const [equipmentRows] = await pool.query(
          `SELECT COUNT(*) as count FROM equipments WHERE store_id = ?`,
          [idNum]
        );
        
        if (equipmentRows[0].count > 0) {
          return res.status(400).json({ 
            ok: false, 
            error: `该门店还有 ${equipmentRows[0].count} 个关联设备，不能删除` 
          });
        }
      }
      
      // 删除门店
      await pool.query(
        `DELETE FROM stores WHERE id = ? AND ${tenantFilter.where}`,
        [idNum, ...tenantFilter.params]
      );
      
      console.log(`[Stores] Deleted store: ${existingRows[0].name} (ID: ${idNum})`);
      
      res.json({ ok: true });
    } catch (error) {
      console.error('[Stores] Delete error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}

