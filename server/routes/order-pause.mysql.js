/**
 * 订单报停管理API
 * 报停申请、审批、结束报停
 */

import express from 'express';
export default function buildOrderPauseRouter(pool) {
  const router = express.Router();

  // ==================== 1. 报停列表 ====================
  router.get('/', async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 20;
      const offset = (page - 1) * pageSize;
      const orderId = req.query.orderId || '';
      const status = req.query.status || '';
      
      let whereClause = 'WHERE 1=1';
      const params = [];

      // 不再检查 company_id（多租户已移除）
      
      if (orderId) {
        whereClause += ' AND s.order_id = ?';
        params.push(orderId);
      }
      
      if (status) {
        whereClause += ' AND s.status = ?';
        params.push(status);
      }
      
      const [countRows] = await pool.query(
        `SELECT COUNT(*) as total FROM order_suspensions s ${whereClause}`,
        params
      );
      
      const [rows] = await pool.query(
        `SELECT s.*, o.contract_number, e.code as equipment_code
         FROM order_suspensions s
         LEFT JOIN orders o ON s.order_id = o.id
         LEFT JOIN equipments e ON s.equipment_id = e.id
         ${whereClause}
         ORDER BY s.created_at DESC
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
      console.error('[OrderPause] List error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // ==================== 2. 创建报停申请 ====================
  router.post('/', async (req, res) => {
    try {
      const data = req.body;
      
      const [result] = await pool.query(
        `INSERT INTO order_suspensions (
          order_id, equipment_id, pause_reason, pause_start_date, pause_end_date,
          estimated_days, approval_status, status, company_id, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
        [
          data.orderId,
          data.equipmentId || null,
          data.pauseReason || '',
          data.pauseStartDate,
          data.pauseEndDate || null,
          data.estimatedDays || null,
          'pending',
          'pending',
          null, // company_id 已移除
          req.userId || null
        ]
      );
      
      res.json({ ok: true, data: { id: result.insertId } });
    } catch (err) {
      console.error('[OrderPause] Create error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // ==================== 3. 审批报停 ====================
  router.post('/:id/approve', async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      
      const { id } = req.params;
      const { approved, notes } = req.body;
      
      if (approved) {
        // 审批通过，标记为生效
        await conn.query(
          `UPDATE order_suspensions SET
            approval_status = 'approved',
            approved_by = ?,
            approved_at = NOW(3),
            status = 'active',
            updated_at = NOW(3)
           WHERE id = ?`,
          [req.userId || null, id]
        );
      } else {
        // 审批拒绝
        await conn.query(
          `UPDATE order_suspensions SET
            approval_status = 'rejected',
            approved_by = ?,
            approved_at = NOW(3),
            status = 'rejected',
            updated_at = NOW(3)
           WHERE id = ?`,
          [req.userId || null, id]
        );
      }
      
      await conn.commit();
      res.json({ ok: true });
    } catch (err) {
      await conn.rollback();
      console.error('[OrderPause] Approve error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    } finally {
      conn.release();
    }
  });

  // ==================== 4. 结束报停 ====================
  router.post('/:id/end', async (req, res) => {
    try {
      const { id } = req.params;
      const { actualEndDate, notes } = req.body;
      
      // 计算实际报停天数
      const [rows] = await pool.query(
        'SELECT pause_start_date FROM order_suspensions WHERE id = ?',
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: '报停记录不存在' });
      }
      
      const startDate = new Date(rows[0].pause_start_date);
      const endDate = new Date(actualEndDate);
      const actualDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      await pool.query(
        `UPDATE order_suspensions SET
          pause_end_date = ?,
          actual_days = ?,
          status = 'ended',
          updated_at = NOW(3)
         WHERE id = ?`,
        [actualEndDate, actualDays, id]
      );
      
      res.json({ ok: true, data: { actualDays } });
    } catch (err) {
      console.error('[OrderPause] End error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // ==================== 5. 取消报停 ====================
  router.put('/:id/cancel', async (req, res) => {
    try {
      const { id } = req.params;
      
      await pool.query(
        'UPDATE order_suspensions SET status = ?, updated_at = NOW(3) WHERE id = ?',
        ['cancelled', id]
      );
      
      res.json({ ok: true });
    } catch (err) {
      console.error('[OrderPause] Cancel error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // ==================== 6. 报停统计 ====================
  router.get('/statistics/summary', async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT
          COUNT(*) as totalPauses,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activePauses,
          SUM(actual_days) as totalDays,
          AVG(actual_days) as avgDays
         FROM order_suspensions
         WHERE 1=1`, // 查看所有数据
        []
      );
      
      res.json({ ok: true, data: rows[0] });
    } catch (err) {
      console.error('[OrderPause] Statistics error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  return router;
}

