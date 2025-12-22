// 为订单71添加测试数据（设备需求信息）
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function addTestData() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '19900809ldc',
    database: process.env.MYSQL_DATABASE || 'gaokongche',
    waitForConnections: true,
    connectionLimit: 10,
  });

  try {
    console.log('=== 为订单71添加设备需求数据 ===\n');

    // 1. 检查订单71是否已有设备需求
    const [existing] = await pool.query(
      'SELECT id FROM order_equipment_demands WHERE order_id = 71'
    );

    if (existing && existing.length > 0) {
      console.log('✅ 订单71已有设备需求数据，ID:', existing[0].id);
      
      // 显示现有数据
      const [demand] = await pool.query(
        'SELECT * FROM order_equipment_demands WHERE order_id = 71'
      );
      console.log('\n现有数据:');
      console.log(demand[0]);
      
    } else {
      // 2. 插入设备需求数据
      const [result] = await pool.query(
        `INSERT INTO order_equipment_demands 
         (order_id, equipment_type, equipment_brand, equipment_height, equipment_model, 
          quantity, rental_period, daily_rate, monthly_rate, calculated_rent, 
          deposit, transport_fee, modification_fee, total_amount)
         VALUES 
         (71, ?, ?, ?, ?, 6, 30, 200.00, 5000.00, 0, 0, 200.00, 0, 0)`,
        ['高空车', '三一', '6米', 'SPS0608HD']
      );

      console.log('✅ 成功添加设备需求数据，插入ID:', result.insertId);
      
      // 显示插入的数据
      const [demand] = await pool.query(
        'SELECT * FROM order_equipment_demands WHERE id = ?',
        [result.insertId]
      );
      console.log('\n插入的数据:');
      console.log(demand[0]);
    }

    // 3. 验证订单71的完整信息
    console.log('\n=== 订单71完整信息 ===');
    
    const [order] = await pool.query(
      'SELECT id, contract_number, created_at, transport_fee, modification_fee FROM orders WHERE id = 71'
    );
    console.log('\n订单基本信息:');
    console.log(order[0]);
    
    const [demands] = await pool.query(
      'SELECT daily_rate, monthly_rate, quantity, transport_fee, modification_fee FROM order_equipment_demands WHERE order_id = 71'
    );
    console.log('\n设备需求:');
    console.log(demands[0]);
    
    const [entries] = await pool.query(
      'SELECT entry_date, equipment_count, logistics_cost, DATEDIFF(CURDATE(), entry_date) as days_used FROM order_entries WHERE order_id = 71'
    );
    console.log('\n进场记录:');
    console.log(entries[0]);
    
    const [exits] = await pool.query(
      'SELECT COUNT(*) as exit_count FROM order_exits WHERE order_id = 71'
    );
    console.log('\n退场记录数:', exits[0].exit_count);
    
    // 4. 计算预期创收
    const { daily_rate, monthly_rate, quantity } = demands[0];
    const { days_used, equipment_count } = entries[0];
    const transport_fee = parseFloat(demands[0].transport_fee) || 0;
    const modification_fee = parseFloat(demands[0].modification_fee) || 0;
    
    const dailyTotal = daily_rate * days_used * equipment_count;
    let rent;
    
    if (days_used <= 30 && dailyTotal > monthly_rate) {
      rent = monthly_rate * equipment_count;
      console.log(`\n📊 租金计算（使用月租）: ¥${monthly_rate} × ${equipment_count}台 = ¥${rent}`);
    } else {
      rent = dailyTotal;
      console.log(`\n📊 租金计算（使用天租）: ¥${daily_rate}/天 × ${days_used}天 × ${equipment_count}台 = ¥${rent}`);
    }
    
    const total = rent + transport_fee + modification_fee;
    console.log(`运费: ¥${transport_fee}`);
    console.log(`改装费: ¥${modification_fee}`);
    console.log(`✅ 预期创收总额: ¥${total.toFixed(2)}`);
    
    console.log('\n=== 数据准备完成 ===');

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await pool.end();
  }
}

addTestData();
