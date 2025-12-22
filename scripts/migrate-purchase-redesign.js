import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function migratePurchaseRedesign() {
  console.log('🔄 开始重新设计采购管理表结构...');

  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'gaokongche',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    multipleStatements: true
  });

  try {
    const sqlPath = path.join(__dirname, '../sql/mysql/061_redesign_purchase_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 执行SQL脚本...');
    await connection.query(sql);

    console.log('✅ 采购管理表结构重新设计完成！');
    console.log('\n📊 新表结构：');
    console.log('  - equipment_purchases (采购主表)');
    console.log('  - purchase_items (采购明细表)');
    console.log('  - v_purchase_statistics (采购统计视图)');
    console.log('  - v_purchase_equipment_stats (设备类型统计视图)');
    console.log('  - v_manufacturer_purchase_stats (厂家采购统计视图)');

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

migratePurchaseRedesign().catch(console.error);

