/**
 * 财务管理API - 重构版
 * 收款/付款管理、数据导出
 * 
 * ✅ 多租户支持：通过 tenantMiddleware 自动过滤 company_id
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { tenantMiddleware, setTenantId, buildWhereClause } from '../middleware/tenant.js';

// 配置文件上传
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'finance');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB限制

export default function buildFinanceRouter(pool) {
  const router = express.Router();

  // ==================== 1. 收款记录列表 ====================
  router.get('/receipts', tenantMiddleware, async (req, res) => {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ea6be235-0d47-4460-9a53-426650f4adda',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'finance.mysql.js:37',hypothesisId:'E',message:'财务收款查询开始',data:{user:req.user,tenantFilter:req.tenantFilter},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
      // #endregion
      
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 50;
      const offset = (page - 1) * pageSize;
      
      const {
        startDate,
        endDate,
        paymentMethod,
        customerName,
        minAmount,
        maxAmount
      } = req.query;

      // ✅ 多租户过滤
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;
      let whereClause = `WHERE fr.record_type = 'receipt' AND ${tenantWhere}`;
      const params = [...tenantParams];
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ea6be235-0d47-4460-9a53-426650f4adda',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'finance.mysql.js:60',hypothesisId:'D,E',message:'财务收款查询条件',data:{whereClause,params,page,pageSize},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
      // #endregion

      if (startDate && startDate !== 'undefined') {
        whereClause += ' AND fr.record_date >= ?';
        params.push(startDate);
      }
      if (endDate && endDate !== 'undefined') {
        whereClause += ' AND fr.record_date <= ?';
        params.push(endDate);
      }
      if (paymentMethod) {
        whereClause += ' AND fr.payment_method = ?';
        params.push(paymentMethod);
      }
      if (customerName) {
        whereClause += ' AND fr.customer_name LIKE ?';
        params.push(`%${customerName}%`);
      }
      if (minAmount) {
        whereClause += ' AND fr.amount >= ?';
        params.push(Number(minAmount));
      }
      if (maxAmount) {
        whereClause += ' AND fr.amount <= ?';
        params.push(Number(maxAmount));
      }

      const [countRows] = await pool.query(
        `SELECT COUNT(*) as total FROM finance_records fr ${whereClause}`,
        params
      );

      const [rows] = await pool.query(
        `SELECT 
          fr.*,
          COALESCE(fr.source_type = 'order' AND fr.order_id IS NOT NULL, 0) as is_from_order
         FROM finance_records fr
         ${whereClause}
         ORDER BY fr.record_date DESC, fr.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ea6be235-0d47-4460-9a53-426650f4adda',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'finance.mysql.js:105',hypothesisId:'E',message:'财务收款查询结果',data:{total:countRows[0]?.total||0,rowCount:rows.length,firstRow:rows[0]},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
      // #endregion

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
      console.error('[Finance] Receipts list error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // ==================== 2. 付款记录列表（原退款改为付款） ====================
  router.get('/payments', tenantMiddleware, async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 50;
      const offset = (page - 1) * pageSize;
      
      const {
        startDate,
        endDate,
        paymentMethod,
        customerName,
        minAmount,
        maxAmount
      } = req.query;

      // ✅ 多租户过滤
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;
      // 付款记录包含两种类型：payment（付款）和 refund（退款）
      let whereClause = `WHERE fr.record_type IN ('payment', 'refund') AND ${tenantWhere}`;
      const params = [...tenantParams];

      if (startDate && startDate !== 'undefined') {
        whereClause += ' AND fr.record_date >= ?';
        params.push(startDate);
      }
      if (endDate && endDate !== 'undefined') {
        whereClause += ' AND fr.record_date <= ?';
        params.push(endDate);
      }
      if (paymentMethod) {
        whereClause += ' AND fr.payment_method = ?';
        params.push(paymentMethod);
      }
      if (customerName) {
        whereClause += ' AND fr.customer_name LIKE ?';
        params.push(`%${customerName}%`);
      }
      if (minAmount) {
        whereClause += ' AND fr.amount >= ?';
        params.push(Number(minAmount));
      }
      if (maxAmount) {
        whereClause += ' AND fr.amount <= ?';
        params.push(Number(maxAmount));
      }

      const [countRows] = await pool.query(
        `SELECT COUNT(*) as total FROM finance_records fr ${whereClause}`,
        params
      );

      const [rows] = await pool.query(
        `SELECT 
          fr.*,
          COALESCE(fr.source_type = 'order' AND fr.order_id IS NOT NULL, 0) as is_from_order
         FROM finance_records fr
         ${whereClause}
         ORDER BY fr.record_date DESC, fr.created_at DESC
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
      console.error('[Finance] Payments list error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // ==================== 3. 生成财务单号 ====================
  async function generateFinanceNumber(recordType, date) {
    const prefix = recordType === 'receipt' ? 'SK' : 'FK'; // SK收款, FK付款
    const dateStr = date.replace(/-/g, '').substring(0, 8); // YYYYMMDD
    
    // 查询当天最大序号
    const [rows] = await pool.query(
      `SELECT record_number FROM finance_records 
       WHERE record_number LIKE ? 
       ORDER BY record_number DESC LIMIT 1`,
      [`${prefix}${dateStr}-%`]
    );
    
    let sequence = 1;
    if (rows.length > 0) {
      const lastNumber = rows[0].record_number;
      const match = lastNumber.match(/-(\d+)$/);
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }
    
    return `${prefix}${dateStr}-${sequence}`;
  }

  // ==================== 4. 创建财务记录 ====================
  router.post('/', upload.array('attachments', 5), async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const {
        record_type,      // 'receipt' 或 'payment'
        record_date,
        payment_method,   // 'cash', 'wechat', 'alipay', 'bank_transfer'
        amount,
        customer_id,
        customer_name,
        order_id,
        order_number,
        contract_number,
        remark
      } = req.body;

      // 验证必填字段
      if (!record_type || !record_date || !payment_method || !amount) {
        throw new Error('缺少必填字段');
      }

      // 生成财务单号
      const record_number = await generateFinanceNumber(record_type, record_date);

      // 处理附件
      let attachments_json = null;
      if (req.files && req.files.length > 0) {
        attachments_json = JSON.stringify(req.files.map(file => ({
          filename: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        })));
      }

      // 插入记录
      const [result] = await conn.query(
        `INSERT INTO finance_records (
          record_number, record_type, source_type, source_id, order_id, order_number,
          contract_number, amount, payment_method, record_date,
          customer_id, customer_name, remark, attachments_json
        ) VALUES (?, ?, 'other', NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record_number, record_type, order_id || null, order_number || null,
          contract_number || null, amount, payment_method, record_date,
          customer_id || null, customer_name || null, remark || null, attachments_json
        ]
      );

      await conn.commit();

      // 查询新创建的记录
      const [newRecord] = await conn.query(
        'SELECT * FROM finance_records WHERE id = ?',
        [result.insertId]
      );

      res.json({
        ok: true,
        data: newRecord[0]
      });
    } catch (err) {
      await conn.rollback();
      console.error('[Finance] Create error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    } finally {
      conn.release();
    }
  });

  // ==================== 5. 更新财务记录 ====================
  router.put('/:id', upload.array('attachments', 5), async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const { id } = req.params;

      // 检查记录是否存在以及是否可编辑
      const [existingRows] = await conn.query(
        `SELECT * FROM finance_records 
         WHERE id = ? AND (source_type != 'order' OR order_id IS NULL)`,
        [id]
      );

      if (existingRows.length === 0) {
        throw new Error('记录不存在或不可编辑（订单来源的记录不可编辑）');
      }

      const {
        record_date,
        payment_method,
        amount,
        customer_id,
        customer_name,
        contract_number,
        remark
      } = req.body;

      // 处理新附件
      let attachments_json = existingRows[0].attachments_json;
      if (req.files && req.files.length > 0) {
        const newAttachments = req.files.map(file => ({
          filename: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype
        }));
        
        const existingAttachments = attachments_json ? JSON.parse(attachments_json) : [];
        attachments_json = JSON.stringify([...existingAttachments, ...newAttachments]);
      }

      // 更新记录
      await conn.query(
        `UPDATE finance_records SET
          record_date = COALESCE(?, record_date),
          payment_method = COALESCE(?, payment_method),
          amount = COALESCE(?, amount),
          customer_id = ?,
          customer_name = ?,
          contract_number = ?,
          remark = ?,
          attachments_json = ?
         WHERE id = ?`,
        [
          record_date, payment_method, amount,
          customer_id || null, customer_name || null, contract_number || null,
          remark || null, attachments_json, id
        ]
      );

      await conn.commit();

      // 返回更新后的记录
      const [updatedRecord] = await conn.query(
        'SELECT * FROM finance_records WHERE id = ?',
        [id]
      );

      res.json({
        ok: true,
        data: updatedRecord[0]
      });
    } catch (err) {
      await conn.rollback();
      console.error('[Finance] Update error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    } finally {
      conn.release();
    }
  });

  // ==================== 6. 删除财务记录 ====================
  router.delete('/:id', async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const { id } = req.params;

      // 检查记录是否存在以及是否可删除
      const [existingRows] = await conn.query(
        `SELECT * FROM finance_records 
         WHERE id = ? AND (source_type != 'order' OR order_id IS NULL)`,
        [id]
      );

      if (existingRows.length === 0) {
        throw new Error('记录不存在或不可删除（订单来源的记录不可删除）');
      }

      // 删除关联的附件文件
      if (existingRows[0].attachments_json) {
        const attachments = JSON.parse(existingRows[0].attachments_json);
        for (const attachment of attachments) {
          try {
            await fs.unlink(attachment.path);
          } catch (err) {
            console.warn('[Finance] Failed to delete attachment:', attachment.path, err.message);
          }
        }
      }

      // 删除记录
      await conn.query('DELETE FROM finance_records WHERE id = ?', [id]);

      await conn.commit();

      res.json({
        ok: true,
        message: '删除成功'
      });
    } catch (err) {
      await conn.rollback();
      console.error('[Finance] Delete error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    } finally {
      conn.release();
    }
  });

  // ==================== 7. 导出收款记录（CSV） ====================
  router.get('/export/receipts', async (req, res) => {
    try {
      const {
        startDate,
        endDate,
        paymentMethod
      } = req.query;

      let whereClause = `WHERE record_type = 'receipt'`;
      const params = [];

      if (startDate && startDate !== 'undefined') {
        whereClause += ' AND record_date >= ?';
        params.push(startDate);
      }
      if (endDate && endDate !== 'undefined') {
        whereClause += ' AND record_date <= ?';
        params.push(endDate);
      }
      if (paymentMethod) {
        whereClause += ' AND payment_method = ?';
        params.push(paymentMethod);
      }

      const [rows] = await pool.query(
        `SELECT 
          record_number as '单号',
          record_date as '日期',
          CONCAT(COALESCE(contract_number, order_number, ''), '/', COALESCE(customer_name, '')) as '合同编号/客户名称',
          amount as '金额',
          CASE payment_method
            WHEN 'cash' THEN '现金'
            WHEN 'bank_transfer' THEN '网银转账'
            WHEN 'alipay' THEN '支付宝'
            WHEN 'wechat' THEN '微信'
            ELSE '其他'
          END as '支付方式',
          remark as '备注'
         FROM finance_records
         ${whereClause}
         ORDER BY record_date DESC, created_at DESC`,
        params
      );

      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: '没有数据可导出' });
      }

      const headers = Object.keys(rows[0]);
      let csv = headers.join(',') + '\n';
      
      rows.forEach(row => {
        const values = headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = String(val);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
        csv += values.join(',') + '\n';
      });

      const filename = `收款记录_${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.write('\ufeff');
      res.end(csv);
    } catch (err) {
      console.error('[Finance] Export receipts error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  // ==================== 8. 导出付款记录（CSV） ====================
  router.get('/export/payments', async (req, res) => {
    try {
      const {
        startDate,
        endDate,
        paymentMethod
      } = req.query;

      // 付款记录包含两种类型：payment（付款）和 refund（退款）
      let whereClause = `WHERE record_type IN ('payment', 'refund')`;
      const params = [];

      if (startDate && startDate !== 'undefined') {
        whereClause += ' AND record_date >= ?';
        params.push(startDate);
      }
      if (endDate && endDate !== 'undefined') {
        whereClause += ' AND record_date <= ?';
        params.push(endDate);
      }
      if (paymentMethod) {
        whereClause += ' AND payment_method = ?';
        params.push(paymentMethod);
      }

      const [rows] = await pool.query(
        `SELECT 
          record_number as '单号',
          record_date as '日期',
          CONCAT(COALESCE(contract_number, order_number, ''), '/', COALESCE(customer_name, '')) as '合同编号/客户名称',
          amount as '金额',
          CASE payment_method
            WHEN 'cash' THEN '现金'
            WHEN 'bank_transfer' THEN '网银转账'
            WHEN 'alipay' THEN '支付宝'
            WHEN 'wechat' THEN '微信'
            ELSE '其他'
          END as '支付方式',
          remark as '备注'
         FROM finance_records
         ${whereClause}
         ORDER BY record_date DESC, created_at DESC`,
        params
      );

      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: '没有数据可导出' });
      }

      const headers = Object.keys(rows[0]);
      let csv = headers.join(',') + '\n';
      
      rows.forEach(row => {
        const values = headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = String(val);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
        csv += values.join(',') + '\n';
      });

      const filename = `付款记录_${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.write('\ufeff');
      res.end(csv);
    } catch (err) {
      console.error('[Finance] Export payments error:', err);
      res.status(500).json({ ok: false, error: err?.message });
    }
  });

  return router;
}
