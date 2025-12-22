// 设备租金统计路由
// 提供按设备统计租金的接口，支持年度和自定义时间段查询
import express from 'express';
import { calculateOrderRevenue } from '../services/revenueCalculator.js';

export default function buildEquipmentRentStatsRouter(pool) {
  const router = express.Router();

  /**
   * GET /api/equipment-rent-stats/statistics
   * 获取设备租金统计数据
   * 
   * Query参数:
   * - mode: 'year' | 'custom' (统计模式)
   * - year: number (年度模式下的年份, 如2025)  
   * - startDate: string (自定义模式下的开始日期, YYYY-MM-DD)
   * - endDate: string (自定义模式下的结束日期, YYYY-MM-DD)
   * - page: number (页码, 默认1)
   * - pageSize: number (每页条数, 默认20)
   * - equipmentId: number (可选，按设备ID筛选)
   */
  router.get('/statistics', async (req, res) => {
    try {
      const mode = req.query.mode || 'year';
      const year = Number(req.query.year) || new Date().getFullYear();
      const startDate = req.query.startDate;
      const endDate = req.query.endDate || new Date().toISOString().split('T')[0];
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
      const equipmentId = req.query.equipmentId ? Number(req.query.equipmentId) : null;
      const offset = (page - 1) * pageSize;

      console.log('[EquipmentRentStats] 查询参数:', { mode, year, startDate, endDate, page, pageSize, equipmentId });

      // 确定时间范围
      let dateStart, dateEnd;
      if (mode === 'year') {
        dateStart = `${year}-01-01`;
        dateEnd = `${year}-12-31`;
      } else {
        if (!startDate) {
          return res.status(400).json({ ok: false, error: '自定义模式需要提供startDate参数' });
        }
        dateStart = startDate;
        dateEnd = endDate;
      }

      console.log('[EquipmentRentStats] 统计时间范围:', dateStart, 'to', dateEnd);

      // 构建设备筛选条件
      let equipmentFilter = '';
      let countParams = [dateStart, dateEnd];
      let dataParams = [dateStart, dateEnd];

      if (equipmentId) {
        equipmentFilter = 'AND e.id = ?';
        countParams.push(equipmentId);
        dataParams.push(equipmentId, pageSize, offset);
      } else {
        dataParams.push(pageSize, offset);
      }

      // 1. 统计总数（用于分页）
      const [countResult] = await pool.query(
        `SELECT COUNT(DISTINCT e.id) as total
         FROM equipments e
         INNER JOIN order_entries oe ON e.id = oe.equipment_id
         INNER JOIN orders o ON oe.order_id = o.id
         WHERE e.deleted_at IS NULL
         AND o.deleted_at IS NULL
         AND o.status NOT IN ('cancelled', 'deleted')
         AND oe.entry_date BETWEEN ? AND ?
         ${equipmentFilter}`,
        countParams
      );

      const total = countResult[0].total;
      console.log('[EquipmentRentStats] 符合条件的设备总数:', total);

      if (total === 0) {
        return res.json({
          ok: true,
          data: {
            list: [],
            pagination: {
              total: 0,
              page,
              pageSize,
              totalPages: 0
            }
          }
        });
      }

      // 2. 获取设备列表（分页）
      const [equipments] = await pool.query(
        `SELECT DISTINCT
           e.id,
           e.code,
           e.custom_code,
           e.category,
           e.type,
           e.brand,
           e.model,
           e.height
         FROM equipments e
         INNER JOIN order_entries oe ON e.id = oe.equipment_id
         INNER JOIN orders o ON oe.order_id = o.id
         WHERE e.deleted_at IS NULL
         AND o.deleted_at IS NULL
         AND o.status NOT IN ('cancelled', 'deleted')
         AND oe.entry_date BETWEEN ? AND ?
         ${equipmentFilter}
         ORDER BY e.id
         LIMIT ? OFFSET ?`,
        dataParams
      );

      console.log('[EquipmentRentStats] 查询到设备数:', equipments.length);

      // 3. 计算每台设备的租金统计
      const statistics = await Promise.all(equipments.map(async (equipment) => {
        try {
          // 获取该设备在时间范围内的所有订单
          const [orders] = await pool.query(
            `SELECT DISTINCT o.id, o.contract_number, o.billing_method, o.created_at
             FROM orders o
             INNER JOIN order_entries oe ON o.id = oe.order_id
             WHERE oe.equipment_id = ?
             AND o.deleted_at IS NULL
             AND o.status NOT IN ('cancelled', 'deleted')
             AND oe.entry_date BETWEEN ? AND ?
             ORDER BY o.created_at`,
            [equipment.id, dateStart, dateEnd]
          );

          // 计算每个订单的租金
          let totalRent = 0;
          let rentDays = 0;
          const orderDetails = [];

          for (const order of orders) {
            // 获取该订单该设备的进退场记录
            const [entries] = await pool.query(
              `SELECT entry_date, equipment_count FROM order_entries 
               WHERE order_id = ? AND equipment_id = ? AND entry_date BETWEEN ? AND ?`,
              [order.id, equipment.id, dateStart, dateEnd]
            );

            const [exits] = await pool.query(
              `SELECT exit_date FROM order_exits 
               WHERE order_id = ? AND equipment_id = ? 
               ORDER BY exit_date DESC LIMIT 1`,
              [order.id, equipment.id]
            );

            // 获取价格信息
            const [demands] = await pool.query(
              `SELECT daily_rate, monthly_rate FROM order_equipment_demands 
               WHERE order_id = ? LIMIT 1`,
              [order.id]
            );

            if (entries.length > 0 && demands.length > 0) {
              const entry = entries[0];
              const demand = demands[0];
              const dailyRate = parseFloat(demand.daily_rate) || 0;
              const monthlyRate = parseFloat(demand.monthly_rate) || 0;

              // 计算使用天数
              const entryDate = new Date(entry.entry_date);
              let exitDate;

              if (exits.length > 0) {
                exitDate = new Date(exits[0].exit_date);
                // 如果退场日期超过查询范围，使用查询结束日期
                const queryEndDate = new Date(dateEnd);
                if (exitDate > queryEndDate) {
                  exitDate = queryEndDate;
                }
              } else {
                // 未退场，使用查询结束日期或今天（取较小值）
                const today = new Date();
                const queryEndDate = new Date(dateEnd);
                exitDate = today < queryEndDate ? today : queryEndDate;
              }

              // 确保开始日期不早于查询开始日期
              const queryStartDate = new Date(dateStart);
              const actualStartDate = entryDate < queryStartDate ? queryStartDate : entryDate;

              const days = Math.max(0, Math.ceil((exitDate - actualStartDate) / (1000 * 60 * 60 * 24)) + 1);
              
              // 计算租金（简化版，可选择性使用月租优化）
              let orderRent = 0;
              if (monthlyRate > 0 && days <= 30) {
                const dailyTotal = dailyRate * days;
                orderRent = dailyTotal > monthlyRate ? monthlyRate : dailyTotal;
              } else {
                orderRent = dailyRate * days;
              }

              totalRent += orderRent;
              rentDays += days;

              orderDetails.push({
                orderId: order.id,
                contractNumber: order.contract_number,
                billingMethod: order.billing_method,
                entryDate: entry.entry_date,
                exitDate: exits.length > 0 ? exits[0].exit_date : null,
                days,
                dailyRate,
                monthlyRate,
                rent: orderRent
              });
            }
          }

          return {
            equipmentId: equipment.id,
            equipmentCode: equipment.custom_code || equipment.code,
            equipmentInfo: {
              category: equipment.category,
              type: equipment.type,
              brand: equipment.brand,
              model: equipment.model,
              height: equipment.height
            },
            statistics: {
              totalRent: Math.round(totalRent * 100) / 100,
              rentDays,
              orderCount: orders.length,
              averageDailyRent: rentDays > 0 ? Math.round((totalRent / rentDays) * 100) / 100 : 0
            },
            orders: orderDetails
          };
        } catch (error) {
          console.error(`[EquipmentRentStats] 计算设备${equipment.id}租金失败:`, error);
          return null;
        }
      }));

      // 过滤掉计算失败的设备
      const validStatistics = statistics.filter(stat => stat !== null);

      // 4. 计算汇总数据
      const summary = {
        totalRent: validStatistics.reduce((sum, stat) => sum + stat.statistics.totalRent, 0),
        totalDays: validStatistics.reduce((sum, stat) => sum + stat.statistics.rentDays, 0),
        totalOrders: validStatistics.reduce((sum, stat) => sum + stat.statistics.orderCount, 0),
        equipmentCount: validStatistics.length
      };

      summary.averageDailyRent = summary.totalDays > 0 
        ? Math.round((summary.totalRent / summary.totalDays) * 100) / 100 
        : 0;

      console.log('[EquipmentRentStats] 统计完成 -', summary);

      res.json({
        ok: true,
        data: {
          summary,
          list: validStatistics,
          pagination: {
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
          },
          query: {
            mode,
            dateStart,
            dateEnd
          }
        }
      });

    } catch (err) {
      console.error('[EquipmentRentStats] 统计查询失败:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Equipment rent statistics error' });
    }
  });

  /**
   * GET /api/equipment-rent-stats/export
   * 导出设备租金统计数据为CSV格式
   * 
   * Query参数: 同 /statistics 接口
   */
  router.get('/export', async (req, res) => {
    try {
      const mode = req.query.mode || 'year';
      const year = Number(req.query.year) || new Date().getFullYear();
      const startDate = req.query.startDate;
      const endDate = req.query.endDate || new Date().toISOString().split('T')[0];

      // 确定时间范围
      let dateStart, dateEnd;
      if (mode === 'year') {
        dateStart = `${year}-01-01`;
        dateEnd = `${year}-12-31`;
      } else {
        if (!startDate) {
          return res.status(400).json({ ok: false, error: '自定义模式需要提供startDate参数' });
        }
        dateStart = startDate;
        dateEnd = endDate;
      }

      console.log('[EquipmentRentStats] 导出时间范围:', dateStart, 'to', dateEnd);

      // 获取所有设备（不分页）
      const [equipments] = await pool.query(
        `SELECT DISTINCT
           e.id,
           e.code,
           e.custom_code,
           e.category,
           e.type,
           e.brand,
           e.model,
           e.height
         FROM equipments e
         INNER JOIN order_entries oe ON e.id = oe.equipment_id
         INNER JOIN orders o ON oe.order_id = o.id
         WHERE e.deleted_at IS NULL
         AND o.deleted_at IS NULL
         AND o.status NOT IN ('cancelled', 'deleted')
         AND oe.entry_date BETWEEN ? AND ?
         ORDER BY e.id`,
        [dateStart, dateEnd]
      );

      // 构建CSV内容
      const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
      let csv = BOM;
      
      // CSV表头
      csv += '设备编号,设备类别,设备类型,品牌,型号,高度,租金总额(元),租赁天数,订单数量,日均租金(元)\n';

      // 计算每台设备数据并添加到CSV
      for (const equipment of equipments) {
        try {
          const [orders] = await pool.query(
            `SELECT DISTINCT o.id
             FROM orders o
             INNER JOIN order_entries oe ON o.id = oe.order_id
             WHERE oe.equipment_id = ?
             AND o.deleted_at IS NULL
             AND o.status NOT IN ('cancelled', 'deleted')
             AND oe.entry_date BETWEEN ? AND ?`,
            [equipment.id, dateStart, dateEnd]
          );

          let totalRent = 0;
          let rentDays = 0;

          for (const order of orders) {
            const [entries] = await pool.query(
              `SELECT entry_date FROM order_entries 
               WHERE order_id = ? AND equipment_id = ? AND entry_date BETWEEN ? AND ?`,
              [order.id, equipment.id, dateStart, dateEnd]
            );

            const [exits] = await pool.query(
              `SELECT exit_date FROM order_exits 
               WHERE order_id = ? AND equipment_id = ? 
               ORDER BY exit_date DESC LIMIT 1`,
              [order.id, equipment.id]
            );

            const [demands] = await pool.query(
              `SELECT daily_rate, monthly_rate FROM order_equipment_demands 
               WHERE order_id = ? LIMIT 1`,
              [order.id]
            );

            if (entries.length > 0 && demands.length > 0) {
              const demand = demands[0];
              const dailyRate = parseFloat(demand.daily_rate) || 0;
              const monthlyRate = parseFloat(demand.monthly_rate) || 0;

              const entryDate = new Date(entries[0].entry_date);
              let exitDate;

              if (exits.length > 0) {
                exitDate = new Date(exits[0].exit_date);
                const queryEndDate = new Date(dateEnd);
                if (exitDate > queryEndDate) {
                  exitDate = queryEndDate;
                }
              } else {
                const today = new Date();
                const queryEndDate = new Date(dateEnd);
                exitDate = today < queryEndDate ? today : queryEndDate;
              }

              const queryStartDate = new Date(dateStart);
              const actualStartDate = entryDate < queryStartDate ? queryStartDate : entryDate;
              const days = Math.max(0, Math.ceil((exitDate - actualStartDate) / (1000 * 60 * 60 * 24)) + 1);
              
              let orderRent = 0;
              if (monthlyRate > 0 && days <= 30) {
                const dailyTotal = dailyRate * days;
                orderRent = dailyTotal > monthlyRate ? monthlyRate : dailyTotal;
              } else {
                orderRent = dailyRate * days;
              }

              totalRent += orderRent;
              rentDays += days;
            }
          }

          const averageDailyRent = rentDays > 0 ? (totalRent / rentDays).toFixed(2) : '0.00';

          // 添加数据行
          csv += `${equipment.custom_code || equipment.code},${equipment.category || ''},${equipment.type || ''},${equipment.brand || ''},${equipment.model || ''},${equipment.height || ''},${totalRent.toFixed(2)},${rentDays},${orders.length},${averageDailyRent}\n`;
        } catch (error) {
          console.error(`[EquipmentRentStats] 导出设备${equipment.id}失败:`, error);
        }
      }

      // 设置响应头
      const filename = `equipment_rent_stats_${dateStart}_${dateEnd}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      
      console.log('[EquipmentRentStats] 导出完成, 设备数:', equipments.length);
      
      res.send(csv);

    } catch (err) {
      console.error('[EquipmentRentStats] 导出失败:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Export error' });
    }
  });

  return router;
}
