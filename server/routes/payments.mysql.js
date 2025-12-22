/**
 * 收款管理API
 * 收款登记、收据打印、财务审核
 */

import express from 'express';
export default function buildPaymentsRouter(pool) {
  const router = express.Router();

  // ==================== 1. 收款记录列表 ====================
  router.get('/', async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 20;
      const offset = (page - 1) * pageSize;
      const orderId = req.query.orderId || '';
      const paymentType = req.query.type || '';
      const status = req.query.status || '';
      
      let whereClause = 'WHERE 1=1';
      const params = [];

      // 不再检查 company_id（多租户已移除）
      
      if (orderId) {
        whereClause += ' AND r.order_id = ?';
        params.push(orderId);
      }
      
      if (paymentType) {
        whereClause += ' AND r.type = ?';
        params.push(paymentType);
      }
      
      if (status) {
        whereClause += ' AND r.status = ?';
        params.push(status);
      }
      
      const [countRows] = await pool.query(
        `SELECT COUNT(*) as total FROM order_receipts r ${whereClause}`,
        params
      );
      
      const [rows] = await pool.query(
        `SELECT r.*, o.contract_number, c.name as customer_name
         FROM order_receipts r
         LEFT JOIN orders o ON r.order_id = o.id
         LEFT JOIN customers c ON o.customer_id = c.id
         ${whereClause}
         ORDER BY r.receipt_date DESC, r.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
      
      res.json({
        ok: true,
        data: rows,
        pagination: {
          page,
          pageSize,
          total: countRows[0]?.total || 0
        }
      });
    } catch (err) {
      console.error('[Payments] List error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // ==================== 2. 获取订单收款汇总 ====================
  router.get('/order/:orderId/summary', async (req, res) => {
    try {
      const { orderId } = req.params;
      
      const [rows] = await pool.query(
        `SELECT
          SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as totalDeposit,
          SUM(CASE WHEN type = 'rent' THEN amount ELSE 0 END) as totalRent,
          SUM(CASE WHEN type = 'transport' THEN amount ELSE 0 END) as totalTransport,
          SUM(CASE WHEN type = 'claim' THEN amount ELSE 0 END) as totalClaim,
          SUM(CASE WHEN type = 'other' THEN amount ELSE 0 END) as totalOther,
          SUM(amount) as totalAmount,
          COUNT(*) as receiptCount
         FROM order_receipts
         WHERE order_id = ?`,
        [orderId]
      );
      
      res.json({ ok: true, data: rows[0] });
    } catch (err) {
      console.error('[Payments] Get summary error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // ==================== 3. 创建收款记录 ====================
  router.post('/', async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      const data = req.body;
      
      // 生成收款单号
      const receiptNumber = `RCP${Date.now()}`;
      
      const [result] = await conn.query(
        `INSERT INTO order_receipts (
          order_id, receipt_number, receipt_date, type, amount,
          payment_method, payer_name, bank_account, transaction_id,
          notes, status, company_id, received_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
        [
          data.orderId,
          receiptNumber,
          data.receiptDate || new Date().toISOString().split('T')[0],
          data.type,
          data.amount,
          data.paymentMethod || 'cash',
          data.payerName || '',
          data.bankAccount || null,
          data.transactionId || null,
          data.notes || '',
          'pending',
          null, // company_id 已移除
          req.userId || null
        ]
      );
      
      // 如果是押金收款，更新客户信用额度
      if (data.type === 'deposit') {
        const [orderRows] = await conn.query(
          'SELECT customer_id FROM orders WHERE id = ?',
          [data.orderId]
        );
        
        if (orderRows.length > 0) {
          const customerId = orderRows[0].customer_id;
          
          // 消费信用额度
          await conn.query(
            'UPDATE customers SET available_credit = available_credit - ?, updated_at = NOW(3) WHERE id = ?',
            [data.amount, customerId]
          );
          
          // 记录信用历史
          const [creditRows] = await conn.query(
            'SELECT available_credit FROM customers WHERE id = ?',
            [customerId]
          );
          
          if (creditRows.length > 0) {
            await conn.query(
              `INSERT INTO customer_credit_history (
                customer_id, action, amount, before_amount, after_amount,
                reason, related_order_id, operator_id, created_at
              ) VALUES (?, 'consume', ?, ?, ?, ?, ?, ?, NOW(3))`,
              [
                customerId,
                -data.amount,
                creditRows[0].available_credit + data.amount,
                creditRows[0].available_credit,
                '订单押金收款',
                data.orderId,
                req.userId || null
              ]
            );
          }
        }
      }
      
      await conn.commit();
      res.json({ ok: true, data: { id: result.insertId, receiptNumber } });
    } catch (err) {
      await conn.rollback();
      console.error('[Payments] Create error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    } finally {
      conn.release();
    }
  });

  // ==================== 4. 更新收款记录 ====================
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      
      await pool.query(
        `UPDATE order_receipts SET
          receipt_date = ?, type = ?, amount = ?, payment_method = ?,
          payer_name = ?, bank_account = ?, transaction_id = ?, notes = ?,
          updated_at = NOW(3)
         WHERE id = ? AND status = 'pending'`,
        [
          data.receiptDate,
          data.type,
          data.amount,
          data.paymentMethod,
          data.payerName || '',
          data.bankAccount || null,
          data.transactionId || null,
          data.notes || '',
          id
        ]
      );
      
      res.json({ ok: true });
    } catch (err) {
      console.error('[Payments] Update error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // ==================== 5. 删除收款记录 ====================
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // 只允许删除待审核状态的记录
      const [result] = await pool.query(
        'DELETE FROM order_receipts WHERE id = ? AND status = "pending"',
        [id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(400).json({ 
          ok: false, 
          error: '只能删除待审核状态的收款记录' 
        });
      }
      
      res.json({ ok: true });
    } catch (err) {
      console.error('[Payments] Delete error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // ==================== 6. 财务审核 ====================
  router.post('/:id/audit', async (req, res) => {
    try {
      const { id } = req.params;
      const { approved, notes } = req.body;
      
      await pool.query(
        `UPDATE order_receipts SET
          status = ?,
          audited_by = ?,
          audited_at = NOW(3),
          audit_notes = ?,
          updated_at = NOW(3)
         WHERE id = ?`,
        [
          approved ? 'approved' : 'rejected',
          req.userId || null,
          notes || '',
          id
        ]
      );
      
      res.json({ ok: true });
    } catch (err) {
      console.error('[Payments] Audit error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // ==================== 6. 作废收款记录 ====================
  router.put('/:id/void', async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      const { id } = req.params;
      const { reason } = req.body;
      
      // 获取收款信息
      const [rows] = await conn.query(
        'SELECT order_id, type, amount FROM order_receipts WHERE id = ?',
        [id]
      );
      
      if (rows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ ok: false, error: '收款记录不存在' });
      }
      
      const { order_id, type, amount } = rows[0];
      
      // 标记为作废
      await conn.query(
        `UPDATE order_receipts SET
          status = 'voided',
          void_reason = ?,
          voided_by = ?,
          voided_at = NOW(3),
          updated_at = NOW(3)
         WHERE id = ?`,
        [reason || '', req.userId || null, id]
      );
      
      // 如果是押金，恢复信用额度
      if (type === 'deposit') {
        const [orderRows] = await conn.query(
          'SELECT customer_id FROM orders WHERE id = ?',
          [order_id]
        );
        
        if (orderRows.length > 0) {
          await conn.query(
            'UPDATE customers SET available_credit = available_credit + ?, updated_at = NOW(3) WHERE id = ?',
            [amount, orderRows[0].customer_id]
          );
        }
      }
      
      await conn.commit();
      res.json({ ok: true });
    } catch (err) {
      await conn.rollback();
      console.error('[Payments] Void error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    } finally {
      conn.release();
    }
  });

  // ==================== 7. 打印收据 ====================
  router.get('/:id/receipt', async (req, res) => {
    try {
      const { id } = req.params;
      
      const [rows] = await pool.query(
        `SELECT r.*, o.contract_number, c.name as customer_name, c.phone as customer_phone
         FROM order_receipts r
         LEFT JOIN orders o ON r.order_id = o.id
         LEFT JOIN customers c ON o.customer_id = c.id
         WHERE r.id = ?`,
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: '收款记录不存在' });
      }
      
      res.json({ ok: true, data: rows[0] });
    } catch (err) {
      console.error('[Payments] Get receipt error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // ==================== 8. 收款统计 ====================
  router.get('/statistics/summary', async (req, res) => {
    try {
      const startDate = req.query.startDate || '';
      const endDate = req.query.endDate || '';
      
      let whereClause = 'WHERE 1=1';
      const params = [];

      // 不再检查 company_id（多租户已移除）
      
      if (startDate) {
        whereClause += ' AND receipt_date >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        whereClause += ' AND receipt_date <= ?';
        params.push(endDate);
      }
      
      whereClause += ' AND status = \'approved\'';
      
      const [rows] = await pool.query(
        `SELECT
          COUNT(*) as totalReceipts,
          SUM(amount) as totalAmount,
          SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as depositAmount,
          SUM(CASE WHEN type = 'rent' THEN amount ELSE 0 END) as rentAmount,
          SUM(CASE WHEN type = 'transport' THEN amount ELSE 0 END) as transportAmount
         FROM order_receipts
         ${whereClause}`,
        params
      );
      
      res.json({ ok: true, data: rows[0] });
    } catch (err) {
      console.error('[Payments] Statistics error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  return router;
}

