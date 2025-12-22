/**
 * 高价值配件更换记录 API
 */

import express from 'express';

export default function buildRouter(pool) {
  const router = express.Router();

  /**
   * GET /api/part-replacements/categories
   * 获取配件类别列表
   */
  router.get('/categories', async (req, res) => {
    try {
      const [categories] = await pool.query(
        'SELECT * FROM high_value_part_categories ORDER BY sort_order'
      );

      res.json({
        ok: true,
        data: categories.map(c => ({
          id: c.id,
          categoryName: c.category_name,
          categoryCode: c.category_code,
          description: c.description,
          typicalPriceRange: c.typical_price_range,
          defaultWarrantyMonths: c.default_warranty_months,
          isCritical: Boolean(c.is_critical),
          sortOrder: c.sort_order
        }))
      });
    } catch (error) {
      console.error('[part-replacements] Get categories error:', error);
      res.json({ ok: false, error: '获取配件类别失败' });
    }
  });

  /**
   * POST /api/part-replacements
   * 添加配件更换记录
   */
  router.post('/', async (req, res) => {
    try {
      const {
        equipmentId,
        partCategoryId,
        partName,
        partModel,
        partBrand,
        partSerialNumber,
        replacementDate,
        replacementReason,
        failureDescription,
        oldPartSerialNumber,
        oldPartUsageDays,
        oldPartUsageHours,
        partCost,
        laborCost = 0,
        warrantyMonths,
        warrantyStartDate,
        supplierName,
        supplierContact,
        purchaseOrderNo,
        technicianName,
        workHours,
        orderId,
        invoiceFile,
        photoFiles,
        notes
      } = req.body;

      // 验证必填字段
      if (!equipmentId || !partCategoryId || !partName || !replacementDate || !partCost) {
        return res.json({ ok: false, error: '请填写所有必填字段' });
      }

      // 验证设备是否存在
      const [equipment] = await pool.query(
        'SELECT id FROM equipments WHERE id = ?',
        [equipmentId]
      );

      if (equipment.length === 0) {
        return res.json({ ok: false, error: '设备不存在' });
      }

      // 插入记录（触发器会自动计算总费用和保修信息）
      const [result] = await pool.query(
        `INSERT INTO equipment_part_replacements (
          equipment_id, part_category_id, part_name, part_model, part_brand, part_serial_number,
          replacement_date, replacement_reason, failure_description,
          old_part_serial_number, old_part_usage_days, old_part_usage_hours,
          part_cost, labor_cost, total_cost,
          warranty_months, warranty_start_date,
          supplier_name, supplier_contact, purchase_order_no,
          technician_name, work_hours, order_id,
          invoice_file, photo_files, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          equipmentId, partCategoryId, partName, partModel, partBrand, partSerialNumber,
          replacementDate, replacementReason || '故障', failureDescription,
          oldPartSerialNumber, oldPartUsageDays, oldPartUsageHours,
          partCost, laborCost, parseFloat(partCost) + parseFloat(laborCost || 0),
          warrantyMonths, warrantyStartDate || replacementDate,
          supplierName, supplierContact, purchaseOrderNo,
          technicianName, workHours, orderId,
          invoiceFile, photoFiles ? JSON.stringify(photoFiles) : null, notes,
          req.user ? req.user.id : null
        ]
      );

      // 查询刚插入的记录（包含触发器计算的字段）
      const [inserted] = await pool.query(
        `SELECT r.*, c.category_name, c.category_code
         FROM equipment_part_replacements r
         LEFT JOIN high_value_part_categories c ON r.part_category_id = c.id
         WHERE r.id = ?`,
        [result.insertId]
      );

      res.json({
        ok: true,
        data: formatReplacementRecord(inserted[0]),
        message: '配件更换记录添加成功'
      });
    } catch (error) {
      console.error('[part-replacements] Create error:', error);
      res.json({ ok: false, error: '添加配件更换记录失败：' + error.message });
    }
  });

  /**
   * GET /api/part-replacements/equipment/:equipmentId
   * 获取设备的配件更换历史
   * Query: partCategoryId, startDate, endDate, warrantyStatus
   */
  router.get('/equipment/:equipmentId', async (req, res) => {
    try {
      const { equipmentId } = req.params;
      const { partCategoryId, startDate, endDate, warrantyStatus } = req.query;

      let whereClause = 'WHERE r.equipment_id = ?';
      const params = [equipmentId];

      if (partCategoryId) {
        whereClause += ' AND r.part_category_id = ?';
        params.push(partCategoryId);
      }

      if (startDate) {
        whereClause += ' AND r.replacement_date >= ?';
        params.push(startDate);
      }

      if (endDate) {
        whereClause += ' AND r.replacement_date <= ?';
        params.push(endDate);
      }

      if (warrantyStatus) {
        whereClause += ' AND r.warranty_status = ?';
        params.push(warrantyStatus);
      }

      const [replacements] = await pool.query(
        `SELECT r.*, 
          c.category_name, c.category_code, c.default_warranty_months,
          e.equipment_code, e.brand AS equipment_brand, e.model AS equipment_model,
          DATEDIFF(r.warranty_end_date, CURDATE()) AS days_until_warranty_expires
         FROM equipment_part_replacements r
         LEFT JOIN high_value_part_categories c ON r.part_category_id = c.id
         LEFT JOIN equipments e ON r.equipment_id = e.id
         ${whereClause}
         ORDER BY r.replacement_date DESC`,
        params
      );

      res.json({
        ok: true,
        data: replacements.map(r => formatReplacementRecord(r))
      });
    } catch (error) {
      console.error('[part-replacements] Get by equipment error:', error);
      res.json({ ok: false, error: '获取配件更换历史失败' });
    }
  });

  /**
   * GET /api/part-replacements/:id
   * 获取配件更换记录详情
   */
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const [replacements] = await pool.query(
        `SELECT r.*, 
          c.category_name, c.category_code, c.description AS category_description,
          e.equipment_code, e.brand AS equipment_brand, e.model AS equipment_model,
          DATEDIFF(r.warranty_end_date, CURDATE()) AS days_until_warranty_expires
         FROM equipment_part_replacements r
         LEFT JOIN high_value_part_categories c ON r.part_category_id = c.id
         LEFT JOIN equipments e ON r.equipment_id = e.id
         WHERE r.id = ?`,
        [id]
      );

      if (replacements.length === 0) {
        return res.json({ ok: false, error: '配件更换记录不存在' });
      }

      res.json({
        ok: true,
        data: formatReplacementRecord(replacements[0])
      });
    } catch (error) {
      console.error('[part-replacements] Get detail error:', error);
      res.json({ ok: false, error: '获取配件更换详情失败' });
    }
  });

  /**
   * PUT /api/part-replacements/:id
   * 更新配件更换记录
   */
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // 检查记录是否存在
      const [existing] = await pool.query(
        'SELECT id FROM equipment_part_replacements WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return res.json({ ok: false, error: '配件更换记录不存在' });
      }

      // 构建更新语句
      const allowedFields = [
        'part_name', 'part_model', 'part_brand', 'part_serial_number',
        'replacement_date', 'replacement_reason', 'failure_description',
        'old_part_serial_number', 'old_part_usage_days', 'old_part_usage_hours',
        'part_cost', 'labor_cost',
        'warranty_months', 'warranty_start_date',
        'supplier_name', 'supplier_contact', 'purchase_order_no',
        'technician_name', 'work_hours', 'order_id',
        'invoice_file', 'photo_files', 'notes'
      ];

      const updates = [];
      const values = [];

      for (const field of allowedFields) {
        const camelField = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        if (updateData[camelField] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(updateData[camelField]);
        }
      }

      if (updates.length === 0) {
        return res.json({ ok: false, error: '没有可更新的字段' });
      }

      values.push(id);

      await pool.query(
        `UPDATE equipment_part_replacements SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      // 查询更新后的记录
      const [updated] = await pool.query(
        `SELECT r.*, c.category_name, c.category_code
         FROM equipment_part_replacements r
         LEFT JOIN high_value_part_categories c ON r.part_category_id = c.id
         WHERE r.id = ?`,
        [id]
      );

      res.json({
        ok: true,
        data: formatReplacementRecord(updated[0]),
        message: '配件更换记录更新成功'
      });
    } catch (error) {
      console.error('[part-replacements] Update error:', error);
      res.json({ ok: false, error: '更新配件更换记录失败' });
    }
  });

  /**
   * DELETE /api/part-replacements/:id
   * 删除配件更换记录
   */
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // 检查记录是否存在
      const [existing] = await pool.query(
        'SELECT id FROM equipment_part_replacements WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return res.json({ ok: false, error: '配件更换记录不存在' });
      }

      await pool.query('DELETE FROM equipment_part_replacements WHERE id = ?', [id]);

      res.json({
        ok: true,
        message: '配件更换记录删除成功'
      });
    } catch (error) {
      console.error('[part-replacements] Delete error:', error);
      res.json({ ok: false, error: '删除配件更换记录失败' });
    }
  });

  /**
   * GET /api/part-replacements/warranty/alerts
   * 获取保修到期提醒
   * Query: days (默认30天内到期)
   */
  router.get('/warranty/alerts', async (req, res) => {
    try {
      const { days = 30 } = req.query;

      const [alerts] = await pool.query(
        `SELECT 
          r.id AS replacement_id,
          r.part_name,
          r.part_model,
          r.part_serial_number,
          r.replacement_date,
          r.warranty_end_date,
          r.warranty_status,
          DATEDIFF(r.warranty_end_date, CURDATE()) AS days_remaining,
          e.id AS equipment_id,
          e.equipment_code,
          e.brand AS equipment_brand,
          e.model AS equipment_model,
          c.category_name,
          c.category_code
         FROM equipment_part_replacements r
         INNER JOIN equipments e ON r.equipment_id = e.id
         INNER JOIN high_value_part_categories c ON r.part_category_id = c.id
         WHERE r.warranty_end_date IS NOT NULL
           AND DATEDIFF(r.warranty_end_date, CURDATE()) BETWEEN -30 AND ?
         ORDER BY days_remaining ASC`,
        [days]
      );

      res.json({
        ok: true,
        data: alerts.map(a => ({
          replacementId: a.replacement_id,
          partName: a.part_name,
          partModel: a.part_model,
          partSerialNumber: a.part_serial_number,
          replacementDate: a.replacement_date,
          warrantyEndDate: a.warranty_end_date,
          warrantyStatus: a.warranty_status,
          daysRemaining: a.days_remaining,
          alertLevel: a.days_remaining < 0 ? 'expired' : 
                      a.days_remaining <= 7 ? 'urgent' :
                      a.days_remaining <= 30 ? 'warning' : 'normal',
          equipment: {
            id: a.equipment_id,
            code: a.equipment_code,
            brand: a.equipment_brand,
            model: a.equipment_model
          },
          category: {
            name: a.category_name,
            code: a.category_code
          }
        }))
      });
    } catch (error) {
      console.error('[part-replacements] Get warranty alerts error:', error);
      res.json({ ok: false, error: '获取保修提醒失败' });
    }
  });

  /**
   * GET /api/part-replacements/summary/equipment/:equipmentId
   * 获取设备配件更换汇总
   */
  router.get('/summary/equipment/:equipmentId', async (req, res) => {
    try {
      const { equipmentId } = req.params;

      const [summary] = await pool.query(
        'SELECT * FROM v_equipment_part_summary WHERE equipment_id = ?',
        [equipmentId]
      );

      if (summary.length === 0) {
        return res.json({
          ok: true,
          data: {
            equipmentId: parseInt(equipmentId),
            totalReplacements: 0,
            replacedPartTypes: 0,
            totalReplacementCost: 0,
            lastReplacementDate: null,
            partsUnderWarranty: 0,
            partsExpiringSoon: 0,
            partsOutOfWarranty: 0
          }
        });
      }

      res.json({
        ok: true,
        data: {
          equipmentId: summary[0].equipment_id,
          equipmentCode: summary[0].equipment_code,
          brand: summary[0].brand,
          model: summary[0].model,
          totalReplacements: summary[0].total_replacements || 0,
          replacedPartTypes: summary[0].replaced_part_types || 0,
          totalReplacementCost: Number(summary[0].total_replacement_cost) || 0,
          lastReplacementDate: summary[0].last_replacement_date,
          partsUnderWarranty: summary[0].parts_under_warranty || 0,
          partsExpiringSoon: summary[0].parts_expiring_soon || 0,
          partsOutOfWarranty: summary[0].parts_out_of_warranty || 0
        }
      });
    } catch (error) {
      console.error('[part-replacements] Get summary error:', error);
      res.json({ ok: false, error: '获取配件更换汇总失败' });
    }
  });

  return router;
}

