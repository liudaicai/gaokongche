/**
 * 检查设备库存统计数据
 * 对比设备档案和库存统计的差异
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

async function checkInventoryStats() {
  let connection;
  
  try {
    console.log('🔗 正在连接数据库...');
    connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功！\n');
    
    // 1. 统计设备档案中的实际状态
    console.log('=' .repeat(70));
    console.log('📊 步骤1: 设备档案中的实际状态统计');
    console.log('='.repeat(70) + '\n');
    
    const [actualStats] = await connection.query(`
      SELECT 
        rental_status AS 状态,
        COUNT(*) AS 数量
      FROM equipments
      WHERE deleted_at IS NULL
      GROUP BY rental_status
      ORDER BY rental_status
    `);
    
    console.log('设备档案统计（equipments 表）：\n');
    console.log('┌────────────────┬──────┐');
    console.log('│ 状态           │ 数量 │');
    console.log('├────────────────┼──────┤');
    
    const statusMap = {
      'available': '待租',
      'renting': '在租',
      'repairing': '维修',
      'retired': '退役'
    };
    
    let totalCount = 0;
    let availableCount = 0;
    let rentingCount = 0;
    let repairingCount = 0;
    
    actualStats.forEach(stat => {
      const statusName = (statusMap[stat.状态] || stat.状态).padEnd(15);
      const count = String(stat.数量).padStart(5);
      console.log(`│ ${statusName}│ ${count}│`);
      
      totalCount += stat.数量;
      if (stat.状态 === 'available') availableCount = stat.数量;
      if (stat.状态 === 'renting') rentingCount = stat.数量;
      if (stat.状态 === 'repairing') repairingCount = stat.数量;
    });
    
    console.log('├────────────────┼──────┤');
    console.log(`│ 总计           │ ${String(totalCount).padStart(5)}│`);
    console.log('└────────────────┴──────┘\n');
    
    // 2. 检查库存统计API使用的查询
    console.log('='.repeat(70));
    console.log('📊 步骤2: 库存统计API查询结果');
    console.log('='.repeat(70) + '\n');
    
    const [inventoryStats] = await connection.query(`
      SELECT 
        e.type,
        e.height,
        COALESCE(s.name, e.warehouse, '默认区域') AS area,
        COUNT(CASE WHEN e.rental_status = 'available' THEN 1 END) as waitingCount,
        COUNT(CASE WHEN e.rental_status = 'renting' THEN 1 END) as rentingCount,
        COUNT(CASE WHEN e.rental_status = 'repairing' THEN 1 END) as repairingCount,
        COUNT(*) as totalCount
      FROM equipments e
      LEFT JOIN stores s ON e.store_id = s.id
      WHERE e.deleted_at IS NULL
      GROUP BY e.type, e.height, COALESCE(s.name, e.warehouse, '默认区域')
      ORDER BY e.type, e.height
    `);
    
    console.log('库存统计API结果（按类型/高度/区域分组）：\n');
    console.log('┌───────────┬──────┬──────────┬──────┬──────┬──────┬──────┐');
    console.log('│ 设备类型  │ 高度 │ 区域     │ 待租 │ 在租 │ 维修 │ 合计 │');
    console.log('├───────────┼──────┼──────────┼──────┼──────┼──────┼──────┤');
    
    let apiWaitingTotal = 0;
    let apiRentingTotal = 0;
    let apiRepairingTotal = 0;
    let apiTotal = 0;
    
    inventoryStats.forEach(stat => {
      const type = (stat.type || '未分类').padEnd(10);
      const height = (stat.height ? `${stat.height}m` : '-').padEnd(5);
      const area = (stat.area || '-').padEnd(9);
      const waiting = String(stat.waitingCount).padStart(5);
      const renting = String(stat.rentingCount).padStart(5);
      const repairing = String(stat.repairingCount).padStart(5);
      const total = String(stat.totalCount).padStart(5);
      
      console.log(`│ ${type}│ ${height}│ ${area}│ ${waiting}│ ${renting}│ ${repairing}│ ${total}│`);
      
      apiWaitingTotal += Number(stat.waitingCount);
      apiRentingTotal += Number(stat.rentingCount);
      apiRepairingTotal += Number(stat.repairingCount);
      apiTotal += Number(stat.totalCount);
    });
    
    console.log('├───────────┴──────┴──────────┼──────┼──────┼──────┼──────┤');
    console.log(`│ 合计                        │ ${String(apiWaitingTotal).padStart(5)}│ ${String(apiRentingTotal).padStart(5)}│ ${String(apiRepairingTotal).padStart(5)}│ ${String(apiTotal).padStart(5)}│`);
    console.log('└─────────────────────────────┴──────┴──────┴──────┴──────┘\n');
    
    // 3. 对比分析
    console.log('='.repeat(70));
    console.log('🔍 步骤3: 对比分析');
    console.log('='.repeat(70) + '\n');
    
    const isMatch = 
      availableCount === apiWaitingTotal &&
      rentingCount === apiRentingTotal &&
      repairingCount === apiRepairingTotal &&
      totalCount === apiTotal;
    
    if (isMatch) {
      console.log('✅ 数据一致！设备档案和库存统计完全匹配。\n');
      console.log('💡 如果前端显示异常，请尝试：');
      console.log('   1. 清除浏览器缓存（Ctrl+Shift+Delete）');
      console.log('   2. 强制刷新页面（Ctrl+F5 或 Cmd+Shift+R）');
      console.log('   3. 检查前端Redux状态是否有缓存\n');
    } else {
      console.log('⚠️  数据不一致！发现差异：\n');
      console.log('┌────────────┬──────────┬──────────┬──────┐');
      console.log('│ 统计项     │ 设备档案 │ 库存API  │ 差异 │');
      console.log('├────────────┼──────────┼──────────┼──────┤');
      console.log(`│ 待租       │ ${String(availableCount).padStart(8)} │ ${String(apiWaitingTotal).padStart(8)} │ ${String(apiWaitingTotal - availableCount).padStart(4)} │`);
      console.log(`│ 在租       │ ${String(rentingCount).padStart(8)} │ ${String(apiRentingTotal).padStart(8)} │ ${String(apiRentingTotal - rentingCount).padStart(4)} │`);
      console.log(`│ 维修       │ ${String(repairingCount).padStart(8)} │ ${String(apiRepairingTotal).padStart(8)} │ ${String(apiRepairingTotal - repairingCount).padStart(4)} │`);
      console.log(`│ 合计       │ ${String(totalCount).padStart(8)} │ ${String(apiTotal).padStart(8)} │ ${String(apiTotal - totalCount).padStart(4)} │`);
      console.log('└────────────┴──────────┴──────────┴──────┘\n');
      
      console.log('❌ 这不应该发生！库存API使用了相同的查询逻辑。\n');
      console.log('💡 可能的原因：');
      console.log('   1. 数据库中有重复记录');
      console.log('   2. 查询条件不一致（租户隔离等）');
      console.log('   3. 数据库缓存问题\n');
    }
    
    // 4. 检查是否有异常设备
    console.log('='.repeat(70));
    console.log('🔍 步骤4: 检查异常设备');
    console.log('='.repeat(70) + '\n');
    
    // 检查是否有设备没有类型或高度
    const [noTypeHeight] = await connection.query(`
      SELECT COUNT(*) as count
      FROM equipments
      WHERE deleted_at IS NULL
      AND (type IS NULL OR type = '' OR height IS NULL OR height = 0)
    `);
    
    if (noTypeHeight[0].count > 0) {
      console.log(`⚠️  发现 ${noTypeHeight[0].count} 个设备缺少类型或高度信息\n`);
      
      const [details] = await connection.query(`
        SELECT id, code, custom_code, brand, model, type, height, rental_status
        FROM equipments
        WHERE deleted_at IS NULL
        AND (type IS NULL OR type = '' OR height IS NULL OR height = 0)
        LIMIT 10
      `);
      
      console.log('示例设备（前10个）：\n');
      details.forEach(eq => {
        console.log(`   - ID ${eq.id}: ${eq.custom_code || eq.code || '无编号'} (类型: ${eq.type || '空'}, 高度: ${eq.height || '空'})`);
      });
      console.log('');
    } else {
      console.log('✅ 所有设备都有类型和高度信息\n');
    }
    
    // 检查是否有deleted_at不为空但仍然被统计的设备
    const [deletedButCounted] = await connection.query(`
      SELECT COUNT(*) as count
      FROM equipments
      WHERE deleted_at IS NOT NULL
    `);
    
    if (deletedButCounted[0].count > 0) {
      console.log(`ℹ️  数据库中有 ${deletedButCounted[0].count} 个已删除的设备（不影响统计）\n`);
    }
    
    // 5. 显示详细的设备列表（按状态）
    console.log('='.repeat(70));
    console.log('📋 步骤5: 详细设备列表');
    console.log('='.repeat(70) + '\n');
    
    const [allEquipments] = await connection.query(`
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
      ORDER BY e.rental_status, e.type, e.height, e.id
    `);
    
    console.log(`总共 ${allEquipments.length} 个设备：\n`);
    
    const groupedByStatus = {};
    allEquipments.forEach(eq => {
      const status = eq.rental_status || 'unknown';
      if (!groupedByStatus[status]) {
        groupedByStatus[status] = [];
      }
      groupedByStatus[status].push(eq);
    });
    
    Object.keys(groupedByStatus).sort().forEach(status => {
      const statusName = statusMap[status] || status;
      const equipments = groupedByStatus[status];
      
      console.log(`${statusName} (${equipments.length}台):`);
      equipments.forEach((eq, index) => {
        const displayCode = eq.custom_code || eq.code || `设备${eq.id}`;
        const displayModel = eq.model || eq.brand || '-';
        const displayType = eq.type || '未分类';
        const displayHeight = eq.height ? `${eq.height}m` : '-';
        const displayArea = eq.area || '-';
        
        console.log(`   ${index + 1}. [${displayCode}] ${displayModel} (${displayType} ${displayHeight}) - ${displayArea}`);
      });
      console.log('');
    });
    
    // 6. 最终建议
    console.log('='.repeat(70));
    console.log('💡 诊断结果和建议');
    console.log('='.repeat(70) + '\n');
    
    console.log('数据库统计：');
    console.log(`   - 待租: ${availableCount} 台`);
    console.log(`   - 在租: ${rentingCount} 台`);
    console.log(`   - 维修: ${repairingCount} 台`);
    console.log(`   - 总计: ${totalCount} 台\n`);
    
    if (rentingCount > 0) {
      console.log(`⚠️  当前有 ${rentingCount} 台设备状态为"在租"`);
      console.log('   请检查这些设备是否真的在租中\n');
    } else {
      console.log('✅ 没有设备处于"在租"状态\n');
    }
    
    console.log('💡 前端显示问题的可能原因：');
    console.log('   1. 浏览器缓存（最常见）- 请清除缓存或强制刷新');
    console.log('   2. Redux状态缓存 - 重新加载页面');
    console.log('   3. API请求未正确触发 - 检查网络请求');
    console.log('   4. 前端计算逻辑错误 - 检查前端代码\n');
    
    console.log('🔧 建议的修复步骤：');
    console.log('   1. 在浏览器中按 Ctrl+Shift+Delete 清除缓存');
    console.log('   2. 完全关闭浏览器，重新打开');
    console.log('   3. 访问库存统计页面，点击"刷新数据"按钮');
    console.log('   4. 打开浏览器开发者工具（F12），查看Network请求');
    console.log('   5. 检查 /api/equipments/inventory/stats 接口的返回数据\n');
    
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
console.log('设备库存统计诊断工具');
console.log('='.repeat(70) + '\n');

checkInventoryStats();

