/**
 * 数据库表完整性检查和自动修复脚本
 * 确保所有必需的表都存在，解决多租户切换时"表不存在"的问题
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库连接配置
const dbConfig = {
  host: '127.0.0.1',
  user: 'root',
  password: '19900809ldc',
  database: 'gaokongche',
  multipleStatements: true,
};

// 系统必需的核心表列表
const REQUIRED_TABLES = [
  'users',
  'companies',
  'customers',
  'employees',
  'stores',
  'equipments',
  'equipment_models',
  'orders',
  'order_equipment_demands',
  'order_entries',
  'order_exits',
  'order_receipts',
  'order_refunds',
  'order_suspensions',
  'order_claims',
  'order_settlements',
  'order_clearances',
  'finance_records',           // 财务记录表（关键！）
  'logistics_ledger',
  'logistics_companies',
  'logistics_drivers',
  'logistics_vehicles',
  'parts',                     // 配件管理
  'part_transactions',
  'part_stocks',
  'equipment_purchases',        // 采购管理
  'purchase_items',
  'purchase_repayments',
  'reminder_rules',            // 提醒系统
  'reminder_records',
  'document_templates',        // 文档模板
  'insurance_policies',        // 保险
  'policy_equipments',
  '_migrations',               // 迁移记录表
];

/**
 * 检查表是否存在
 */
async function checkTableExists(connection, tableName) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) as count FROM information_schema.tables 
     WHERE table_schema = 'gaokongche' AND table_name = ?`,
    [tableName]
  );
  return rows[0].count > 0;
}

/**
 * 获取所有现有表
 */
async function getAllTables(connection) {
  const [rows] = await connection.query('SHOW TABLES');
  return rows.map(row => Object.values(row)[0]);
}

/**
 * 创建迁移记录表（如果不存在）
 */
async function ensureMigrationsTable(connection) {
  const exists = await checkTableExists(connection, '_migrations');
  if (!exists) {
    console.log('📝 创建迁移记录表 _migrations...');
    await connection.query(`
      CREATE TABLE _migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        executed_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        INDEX idx_executed_at (executed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ _migrations 表创建成功');
  }
}

/**
 * 检查哪些迁移已执行
 */
async function getExecutedMigrations(connection) {
  try {
    const [rows] = await connection.query('SELECT migration_name FROM _migrations');
    return new Set(rows.map(r => r.migration_name));
  } catch (err) {
    return new Set();
  }
}

/**
 * 记录迁移执行
 */
async function recordMigration(connection, migrationName) {
  await connection.query(
    'INSERT IGNORE INTO _migrations (migration_name) VALUES (?)',
    [migrationName]
  );
}

/**
 * 执行SQL迁移文件
 */
async function executeMigrationFile(connection, filePath, fileName) {
  try {
    console.log(`📄 执行迁移: ${fileName}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // 移除注释和空行
    const cleanSql = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim())
      .join('\n');
    
    if (cleanSql.trim()) {
      await connection.query(cleanSql);
      await recordMigration(connection, fileName);
      console.log(`✅ ${fileName} 执行成功`);
      return true;
    }
  } catch (err) {
    console.error(`❌ ${fileName} 执行失败:`, err.message);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🔍 开始数据库完整性检查...\n');
  
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // 1. 确保迁移记录表存在
    await ensureMigrationsTable(connection);
    
    // 2. 获取当前所有表
    const existingTables = await getAllTables(connection);
    console.log(`📊 当前数据库中有 ${existingTables.length} 个表\n`);
    
    // 3. 检查缺失的核心表
    const missingTables = REQUIRED_TABLES.filter(table => !existingTables.includes(table));
    
    if (missingTables.length === 0) {
      console.log('✅ 所有核心表都已存在！\n');
    } else {
      console.log(`⚠️  发现 ${missingTables.length} 个缺失的表:`);
      missingTables.forEach(table => console.log(`  - ${table}`));
      console.log('');
    }
    
    // 4. 检查并执行未执行的迁移
    const executedMigrations = await getExecutedMigrations(connection);
    const sqlDir = path.join(__dirname, '../sql/mysql');
    const migrationFiles = fs.readdirSync(sqlDir)
      .filter(f => f.endsWith('.sql') && !f.startsWith('schema') && !f.startsWith('init') && !f.startsWith('verify'))
      .sort();
    
    console.log(`📋 发现 ${migrationFiles.length} 个迁移文件`);
    console.log(`📊 已执行 ${executedMigrations.size} 个迁移\n`);
    
    const pendingMigrations = migrationFiles.filter(f => !executedMigrations.has(f));
    
    if (pendingMigrations.length > 0) {
      console.log(`🔄 需要执行 ${pendingMigrations.length} 个待处理的迁移:\n`);
      
      let successCount = 0;
      let failCount = 0;
      
      for (const file of pendingMigrations) {
        const filePath = path.join(sqlDir, file);
        const success = await executeMigrationFile(connection, filePath, file);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }
      
      console.log(`\n✅ 成功: ${successCount}, ❌ 失败: ${failCount}`);
    } else {
      console.log('✅ 所有迁移都已执行！');
    }
    
    // 5. 最终检查
    console.log('\n🔍 最终检查...');
    const finalTables = await getAllTables(connection);
    const stillMissing = REQUIRED_TABLES.filter(table => !finalTables.includes(table));
    
    if (stillMissing.length === 0) {
      console.log('🎉 数据库完整性检查通过！所有核心表都已存在！');
    } else {
      console.log('⚠️  以下核心表仍然缺失:');
      stillMissing.forEach(table => console.log(`  - ${table}`));
      console.log('\n💡 这些表可能需要手动创建或检查对应的SQL文件');
    }
    
  } catch (err) {
    console.error('❌ 检查过程出错:', err);
    throw err;
  } finally {
    await connection.end();
  }
}

// 执行检查
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

