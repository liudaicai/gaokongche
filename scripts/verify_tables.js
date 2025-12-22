import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DB || 'gaokongche',
  waitForConnections: true,
  connectionLimit: 10,
});

async function verifyTables() {
  try {
    console.log('🔍 验证数据库表...\n');
    
    // 检查财务记录表
    console.log('📊 检查 finance_records 表:');
    const [financeRows] = await pool.query('SHOW TABLES LIKE "finance_records"');
    if (financeRows.length > 0) {
      console.log('✅ finance_records 表存在');
      const [columns] = await pool.query('DESCRIBE finance_records');
      console.log('   字段数:', columns.length);
      console.log('   关键字段:', columns.map(c => c.Field).slice(0, 5).join(', '), '...');
    } else {
      console.log('❌ finance_records 表不存在');
    }
    
    // 检查物流台账表
    console.log('\n🚚 检查 logistics_ledger 表:');
    const [logisticsRows] = await pool.query('SHOW TABLES LIKE "logistics_ledger"');
    if (logisticsRows.length > 0) {
      console.log('✅ logistics_ledger 表存在');
      const [columns] = await pool.query('DESCRIBE logistics_ledger');
      console.log('   字段数:', columns.length);
      console.log('   关键字段:', columns.map(c => c.Field).slice(0, 5).join(', '), '...');
    } else {
      console.log('❌ logistics_ledger 表不存在');
    }
    
    console.log('\n✅ 验证完成');
    await pool.end();
  } catch (err) {
    console.error('❌ 验证失败:', err.message);
    process.exit(1);
  }
}

verifyTables();

