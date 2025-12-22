// 测试采购价格字段功能
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

async function testPurchasePriceField() {
  console.log('=== 测试采购价格字段 ===\n');

  try {
    // 1. 检查字段是否存在
    console.log('【步骤1】检查purchase_price字段是否存在...');
    const [columns] = await pool.query(`
      SHOW COLUMNS FROM equipments LIKE 'purchase_price'
    `);
    
    if (columns.length === 0) {
      console.log('❌ purchase_price字段不存在，需要先执行迁移脚本');
      console.log('   请执行: sql/mysql/094_add_purchase_price_to_equipments.sql');
      return;
    }
    
    console.log('✅ purchase_price字段存在');
    console.log(`   类型: ${columns[0].Type}`);
    console.log(`   默认值: ${columns[0].Default}`);
    console.log(`   注释: ${columns[0].Comment}`);
    console.log('');

    // 2. 查询设备统计
    console.log('【步骤2】统计设备采购价格情况...');
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_equipment,
        COUNT(CASE WHEN purchase_price > 0 THEN 1 END) as has_price,
        COUNT(CASE WHEN purchase_price = 0 OR purchase_price IS NULL THEN 1 END) as no_price,
        SUM(purchase_price) as total_value,
        AVG(purchase_price) as avg_price,
        MIN(CASE WHEN purchase_price > 0 THEN purchase_price END) as min_price,
        MAX(purchase_price) as max_price
      FROM equipments
      WHERE deleted_at IS NULL AND source = 'self-owned'
    `);

    const stat = stats[0];
    console.log(`✅ 统计结果：`);
    console.log(`   📊 自有设备总数: ${stat.total_equipment} 台`);
    console.log(`   💰 有价格设备: ${stat.has_price} 台`);
    console.log(`   ⚠️  无价格设备: ${stat.no_price} 台`);
    console.log(`   💵 总资产价值: ¥${(stat.total_value || 0).toFixed(2)}`);
    console.log(`   📈 平均价格: ¥${(stat.avg_price || 0).toFixed(2)}`);
    console.log(`   🔽 最低价格: ¥${(stat.min_price || 0).toFixed(2)}`);
    console.log(`   🔼 最高价格: ¥${(stat.max_price || 0).toFixed(2)}`);
    console.log('');

    // 3. 查看有价格的设备示例
    console.log('【步骤3】查看有价格的设备示例（前5台）...');
    const [withPrice] = await pool.query(`
      SELECT 
        custom_code,
        category,
        brand,
        model,
        height,
        purchase_price,
        rental_status
      FROM equipments
      WHERE deleted_at IS NULL 
        AND source = 'self-owned'
        AND purchase_price > 0
      ORDER BY purchase_price DESC
      LIMIT 5
    `);

    if (withPrice.length > 0) {
      console.log('✅ 有价格的设备:');
      withPrice.forEach((eq, idx) => {
        console.log(`   ${idx + 1}. ${eq.custom_code} | ${eq.category} ${eq.brand} ${eq.model} | ${eq.height}m | ¥${eq.purchase_price.toFixed(2)} | ${eq.rental_status}`);
      });
    } else {
      console.log('   暂无有价格的设备');
    }
    console.log('');

    // 4. 查看无价格的设备示例
    console.log('【步骤4】查看无价格的设备示例（前5台）...');
    const [withoutPrice] = await pool.query(`
      SELECT 
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
      LIMIT 5
    `);

    if (withoutPrice.length > 0) {
      console.log('⚠️  无价格的设备（建议补充采购价格）:');
      withoutPrice.forEach((eq, idx) => {
        console.log(`   ${idx + 1}. ${eq.custom_code} | ${eq.category} ${eq.brand} ${eq.model} | ${eq.height}m | ${eq.rental_status}`);
      });
      console.log('');
      console.log('   💡 提示：可以在设备档案中编辑这些设备，添加采购价格');
    } else {
      console.log('   ✅ 所有设备都有价格！');
    }
    console.log('');

    // 5. 计算资产利用率
    console.log('【步骤5】计算资产利用率...');
    const [utilization] = await pool.query(`
      SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN rental_status = 'renting' THEN 1 ELSE 0 END) as renting_count,
        SUM(purchase_price) as total_value,
        SUM(CASE WHEN rental_status = 'renting' THEN purchase_price ELSE 0 END) as renting_value
      FROM equipments
      WHERE deleted_at IS NULL 
        AND source = 'self-owned'
        AND purchase_price > 0
    `);

    const util = utilization[0];
    const assetUtilizationRate = util.total_value > 0 
      ? (util.renting_value / util.total_value) * 100 
      : 0;

    console.log('✅ 资产利用率计算结果：');
    console.log(`   📊 设备数量: ${util.total_count} 台 (有价格)`);
    console.log(`   🔵 出租中: ${util.renting_count} 台`);
    console.log(`   💰 总资产价值: ¥${(util.total_value || 0).toFixed(2)}`);
    console.log(`   💚 出租中资产价值: ¥${(util.renting_value || 0).toFixed(2)}`);
    console.log(`   📈 资产利用率: ${assetUtilizationRate.toFixed(1)}%`);
    console.log('');

    console.log('=== 测试完成 ===\n');
    console.log('📋 总结：');
    console.log(`✅ purchase_price字段已添加`);
    console.log(`✅ ${stat.has_price}台设备有价格`);
    if (stat.no_price > 0) {
      console.log(`⚠️  ${stat.no_price}台设备无价格，建议补充`);
    }
    console.log(`✅ 资产利用率: ${assetUtilizationRate.toFixed(1)}%`);

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

testPurchasePriceField();
