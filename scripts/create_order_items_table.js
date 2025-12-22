/**
 * 创建 order_items 表
 * 用于存储订单的设备需求项
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createOrderItemsTable() {
  console.log('🔧 开始创建 order_items 表...\n');

  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DB || 'gaokongche',
    multipleStatements: true
  });

  try {
    console.log('✅ 数据库连接成功\n');

    // 读取 SQL 文件
    const sqlFile = path.join(__dirname, '..', 'sql', 'mysql', '032_create_order_items_table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📝 执行 SQL 脚本: 032_create_order_items_table.sql\n');

    // 执行 SQL
    const [results] = await connection.query(sql);
    
    console.log('\n✅ SQL 脚本执行成功！\n');

    // 验证表是否创建成功
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'order_items'"
    );

    if (tables.length > 0) {
      console.log('✅ order_items 表已成功创建\n');

      // 显示表结构
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_COMMENT
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'order_items'
        ORDER BY ORDINAL_POSITION
      `);

      console.log('📋 表结构：');
      console.table(columns);
    } else {
      console.error('❌ order_items 表创建失败');
    }

  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    await connection.end();
    console.log('\n✅ 数据库连接已关闭');
  }
}

// 执行迁移
createOrderItemsTable()
  .then(() => {
    console.log('\n🎉 order_items 表创建完成！');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ 创建失败:', err);
    process.exit(1);
  });

