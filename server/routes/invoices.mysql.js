import express from 'express';
// ✅ 多租户已移除 (2025-12-21)

/**
 * 订单发票管理路由
 * 提供发票的增删改查功能
 */

const toDto = (row) => ({
  id: String(row.id),
  orderId: String(row.order_id),
  invoiceNumber: row.invoice_number,
  invoiceType: row.invoice_type,
  invoiceDate: row.invoice_date,
  invoiceTitle: row.invoice_title,
  taxNumber: row.tax_number,
  invoiceContent: row.invoice_content,
  amount: Number(row.amount),
  taxRate: Number(row.tax_rate),
  taxAmount: Number(row.tax_amount),
  totalAmount: Number(row.total_amount),
  invoiceStatus: row.invoice_status,
  sentDate: row.sent_date,
  receivedDate: row.received_date,
  cancelledDate: row.cancelled_date,
  cancelledReason: row.cancelled_reason,
  recipientName: row.recipient_name,
  recipientPhone: row.recipient_phone,
  recipientAddress: row.recipient_address,
  expressCompany: row.express_company,
  expressNumber: row.express_number,
  issuerCompany: row.issuer_company,
  receiverCompany: row.receiver_company,
  attachments: row.attachments || [],
  notes: row.notes,
  createdBy: row.created_by ? String(row.created_by) : null,
  sentBy: row.sent_by ? String(row.sent_by) : null,
  cancelledBy: row.cancelled_by ? String(row.cancelled_by) : null,
  createdAt: row.created_at?.toISOString?.() || row.created_at,
  updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
  // 关联信息
  orderContractNumber: row.order_contract_number,
  customerName: row.customer_name,
});

