// 检查purchase_items表数据
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

async function checkPurchaseItems() {
  console.log('=== 检查purchase_items表数据 ===\n');

  try {
    // 1. 查询purchase_items数据
    console.log('【步骤1】查询purchase_items表...');
    const [items] = await pool.query(`
      SELECT 
        id,
        equipment_category,
        equipment_type,
        equipment_model,
        equipment_height,
        quantity,
        unit_price,
        subtotal
      FROM purchase_items
      WHERE unit_price > 0
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if (items.length === 0) {
      console.log('⚠️  purchase_items表为空或没有价格数据');
      console.log('   这意味着无法从采购记录回填设备价格');
      console.log('   建议：直接在设备档案中为每台设备添加采购价格\n');
    } else {
      console.log(`✅ 找到 ${items.length} 条采购记录（最近10条）:\n`);
      items.forEach((item, idx) => {
        const unitPrice = parseFloat(item.unit_price) || 0;
        const subtotal = parseFloat(item.subtotal) || 0;
        console.log(`   ${idx + 1}. ${item.equipment_category} ${item.equipment_model || ''} ${item.equipment_height || ''}m`);
        console.log(`      数量: ${item.quantity}, 单价: ¥${unitPrice.toFixed(2)}, 小计: ¥${subtotal.toFixed(2)}`);
      });
      console.log('');
    }

    // 2. 查询equipments中需要价格的设备
    console.log('【步骤2】查询无价格的设备...');
    const [equipments] = await pool.query(`
      SELECT 
        custom_code,
        category,
        brand,
        model,
        height
      FROM equipments
      WHERE deleted_at IS NULL 
        AND source = 'self-owned'
        AND (purchase_price = 0 OR purchase_price IS NULL)
      LIMIT 5
    `);

    if (equipments.length > 0) {
      console.log(`⚠️  找到 ${equipments.length} 台无价格设备（前5台）:\n`);
      equipments.forEach((eq, idx) => {
        console.log(`   ${idx + 1}. ${eq.custom_code} | ${eq.category} ${eq.brand} ${eq.model} ${eq.height}m`);
      });
      console.log('');
    }

    // 3. 总结
    console.log('=== 检查完成 ===\n');
    console.log('📋 建议：');
    if (items.length === 0) {
      console.log('1. ⚠️  purchase_items表无数据，无法自动回填');
      console.log('2. 💡 需要手动在设备档案中为每台设备添加采购价格');
      console.log('3. 🎯 或者先添加采购记录，再执行回填');
    } else {
      console.log('1. ✅ purchase_items表有数据');
      console.log('2. ⚠️  但可能匹配规则不匹配，导致回填失败');
      console.log('3. 💡 建议手动在设备档案中补充采购价格');
    }

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    await pool.end();
  }
}

checkPurchaseItems();
