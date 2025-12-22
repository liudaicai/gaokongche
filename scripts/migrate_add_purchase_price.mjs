// 执行数据库迁移：添加purchase_price字段
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE || 'gaokongche',
  multipleStatements: true,
  waitForConnections: true,
  connectionLimit: 10
});

async function migrate() {
  console.log('=== 执行数据库迁移：添加purchase_price字段 ===\n');

  try {
    // 1. 检查字段是否已存在
    console.log('【步骤1】检查字段是否已存在...');
    const [columns] = await pool.query(`
      SHOW COLUMNS FROM equipments LIKE 'purchase_price'
    `);
    
    if (columns.length > 0) {
      console.log('⚠️  字段已存在，跳过迁移');
      console.log(`   类型: ${columns[0].Type}`);
      console.log(`   默认值: ${columns[0].Default}\n`);
      
      // 继续执行后续步骤（统计）
    } else {
      // 2. 添加字段
      console.log('【步骤2】添加purchase_price字段...');
      await pool.query(`
        ALTER TABLE equipments 
        ADD COLUMN purchase_price DECIMAL(15,2) DEFAULT 0.00 
        COMMENT '设备采购价格（元），用于资产利用率计算' 
        AFTER purchase_date
      `);
      console.log('✅ 字段添加成功\n');

      // 3. 添加索引
      console.log('【步骤3】添加索引...');
      await pool.query(`
        CREATE INDEX idx_purchase_price ON equipments(purchase_price)
      `);
      console.log('✅ 索引创建成功\n');

      // 4. 回填历史数据（使用COLLATE解决字符集冲突）
      console.log('【步骤4】从purchase_items回填历史数据...');
      const [updateResult] = await pool.query(`
        UPDATE equipments e
        LEFT JOIN (
            SELECT 
                pi.equipment_category,
                pi.equipment_model,
                pi.equipment_height,
                pi.unit_price,
                pi.created_at
            FROM purchase_items pi
            WHERE pi.unit_price > 0
        ) pi ON (
            pi.equipment_category COLLATE utf8mb4_unicode_ci = e.category
            AND (pi.equipment_model COLLATE utf8mb4_unicode_ci = e.model OR pi.equipment_model IS NULL)
            AND (pi.equipment_height = e.height OR pi.equipment_height IS NULL)
        )
        SET e.purchase_price = COALESCE(pi.unit_price, 0)
        WHERE e.source = 'self-owned' 
          AND e.purchase_price = 0
          AND pi.unit_price IS NOT NULL
      `);
      console.log(`✅ 回填完成，更新了 ${updateResult.affectedRows} 台设备\n`);
    }

    // 5. 统计验证
    console.log('【步骤5】统计验证...');
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_equipment,
        COUNT(CASE WHEN purchase_price > 0 THEN 1 END) as has_price,
        COUNT(CASE WHEN purchase_price = 0 OR purchase_price IS NULL THEN 1 END) as no_price,
        SUM(purchase_price) as total_value
      FROM equipments
      WHERE deleted_at IS NULL AND source = 'self-owned'
    `);

    const stat = stats[0];
    console.log('✅ 统计结果：');
    console.log(`   📊 自有设备总数: ${stat.total_equipment} 台`);
    console.log(`   💰 有价格设备: ${stat.has_price} 台`);
    console.log(`   ⚠️  无价格设备: ${stat.no_price} 台`);
    console.log(`   💵 总资产价值: ¥${(stat.total_value || 0).toLocaleString('zh-CN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n`);

    // 6. 显示无价格设备
    if (stat.no_price > 0) {
      console.log('【步骤6】查看无价格设备（建议补充）...');
      const [noPriceEquipments] = await pool.query(`
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
        LIMIT 10
      `);

      console.log('⚠️  以下设备无采购价格：');
      noPriceEquipments.forEach((eq, idx) => {
        console.log(`   ${idx + 1}. ${eq.custom_code} | ${eq.category} ${eq.brand || ''} ${eq.model || ''} ${eq.height}m`);
      });
      console.log('');
      console.log('   💡 建议：在"设备档案"中编辑这些设备，添加采购价格\n');
    }

    console.log('=== 迁移完成 ===\n');
    console.log('✅ purchase_price字段已添加到equipments表');
    console.log('✅ 索引已创建');
    console.log('✅ 历史数据已回填');
    console.log('');
    console.log('📋 下一步：');
    console.log('1. 重启后端服务：taskkill /F /IM node.exe && npm run api');
    console.log('2. 刷新浏览器页面');
    console.log('3. 测试新增设备功能');
    console.log('4. 查看资产利用率监控');

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

migrate();
