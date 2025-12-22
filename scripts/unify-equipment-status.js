/**
 * 统一设备状态值
 * 将旧的 'waiting' 状态统一改为 'available'
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

async function unifyEquipmentStatus() {
  let connection;
  
  try {
    console.log('🔗 正在连接数据库...\n');
    connection = await mysql.createConnection(config);
    
    // 1. 查询当前状态分布
    console.log('='.repeat(70));
    console.log('📊 步骤1: 当前设备状态分布');
    console.log('='.repeat(70) + '\n');
    
    const [beforeStats] = await connection.query(`
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
    
    let waitingCount = 0;
    let availableCount = 0;
    
    beforeStats.forEach(stat => {
      const status = (stat.rental_status || 'NULL').padEnd(19);
      const count = String(stat.count).padStart(5);
      console.log(`│ ${status}│ ${count}│`);
      
      if (stat.rental_status === 'waiting') waitingCount = stat.count;
      if (stat.rental_status === 'available') availableCount = stat.count;
    });
    console.log('└────────────────────┴──────┘\n');
    
    if (waitingCount === 0) {
      console.log('✅ 没有需要修复的设备，所有状态已统一！\n');
      return;
    }
    
    // 2. 显示将要修改的设备
    console.log('='.repeat(70));
    console.log('📋 步骤2: 将要修改的设备列表');
    console.log('='.repeat(70) + '\n');
    
    const [waitingEquipments] = await connection.query(`
      SELECT 
        e.id,
        e.code,
        e.custom_code,
        e.brand,
        e.model,
        e.type,
        e.height,
        COALESCE(s.name, e.warehouse, '默认区域') AS area
      FROM equipments e
      LEFT JOIN stores s ON e.store_id = s.id
      WHERE e.rental_status = 'waiting'
      AND e.deleted_at IS NULL
      ORDER BY e.type, e.height, e.id
    `);
    
    console.log(`发现 ${waitingCount} 台状态为 'waiting' 的设备：\n`);
    console.log('┌─────┬──────────────┬──────────────┬────────┬──────┬──────────┐');
    console.log('│ ID  │ 出厂编号     │ 自编号       │ 类型   │ 高度 │ 区域     │');
    console.log('├─────┼──────────────┼──────────────┼────────┼──────┼──────────┤');
    
    waitingEquipments.forEach(eq => {
      const id = String(eq.id).padEnd(4);
      const code = (eq.code || '-').padEnd(13);
      const customCode = (eq.custom_code || '-').padEnd(13);
      const type = (eq.type || '-').padEnd(7);
      const height = (eq.height ? `${eq.height}m` : '-').padEnd(5);
      const area = (eq.area || '-').substring(0, 9).padEnd(9);
      
      console.log(`│ ${id}│ ${code}│ ${customCode}│ ${type}│ ${height}│ ${area}│`);
    });
    
    console.log('└─────┴──────────────┴──────────────┴────────┴──────┴──────────┘\n');
    
    // 3. 执行修复
    console.log('='.repeat(70));
    console.log('🔧 步骤3: 统一设备状态');
    console.log('='.repeat(70) + '\n');
    
    console.log('正在将 "waiting" 状态改为 "available"...\n');
    
    const [result] = await connection.query(`
      UPDATE equipments 
      SET rental_status = 'available',
          updated_at = NOW(3)
      WHERE rental_status = 'waiting'
      AND deleted_at IS NULL
    `);
    
    console.log(`✅ 已修改 ${result.affectedRows} 台设备的状态\n`);
    
    // 4. 验证修复结果
    console.log('='.repeat(70));
    console.log('📊 步骤4: 修复后的状态分布');
    console.log('='.repeat(70) + '\n');
    
    const [afterStats] = await connection.query(`
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
    
    let newAvailableCount = 0;
    
    afterStats.forEach(stat => {
      const status = (stat.rental_status || 'NULL').padEnd(19);
      const count = String(stat.count).padStart(5);
      console.log(`│ ${status}│ ${count}│`);
      
      if (stat.rental_status === 'available') newAvailableCount = stat.count;
    });
    console.log('└────────────────────┴──────┘\n');
    
    // 5. 记录审计日志
    await connection.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, status, created_at)
       VALUES (?, 'unify_rental_status', 'equipment', NULL, ?, 'success', NOW())`,
      [
        null,
        JSON.stringify({
          from_status: 'waiting',
          to_status: 'available',
          affected_count: result.affectedRows,
          timestamp: new Date().toISOString()
        })
      ]
    );
    
    // 6. 显示总结
    console.log('='.repeat(70));
    console.log('🎉 修复完成！');
    console.log('='.repeat(70) + '\n');
    
    console.log('修复前：');
    console.log(`  - waiting: ${waitingCount}台`);
    console.log(`  - available: ${availableCount}台\n`);
    
    console.log('修复后：');
    console.log(`  - waiting: 0台`);
    console.log(`  - available: ${newAvailableCount}台 (增加了 ${waitingCount}台)\n`);
    
    console.log('💡 接下来：');
    console.log('   1. 刷新前端页面（Ctrl+F5）');
    console.log('   2. 查看库存统计页面');
    console.log('   3. 确认"待租"数量已更新为 ' + newAvailableCount + ' 台\n');
    
  } catch (error) {
    console.error('\n❌ 修复失败！');
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
console.log('统一设备状态值 (waiting → available)');
console.log('='.repeat(70) + '\n');

unifyEquipmentStatus();


