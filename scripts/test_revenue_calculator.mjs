// 测试创收金额计算器
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { calculateOrderRevenue, calculateRevenueByDate } from '../server/services/revenueCalculator.js';

dotenv.config();

async function testCalculator() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '19900809ldc',
    database: process.env.MYSQL_DATABASE || 'gaokongche',
    waitForConnections: true,
    connectionLimit: 10,
  });

  try {
    console.log('=== 测试创收金额计算器 ===\n');

    // 1. 测试订单71的创收计算
    console.log('【测试1】计算订单71的创收金额：');
    const revenue71 = await calculateOrderRevenue(pool, 71);
    console.log(`✅ 订单71创收金额: ¥${revenue71.toFixed(2)}\n`);

    // 2. 测试订单1的创收计算（如果存在）
    const [order1Exists] = await pool.query('SELECT id FROM orders WHERE id = 1 AND deleted_at IS NULL');
    if (order1Exists && order1Exists.length > 0) {
      console.log('【测试2】计算订单1的创收金额：');
      const revenue1 = await calculateOrderRevenue(pool, 1);
      console.log(`✅ 订单1创收金额: ¥${revenue1.toFixed(2)}\n`);
    }

    // 3. 测试本月创收
    console.log('【测试3】计算本月所有订单的创收金额：');
    const [activeOrders] = await pool.query(
      `SELECT id, contract_number FROM orders 
       WHERE deleted_at IS NULL 
       AND status NOT IN ('cancelled', 'deleted')
       AND DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')`
    );
    
    console.log(`本月活跃订单数: ${activeOrders.length}`);
    let totalMonthRevenue = 0;
    
    for (const order of activeOrders) {
      const revenue = await calculateOrderRevenue(pool, order.id);
      totalMonthRevenue += revenue;
      console.log(`  - 订单 ${order.contract_number}: ¥${revenue.toFixed(2)}`);
    }
    
    console.log(`✅ 本月总创收: ¥${totalMonthRevenue.toFixed(2)}\n`);

    // 4. 测试按日期范围计算（简化版）
    console.log('【测试4】计算最近7天的创收趋势（简化版）：');
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    // 生成日期列表
    const dateRevenues = [];
    for (let d = new Date(sevenDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      
      // 计算所有订单在这一天的累计创收
      let dailyRevenue = 0;
      for (const order of activeOrders) {
        // 简化：使用当前时间点的总创收
        const revenue = await calculateOrderRevenue(pool, order.id, null, d);
        dailyRevenue += revenue;
      }
      
      dateRevenues.push({ date: dateStr, revenue: dailyRevenue });
      console.log(`  ${dateStr}: ¥${dailyRevenue.toFixed(2)}`);
    }
    
    console.log('\n=== 测试完成 ===');

    // 5. 对比原有的计算方法
    console.log('\n【对比】原有计算方法（orders.total_amount）：');
    const [oldMethodResult] = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m') THEN COALESCE(total_amount, 0) ELSE 0 END), 0) as current_month
       FROM orders
       WHERE deleted_at IS NULL
       AND status NOT IN ('cancelled', 'deleted')`
    );
    
    console.log(`原方法本月创收: ¥${parseFloat(oldMethodResult[0].current_month).toFixed(2)}`);
    console.log(`新方法本月创收: ¥${totalMonthRevenue.toFixed(2)}`);
    console.log(`差异: ¥${(totalMonthRevenue - parseFloat(oldMethodResult[0].current_month)).toFixed(2)}\n`);

  } catch (error) {
    console.error('❌ 测试失败:', error);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

testCalculator();
