/**
 * 设备使用率统计 API
 */

export default function buildRouter(pool) {
  const router = express.Router();

  /**
   * GET /api/equipment-usage/:equipmentId
   * 获取设备使用率统计
   * Query: startMonth, endMonth
   */
  router.get('/:equipmentId', async (req, res) => {
    try {
      const { equipmentId } = req.params;
      const { startMonth, endMonth } = req.query;

      // 验证参数
      if (!equipmentId) {
        return res.json({ ok: false, error: '设备ID不能为空' });
      }

      // 获取设备信息
      const [equipment] = await pool.query(
        'SELECT * FROM equipments WHERE id = ?',
        [equipmentId]
      );

      if (equipment.length === 0) {
        return res.json({ ok: false, error: '设备不存在' });
      }

      // 构建查询条件
      let whereClause = 'WHERE equipment_id = ?';
      const params = [equipmentId];

      if (startMonth) {
        whereClause += ' AND stat_month >= ?';
        params.push(startMonth);
      }

      if (endMonth) {
        whereClause += ' AND stat_month <= ?';
        params.push(endMonth);
      }

      // 查询统计数据
      const [statistics] = await pool.query(
        `SELECT * FROM equipment_usage_statistics 
         ${whereClause}
         ORDER BY stat_month DESC`,
        params
      );

      // 计算汇总数据
      const summary = {
        avgUtilizationRate: 0,
        avgAvailabilityRate: 0,
        totalIncome: 0,
        totalProfit: 0,
        totalRentalDays: 0,
        totalIdleDays: 0,
        totalMaintenanceDays: 0,
        totalRentalCount: 0,
        totalCustomerCount: 0
      };

      if (statistics.length > 0) {
        summary.avgUtilizationRate = statistics.reduce((sum, s) => sum + (Number(s.utilization_rate) || 0), 0) / statistics.length;
        summary.avgAvailabilityRate = statistics.reduce((sum, s) => sum + (Number(s.availability_rate) || 0), 0) / statistics.length;
        summary.totalIncome = statistics.reduce((sum, s) => sum + (Number(s.rental_income) || 0), 0);
        summary.totalProfit = statistics.reduce((sum, s) => sum + (Number(s.net_profit) || 0), 0);
        summary.totalRentalDays = statistics.reduce((sum, s) => sum + (s.rental_days || 0), 0);
        summary.totalIdleDays = statistics.reduce((sum, s) => sum + (s.idle_days || 0), 0);
        summary.totalMaintenanceDays = statistics.reduce((sum, s) => sum + (s.maintenance_days || 0), 0);
        summary.totalRentalCount = statistics.reduce((sum, s) => sum + (s.rental_count || 0), 0);
        // 客户数量需要去重，这里简单计算
        summary.totalCustomerCount = statistics.reduce((sum, s) => sum + (s.customer_count || 0), 0);
      }

      res.json({
        ok: true,
        data: {
          equipment: equipment[0],
          statistics: statistics.map(s => ({
            month: s.stat_month,
            totalDays: s.total_days,
            rentalDays: s.rental_days,
            idleDays: s.idle_days,
            maintenanceDays: s.maintenance_days,
            utilizationRate: Number(s.utilization_rate),
            availabilityRate: Number(s.availability_rate),
            rentalIncome: Number(s.rental_income),
            maintenanceCost: Number(s.maintenance_cost),
            partsCost: Number(s.parts_cost),
            netProfit: Number(s.net_profit),
            rentalCount: s.rental_count,
            customerCount: s.customer_count,
            averageRentalDays: Number(s.average_rental_days)
          })),
          summary
        }
      });
    } catch (error) {
      console.error('[equipment-usage] Error:', error);
      res.json({ ok: false, error: '获取使用率统计失败' });
    }
  });

  /**
   * GET /api/equipment-usage/ranking/list
   * 获取所有设备使用率排行
   * Query: month (YYYY-MM-01), sortBy (utilization|income|profit), limit
   */
  router.get('/ranking/list', async (req, res) => {
    try {
      const { month, sortBy = 'utilization', limit = 50 } = req.query;

      let orderClause = '';
      switch (sortBy) {
        case 'income':
          orderClause = 'ORDER BY s.rental_income DESC';
          break;
        case 'profit':
          orderClause = 'ORDER BY s.net_profit DESC';
          break;
        case 'utilization':
        default:
          orderClause = 'ORDER BY s.utilization_rate DESC';
          break;
      }

      let whereClause = '';
      const params = [];

      if (month) {
        whereClause = 'WHERE s.stat_month = ?';
        params.push(month);
      } else {
        // 如果没有指定月份，获取最近一个月的数据
        whereClause = `WHERE s.stat_month = (
          SELECT MAX(stat_month) FROM equipment_usage_statistics
        )`;
      }

      params.push(parseInt(limit));

      const [rankings] = await pool.query(
        `SELECT 
          e.id AS equipment_id,
          e.equipment_code,
          e.brand,
          e.model,
          e.status,
          s.stat_month,
          s.utilization_rate,
          s.availability_rate,
          s.rental_income,
          s.net_profit,
          s.rental_days,
          s.idle_days,
          s.maintenance_days,
          s.rental_count
        FROM equipments e
        INNER JOIN equipment_usage_statistics s ON e.id = s.equipment_id
        ${whereClause}
        ${orderClause}
        LIMIT ?`,
        params
      );

      res.json({
        ok: true,
        data: rankings.map(r => ({
          equipmentId: r.equipment_id,
          equipmentCode: r.equipment_code,
          brand: r.brand,
          model: r.model,
          status: r.status,
          month: r.stat_month,
          utilizationRate: Number(r.utilization_rate),
          availabilityRate: Number(r.availability_rate),
          rentalIncome: Number(r.rental_income),
          netProfit: Number(r.net_profit),
          rentalDays: r.rental_days,
          idleDays: r.idle_days,
          maintenanceDays: r.maintenance_days,
          rentalCount: r.rental_count
        }))
      });
    } catch (error) {
      console.error('[equipment-usage] Error:', error);
      res.json({ ok: false, error: '获取使用率排行失败' });
    }
  });

  /**
   * POST /api/equipment-usage/:equipmentId/calculate
   * 计算/更新设备使用率统计
   * Body: { month: 'YYYY-MM-01' }
   */
  router.post('/:equipmentId/calculate', async (req, res) => {
    try {
      const { equipmentId } = req.params;
      const { month } = req.body;

      if (!month) {
        return res.json({ ok: false, error: '月份参数不能为空' });
      }

      // 验证月份格式
      if (!/^\d{4}-\d{2}-01$/.test(month)) {
        return res.json({ ok: false, error: '月份格式错误，应为 YYYY-MM-01' });
      }

      // 调用存储过程计算使用率
      await pool.query(
        'CALL sp_calculate_equipment_usage(?, ?)',
        [equipmentId, month]
      );

      // 查询计算结果
      const [result] = await pool.query(
        'SELECT * FROM equipment_usage_statistics WHERE equipment_id = ? AND stat_month = ?',
        [equipmentId, month]
      );

      if (result.length === 0) {
        return res.json({ ok: false, error: '计算失败或无数据' });
      }

      res.json({
        ok: true,
        data: {
          month: result[0].stat_month,
          utilizationRate: Number(result[0].utilization_rate),
          rentalDays: result[0].rental_days,
          idleDays: result[0].idle_days,
          rentalIncome: Number(result[0].rental_income),
          netProfit: Number(result[0].net_profit)
        },
        message: '使用率计算成功'
      });
    } catch (error) {
      console.error('[equipment-usage] Calculate error:', error);
      res.json({ ok: false, error: '计算使用率失败: ' + error.message });
    }
  });

  /**
   * POST /api/equipment-usage/calculate-batch
   * 批量计算所有设备的使用率
   * Body: { month: 'YYYY-MM-01' }
   */
  router.post('/calculate-batch', async (req, res) => {
    try {
      const { month } = req.body;

      if (!month) {
        return res.json({ ok: false, error: '月份参数不能为空' });
      }

      // 获取所有设备
      const [equipments] = await pool.query(
        "SELECT id FROM equipments WHERE status != 'retired'"
      );

      let successCount = 0;
      let failCount = 0;

      // 逐个计算
      for (const equipment of equipments) {
        try {
          await pool.query(
            'CALL sp_calculate_equipment_usage(?, ?)',
            [equipment.id, month]
          );
          successCount++;
        } catch (error) {
          console.error(`Calculate failed for equipment ${equipment.id}:`, error.message);
          failCount++;
        }
      }

      res.json({
        ok: true,
        data: {
          total: equipments.length,
          success: successCount,
          failed: failCount
        },
        message: `批量计算完成：成功 ${successCount}，失败 ${failCount}`
      });
    } catch (error) {
      console.error('[equipment-usage] Batch calculate error:', error);
      res.json({ ok: false, error: '批量计算失败' });
    }
  });

  /**
   * GET /api/equipment-usage/overview/summary
   * 获取所有设备的使用率概览
   */
  router.get('/overview/summary', async (req, res) => {
    try {
      const [overview] = await pool.query(`
        SELECT * FROM v_equipment_usage_overview
        ORDER BY avg_utilization_rate DESC
      `);

      res.json({
        ok: true,
        data: overview.map(o => ({
          equipmentId: o.equipment_id,
          equipmentCode: o.equipment_code,
          brand: o.brand,
          model: o.model,
          status: o.status,
          avgUtilizationRate: Number(o.avg_utilization_rate),
          avgAvailabilityRate: Number(o.avg_availability_rate),
          totalRentalIncome: Number(o.total_rental_income),
          totalNetProfit: Number(o.total_net_profit),
          totalRentalDays: o.total_rental_days,
          totalIdleDays: o.total_idle_days,
          totalMaintenanceDays: o.total_maintenance_days,
          lastStatMonth: o.last_stat_month
        }))
      });
    } catch (error) {
      console.error('[equipment-usage] Overview error:', error);
      res.json({ ok: false, error: '获取概览失败' });
    }
  });

  return router;
}

import express from 'express';

