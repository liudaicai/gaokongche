/**
 * 合同功能数据库迁移脚本
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 创建数据库连接
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gaokongche',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true // 允许执行多条SQL语句
});

async function executeSQLFile(filePath, pool) {
  console.log(`\n📄 执行SQL文件: ${filePath}`);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // 分割SQL语句（按分号分隔，但忽略注释中的分号）
    const statements = sql
      .split(/;[\s\n]+/)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;
      
      try {
        await pool.query(statement);
        successCount++;
        
        // 输出进度
        if (statement.includes('CREATE TABLE')) {
          const match = statement.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
          if (match) {
            console.log(`  ✅ 创建表: ${match[1]}`);
          }
        } else if (statement.includes('ALTER TABLE')) {
          const match = statement.match(/ALTER TABLE\s+(\w+)/i);
          if (match) {
            console.log(`  ✅ 修改表: ${match[1]}`);
          }
        } else if (statement.includes('CREATE INDEX')) {
          const match = statement.match(/CREATE INDEX\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
          if (match) {
            console.log(`  ✅ 创建索引: ${match[1]}`);
          }
        } else if (statement.includes('INSERT INTO')) {
          console.log(`  ✅ 插入数据`);
        } else if (statement.includes('CREATE OR REPLACE VIEW')) {
          const match = statement.match(/CREATE OR REPLACE VIEW\s+(\w+)/i);
          if (match) {
            console.log(`  ✅ 创建视图: ${match[1]}`);
          }
        }
      } catch (error) {
        errorCount++;
        // 忽略"已存在"类型的错误
        if (error.code === 'ER_DUP_FIELDNAME' || 
            error.code === 'ER_TABLE_EXISTS_ERROR' ||
            error.code === 'ER_DUP_KEYNAME' ||
            error.message.includes('Duplicate') ||
            error.message.includes('already exists') ||
            error.message.includes("check that column/key exists")) {
          console.log(`  ⚠️  已存在，跳过`);
        } else {
          console.error(`  ❌ 执行错误:`, error.message);
        }
      }
    }
    
    console.log(`\n✅ SQL执行完成: ${successCount}成功, ${errorCount}错误\n`);
    return true;
  } catch (error) {
    console.error(`❌ 读取SQL文件失败:`, error);
    return false;
  }
}

async function runMigration() {
  console.log('==========================================');
  console.log('  合同功能数据库迁移');
  console.log('==========================================\n');
  
  try {
    // 测试连接
    console.log('📡 连接数据库...');
    const connection = await pool.getConnection();
    console.log('✅ 数据库连接成功\n');
    connection.release();
    
    // 执行迁移脚本
    const sqlFile = path.resolve(__dirname, '../sql/mysql/058_add_contract_features_simple.sql');
    
    if (!fs.existsSync(sqlFile)) {
      console.error('❌ SQL文件不存在:', sqlFile);
      process.exit(1);
    }
    
    const success = await executeSQLFile(sqlFile, pool);
    
    if (success) {
      console.log('==========================================');
      console.log('  ✅ 迁移完成！');
      console.log('==========================================\n');
      console.log('新增功能:');
      console.log('  - templates表：添加合同模板字段');
      console.log('  - order_contracts表：管理订单合同');
      console.log('  - orders表：添加合同模板关联');
      console.log('  - v_contract_overview视图：合同概览');
      console.log('  - 默认合同模板已插入\n');
    } else {
      console.log('⚠️  迁移过程中有部分错误，请检查日志\n');
    }
    
  } catch (error) {
    console.error('\n❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 执行迁移
runMigration();

