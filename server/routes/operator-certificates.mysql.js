/**
 * 操作证管理路由 - MySQL
 * 用于管理员工操作资格证书
 * ✅ 多租户支持：通过 tenantMiddleware 自动过滤 company_id
 */
import express from 'express';
import { tenantMiddleware, setTenantId, buildWhereClause } from '../middleware/tenant.js';

export default function buildOperatorCertificatesRouter(pool) {
  const router = express.Router();

  // ==================== 公开验证接口（不需要认证） ====================
  router.get('/verify/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: '证件ID无效' });
    }
    
    try {
      const [rows] = await pool.query(
        `SELECT 
          id, employee_name, id_card_number, equipment_type, training_date,
          validity_period, expire_date, trainer_name, company_name, status,
          photo_url, created_at
         FROM operator_certificates 
         WHERE id = ? AND deleted_at IS NULL`,
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: '证件不存在或已失效' });
      }
      
      const cert = rows[0];
      
      // 检查证件状态
      if (cert.status === 'revoked') {
        return res.json({ 
          ok: true, 
          valid: false, 
          message: '此证件已被吊销',
          data: {
            employeeName: cert.employee_name,
            status: cert.status
          }
        });
      }
      
      if (cert.status === 'expired') {
        return res.json({ 
          ok: true, 
          valid: false, 
          message: '此证件已过期',
          data: {
            employeeName: cert.employee_name,
            expireDate: cert.expire_date,
            status: cert.status
          }
        });
      }
      
      // 证件有效
      res.json({ 
        ok: true, 
        valid: true,
        message: '证件有效',
        data: {
          id: cert.id,
          employeeName: cert.employee_name,
          idCardNumber: cert.id_card_number.replace(/(\d{6})\d{8}(\d{4})/, '$1****$2'), // 脱敏
          equipmentType: cert.equipment_type,
          trainingDate: cert.training_date,
          expireDate: cert.expire_date,
          trainerName: cert.trainer_name,
          companyName: cert.company_name,
          status: cert.status,
          photoUrl: cert.photo_url
        }
      });
    } catch (err) {
      console.error('[Certificates.MySQL] Verify error:', err);
      res.status(500).json({ ok: false, error: err?.message || '验证失败' });
    }
  });

  // ==================== 证书列表（分页、搜索、过滤） ====================
  router.get('/', tenantMiddleware, async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 10;
      const offset = (page - 1) * pageSize;
      const search = req.query.search || '';
      const equipmentType = req.query.equipmentType || '';
      const status = req.query.status || '';
      const companyId = req.query.companyId || '';
      const expiringSoon = req.query.expiringSoon === 'true'; // 即将过期筛选
      
      // ✅ 多租户过滤
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;
      let whereClause = `WHERE deleted_at IS NULL AND ${tenantWhere}`;
      const params = [...tenantParams];
      
      // 搜索条件（姓名、身份证号）
      if (search) {
        whereClause += ' AND (employee_name LIKE ? OR id_card_number LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern);
      }
      
      // 操作机型过滤
      if (equipmentType) {
        whereClause += ' AND equipment_type = ?';
        params.push(equipmentType);
      }
      
      // 状态过滤
      if (status) {
        whereClause += ' AND status = ?';
        params.push(status);
      }
      
      // 认证公司过滤
      if (companyId) {
        whereClause += ' AND company_id = ?';
        params.push(Number(companyId));
      }
      
      // 即将过期（30天内）
      if (expiringSoon) {
        whereClause += ' AND expire_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND status = "valid"';
      }
      
      // 查询总数
      const [countRows] = await pool.query(
        `SELECT COUNT(*) as total FROM operator_certificates ${whereClause}`,
        params
      );
      const total = countRows[0]?.total || 0;
      
      // 查询列表
      const [rows] = await pool.query(
        `SELECT 
          id, employee_id, employee_name, id_card_number,
          equipment_type, training_date, trainer_id, trainer_name,
          validity_period, expire_date, company_id, company_name,
          photo_url, certificate_url, status, notes,
          created_at, updated_at,
          DATEDIFF(expire_date, CURDATE()) as days_until_expiry
         FROM operator_certificates 
         ${whereClause}
         ORDER BY expire_date ASC, created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
      
      // 处理数据
      const data = rows.map(row => ({
        ...row,
        daysUntilExpiry: row.days_until_expiry
      }));
      
      res.json({
        ok: true,
        data,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      });
    } catch (err) {
      console.error('[OperatorCertificates.MySQL] List error:', err);
      res.status(500).json({ ok: false, error: err?.message || '获取证书列表失败' });
    }
  });

  // ==================== 统计信息 ====================
  router.get('/stats', async (req, res) => {
    try {
      const [stats] = await pool.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'valid' THEN 1 ELSE 0 END) as validCount,
          SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expiredCount,
          SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END) as revokedCount,
          SUM(CASE WHEN status = 'valid' AND DATEDIFF(expire_date, CURDATE()) <= 30 AND DATEDIFF(expire_date, CURDATE()) >= 0 THEN 1 ELSE 0 END) as expiringSoonCount
        FROM operator_certificates 
        WHERE deleted_at IS NULL
      `);
      
      res.json({ ok: true, data: stats[0] || {} });
    } catch (err) {
      console.error('[OperatorCertificates.MySQL] Stats error:', err);
      res.status(500).json({ ok: false, error: err?.message || '获取统计信息失败' });
    }
  });

  // ==================== 设备类型列表（从equipment_models表获取） ====================
  router.get('/equipment-types', async (req, res) => {
    try {
      // 使用 equipment_models 表而不是 models 表
      const [types] = await pool.query(`
        SELECT DISTINCT type 
        FROM equipment_models 
        WHERE (deleted_at IS NULL OR is_deleted = 0) 
          AND type IS NOT NULL 
          AND type != ''
        ORDER BY type ASC
      `);
      
      console.log('[OperatorCertificates.MySQL] Equipment types:', types);
      res.json({ ok: true, data: types.map(t => t.type) });
    } catch (err) {
      console.error('[OperatorCertificates.MySQL] Equipment types error:', err);
      res.status(500).json({ ok: false, error: err?.message || '获取设备类型失败' });
    }
  });

  // ==================== 培训人列表（从employees表获取） ====================
  router.get('/trainers', async (req, res) => {
    try {
      const [trainers] = await pool.query(`
        SELECT id, name 
        FROM employees 
        WHERE deleted_at IS NULL AND status = 'active'
        ORDER BY name ASC
      `);
      
      console.log('[OperatorCertificates.MySQL] Trainers:', trainers);
      res.json({ ok: true, data: trainers });
    } catch (err) {
      console.error('[OperatorCertificates.MySQL] Trainers error:', err);
      res.status(500).json({ ok: false, error: err?.message || '获取培训人列表失败' });
    }
  });

  // ==================== 培训公司列表（从company_verifications表获取） ====================
  router.get('/companies', async (req, res) => {
    try {
      // 从 company_verifications 表获取培训公司列表（门店管理-认证公司）
      const [companies] = await pool.query(`
        SELECT id, company_name as name
        FROM company_verifications
        ORDER BY company_name ASC
      `);
      
      console.log('[OperatorCertificates.MySQL] Training Companies:', companies);
      res.json({ ok: true, data: companies });
    } catch (err) {
      console.error('[OperatorCertificates.MySQL] Training Companies error:', err);
      res.status(500).json({ ok: false, error: err?.message || '获取培训公司列表失败' });
    }
  });

  // ==================== 创建证书 ====================
  router.post('/', tenantMiddleware, async (req, res) => {
    const {
      employeeId,
      employeeName,
      idCardNumber,
      equipmentType,
      trainingDate,
      trainerId,
      trainerName,
      validityPeriod,
      companyId,
      companyName,
      photoUrl,
      status = 'valid',
      notes
    } = req.body;
    
    if (!employeeName || !equipmentType || !trainingDate || !validityPeriod) {
      return res.status(400).json({ ok: false, error: '姓名、操作机型、培训时间和有效期不能为空' });
    }
    
    try {
      // ✅ 多租户：自动设置 company_id
      const finalCompanyId = req.tenantId;
      
      // 计算到期时间：培训时间 + 有效期（月）
      const [expireResult] = await pool.query(
        'SELECT DATE_ADD(?, INTERVAL ? MONTH) as expire_date',
        [trainingDate, validityPeriod]
      );
      const expireDate = expireResult[0].expire_date;
      
      const [result] = await pool.query(
        `INSERT INTO operator_certificates 
        (employee_id, employee_name, id_card_number, equipment_type, training_date,
         trainer_id, trainer_name, validity_period, expire_date, company_id, company_name,
         photo_url, status, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          employeeId || null, employeeName, idCardNumber || null, equipmentType, trainingDate,
          trainerId || null, trainerName || null, validityPeriod, expireDate, finalCompanyId, companyName || null,
          photoUrl || null, status, notes || null, req.user?.id || null
        ]
      );
      
      res.json({ ok: true, id: result.insertId, expireDate });
    } catch (err) {
      console.error('[OperatorCertificates.MySQL] Create error:', err);
      res.status(500).json({ ok: false, error: err?.message || '创建证书失败' });
    }
  });

  // ==================== 获取证书详情 ====================
  router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: '证书ID无效' });
    }
    
    try {
      const [rows] = await pool.query(
        `SELECT * FROM operator_certificates WHERE id = ? AND deleted_at IS NULL`,
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: '证书不存在' });
      }
      
      const cert = rows[0];
      cert.attachments = cert.attachments ? JSON.parse(cert.attachments) : [];
      
      res.json({ ok: true, data: cert });
    } catch (err) {
      console.error('[OperatorCertificates.MySQL] Get detail error:', err);
      res.status(500).json({ ok: false, error: err?.message || '获取证书详情失败' });
    }
  });

  // ==================== 更新证书 ====================
  router.put('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: '证书ID无效' });
    }
    
    const {
      employeeId,
      employeeName,
      idCardNumber,
      equipmentType,
      trainingDate,
      trainerId,
      trainerName,
      validityPeriod,
      companyId,
      companyName,
      photoUrl,
      certificateUrl,
      status,
      notes
    } = req.body;
    
    try {
      // 检查证书是否存在
      const [existing] = await pool.query(
        'SELECT id, training_date, validity_period FROM operator_certificates WHERE id = ? AND deleted_at IS NULL',
        [id]
      );
      
      if (existing.length === 0) {
        return res.status(404).json({ ok: false, error: '证书不存在' });
      }
      
      const updateFields = [];
      const updateValues = [];
      let newExpireDate = null;
      
      // 如果修改了培训时间或有效期，重新计算到期时间
      const oldTrainingDate = existing[0].training_date;
      const oldValidityPeriod = existing[0].validity_period;
      const newTrainingDate = trainingDate || oldTrainingDate;
      const newValidityPeriod = validityPeriod || oldValidityPeriod;
      
      if (trainingDate !== undefined || validityPeriod !== undefined) {
        const [expireResult] = await pool.query(
          'SELECT DATE_ADD(?, INTERVAL ? MONTH) as expire_date',
          [newTrainingDate, newValidityPeriod]
        );
        newExpireDate = expireResult[0].expire_date;
        updateFields.push('expire_date = ?');
        updateValues.push(newExpireDate);
      }
      
      if (employeeId !== undefined) {
        updateFields.push('employee_id = ?');
        updateValues.push(employeeId || null);
      }
      if (employeeName !== undefined) {
        updateFields.push('employee_name = ?');
        updateValues.push(employeeName);
      }
      if (idCardNumber !== undefined) {
        updateFields.push('id_card_number = ?');
        updateValues.push(idCardNumber || null);
      }
      if (equipmentType !== undefined) {
        updateFields.push('equipment_type = ?');
        updateValues.push(equipmentType);
      }
      if (trainingDate !== undefined) {
        updateFields.push('training_date = ?');
        updateValues.push(trainingDate);
      }
      if (trainerId !== undefined) {
        updateFields.push('trainer_id = ?');
        updateValues.push(trainerId || null);
      }
      if (trainerName !== undefined) {
        updateFields.push('trainer_name = ?');
        updateValues.push(trainerName || null);
      }
      if (validityPeriod !== undefined) {
        updateFields.push('validity_period = ?');
        updateValues.push(validityPeriod);
      }
      if (companyId !== undefined) {
        updateFields.push('company_id = ?');
        updateValues.push(companyId || null);
      }
      if (companyName !== undefined) {
        updateFields.push('company_name = ?');
        updateValues.push(companyName || null);
      }
      if (photoUrl !== undefined) {
        updateFields.push('photo_url = ?');
        updateValues.push(photoUrl || null);
      }
      if (certificateUrl !== undefined) {
        updateFields.push('certificate_url = ?');
        updateValues.push(certificateUrl || null);
      }
      if (status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(status);
      }
      if (notes !== undefined) {
        updateFields.push('notes = ?');
        updateValues.push(notes || null);
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({ ok: false, error: '没有要更新的字段' });
      }
      
      updateValues.push(id);
      
      await pool.query(
        `UPDATE operator_certificates SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
      
      res.json({ ok: true, expireDate: newExpireDate });
    } catch (err) {
      console.error('[OperatorCertificates.MySQL] Update error:', err);
      res.status(500).json({ ok: false, error: err?.message || '更新证书失败' });
    }
  });

  // ==================== 删除证书（软删除） ====================
  router.delete('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: '证书ID无效' });
    }
    
    try {
      const [result] = await pool.query(
        'UPDATE operator_certificates SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
        [id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ ok: false, error: '证书不存在' });
      }
      
      res.json({ ok: true });
    } catch (err) {
      console.error('[OperatorCertificates.MySQL] Delete error:', err);
      res.status(500).json({ ok: false, error: err?.message || '删除证书失败' });
    }
  });

  // ==================== 批量更新状态（用于定时任务自动标记过期） ====================
  router.post('/batch-update-status', async (req, res) => {
    try {
      // 自动标记过期证书
      const [result] = await pool.query(`
        UPDATE operator_certificates 
        SET status = 'expired' 
        WHERE status = 'valid' 
          AND expire_date < CURDATE() 
          AND deleted_at IS NULL
      `);
      
      res.json({ ok: true, updatedCount: result.affectedRows });
    } catch (err) {
      console.error('[OperatorCertificates.MySQL] Batch update status error:', err);
      res.status(500).json({ ok: false, error: err?.message || '批量更新状态失败' });
    }
  });

  // ==================== 生成证书图片 ====================
  router.post('/:id/generate', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: '证书ID无效' });
    }

    try {
      // 获取证书信息
      const [rows] = await pool.query(
        `SELECT * FROM operator_certificates WHERE id = ? AND deleted_at IS NULL`,
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: '证书不存在' });
      }

      const cert = rows[0];
      
      // TODO: 这里应该使用canvas或其他库生成证书图片
      // 暂时返回一个占位URL，实际应该生成真实的证书图片
      const certificateUrl = `/uploads/certificates/cert_${id}_${Date.now()}.png`;
      
      // 更新证书URL
      await pool.query(
        'UPDATE operator_certificates SET certificate_url = ? WHERE id = ?',
        [certificateUrl, id]
      );

      res.json({ 
        ok: true, 
        certificateUrl,
        message: '证书生成成功（功能开发中，暂时返回占位图）' 
      });
    } catch (err) {
      console.error('[OperatorCertificates.MySQL] Generate certificate error:', err);
      res.status(500).json({ ok: false, error: err?.message || '生成证书失败' });
    }
  });

  return router;
}
