/**
 * 创建订单退款表
 */

import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  console.log('========================================');
  console.log('  创建订单退款表');
  console.log('========================================\n');

  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DB || 'gaokongche',
      multipleStatements: true
    });

    console.log('✅ 数据库连接成功\n');

    // 读取 SQL 文件
    const sqlFile = path.resolve(__dirname, '../sql/mysql/031_create_order_refunds_table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('执行创建脚本...\n');

    // 执行 SQL
    await connection.query(sql);
    
    console.log('✅ 创建脚本执行成功\n');
    
    // 验证表是否存在
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'order_refunds'"
    );

    if (tables.length > 0) {
      console.log('✅ order_refunds 表验证成功\n');
      
      // 显示表结构
      const [columns] = await connection.query('DESCRIBE order_refunds');
      console.log('表结构：');
      console.table(columns);
    } else {
      console.log('❌ 未找到 order_refunds 表');
    }

    await connection.end();

  } catch (error) {
    console.error('\n❌ 错误：', error.message);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('脚本执行失败：', error);
  process.exit(1);
});