export default function buildInvoicesRouter(pool) {
  const router = express.Router();

  // 获取指定订单的所有发票
  router.get('/order/:orderId', async (req, res) => {
    try {
      const orderId = Number(req.params.orderId);
      if (!Number.isFinite(orderId) || orderId <= 0) {
        return res.status(400).json({ ok: false, error: 'Invalid order ID' });
      }

      console.log('[Invoices.MySQL] Fetching invoices for order:', orderId);

      const sql = `
        SELECT 
          i.*,
          o.contract_number AS order_contract_number,
          c.name AS customer_name
        FROM order_invoices i
        LEFT JOIN orders o ON o.id = i.order_id
        LEFT JOIN customers c ON c.id = o.customer_id
        WHERE i.order_id = ?
        ORDER BY i.invoice_date DESC, i.created_at DESC
      `;

      const [rows] = await pool.query(sql, [orderId]);
      console.log('[Invoices.MySQL] Found invoices:', rows.length);
      
      res.json({ ok: true, data: rows.map(toDto) });
    } catch (err) {
      console.error('[Invoices.MySQL] List error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Failed to fetch invoices' });
    }
  });

  // 获取所有发票（带分页和筛选）
  router.get('/', async (req, res) => {
    try {
      const { page = '1', pageSize = '20', status, type, orderId } = req.query;
      const offset = (Number(page) - 1) * Number(pageSize);

      console.log('[Invoices.MySQL] Fetching invoices list');

      let whereConditions = ['1=1'];
      const params = [];

      if (status) {
        whereConditions.push('i.invoice_status = ?');
        params.push(status);
      }
      if (type) {
        whereConditions.push('i.invoice_type = ?');
        params.push(type);
      }
      if (orderId) {
        whereConditions.push('i.order_id = ?');
        params.push(Number(orderId));
      }

      const whereClause = whereConditions.join(' AND ');

      // 查询总数
      const countSql = `
        SELECT COUNT(*) AS total
        FROM order_invoices i
        WHERE ${whereClause}
      `;
      const [countRows] = await pool.query(countSql, params);
      const total = countRows[0].total;

      // 查询数据
      const sql = `
        SELECT 
          i.*,
          o.contract_number AS order_contract_number,
          c.name AS customer_name
        FROM order_invoices i
        LEFT JOIN orders o ON o.id = i.order_id
        LEFT JOIN customers c ON c.id = o.customer_id
        WHERE ${whereClause}
        ORDER BY i.invoice_date DESC, i.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const [rows] = await pool.query(sql, [...params, Number(pageSize), offset]);
      console.log('[Invoices.MySQL] Found invoices:', rows.length);

      res.json({
        ok: true,
        data: rows.map(toDto),
        page: Number(page),
        pageSize: Number(pageSize),
        total: Number(total),
      });
    } catch (err) {
      console.error('[Invoices.MySQL] List error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Failed to fetch invoices' });
    }
  });

  // 获取单个发票详情
  router.get('/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ ok: false, error: 'Invalid invoice ID' });
      }

      console.log('[Invoices.MySQL] Fetching invoice:', id);

      const sql = `
        SELECT 
          i.*,
          o.contract_number AS order_contract_number,
          c.name AS customer_name
        FROM order_invoices i
        LEFT JOIN orders o ON o.id = i.order_id
        LEFT JOIN customers c ON c.id = o.customer_id
        WHERE i.id = ?
      `;

      const [rows] = await pool.query(sql, [id]);
      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Invoice not found' });
      }

      res.json({ ok: true, data: toDto(rows[0]) });
    } catch (err) {
      console.error('[Invoices.MySQL] Get error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Failed to fetch invoice' });
    }
  });

  // 创建发票
  router.post('/', async (req, res) => {
    try {
      const {
        orderId,
        invoiceNumber,
        invoiceType = 'vat_normal',
        invoiceDate,
        invoiceTitle,
        taxNumber,
        invoiceContent,
        amount,
        taxRate,
        taxAmount,
        totalAmount,
        recipientName,
        recipientPhone,
        recipientAddress,
        issuerCompany,
        receiverCompany,
        attachments,
        notes,
      } = req.body;

      console.log('[Invoices.MySQL] Creating invoice:', { orderId, invoiceNumber });

      // 验证必填字段（发票申请阶段，只需要订单ID、发票号码、开票日期）
      if (!orderId || !invoiceNumber || !invoiceDate) {
        return res.status(400).json({
          ok: false,
          error: '缺少必填字段：订单ID、发票号码、开票日期',
        });
      }

      // 验证订单是否存在
      const [orderRows] = await pool.query('SELECT id FROM orders WHERE id = ?', [Number(orderId)]);
      if (orderRows.length === 0) {
        return res.status(404).json({ ok: false, error: '订单不存在' });
      }

      // 检查发票号码是否已存在
      const [existingRows] = await pool.query(
        'SELECT id FROM order_invoices WHERE invoice_number = ?',
        [invoiceNumber]
      );
      if (existingRows.length > 0) {
        return res.status(409).json({ ok: false, error: '发票号码已存在' });
      }

      // 插入发票记录
      const sql = `
        INSERT INTO order_invoices (
          order_id, invoice_number, invoice_type, invoice_date,
          invoice_title, tax_number, invoice_content,
          amount, tax_rate, tax_amount, total_amount,
          recipient_name, recipient_phone, recipient_address,
          issuer_company, receiver_company, attachments,
          notes, created_by, invoice_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'issued')
      `;

      const [result] = await pool.query(sql, [
        Number(orderId),
        invoiceNumber,
        invoiceType,
        invoiceDate,
        invoiceTitle,
        taxNumber,
        invoiceContent || null,
        Number(amount) || 0,
        Number(taxRate) || 0,
        Number(taxAmount) || 0,
        Number(totalAmount) || 0,
        recipientName || null,
        recipientPhone || null,
        recipientAddress || null,
        issuerCompany || null,
        receiverCompany || null,
        attachments ? JSON.stringify(attachments) : null,
        notes || null,
        req.user?.userId || null,
      ]);

      console.log('[Invoices.MySQL] Invoice created:', result.insertId);

      res.status(201).json({
        ok: true,
        data: { id: String(result.insertId) },
      });
    } catch (err) {
      console.error('[Invoices.MySQL] Create error:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ ok: false, error: '发票号码已存在' });
      }
      res.status(500).json({ ok: false, error: err?.message || 'Failed to create invoice' });
    }
  });

  // 更新发票
  router.put('/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ ok: false, error: 'Invalid invoice ID' });
      }

      const {
        invoiceNumber,
        invoiceType,
        invoiceDate,
        invoiceTitle,
        taxNumber,
        invoiceContent,
        amount,
        taxRate,
        taxAmount,
        totalAmount,
        invoiceStatus,
        sentDate,
        receivedDate,
        recipientName,
        recipientPhone,
        recipientAddress,
        expressCompany,
        expressNumber,
        notes,
      } = req.body;

      console.log('[Invoices.MySQL] Updating invoice:', id);

      // 检查发票是否存在
      const [existing] = await pool.query('SELECT id FROM order_invoices WHERE id = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ ok: false, error: 'Invoice not found' });
      }

      // 构建更新语句
      const updates = [];
      const params = [];

      if (invoiceNumber !== undefined) {
        updates.push('invoice_number = ?');
        params.push(invoiceNumber);
      }
      if (invoiceType !== undefined) {
        updates.push('invoice_type = ?');
        params.push(invoiceType);
      }
      if (invoiceDate !== undefined) {
        updates.push('invoice_date = ?');
        params.push(invoiceDate);
      }
      if (invoiceTitle !== undefined) {
        updates.push('invoice_title = ?');
        params.push(invoiceTitle);
      }
      if (taxNumber !== undefined) {
        updates.push('tax_number = ?');
        params.push(taxNumber);
      }
      if (invoiceContent !== undefined) {
        updates.push('invoice_content = ?');
        params.push(invoiceContent);
      }
      if (amount !== undefined) {
        updates.push('amount = ?');
        params.push(Number(amount));
      }
      if (taxRate !== undefined) {
        updates.push('tax_rate = ?');
        params.push(Number(taxRate));
      }
      if (taxAmount !== undefined) {
        updates.push('tax_amount = ?');
        params.push(Number(taxAmount));
      }
      if (totalAmount !== undefined) {
        updates.push('total_amount = ?');
        params.push(Number(totalAmount));
      }
      if (invoiceStatus !== undefined) {
        updates.push('invoice_status = ?');
        params.push(invoiceStatus);
      }
      if (sentDate !== undefined) {
        updates.push('sent_date = ?');
        params.push(sentDate);
        if (sentDate && !existing[0].sent_by) {
          updates.push('sent_by = ?');
          params.push(req.user?.userId || null);
        }
      }
      if (receivedDate !== undefined) {
        updates.push('received_date = ?');
        params.push(receivedDate);
      }
      if (recipientName !== undefined) {
        updates.push('recipient_name = ?');
        params.push(recipientName);
      }
      if (recipientPhone !== undefined) {
        updates.push('recipient_phone = ?');
        params.push(recipientPhone);
      }
      if (recipientAddress !== undefined) {
        updates.push('recipient_address = ?');
        params.push(recipientAddress);
      }
      if (expressCompany !== undefined) {
        updates.push('express_company = ?');
        params.push(expressCompany);
      }
      if (expressNumber !== undefined) {
        updates.push('express_number = ?');
        params.push(expressNumber);
      }
      if (req.body.issuerCompany !== undefined) {
        updates.push('issuer_company = ?');
        params.push(req.body.issuerCompany);
      }
      if (req.body.receiverCompany !== undefined) {
        updates.push('receiver_company = ?');
        params.push(req.body.receiverCompany);
      }
      if (req.body.attachments !== undefined) {
        updates.push('attachments = ?');
        params.push(JSON.stringify(req.body.attachments));
      }
      if (notes !== undefined) {
        updates.push('notes = ?');
        params.push(notes);
      }

      if (updates.length === 0) {
        return res.status(400).json({ ok: false, error: 'No fields to update' });
      }

      const sql = `UPDATE order_invoices SET ${updates.join(', ')} WHERE id = ?`;
      params.push(id);

      await pool.query(sql, params);
      console.log('[Invoices.MySQL] Invoice updated:', id);

      res.json({ ok: true, data: { id: String(id) } });
    } catch (err) {
      console.error('[Invoices.MySQL] Update error:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ ok: false, error: '发票号码已存在' });
      }
      res.status(500).json({ ok: false, error: err?.message || 'Failed to update invoice' });
    }
  });

  // 作废发票
  router.post('/:id/cancel', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ ok: false, error: 'Invalid invoice ID' });
      }

      const { reason } = req.body;

      console.log('[Invoices.MySQL] Cancelling invoice:', id);

      // 检查发票是否存在
      const [existing] = await pool.query(
        'SELECT id, invoice_status FROM order_invoices WHERE id = ?',
        [id]
      );
      if (existing.length === 0) {
        return res.status(404).json({ ok: false, error: 'Invoice not found' });
      }

      if (existing[0].invoice_status === 'cancelled') {
        return res.status(400).json({ ok: false, error: '发票已作废' });
      }

      // 更新发票状态为已作废
      const sql = `
        UPDATE order_invoices 
        SET invoice_status = 'cancelled',
            cancelled_date = CURRENT_DATE,
            cancelled_reason = ?,
            cancelled_by = ?
        WHERE id = ?
      `;

      await pool.query(sql, [reason || null, req.user?.userId || null, id]);
      console.log('[Invoices.MySQL] Invoice cancelled:', id);

      res.json({ ok: true, data: { id: String(id) } });
    } catch (err) {
      console.error('[Invoices.MySQL] Cancel error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Failed to cancel invoice' });
    }
  });

  // 删除发票
  router.delete('/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ ok: false, error: 'Invalid invoice ID' });
      }

      console.log('[Invoices.MySQL] Deleting invoice:', id);

      // 检查发票是否存在
      const [existing] = await pool.query('SELECT id FROM order_invoices WHERE id = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ ok: false, error: 'Invoice not found' });
      }

      await pool.query('DELETE FROM order_invoices WHERE id = ?', [id]);
      console.log('[Invoices.MySQL] Invoice deleted:', id);

      res.json({ ok: true, data: { id: String(id) } });
    } catch (err) {
      console.error('[Invoices.MySQL] Delete error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Failed to delete invoice' });
    }
  });

  // 上传发票附件
  router.post('/:id/attachments', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ ok: false, error: 'Invalid invoice ID' });
      }

      const { attachments } = req.body;

      if (!Array.isArray(attachments)) {
        return res.status(400).json({ ok: false, error: 'Attachments must be an array' });
      }

      console.log('[Invoices.MySQL] Updating attachments for invoice:', id);

      // 检查发票是否存在
      const [existing] = await pool.query('SELECT id, attachments FROM order_invoices WHERE id = ?', [id]);
      if (existing.length === 0) {
        return res.status(404).json({ ok: false, error: 'Invoice not found' });
      }

      // 合并现有附件和新附件
      const currentAttachments = existing[0].attachments || [];
      const updatedAttachments = [...currentAttachments, ...attachments];

      await pool.query(
        'UPDATE order_invoices SET attachments = ? WHERE id = ?',
        [JSON.stringify(updatedAttachments), id]
      );

      console.log('[Invoices.MySQL] Attachments updated:', id);

      res.json({ ok: true, data: { attachments: updatedAttachments } });
    } catch (err) {
      console.error('[Invoices.MySQL] Upload attachments error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Failed to upload attachments' });
    }
  });

  return router;
}

