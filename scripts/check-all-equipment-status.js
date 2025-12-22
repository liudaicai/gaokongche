/**
 * 检查所有设备的状态分布
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gaokongche',
  port: parseInt(process.env.MYSQL_PORT || '3306')
};

async function checkAllEquipmentStatus() {
  let connection;
  
  try {
    console.log('🔗 正在连接数据库...\n');
    connection = await mysql.createConnection(config);
    
    // 1. 按 rental_status 统计
    console.log('='.repeat(70));
    console.log('📊 所有设备的 rental_status 统计');
    console.log('='.repeat(70) + '\n');
    
    const [statusStats] = await connection.query(`
      SELECT 
        rental_status,
        COUNT(*) as count
      FROM equipments
      WHERE deleted_at IS NULL
      GROUP BY rental_status
      ORDER BY count DESC
    `);
    
    console.log('┌────────────────────┬──────┐');
    console.log('│ rental_status      │ 数量 │');
    console.log('├────────────────────┼──────┤');
    
    statusStats.forEach(stat => {
      const status = (stat.rental_status || 'NULL').padEnd(19);
      const count = String(stat.count).padStart(5);
      console.log(`│ ${status}│ ${count}│`);
    });
    console.log('└────────────────────┴──────┘\n');
    
    // 2. 查找问题设备（惠州店 4m 和惠州镇隆店 6m）
    console.log('='.repeat(70));
    console.log('🔍 问题设备详情');
    console.log('='.repeat(70) + '\n');
    
    const [problemEquipments] = await connection.query(`
      SELECT 
        e.id,
        e.code,
        e.custom_code,
        e.brand,
        e.model,
        e.type,
        e.height,
        e.rental_status,
        COALESCE(s.name, e.warehouse, '默认区域') AS area
      FROM equipments e
      LEFT JOIN stores s ON e.store_id = s.id
      WHERE e.deleted_at IS NULL
      AND (
        (e.type = '剪叉车' AND e.height = 4 AND COALESCE(s.name, e.warehouse, '默认区域') = '惠州店')
        OR
        (e.type = '剪叉车' AND e.height = 6 AND COALESCE(s.name, e.warehouse, '默认区域') = '惠州镇隆店')
      )
      ORDER BY e.height, e.rental_status, e.id
    `);
    
    console.log(`找到 ${problemEquipments.length} 台设备\n`);
    
    // 按区域和高度分组
    const groups = {
      '惠州店-4m': [],
      '惠州镇隆店-6m': []
    };
    
    problemEquipments.forEach(eq => {
      const key = eq.height == 4 ? '惠州店-4m' : '惠州镇隆店-6m';
      groups[key].push(eq);
    });
    
    // 显示惠州店 4m
    console.log('━'.repeat(70));
    console.log('惠州店 - 剪叉车 4.00m (共' + groups['惠州店-4m'].length + '台)');
    console.log('━'.repeat(70));
    
    const status4m = {
      available: 0,
      renting: 0,
      repairing: 0,
      retired: 0,
      null: 0,
      other: 0
    };
    
    console.log('\n┌─────┬──────────────┬──────────────┬────────────────┐');
    console.log('│ ID  │ 出厂编号     │ 自编号       │ rental_status  │');
    console.log('├─────┼──────────────┼──────────────┼────────────────┤');
    
    groups['惠州店-4m'].forEach(eq => {
      const id = String(eq.id).padEnd(4);
      const code = (eq.code || '-').padEnd(13);
      const customCode = (eq.custom_code || '-').padEnd(13);
      const status = (eq.rental_status || 'NULL').padEnd(15);
      
      console.log(`│ ${id}│ ${code}│ ${customCode}│ ${status}│`);
      
      if (eq.rental_status === 'available') status4m.available++;
      else if (eq.rental_status === 'renting') status4m.renting++;
      else if (eq.rental_status === 'repairing') status4m.repairing++;
      else if (eq.rental_status === 'retired') status4m.retired++;
      else if (!eq.rental_status) status4m.null++;
      else status4m.other++;
    });
    
    console.log('└─────┴──────────────┴──────────────┴────────────────┘\n');
    console.log('状态统计:');
    console.log(`  - available (待租): ${status4m.available}台`);
    console.log(`  - renting (在租): ${status4m.renting}台`);
    console.log(`  - repairing (维修): ${status4m.repairing}台`);
    console.log(`  - retired (退役): ${status4m.retired}台`);
    console.log(`  - NULL (空值): ${status4m.null}台`);
    console.log(`  - 其他: ${status4m.other}台\n`);
    
    // 显示惠州镇隆店 6m
    console.log('━'.repeat(70));
    console.log('惠州镇隆店 - 剪叉车 6.00m (共' + groups['惠州镇隆店-6m'].length + '台)');
    console.log('━'.repeat(70));
    
    const status6m = {
      available: 0,
      renting: 0,
      repairing: 0,
      retired: 0,
      null: 0,
      other: 0
    };
    
    console.log('\n┌─────┬──────────────┬──────────────┬────────────────┐');
    console.log('│ ID  │ 出厂编号     │ 自编号       │ rental_status  │');
    console.log('├─────┼──────────────┼──────────────┼────────────────┤');
    
    groups['惠州镇隆店-6m'].forEach(eq => {
      const id = String(eq.id).padEnd(4);
      const code = (eq.code || '-').padEnd(13);
      const customCode = (eq.custom_code || '-').padEnd(13);
      const status = (eq.rental_status || 'NULL').padEnd(15);
      
      console.log(`│ ${id}│ ${code}│ ${customCode}│ ${status}│`);
      
      if (eq.rental_status === 'available') status6m.available++;
      else if (eq.rental_status === 'renting') status6m.renting++;
      else if (eq.rental_status === 'repairing') status6m.repairing++;
      else if (eq.rental_status === 'retired') status6m.retired++;
      else if (!eq.rental_status) status6m.null++;
      else status6m.other++;
    });
    
    console.log('└─────┴──────────────┴──────────────┴────────────────┘\n');
    console.log('状态统计:');
    console.log(`  - available (待租): ${status6m.available}台`);
    console.log(`  - renting (在租): ${status6m.renting}台`);
    console.log(`  - repairing (维修): ${status6m.repairing}台`);
    console.log(`  - retired (退役): ${status6m.retired}台`);
    console.log(`  - NULL (空值): ${status6m.null}台`);
    console.log(`  - 其他: ${status6m.other}台\n`);
    
    // 3. 提供修复建议
    console.log('='.repeat(70));
    console.log('💡 修复建议');
    console.log('='.repeat(70) + '\n');
    
    const total4mRetired = status4m.retired + status4m.null + status4m.other;
    const total6mRetired = status6m.retired + status6m.null + status6m.other;
    
    if (total4mRetired > 0) {
      console.log(`⚠️  惠州店 4m 有 ${total4mRetired} 台设备状态异常：`);
      if (status4m.retired > 0) console.log(`   - ${status4m.retired} 台状态为 "retired" (退役)`);
      if (status4m.null > 0) console.log(`   - ${status4m.null} 台状态为 NULL (空值)`);
      if (status4m.other > 0) console.log(`   - ${status4m.other} 台状态为其他异常值`);
      console.log('');
    }
    
    if (total6mRetired > 0) {
      console.log(`⚠️  惠州镇隆店 6m 有 ${total6mRetired} 台设备状态异常：`);
      if (status6m.retired > 0) console.log(`   - ${status6m.retired} 台状态为 "retired" (退役)`);
      if (status6m.null > 0) console.log(`   - ${status6m.null} 台状态为 NULL (空值)`);
      if (status6m.other > 0) console.log(`   - ${status6m.other} 台状态为其他异常值`);
      console.log('');
    }
    
    if (total4mRetired > 0 || total6mRetired > 0) {
      console.log('🔧 建议操作：');
      console.log('');
      console.log('如果这些设备应该是"待租"状态，运行以下SQL修复：');
      console.log('');
      console.log('```sql');
      
      if (total4mRetired > 0) {
        console.log('-- 修复惠州店 4m 设备');
        console.log(`UPDATE equipments e`);
        console.log(`LEFT JOIN stores s ON e.store_id = s.id`);
        console.log(`SET e.rental_status = 'available'`);
        console.log(`WHERE e.type = '剪叉车' AND e.height = 4`);
        console.log(`AND COALESCE(s.name, e.warehouse, '默认区域') = '惠州店'`);
        console.log(`AND e.rental_status != 'available'`);
        console.log(`AND e.deleted_at IS NULL;`);
        console.log('');
      }
      
      if (total6mRetired > 0) {
        console.log('-- 修复惠州镇隆店 6m 设备');
        console.log(`UPDATE equipments e`);
        console.log(`LEFT JOIN stores s ON e.store_id = s.id`);
        console.log(`SET e.rental_status = 'available'`);
        console.log(`WHERE e.type = '剪叉车' AND e.height = 6`);
        console.log(`AND COALESCE(s.name, e.warehouse, '默认区域') = '惠州镇隆店'`);
        console.log(`AND e.rental_status != 'available'`);
        console.log(`AND e.deleted_at IS NULL;`);
      }
      
      console.log('```');
      console.log('');
    } else {
      console.log('✅ 所有设备状态正常！\n');
    }
    
  } catch (error) {
    console.error('\n❌ 检查失败！');
    console.error('错误详情:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭\n');
    }
  }
}

console.log('\n' + '='.repeat(70));
console.log('设备状态详细检查');
console.log('='.repeat(70) + '\n');

checkAllEquipmentStatus();


