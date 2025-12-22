// Dashboard统计数据路由
import express from 'express';
import { calculateOrderRevenue } from '../services/revenueCalculator.js';

export default function buildDashboardRouter(pool) {
  const router = express.Router();

  // GET /api/dashboard/kpi - 获取关键指标
  router.get('/kpi', async (req, res) => {
    try {
      // 1. 设备总数和状态统计（使用rental_status字段，NULL视为available）
      const [equipmentStats] = await pool.query(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN COALESCE(rental_status, 'available') IN ('available', 'idle', 'waiting') THEN 1 ELSE 0 END) as available,
          SUM(CASE WHEN COALESCE(rental_status, 'available') = 'renting' THEN 1 ELSE 0 END) as renting,
          SUM(CASE WHEN COALESCE(rental_status, 'available') IN ('maintenance', 'repairing', 'mass', 'repair') THEN 1 ELSE 0 END) as maintenance
         FROM equipments e
         WHERE e.deleted_at IS NULL`
      );

      // 2. 客户总数
      const [customerStats] = await pool.query(
        `SELECT COUNT(*) as total FROM customers WHERE deleted_at IS NULL`
      );

      // 3. 订单统计（兼容多种状态值）
      const [orderStats] = await pool.query(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('pending', 'draft') THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status IN ('in_progress', 'ongoing', 'active') THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status IN ('completed', 'finished', 'closed') THEN 1 ELSE 0 END) as completed
         FROM orders
         WHERE deleted_at IS NULL`
      );

      // 4. 本月营收统计（使用动态计算）
      // 获取本月和上月的活跃订单
      const [currentMonthOrders] = await pool.query(
        `SELECT id FROM orders 
         WHERE deleted_at IS NULL 
         AND status NOT IN ('cancelled', 'deleted')
         AND created_at <= NOW()`
      );
      
      // 动态计算本月创收
      let currentMonthRevenue = 0;
      let lastMonthRevenue = 0;
      
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      
      for (const order of currentMonthOrders) {
        // 计算本月创收（从本月1日到今天）
        const revenue = await calculateOrderRevenue(pool, order.id, currentMonthStart, now);
        currentMonthRevenue += revenue;
        
        // 计算上月创收（从上月1日到上月最后一天）
        const lastRevenue = await calculateOrderRevenue(pool, order.id, lastMonthStart, lastMonthEnd);
        lastMonthRevenue += lastRevenue;
      }
      
      console.log(`[Dashboard KPI] 本月动态创收: ¥${currentMonthRevenue.toFixed(2)}, 上月: ¥${lastMonthRevenue.toFixed(2)}`);
      
      const revenueStats = [{
        current_month: currentMonthRevenue,
        last_month: lastMonthRevenue,
        total_revenue: currentMonthRevenue // 简化，实际应该计算所有时间的总额
      }];

      // 5. 本月实收金额（从收款记录表统计）
      const [receivedStats] = await pool.query(
        `SELECT 
          COALESCE(SUM(CASE WHEN DATE_FORMAT(receipt_date, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m') THEN COALESCE(amount, 0) ELSE 0 END), 0) as current_month_received,
          COALESCE(SUM(CASE WHEN DATE_FORMAT(receipt_date, '%Y-%m') = DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m') THEN COALESCE(amount, 0) ELSE 0 END), 0) as last_month_received
         FROM order_receipts
         WHERE receipt_date IS NOT NULL
         AND receipt_date >= DATE_SUB(NOW(), INTERVAL 2 MONTH)`
      );

      const responseData = {
        ok: true,
        data: {
          equipment: {
            total: Number(equipmentStats[0].total || 0),
            available: Number(equipmentStats[0].available || 0),
            renting: Number(equipmentStats[0].renting || 0),
            maintenance: Number(equipmentStats[0].maintenance || 0),
          },
          customers: {
            total: Number(customerStats[0].total || 0),
          },
          orders: {
            total: Number(orderStats[0].total || 0),
            pending: Number(orderStats[0].pending || 0),
            inProgress: Number(orderStats[0].in_progress || 0),
            completed: Number(orderStats[0].completed || 0),
          },
          revenue: {
            currentMonth: Number(revenueStats[0].current_month || 0),
            lastMonth: Number(revenueStats[0].last_month || 0),
            currentMonthReceived: Number(receivedStats[0].current_month_received || 0),
            lastMonthReceived: Number(receivedStats[0].last_month_received || 0),
          },
        },
      };
      
      console.log('[Dashboard KPI] 返回数据:', JSON.stringify(responseData, null, 2));
      
      // 禁用缓存，确保始终获取最新数据
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.json(responseData);
    } catch (err) {
      console.error('[Dashboard] KPI error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'KPI error' });
    }
  });

  // GET /api/dashboard/trends - 获取趋势数据
  router.get('/trends', async (req, res) => {
    try {
      const days = Number(req.query.days) || 30;
      
      // 1. 订单趋势（创收金额 - 使用动态计算）
      console.log(`[Dashboard Trends] 开始计算最近${days}天的动态创收...`);
      
      // 获取所有活跃订单
      const [activeOrders] = await pool.query(
        `SELECT id FROM orders 
         WHERE deleted_at IS NULL 
         AND status NOT IN ('cancelled', 'deleted')
         AND created_at <= CURDATE()`
      );
      
      // 生成日期范围
      const orderTrends = [];
      const today = new Date();
      
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        d.setHours(0, 0, 0, 0);
        
        const dateStr = d.toISOString().split('T')[0];
        
        // 计算所有订单在这一天的累计创收
        let dailyRevenue = 0;
        for (const order of activeOrders) {
          // 计算从订单开始到这一天的累计创收
          const revenue = await calculateOrderRevenue(pool, order.id, null, d);
          dailyRevenue += revenue;
        }
        
        orderTrends.push({
          date: new Date(dateStr),
          revenue: dailyRevenue
        });
      }
      
      console.log(`[Dashboard Trends] 完成动态创收计算，共${orderTrends.length}天`);

      // 2. 实收趋势（收款金额）
      const [receiptTrends] = await pool.query(
        `SELECT 
          DATE(receipt_date) as date,
          COALESCE(SUM(COALESCE(amount, 0)), 0) as received
         FROM order_receipts
         WHERE receipt_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         GROUP BY DATE(receipt_date)`,
         [days]
      );

      // 3. 合并数据
      const dateMap = new Map();
      
      // 生成日期范围内的所有日期（可选，但目前先合并已有的）
      orderTrends.forEach(row => {
        const dateStr = row.date.toISOString().split('T')[0];
        dateMap.set(dateStr, { date: dateStr, revenue: Number(row.revenue), received: 0 });
      });

      receiptTrends.forEach(row => {
        const dateStr = row.date.toISOString().split('T')[0];
        if (dateMap.has(dateStr)) {
          dateMap.get(dateStr).received = Number(row.received);
        } else {
          dateMap.set(dateStr, { date: dateStr, revenue: 0, received: Number(row.received) });
        }
      });

      // 转换为数组并排序
      const sortedTrends = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

      console.log('[Dashboard Trends] 查询天数:', days);
      console.log('[Dashboard Trends] 订单趋势记录数:', orderTrends.length);
      console.log('[Dashboard Trends] 收款趋势记录数:', receiptTrends.length);
      console.log('[Dashboard Trends] 收款数据示例:', receiptTrends.slice(0, 3));
      console.log('[Dashboard Trends] 合并后记录数:', sortedTrends.length);
      console.log('[Dashboard Trends] 返回数据前3条:', JSON.stringify(sortedTrends.slice(0, 3), null, 2));
      console.log('[Dashboard Trends] 返回数据后3条:', JSON.stringify(sortedTrends.slice(-3), null, 2));

      res.json({
        ok: true,
        data: {
          orders: sortedTrends
        },
      });
    } catch (err) {
      console.error('[Dashboard] Trends error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Trends error' });
    }
  });

  // GET /api/dashboard/equipment-price-trends - 按设备高度获取价格趋势（按年+月）
  router.get('/equipment-price-trends', async (req, res) => {
    try {
      const year = Number(req.query.year) || new Date().getFullYear();
      const height = req.query.height || 'all'; // 设备高度筛选
      
      console.log('[Dashboard] 价格趋势查询 - year:', year, 'height:', height);
      
      let heightFilter = '';
      let params = [year];
      
      if (height !== 'all') {
        // 从 "4米" 提取数字 "4"
        const heightValue = parseFloat(height.replace('米', ''));
        heightFilter = 'AND oed.equipment_height = ?';
        params.push(heightValue);
        console.log('[Dashboard] 筛选高度:', heightValue);
      }
      
      // 按设备高度统计价格趋势（按月聚合，区分天租和月租）
      // 使用 order_equipment_demands 表中的 equipment_height 字段
      const [priceTrends] = await pool.query(
        `SELECT 
          DATE_FORMAT(o.created_at, '%Y-%m') as month,
          CAST(oed.equipment_height AS UNSIGNED) as height_value,
          CONCAT(CAST(oed.equipment_height AS UNSIGNED), '米') as height,
          AVG(CASE WHEN o.billing_method = 'daily' THEN oed.daily_rate ELSE NULL END) as avg_daily_price,
          AVG(CASE WHEN o.billing_method = 'monthly' THEN oed.monthly_rate ELSE NULL END) as avg_monthly_price,
          COUNT(DISTINCT CASE WHEN o.billing_method = 'daily' THEN o.id END) as daily_order_count,
          COUNT(DISTINCT CASE WHEN o.billing_method = 'monthly' THEN o.id END) as monthly_order_count,
          COUNT(DISTINCT o.id) as total_order_count
         FROM orders o
         INNER JOIN order_equipment_demands oed ON o.id = oed.order_id
         WHERE o.deleted_at IS NULL
         AND YEAR(o.created_at) = ?
         AND o.status NOT IN ('cancelled', 'deleted')
         AND oed.equipment_height IS NOT NULL
         ${heightFilter}
         GROUP BY DATE_FORMAT(o.created_at, '%Y-%m'), CAST(oed.equipment_height AS UNSIGNED), CONCAT(CAST(oed.equipment_height AS UNSIGNED), '米')
         ORDER BY month ASC, height_value ASC`,
         params
      );

      console.log('[Dashboard] 价格趋势数据量:', priceTrends.length);
      if (priceTrends.length > 0) {
        console.log('[Dashboard] 示例数据:', priceTrends[0]);
      }

      // 始终查询可用的设备高度列表（从订单需求中获取实际使用的高度）
      const [heightsList] = await pool.query(
        `SELECT DISTINCT 
           CAST(oed.equipment_height AS UNSIGNED) as height, 
           CONCAT(CAST(oed.equipment_height AS UNSIGNED), '米') as height_label
         FROM order_equipment_demands oed
         INNER JOIN orders o ON oed.order_id = o.id
         WHERE oed.equipment_height IS NOT NULL 
         AND o.deleted_at IS NULL
         AND o.status NOT IN ('cancelled', 'deleted')
         ORDER BY height ASC`
      );

      console.log('[Dashboard] 可用高度列表:', heightsList.map(h => h.height_label));

      // 返回数据（即使没有订单数据，也返回高度列表）
      res.json({
        ok: true,
        data: {
          trends: (priceTrends || []).map(row => ({
            month: row.month, // 格式：YYYY-MM
            height: row.height || '未知',
            avgDailyPrice: Number(row.avg_daily_price) || 0,
            avgMonthlyPrice: Number(row.avg_monthly_price) || 0,
            dailyOrderCount: Number(row.daily_order_count) || 0,
            monthlyOrderCount: Number(row.monthly_order_count) || 0,
            totalOrderCount: Number(row.total_order_count) || 0,
          })),
          heights: heightsList.map(row => row.height_label).filter(Boolean),
        },
      });
    } catch (err) {
      console.error('[Dashboard] Equipment price trends error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Equipment price trends error' });
    }
  });

  // GET /api/dashboard/alerts - 获取重要提醒
  router.get('/alerts', async (req, res) => {
    try {
      const alerts = [];

      // 1. 即将到期的合同（30天内）
      const [expiringContracts] = await pool.query(
        `SELECT COUNT(*) as count
         FROM orders
         WHERE deleted_at IS NULL
         AND status = 'in_progress'
         AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)`
      );

      if (expiringContracts[0].count > 0) {
        alerts.push({
          type: 'warning',
          title: '合同即将到期',
          message: `有 ${expiringContracts[0].count} 个合同将在30天内到期`,
          count: expiringContracts[0].count,
          action: 'viewOrders',
        });
      }

      // 2. 保险即将到期（30天内）
      try {
        const [expiringInsurance] = await pool.query(
          `SELECT COUNT(*) as count
           FROM insurance_policies
           WHERE end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)`
        );

        if (expiringInsurance[0].count > 0) {
          alerts.push({
            type: 'error',
            title: '保险即将到期',
            message: `有 ${expiringInsurance[0].count} 个保单将在30天内到期`,
            count: expiringInsurance[0].count,
            action: 'viewPolicies',
          });
        }
      } catch (err) {
        // 忽略表不存在的错误
        console.log('[Dashboard] Insurance policies table may not exist');
      }

      // 3. 待维修设备
      try {
        const [pendingRepairs] = await pool.query(
          `SELECT COUNT(*) as count
           FROM equipment_repairs
           WHERE status IN ('pending', 'repairing')`
        );

        if (pendingRepairs[0].count > 0) {
          alerts.push({
            type: 'info',
            title: '待处理维修单',
            message: `有 ${pendingRepairs[0].count} 个维修单待处理`,
            count: pendingRepairs[0].count,
            action: 'viewRepairs',
          });
        }
      } catch (err) {
        console.log('[Dashboard] Equipment repairs table may not exist');
      }

      // 4. 库存不足配件
      try {
        const [lowStockParts] = await pool.query(
          `SELECT COUNT(*) as count
           FROM accessories
           WHERE available_quantity < min_stock
           AND is_deleted = 0`
        );

        if (lowStockParts[0].count > 0) {
          alerts.push({
            type: 'warning',
            title: '配件库存不足',
            message: `有 ${lowStockParts[0].count} 种配件库存低于最低值`,
            count: lowStockParts[0].count,
            action: 'viewAccessories',
          });
        }
      } catch (err) {
        console.log('[Dashboard] Accessories table may not exist');
      }

      res.json({
        ok: true,
        data: alerts,
      });
    } catch (err) {
      console.error('[Dashboard] Alerts error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Alerts error' });
    }
  });

  // GET /api/dashboard/recent-activities - 获取最近活动
  router.get('/recent-activities', async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 10;
      const activities = [];

      // 1. 最近订单
      const [recentOrders] = await pool.query(
        `SELECT 
          o.id, o.contract_number, c.name as customer_name, o.status, o.created_at,
          'order' as type
         FROM orders o
         LEFT JOIN customers c ON o.customer_id = c.id
         WHERE o.deleted_at IS NULL
         ORDER BY o.created_at DESC
         LIMIT ?`,
        [Math.floor(limit / 2)]
      );

      activities.push(...recentOrders.map(row => ({
        id: `order-${row.id}`,
        type: 'order',
        title: `新订单: ${row.contract_number || 'N/A'}`,
        description: `客户: ${row.customer_name || '未知'}`,
        status: row.status,
        time: row.created_at,
      })));

      // 2. 最近进退场
      const [recentEntries] = await pool.query(
        `SELECT 
          oe.id, oe.equipment_id, oe.entry_date, oe.created_at,
          'entry' as activity_type,
          e.custom_code, e.code
         FROM order_entries oe
         LEFT JOIN equipments e ON e.id = oe.equipment_id
         INNER JOIN orders o ON oe.order_id = o.id
         WHERE o.deleted_at IS NULL
         ORDER BY oe.created_at DESC
         LIMIT ?`,
        [Math.floor(limit / 2)]
      );

      activities.push(...recentEntries.map(row => ({
        id: `entry-${row.id}`,
        type: 'entry',
        title: `设备进场`,
        description: `设备编号: ${row.custom_code || row.code || '未知'}`,
        status: 'success',
        time: row.created_at,
      })));

      // 按时间排序
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      res.json({
        ok: true,
        data: activities.slice(0, limit),
      });
    } catch (err) {
      console.error('[Dashboard] Recent activities error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Recent activities error' });
    }
  });

  // GET /api/dashboard/equipment-utilization - 资产利用率统计
  router.get('/equipment-utilization', async (req, res) => {
    try {
      console.log('[Dashboard] 计算资产利用率...');
      
      // 1. 获取所有自有设备，优先使用设备表的purchase_price字段
      const [equipments] = await pool.query(
        `SELECT 
          e.id,
          e.category,
          e.brand,
          e.model,
          e.height,
          e.rental_status,
          e.source,
          e.purchase_price as equipment_purchase_price
         FROM equipments e
         WHERE e.deleted_at IS NULL 
           AND e.source = 'self-owned'
         ORDER BY e.id`
      );

      console.log(`[Dashboard] 找到 ${equipments.length} 台自有设备`);

      // 2. 对于没有purchase_price的设备，尝试从purchase_items表匹配
      const [purchaseItems] = await pool.query(
        `SELECT 
          pi.equipment_category,
          pi.equipment_model,
          pi.equipment_height,
          pi.unit_price,
          pi.created_at
         FROM purchase_items pi
         WHERE pi.unit_price > 0
         ORDER BY pi.created_at DESC`
      );

      // 构建查找map，用于快速查找采购价格
      const purchaseMap = new Map();
      purchaseItems.forEach(pi => {
        const key = `${pi.equipment_category}-${pi.equipment_model || 'null'}-${pi.equipment_height || 'null'}`;
        if (!purchaseMap.has(key)) {
          purchaseMap.set(key, pi.unit_price);
        }
      });

      // 为每个设备确定采购价格
      const uniqueEquipments = equipments.map(eq => {
        // 优先使用设备表的采购价格
        let purchasePrice = parseFloat(eq.equipment_purchase_price) || 0;
        
        // 如果设备表没有价格，尝试从purchase_items匹配
        if (purchasePrice === 0) {
          const key1 = `${eq.category}-${eq.model}-${eq.height}`;
          const key2 = `${eq.category}-${eq.model}-null`;
          const key3 = `${eq.category}-null-${eq.height}`;
          const key4 = `${eq.category}-null-null`;
          
          purchasePrice = purchaseMap.get(key1) || 
                         purchaseMap.get(key2) || 
                         purchaseMap.get(key3) || 
                         purchaseMap.get(key4) || 
                         0;
        }
        
        return {
          ...eq,
          purchase_price: purchasePrice
        };
      });

      console.log(`[Dashboard] 处理完成，共 ${uniqueEquipments.length} 台设备`);

      // 3. 计算总采购额和出租中设备的采购额
      let totalPurchaseValue = 0;
      let rentingPurchaseValue = 0;
      let availablePurchaseValue = 0;
      let equipmentWithPriceCount = 0;
      let equipmentWithoutPriceCount = 0;

      uniqueEquipments.forEach(eq => {
        const price = parseFloat(eq.purchase_price) || 0;
        
        if (price > 0) {
          equipmentWithPriceCount++;
          totalPurchaseValue += price;
          
          if (eq.rental_status === 'renting') {
            rentingPurchaseValue += price;
          } else if (eq.rental_status === 'available') {
            availablePurchaseValue += price;
          }
        } else {
          equipmentWithoutPriceCount++;
        }
      });

      // 4. 计算资产利用率
      const assetUtilizationRate = totalPurchaseValue > 0 
        ? (rentingPurchaseValue / totalPurchaseValue) * 100 
        : 0;

      console.log(`[Dashboard] 总采购额: ¥${totalPurchaseValue.toFixed(2)}`);
      console.log(`[Dashboard] 出租中采购额: ¥${rentingPurchaseValue.toFixed(2)}`);
      console.log(`[Dashboard] 未出租采购额: ¥${availablePurchaseValue.toFixed(2)}`);
      console.log(`[Dashboard] 资产利用率: ${assetUtilizationRate.toFixed(1)}%`);
      console.log(`[Dashboard] 有价格的设备: ${equipmentWithPriceCount} 台`);
      console.log(`[Dashboard] 无价格的设备: ${equipmentWithoutPriceCount} 台`);

      // 5. 返回数据
      res.json({
        ok: true,
        data: [{
          type: '自有设备',
          total: uniqueEquipments.length,
          renting: uniqueEquipments.filter(e => e.rental_status === 'renting').length,
          available: uniqueEquipments.filter(e => e.rental_status === 'available').length,
          utilizationRate: parseFloat(assetUtilizationRate.toFixed(1)),
          totalPurchaseValue: parseFloat(totalPurchaseValue.toFixed(2)),
          rentingPurchaseValue: parseFloat(rentingPurchaseValue.toFixed(2)),
          availablePurchaseValue: parseFloat(availablePurchaseValue.toFixed(2)),
          equipmentWithPrice: equipmentWithPriceCount,
          equipmentWithoutPrice: equipmentWithoutPriceCount,
        }],
      });
    } catch (err) {
      console.error('[Dashboard] Asset utilization error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Asset utilization error' });
    }
  });

  return router;
}

