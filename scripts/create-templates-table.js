import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gaokongche',
  multipleStatements: true
});

async function run() {
  try {
    console.log('创建templates表...');
    const sql = fs.readFileSync(path.resolve(__dirname, '../sql/mysql/053_create_document_templates_simple.sql'), 'utf8');
    await pool.query(sql);
    console.log('✅ templates表创建成功');
  } catch (error) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('✅ templates表已存在');
    } else {
      console.error('❌ 错误:', error.message);
    }
  } finally {
    await pool.end();
  }
}

run();


