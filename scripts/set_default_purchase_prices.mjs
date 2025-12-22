// 为现有设备设置默认采购价格
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE || 'gaokongche',
  waitForConnections: true,
  connectionLimit: 10
});

// 按照市场价格设置默认采购价格
const priceMap = {
  // 剪叉车价格（按高度）
  '4.00': 60000,   // 4米剪叉车：6万
  '6.00': 80000,   // 6米剪叉车：8万
  '8.00': 120000,  // 8米剪叉车：12万
  '10.00': 150000, // 10米剪叉车：15万
  '12.00': 180000, // 12米剪叉车：18万
  '14.00': 240000, // 14米臂车：24万
  '16.00': 280000, // 16米臂车：28万
  '18.00': 320000, // 18米臂车：32万
};

async function setDefaultPrices() {
  console.log('=== 为设备设置默认采购价格 ===\n');

  try {
    // 1. 获取所有无价格的自有设备
    console.log('【步骤1】查询无价格的设备...');
    const [equipments] = await pool.query(`
      SELECT 
        id,
        custom_code,
        category,
        brand,
        model,
        height,
        rental_status
      FROM equipments
      WHERE deleted_at IS NULL 
        AND source = 'self-owned'
        AND (purchase_price = 0 OR purchase_price IS NULL)
    `);

    if (equipments.length === 0) {
      console.log('✅ 所有设备都已有价格！\n');
      return;
    }

    console.log(`⚠️  找到 ${equipments.length} 台无价格设备\n`);

    // 2. 根据高度设置默认价格
    console.log('【步骤2】设置默认采购价格...');
    let updateCount = 0;
    
    for (const eq of equipments) {
      const heightKey = parseFloat(eq.height).toFixed(2);
      const defaultPrice = priceMap[heightKey] || 80000; // 默认8万

      await pool.query(`
        UPDATE equipments 
        SET purchase_price = ? 
        WHERE id = ?
      `, [defaultPrice, eq.id]);

      console.log(`   ✅ ${eq.custom_code} (${eq.height}m) → ¥${defaultPrice.toLocaleString()}`);
      updateCount++;
    }

    console.log(`\n✅ 已为 ${updateCount} 台设备设置采购价格\n`);

    // 3. 统计验证
    console.log('【步骤3】统计验证...');
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_equipment,
        COUNT(CASE WHEN purchase_price > 0 THEN 1 END) as has_price,
        COUNT(CASE WHEN purchase_price = 0 OR purchase_price IS NULL THEN 1 END) as no_price,
        SUM(purchase_price) as total_value,
        SUM(CASE WHEN rental_status = 'renting' THEN purchase_price ELSE 0 END) as renting_value
      FROM equipments
      WHERE deleted_at IS NULL AND source = 'self-owned'
    `);

    const stat = stats[0];
    const utilizationRate = stat.total_value > 0 
      ? (stat.renting_value / stat.total_value) * 100 
      : 0;

    console.log('✅ 统计结果：');
    console.log(`   📊 自有设备总数: ${stat.total_equipment} 台`);
    console.log(`   💰 有价格设备: ${stat.has_price} 台`);
    console.log(`   ⚠️  无价格设备: ${stat.no_price} 台`);
    console.log(`   💵 总资产价值: ¥${(stat.total_value || 0).toLocaleString('zh-CN')}`);
    console.log(`   💚 出租中资产: ¥${(stat.renting_value || 0).toLocaleString('zh-CN')}`);
    console.log(`   📈 资产利用率: ${utilizationRate.toFixed(1)}%\n`);

    console.log('=== 设置完成 ===\n');
    console.log('✅ 所有设备都有采购价格了！');
    console.log('📋 下一步：');
    console.log('1. 重启后端服务');
    console.log('2. 刷新浏览器');
    console.log('3. 查看资产利用率监控');

  } catch (error) {
    console.error('❌ 设置失败:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

setDefaultPrices();
