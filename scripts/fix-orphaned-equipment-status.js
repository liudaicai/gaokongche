/**
 * 修复孤立的设备状态
 * 场景：设备状态为"在租"，但没有对应的活跃订单
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

async function fixOrphanedEquipmentStatus() {
  let connection;
  
  try {
    console.log('🔗 正在连接数据库...');
    console.log(`   主机: ${config.host}:${config.port}`);
    console.log(`   数据库: ${config.database}\n`);
    
    connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功！\n');
    
    // 1. 查找孤立的"在租"设备
    console.log('🔍 步骤1: 查找孤立的"在租"设备...\n');
    
    const [orphanedEquipments] = await connection.query(`
      SELECT 
        e.id,
        e.code,
        e.custom_code,
        e.brand,
        e.model,
        e.type,
        e.height,
        e.rental_status,
        e.warehouse,
        s.name AS store_name
      FROM equipments e
      LEFT JOIN stores s ON e.store_id = s.id
      WHERE e.rental_status = 'renting'
      AND e.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 
        FROM order_entries oe
        JOIN orders o ON oe.order_id = o.id
        WHERE o.status IN ('confirmed', 'in_progress', 'suspended')
        AND (
          JSON_CONTAINS(oe.attachments_json, JSON_QUOTE(e.code), '$.equipmentCodes') OR
          JSON_CONTAINS(oe.attachments_json, JSON_QUOTE(e.custom_code), '$.equipmentCodes')
        )
      )
      ORDER BY e.id
    `);
    
    if (orphanedEquipments.length === 0) {
      console.log('✅ 没有发现孤立的设备，库存状态正常！\n');
      return;
    }
    
    console.log(`⚠️  发现 ${orphanedEquipments.length} 个孤立的"在租"设备：\n`);
    console.log('┌─────┬──────────────┬──────────────┬────────┬──────┬────────┬──────────┐');
    console.log('│ ID  │ 出厂编号     │ 自编号       │ 类型   │ 高度 │ 区域   │ 当前状态 │');
    console.log('├─────┼──────────────┼──────────────┼────────┼──────┼────────┼──────────┤');
    
    orphanedEquipments.forEach(eq => {
      const id = String(eq.id).padEnd(4);
      const code = (eq.code || '-').padEnd(13);
      const customCode = (eq.custom_code || '-').padEnd(13);
      const type = (eq.type || '-').padEnd(7);
      const height = (eq.height ? `${eq.height}m` : '-').padEnd(5);
      const area = (eq.store_name || eq.warehouse || '-').padEnd(7);
      const status = '在租'.padEnd(9);
      
      console.log(`│ ${id}│ ${code}│ ${customCode}│ ${type}│ ${height}│ ${area}│ ${status}│`);
    });
    
    console.log('└─────┴──────────────┴──────────────┴────────┴──────┴────────┴──────────┘\n');
    
    // 2. 确认是否修复
    console.log('📋 这些设备将被修复：');
    console.log('   - 状态从 "在租(renting)" 改为 "待租(available)"');
    console.log('   - 修复后库存统计会自动更新\n');
    
    // 自动执行修复（在脚本中）
    console.log('🔧 步骤2: 开始修复设备状态...\n');
    
    const equipmentIds = orphanedEquipments.map(eq => eq.id);
    
    const [result] = await connection.query(
      `UPDATE equipments 
       SET rental_status = 'available', 
           updated_at = NOW(3)
       WHERE id IN (?)`,
      [equipmentIds]
    );
    
    console.log(`✅ 已修复 ${result.affectedRows} 个设备的状态\n`);
    
    // 3. 验证修复结果
    console.log('🔍 步骤3: 验证修复结果...\n');
    
    const [stats] = await connection.query(`
      SELECT 
        rental_status,
        COUNT(*) AS count
      FROM equipments
      WHERE deleted_at IS NULL
      GROUP BY rental_status
      ORDER BY rental_status
    `);
    
    console.log('📊 当前设备状态统计：\n');
    console.log('┌────────────────┬──────┐');
    console.log('│ 状态           │ 数量 │');
    console.log('├────────────────┼──────┤');
    
    const statusMap = {
      'available': '待租',
      'renting': '在租',
      'repairing': '维修',
      'retired': '退役'
    };
    
    stats.forEach(stat => {
      const statusName = (statusMap[stat.rental_status] || stat.rental_status).padEnd(15);
      const count = String(stat.count).padStart(5);
      console.log(`│ ${statusName}│ ${count}│`);
    });
    console.log('└────────────────┴──────┘\n');
    
    // 4. 记录审计日志
    console.log('📝 步骤4: 记录审计日志...\n');
    
    await connection.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, status, created_at)
       VALUES (?, 'fix_orphaned_status', 'equipment', NULL, ?, 'success', NOW())`,
      [
        null,
        JSON.stringify({
          fixed_count: result.affectedRows,
          equipment_ids: equipmentIds,
          timestamp: new Date().toISOString()
        })
      ]
    );
    
    console.log('✅ 审计日志已记录\n');
    
    // 5. 显示修复后的设备列表
    console.log('✅ 修复完成！已修复的设备列表：\n');
    
    orphanedEquipments.forEach((eq, index) => {
      const displayCode = eq.custom_code || eq.code || `设备${eq.id}`;
      console.log(`   ${index + 1}. ${displayCode} (${eq.type || '未分类'} ${eq.height || '-'}m) - 惠州店 → 状态已改为"待租"`);
    });
    
    console.log('\n' + '='.repeat(70));
    console.log('🎉 修复成功！');
    console.log('='.repeat(70));
    console.log('\n💡 接下来：');
    console.log('   1. 刷新前端页面（Ctrl+F5 或 Cmd+Shift+R）');
    console.log('   2. 查看库存统计页面，确认数量已更新');
    console.log('   3. 如果问题依然存在，请检查是否有其他订单关联这些设备\n');
    
  } catch (error) {
    console.error('\n❌ 修复失败！');
    console.error('错误详情:', error.message);
    if (error.sql) {
      console.error('\nSQL语句:', error.sql.substring(0, 200) + '...');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭\n');
    }
  }
}

// 执行修复
console.log('\n' + '='.repeat(70));
console.log('修复孤立的设备状态');
console.log('='.repeat(70) + '\n');

fixOrphanedEquipmentStatus();

