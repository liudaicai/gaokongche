import express from 'express';

export default function buildEquipmentsRouterMySQL(pool) {
  const router = express.Router();

  // ----------------------------------------------------------------
  // 辅助函数：驼峰命名与下划线命名转换
  // ----------------------------------------------------------------
  function camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
  
  function snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  }
  
  function keysToSnakeCase(obj) {
    const result = {};
    for (const key in obj) {
      result[camelToSnake(key)] = obj[key];
    }
    return result;
  }
  
  function keysToCamelCase(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(keysToCamelCase);
    
    const result = {};
    for (const key in obj) {
      result[snakeToCamel(key)] = obj[key];
    }
    return result;
  }

  // ----------------------------------------------------------------
  // 库存统计 API（必须放在 /:id 之前，否则会被 /:id 拦截）
  // ----------------------------------------------------------------
  router.get('/inventory/stats', async (req, res) => {
    try {
      // 一户一库，不需要租户过滤

      // 统一使用rental_status字段统计设备状态，处理NULL值（NULL视为available）
      const query = `
        SELECT
          COALESCE(e.type, '未分类') as type,
          COALESCE(e.height, 0) as height,
          COALESCE(s.name, e.warehouse, '默认区域') AS area,
          COUNT(CASE WHEN COALESCE(e.rental_status, 'available') IN ('available', 'idle', 'waiting') THEN 1 END) as waitingCount,
          COUNT(CASE WHEN COALESCE(e.rental_status, 'available') = 'renting' THEN 1 END) as rentingCount,
          COUNT(CASE WHEN COALESCE(e.rental_status, 'available') IN ('maintenance', 'mass', 'repair', 'repairing') THEN 1 END) as repairingCount,
          COUNT(*) as totalCount
        FROM equipments e
        LEFT JOIN stores s ON e.store_id = s.id
        WHERE e.deleted_at IS NULL
        GROUP BY COALESCE(e.type, '未分类'), COALESCE(e.height, 0), COALESCE(s.name, e.warehouse, '默认区域')
        ORDER BY COALESCE(e.type, '未分类'), COALESCE(e.height, 0)
      `;

      const [rows] = await pool.query(query);

      const data = (rows || []).map(r => ({
        type: r.type || '未分类',
        height: r.height || 0,
        area: r.area,
        waitingCount: Number(r.waitingCount || 0),
        rentingCount: Number(r.rentingCount || 0),
        repairingCount: Number(r.repairingCount || 0),
        totalCount: Number(r.totalCount || 0),
      }));

      res.json({ ok: true, data });
    } catch (err) {
      console.error('[Equipments.MySQL] Inventory stats error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Inventory stats error' });
    }
  });

  // ----------------------------------------------------------------
  // 设备履历 API (新增)
  // ----------------------------------------------------------------
  router.get('/:id/history', async (req, res) => {
    try {
      const { id } = req.params;
      
      // 1. 获取设备信息
      const [equipments] = await pool.query('SELECT code, custom_code FROM equipments WHERE id = ?', [id]);
      if (equipments.length === 0) return res.json({ ok: false, error: 'Equipment not found' });
      
      const { code, custom_code } = equipments[0];
      
      // 2. 查询履历
      const query = `
        SELECT 
          o.id as order_id,
          o.contract_number,
          o.project_name,
          c.name as customer_name,
          oe.entry_date,
          oe.id as entry_id,
          ox.exit_date,
          ox.id as exit_id,
          o.status as order_status
        FROM order_entries oe
        JOIN orders o ON oe.order_id = o.id
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN order_exits ox ON o.id = ox.order_id 
             AND (
               JSON_CONTAINS(ox.attachments_json, JSON_QUOTE(?), '$.equipmentCodes') 
               OR 
               JSON_CONTAINS(ox.attachments_json, JSON_QUOTE(?), '$.equipmentCodes')
             )
        WHERE 
          JSON_CONTAINS(oe.attachments_json, JSON_QUOTE(?), '$.equipmentCodes') 
          OR 
          JSON_CONTAINS(oe.attachments_json, JSON_QUOTE(?), '$.equipmentCodes')
        ORDER BY oe.entry_date DESC
      `;

      const [history] = await pool.query(query, [code, custom_code, code, custom_code]);

      res.json({ ok: true, data: history });
    } catch (err) {
      console.error('[Equipments.MySQL] Get history error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // ----------------------------------------------------------------
  // 保单附件 API
  // ----------------------------------------------------------------
  router.get('/:id/policy-attachments', async (req, res) => {
    try {
      const { id } = req.params;
      
      // 获取该设备关联的所有有效保单的附件
      const today = new Date().toISOString().split('T')[0];
      
      const [attachments] = await pool.query(
        `SELECT 
          pa.id,
          pa.policy_id,
          pa.name,
          pa.mime_type,
          pa.size,
          ip.number as policy_number,
          ip.company as policy_company,
          ip.start_date,
          ip.end_date
         FROM policy_attachments pa
         INNER JOIN insurance_policies ip ON pa.policy_id = ip.id
         INNER JOIN policy_devices pd ON pd.policy_id = ip.id
         WHERE pd.device_id = ?
           AND ip.start_date <= ?
           AND ip.end_date >= ?
         ORDER BY ip.end_date DESC`,
        [id, today, today]
      );
      
      res.json({ ok: true, data: attachments });
    } catch (err) {
      console.error('[Equipments.MySQL] Get policy attachments error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // ----------------------------------------------------------------
  // 获取设备列表
  // ----------------------------------------------------------------
  router.get('/', async (req, res) => {
    try {
      const { page = 1, pageSize = 10000, type, height, storeId, status, keyword } = req.query;
      const offset = (Number(page) - 1) * Number(pageSize);
      
      // 一户一库，不需要租户过滤
      let whereClause = `e.deleted_at IS NULL`;
      const params = [];

      if (type) {
        whereClause += ' AND e.type = ?';
        params.push(type);
      }
      if (height) {
        whereClause += ' AND e.height = ?';
        params.push(height);
      }
      if (storeId) {
        whereClause += ' AND e.store_id = ?';
        params.push(storeId);
      }
      if (status) {
        whereClause += ' AND e.rental_status = ?';
        params.push(status);
      }
      if (keyword) {
        whereClause += ' AND (e.code LIKE ? OR e.custom_code LIKE ? OR e.brand LIKE ? OR e.model LIKE ?)';
        const k = `%${keyword}%`;
        params.push(k, k, k, k);
      }

      // 获取总数
      const [countResult] = await pool.query(
        `SELECT COUNT(*) as total FROM equipments e WHERE ${whereClause}`,
        params
      );
      const total = countResult[0].total;

      // 获取列表（包含订单的客户名和项目名）
      // 修复：使用 JSON 字段关联设备（设备信息存储在 attachments_json 中）
      const [rows] = await pool.query(
        `SELECT e.*, 
          s.name as store_name,
          COALESCE(order_customer.name, current_customer.name) as customer_name,
          o.project_name,
          o.contract_number,
          o.id as order_id
         FROM equipments e
         LEFT JOIN stores s ON e.store_id = s.id
         LEFT JOIN (
           SELECT 
             e_inner.id as equipment_id,
             oe.order_id,
             ROW_NUMBER() OVER (PARTITION BY e_inner.id ORDER BY oe.id DESC) as rn
           FROM equipments e_inner
           JOIN order_entries oe ON (
             JSON_CONTAINS(oe.attachments_json, JSON_QUOTE(e_inner.code), '$.equipmentCodes')
             OR JSON_CONTAINS(oe.attachments_json, JSON_QUOTE(e_inner.custom_code), '$.equipmentCodes')
           )
           LEFT JOIN order_exits oex ON (
             (JSON_CONTAINS(oex.attachments_json, JSON_QUOTE(e_inner.code), '$.equipmentCodes')
              OR JSON_CONTAINS(oex.attachments_json, JSON_QUOTE(e_inner.custom_code), '$.equipmentCodes'))
             AND oex.order_id = oe.order_id
           )
           WHERE oex.id IS NULL
         ) latest_entry ON latest_entry.equipment_id = e.id AND latest_entry.rn = 1
         LEFT JOIN orders o ON latest_entry.order_id = o.id AND o.deleted_at IS NULL
         LEFT JOIN customers order_customer ON o.customer_id = order_customer.id AND order_customer.deleted_at IS NULL
         LEFT JOIN customers current_customer ON e.current_customer_id = current_customer.id AND current_customer.deleted_at IS NULL
         WHERE ${whereClause}
         ORDER BY e.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, Number(pageSize), offset]
      );

      // 获取所有设备的保单信息
      const equipmentIds = rows.map(r => r.id);
      const policiesMap = new Map();
      
      if (equipmentIds.length > 0) {
        const [policyRows] = await pool.query(
          `SELECT 
            pd.device_id as equipment_id,
            ip.id as policy_id,
            ip.number as policy_number,
            ip.company as policy_company,
            ip.start_date,
            ip.end_date
           FROM policy_devices pd
           INNER JOIN insurance_policies ip ON pd.policy_id = ip.id
           WHERE pd.device_id IN (?)
           ORDER BY ip.end_date DESC`,
          [equipmentIds]
        );
        
        // 按设备ID分组保单
        policyRows.forEach(row => {
          if (!policiesMap.has(row.equipment_id)) {
            policiesMap.set(row.equipment_id, []);
          }
          policiesMap.get(row.equipment_id).push({
            policyId: row.policy_id,
            policyNumber: row.policy_number,
            policyCompany: row.policy_company,
            startDate: row.start_date,
            endDate: row.end_date
          });
        });
      }

      // 计算保险状态
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const camelRows = rows.map(row => {
        const equipment = keysToCamelCase(row);
        const policies = policiesMap.get(row.id) || [];
        
        // 查找有效保单
        const validPolicy = policies.find(p => {
          const start = new Date(p.startDate);
          const end = new Date(p.endDate);
          return today >= start && today <= end;
        });
        
        if (validPolicy) {
          const endDate = new Date(validPolicy.endDate);
          const daysToExpire = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
          
          // 7天内到期显示"即将到期"
          equipment.insuranceStatus = daysToExpire <= 7 ? 'expiring' : 'insured';
          equipment.policyNumber = validPolicy.policyNumber;
          equipment.policyCompany = validPolicy.policyCompany;
          equipment.policyEndDate = validPolicy.endDate;
          equipment.daysToExpire = daysToExpire;
        } else {
          equipment.insuranceStatus = 'uninsured';
        }
        
        return equipment;
      });

      res.json({ ok: true, data: camelRows, total, page: Number(page), pageSize: Number(pageSize) });
    } catch (err) {
      console.error('[Equipments.MySQL] List error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // ----------------------------------------------------------------
  // 获取单个设备
  // ----------------------------------------------------------------
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await pool.query(
        `SELECT e.*, s.name as store_name
         FROM equipments e
         LEFT JOIN stores s ON e.store_id = s.id
         WHERE e.id = ?`,
        [id]
      );
      if (rows.length === 0) return res.status(404).json({ ok: false, error: 'Not found' });

      // 获取保单信息
      const [policyRows] = await pool.query(
        `SELECT 
          ip.id as policy_id,
          ip.number as policy_number,
          ip.company as policy_company,
          ip.start_date,
          ip.end_date
         FROM policy_devices pd
         INNER JOIN insurance_policies ip ON pd.policy_id = ip.id
         WHERE pd.device_id = ?
         ORDER BY ip.end_date DESC`,
        [id]
      );
      
      // 计算保险状态
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const validPolicy = policyRows.find(p => {
        const start = new Date(p.start_date);
        const end = new Date(p.end_date);
        return today >= start && today <= end;
      });
      
      const equipment = keysToCamelCase(rows[0]);
      
      if (validPolicy) {
        const endDate = new Date(validPolicy.end_date);
        const daysToExpire = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        
        equipment.insuranceStatus = daysToExpire <= 7 ? 'expiring' : 'insured';
        equipment.policyNumber = validPolicy.policy_number;
        equipment.policyCompany = validPolicy.policy_company;
        equipment.policyEndDate = validPolicy.end_date;
        equipment.daysToExpire = daysToExpire;
      } else {
        equipment.insuranceStatus = 'uninsured';
      }

      res.json({ ok: true, data: equipment });
    } catch (err) {
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // ----------------------------------------------------------------
  // 创建设备
  // ----------------------------------------------------------------
  router.post('/', async (req, res) => {
    try {
      let data = req.body;
      
      // 转换驼峰命名为下划线命名
      data = keysToSnakeCase(data);
      
      // 移除 id, created_at, updated_at 等系统字段
      delete data.id;
      delete data.created_at;
      delete data.updated_at;
      delete data.deleted_at;
      
      // 移除前端可能发送但数据库中不存在的字段
      delete data.attachments;  // equipments表没有attachments字段
      
      // 强制设置默认字段（确保新设备有正确的状态）
      if (!data.rental_status || data.rental_status === '' || data.rental_status === null) {
        data.rental_status = 'available';
      }
      
      // 查重：检查出厂编号和自编号是否已存在
      const errors = [];
      
      // 检查出厂编号
      if (data.code) {
        const [codeResult] = await pool.query(
          'SELECT code FROM equipments WHERE code = ? AND deleted_at IS NULL LIMIT 1',
          [data.code]
        );
        if (codeResult.length > 0) {
          errors.push(`出厂编号"${data.code}"已存在`);
        }
      }
      
      // 检查自编号
      if (data.custom_code) {
        const [customCodeResult] = await pool.query(
          'SELECT custom_code FROM equipments WHERE custom_code = ? AND deleted_at IS NULL LIMIT 1',
          [data.custom_code]
        );
        if (customCodeResult.length > 0) {
          errors.push(`自编号"${data.custom_code}"已存在`);
        }
      }
      
      // 如果有重复，返回错误
      if (errors.length > 0) {
        return res.status(400).json({ 
          ok: false, 
          error: errors.join('；'),
          code: 'DUPLICATE_EQUIPMENT'
        });
      }
      
      // 插入数据
      const keys = Object.keys(data);
      
      // 检查是否有有效字段
      if (keys.length === 0) {
        return res.status(400).json({ 
          ok: false, 
          error: '没有有效的设备数据，请至少填写一个字段' 
        });
      }
      
      const values = Object.values(data);
      const placeholders = keys.map(() => '?').join(',');
      
      const sql = `INSERT INTO equipments (${keys.join(',')}) VALUES (${placeholders})`;
      console.log('[Equipments.MySQL] 创建设备 SQL:', sql);
      console.log('[Equipments.MySQL] 字段:', keys);
      console.log('[Equipments.MySQL] 值:', values);
      
      const [result] = await pool.query(sql, values);
      
      res.json({ ok: true, id: result.insertId });
    } catch (err) {
      console.error('[Equipments.MySQL] Create error:', err.message);
      
      // 提供更友好的错误信息
      let errorMessage = err?.message || 'Create error';
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        errorMessage = '数据库字段错误：' + err.sqlMessage;
      } else if (err.code === 'ER_DUP_ENTRY') {
        // 解析重复的键
        const match = err.sqlMessage?.match(/Duplicate entry '(.+?)' for key '(.+?)'/);
        if (match) {
          const value = match[1];
          const key = match[2];
          if (key.includes('code')) {
            errorMessage = `出厂编号"${value}"已存在`;
          } else if (key.includes('custom')) {
            errorMessage = `自编号"${value}"已存在`;
          } else {
            errorMessage = '设备编号已存在';
          }
        } else {
          errorMessage = '设备编号已存在，请检查出厂编号和自编号';
        }
      } else if (err.code === 'ER_NO_DEFAULT_FOR_FIELD') {
        errorMessage = '缺少必填字段：' + err.sqlMessage;
      }
      
      res.status(500).json({ ok: false, error: errorMessage });
    }
  });

  // ----------------------------------------------------------------
  // 更新设备
  // ----------------------------------------------------------------
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      let data = req.body;
      
      // 转换驼峰命名为下划线命名
      data = keysToSnakeCase(data);
      
      delete data.id;
      delete data.created_at;
      delete data.updated_at;
      
      data.updated_at = new Date();
      
      // 处理 attachments 字段（JSON）
      if (data.attachments !== undefined) {
        if (Array.isArray(data.attachments)) {
          data.attachments = JSON.stringify(data.attachments);
        } else if (!data.attachments) {
          data.attachments = null;
        }
      }
      
      const keys = Object.keys(data);
      if (keys.length === 0) return res.json({ ok: true });
      
      const setClause = keys.map(k => `${k} = ?`).join(',');
      const values = [...Object.values(data), id];
      
      await pool.query(
        `UPDATE equipments SET ${setClause} WHERE id = ?`,
        values
      );
      
      res.json({ ok: true });
    } catch (err) {
      console.error('[Equipments.MySQL] Update error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // ----------------------------------------------------------------
  // 删除设备
  // ----------------------------------------------------------------
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query(
        'UPDATE equipments SET deleted_at = NOW() WHERE id = ?',
        [id]
      );
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  return router;
}
