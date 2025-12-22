import express from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * 构建换机记录路由
 */
export default function buildEquipmentReplacementsRouter(pool) {
  const router = express.Router();

  // 认证已在 server/index.js 中通过 authMiddleware 处理

  /**
   * POST /api/equipment-replacements
   * 创建换机申请
   */
  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const {
        order_id,
        old_equipment_id,
        new_equipment_id,
        reason,
        responsibility_party = 'company',
        transport_fee = 0,
        transport_fee_payer = 'company',
        remarks = '',
      } = req.body;

      const userId = req.user.id;
      const userName = req.user.name || req.user.username;

      // 验证必填字段
      if (!order_id || !old_equipment_id || !new_equipment_id || !reason) {
        return res.status(400).json({
          ok: false,
          error: '订单ID、原设备ID、新设备ID和更换原因为必填项',
        });
      }

      // 验证新旧设备不能相同
      if (old_equipment_id === new_equipment_id) {
        return res.status(400).json({
          ok: false,
          error: '新设备不能与原设备相同',
        });
      }

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // 1. 查询订单信息
        const [orders] = await connection.query(
          `SELECT contract_number, billing_method FROM orders WHERE id = ? AND is_deleted = 0`,
          [order_id]
        );

        if (orders.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            ok: false,
            error: '订单不存在',
          });
        }

        const order = orders[0];

        // 2. 查询原设备信息
        // 🆕 支持通过设备ID或设备编号查询
        const [oldEquipments] = await connection.query(
          `SELECT id, code, rental_status as status
           FROM equipments
           WHERE (id = ? OR code = ?) AND is_deleted = 0`,
          [old_equipment_id, old_equipment_id]
        );

        if (oldEquipments.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            ok: false,
            error: '原设备不存在或不在此订单中',
          });
        }

        const oldEquipment = oldEquipments[0];

        // 验证原设备状态（使用 rental_status）
        if (oldEquipment.status !== 'renting') {
          await connection.rollback();
          return res.status(400).json({
            ok: false,
            error: '原设备当前状态不是在租，无法更换',
          });
        }

        // 3. 查询新设备信息
        // 🆕 支持通过设备ID或设备编号查询
        const [newEquipments] = await connection.query(
          `SELECT id, code, rental_status as status FROM equipments WHERE (id = ? OR code = ?) AND is_deleted = 0`,
          [new_equipment_id, new_equipment_id]
        );

        if (newEquipments.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            ok: false,
            error: '新设备不存在',
          });
        }

        const newEquipment = newEquipments[0];

        // 验证新设备状态（使用 rental_status）
        if (newEquipment.status !== 'available' && newEquipment.status !== 'idle') {
          await connection.rollback();
          return res.status(400).json({
            ok: false,
            error: `新设备当前状态是"${newEquipment.status}"，不是待租状态，无法用于更换`,
          });
        }

        // 🚨 严格验证：确保新设备没有在其他订单中使用
        const [conflictCheck] = await connection.query(
          `SELECT COUNT(*) as conflict_count
           FROM order_entries oe
           INNER JOIN orders o ON oe.order_id = o.id
           WHERE o.is_deleted = 0
             AND oe.attachments_json IS NOT NULL
             AND JSON_CONTAINS(
               JSON_EXTRACT(oe.attachments_json, '$.equipmentCodes'),
               JSON_ARRAY(?),
               '$'
             )
             AND NOT EXISTS (
               SELECT 1 FROM order_exits oex
               WHERE oex.order_id = o.id
                 AND oex.attachments_json IS NOT NULL
                 AND JSON_CONTAINS(
                   JSON_EXTRACT(oex.attachments_json, '$.equipmentCodes'),
                   JSON_ARRAY(?),
                   '$'
                 )
             )`,
          [newEquipment.code, newEquipment.code]
        );

        if (conflictCheck[0].conflict_count > 0) {
          await connection.rollback();
          return res.status(400).json({
            ok: false,
            error: `设备 ${newEquipment.code} 当前正在其他订单中使用，无法用于换机`,
          });
        }

        // 4. 创建换机记录
        const [result] = await connection.query(
          `INSERT INTO equipment_replacements (
            order_id, order_number,
            old_equipment_id, old_equipment_code,
            new_equipment_id, new_equipment_code,
            reason, responsibility_party,
            transport_fee, transport_fee_payer,
            original_daily_rate, original_monthly_rate,
            keep_original_rate,
            operator_id, operator_name,
            remarks,
            status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 'pending')`,
          [
            order_id,
            order.contract_number,
            oldEquipment.id, // 🔧 使用查询到的设备ID，而不是传入的参数
            oldEquipment.code,
            newEquipment.id, // 🔧 使用查询到的设备ID，而不是传入的参数
            newEquipment.code,
            reason,
            responsibility_party,
            transport_fee || 0,
            transport_fee_payer,
            null, // daily_rate - 暂不记录，审核时从订单获取
            null, // monthly_rate - 暂不记录，审核时从订单获取
            userId,
            userName,
            remarks,
          ]
        );

        await connection.commit();

        res.json({
          ok: true,
          data: {
            id: result.insertId,
            message: '换机申请创建成功，等待审核',
          },
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    })
  );

  /**
   * POST /api/equipment-replacements/:id/approve
   * 审核换机申请
   */
  router.post(
    '/:id/approve',
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { approved } = req.body; // true-通过，false-拒绝

      const userId = req.user.id;

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // 1. 查询换机记录
        const [replacements] = await connection.query(
          `SELECT * FROM equipment_replacements WHERE id = ? AND is_deleted = 0`,
          [id]
        );

        if (replacements.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            ok: false,
            error: '换机记录不存在',
          });
        }

        const replacement = replacements[0];

        if (replacement.status !== 'pending') {
          await connection.rollback();
          return res.status(400).json({
            ok: false,
            error: '该换机申请已审核，无法重复审核',
          });
        }

        if (approved) {
          // 审核通过，执行换机操作
          
          // 🔒 再次验证新设备没有被其他订单使用（防止并发问题）
          const [recheck] = await connection.query(
            `SELECT rental_status FROM equipments WHERE id = ? FOR UPDATE`,
            [replacement.new_equipment_id]
          );

          if (recheck[0].rental_status !== 'available' && recheck[0].rental_status !== 'idle') {
            await connection.rollback();
            return res.status(400).json({
              ok: false,
              error: '新设备已被占用，无法完成换机',
            });
          }

          // 2. 更新原设备状态为待租
          await connection.query(
            `UPDATE equipments SET rental_status = 'available', updated_at = NOW(3) WHERE id = ?`,
            [replacement.old_equipment_id]
          );

          // 3. 更新新设备状态为在租
          await connection.query(
            `UPDATE equipments SET rental_status = 'renting', updated_at = NOW(3) WHERE id = ?`,
            [replacement.new_equipment_id]
          );

          // 4. ✅ 不修改历史进场记录，保持数据完整性
          // 前端通过读取 equipment_replacements 表来动态计算实际设备

          // 5. 更新换机记录状态
          await connection.query(
            `UPDATE equipment_replacements 
             SET status = 'completed',
                 approved_by = ?,
                 approved_at = NOW(3),
                 updated_at = NOW(3)
             WHERE id = ?`,
            [userId, id]
          );

          console.log(`[换机] ✅ 订单 ${replacement.order_id} 换机成功: ${replacement.old_equipment_code} → ${replacement.new_equipment_code}`);
          console.log(`[换机] 📝 历史进场记录保持不变，通过换机记录表维护设备关系`);

          await connection.commit();

          res.json({
            ok: true,
            data: { message: '换机申请已通过，设备已更换成功' },
          });
        } else {
          // 审核拒绝
          await connection.query(
            `UPDATE equipment_replacements 
             SET status = 'rejected',
                 approved_by = ?,
                 approved_at = NOW(3),
                 updated_at = NOW(3)
             WHERE id = ?`,
            [userId, id]
          );

          await connection.commit();

          res.json({
            ok: true,
            data: { message: '换机申请已拒绝' },
          });
        }
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    })
  );

  /**
   * GET /api/equipment-replacements
   * 获取换机记录列表
   */
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { order_id, status, page = 1, limit = 20 } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      let whereConditions = ['er.is_deleted = 0'];
      const queryParams = [];

      if (order_id) {
        whereConditions.push('er.order_id = ?');
        queryParams.push(order_id);
      }

      if (status) {
        whereConditions.push('er.status = ?');
        queryParams.push(status);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // 查询总数
      const [countResult] = await pool.query(
        `SELECT COUNT(*) as total FROM equipment_replacements er ${whereClause}`,
        queryParams
      );

      const total = countResult[0].total;

      // 查询列表
      const [rows] = await pool.query(
        `SELECT 
          er.*,
          oe.model as old_equipment_model,
          oe.brand as old_equipment_brand,
          oe.custom_code as old_equipment_custom_code,
          ne.model as new_equipment_model,
          ne.brand as new_equipment_brand,
          ne.custom_code as new_equipment_custom_code,
          o.contract_number,
          o.project_name,
          c.name as customer_name
         FROM equipment_replacements er
         LEFT JOIN equipments oe ON er.old_equipment_id = oe.id
         LEFT JOIN equipments ne ON er.new_equipment_id = ne.id
         LEFT JOIN orders o ON er.order_id = o.id
         LEFT JOIN customers c ON o.customer_id = c.id
         ${whereClause}
         ORDER BY er.created_at DESC
         LIMIT ? OFFSET ?`,
        [...queryParams, parseInt(limit), offset]
      );

      res.json({
        ok: true,
        data: {
          items: rows,
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    })
  );

  /**
   * GET /api/equipment-replacements/:id
   * 获取换机记录详情
   */
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const [rows] = await pool.query(
        `SELECT 
          er.*,
          oe.model as old_equipment_model,
          oe.brand as old_equipment_brand,
          oe.height as old_equipment_height,
          oe.custom_code as old_equipment_custom_code,
          ne.model as new_equipment_model,
          ne.brand as new_equipment_brand,
          ne.height as new_equipment_height,
          ne.custom_code as new_equipment_custom_code,
          o.contract_number,
          o.project_name,
          c.name as customer_name,
          approver.name as approver_name
         FROM equipment_replacements er
         LEFT JOIN equipments oe ON er.old_equipment_id = oe.id
         LEFT JOIN equipments ne ON er.new_equipment_id = ne.id
         LEFT JOIN orders o ON er.order_id = o.id
         LEFT JOIN customers c ON o.customer_id = c.id
         LEFT JOIN users approver ON er.approved_by = approver.id
         WHERE er.id = ? AND er.is_deleted = 0`,
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          ok: false,
          error: '换机记录不存在',
        });
      }

      res.json({
        ok: true,
        data: rows[0],
      });
    })
  );

  /**
   * DELETE /api/equipment-replacements/:id
   * 删除换机记录（软删除）
   */
  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      // 只能删除pending或rejected状态的记录
      const [replacements] = await pool.query(
        `SELECT status FROM equipment_replacements WHERE id = ? AND is_deleted = 0`,
        [id]
      );

      if (replacements.length === 0) {
        return res.status(404).json({
          ok: false,
          error: '换机记录不存在',
        });
      }

      if (replacements[0].status === 'completed') {
        return res.status(400).json({
          ok: false,
          error: '已完成的换机记录不能删除',
        });
      }

      await pool.query(
        `UPDATE equipment_replacements 
         SET is_deleted = 1, deleted_at = NOW(3) 
         WHERE id = ?`,
        [id]
      );

      res.json({
        ok: true,
        data: { message: '换机记录已删除' },
      });
    })
  );

  return router;
}
