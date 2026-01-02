/**
 * 订单设备报停 API (MySQL)
 * 支持报停申请、审批、结束等完整流程
 */
import express from 'express';
import { tenantMiddleware } from '../middleware/tenant.js';
export default function buildOrderSuspensionsRouter(pool) {
  // ⚠️ 必须开启 mergeParams: true 才能获取父级路由的参数 (如 :orderId)
  const router = express.Router({ mergeParams: true });

  // ==================== 报停类型规则配置 ====================
  const SUSPENSION_RULES = {
    weather: {
      name: '天气原因',
      defaultChargeFree: true,
      requiresApproval: false,
      requiresProof: true,
      maxDays: 7
    },
    site_stop: {
      name: '工地停工',
      defaultChargeFree: true,
      requiresApproval: true,
      requiresProof: true,
      maxDays: 30
    },
    maintenance: {
      name: '设备维修',
      defaultChargeFree: true,
      requiresApproval: true,
      requiresProof: false
    },
    customer_request: {
      name: '客户要求',
      defaultChargeFree: false,
      requiresApproval: true,
      discountRate: 50,
      minDays: 3
    }
  };

  // ==================== 获取订单的报停记录列表 ====================
  // GET /api/orders/:orderId/suspensions
  router.get('/', tenantMiddleware, async (req, res) => {
    try {
      console.log('[OrderSuspensions] GET / - Request params:', req.params);
      console.log('[OrderSuspensions] Request URL:', req.originalUrl);
      console.log('[OrderSuspensions] Request path:', req.path);
      const orderId = Number(req.params.orderId);
      console.log('[OrderSuspensions] Parsed orderId:', orderId);
      
      if (!Number.isFinite(orderId) || orderId <= 0) {
        console.log('[OrderSuspensions] ❌ Invalid orderId:', orderId, 'params:', req.params);
        return res.status(400).json({ ok: false, error: 'Invalid order ID' });
      }

      // 验证订单是否存在
      const [orderRows] = await pool.query(
        'SELECT id FROM orders WHERE id = ?',
        [orderId]
      );
      
      if (orderRows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Order not found' });
      }

      // 查询报停记录
      const [rows] = await pool.query(
        `SELECT 
          s.id, s.order_id, s.equipment_id, s.suspension_type, s.reason,
          s.start_date, s.end_date, s.suspension_days, s.is_charge_free,
          s.discount_rate, s.status, s.attachments, s.notes,
          s.approved_by, s.approved_at, s.created_by, s.created_at, s.updated_at,
          e.equipment_code, e.brand, e.model, e.type,
          approver.name AS approver_name,
          creator.name AS creator_name
         FROM order_suspensions s
         LEFT JOIN equipments e ON e.id = s.equipment_id
         LEFT JOIN users approver ON approver.id = s.approved_by
         LEFT JOIN users creator ON creator.id = s.created_by
         WHERE s.order_id = ?
         ORDER BY s.created_at DESC`,
        [orderId]
      );

      // 解析 attachments JSON 并展开数据
      const processedRows = (rows || []).map(row => {
        const extraData = typeof row.attachments === 'string'
          ? JSON.parse(row.attachments || '{}')
          : (row.attachments || {});
        
        return {
          id: String(row.id),
          orderId: String(row.order_id),
          equipmentId: row.equipment_id ? String(row.equipment_id) : undefined,
          suspensionType: row.suspension_type,
          reason: row.reason,
          startDate: row.start_date,
          endDate: row.end_date,
          suspensionDays: row.suspension_days,
          isChargeFree: row.is_charge_free === 1,
          discountRate: Number(row.discount_rate || 0),
          status: row.status,
          notes: row.notes,
          approvedBy: row.approved_by ? String(row.approved_by) : undefined,
          approvedAt: row.approved_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          equipmentCode: row.equipment_code,
          brand: row.brand,
          model: row.model,
          type: row.type,
          approverName: row.approver_name,
          creatorName: row.creator_name,
          // 展开 attachments 中的额外数据
          suspensionNumber: extraData.suspensionNumber,
          contractName: extraData.contractName,
          equipmentSelections: extraData.equipmentSelections || [],
          attachments: extraData.attachments || []
        };
      });

      res.json({ ok: true, data: processedRows });
    } catch (err) {
      console.error('[OrderSuspensions] List error:', err);
      res.status(500).json({ ok: false, error: err.message || 'List error' });
    }
  });

  // ==================== 创建报停申请 ====================
  // POST /api/orders/:orderId/suspensions
  router.post('/', tenantMiddleware, async (req, res) => {
    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();
      
      const orderId = Number(req.params.orderId);
      const record = req.body;
      
      console.log('[OrderSuspensions] POST / - 创建报停记录');
      console.log('[OrderSuspensions] 订单ID:', orderId);
      console.log('[OrderSuspensions] 请求体:', JSON.stringify(record, null, 2));
      
      // 提取字段（支持前端提交的格式）
      const suspensionType = record.suspensionType || record.suspension_type;
      const reason = record.reason;
      const startDate = record.startDate || record.start_date;
      const endDate = record.endDate || record.end_date;
      const suspensionDays = record.suspensionDays || record.suspension_days;
      const equipmentId = record.equipmentId || record.equipment_id || null;
      const equipmentSelections = record.equipmentSelections || record.equipment_selections || [];
      const suspensionNumber = record.suspensionNumber || record.suspension_number;
      const contractName = record.contractName || record.contract_name;
      const attachments = record.attachments || [];

      console.log('[OrderSuspensions] 提取的字段:');
      console.log('  - suspensionType:', suspensionType);
      console.log('  - startDate:', startDate);
      console.log('  - endDate:', endDate);
      console.log('  - suspensionDays:', suspensionDays);
      console.log('  - equipmentSelections:', JSON.stringify(equipmentSelections));

      // 验证必填字段
      if (!suspensionType || !startDate) {
        console.error('[OrderSuspensions] ❌ 验证失败: 缺少必填字段');
        console.error('  - suspensionType:', suspensionType, '(required)');
        console.error('  - startDate:', startDate, '(required)');
        return res.status(400).json({ 
          ok: false, 
          error: `报停类型和开始日期是必需的。收到: suspensionType=${suspensionType}, startDate=${startDate}` 
        });
      }

      // 验证报停类型
      if (!SUSPENSION_RULES[suspensionType]) {
        console.error('[OrderSuspensions] ❌ 无效的报停类型:', suspensionType);
        console.error('[OrderSuspensions] 可用的报停类型:', Object.keys(SUSPENSION_RULES));
        return res.status(400).json({ 
          ok: false, 
          error: `无效的报停类型: ${suspensionType}。可用类型: ${Object.keys(SUSPENSION_RULES).join(', ')}` 
        });
      }

      const rules = SUSPENSION_RULES[suspensionType];

      // 验证订单是否存在
      const [orderRows] = await conn.query(
        'SELECT id FROM orders WHERE id = ?',
        [orderId]
      );
      
      if (orderRows.length === 0) {
        throw new Error('Order not found');
      }

      // ==================== 验证报停日期和设备的唯一性 ====================
      // 检查同一设备是否在相同日期范围内已有报停记录
      if (equipmentSelections && Array.isArray(equipmentSelections) && equipmentSelections.length > 0) {
        // 获取该订单的所有报停记录
        const [existingSuspensions] = await conn.query(
          `SELECT id, start_date, end_date, attachments 
           FROM order_suspensions 
           WHERE order_id = ? AND status != 'cancelled'`,
          [orderId]
        );

        console.log('[OrderSuspensions] 检查报停冲突 - 现有报停记录数:', existingSuspensions.length);
        
        // 提取所有要报停的设备编号（扁平化）
        const newEquipmentCodes = equipmentSelections.flat().filter(Boolean);
        console.log('[OrderSuspensions] 新报停的设备编号:', newEquipmentCodes);
        
        // 检查每个现有报停记录是否与新报停冲突
        for (const existing of existingSuspensions) {
          try {
            // 解析现有报停记录的 attachments 获取设备列表
            const existingAttachments = typeof existing.attachments === 'string'
              ? JSON.parse(existing.attachments || '{}')
              : (existing.attachments || {});
            
            const existingEquipmentCodes = (existingAttachments.equipmentSelections || [])
              .flat()
              .filter(Boolean);
            
            if (existingEquipmentCodes.length === 0) continue;
            
            // 检查是否有相同的设备
            const hasCommonEquipment = newEquipmentCodes.some(code => 
              existingEquipmentCodes.includes(String(code))
            );
            
            if (!hasCommonEquipment) continue;
            
            // 有相同设备，检查日期是否重叠
            const existingStart = new Date(existing.start_date);
            const existingEnd = existing.end_date ? new Date(existing.end_date) : new Date('9999-12-31');
            const newStart = new Date(startDate);
            const newEnd = endDate ? new Date(endDate) : new Date('9999-12-31');
            
            // 判断日期是否重叠：A.start <= B.end && B.start <= A.end
            const hasDateOverlap = newStart <= existingEnd && existingStart <= newEnd;
            
            if (hasDateOverlap) {
              // 找出冲突的设备编号
              const conflictCodes = newEquipmentCodes.filter(code => 
                existingEquipmentCodes.includes(String(code))
              );
              
              console.error('[OrderSuspensions] ❌ 发现报停冲突:');
              console.error('  - 冲突设备:', conflictCodes);
              console.error('  - 现有报停:', existing.start_date, '至', existing.end_date);
              console.error('  - 新报停:', startDate, '至', endDate);
              
              return res.status(400).json({
                ok: false,
                error: `设备 ${conflictCodes.join(', ')} 在 ${existing.start_date} 至 ${existing.end_date || '未结束'} 期间已有报停记录，不能重复报停`
              });
            }
          } catch (parseError) {
            console.error('[OrderSuspensions] 解析现有报停记录失败:', parseError);
            // 继续检查下一条记录
          }
        }
        
        console.log('[OrderSuspensions] ✅ 报停冲突检查通过');
      }

      // 如果指定了设备，验证设备是否存在且属于该订单
      if (equipmentId) {
        const [equipmentRows] = await conn.query(
          `SELECT e.id FROM equipments e
           INNER JOIN order_entries oe ON oe.equipment_id = e.id
           WHERE e.id = ? AND oe.order_id = ?`,
          [equipmentId, orderId]
        );
        
        if (equipmentRows.length === 0) {
          throw new Error('设备未找到或不属于该订单');
        }
      }

      // 计算报停天数（如果提供了结束日期且未提供天数）
      let calculatedSuspensionDays = suspensionDays;
      if (!calculatedSuspensionDays && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        calculatedSuspensionDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        // 验证最大报停天数
        if (rules.maxDays && calculatedSuspensionDays > rules.maxDays) {
          return res.status(400).json({
            ok: false,
            error: `${rules.name}的最大报停天数为${rules.maxDays}天`
          });
        }
      }

      // 设置默认值
      const isChargeFree = rules.defaultChargeFree ? 1 : 0;
      const discountRate = isChargeFree ? 100 : (rules.discountRate || 0);
      const status = rules.requiresApproval ? 'pending' : 'approved';
      const approvedAt = rules.requiresApproval ? null : new Date();
      const approvedBy = rules.requiresApproval ? null : req.user?.id;

      // 构建 attachments JSON，包含所有额外数据
      const attachmentsData = {
        suspensionNumber: suspensionNumber || undefined,
        contractName: contractName || undefined,
        equipmentSelections: Array.isArray(equipmentSelections) ? equipmentSelections : (equipmentSelections ? [equipmentSelections] : []),
        attachments: Array.isArray(attachments) ? attachments : []
      };

      // 创建报停记录
      const [result] = await conn.query(
        `INSERT INTO order_suspensions (
          order_id, equipment_id, suspension_type, reason,
          start_date, end_date, suspension_days,
          is_charge_free, discount_rate, status,
          attachments, approved_by, approved_at,
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          orderId,
          equipmentId || null,
          suspensionType,
          reason || null,
          startDate,
          endDate || null,
          calculatedSuspensionDays,
          isChargeFree,
          discountRate,
          status,
          JSON.stringify(attachmentsData),
          approvedBy,
          approvedAt,
          req.user?.id || null
        ]
      );

      // 记录操作日志
      await conn.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, created_at)
         VALUES (?, 'suspension_created', 'order', ?, ?, NOW())`,
        [
          req.user?.id || null,
          orderId,
          JSON.stringify({ suspensionId: result.insertId, suspensionType, startDate })
        ]
      );

      await conn.commit();

      // 查询新创建的记录
      const [rows] = await pool.query(
        `SELECT 
          s.*, 
          e.equipment_code,
          approver.name AS approver_name,
          creator.name AS creator_name
         FROM order_suspensions s
         LEFT JOIN equipments e ON e.id = s.equipment_id
         LEFT JOIN users approver ON approver.id = s.approved_by
         LEFT JOIN users creator ON creator.id = s.created_by
         WHERE s.id = ?`,
        [result.insertId]
      );

      // 解析 attachments JSON 并展开数据
      const row = rows[0];
      const extraData = typeof row.attachments === 'string'
        ? JSON.parse(row.attachments || '{}')
        : (row.attachments || {});

      const processedRow = {
        id: String(row.id),
        orderId: String(row.order_id),
        equipmentId: row.equipment_id ? String(row.equipment_id) : undefined,
        suspensionType: row.suspension_type,
        reason: row.reason,
        startDate: row.start_date,
        endDate: row.end_date,
        suspensionDays: row.suspension_days,
        isChargeFree: row.is_charge_free === 1,
        discountRate: Number(row.discount_rate || 0),
        status: row.status,
        notes: row.notes,
        approvedBy: row.approved_by ? String(row.approved_by) : undefined,
        approvedAt: row.approved_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        equipmentCode: row.equipment_code,
        approverName: row.approver_name,
        creatorName: row.creator_name,
        // 展开 attachments 中的额外数据
        suspensionNumber: extraData.suspensionNumber,
        contractName: extraData.contractName,
        equipmentSelections: extraData.equipmentSelections || [],
        attachments: extraData.attachments || []
      };

      res.status(201).json({ 
        ok: true, 
        data: processedRow,
        message: rules.requiresApproval ? '报停申请已提交，等待审批' : '报停已自动批准'
      });
    } catch (err) {
      await conn.rollback();
      console.error('[OrderSuspensions] ❌ Create error:', err);
      console.error('[OrderSuspensions] 错误堆栈:', err.stack);
      
      // 如果是已知的验证错误，返回400
      if (err.message && (
        err.message.includes('Order not found') ||
        err.message.includes('设备未找到') ||
        err.message.includes('最大报停天数')
      )) {
        return res.status(400).json({ 
          ok: false, 
          error: err.message 
        });
      }
      
      res.status(500).json({ 
        ok: false, 
        error: err.message || '创建报停记录失败' 
      });
    } finally {
      conn.release();
    }
  });

  // ==================== 审批报停申请 ====================
  // PUT /api/orders/:orderId/suspensions/:id/approve
  router.put('/:id/approve', tenantMiddleware, async (req, res) => {
    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();
      
      const orderId = Number(req.params.orderId);
      const suspensionId = Number(req.params.id);
      const {
        status,           // 'approved' or 'rejected'
        isChargeFree,
        discountRate,
        notes
      } = req.body;

      // 验证参数
      if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Status must be either approved or rejected' 
        });
      }

      // 查询报停记录
      const [suspensionRows] = await conn.query(
        'SELECT * FROM order_suspensions WHERE id = ? AND order_id = ?',
        [suspensionId, orderId]
      );
      
      if (suspensionRows.length === 0) {
        throw new Error('Suspension record not found');
      }

      const suspension = suspensionRows[0];

      // 检查状态
      if (suspension.status !== 'pending') {
        throw new Error(`Cannot approve suspension with status: ${suspension.status}`);
      }

      // 更新报停记录
      await conn.query(
        `UPDATE order_suspensions 
         SET status = ?,
             is_charge_free = COALESCE(?, is_charge_free),
             discount_rate = COALESCE(?, discount_rate),
             notes = COALESCE(?, notes),
             approved_by = ?,
             approved_at = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        [
          status,
          isChargeFree,
          discountRate,
          notes,
          req.user?.id || null,
          suspensionId
        ]
      );

      // 记录操作日志
      await conn.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, created_at)
         VALUES (?, 'suspension_approved', 'order', ?, ?, NOW())`,
        [
          req.user?.id || null,
          orderId,
          JSON.stringify({ suspensionId, status })
        ]
      );

      await conn.commit();

      // 返回更新后的记录
      const [rows] = await pool.query(
        `SELECT 
          s.*, 
          e.equipment_code,
          approver.name AS approver_name,
          creator.name AS creator_name
         FROM order_suspensions s
         LEFT JOIN equipments e ON e.id = s.equipment_id
         LEFT JOIN users approver ON approver.id = s.approved_by
         LEFT JOIN users creator ON creator.id = s.created_by
         WHERE s.id = ?`,
        [suspensionId]
      );

      res.json({ 
        ok: true, 
        data: rows[0],
        message: status === 'approved' ? '报停已批准' : '报停已拒绝'
      });
    } catch (err) {
      await conn.rollback();
      console.error('[OrderSuspensions] Approve error:', err);
      res.status(500).json({ 
        ok: false, 
        error: err.message || 'Approve error' 
      });
    } finally {
      conn.release();
    }
  });

  // ==================== 结束报停 ====================
  // PUT /api/orders/:orderId/suspensions/:id/end
  router.put('/:id/end', tenantMiddleware, async (req, res) => {
    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();
      
      const orderId = Number(req.params.orderId);
      const suspensionId = Number(req.params.id);
      const { endDate, notes } = req.body;

      if (!endDate) {
        return res.status(400).json({ 
          ok: false, 
          error: 'End date is required' 
        });
      }

      // 查询报停记录
      const [suspensionRows] = await conn.query(
        'SELECT * FROM order_suspensions WHERE id = ? AND order_id = ?',
        [suspensionId, orderId]
      );
      
      if (suspensionRows.length === 0) {
        throw new Error('Suspension record not found');
      }

      const suspension = suspensionRows[0];

      // 检查状态
      if (suspension.status === 'ended') {
        throw new Error('Suspension already ended');
      }

      if (suspension.status !== 'approved') {
        throw new Error('Can only end approved suspensions');
      }

      // 计算报停天数
      const start = new Date(suspension.start_date);
      const end = new Date(endDate);
      const suspensionDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

      if (suspensionDays < 0) {
        throw new Error('End date cannot be before start date');
      }

      // 更新报停记录
      await conn.query(
        `UPDATE order_suspensions 
         SET end_date = ?,
             suspension_days = ?,
             status = 'ended',
             notes = COALESCE(?, notes),
             updated_at = NOW()
         WHERE id = ?`,
        [endDate, suspensionDays, notes, suspensionId]
      );

      // 记录操作日志
      await conn.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, created_at)
         VALUES (?, 'suspension_ended', 'order', ?, ?, NOW())`,
        [
          req.user?.id || null,
          orderId,
          JSON.stringify({ suspensionId, endDate, suspensionDays })
        ]
      );

      await conn.commit();

      // 返回更新后的记录
      const [rows] = await pool.query(
        `SELECT 
          s.*, 
          e.equipment_code,
          approver.name AS approver_name,
          creator.name AS creator_name
         FROM order_suspensions s
         LEFT JOIN equipments e ON e.id = s.equipment_id
         LEFT JOIN users approver ON approver.id = s.approved_by
         LEFT JOIN users creator ON creator.id = s.created_by
         WHERE s.id = ?`,
        [suspensionId]
      );

      res.json({ 
        ok: true, 
        data: rows[0],
        message: '报停已结束'
      });
    } catch (err) {
      await conn.rollback();
      console.error('[OrderSuspensions] End error:', err);
      res.status(500).json({ 
        ok: false, 
        error: err.message || 'End error' 
      });
    } finally {
      conn.release();
    }
  });

  // ==================== 删除报停记录 ====================
  // DELETE /api/orders/:orderId/suspensions/:id
  router.delete('/:id', tenantMiddleware, async (req, res) => {
    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();
      
      const orderId = Number(req.params.orderId);
      const suspensionId = Number(req.params.id);

      // 查询报停记录
      const [suspensionRows] = await conn.query(
        'SELECT * FROM order_suspensions WHERE id = ? AND order_id = ?',
        [suspensionId, orderId]
      );
      
      if (suspensionRows.length === 0) {
        throw new Error('Suspension record not found');
      }

      const suspension = suspensionRows[0];

      // 允许删除任意状态的报停记录
      
      // 删除报停记录
      await conn.query(
        'DELETE FROM order_suspensions WHERE id = ?',
        [suspensionId]
      );

      // 记录操作日志
      await conn.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, created_at)
         VALUES (?, 'suspension_deleted', 'order', ?, ?, NOW())`,
        [
          req.user?.id || null,
          orderId,
          JSON.stringify({ suspensionId })
        ]
      );

      await conn.commit();

      res.json({ 
        ok: true,
        message: '报停记录已删除'
      });
    } catch (err) {
      await conn.rollback();
      console.error('[OrderSuspensions] Delete error:', err);
      res.status(500).json({ 
        ok: false, 
        error: err.message || 'Delete error' 
      });
    } finally {
      conn.release();
    }
  });

  // ==================== 获取报停统计 ====================
  // GET /api/orders/:orderId/suspensions/stats
  router.get('/stats', tenantMiddleware, async (req, res) => {
    try {
      const orderId = Number(req.params.orderId);
      
      const [stats] = await pool.query(
        `SELECT 
          COUNT(*) as total_suspensions,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
          SUM(CASE WHEN status = 'ended' THEN 1 ELSE 0 END) as ended_count,
          COALESCE(SUM(CASE WHEN status = 'ended' THEN suspension_days ELSE 0 END), 0) as total_suspension_days,
          COALESCE(SUM(CASE WHEN status = 'ended' AND is_charge_free = 1 THEN suspension_days ELSE 0 END), 0) as free_suspension_days
         FROM order_suspensions
         WHERE order_id = ?`,
        [orderId]
      );

      res.json({ ok: true, data: stats[0] });
    } catch (err) {
      console.error('[OrderSuspensions] Stats error:', err);
      res.status(500).json({ ok: false, error: err.message || 'Stats error' });
    }
  });

  return router;
}

