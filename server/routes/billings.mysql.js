import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';

export default function buildBillingsRouterMySQL(pool) {
  const router = express.Router();

  // 获取账单列表
  router.get('/', asyncHandler(async (req, res) => {
    const { status, customerId, orderId, page = 1, size = 20 } = req.query;

    let sql = `
      SELECT b.*, 
             o.contract_number, o.project_name,
             c.name AS customer_name
      FROM billings b
      LEFT JOIN orders o ON b.order_id = o.id
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      sql += ' AND b.status = ?';
      params.push(status);
    }
    if (customerId) {
      sql += ' AND b.customer_id = ?';
      params.push(customerId);
    }
    if (orderId) {
      sql += ' AND b.order_id = ?';
      params.push(orderId);
    }

    sql += ' ORDER BY b.due_date DESC, b.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(size), (Number(page) - 1) * Number(size));

    const [rows] = await pool.query(sql, params);

    // 获取总数
    let countSql = `SELECT COUNT(*) as total FROM billings b WHERE 1=1`;
    const countParams = [];

    if (status) {
      countSql += ' AND b.status = ?';
      countParams.push(status);
    }
    if (customerId) {
      countSql += ' AND b.customer_id = ?';
      countParams.push(customerId);
    }
    if (orderId) {
      countSql += ' AND b.order_id = ?';
      countParams.push(orderId);
    }

    const [countRows] = await pool.query(countSql, countParams);
    const total = countRows[0]?.total || 0;

    const data = rows.map(b => ({
      id: String(b.id),
      billingNumber: b.billing_number,
      orderId: String(b.order_id),
      customerId: String(b.customer_id),
      customerName: b.customer_name,
      contractNumber: b.contract_number,
      projectName: b.project_name,
      billingType: b.billing_type,
      periodStart: b.period_start,
      periodEnd: b.period_end,
      rentalFee: Number(b.rental_fee),
      deposit: Number(b.deposit),
      shippingFee: Number(b.shipping_fee),
      modificationFee: Number(b.modification_fee),
      lateFee: Number(b.late_fee),
      adjustment: Number(b.adjustment),
      totalAmount: Number(b.total_amount),
      paidAmount: Number(b.paid_amount),
      status: b.status,
      dueDate: b.due_date,
      paidDate: b.paid_date,
      overdueDays: b.overdue_days,
      remark: b.remark,
      attachments: typeof b.attachments === 'string' ? JSON.parse(b.attachments) : b.attachments,
      createdAt: b.created_at?.toISOString?.() || b.created_at,
      updatedAt: b.updated_at?.toISOString?.() || b.updated_at,
    }));

    res.json({ ok: true, data, page: Number(page), pageSize: Number(size), total });
  }));

  // 获取单个账单详情
  router.get('/:id', asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    const [rows] = await pool.query(
      `SELECT b.*, 
              o.contract_number, o.project_name,
              c.name AS customer_name, c.phone AS customer_phone
       FROM billings b
       LEFT JOIN orders o ON b.order_id = o.id
       LEFT JOIN customers c ON b.customer_id = c.id
       WHERE b.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Billing not found' });
    }

    const b = rows[0];
    const data = {
      id: String(b.id),
      billingNumber: b.billing_number,
      orderId: String(b.order_id),
      customerId: String(b.customer_id),
      customerName: b.customer_name,
      customerPhone: b.customer_phone,
      contractNumber: b.contract_number,
      projectName: b.project_name,
      billingType: b.billing_type,
      periodStart: b.period_start,
      periodEnd: b.period_end,
      rentalFee: Number(b.rental_fee),
      deposit: Number(b.deposit),
      shippingFee: Number(b.shipping_fee),
      modificationFee: Number(b.modification_fee),
      lateFee: Number(b.late_fee),
      adjustment: Number(b.adjustment),
      totalAmount: Number(b.total_amount),
      paidAmount: Number(b.paid_amount),
      status: b.status,
      dueDate: b.due_date,
      paidDate: b.paid_date,
      overdueDays: b.overdue_days,
      remark: b.remark,
      attachments: typeof b.attachments === 'string' ? JSON.parse(b.attachments) : b.attachments,
      createdAt: b.created_at?.toISOString?.() || b.created_at,
      updatedAt: b.updated_at?.toISOString?.() || b.updated_at,
    };

    res.json({ ok: true, data });
  }));

  // 创建账单
  router.post('/', asyncHandler(async (req, res) => {
    const {
      orderId, customerId, billingType, periodStart, periodEnd,
      rentalFee, deposit, shippingFee, modificationFee, adjustment,
      dueDate, remark, attachments
    } = req.body;

    const totalAmount = Number(rentalFee || 0) + Number(deposit || 0) + 
                       Number(shippingFee || 0) + Number(modificationFee || 0) + 
                       Number(adjustment || 0);

    const billingNumber = `BILL-${Date.now()}-${orderId}`;

    const [result] = await pool.query(
      `INSERT INTO billings (
        billing_number, order_id, customer_id, billing_type,
        period_start, period_end, rental_fee, deposit, shipping_fee,
        modification_fee, adjustment, total_amount, due_date,
        remark, attachments, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        billingNumber, orderId, customerId, billingType,
        periodStart, periodEnd, rentalFee, deposit, shippingFee,
        modificationFee, adjustment, totalAmount, dueDate,
        remark, attachments ? JSON.stringify(attachments) : null
      ]
    );

    res.json({ ok: true, id: result.insertId, billingNumber });
  }));

  // 更新账单
  router.put('/:id', asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const {
      billingType, periodStart, periodEnd,
      rentalFee, deposit, shippingFee, modificationFee, adjustment,
      dueDate, remark, attachments
    } = req.body;

    const totalAmount = Number(rentalFee || 0) + Number(deposit || 0) + 
                       Number(shippingFee || 0) + Number(modificationFee || 0) + 
                       Number(adjustment || 0);

    await pool.query(
      `UPDATE billings SET
        billing_type = ?, period_start = ?, period_end = ?,
        rental_fee = ?, deposit = ?, shipping_fee = ?,
        modification_fee = ?, adjustment = ?, total_amount = ?,
        due_date = ?, remark = ?, attachments = ?,
        updated_at = NOW()
      WHERE id = ?`,
      [
        billingType, periodStart, periodEnd,
        rentalFee, deposit, shippingFee,
        modificationFee, adjustment, totalAmount,
        dueDate, remark, attachments ? JSON.stringify(attachments) : null,
        id
      ]
    );

    res.json({ ok: true });
  }));

  // 记录付款
  router.post('/:id/payment', asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { amount, paymentDate } = req.body;

    const [rows] = await pool.query(
      'SELECT paid_amount, total_amount FROM billings WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Billing not found' });
    }

    const billing = rows[0];
    const newPaidAmount = Number(billing.paid_amount) + Number(amount);
    const totalAmount = Number(billing.total_amount);

    let status = 'unpaid';
    if (newPaidAmount >= totalAmount) {
      status = 'paid';
    } else if (newPaidAmount > 0) {
      status = 'partial';
    }

    await pool.query(
      `UPDATE billings SET
        paid_amount = ?,
        status = ?,
        paid_date = COALESCE(paid_date, ?),
        updated_at = NOW()
      WHERE id = ?`,
      [newPaidAmount, status, paymentDate || new Date(), id]
    );

    res.json({ ok: true, paidAmount: newPaidAmount, status });
  }));

  // 取消账单
  router.delete('/:id', asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    await pool.query(
      'UPDATE billings SET status = ?, updated_at = NOW() WHERE id = ?',
      ['cancelled', id]
    );

    res.json({ ok: true });
  }));

  // 获取账单统计
  router.get('/stats/summary', asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = ' AND due_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as totalCount,
        SUM(CASE WHEN status = 'unpaid' THEN 1 ELSE 0 END) as unpaidCount,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paidCount,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdueCount,
        SUM(total_amount) as totalAmount,
        SUM(paid_amount) as paidAmount,
        SUM(total_amount - paid_amount) as unpaidAmount
      FROM billings
      WHERE status != 'cancelled' ${dateFilter}
    `, params);

    res.json({ ok: true, data: stats[0] });
  }));

  return router;
}

