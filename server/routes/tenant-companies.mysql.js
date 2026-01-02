/**
 * 租户公司主体管理路由
 * 每个租户可以管理多个公司主体（用于合同、发票等业务）
 * 完整实现多租户数据隔离
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';

export default function buildTenantCompaniesRouter(pool) {
  const router = express.Router();

  // 所有路由都需要认证
  router.use(authMiddleware);

  // ==================== 公司主体管理（多租户隔离）====================

  /**
   * 获取公司主体列表
   * GET /api/tenant-companies
   * 权限：所有租户（只能看到自己的）
   */
  router.get('/', tenantMiddleware, async (req, res) => {
    try {
      const { where, params } = req.tenantFilter;

      const [rows] = await pool.query(
        `SELECT 
          id, company_id, company_name, company_address, credit_code,
          bank_account, bank_name, legal_person, contact_name, contact_phone,
          is_default, status, remark, created_at, updated_at
         FROM tenant_companies
         WHERE ${where.replace('WHERE ', '')}
         ORDER BY is_default DESC, created_at DESC`,
        params
      );

      const data = rows.map(row => ({
        id: String(row.id),
        companyId: String(row.company_id),
        companyName: row.company_name,
        companyAddress: row.company_address,
        creditCode: row.credit_code,
        bankAccount: row.bank_account,
        bankName: row.bank_name,
        legalPerson: row.legal_person,
        contactName: row.contact_name,
        contactPhone: row.contact_phone,
        isDefault: row.is_default === 1,
        status: row.status,
        remark: row.remark,
        createdAt: row.created_at?.toISOString(),
        updatedAt: row.updated_at?.toISOString()
      }));

      res.json({ ok: true, data });
    } catch (error) {
      console.error('[TenantCompanies] Get list error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * 获取单个公司主体
   * GET /api/tenant-companies/:id
   * 权限：所有租户（只能看到自己的）
   */
  router.get('/:id', tenantMiddleware, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { where, params } = req.tenantFilter;

      const [rows] = await pool.query(
        `SELECT 
          id, company_id, company_name, company_address, credit_code,
          bank_account, bank_name, legal_person, contact_name, contact_phone,
          is_default, status, remark, created_at, updated_at
         FROM tenant_companies
         WHERE id = ? AND (${where.replace('WHERE ', '')})`,
        [id, ...params]
      );

      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: '公司主体不存在或无权访问' });
      }

      const row = rows[0];
      const data = {
        id: String(row.id),
        companyId: String(row.company_id),
        companyName: row.company_name,
        companyAddress: row.company_address,
        creditCode: row.credit_code,
        bankAccount: row.bank_account,
        bankName: row.bank_name,
        legalPerson: row.legal_person,
        contactName: row.contact_name,
        contactPhone: row.contact_phone,
        isDefault: row.is_default === 1,
        status: row.status,
        remark: row.remark,
        createdAt: row.created_at?.toISOString(),
        updatedAt: row.updated_at?.toISOString()
      };

      res.json({ ok: true, data });
    } catch (error) {
      console.error('[TenantCompanies] Get detail error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * 创建公司主体
   * POST /api/tenant-companies
   * 权限：所有租户（自动绑定到当前租户）
   */
  router.post('/', tenantMiddleware, async (req, res) => {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const {
        companyName,
        companyAddress,
        creditCode,
        bankAccount,
        bankName,
        legalPerson,
        contactName,
        contactPhone,
        isDefault,
        status,
        remark
      } = req.body;

      const companyId = req.user.company_id;

      // 检查信用代码是否在当前租户已存在
      const [existing] = await connection.query(
        'SELECT id FROM tenant_companies WHERE company_id = ? AND credit_code = ?',
        [companyId, creditCode]
      );

      if (existing.length > 0) {
        await connection.rollback();
        return res.status(400).json({ ok: false, error: '该统一社会信用代码已存在' });
      }

      // 如果设置为默认，先取消其他默认公司
      if (isDefault) {
        await connection.query(
          'UPDATE tenant_companies SET is_default = 0 WHERE company_id = ?',
          [companyId]
        );
      }

      // 插入新公司主体
      const [result] = await connection.query(
        `INSERT INTO tenant_companies (
          company_id, company_name, company_address, credit_code,
          bank_account, bank_name, legal_person, contact_name, contact_phone,
          is_default, status, remark
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          companyId,
          companyName,
          companyAddress || null,
          creditCode,
          bankAccount || null,
          bankName || null,
          legalPerson || null,
          contactName || null,
          contactPhone || null,
          isDefault ? 1 : 0,
          status || 'active',
          remark || null
        ]
      );

      await connection.commit();

      res.json({
        ok: true,
        data: {
          id: String(result.insertId),
          message: '公司主体创建成功'
        }
      });
    } catch (error) {
      await connection.rollback();
      console.error('[TenantCompanies] Create error:', error);
      res.status(500).json({ ok: false, error: error.message });
    } finally {
      connection.release();
    }
  });

  /**
   * 更新公司主体
   * PUT /api/tenant-companies/:id
   * 权限：所有租户（只能更新自己的）
   */
  router.put('/:id', tenantMiddleware, async (req, res) => {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const id = Number(req.params.id);
      const companyId = req.user.company_id;

      const {
        companyName,
        companyAddress,
        creditCode,
        bankAccount,
        bankName,
        legalPerson,
        contactName,
        contactPhone,
        isDefault,
        status,
        remark
      } = req.body;

      // 检查公司主体是否存在且属于当前租户
      const [existing] = await connection.query(
        'SELECT id FROM tenant_companies WHERE id = ? AND company_id = ?',
        [id, companyId]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({ ok: false, error: '公司主体不存在或无权访问' });
      }

      // 检查信用代码是否被其他公司使用（同一租户内）
      const [duplicate] = await connection.query(
        'SELECT id FROM tenant_companies WHERE company_id = ? AND credit_code = ? AND id != ?',
        [companyId, creditCode, id]
      );

      if (duplicate.length > 0) {
        await connection.rollback();
        return res.status(400).json({ ok: false, error: '该统一社会信用代码已被使用' });
      }

      // 如果设置为默认，先取消其他默认公司
      if (isDefault) {
        await connection.query(
          'UPDATE tenant_companies SET is_default = 0 WHERE company_id = ? AND id != ?',
          [companyId, id]
        );
      }

      // 更新公司主体
      const [result] = await connection.query(
        `UPDATE tenant_companies SET
          company_name = ?,
          company_address = ?,
          credit_code = ?,
          bank_account = ?,
          bank_name = ?,
          legal_person = ?,
          contact_name = ?,
          contact_phone = ?,
          is_default = ?,
          status = ?,
          remark = ?
         WHERE id = ? AND company_id = ?`,
        [
          companyName,
          companyAddress || null,
          creditCode,
          bankAccount || null,
          bankName || null,
          legalPerson || null,
          contactName || null,
          contactPhone || null,
          isDefault ? 1 : 0,
          status || 'active',
          remark || null,
          id,
          companyId
        ]
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ ok: false, error: '更新失败：公司主体不存在或无权访问' });
      }

      await connection.commit();

      res.json({ ok: true, message: '公司主体更新成功' });
    } catch (error) {
      await connection.rollback();
      console.error('[TenantCompanies] Update error:', error);
      res.status(500).json({ ok: false, error: error.message });
    } finally {
      connection.release();
    }
  });

  /**
   * 删除公司主体
   * DELETE /api/tenant-companies/:id
   * 权限：所有租户（只能删除自己的）
   */
  router.delete('/:id', tenantMiddleware, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const companyId = req.user.company_id;

      // 检查是否被订单/合同使用（可选，根据业务需求）
      // 此处简化处理，直接删除

      const [result] = await pool.query(
        'DELETE FROM tenant_companies WHERE id = ? AND company_id = ?',
        [id, companyId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ ok: false, error: '公司主体不存在或无权访问' });
      }

      res.json({ ok: true, message: '公司主体删除成功' });
    } catch (error) {
      console.error('[TenantCompanies] Delete error:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * 设置默认公司主体
   * PUT /api/tenant-companies/:id/set-default
   * 权限：所有租户
   */
  router.put('/:id/set-default', tenantMiddleware, async (req, res) => {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const id = Number(req.params.id);
      const companyId = req.user.company_id;

      // 检查公司主体是否存在且属于当前租户
      const [existing] = await connection.query(
        'SELECT id FROM tenant_companies WHERE id = ? AND company_id = ?',
        [id, companyId]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({ ok: false, error: '公司主体不存在或无权访问' });
      }

      // 取消其他默认公司
      await connection.query(
        'UPDATE tenant_companies SET is_default = 0 WHERE company_id = ?',
        [companyId]
      );

      // 设置当前为默认
      await connection.query(
        'UPDATE tenant_companies SET is_default = 1 WHERE id = ?',
        [id]
      );

      await connection.commit();

      res.json({ ok: true, message: '默认公司主体设置成功' });
    } catch (error) {
      await connection.rollback();
      console.error('[TenantCompanies] Set default error:', error);
      res.status(500).json({ ok: false, error: error.message });
    } finally {
      connection.release();
    }
  });

  return router;
}
