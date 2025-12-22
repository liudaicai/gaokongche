// 一户一库，不需要租户过滤
// 设备维修管理路由
import express from 'express';
export default function buildEquipmentRepairsRouterMySQL(pool) {
  const router = express.Router();

  // 确保维修单表存在
  let REPAIR_TABLE_READY = false;
  async function ensureRepairTable() {
    if (REPAIR_TABLE_READY) return;
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS equipment_repairs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        repair_number VARCHAR(50) NOT NULL COMMENT '维修单号',
        equipment_code VARCHAR(50) NOT NULL COMMENT '设备编号',
        equipment_id INT NULL COMMENT '设备ID',
        order_id INT NULL COMMENT '关联订单ID',
        exit_id INT NULL COMMENT '关联退场记录ID',
        damage_type VARCHAR(50) NULL COMMENT '损坏类型',
        damage_parts JSON NULL COMMENT '损坏部件列表',
        damage_description TEXT NULL COMMENT '损坏描述',
        repair_person VARCHAR(100) NULL COMMENT '维修人员',
        repair_cost DECIMAL(12,2) DEFAULT 0.00 COMMENT '维修费用',
        repair_start_date DATE NULL COMMENT '开始维修日期',
        repair_end_date DATE NULL COMMENT '完成维修日期',
        status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '维修状态：pending待维修, repairing维修中, completed已完成, cancelled已取消',
        remark TEXT NULL COMMENT '备注',
        attachments JSON NULL COMMENT '附件',
        company_id INT NOT NULL COMMENT '公司ID',
        created_by INT NULL COMMENT '创建人ID',
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        UNIQUE KEY uniq_repair_number (repair_number),
        INDEX idx_equipment_code (equipment_code),
        INDEX idx_equipment_id (equipment_id),
        INDEX idx_order_id (order_id),
        INDEX idx_status (status),
        INDEX idx_company_id (company_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备维修单';`);

      REPAIR_TABLE_READY = true;

      // 自动迁移：尝试添加可能缺失的列（忽略已存在错误）
      const migrations = [
        "ALTER TABLE equipment_repairs ADD COLUMN attachments JSON NULL COMMENT '附件'",
        "ALTER TABLE equipment_repairs ADD COLUMN damage_parts JSON NULL COMMENT '损坏部件列表'",
        "ALTER TABLE equipment_repairs ADD COLUMN damage_description TEXT NULL COMMENT '损坏描述'",
        "ALTER TABLE equipment_repairs ADD COLUMN exit_id INT NULL COMMENT '关联退场记录ID'",
        "ALTER TABLE equipment_repairs ADD COLUMN is_video_diagnosis BOOLEAN DEFAULT FALSE COMMENT '是否视频判断'",
        "ALTER TABLE equipment_repairs ADD COLUMN contact_name VARCHAR(50) NULL COMMENT '联系人'",
        "ALTER TABLE equipment_repairs ADD COLUMN contact_phone VARCHAR(50) NULL COMMENT '联系电话'"
      ];

      for (const sql of migrations) {
        try {
          await pool.query(sql);
        } catch (e) {
          // 忽略 "Duplicate column name" 错误 (errno 1060)
          if (e.errno !== 1060) {
            console.warn('[EquipmentRepairs.MySQL] Migration warning:', e.message);
          }
        }
      }

      console.log('[EquipmentRepairs.MySQL] Repair table ready');
    } catch (e) {
      console.error('[EquipmentRepairs.MySQL] Ensure repair table error:', e);
    }
  }

  // 辅助函数：安全解析JSON
  const safeJsonParse = (value, defaultValue = []) => {
    if (!value) return defaultValue;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch (e) {
      return defaultValue;
    }
  };

  // 辅助函数：格式化日期
  const formatDate = (dateStr) => {
    if (!dateStr) return undefined;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().split('T')[0];
  };

  // GET /api/equipment-repairs - 获取维修单列表
  router.get('/', async (req, res) => {
    try {
      await ensureRepairTable();

      const {
        page = '1',
        pageSize = '20',
        equipmentCode,
        status,
        startDate,
        endDate
      } = req.query;

      const pageNum = Number(page);
      const pageSizeNum = Number(pageSize);
      const offset = (pageNum - 1) * pageSizeNum;

      // 一户一库，不需要租户过滤（多租户已移除）
      // 构建查询条件
      let whereConditions = ['1=1'];
      let queryParams = [];

      if (equipmentCode) {
        whereConditions.push('r.equipment_code LIKE ?');
        queryParams.push(`%${equipmentCode}%`);
      }

      if (status) {
        whereConditions.push('r.status = ?');
        queryParams.push(status);
      }

      if (startDate) {
        whereConditions.push('r.created_at >= ?');
        queryParams.push(startDate);
      }

      if (endDate) {
        whereConditions.push('r.created_at <= ?');
        queryParams.push(endDate + ' 23:59:59');
      }

      const whereClause = whereConditions.join(' AND ');

      // 获取总数
      const [countResult] = await pool.query(
        `SELECT COUNT(*) as total FROM equipment_repairs r WHERE ${whereClause}`,
        queryParams
      );
      const total = countResult[0]?.total || 0;

      // 获取列表数据
      const [rows] = await pool.query(
        `SELECT r.*, e.custom_code, e.type, e.model, u.name as creator_name
         FROM equipment_repairs r
         LEFT JOIN equipments e ON e.code COLLATE utf8mb4_unicode_ci = r.equipment_code COLLATE utf8mb4_unicode_ci
         LEFT JOIN users u ON u.id = r.created_by
         WHERE ${whereClause}
         ORDER BY r.created_at DESC, r.id DESC
         LIMIT ? OFFSET ?`,
        [...queryParams, pageSizeNum, offset]
      );

      const data = rows.map(row => ({
        id: String(row.id),
        repairNumber: row.repair_number,
        equipmentCode: row.equipment_code,
        equipmentId: row.equipment_id ? String(row.equipment_id) : null,
        customCode: row.custom_code || '',
        equipmentType: row.type || '',
        equipmentModel: row.model || '',
        orderId: row.order_id ? String(row.order_id) : null,
        exitId: row.exit_id ? String(row.exit_id) : null,
        damageType: row.damage_type || '',
        damageParts: safeJsonParse(row.damage_parts, []),
        damageDescription: row.damage_description || '',
        repairPerson: row.repair_person || '',
        repairCost: Number(row.repair_cost || 0),
        repairStartDate: formatDate(row.repair_start_date),
        repairEndDate: formatDate(row.repair_end_date),
        status: row.status,
        remark: row.remark || '',
        attachments: safeJsonParse(row.attachments, []),
        createdBy: row.created_by ? String(row.created_by) : null,
        creatorName: row.creator_name || '',
        createdAt: row.created_at?.toISOString?.() || row.created_at,
        updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
      }));

      res.json({
        ok: true,
        data,
        page: pageNum,
        pageSize: pageSizeNum,
        total
      });
    } catch (err) {
      console.error('[EquipmentRepairs.MySQL] List error:', err);
      res.status(500).json({
        ok: false,
        error: err?.message || 'List error',
        sqlMessage: err?.sqlMessage,
        sqlState: err?.sqlState
      });
    }
  });

  // GET /api/equipment-repairs/:id - 获取单个维修单
  router.get('/:id', async (req, res) => {
    try {
      await ensureRepairTable();

      const id = Number(req.params.id);
      // 一户一库，不需要租户过滤
      const [rows] = await pool.query(
        `SELECT r.*, e.custom_code, e.type, e.model, u.name as creator_name
         FROM equipment_repairs r
         LEFT JOIN equipments e ON e.code = r.equipment_code
         LEFT JOIN users u ON u.id = r.created_by
         WHERE r.id = ? AND 1=1`,
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Repair not found' });
      }

      const row = rows[0];
      const data = {
        id: String(row.id),
        repairNumber: row.repair_number,
        equipmentCode: row.equipment_code,
        equipmentId: row.equipment_id ? String(row.equipment_id) : null,
        customCode: row.custom_code || '',
        equipmentType: row.type || '',
        equipmentModel: row.model || '',
        orderId: row.order_id ? String(row.order_id) : null,
        exitId: row.exit_id ? String(row.exit_id) : null,
        damageType: row.damage_type || '',
        damageParts: safeJsonParse(row.damage_parts, []),
        damageDescription: row.damage_description || '',
        repairPerson: row.repair_person || '',
        repairCost: Number(row.repair_cost || 0),
        repairStartDate: formatDate(row.repair_start_date),
        repairEndDate: formatDate(row.repair_end_date),
        status: row.status,
        remark: row.remark || '',
        attachments: safeJsonParse(row.attachments, []),
        createdBy: row.created_by ? String(row.created_by) : null,
        creatorName: row.creator_name || '',
        createdAt: row.created_at?.toISOString?.() || row.created_at,
        updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
      };

      res.json({ ok: true, data });
    } catch (err) {
      console.error('[EquipmentRepairs.MySQL] Get error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Get error' });
    }
  });

  // POST /api/equipment-repairs - 创建维修单
  router.post('/', async (req, res) => {
    try {
      await ensureRepairTable();

      const {
        equipmentCode,
        equipmentId,
        orderId,
        exitId,
        damageType,
        damageParts,
        damageDescription,
        repairPerson,
        repairCost,
        repairStartDate,
        remark,
        attachments,
        isVideoDiagnosis,
        contactName,
        contactPhone
      } = req.body;

      if (!equipmentCode) {
        return res.status(400).json({ ok: false, error: 'Equipment code is required' });
      }

      // 不再检查 company_id（多租户已移除）
      const companyId = null;

      // 生成维修单号（格式：WX + 年月日 + 6位序号）
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const [countRows] = await pool.query(
        'SELECT COUNT(*) as count FROM equipment_repairs WHERE repair_number LIKE ?',
        [`WX${dateStr}%`]
      );
      const seq = String((countRows[0]?.count || 0) + 1).padStart(6, '0');
      const repairNumber = `WX${dateStr}${seq}`;

      const now = new Date();
      const [result] = await pool.query(
        `INSERT INTO equipment_repairs (
          repair_number, equipment_code, equipment_id, order_id, exit_id,
          damage_type, damage_parts, damage_description,
          repair_person, repair_cost, repair_start_date,
          status, remark, attachments,
          is_video_diagnosis, contact_name, contact_phone,
          company_id, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          repairNumber,
          equipmentCode,
          equipmentId || null,
          orderId || null,
          exitId || null,
          damageType || null,
          damageParts ? JSON.stringify(damageParts) : null,
          damageDescription || null,
          repairPerson || null,
          repairCost || 0,
          repairStartDate || null,
          'pending',
          remark || null,
          attachments ? JSON.stringify(attachments) : null,
          isVideoDiagnosis || false,
          contactName || null,
          contactPhone || null,
          companyId,
          req.user.id,
          now,
          now
        ]
      );

      // 更新设备状态为维修中
      await pool.query(
        `UPDATE equipments SET status = 'maintenance', updated_at = NOW() WHERE code = ?`,
        [equipmentCode]
      );

      res.json({
        ok: true,
        id: String(result.insertId),
        repairNumber
      });
    } catch (err) {
      console.error('[EquipmentRepairs.MySQL] Create error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Create error' });
    }
  });

  // PUT /api/equipment-repairs/:id - 更新维修单
  router.put('/:id', async (req, res) => {
    try {
      await ensureRepairTable();

      const id = Number(req.params.id);
      const {
        damageType,
        damageParts,
        damageDescription,
        repairPerson,
        repairCost,
        repairStartDate,
        repairEndDate,
        status,
        remark,
        attachments
      } = req.body;

      // 一户一库，不需要租户过滤
      // 先查询维修单获取设备编号
      const [repairRows] = await pool.query(
        `SELECT equipment_code, status as old_status FROM equipment_repairs WHERE id = ? AND 1=1`,
        [id]
      );

      if (repairRows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Repair not found' });
      }

      const equipmentCode = repairRows[0].equipment_code;
      const oldStatus = repairRows[0].old_status;

      const now = new Date();
      const [result] = await pool.query(
        `UPDATE equipment_repairs SET
          damage_type = COALESCE(?, damage_type),
          damage_parts = COALESCE(?, damage_parts),
          damage_description = COALESCE(?, damage_description),
          repair_person = COALESCE(?, repair_person),
          repair_cost = COALESCE(?, repair_cost),
          repair_start_date = COALESCE(?, repair_start_date),
          repair_end_date = COALESCE(?, repair_end_date),
          status = COALESCE(?, status),
          remark = COALESCE(?, remark),
          attachments = COALESCE(?, attachments),
          updated_at = ?
         WHERE id = ? AND 1=1`,
        [
          damageType || null,
          damageParts ? JSON.stringify(damageParts) : null,
          damageDescription || null,
          repairPerson || null,
          repairCost !== undefined ? repairCost : null,
          repairStartDate || null,
          repairEndDate || null,
          status || null,
          remark || null,
          attachments ? JSON.stringify(attachments) : null,
          now,
          id
        ]
      );

      // 如果维修单状态变更为已完成，更新设备状态为可用
      if (status === 'completed' && oldStatus !== 'completed') {
        await pool.query(
          `UPDATE equipments SET status = 'available', updated_at = NOW() WHERE code = ?`,
          [equipmentCode]
        );
      }

      res.json({ ok: true, affectedRows: result.affectedRows });
    } catch (err) {
      console.error('[EquipmentRepairs.MySQL] Update error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Update error' });
    }
  });

  // DELETE /api/equipment-repairs/:id - 删除维修单（取消维修）
  router.delete('/:id', async (req, res) => {
    try {
      await ensureRepairTable();

      const id = Number(req.params.id);
      // 一户一库，不需要租户过滤
      // 先查询维修单获取设备编号
      const [repairRows] = await pool.query(
        `SELECT equipment_code, status FROM equipment_repairs WHERE id = ? AND 1=1`,
        [id]
      );

      if (repairRows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Repair not found' });
      }

      const equipmentCode = repairRows[0].equipment_code;
      const status = repairRows[0].status;

      // 标记为已取消而不是物理删除
      await pool.query(
        `UPDATE equipment_repairs SET status = 'cancelled', updated_at = NOW() WHERE id = ? AND 1=1`,
        [id]
      );

      // 如果维修单是待维修或维修中状态，恢复设备状态为可用
      if (status === 'pending' || status === 'repairing') {
        await pool.query(
          `UPDATE equipments SET status = 'available', updated_at = NOW() WHERE code = ?`,
          [equipmentCode]
        );
      }

      res.json({ ok: true, affectedRows: 1 });
    } catch (err) {
      console.error('[EquipmentRepairs.MySQL] Delete error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete error' });
    }
  });

  // POST /api/equipment-repairs/:id/complete - 完成维修
  router.post('/:id/complete', async (req, res) => {
    try {
      await ensureRepairTable();

      const id = Number(req.params.id);
      const { repairCost, remark, usedParts } = req.body;
      // 一户一库，不需要租户过滤
      // 先查询维修单
      const [repairRows] = await pool.query(
        `SELECT r.equipment_code, r.equipment_id, r.repair_person FROM equipment_repairs r WHERE r.id = ? AND 1=1`,
        [id]
      );

      if (repairRows.length === 0) {
        return res.status(404).json({ ok: false, error: 'Repair not found' });
      }

      const { equipment_code, equipment_id, repair_person } = repairRows[0];
      const now = new Date();

      // 处理配件消耗与高价值记录
      if (usedParts && Array.isArray(usedParts) && usedParts.length > 0) {
        for (const part of usedParts) {
          // 1. 扣减库存 (如果关联了库存配件)
          if (part.accessoryId) {
            // 简单的库存扣减：减少总数和可用数
            await pool.query(
              `UPDATE accessories 
               SET available_quantity = GREATEST(0, available_quantity - ?), 
                   total_quantity = GREATEST(0, total_quantity - ?),
                   total_usage_count = total_usage_count + ?,
                   last_used_date = NOW()
               WHERE id = ? AND company_id IS NULL`,
              [part.quantity || 1, part.quantity || 1, part.quantity || 1, part.accessoryId]
            );
          }

          // 2. 自动生成高价值配件更换记录
          if (part.isHighValue && part.categoryCode) {
            // 查找类别ID
            const [cats] = await pool.query(
              'SELECT id FROM high_value_part_categories WHERE code = ?',
              [part.categoryCode]
            );
            
            if (cats.length > 0) {
              const categoryId = cats[0].id;
              
              // 插入更换记录
              await pool.query(
                `INSERT INTO equipment_part_replacements (
                  equipment_id, part_category_id, part_name, part_model, 
                  part_brand, part_serial_number, replacement_date, 
                  replacement_reason, failure_description, 
                  part_cost, labor_cost, total_cost,
                  technician_name, created_by, company_id,
                  created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [
                  equipment_id,
                  categoryId,
                  part.name,
                  part.model || '',
                  part.brand || '',
                  part.serialNumber || '',
                  '维修更换',
                  `来自维修单(ID:${id})自动生成。${remark || ''}`,
                  part.cost || 0,
                  0, // 人工费通常在维修单总额里，这里设为0或按比例
                  part.cost || 0,
                  repair_person,
                  req.user.id,
                  companyId
                ]
              );
            }
          }
        }
      }

      // 更新维修单状态为已完成
      await pool.query(
        `UPDATE equipment_repairs SET
          status = 'completed',
          repair_end_date = CURDATE(),
          repair_cost = COALESCE(?, repair_cost),
          remark = COALESCE(?, remark),
          damage_parts = ?, -- 更新实际使用的配件列表到 damage_parts 字段作为记录
          updated_at = ?
         WHERE id = ? AND 1=1`,
        [
            repairCost || null, 
            remark || null, 
            usedParts ? JSON.stringify(usedParts.map(p => p.name)) : null, // 简单记录名称
            now, 
            id
        ]
      );

      // 更新设备状态为可用
      await pool.query(
        `UPDATE equipments SET status = 'available', updated_at = NOW() WHERE code = ?`,
        [equipment_code]
      );

      res.json({ ok: true });
    } catch (err) {
      console.error('[EquipmentRepairs.MySQL] Complete error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Complete error' });
    }
  });

  return router;
}
