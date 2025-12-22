/**
 * 门店管理路由 (MySQL - 增强版)
 * 提供门店的完整CRUD操作、统计功能、关联查询
 */
import express from 'express';
// ✅ 多租户已移除 (2025-12-21)

export default function buildStoresRouterMySQL(pool) {
  const router = express.Router();
  
  // 单租户模式：简化的辅助函数
  const getTenantFilter = () => ({ where: '1=1', params: [] });

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
  router.get('/', async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 10;
      const offset = (page - 1) * pageSize;
      const search = req.query.search || '';
      const storeType = req.query.storeType || '';
      const status = req.query.status || '';
      
      // 多租户过滤 - 如果company_id为NULL则查询所有
      let whereClause = 'WHERE 1=1';
      const params = [];
      
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
  router.get('/stats', async (req, res) => {
    try {
      const tenantFilter = getTenantFilter(req);
      
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
  router.get('/:id/equipments', async (req, res) => {
    const idNum = Number(req.params.id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid store id' });
    }
    
    try {
      const tenantFilter = getTenantFilter(req);
      
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
  router.get('/:id/orders', async (req, res) => {
    const idNum = Number(req.params.id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid store id' });
    }
    
    try {
      const tenantFilter = getTenantFilter(req);
      
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
  router.get('/company-verifications', async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT id, company_name, company_address, credit_code, 
                bank_account, bank_name, created_at, updated_at
         FROM company_verifications
         ORDER BY created_at DESC`
      );
      
      const data = rows.map(row => ({
        id: String(row.id),
        companyName: row.company_name,
        companyAddress: row.company_address,
        creditCode: row.credit_code,
        bankAccount: row.bank_account,
        bankName: row.bank_name,
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
  router.get('/company-verifications/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      
      const [rows] = await pool.query(
        `SELECT id, company_name, company_address, credit_code,
                bank_account, bank_name, created_at, updated_at
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
  router.post('/company-verifications', async (req, res) => {
    try {
      const { companyName, companyAddress, creditCode, bankAccount, bankName } = req.body;
      
      // 验证必填字段
      if (!companyName || !creditCode) {
        return res.status(400).json({ ok: false, error: 'Company name and credit code are required' });
      }
      
      // 检查信用代码是否已存在
      const [existing] = await pool.query(
        'SELECT id FROM company_verifications WHERE credit_code = ?',
        [creditCode]
      );
      
      if (existing.length > 0) {
        return res.status(409).json({ ok: false, error: 'Credit code already exists' });
      }
      
      // 插入公司认证
      const [result] = await pool.query(
        `INSERT INTO company_verifications 
         (company_name, company_address, credit_code, bank_account, bank_name)
         VALUES (?, ?, ?, ?, ?)`,
        [companyName, companyAddress || null, creditCode, bankAccount || null, bankName || null]
      );
      
      res.json({ ok: true, data: { id: String(result.insertId) } });
    } catch (error) {
      console.error('[Stores] Create company verification error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 更新公司认证
  // PUT /api/stores/company-verifications/:id
  router.put('/company-verifications/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { companyName, companyAddress, creditCode, bankAccount, bankName } = req.body;
      
      // 验证必填字段
      if (!companyName || !creditCode) {
        return res.status(400).json({ ok: false, error: 'Company name and credit code are required' });
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
             bank_account = ?, bank_name = ?
         WHERE id = ?`,
        [companyName, companyAddress || null, creditCode, bankAccount || null, bankName || null, id]
      );
      
      res.json({ ok: true });
    } catch (error) {
      console.error('[Stores] Update company verification error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 删除公司认证
  // DELETE /api/stores/company-verifications/:id
  router.delete('/company-verifications/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      
      // 检查是否有订单使用此公司认证
      const [orders] = await pool.query(
        'SELECT COUNT(*) as count FROM orders WHERE lessor_company_id = ?',
        [id]
      );
      
      if (orders[0].count > 0) {
        return res.status(400).json({
          ok: false,
          error: `该公司认证被 ${orders[0].count} 个订单使用，不能删除`
        });
      }
      
      // 删除公司认证
      const [result] = await pool.query(
        'DELETE FROM company_verifications WHERE id = ?',
        [id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ ok: false, error: 'Company verification not found' });
      }
      
      res.json({ ok: true });
    } catch (error) {
      console.error('[Stores] Delete company verification error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================== 获取单个门店详情 ====================
  // GET /api/stores/:id
  router.get('/:id', async (req, res) => {
    const idNum = Number(req.params.id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid store id' });
    }
    
    try {
      const tenantFilter = getTenantFilter(req);
      
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
  // 临时移除 requireRole 检查以便调试
  router.post('/', async (req, res) => {
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
      
      // 不再检查公司ID（多租户已移除）
      const companyId = null;
      
      // 如果有门店编号，检查是否重复
      if (storeCode) {
        const tenantFilter = getTenantFilter(req);
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
  // 临时移除 requireRole 检查以便调试
  router.put('/:id', async (req, res) => {
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
      const tenantFilter = getTenantFilter(req);
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
  // 临时移除 requireRole 检查以便调试
  router.delete('/:id', async (req, res) => {
    console.log('[Stores.DELETE] Deleting store, user:', req.user);
    const idNum = Number(req.params.id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid store id' });
    }
    
    try {
      const tenantFilter = getTenantFilter(req);
      
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

