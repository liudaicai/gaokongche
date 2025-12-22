import express from 'express';

export default function buildLogisticsRouterMySQL(pool) {
  const router = express.Router();

  // 确保基础与映射表存在
  let TABLES_READY = false;
  async function ensureTables() {
    if (TABLES_READY) return;
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS logistics_vehicles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        plate_number VARCHAR(50) NOT NULL,
        spec VARCHAR(255) DEFAULT NULL,
        remark VARCHAR(255) DEFAULT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
      await pool.query(`CREATE TABLE IF NOT EXISTS logistics_drivers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        remark VARCHAR(255) DEFAULT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
      await pool.query(`CREATE TABLE IF NOT EXISTS logistics_companies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255) DEFAULT NULL,
        contact_phone VARCHAR(50) DEFAULT NULL,
        pricing_rule VARCHAR(1024) DEFAULT NULL,
        remark VARCHAR(255) DEFAULT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
      await pool.query(`CREATE TABLE IF NOT EXISTS logistics_vehicle_stores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id INT NOT NULL,
        store_id INT NOT NULL,
        created_at DATETIME(3) NOT NULL,
        INDEX idx_vehicle_store (vehicle_id, store_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
      await pool.query(`CREATE TABLE IF NOT EXISTS logistics_driver_stores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        driver_id INT NOT NULL,
        store_id INT NOT NULL,
        created_at DATETIME(3) NOT NULL,
        INDEX idx_driver_store (driver_id, store_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
      await pool.query(`CREATE TABLE IF NOT EXISTS logistics_company_stores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        store_id INT NOT NULL,
        created_at DATETIME(3) NOT NULL,
        INDEX idx_company_store (company_id, store_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
      TABLES_READY = true;
    } catch (e) {
      TABLES_READY = false;
    }
  }

  const mapVehicle = (r) => ({
    id: String(r.id),
    plateNumber: r.plate_number,
    spec: r.spec || '',
    remark: r.remark || '',
    createdAt: r.created_at?.toISOString?.() || r.created_at || new Date().toISOString(),
    updatedAt: r.updated_at?.toISOString?.() || r.updated_at || new Date().toISOString(),
  });
  const mapDriver = (r) => ({
    id: String(r.id),
    name: r.name,
    phone: r.phone,
    remark: r.remark || '',
    createdAt: r.created_at?.toISOString?.() || r.created_at || new Date().toISOString(),
    updatedAt: r.updated_at?.toISOString?.() || r.updated_at || new Date().toISOString(),
  });
  const mapCompany = (r) => ({
    id: String(r.id),
    name: r.name,
    contactPerson: r.contact_person || '',
    contactPhone: r.contact_phone || '',
    pricingRule: r.pricing_rule || '',
    remark: r.remark || '',
    createdAt: r.created_at?.toISOString?.() || r.created_at || new Date().toISOString(),
    updatedAt: r.updated_at?.toISOString?.() || r.updated_at || new Date().toISOString(),
  });

  // Vehicles
  router.get('/vehicles', async (_req, res) => {
    try {
      await ensureTables();
      const [rows] = await pool.query(
        'SELECT id, plate_number, spec, remark, created_at, updated_at FROM logistics_vehicles ORDER BY id DESC'
      );
      const vehicles = Array.isArray(rows) ? rows.map(mapVehicle) : [];
      // 关联 stores
      const [storeRows] = await pool.query(
        `SELECT vs.vehicle_id, s.id AS store_id, s.name AS store_name
         FROM logistics_vehicle_stores vs
         JOIN stores s ON s.id = vs.store_id`
      );
      const storesMap = new Map();
      for (const r of storeRows || []) {
        const vid = String(r.vehicle_id);
        const list = storesMap.get(vid) || [];
        list.push({ id: String(r.store_id), name: r.store_name || '' });
        storesMap.set(vid, list);
      }
      res.json(vehicles.map(v => ({ ...v, stores: storesMap.get(String(v.id)) || [] })));
    } catch (err) {
      console.error('[Logistics.MySQL] vehicles list error:', err?.message || err);
      res.json([]); // 返回空数组以避免前端报错
    }
  });
  router.delete('/vehicles/:id', async (req, res) => {
    try {
      const idNum = Number(req.params.id);
      if (!Number.isFinite(idNum) || idNum <= 0) return res.json({ ok: true, affectedRows: 0 });
      await ensureTables();
      const [r] = await pool.query('DELETE FROM logistics_vehicles WHERE id = ?', [idNum]);
      res.json({ ok: true, affectedRows: r.affectedRows });
    } catch (err) {
      console.error('[Logistics.MySQL] vehicles delete error:', err?.message || err);
      res.json({ ok: true, affectedRows: 0 });
    }
  });
  router.post('/vehicles', async (req, res) => {
    try {
      await ensureTables();
      const { plateNumber, spec, remark, storeIds } = req.body || {};
      if (!plateNumber) return res.status(400).json({ ok: false, error: 'plateNumber required' });
      const now = new Date();
      const [r] = await pool.query(
        `INSERT INTO logistics_vehicles (plate_number, spec, remark, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [plateNumber, spec ?? null, remark ?? null, now, now]
      );
      const idNum = Number(r.insertId);
      if (Array.isArray(storeIds) && storeIds.length) {
        for (const sid of storeIds) {
          const sidNum = Number(sid);
          if (Number.isFinite(sidNum) && sidNum > 0) {
            await pool.query(
              `INSERT INTO logistics_vehicle_stores (vehicle_id, store_id, created_at) VALUES (?, ?, ?)`,
              [idNum, sidNum, now]
            );
          }
        }
      }
      res.json({ ok: true, id: String(idNum) });
    } catch (err) {
      console.error('[Logistics.MySQL] vehicles create error:', err?.message || err);
      res.status(500).json({ ok: false, error: err?.message || 'Create error' });
    }
  });
  router.put('/vehicles/:id', async (req, res) => {
    try {
      const idNum = Number(req.params.id);
      if (!Number.isFinite(idNum) || idNum <= 0) return res.status(400).json({ ok: false, error: 'Invalid id' });
      await ensureTables();
      const { plateNumber, spec, remark, storeIds } = req.body || {};
      const now = new Date();
      const [r] = await pool.query(
        `UPDATE logistics_vehicles SET plate_number = ?, spec = ?, remark = ?, updated_at = ? WHERE id = ?`,
        [plateNumber ?? null, spec ?? null, remark ?? null, now, idNum]
      );
      if (Array.isArray(storeIds)) {
        await pool.query('DELETE FROM logistics_vehicle_stores WHERE vehicle_id = ?', [idNum]);
        for (const sid of storeIds) {
          const sidNum = Number(sid);
          if (Number.isFinite(sidNum) && sidNum > 0) {
            await pool.query(
              `INSERT INTO logistics_vehicle_stores (vehicle_id, store_id, created_at) VALUES (?, ?, ?)`,
              [idNum, sidNum, now]
            );
          }
        }
      }
      res.json({ ok: true, affectedRows: r.affectedRows });
    } catch (err) {
      console.error('[Logistics.MySQL] vehicles update error:', err?.message || err);
      res.status(500).json({ ok: false, error: err?.message || 'Update error' });
    }
  });

  // Drivers
  router.get('/drivers', async (_req, res) => {
    try {
      await ensureTables();
      const [rows] = await pool.query(
        'SELECT id, name, phone, remark, created_at, updated_at FROM logistics_drivers ORDER BY id DESC'
      );
      const drivers = Array.isArray(rows) ? rows.map(mapDriver) : [];
      const [storeRows] = await pool.query(
        `SELECT ds.driver_id, s.id AS store_id, s.name AS store_name
         FROM logistics_driver_stores ds
         JOIN stores s ON s.id = ds.store_id`
      );
      const storesMap = new Map();
      for (const r of storeRows || []) {
        const did = String(r.driver_id);
        const list = storesMap.get(did) || [];
        list.push({ id: String(r.store_id), name: r.store_name || '' });
        storesMap.set(did, list);
      }
      res.json(drivers.map(d => ({ ...d, stores: storesMap.get(String(d.id)) || [] })));
    } catch (err) {
      console.error('[Logistics.MySQL] drivers list error:', err?.message || err);
      res.json([]);
    }
  });
  router.delete('/drivers/:id', async (req, res) => {
    try {
      const idNum = Number(req.params.id);
      if (!Number.isFinite(idNum) || idNum <= 0) return res.json({ ok: true, affectedRows: 0 });
      await ensureTables();
      const [r] = await pool.query('DELETE FROM logistics_drivers WHERE id = ?', [idNum]);
      res.json({ ok: true, affectedRows: r.affectedRows });
    } catch (err) {
      console.error('[Logistics.MySQL] drivers delete error:', err?.message || err);
      res.json({ ok: true, affectedRows: 0 });
    }
  });
  router.post('/drivers', async (req, res) => {
    try {
      await ensureTables();
      const { name, phone, remark, storeIds } = req.body || {};
      if (!name || !phone) return res.status(400).json({ ok: false, error: 'name & phone required' });
      const now = new Date();
      const [r] = await pool.query(
        `INSERT INTO logistics_drivers (name, phone, remark, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [name, phone, remark ?? null, now, now]
      );
      const idNum = Number(r.insertId);
      if (Array.isArray(storeIds) && storeIds.length) {
        for (const sid of storeIds) {
          const sidNum = Number(sid);
          if (Number.isFinite(sidNum) && sidNum > 0) {
            await pool.query(
              `INSERT INTO logistics_driver_stores (driver_id, store_id, created_at) VALUES (?, ?, ?)`,
              [idNum, sidNum, now]
            );
          }
        }
      }
      res.json({ ok: true, id: String(idNum) });
    } catch (err) {
      console.error('[Logistics.MySQL] drivers create error:', err?.message || err);
      res.status(500).json({ ok: false, error: err?.message || 'Create error' });
    }
  });
  router.put('/drivers/:id', async (req, res) => {
    try {
      const idNum = Number(req.params.id);
      if (!Number.isFinite(idNum) || idNum <= 0) return res.status(400).json({ ok: false, error: 'Invalid id' });
      await ensureTables();
      const { name, phone, remark, storeIds } = req.body || {};
      const now = new Date();
      const [r] = await pool.query(
        `UPDATE logistics_drivers SET name = ?, phone = ?, remark = ?, updated_at = ? WHERE id = ?`,
        [name ?? null, phone ?? null, remark ?? null, now, idNum]
      );
      if (Array.isArray(storeIds)) {
        await pool.query('DELETE FROM logistics_driver_stores WHERE driver_id = ?', [idNum]);
        for (const sid of storeIds) {
          const sidNum = Number(sid);
          if (Number.isFinite(sidNum) && sidNum > 0) {
            await pool.query(
              `INSERT INTO logistics_driver_stores (driver_id, store_id, created_at) VALUES (?, ?, ?)`,
              [idNum, sidNum, now]
            );
          }
        }
      }
      res.json({ ok: true, affectedRows: r.affectedRows });
    } catch (err) {
      console.error('[Logistics.MySQL] drivers update error:', err?.message || err);
      res.status(500).json({ ok: false, error: err?.message || 'Update error' });
    }
  });

  // Companies
  router.get('/companies', async (_req, res) => {
    try {
      await ensureTables();
      const [rows] = await pool.query(
        'SELECT id, name, contact_person, contact_phone, pricing_rule, remark, created_at, updated_at FROM logistics_companies ORDER BY id DESC'
      );
      const companies = Array.isArray(rows) ? rows.map(mapCompany) : [];
      const [storeRows] = await pool.query(
        `SELECT cs.company_id, s.id AS store_id, s.name AS store_name
         FROM logistics_company_stores cs
         JOIN stores s ON s.id = cs.store_id`
      );
      const storesMap = new Map();
      for (const r of storeRows || []) {
        const cid = String(r.company_id);
        const list = storesMap.get(cid) || [];
        list.push({ id: String(r.store_id), name: r.store_name || '' });
        storesMap.set(cid, list);
      }
      res.json(companies.map(c => ({ ...c, stores: storesMap.get(String(c.id)) || [] })));
    } catch (err) {
      console.error('[Logistics.MySQL] companies list error:', err?.message || err);
      res.json([]);
    }
  });
  router.delete('/companies/:id', async (req, res) => {
    try {
      const idNum = Number(req.params.id);
      if (!Number.isFinite(idNum) || idNum <= 0) return res.json({ ok: true, affectedRows: 0 });
      await ensureTables();
      const [r] = await pool.query('DELETE FROM logistics_companies WHERE id = ?', [idNum]);
      res.json({ ok: true, affectedRows: r.affectedRows });
    } catch (err) {
      console.error('[Logistics.MySQL] companies delete error:', err?.message || err);
      res.json({ ok: true, affectedRows: 0 });
    }
  });
  router.post('/companies', async (req, res) => {
    try {
      await ensureTables();
      const { name, contactPerson, contactPhone, pricingRule, remark, storeIds } = req.body || {};
      if (!name) return res.status(400).json({ ok: false, error: 'name required' });
      const now = new Date();
      const [r] = await pool.query(
        `INSERT INTO logistics_companies (name, contact_person, contact_phone, pricing_rule, remark, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, contactPerson ?? null, contactPhone ?? null, pricingRule ?? null, remark ?? null, now, now]
      );
      const idNum = Number(r.insertId);
      if (Array.isArray(storeIds) && storeIds.length) {
        for (const sid of storeIds) {
          const sidNum = Number(sid);
          if (Number.isFinite(sidNum) && sidNum > 0) {
            await pool.query(
              `INSERT INTO logistics_company_stores (company_id, store_id, created_at) VALUES (?, ?, ?)`,
              [idNum, sidNum, now]
            );
          }
        }
      }
      res.json({ ok: true, id: String(idNum) });
    } catch (err) {
      console.error('[Logistics.MySQL] companies create error:', err?.message || err);
      res.status(500).json({ ok: false, error: err?.message || 'Create error' });
    }
  });
  router.put('/companies/:id', async (req, res) => {
    try {
      const idNum = Number(req.params.id);
      if (!Number.isFinite(idNum) || idNum <= 0) return res.status(400).json({ ok: false, error: 'Invalid id' });
      await ensureTables();
      const { name, contactPerson, contactPhone, pricingRule, remark, storeIds } = req.body || {};
      const now = new Date();
      const [r] = await pool.query(
        `UPDATE logistics_companies SET name = ?, contact_person = ?, contact_phone = ?, pricing_rule = ?, remark = ?, updated_at = ? WHERE id = ?`,
        [name ?? null, contactPerson ?? null, contactPhone ?? null, pricingRule ?? null, remark ?? null, now, idNum]
      );
      if (Array.isArray(storeIds)) {
        await pool.query('DELETE FROM logistics_company_stores WHERE company_id = ?', [idNum]);
        for (const sid of storeIds) {
          const sidNum = Number(sid);
          if (Number.isFinite(sidNum) && sidNum > 0) {
            await pool.query(
              `INSERT INTO logistics_company_stores (company_id, store_id, created_at) VALUES (?, ?, ?)`,
              [idNum, sidNum, now]
            );
          }
        }
      }
      res.json({ ok: true, affectedRows: r.affectedRows });
    } catch (err) {
      console.error('[Logistics.MySQL] companies update error:', err?.message || err);
      res.status(500).json({ ok: false, error: err?.message || 'Update error' });
    }
  });

  // ========================================
  // 物流台账
  // ========================================
  
  // 确保物流台账表存在
  let LEDGER_TABLE_READY = false;
  async function ensureLedgerTable() {
    if (LEDGER_TABLE_READY) return;
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS logistics_ledger (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ledger_number VARCHAR(50) NOT NULL,
        order_id INT NOT NULL,
        order_number VARCHAR(50) NOT NULL,
        entry_id INT NULL,
        exit_id INT NULL,
        logistics_type VARCHAR(20) NOT NULL,
        record_type VARCHAR(20) NOT NULL,
        store_id INT NOT NULL,
        store_name VARCHAR(255) NOT NULL,
        source_store_id INT NULL COMMENT '源门店ID（出库门店）',
        source_store_name VARCHAR(255) NULL COMMENT '源门店名称（出库门店）',
        target_store_id INT NULL COMMENT '目标门店ID（入库门店）',
        target_store_name VARCHAR(255) NULL COMMENT '目标门店名称（入库门店）',
        logistics_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        record_date DATE NOT NULL,
        vehicle_id INT NULL,
        vehicle_plate VARCHAR(50) NULL,
        driver_id INT NULL,
        driver_name VARCHAR(100) NULL,
        driver_phone VARCHAR(50) NULL,
        company_id INT NULL,
        company_name VARCHAR(255) NULL,
        company_contact_name VARCHAR(100) NULL,
        company_contact_phone VARCHAR(50) NULL,
        remark TEXT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        UNIQUE KEY uniq_ledger_number (ledger_number),
        INDEX idx_order_id (order_id),
        INDEX idx_store_id (store_id),
        INDEX idx_source_store_id (source_store_id),
        INDEX idx_target_store_id (target_store_id),
        INDEX idx_record_date (record_date),
        INDEX idx_logistics_type (logistics_type),
        INDEX idx_record_type (record_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
      
      // 确保关键字段存在（兼容旧表结构）
      const fieldsToAdd = [
        { name: 'entry_id', definition: 'INT NULL' },
        { name: 'exit_id', definition: 'INT NULL' },
        { name: 'record_type', definition: "VARCHAR(20) NOT NULL DEFAULT 'entry'" },
        { name: 'logistics_type', definition: "VARCHAR(20) NOT NULL DEFAULT '自有物流'" },
        { name: 'logistics_cost', definition: 'DECIMAL(12,2) NOT NULL DEFAULT 0.00' },
        { name: 'record_date', definition: 'DATE NULL' },
        { name: 'order_number', definition: 'VARCHAR(50) NULL' },
        { name: 'source_store_id', definition: 'INT NULL COMMENT "源门店ID（出库门店）"' },
        { name: 'source_store_name', definition: 'VARCHAR(255) NULL COMMENT "源门店名称（出库门店）"' },
        { name: 'target_store_id', definition: 'INT NULL COMMENT "目标门店ID（入库门店）"' },
        { name: 'target_store_name', definition: 'VARCHAR(255) NULL COMMENT "目标门店名称（入库门店）"' },
        { name: 'vehicle_id', definition: 'INT NULL' },
        { name: 'vehicle_plate', definition: 'VARCHAR(50) NULL' },
        { name: 'driver_id', definition: 'INT NULL' },
        { name: 'driver_name', definition: 'VARCHAR(100) NULL' },
        { name: 'driver_phone', definition: 'VARCHAR(50) NULL' },
        { name: 'company_id', definition: 'INT NULL' },
        { name: 'company_name', definition: 'VARCHAR(255) NULL' },
        { name: 'company_contact_name', definition: 'VARCHAR(100) NULL' },
        { name: 'company_contact_phone', definition: 'VARCHAR(50) NULL' }
      ];
      
      for (const field of fieldsToAdd) {
        try {
          await pool.query(`ALTER TABLE logistics_ledger ADD COLUMN ${field.name} ${field.definition}`);
        } catch (e) {
          // 字段已存在或其他错误，忽略
        }
      }
      
      // 确保 logistics_cost 字段有默认值（修复 "cannot be null" 错误）
      try {
        await pool.query(`
          ALTER TABLE logistics_ledger 
          MODIFY COLUMN logistics_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '物流费用'
        `);
        console.log('[Logistics.MySQL] ✅ logistics_cost 字段已确保有默认值');
      } catch (modifyErr) {
        console.warn('[Logistics.MySQL] ⚠️ 修改 logistics_cost 字段失败:', modifyErr.message);
      }
      
      console.log('[Logistics.MySQL] ✅ 物流台账表已就绪');
      LEDGER_TABLE_READY = true;
      
      // 迁移现有记录的门店数据
      try {
        console.log('[Logistics.MySQL] 🔄 开始迁移物流台账门店数据...');
        
        // 更新进场记录的门店信息
        const [entryResult] = await pool.query(`
          UPDATE logistics_ledger ll
          LEFT JOIN orders o ON ll.order_id = o.id
          LEFT JOIN stores s ON s.id = o.lessor_company_id
          SET 
            ll.store_id = COALESCE(o.lessor_company_id, ll.store_id, 1),
            ll.store_name = COALESCE(s.name, ll.store_name, '默认门店'),
            ll.source_store_id = COALESCE(o.lessor_company_id, ll.source_store_id),
            ll.source_store_name = COALESCE(s.name, ll.source_store_name)
          WHERE ll.record_type = 'entry'
            AND (ll.source_store_name IS NULL OR ll.source_store_name = '默认门店' OR ll.store_name = '默认门店')
        `);
        
        console.log(`[Logistics.MySQL] 进场记录更新: ${entryResult.affectedRows}条`);
        
        // 更新退场记录的门店信息
        const [exitResult] = await pool.query(`
          UPDATE logistics_ledger ll
          LEFT JOIN orders o ON ll.order_id = o.id
          LEFT JOIN stores s ON s.id = o.lessor_company_id
          SET 
            ll.store_id = COALESCE(o.lessor_company_id, ll.store_id, 1),
            ll.store_name = COALESCE(s.name, ll.store_name, '默认门店'),
            ll.target_store_id = COALESCE(o.lessor_company_id, ll.target_store_id),
            ll.target_store_name = COALESCE(s.name, ll.target_store_name)
          WHERE ll.record_type = 'exit'
            AND (ll.target_store_name IS NULL OR ll.target_store_name = '默认门店' OR ll.store_name = '默认门店')
        `);
        
        console.log(`[Logistics.MySQL] 退场记录更新: ${exitResult.affectedRows}条`);
        console.log(`[Logistics.MySQL] ✅ 门店数据迁移完成: 总计${entryResult.affectedRows + exitResult.affectedRows}条`);
      } catch (migrateErr) {
        console.error('[Logistics.MySQL] ❌ 门店数据迁移失败:', migrateErr.message);
      }
    } catch (e) {
      console.error('[Logistics.MySQL] Ensure ledger table error:', e);
    }
  }

  // GET /api/logistics/ledger/debug - 临时调试接口
  router.get('/ledger/debug', async (req, res) => {
    try {
      const [stores] = await pool.query('SELECT id, name FROM stores ORDER BY id');
      const [order] = await pool.query('SELECT id, contract_number, lessor_company_id FROM orders WHERE id = 57');
      const [ledger] = await pool.query(`
        SELECT 
          ll.*,
          o.lessor_company_id as order_store_id,
          s.name as real_store_name
        FROM logistics_ledger ll
        LEFT JOIN orders o ON ll.order_id = o.id
        LEFT JOIN stores s ON s.id = o.lessor_company_id
        WHERE ll.ledger_number = '20251128-1'
      `);
      
      res.json({
        ok: true,
        data: {
          stores,
          order: order[0],
          ledger: ledger[0]
        }
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /api/logistics/ledger - 获取物流台账列表（带分页）
  router.get('/ledger', async (req, res) => {
    try {
      await ensureLedgerTable();
      
      const { 
        page = '1', 
        pageSize = '100', 
        storeId, 
        logisticsType, 
        recordType,
        orderNumber,
        ledgerNumber,
        startDate, 
        endDate 
      } = req.query;
      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const offset = (pageNum - 1) * pageSizeNum;

      // 构建查询条件
      let whereConditions = [];
      let queryParams = [];

      if (storeId) {
        whereConditions.push('store_id = ?');
        queryParams.push(Number(storeId));
      }

      if (logisticsType) {
        whereConditions.push('logistics_type = ?');
        queryParams.push(logisticsType);
      }

      if (recordType) {
        whereConditions.push('record_type = ?');
        queryParams.push(recordType);
      }

      if (orderNumber) {
        whereConditions.push('order_number LIKE ?');
        queryParams.push(`%${orderNumber}%`);
      }

      if (ledgerNumber) {
        whereConditions.push('ledger_number LIKE ?');
        queryParams.push(`%${ledgerNumber}%`);
      }

      if (startDate) {
        whereConditions.push('record_date >= ?');
        queryParams.push(startDate);
      }

      if (endDate) {
        whereConditions.push('record_date <= ?');
        queryParams.push(endDate);
      }

      const whereClause = whereConditions.length > 0 
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      // 获取总数
      const [countResult] = await pool.query(
        `SELECT COUNT(*) as total FROM logistics_ledger ${whereClause}`,
        queryParams
      );
      const total = countResult[0]?.total || 0;

      // 获取列表数据（关联订单表获取客户名称和项目名称）
      const [rows] = await pool.query(
        `SELECT ll.*, 
                o.customer_id, 
                c.name AS customer_name, 
                o.project_name
         FROM logistics_ledger ll
         LEFT JOIN orders o ON ll.order_id = o.id
         LEFT JOIN customers c ON o.customer_id = c.id
         ${whereClause} 
         ORDER BY ll.record_date DESC, ll.created_at DESC 
         LIMIT ? OFFSET ?`,
        [...queryParams, pageSizeNum, offset]
      );

      // 将数据库字段转换为前端camelCase格式
      const mappedData = (rows || []).map(row => {
        // 组装车辆信息
        const vehicleInfo = row.vehicle_plate 
          ? `${row.vehicle_plate}` 
          : undefined;
        
        // 组装司机信息
        const driverInfo = row.driver_name && row.driver_phone
          ? `${row.driver_name} / ${row.driver_phone}`
          : row.driver_name || undefined;
        
        // 组装物流公司信息
        const companyInfo = row.company_name
          ? (row.company_contact_name && row.company_contact_phone
              ? `${row.company_name} (${row.company_contact_name}/${row.company_contact_phone})`
              : row.company_name)
          : undefined;
        
        return {
          id: row.id,
          ledgerNumber: row.ledger_number,
          orderId: row.order_id,
          orderNumber: row.order_number,
          customerName: row.customer_name,
          projectName: row.project_name,
          entryId: row.entry_id,
          exitId: row.exit_id,
          logisticsType: row.logistics_type,
          recordType: row.record_type,
          storeId: row.store_id,
          storeName: row.store_name,
          sourceStoreId: row.source_store_id,
          sourceStoreName: row.source_store_name,
          targetStoreId: row.target_store_id,
          targetStoreName: row.target_store_name,
          logisticsCost: Number(row.logistics_cost || 0),
          recordDate: row.record_date,
          vehicleId: row.vehicle_id,
          vehiclePlate: row.vehicle_plate,
          vehicleInfo,  // 添加组装的车辆信息
          driverId: row.driver_id,
          driverName: row.driver_name,
          driverPhone: row.driver_phone,
          driverInfo,  // 添加组装的司机信息
          companyId: row.company_id,
          companyName: row.company_name,
          companyContactName: row.company_contact_name,
          companyContactPhone: row.company_contact_phone,
          companyInfo,  // 添加组装的物流公司信息
          remark: row.remark,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });

      res.json({
        ok: true,
        data: mappedData,
        page: pageNum,
        pageSize: pageSizeNum,
        total
      });
    } catch (err) {
      console.error('[Logistics.MySQL] ledger list error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Ledger list error' });
    }
  });

  // GET /api/logistics/ledger/statistics - 获取物流台账统计数据
  router.get('/ledger/statistics', async (req, res) => {
    try {
      await ensureLedgerTable();

      const { startDate, endDate, storeId } = req.query;

      // 构建查询条件
      let whereConditions = [];
      let queryParams = [];

      if (storeId) {
        whereConditions.push('store_id = ?');
        queryParams.push(Number(storeId));
      }

      if (startDate) {
        whereConditions.push('record_date >= ?');
        queryParams.push(startDate);
      }

      if (endDate) {
        whereConditions.push('record_date <= ?');
        queryParams.push(endDate);
      }

      const whereClause = whereConditions.length > 0 
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      // 统计各类物流成本
      const [costStats] = await pool.query(
        `SELECT 
          logistics_type,
          COUNT(*) as count,
          SUM(logistics_cost) as total_cost
         FROM logistics_ledger ${whereClause}
         GROUP BY logistics_type`,
        queryParams
      );

      // 统计进退场记录数
      const [typeStats] = await pool.query(
        `SELECT 
          record_type,
          COUNT(*) as count
         FROM logistics_ledger ${whereClause}
         GROUP BY record_type`,
        queryParams
      );

      // 总体统计
      const [totalStats] = await pool.query(
        `SELECT 
          COUNT(*) as total_count,
          SUM(logistics_cost) as total_cost
         FROM logistics_ledger ${whereClause}`,
        queryParams
      );

      res.json({
        ok: true,
        data: {
          byLogisticsType: costStats,
          byRecordType: typeStats,
          total: totalStats[0] || { total_count: 0, total_cost: 0 }
        }
      });
    } catch (err) {
      console.error('[Logistics.MySQL] ledger statistics error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Statistics error' });
    }
  });

  // POST /api/logistics/ledger - 创建物流台账记录
  router.post('/ledger', async (req, res) => {
    try {
      console.log('[Logistics.MySQL] POST /ledger - Request body:', JSON.stringify(req.body, null, 2));
      await ensureLedgerTable();
      
      const {
        orderId,
        orderNumber,
        entryId,
        exitId,
        logisticsType,
        recordType,
        storeId,
        storeName,
        logisticsCost,
        recordDate,
        vehicleId,
        vehiclePlate,
        driverId,
        driverName,
        driverPhone,
        companyId,
        companyName,
        companyContactName,
        companyContactPhone,
        remark
      } = req.body;

      // 如果只提供了 orderNumber，尝试查询 orderId
      let finalOrderId = orderId;
      let finalOrderNumber = orderNumber;
      
      if (!finalOrderId && finalOrderNumber) {
        const [orderRows] = await pool.query(
          'SELECT id, contract_number FROM orders WHERE contract_number = ?',
          [finalOrderNumber]
        );
        if (orderRows.length > 0) {
          finalOrderId = orderRows[0].id;
          console.log('[Logistics.MySQL] 通过订单编号查询到 orderId:', finalOrderId);
        } else {
          return res.status(400).json({ 
            ok: false, 
            error: '订单编号不存在' 
          });
        }
      }
      
      // 验证必填字段
      if (!finalOrderId || !finalOrderNumber || !recordType || !recordDate) {
        console.error('[Logistics.MySQL] 缺少必填字段:', {
          orderId: finalOrderId, 
          orderNumber: finalOrderNumber, 
          recordType, 
          recordDate
        });
        return res.status(400).json({ 
          ok: false, 
          error: '缺少必填字段',
          missing: {
            orderId: !finalOrderId,
            orderNumber: !finalOrderNumber,
            recordType: !recordType,
            recordDate: !recordDate
          }
        });
      }
      
      // 如果提供了 storeId 但没有 storeName（或反之），记录警告
      if ((storeId && !storeName) || (!storeId && storeName)) {
        console.warn('[Logistics.MySQL] ⚠️ 门店信息不完整:', { storeId, storeName });
      }

      // 生成台账编号（格式：年月日-序号）
      const dateStr = new Date(recordDate).toISOString().slice(0, 10).replace(/-/g, '');
      const [countRows] = await pool.query(
        'SELECT COUNT(*) as count FROM logistics_ledger WHERE ledger_number LIKE ?',
        [`${dateStr}-%`]
      );
      const seq = (countRows[0]?.count || 0) + 1;
      const ledgerNumber = `${dateStr}-${seq}`;

      const now = new Date();
      // transport_type 字段映射：根据 logistics_type 和 record_type 确定运输类型
      const transportType = recordType === 'entry' ? '进场运输' : '退场运输';
      // transport_date 字段：使用 recordDate 的日期部分（去掉时间）
      const transportDate = new Date(recordDate).toISOString().split('T')[0];
      
      // 根据记录类型设置源/目标门店
      let sourceStoreId = null, sourceStoreName = null;
      let targetStoreId = null, targetStoreName = null;
      
      if (recordType === 'entry') {
        // 进场：store 作为出库门店（源门店）
        sourceStoreId = storeId;
        sourceStoreName = storeName;
      } else if (recordType === 'exit') {
        // 退场：store 作为入库门店（目标门店）
        targetStoreId = storeId;
        targetStoreName = storeName;
      } else if (recordType === 'warehouse_transfer') {
        // 调拨：需要设置源和目标门店
        sourceStoreId = storeId;
        sourceStoreName = storeName;
      }

      const [result] = await pool.query(
        `INSERT INTO logistics_ledger (
          ledger_number, order_id, order_number, entry_id, exit_id,
          logistics_type, record_type, transport_type, transport_date, store_id, 
          store_name, source_store_id, source_store_name, target_store_id, target_store_name,
          logistics_cost, record_date, vehicle_id, vehicle_plate, 
          driver_id, driver_name, driver_phone, company_id, company_name, 
          company_contact_name, company_contact_phone, remark, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ledgerNumber,
          finalOrderId,
          finalOrderNumber,
          entryId || null,
          exitId || null,
          logisticsType || '自有物流',
          recordType,
          transportType,       // 新增：transport_type 字段
          transportDate,       // 新增：transport_date 字段
          storeId,
          storeName,
          sourceStoreId,       // 新增：源门店ID
          sourceStoreName,     // 新增：源门店名称
          targetStoreId,       // 新增：目标门店ID
          targetStoreName,     // 新增：目标门店名称
          logisticsCost || 0,
          recordDate,
          vehicleId || null,
          vehiclePlate || null,
          driverId || null,
          driverName || null,
          driverPhone || null,
          companyId || null,
          companyName || null,
          companyContactName || null,
          companyContactPhone || null,
          remark || null,
          now,
          now
        ]
      );

      console.log('[Logistics.MySQL] ✅ 物流台账记录创建成功，ID:', result.insertId, '编号:', ledgerNumber);
      res.json({ ok: true, id: String(result.insertId), ledgerNumber });
    } catch (err) {
      console.error('[Logistics.MySQL] ❌ 物流台账创建失败:', err);
      console.error('[Logistics.MySQL] SQL错误详情:', {
        code: err.code,
        sqlMessage: err.sqlMessage,
        sqlState: err.sqlState,
        sql: err.sql
      });
      res.status(500).json({ 
        ok: false, 
        error: err?.message || 'Create error',
        details: process.env.NODE_ENV === 'development' ? err.sqlMessage : undefined
      });
    }
  });

  // GET /api/logistics/ledger/:id - 获取单条台账记录
  router.get('/ledger/:id', async (req, res) => {
    try {
      await ensureLedgerTable();
      
      const id = Number(req.params.id);
      const [rows] = await pool.query(
        `SELECT ll.*, 
                o.customer_id, 
                c.name AS customer_name, 
                o.project_name
         FROM logistics_ledger ll
         LEFT JOIN orders o ON ll.order_id = o.id
         LEFT JOIN customers c ON o.customer_id = c.id
         WHERE ll.id = ?`,
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Ledger not found' });
      }

      const row = rows[0];
      
      // 组装车辆信息
      const vehicleInfo = row.vehicle_plate 
        ? `${row.vehicle_plate}` 
        : undefined;
      
      // 组装司机信息
      const driverInfo = row.driver_name && row.driver_phone
        ? `${row.driver_name} / ${row.driver_phone}`
        : row.driver_name || undefined;
      
      // 组装物流公司信息
      const companyInfo = row.company_name
        ? (row.company_contact_name && row.company_contact_phone
            ? `${row.company_name} (${row.company_contact_name}/${row.company_contact_phone})`
            : row.company_name)
        : undefined;
      
      const mappedData = {
        id: row.id,
        ledgerNumber: row.ledger_number,
        orderId: row.order_id,
        orderNumber: row.order_number,
        customerName: row.customer_name,
        projectName: row.project_name,
        entryId: row.entry_id,
        exitId: row.exit_id,
        logisticsType: row.logistics_type,
        recordType: row.record_type,
        storeId: row.store_id,
        storeName: row.store_name,
        sourceStoreId: row.source_store_id,
        sourceStoreName: row.source_store_name,
        targetStoreId: row.target_store_id,
        targetStoreName: row.target_store_name,
        logisticsCost: Number(row.logistics_cost || 0),
        recordDate: row.record_date,
        vehicleId: row.vehicle_id,
        vehiclePlate: row.vehicle_plate,
        vehicleInfo,  // 添加组装的车辆信息
        driverId: row.driver_id,
        driverName: row.driver_name,
        driverPhone: row.driver_phone,
        driverInfo,  // 添加组装的司机信息
        companyId: row.company_id,
        companyName: row.company_name,
        companyContactName: row.company_contact_name,
        companyContactPhone: row.company_contact_phone,
        companyInfo,  // 添加组装的物流公司信息
        remark: row.remark,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      res.json({ ok: true, data: mappedData });
    } catch (err) {
      console.error('[Logistics.MySQL] ledger get error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Get error' });
    }
  });

  // PUT /api/logistics/ledger/:id - 更新台账记录
  router.put('/ledger/:id', async (req, res) => {
    try {
      await ensureLedgerTable();
      
      const id = Number(req.params.id);
      const { logisticsCost, remark } = req.body;

      const [result] = await pool.query(
        `UPDATE logistics_ledger 
         SET logistics_cost = ?, remark = ?, updated_at = NOW() 
         WHERE id = ?`,
        [logisticsCost || 0, remark || null, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ ok: false, error: 'Ledger not found' });
      }

      res.json({ ok: true, affectedRows: result.affectedRows });
    } catch (err) {
      console.error('[Logistics.MySQL] ledger update error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Update error' });
    }
  });

  // DELETE /api/logistics/ledger/:id - 删除台账记录
  router.delete('/ledger/:id', async (req, res) => {
    try {
      await ensureLedgerTable();
      
      const id = Number(req.params.id);
      const [result] = await pool.query(
        'DELETE FROM logistics_ledger WHERE id = ?',
        [id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ ok: false, error: 'Ledger not found' });
      }

      res.json({ ok: true, affectedRows: result.affectedRows });
    } catch (err) {
      console.error('[Logistics.MySQL] ledger delete error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete error' });
    }
  });

  return router;
}