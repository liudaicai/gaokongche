// 一户一库，不需要租户过滤
/**
 * 合同管理 API路由
 */
import express from 'express';
import { tenantMiddleware } from '../middleware/tenant.js';
export default function buildContractsRouter(pool) {
  const router = express.Router();
  
  // 生成合同记录
  router.post('/generate', tenantMiddleware, async (req, res) => {
    try {
      const { orderId, templateId, contractNumber } = req.body;
      const userId = req.user?.id;
      const companyId = req.user?.companyId || null;
      
      console.log('[Contracts] Generate contract:', { orderId, templateId, contractNumber });
      
      // 创建合同记录
      const [result] = await pool.query(
        `INSERT INTO order_contracts (
          order_id, template_id, contract_number,
          status, created_by, company_id, generated_at
        ) VALUES (?, ?, ?, 'generated', ?, ?, NOW())`,
        [orderId, templateId, contractNumber, userId, companyId]
      );
      
      // 更新订单状态
      await pool.query(
        'UPDATE orders SET has_contract = TRUE WHERE id = ?',
        [orderId]
      );
      
      console.log('[Contracts] Contract generated successfully:', result.insertId);
      
      res.json({ 
        ok: true, 
        data: { 
          id: result.insertId,
          contractNumber,
          message: '合同记录已保存'
        } 
      });
    } catch (error) {
      console.error('[Contracts] Generate error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });
  
  // 获取订单的合同列表
  router.get('/order/:orderId', tenantMiddleware, async (req, res) => {
    try {
      const { orderId } = req.params;
      // 一户一库，不需要租户过滤
      const [rows] = await pool.query(
        `SELECT 
          oc.*,
          t.name as template_name,
          t.description as template_description,
          u.username as creator_name
         FROM order_contracts oc
         LEFT JOIN document_templates t ON oc.template_id = t.id
         LEFT JOIN users u ON oc.created_by = u.id
         WHERE oc.order_id = ? AND 1=1
         ORDER BY oc.created_at DESC`,
        [orderId]
      );
      
      res.json({ ok: true, data: rows });
    } catch (error) {
      console.error('[Contracts] Get order contracts error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });
  
  // 获取合同详情
  router.get('/:id', tenantMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      // 一户一库，不需要租户过滤
      const [rows] = await pool.query(
        `SELECT 
          oc.*,
          t.name as template_name,
          o.order_number,
          o.customer_name
         FROM order_contracts oc
         LEFT JOIN document_templates t ON oc.template_id = t.id
         LEFT JOIN orders o ON oc.order_id = o.id
         WHERE oc.id = ? AND 1=1`,
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: '合同不存在' });
      }
      
      res.json({ ok: true, data: rows[0] });
    } catch (error) {
      console.error('[Contracts] Get contract error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });
  
  // 更新合同状态
  router.put('/:id/status', tenantMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, signedByCustomer, signedByCompany } = req.body;
      // 一户一库，不需要租户过滤
      const updates = ['status = ?'];
      const params = [status];
      
      if (status === 'signed') {
        updates.push('signed_at = NOW()');
        if (signedByCustomer) {
          updates.push('signed_by_customer = ?');
          params.push(signedByCustomer);
        }
        if (signedByCompany) {
          updates.push('signed_by_company = ?');
          params.push(signedByCompany);
        }
      }
      
      await pool.query(
        `UPDATE order_contracts 
         SET ${updates.join(', ')}
         WHERE id = ? AND 1=1`,
        [...params, id]
      );
      
      res.json({ ok: true, message: '状态更新成功' });
    } catch (error) {
      console.error('[Contracts] Update status error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });
  
  // 删除合同
  router.delete('/:id', tenantMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      // 一户一库，不需要租户过滤
      await pool.query(
        `DELETE FROM order_contracts 
         WHERE id = ? AND 1=1`,
        [id]
      );
      
      res.json({ ok: true, message: '合同删除成功' });
    } catch (error) {
      console.error('[Contracts] Delete error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });
  
  return router;
}


