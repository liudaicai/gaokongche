// 一户一库，不需要租户过滤
/**
 * 合同续约提醒 - API路由
 */
import express from 'express';
import { tenantMiddleware } from '../middleware/tenant.js';
export default function buildContractRenewalsRouter(pool) {
  const router = express.Router();

  // 创建续约提醒
  router.post('/:orderId/renewal-reminder', tenantMiddleware, async (req, res) => {
    try {
      const { orderId } = req.params;
      const {
        renewalType,  // 'specific_date' or 'renewal_period'
        nextReminderDate,  // 指定日期模式
        renewalPeriodMonths,  // 续约期限模式
        renewalStartDate,  // 续约开始日期
        advanceDays = 7,
        note
      } = req.body;

      if (!renewalType || !['specific_date', 'renewal_period'].includes(renewalType)) {
        return res.status(400).json({ ok: false, error: '续约类型不正确' });
      }

      if (renewalType === 'specific_date' && !nextReminderDate) {
        return res.status(400).json({ ok: false, error: '请指定下次提醒日期' });
      }

      if (renewalType === 'renewal_period' && (!renewalPeriodMonths || !renewalStartDate)) {
        return res.status(400).json({ ok: false, error: '请指定续约期限和开始日期' });
      }

      const userId = req.user?.id;
      const companyId = req.user?.companyId || null;
      // 一户一库，不需要租户过滤
      // 获取订单信息
      const [orderRows] = await pool.query(
        `SELECT contract_number, customer_id, customer_name 
         FROM orders 
         WHERE id = ? AND 1=1`,
        [orderId]
      );

      if (orderRows.length === 0) {
        return res.status(404).json({ ok: false, error: '订单不存在' });
      }

      const order = orderRows[0];
      let calculatedReminderDate = null;

      // 计算提醒日期（续约期限模式）
      if (renewalType === 'renewal_period') {
        const startDate = new Date(renewalStartDate);
        const expiryDate = new Date(startDate);
        expiryDate.setMonth(expiryDate.getMonth() + renewalPeriodMonths);
        
        const reminderDate = new Date(expiryDate);
        reminderDate.setDate(reminderDate.getDate() - advanceDays);
        
        calculatedReminderDate = reminderDate.toISOString().split('T')[0];
      }

      // 插入续约记录
      const [result] = await pool.query(
        `INSERT INTO contract_renewal_records (
          order_id, contract_number, customer_id, customer_name,
          renewal_type, next_reminder_date, renewal_period_months, renewal_start_date,
          calculated_reminder_date, advance_days, status, handle_note,
          company_id, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId, order.contract_number, order.customer_id, order.customer_name,
          renewalType, nextReminderDate, renewalPeriodMonths, renewalStartDate,
          calculatedReminderDate, advanceDays, 'pending', note,
          companyId, userId
        ]
      );

      res.json({
        ok: true,
        data: {
          id: result.insertId,
          orderId,
          renewalType,
          calculatedReminderDate: renewalType === 'renewal_period' ? calculatedReminderDate : nextReminderDate
        },
        message: '续约提醒创建成功'
      });
    } catch (error) {
      console.error('[ContractRenewals] Create reminder error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 获取订单的续约提醒列表
  router.get('/:orderId/renewal-reminders', tenantMiddleware, async (req, res) => {
    try {
      const { orderId } = req.params;
      // 一户一库，不需要租户过滤
      const [rows] = await pool.query(
        `SELECT * FROM contract_renewal_records 
         WHERE order_id = ? AND 1=1
         ORDER BY created_at DESC`,
        [orderId]
      );

      const list = rows.map(row => ({
        id: row.id,
        orderId: row.order_id,
        contractNumber: row.contract_number,
        customerId: row.customer_id,
        customerName: row.customer_name,
        renewalType: row.renewal_type,
        nextReminderDate: row.next_reminder_date,
        renewalPeriodMonths: row.renewal_period_months,
        renewalStartDate: row.renewal_start_date,
        calculatedReminderDate: row.calculated_reminder_date,
        advanceDays: row.advance_days,
        isReminded: Boolean(row.is_reminded),
        remindedAt: row.reminded_at,
        status: row.status,
        handledBy: row.handled_by,
        handledAt: row.handled_at,
        handleNote: row.handle_note,
        createdAt: row.created_at
      }));

      res.json({ ok: true, data: list });
    } catch (error) {
      console.error('[ContractRenewals] Get reminders error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 更新续约提醒
  router.put('/:orderId/renewal-reminders/:id', tenantMiddleware, async (req, res) => {
    try {
      const { orderId, id } = req.params;
      const {
        renewalType,
        nextReminderDate,
        renewalPeriodMonths,
        renewalStartDate,
        advanceDays,
        note
      } = req.body;

      // 一户一库，不需要租户过滤
      // 检查记录是否存在
      const [existing] = await pool.query(
        `SELECT * FROM contract_renewal_records 
         WHERE id = ? AND order_id = ? AND 1=1`,
        [id, orderId]
      );

      if (existing.length === 0) {
        return res.status(404).json({ ok: false, error: '续约提醒不存在' });
      }

      const updates = [];
      const values = [];

      if (renewalType) {
        updates.push('renewal_type = ?');
        values.push(renewalType);
      }
      
      if (nextReminderDate !== undefined) {
        updates.push('next_reminder_date = ?');
        values.push(nextReminderDate);
      }
      
      if (renewalPeriodMonths !== undefined) {
        updates.push('renewal_period_months = ?');
        values.push(renewalPeriodMonths);
      }
      
      if (renewalStartDate !== undefined) {
        updates.push('renewal_start_date = ?');
        values.push(renewalStartDate);
      }
      
      if (advanceDays !== undefined) {
        updates.push('advance_days = ?');
        values.push(advanceDays);
      }

      // 重新计算提醒日期（如果是续约期限模式）
      if (renewalType === 'renewal_period' && renewalPeriodMonths && renewalStartDate && advanceDays !== undefined) {
        const startDate = new Date(renewalStartDate);
        const expiryDate = new Date(startDate);
        expiryDate.setMonth(expiryDate.getMonth() + renewalPeriodMonths);
        
        const reminderDate = new Date(expiryDate);
        reminderDate.setDate(reminderDate.getDate() - advanceDays);
        
        const calculatedReminderDate = reminderDate.toISOString().split('T')[0];
        
        updates.push('calculated_reminder_date = ?');
        values.push(calculatedReminderDate);
      }
      
      if (note !== undefined) {
        updates.push('handle_note = ?');
        values.push(note);
      }

      // 重置提醒状态
      updates.push('is_reminded = ?');
      values.push(false);

      if (updates.length > 0) {
        await pool.query(
          `UPDATE contract_renewal_records 
           SET ${updates.join(', ')}
           WHERE id = ? AND order_id = ? AND 1=1`,
          [...values, id, orderId]
        );
      }

      res.json({ ok: true, message: '续约提醒更新成功' });
    } catch (error) {
      console.error('[ContractRenewals] Update reminder error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 删除续约提醒
  router.delete('/:orderId/renewal-reminders/:id', tenantMiddleware, async (req, res) => {
    try {
      const { orderId, id } = req.params;
      // 一户一库，不需要租户过滤
      await pool.query(
        `DELETE FROM contract_renewal_records 
         WHERE id = ? AND order_id = ? AND 1=1`,
        [id, orderId]
      );

      res.json({ ok: true, message: '续约提醒删除成功' });
    } catch (error) {
      console.error('[ContractRenewals] Delete reminder error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // 标记续约提醒为已完成
  router.put('/:orderId/renewal-reminders/:id/complete', tenantMiddleware, async (req, res) => {
    try {
      const { orderId, id } = req.params;
      const { note } = req.body;
      const userId = req.user?.id;
      // 一户一库，不需要租户过滤
      await pool.query(
        `UPDATE contract_renewal_records 
         SET status = 'completed', handled_by = ?, handled_at = NOW(3), handle_note = ?
         WHERE id = ? AND order_id = ? AND 1=1`,
        [userId, note, id, orderId]
      );

      res.json({ ok: true, message: '续约提醒已完成' });
    } catch (error) {
      console.error('[ContractRenewals] Complete reminder error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}

