/**
 * 执行提醒系统数据库迁移
 */
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const {
    MYSQL_HOST = '127.0.0.1',
    MYSQL_PORT = '3306',
    MYSQL_USER = 'root',
    MYSQL_PASSWORD = '',
    MYSQL_DB = 'gaokongche',
  } = process.env;

  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: MYSQL_HOST,
      port: Number(MYSQL_PORT),
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DB,
      multipleStatements: true
    });

    console.log('✅ 数据库连接成功');

    const sqlFile = path.join(__dirname, '../sql/mysql/057_create_reminder_system.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📝 正在执行迁移脚本...');
    await connection.query(sql);
    
    console.log('✅ 智能提醒中心数据库迁移完成！');
    console.log('');
    console.log('已创建以下表：');
    console.log('  1. reminder_rules (提醒规则表)');
    console.log('  2. reminder_records (提醒记录表)');
    console.log('  3. user_reminder_settings (用户提醒配置表)');
    console.log('  4. contract_renewal_records (合同续约记录表)');
    console.log('  5. reminder_statistics (提醒统计表)');
    console.log('');
    console.log('✅ 已插入4条默认提醒规则');
    
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrate();

