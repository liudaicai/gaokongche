/**
 * 采购管理重构数据库迁移脚本
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'liudaicai0616',
  database: process.env.DB_NAME || 'gaokongche',
  multipleStatements: true
};

async function migrate() {
  let connection;
  try {
    console.log('连接数据库...');
    connection = await mysql.createConnection(config);
    console.log('✅ 数据库连接成功');

    // 读取SQL文件
    const sqlFile = path.join(__dirname, '../sql/mysql/061_refactor_purchases.sql');
    console.log(`读取SQL文件: ${sqlFile}`);
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // 执行SQL（分段执行，避免DELIMITER问题）
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`准备执行 ${statements.length} 条SQL语句...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          await connection.query(statement);
          console.log(`✅ [${i + 1}/${statements.length}] 执行成功`);
        } catch (err) {
          // 忽略DROP TABLE/VIEW不存在的错误
          if (err.code === 'ER_BAD_TABLE_ERROR' || err.code === 'ER_BAD_FIELD_ERROR') {
            console.log(`⚠️  [${i + 1}/${statements.length}] 跳过（表/视图不存在）`);
          } else {
            throw err;
          }
        }
      }
    }

    console.log('\n✅ 采购管理重构迁移完成！');
    console.log('\n创建的表：');
    console.log('  - equipment_purchases (采购主表)');
    console.log('  - equipment_purchase_items (采购明细表)');
    console.log('\n创建的视图：');
    console.log('  - v_purchase_statistics');
    console.log('  - v_equipment_category_stats');

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

migrate();

