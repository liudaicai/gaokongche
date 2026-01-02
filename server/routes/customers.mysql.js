/**
 * 客户管理路由（增强版） - MySQL
 * 添加分页、搜索、统计等完整功能
 * 
 * ✅ 多租户支持：通过 tenantMiddleware 自动过滤 company_id
 */
import express from 'express';
import crypto from 'crypto';
import { tenantMiddleware, setTenantId, buildWhereClause } from '../middleware/tenant.js';

const toDto = (row) => ({
  id: String(row.id),
  type: row.customer_type || 'enterprise',
  name: row.name,
  phone: row.phone || '',
  contact: row.contact || '',
  address: row.address || '',
  // 新增字段
  customerType: row.customer_type,
  creditLevel: row.credit_level,
  businessManagerId: row.business_manager_id,
  businessManagerName: row.business_manager_name,
  settlementMethod: row.settlement_method,
  taxNumber: row.tax_number,
  bankAccount: row.bank_account,
  bankName: row.bank_name,
  status: row.status,
  tags: row.tags ? JSON.parse(row.tags) : [],
  notes: row.notes,
  createdAt: row.created_at?.toISOString?.() || row.created_at || new Date().toISOString(),
  updatedAt: row.updated_at?.toISOString?.() || row.updated_at || new Date().toISOString(),
});