// 辅助函数：格式化配件更换记录
function formatReplacementRecord(record) {
  return {
    id: record.id,
    equipmentId: record.equipment_id,
    equipmentCode: record.equipment_code,
    equipmentBrand: record.equipment_brand,
    equipmentModel: record.equipment_model,
    partCategory: {
      id: record.part_category_id,
      name: record.category_name,
      code: record.category_code,
      description: record.category_description
    },
    partName: record.part_name,
    partModel: record.part_model,
    partBrand: record.part_brand,
    partSerialNumber: record.part_serial_number,
    replacementDate: record.replacement_date,
    replacementReason: record.replacement_reason,
    failureDescription: record.failure_description,
    oldPart: {
      serialNumber: record.old_part_serial_number,
      usageDays: record.old_part_usage_days,
      usageHours: record.old_part_usage_hours
    },
    financial: {
      partCost: Number(record.part_cost),
      laborCost: Number(record.labor_cost),
      totalCost: Number(record.total_cost)
    },
    warranty: {
      months: record.warranty_months,
      startDate: record.warranty_start_date,
      endDate: record.warranty_end_date,
      status: record.warranty_status,
      daysUntilExpires: record.days_until_warranty_expires
    },
    supplier: {
      name: record.supplier_name,
      contact: record.supplier_contact,
      purchaseOrderNo: record.purchase_order_no
    },
    technician: {
      name: record.technician_name,
      workHours: Number(record.work_hours)
    },
    orderId: record.order_id,
    invoiceFile: record.invoice_file,
    photoFiles: record.photo_files ? JSON.parse(record.photo_files) : [],
    notes: record.notes,
    createdBy: record.created_by,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

