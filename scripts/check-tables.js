import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gaokongche'
});

async function run() {
  try {
    // 检查所有表
    const [tables] = await pool.query('SHOW TABLES');
    console.log('\n数据库中的所有表:');
    tables.forEach((row, index) => {
      const tableName = Object.values(row)[0];
      console.log(`${index + 1}. ${tableName}`);
    });
    
    // 检查templates表的列
    try {
      const [columns] = await pool.query('SHOW COLUMNS FROM templates');
      console.log('\ntemplates表的列:');
      columns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type})`);
      });
    } catch (e) {
      console.log('\n❌ templates表不存在');
    }
    
  } catch (error) {
    console.error('错误:', error.message);
  } finally {
    await pool.end();
  }
}

run();


