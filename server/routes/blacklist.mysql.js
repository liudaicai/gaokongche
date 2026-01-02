/**
 * 黑名单管理路由 - MySQL
 * 跨租户共享数据
 * 
 * 权限说明：
 * - 所有租户：可查询、可上传
 * - 超级管理员：所有权限（增删改查、审核、移除）
 */
import express from 'express';
import { authMiddleware, requireSuperAdmin } from '../middleware/auth.js';

const toDto = (row) => ({
  id: row.id,
  customerName: row.customer_name,
  customerPhone: row.customer_phone || '',
  customerIdCard: row.customer_id_card || '',
  reason: row.reason,
  evidenceFiles: row.evidence_files ? JSON.parse(row.evidence_files) : [],
  severity: row.severity,
  status: row.status,
  
  // 上传者信息
  uploadedBy: row.uploaded_by,
  uploaderTenantId: row.uploader_tenant_id,
  uploaderName: row.uploader_name || '',
  uploadTime: row.upload_time,
  
  // 审核信息
  verified: !!row.verified,
  verifiedBy: row.verified_by,
  verifyTime: row.verify_time,
  verifyNote: row.verify_note || '',
  
  // 移除信息
  removedBy: row.removed_by,
  removeTime: row.remove_time,
  removeReason: row.remove_reason || '',
  
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export default function buildBlacklistRouter(pool) {
  const router = express.Router();

  // ==================== 查询黑名单（检查客户是否在黑名单中） ====================
  // POST /api/blacklist/check
  // 所有认证用户可访问
  router.post('/check', authMiddleware, async (req, res) => {
    try {
      const { customerName, customerPhone, customerIdCard } = req.body;
      
      if (!customerName && !customerPhone && !customerIdCard) {
        return res.json({ 
          ok: false, 
          error: '至少需要提供客户姓名、电话或身份证号之一' 
        });
      }

      // 构建查询条件
      let whereConditions = ['status = ?'];
      let params = ['active']; // 只查询激活状态的黑名单
      
      const orConditions = [];
      
      if (customerName) {
        orConditions.push('customer_name = ?');
        params.push(customerName);
      }
      
      if (customerPhone) {
        orConditions.push('customer_phone = ?');
        params.push(customerPhone);
      }
      
      if (customerIdCard) {
        orConditions.push('customer_id_card = ?');
        params.push(customerIdCard);
      }
      
      if (orConditions.length > 0) {
        whereConditions.push(`(${orConditions.join(' OR ')})`);
      }

      const whereClause = whereConditions.join(' AND ');
      
      const [rows] = await pool.query(
        `SELECT * FROM blacklist WHERE ${whereClause} ORDER BY severity DESC, created_at DESC`,
        params
      );

      // 记录查询日志
      if (rows.length > 0) {
        const blacklistId = rows[0].id;
        const customerInfo = JSON.stringify({ customerName, customerPhone, customerIdCard });
        
        await pool.query(
          `INSERT INTO blacklist_query_logs 
           (blacklist_id, query_by, query_tenant_id, query_context, customer_info) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            blacklistId,
            req.user.id,
            req.user.company_id || 0,
            req.body.context || 'manual_check',
            customerInfo
          ]
        );
      }

      const isBlacklisted = rows.length > 0;
      const records = rows.map(toDto);

      return res.json({ 
        ok: true, 
        data: {
          isBlacklisted,
          records,
          count: rows.length
        }
      });
    } catch (error) {
      console.error('[Blacklist Check] 查询失败:', error);
      return res.status(500).json({ 
        ok: false, 
        error: '黑名单查询失败: ' + error.message 
      });
    }
  });

  // ==================== 黑名单列表（分页、搜索） ====================
  // GET /api/blacklist?page=1&pageSize=10&search=&status=&severity=
  // 所有认证用户可访问
  router.get('/', authMiddleware, async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 10;
      const offset = (page - 1) * pageSize;
      const search = req.query.search || '';
      const status = req.query.status || '';
      const severity = req.query.severity || '';
      
      let whereClause = 'WHERE 1=1';
      const queryParams = [];
      
      // 搜索条件
      if (search) {
        whereClause += ' AND (customer_name LIKE ? OR customer_phone LIKE ? OR customer_id_card LIKE ? OR reason LIKE ?)';
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }
      
      // 状态过滤
      if (status) {
        whereClause += ' AND status = ?';
        queryParams.push(status);
      }
      
      // 严重程度过滤
      if (severity) {
        whereClause += ' AND severity = ?';
        queryParams.push(severity);
      }
      
      // ✅ 取消审核功能：所有用户都能看到所有记录
      // const user = req.user;
      // const isSuperAdmin = user.role === 'super_admin' || user.role === 'superadmin';
      // if (!isSuperAdmin) {
      //   whereClause += ' AND verified = 1';
      // }
      
      // 查询总数
      const [countRows] = await pool.query(
        `SELECT COUNT(*) as total FROM blacklist ${whereClause}`,
        queryParams
      );
      const total = countRows[0]?.total || 0;
      
      // 查询列表
      const [rows] = await pool.query(
        `SELECT * FROM blacklist 
         ${whereClause}
         ORDER BY severity DESC, created_at DESC
         LIMIT ? OFFSET ?`,
        [...queryParams, pageSize, offset]
      );
      
      return res.json({ 
        ok: true, 
        data: rows.map(toDto),
        pagination: {
          page,
          pageSize,
          total
        }
      });
    } catch (error) {
      console.error('[Blacklist List] 查询失败:', error);
      return res.status(500).json({ 
        ok: false, 
        error: '获取黑名单列表失败: ' + error.message 
      });
    }
  });

  // ==================== 获取单个黑名单记录 ====================
  // GET /api/blacklist/:id
  // 所有认证用户可访问
  router.get('/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      
      const [rows] = await pool.query(
        'SELECT * FROM blacklist WHERE id = ?',
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ 
          ok: false, 
          error: '黑名单记录不存在' 
        });
      }
      
      return res.json({ 
        ok: true, 
        data: toDto(rows[0])
      });
    } catch (error) {
      console.error('[Blacklist Get] 查询失败:', error);
      return res.status(500).json({ 
        ok: false, 
        error: '获取黑名单记录失败: ' + error.message 
      });
    }
  });

  // ==================== 新增黑名单记录（租户可上传） ====================
  // POST /api/blacklist
  // 所有认证用户可访问
  router.post('/', authMiddleware, async (req, res) => {
    try {
      const {
        customerName,
        customerPhone,
        customerIdCard,
        reason,
        evidenceFiles,
        severity
      } = req.body;
      
      // 验证必填字段
      if (!customerName || !reason) {
        return res.json({ 
          ok: false, 
          error: '客户名称和原因为必填项' 
        });
      }
      
      const user = req.user;
      
      // 检查是否已存在（优先使用身份证号查重）
      let existing = [];
      let duplicateField = '';
      
      if (customerIdCard) {
        // 如果提供了身份证号，优先用身份证号查重
        [existing] = await pool.query(
          `SELECT id, customer_name, customer_id_card FROM blacklist 
           WHERE customer_id_card = ? AND status = 'active'`,
          [customerIdCard]
        );
        
        if (existing.length > 0) {
          duplicateField = '身份证号';
        }
      }
      
      // 如果身份证号未重复，再检查客户名称
      if (existing.length === 0) {
        [existing] = await pool.query(
          `SELECT id, customer_name, customer_id_card FROM blacklist 
           WHERE customer_name = ? AND status = 'active'`,
          [customerName]
        );
        
        if (existing.length > 0) {
          duplicateField = '客户名称';
        }
      }
      
      if (existing.length > 0) {
        const existingRecord = existing[0];
        return res.json({ 
          ok: false, 
          error: `该客户已在黑名单中（${duplicateField}重复）`,
          duplicateInfo: {
            field: duplicateField,
            customerName: existingRecord.customer_name,
            customerIdCard: existingRecord.customer_id_card
          }
        });
      }
      
      // 插入黑名单记录（自动设置为已审核，直接生效）
      const [result] = await pool.query(
        `INSERT INTO blacklist 
         (customer_name, customer_phone, customer_id_card, reason, 
          evidence_files, severity, uploaded_by, uploader_tenant_id, uploader_name, 
          verified, verified_by, verify_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          customerName,
          customerPhone || null,
          customerIdCard || null,
          reason,
          evidenceFiles ? JSON.stringify(evidenceFiles) : null,
          severity || 'medium',
          user.id,
          user.company_id || 0,
          user.username || user.name || '未知用户',
          1, // verified = 1 (自动审核通过)
          user.id // verified_by (审核人为上传者)
        ]
      );
      
      const newId = result.insertId;
      
      // 查询新创建的记录
      const [newRecord] = await pool.query(
        'SELECT * FROM blacklist WHERE id = ?',
        [newId]
      );
      
      return res.json({ 
        ok: true, 
        data: toDto(newRecord[0])
      });
    } catch (error) {
      console.error('[Blacklist Create] 创建失败:', error);
      return res.status(500).json({ 
        ok: false, 
        error: '添加黑名单记录失败: ' + error.message 
      });
    }
  });

  // ==================== 更新黑名单记录（仅超管） ====================
  // PUT /api/blacklist/:id
  // 仅超级管理员可访问
  router.put('/:id', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const {
        customerName,
        customerPhone,
        customerIdCard,
        reason,
        evidenceFiles,
        severity,
        status
      } = req.body;
      
      // 检查记录是否存在
      const [existing] = await pool.query(
        'SELECT id FROM blacklist WHERE id = ?',
        [id]
      );
      
      if (existing.length === 0) {
        return res.status(404).json({ 
          ok: false, 
          error: '黑名单记录不存在' 
        });
      }
      
      // 更新记录
      await pool.query(
        `UPDATE blacklist SET
         customer_name = ?,
         customer_phone = ?,
         customer_id_card = ?,
         reason = ?,
         evidence_files = ?,
         severity = ?,
         status = ?
         WHERE id = ?`,
        [
          customerName,
          customerPhone || null,
          customerIdCard || null,
          reason,
          evidenceFiles ? JSON.stringify(evidenceFiles) : null,
          severity || 'medium',
          status || 'active',
          id
        ]
      );
      
      // 查询更新后的记录
      const [updated] = await pool.query(
        'SELECT * FROM blacklist WHERE id = ?',
        [id]
      );
      
      return res.json({ 
        ok: true, 
        data: toDto(updated[0])
      });
    } catch (error) {
      console.error('[Blacklist Update] 更新失败:', error);
      return res.status(500).json({ 
        ok: false, 
        error: '更新黑名单记录失败: ' + error.message 
      });
    }
  });

  // ==================== 审核黑名单记录（仅超管） ====================
  // POST /api/blacklist/:id/verify
  // 仅超级管理员可访问
  router.post('/:id/verify', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { verifyNote } = req.body;
      
      const user = req.user;
      
      await pool.query(
        `UPDATE blacklist SET
         verified = 1,
         verified_by = ?,
         verify_time = NOW(),
         verify_note = ?
         WHERE id = ?`,
        [user.id, verifyNote || '', id]
      );
      
      const [updated] = await pool.query(
        'SELECT * FROM blacklist WHERE id = ?',
        [id]
      );
      
      if (updated.length === 0) {
        return res.status(404).json({ 
          ok: false, 
          error: '黑名单记录不存在' 
        });
      }
      
      return res.json({ 
        ok: true, 
        data: toDto(updated[0])
      });
    } catch (error) {
      console.error('[Blacklist Verify] 审核失败:', error);
      return res.status(500).json({ 
        ok: false, 
        error: '审核黑名单记录失败: ' + error.message 
      });
    }
  });

  // ==================== 移除黑名单记录（仅超管） ====================
  // POST /api/blacklist/:id/remove
  // 仅超级管理员可访问
  router.post('/:id/remove', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { removeReason } = req.body;
      
      if (!removeReason) {
        return res.json({ 
          ok: false, 
          error: '请提供移除原因' 
        });
      }
      
      const user = req.user;
      
      await pool.query(
        `UPDATE blacklist SET
         status = 'removed',
         removed_by = ?,
         remove_time = NOW(),
         remove_reason = ?
         WHERE id = ?`,
        [user.id, removeReason, id]
      );
      
      const [updated] = await pool.query(
        'SELECT * FROM blacklist WHERE id = ?',
        [id]
      );
      
      if (updated.length === 0) {
        return res.status(404).json({ 
          ok: false, 
          error: '黑名单记录不存在' 
        });
      }
      
      return res.json({ 
        ok: true, 
        data: toDto(updated[0])
      });
    } catch (error) {
      console.error('[Blacklist Remove] 移除失败:', error);
      return res.status(500).json({ 
        ok: false, 
        error: '移除黑名单记录失败: ' + error.message 
      });
    }
  });

  // ==================== 删除黑名单记录（仅超管，物理删除） ====================
  // DELETE /api/blacklist/:id
  // 仅超级管理员可访问
  router.delete('/:id', authMiddleware, requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // 先删除相关的查询日志
      await pool.query('DELETE FROM blacklist_query_logs WHERE blacklist_id = ?', [id]);
      
      // 删除黑名单记录
      const [result] = await pool.query('DELETE FROM blacklist WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          ok: false, 
          error: '黑名单记录不存在' 
        });
      }
      
      return res.json({ 
        ok: true, 
        message: '黑名单记录已删除'
      });
    } catch (error) {
      console.error('[Blacklist Delete] 删除失败:', error);
      return res.status(500).json({ 
        ok: false, 
        error: '删除黑名单记录失败: ' + error.message 
      });
    }
  });

  // ==================== 获取黑名单统计信息 ====================
  // GET /api/blacklist/stats/summary
  // 所有认证用户可访问
  router.get('/stats/summary', authMiddleware, async (req, res) => {
    try {
      const [stats] = await pool.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'removed' THEN 1 ELSE 0 END) as removed,
          SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as verified,
          SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
          SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high,
          SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium,
          SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) as low
        FROM blacklist
      `);
      
      return res.json({ 
        ok: true, 
        data: stats[0]
      });
    } catch (error) {
      console.error('[Blacklist Stats] 统计失败:', error);
      return res.status(500).json({ 
        ok: false, 
        error: '获取统计信息失败: ' + error.message 
      });
    }
  });

  return router;
}

