import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function addRepaymentAccount() {
  console.log('🔄 添加还款账户信息字段...');

  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'gaokongche',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    multipleStatements: true
  });

  try {
    const sqlPath = path.join(__dirname, '../sql/mysql/062_add_repayment_account.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 执行SQL脚本...');
    await connection.query(sql);

    console.log('✅ 还款账户信息字段添加完成！');

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

addRepaymentAccount().catch(console.error);