export default function buildCustomersRouterMySQL(pool) {
  const router = express.Router();

  // ==================== 客户列表（分页、搜索、过滤） ====================
  // GET /api/customers?page=1&pageSize=10&search=&type=&status=&creditLevel=
  router.get('/', tenantMiddleware, async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 10;
      const offset = (page - 1) * pageSize;
      const search = req.query.search || '';
      const customerType = req.query.type || '';
      const status = req.query.status || '';
      const creditLevel = req.query.creditLevel || '';
      
      // ✅ 多租户过滤：使用中间件注入的条件
      const { where, params } = req.tenantFilter;
      let whereClause = `WHERE ${where}`;
      const queryParams = [...params];
      
      // 搜索条件（姓名、电话、地址、联系人）
      if (search) {
        whereClause += ' AND (name LIKE ? OR phone LIKE ? OR address LIKE ? OR contact LIKE ?)';
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }
      
      // 客户类型过滤
      if (customerType) {
        whereClause += ' AND customer_type = ?';
        queryParams.push(customerType);
      }
      
      // 状态过滤
      if (status) {
        whereClause += ' AND status = ?';
        queryParams.push(status);
      }
      
      // 信用等级过滤
      if (creditLevel) {
        whereClause += ' AND credit_level = ?';
        queryParams.push(creditLevel);
      }
      
      // 查询总数
      const [countRows] = await pool.query(
        `SELECT COUNT(*) as total FROM customers ${whereClause}`,
        queryParams
      );
      const total = countRows[0]?.total || 0;
      
      // 查询列表
      const [rows] = await pool.query(
        `SELECT 
          id, mongo_id, name, contact, phone, address,
          customer_type, credit_level, business_manager_id, business_manager_name,
          settlement_method, tax_number, bank_account, bank_name,
          status, tags, notes,
          created_at, updated_at
         FROM customers 
         ${whereClause}
         ORDER BY updated_at DESC, id DESC
         LIMIT ? OFFSET ?`,
        [...queryParams, pageSize, offset]
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
    } catch (err) {
      console.error('[Customers.MySQL] List error:', err);
      res.status(500).json({ ok: false, error: err?.message || '获取客户列表失败' });
    }
  });

  // ==================== 客户统计 ====================
  // GET /api/customers/stats
  router.get('/stats', tenantMiddleware, async (req, res) => {
    try {
      // ✅ 多租户过滤
      const { where, params } = req.tenantFilter;

      // 总客户数
      const [totalRows] = await pool.query(
        `SELECT COUNT(*) as count FROM customers WHERE ${where}`,
        params
      );
      const totalCount = totalRows[0]?.count || 0;

      // 活跃客户数
      const [activeRows] = await pool.query(
        `SELECT COUNT(*) as count FROM customers
         WHERE ${where} AND status = 'active'`,
        [...params, 'active']
      );
      const activeCount = activeRows[0]?.count || 0;

      // 按类型统计
      const [typeRows] = await pool.query(
        `SELECT customer_type, COUNT(*) as count
         FROM customers
         WHERE ${where}
         GROUP BY customer_type`,
        params
      );

      // 按信用等级统计
      const [creditRows] = await pool.query(
        `SELECT credit_level, COUNT(*) as count
         FROM customers
         WHERE ${where}
         GROUP BY credit_level`,
        params
      );

      // 按状态统计
      const [statusRows] = await pool.query(
        `SELECT status, COUNT(*) as count
         FROM customers
         WHERE ${where}
         GROUP BY status`,
        params
      );
      
      res.json({
        ok: true,
        data: {
          totalCount,
          activeCount,
          byType: typeRows,
          byCreditLevel: creditRows,
          byStatus: statusRows
        }
      });
    } catch (err) {
      console.error('[Customers.MySQL] Stats error:', err);
      res.status(500).json({ ok: false, error: err?.message || '获取客户统计失败' });
    }
  });

  // ==================== 新增客户（增强版） ====================
  router.post('/', tenantMiddleware, async (req, res) => {
    const b = req.body || {};
    console.log('[Customers.MySQL] Creating customer with data:', b);
    
    const name = String(b.name || '').trim();
    const phone = (b.phone !== undefined ? String(b.phone) : '').trim();
    const address = (b.address !== undefined ? String(b.address) : '').trim();
    const contact = (b.contact !== undefined ? String(b.contact) : '').trim();
    
    if (!name) {
      return res.status(400).json({ ok: false, error: '客户名称不能为空' });
    }
    
    // ✅ 自动设置 company_id（通过中间件）
    const companyId = req.tenantId;
    
    try {
      const mongoId = crypto.randomBytes(12).toString('hex');
      const [r] = await pool.query(
        `INSERT INTO customers (
          mongo_id, name, contact, phone, address, company_id,
          customer_type, credit_level, business_manager_id, business_manager_name,
          settlement_method, tax_number, bank_account, bank_name,
          status, tags, notes,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          mongoId, name, contact || '', phone || null, address || null, companyId,
          b.type || b.customerType || 'enterprise',
          b.creditLevel || 'normal',
          b.businessManagerId || null,
          b.businessManagerName || null,
          b.settlementMethod || 'monthly',
          b.taxNumber || null,
          b.bankAccount || null,
          b.bankName || null,
          b.status || 'active',
          b.tags ? JSON.stringify(b.tags) : null,
          b.notes || null
        ]
      );
      const insertId = Number(r?.insertId || 0);
      if (!insertId) {
        return res.status(500).json({ ok: false, error: '创建客户失败' });
      }
      console.log('[Customers.MySQL] Customer created with ID:', insertId);
      return res.json({ ok: true, id: insertId });
    } catch (err) {
      console.error('[Customers.MySQL] Create error:', err);
      res.status(500).json({ ok: false, error: err?.message || '创建客户失败' });
    }
  });

  // ==================== 获取单个客户详情（增强版） ====================
  router.get('/:id', tenantMiddleware, async (req, res) => {
    const idNum = Number(req.params.id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return res.status(400).json({ ok: false, error: '客户ID无效' });
    }
    try {
      // ✅ 多租户过滤：确保只能访问本公司的客户
      const { where, params } = buildWhereClause(req, ['id = ?'], [idNum]);
      
      const [rows] = await pool.query(`SELECT 
        id, mongo_id, name, contact, phone, address,
        customer_type, credit_level, business_manager_id, business_manager_name,
        settlement_method, tax_number, bank_account, bank_name,
        status, tags, notes,
        created_at, updated_at
      FROM customers WHERE ${where} LIMIT 1`, params);
      
      const row = (rows || [])[0];
      if (!row) return res.status(404).json({ ok: false, error: '客户不存在或无权访问' });
      return res.json({ ok: true, data: toDto(row) });
    } catch (err) {
      console.error('[Customers.MySQL] Get detail error:', err);
      res.status(500).json({ ok: false, error: err?.message || '获取客户详情失败' });
    }
  });

  // ==================== 更新客户（增强版） ====================
  router.put('/:id', tenantMiddleware, async (req, res) => {
    const idNum = Number(req.params.id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return res.status(400).json({ ok: false, error: '客户ID无效' });
    }
    
    const b = req.body || {};
    console.log('[Customers.MySQL] Updating customer', idNum, 'with data:', b);
    
    try {
      // ✅ 多租户过滤：确保只能更新本公司的客户
      const { where, params: filterParams } = buildWhereClause(req, ['id = ?'], [idNum]);
      
      const name = String(b.name || '').trim();
      const phone = (b.phone !== undefined ? String(b.phone) : '').trim();
      const address = (b.address !== undefined ? String(b.address) : '').trim();
      const contact = (b.contact !== undefined ? String(b.contact) : '').trim();
      
      if (!name) {
        return res.status(400).json({ ok: false, error: '客户名称不能为空' });
      }
      
      const [r] = await pool.query(
        `UPDATE customers SET 
          name = ?, phone = ?, contact = ?, address = ?,
          customer_type = ?, credit_level = ?,
          business_manager_id = ?, business_manager_name = ?,
          settlement_method = ?, tax_number = ?,
          bank_account = ?, bank_name = ?,
          status = ?, tags = ?, notes = ?,
          updated_at = NOW() 
        WHERE ${where}`,
        [
          name, phone || null, contact, address || null,
          b.type || b.customerType || 'enterprise',
          b.creditLevel || 'normal',
          b.businessManagerId || null,
          b.businessManagerName || null,
          b.settlementMethod || 'monthly',
          b.taxNumber || null,
          b.bankAccount || null,
          b.bankName || null,
          b.status || 'active',
          b.tags ? JSON.stringify(b.tags) : null,
          b.notes || null,
          ...filterParams
        ]
      );
      if (Number(r?.affectedRows || 0) === 0) {
        return res.status(404).json({ ok: false, error: '客户不存在或无权访问' });
      }
      console.log('[Customers.MySQL] Customer updated with ID:', idNum);
      return res.json({ ok: true });
    } catch (err) {
      console.error('[Customers.MySQL] Update error:', err);
      res.status(500).json({ ok: false, error: err?.message || '更新客户失败' });
    }
  });

  // ==================== 删除客户 ====================
  router.delete('/:id', tenantMiddleware, async (req, res) => {
    const idNum = Number(req.params.id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return res.status(400).json({ ok: false, error: '客户ID无效' });
    }
    try {
      // ✅ 多租户过滤：确保只能删除本公司的客户
      const { where, params: filterParams } = buildWhereClause(req, ['id = ?'], [idNum]);
      
      // 引用检查：如存在订单引用该客户，阻止删除并返回冲突
      // ✅ 多租户：只检查当前公司的订单
      try {
        const { where: orderTenantWhere, params: orderTenantParams } = req.tenantFilter;
        const [cntRows] = await pool.query(
          `SELECT COUNT(*) AS cnt FROM orders
           WHERE (customer_id = ? OR lessor_id = ?) AND ${orderTenantWhere}`,
          [idNum, idNum, ...orderTenantParams]
        );
        const refCount = Number((cntRows || [{}])[0]?.cnt || 0);
        if (refCount > 0) {
          console.log(`[Customers.MySQL] Cannot delete customer ${idNum} - has ${refCount} related orders`);
          return res.status(409).json({
            ok: false,
            error: `无法删除该客户，因为存在 ${refCount} 个关联订单。请先删除或修改相关订单后再试。`,
            code: 'CUSTOMER_HAS_RELATED_ORDERS',
            relatedOrderCount: refCount
          });
        }
      } catch (_) {
        // 容错：引用检查失败时不阻止删除，交由数据库约束控制
      }

      const [r] = await pool.query(
        `DELETE FROM customers WHERE ${where}`, 
        filterParams
      );
      if (Number(r?.affectedRows || 0) === 0) {
        return res.status(404).json({ ok: false, error: '客户不存在或无权访问' });
      }
      return res.json({ ok: true });
    } catch (err) {
      console.error('[Customers.MySQL] Delete error:', err);
      res.status(500).json({ ok: false, error: err?.message || '删除客户失败' });
    }
  });

  return router;
}

