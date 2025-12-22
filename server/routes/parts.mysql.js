// 一户一库，不需要租户过滤
import express from 'express';
export default function buildPartsRouter(pool) {
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
    // Date对象直接返回，不要递归处理
    if (obj instanceof Date) return obj;

    const result = {};
    for (const key in obj) {
      const camelKey = snakeToCamel(key);
      const value = obj[key];
      // 递归处理嵌套对象和数组（但跳过Date对象）
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        result[camelKey] = keysToCamelCase(value);
      } else {
        result[camelKey] = value;
      }
    }
    return result;
  }

  // ================================================================
  // 1. 获取配件列表（带库存信息）
  // ================================================================
  router.get('/', async (req, res) => {
    try {
      // 不再使用 tenantFilter（多租户已移除）
      const params = [];
      
      const query = `
        SELECT 
          p.*,
          u.username as creator_name
        FROM parts p
        LEFT JOIN users u ON p.created_by = u.id
        WHERE p.deleted_at IS NULL
        ORDER BY p.created_at DESC
      `;
      
      const [parts] = await pool.query(query, params);
      
      // 获取每个配件的库存信息
      for (let part of parts) {
        const stockQuery = `
          SELECT 
            ps.quantity,
            s.name as store_name,
            s.id as store_id
          FROM part_stocks ps
          LEFT JOIN stores s ON ps.store_id = s.id
          WHERE ps.part_id = ? AND ps.quantity > 0
          ORDER BY s.name
        `;
        const [stocks] = await pool.query(stockQuery, [part.id]);
        part.stocks = stocks;
        
        // 计算总库存
        part.total_quantity = stocks.reduce((sum, stock) => sum + stock.quantity, 0);
      }
      
      res.json({ ok: true, data: parts.map(keysToCamelCase) });
    } catch (error) {
      console.error('获取配件列表失败:', error);
      res.status(500).json({ ok: false, message: '获取配件列表失败', error: error.message });
    }
  });

  // ================================================================
  // 2. 获取下一个配件编号
  // ================================================================
  router.get('/next-code', async (req, res) => {
    try {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
      const prefix = `PJ${dateStr}`;
      
      const query = `
        SELECT code FROM parts 
        WHERE code LIKE ? 
        ORDER BY code DESC 
        LIMIT 1
      `;
      
      const [rows] = await pool.query(query, [`${prefix}%`]);
      
      let nextNumber = 1;
      if (rows.length > 0) {
        const lastCode = rows[0].code;
        const lastNumber = parseInt(lastCode.slice(-2)); // 获取最后两位序号
        nextNumber = lastNumber + 1;
      }
      
      const nextCode = `${prefix}${nextNumber.toString().padStart(2, '0')}`;
      
      res.json({ ok: true, data: { nextCode } });
    } catch (error) {
      console.error('生成配件编号失败:', error);
      res.status(500).json({ ok: false, message: '生成配件编号失败', error: error.message });
    }
  });

  // ================================================================
  // 3. 新增配件
  // ================================================================
  router.post('/', async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      // 注意：req.body 是对象，必须做 keys 转换，而不是对字符串做 replace
      const data = keysToSnakeCase(req.body);
      // 不再检查 companyId（多租户已移除）
      const companyId = null;
      data.company_id = companyId;
      data.created_by = Number(req.user?.id) || null;
      
      // 检查配件编号是否重复
      const [existing] = await conn.query(
        'SELECT id FROM parts WHERE code = ? AND deleted_at IS NULL',
        [data.code]
      );
      
      if (existing.length > 0) {
        await conn.rollback();
        return res.status(400).json({ ok: false, message: '配件编号已存在，请刷新后重试' });
      }
      
      const [result] = await conn.query('INSERT INTO parts SET ?', data);
      
      await conn.commit();
      
      res.json({ ok: true, data: { id: result.insertId, ...keysToCamelCase(data) } });
    } catch (error) {
      await conn.rollback();
      console.error('新增配件失败:', error);
      res.status(500).json({ ok: false, message: '新增配件失败', error: error.message });
    } finally {
      conn.release();
    }
  });

  // ================================================================
  // 4. 配件入库
  // ================================================================
  router.post('/stock-in', async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      const { transactionNo, storeId, parts, operatorName } = req.body;
      // 不再检查 companyId（多租户已移除）
      const companyId = null;
      const operatorId = Number(req.user?.id) || null;
      
      // 检查入库单号是否重复
      const [existing] = await conn.query(
        'SELECT id FROM part_transactions WHERE transaction_no = ?',
        [transactionNo]
      );
      
      if (existing.length > 0) {
        await conn.rollback();
        return res.status(400).json({ ok: false, message: '入库单号已存在，请刷新后重试' });
      }
      
      // 批量入库
      for (let part of parts) {
        // 插入入库记录
        await conn.query(
          `INSERT INTO part_transactions 
          (transaction_no, transaction_type, part_id, store_id, quantity, operator_id, operator_name, company_id) 
          VALUES (?, 'stock_in', ?, ?, ?, ?, ?, ?)`,
          [transactionNo, part.partId, storeId, part.quantity, operatorId, operatorName, companyId]
        );
        
        // 更新或插入库存
        await conn.query(
          `INSERT INTO part_stocks (part_id, store_id, quantity, company_id) 
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
          [part.partId, storeId, part.quantity, companyId, part.quantity]
        );
      }
      
      await conn.commit();
      
      res.json({ ok: true, message: '入库成功' });
    } catch (error) {
      await conn.rollback();
      console.error('配件入库失败:', error);
      res.status(500).json({ ok: false, message: '配件入库失败', error: error.message });
    } finally {
      conn.release();
    }
  });

  // ================================================================
  // 5. 配件领用（待核销，不扣库存）
  // ================================================================
  router.post('/use', async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      const { partId, storeId, quantity, remark } = req.body;
      // 不再检查 companyId（多租户已移除）
      const companyId = null;
      const operatorId = Number(req.user?.id) || null;
      const operatorName = req.user?.username || '系统';
      
      // 检查库存是否充足
      const [stock] = await conn.query(
        'SELECT quantity FROM part_stocks WHERE part_id = ? AND store_id = ?',
        [partId, storeId]
      );
      
      if (stock.length === 0 || stock[0].quantity < quantity) {
        await conn.rollback();
        return res.status(400).json({ ok: false, message: '库存不足' });
      }
      
      // 生成单号
      const transactionNo = `LY${Date.now()}`;
      
      // 插入领用记录（状态为pending，待核销）
      // 注意：quantity保存为正数，因为配件还在手上，未真正消耗
      await conn.query(
        `INSERT INTO part_transactions 
        (transaction_no, transaction_type, part_id, store_id, quantity, status, operator_id, operator_name, remark, company_id) 
        VALUES (?, 'use', ?, ?, ?, 'pending', ?, ?, ?, ?)`,
        [transactionNo, partId, storeId, quantity, operatorId, operatorName, remark, companyId]
      );
      
      // 不扣除库存（等待核销时才扣除）
      // 配件此时处于"待核销"状态
      
      await conn.commit();
      
      res.json({ ok: true, message: '领用成功，配件已转为待核销状态' });
    } catch (error) {
      await conn.rollback();
      console.error('配件领用失败:', error);
      res.status(500).json({ ok: false, message: '配件领用失败', error: error.message });
    } finally {
      conn.release();
    }
  });

  // ================================================================
  // 6. 配件退回
  // ================================================================
  router.post('/return', async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      const { partId, storeId, quantity, remark } = req.body;
      // 不再检查 companyId（多租户已移除）
      const companyId = null;
      const operatorId = Number(req.user?.id) || null;
      const operatorName = req.user?.username || '系统';
      
      // 生成单号
      const transactionNo = `TH${Date.now()}`;
      
      // 插入退回记录
      await conn.query(
        `INSERT INTO part_transactions 
        (transaction_no, transaction_type, part_id, store_id, quantity, operator_id, operator_name, remark, company_id) 
        VALUES (?, 'return', ?, ?, ?, ?, ?, ?, ?)`,
        [transactionNo, partId, storeId, quantity, operatorId, operatorName, remark, companyId]
      );
      
      // 增加库存
      await conn.query(
        `INSERT INTO part_stocks (part_id, store_id, quantity, company_id) 
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
        [partId, storeId, quantity, companyId, quantity]
      );
      
      await conn.commit();
      
      res.json({ ok: true, message: '退回成功' });
    } catch (error) {
      await conn.rollback();
      console.error('配件退回失败:', error);
      res.status(500).json({ ok: false, message: '配件退回失败', error: error.message });
    } finally {
      conn.release();
    }
  });

  // ================================================================
  // 7. 配件报废
  // ================================================================
  router.post('/scrap', async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      const { partId, storeId, quantity, remark } = req.body;
      // 不再检查 companyId（多租户已移除）
      const companyId = null;
      const operatorId = Number(req.user?.id) || null;
      const operatorName = req.user?.username || '系统';
      
      // 检查库存是否充足
      const [stock] = await conn.query(
        'SELECT quantity FROM part_stocks WHERE part_id = ? AND store_id = ?',
        [partId, storeId]
      );
      
      if (stock.length === 0 || stock[0].quantity < quantity) {
        await conn.rollback();
        return res.status(400).json({ ok: false, message: '库存不足' });
      }
      
      // 生成单号
      const transactionNo = `BF${Date.now()}`;
      
      // 插入报废记录
      await conn.query(
        `INSERT INTO part_transactions 
        (transaction_no, transaction_type, part_id, store_id, quantity, operator_id, operator_name, remark, company_id) 
        VALUES (?, 'scrap', ?, ?, ?, ?, ?, ?, ?)`,
        [transactionNo, partId, storeId, -quantity, operatorId, operatorName, remark, companyId]
      );
      
      // 减少库存
      await conn.query(
        'UPDATE part_stocks SET quantity = quantity - ? WHERE part_id = ? AND store_id = ?',
        [quantity, partId, storeId]
      );
      
      await conn.commit();
      
      res.json({ ok: true, message: '报废成功' });
    } catch (error) {
      await conn.rollback();
      console.error('配件报废失败:', error);
      res.status(500).json({ ok: false, message: '配件报废失败', error: error.message });
    } finally {
      conn.release();
    }
  });

  // ================================================================
  // 8. 更新配件信息
  // ================================================================
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const data = keysToSnakeCase(req.body);
      delete data.id;
      delete data.code; // 配件编号不允许修改
      delete data.company_id;
      delete data.created_by;
      delete data.created_at;
      delete data.updated_at;
      delete data.deleted_at;
      
      await pool.query(
        'UPDATE parts SET ? WHERE id = ? AND deleted_at IS NULL',
        [data, id]
      );
      
      res.json({ ok: true, message: '更新成功' });
    } catch (error) {
      console.error('更新配件失败:', error);
      res.status(500).json({ ok: false, message: '更新配件失败', error: error.message });
    }
  });

  // ================================================================
  // 9. 删除配件（软删除）
  // ================================================================
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // 检查是否有库存
      const [stocks] = await pool.query(
        'SELECT SUM(quantity) as total FROM part_stocks WHERE part_id = ? AND quantity > 0',
        [id]
      );
      
      if (stocks[0].total > 0) {
        return res.status(400).json({ ok: false, message: '该配件还有库存，无法删除' });
      }
      
      await pool.query(
        'UPDATE parts SET deleted_at = NOW() WHERE id = ?',
        [id]
      );
      
      res.json({ ok: true, message: '删除成功' });
    } catch (error) {
      console.error('删除配件失败:', error);
      res.status(500).json({ ok: false, message: '删除配件失败', error: error.message });
    }
  });

  // ================================================================
  // 10. 获取所有配件的出入库记录
  // ================================================================
  router.get('/transactions/all', async (req, res) => {
    try {
      // 一户一库，不需要租户过滤
      const query = `
        SELECT 
          pt.*,
          p.name as part_name,
          p.code as part_code,
          p.brand as part_brand,
          p.model as part_model,
          s.name as store_name,
          u.name as operator_real_name
        FROM part_transactions pt
        LEFT JOIN parts p ON pt.part_id = p.id
        LEFT JOIN stores s ON pt.store_id = s.id
        LEFT JOIN users u ON pt.operator_id = u.id
        WHERE 1=1
        ORDER BY pt.transaction_time DESC
        LIMIT 1000
      `;
      
      const [transactions] = await pool.query(query);
      
      res.json({ ok: true, data: transactions.map(keysToCamelCase) });
    } catch (error) {
      console.error('获取配件记录失败:', error);
      res.status(500).json({ ok: false, message: '获取配件记录失败', error: error.message });
    }
  });

  // ================================================================
  // 11. 获取单个配件的出入库记录
  // ================================================================
  router.get('/:id/transactions', async (req, res) => {
    try {
      const { id} = req.params;
      
      const query = `
        SELECT 
          pt.*,
          s.name as store_name
        FROM part_transactions pt
        LEFT JOIN stores s ON pt.store_id = s.id
        WHERE pt.part_id = ?
        ORDER BY pt.transaction_time DESC
      `;
      
      const [transactions] = await pool.query(query, [id]);
      
      res.json({ ok: true, data: transactions.map(keysToCamelCase) });
    } catch (error) {
      console.error('获取配件记录失败:', error);
      res.status(500).json({ ok: false, message: '获取配件记录失败', error: error.message });
    }
  });

  // ================================================================
  // 12. 获取待核销配件列表
  // ================================================================
  router.get('/pending-writeoffs/list', async (req, res) => {
    try {
      // 一户一库，不需要租户过滤
      const query = `
        SELECT 
          pt.id as transaction_id,
          pt.transaction_no,
          pt.transaction_time,
          pt.quantity,
          pt.remark,
          pt.part_id,
          p.code as part_code,
          p.name as part_name,
          p.brand as part_brand,
          p.model as part_model,
          p.category as part_category,
          pt.store_id,
          s.name as store_name,
          pt.operator_id,
          pt.operator_name,
          u.name as operator_real_name
        FROM part_transactions pt
        LEFT JOIN parts p ON pt.part_id = p.id
        LEFT JOIN stores s ON pt.store_id = s.id
        LEFT JOIN users u ON pt.operator_id = u.id
        WHERE 1=1
          AND pt.transaction_type = 'use'
          AND pt.status = 'pending'
        ORDER BY pt.transaction_time DESC
      `;
      
      const [transactions] = await pool.query(query);
      
      // 调试：输出第一条记录查看时间字段
      if (transactions.length > 0) {
        console.log('[DEBUG] 待核销列表第一条原始数据:', transactions[0]);
        const converted = keysToCamelCase(transactions[0]);
        console.log('[DEBUG] 转换后数据:', converted);
      }
      
      res.json({ ok: true, data: transactions.map(keysToCamelCase) });
    } catch (error) {
      console.error('获取待核销配件失败:', error);
      res.status(500).json({ ok: false, message: '获取待核销配件失败', error: error.message });
    }
  });

  // ================================================================
  // 13. 配件核销
  // ================================================================
  router.post('/write-off', async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      const { transactionId, equipmentId, equipmentCode, repairId, repairNumber, quantity, remark } = req.body;
      // 不再检查 companyId（多租户已移除）
      const companyId = null;
      const writeOffBy = Number(req.user?.id) || null;
      
      // 获取原领用记录
      const [transactions] = await conn.query(
        'SELECT * FROM part_transactions WHERE id = ? AND status = \'pending\' AND transaction_type = \'use\'',
        [transactionId]
      );
      
      if (transactions.length === 0) {
        await conn.rollback();
        return res.status(404).json({ ok: false, message: '未找到待核销记录' });
      }
      
      const transaction = transactions[0];
      
      // 检查核销数量
      if (quantity > transaction.quantity) {
        await conn.rollback();
        return res.status(400).json({ ok: false, message: '核销数量不能超过领用数量' });
      }
      
      // 检查库存是否充足（虽然理论上应该充足，但保险起见）
      const [stock] = await conn.query(
        'SELECT quantity FROM part_stocks WHERE part_id = ? AND store_id = ?',
        [transaction.part_id, transaction.store_id]
      );
      
      if (stock.length === 0 || stock[0].quantity < quantity) {
        await conn.rollback();
        return res.status(400).json({ ok: false, message: '库存不足，无法核销' });
      }
      
      if (quantity === transaction.quantity) {
        // 全部核销，更新原记录
        await conn.query(
          `UPDATE part_transactions 
           SET status = 'completed',
               quantity = -?,
               equipment_id = ?,
               equipment_code = ?,
               repair_id = ?,
               repair_number = ?,
               write_off_time = NOW(),
               write_off_by = ?,
               write_off_remark = ?
           WHERE id = ?`,
          [quantity, equipmentId, equipmentCode, repairId, repairNumber, writeOffBy, remark, transactionId]
        );
      } else {
        // 部分核销，需要拆分记录
        // 1. 减少原记录数量
        await conn.query(
          'UPDATE part_transactions SET quantity = quantity - ? WHERE id = ?',
          [quantity, transactionId]
        );
        
        // 2. 创建新的已核销记录
        await conn.query(
          `INSERT INTO part_transactions 
           (transaction_no, transaction_type, part_id, store_id, quantity, status,
            equipment_id, equipment_code, repair_id, repair_number, write_off_time, write_off_by, write_off_remark,
            operator_id, operator_name, company_id, remark)
           VALUES (?, 'use', ?, ?, ?, 'completed', ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)`,
          [
            `${transaction.transaction_no}-HX`,
            transaction.part_id,
            transaction.store_id,
            -quantity,
            equipmentId,
            equipmentCode,
            repairId,
            repairNumber,
            writeOffBy,
            remark,
            transaction.operator_id,
            transaction.operator_name,
            companyId,
            transaction.remark
          ]
        );
      }
      
      // 扣除库存
      await conn.query(
        'UPDATE part_stocks SET quantity = quantity - ? WHERE part_id = ? AND store_id = ?',
        [quantity, transaction.part_id, transaction.store_id]
      );
      
      await conn.commit();
      
      res.json({ ok: true, message: '核销成功' });
    } catch (error) {
      await conn.rollback();
      console.error('配件核销失败:', error);
      res.status(500).json({ ok: false, message: '配件核销失败', error: error.message });
    } finally {
      conn.release();
    }
  });

  // ================================================================
  // 14. 退回待核销配件
  // ================================================================
  router.post('/return-pending', async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      const { transactionId, quantity, remark } = req.body;
      
      // 获取原领用记录
      const [transactions] = await conn.query(
        'SELECT * FROM part_transactions WHERE id = ? AND status = \'pending\' AND transaction_type = \'use\'',
        [transactionId]
      );
      
      if (transactions.length === 0) {
        await conn.rollback();
        return res.status(404).json({ ok: false, message: '未找到待核销记录' });
      }
      
      const transaction = transactions[0];
      
      // 检查退回数量
      if (quantity > transaction.quantity) {
        await conn.rollback();
        return res.status(400).json({ ok: false, message: '退回数量不能超过领用数量' });
      }
      
      if (quantity === transaction.quantity) {
        // 全部退回，删除或标记为取消
        await conn.query(
          'UPDATE part_transactions SET status = \'cancelled\' WHERE id = ?',
          [transactionId]
        );
      } else {
        // 部分退回，减少数量
        await conn.query(
          'UPDATE part_transactions SET quantity = quantity - ? WHERE id = ?',
          [quantity, transactionId]
        );
        
        // 可选：记录退回操作
        await conn.query(
          `INSERT INTO part_transactions 
           (transaction_no, transaction_type, part_id, store_id, quantity, status,
            operator_id, operator_name, company_id, remark)
           VALUES (?, 'return', ?, ?, ?, 'completed', ?, ?, ?, ?)`,
          [
            `${transaction.transaction_no}-TH`,
            transaction.part_id,
            transaction.store_id,
            quantity,
            transaction.operator_id,
            transaction.operator_name,
            transaction.company_id,
            remark || '退回未使用配件'
          ]
        );
        
        // 退回到库存
        await conn.query(
          `INSERT INTO part_stocks (part_id, store_id, quantity) 
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
          [transaction.part_id, transaction.store_id, quantity, quantity]
        );
      }
      
      await conn.commit();
      
      res.json({ ok: true, message: '退回成功' });
    } catch (error) {
      await conn.rollback();
      console.error('退回配件失败:', error);
      res.status(500).json({ ok: false, message: '退回配件失败', error: error.message });
    } finally {
      conn.release();
    }
  });

  return router;
}
