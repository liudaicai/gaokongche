/**
 * 数据库初始化脚本
 * 用于创建gaokongche数据库和所有必要的表
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function initDatabase() {
  let connection;
  
  try {
    console.log('🔌 连接到MySQL服务器...');
    
    // 首先连接到MySQL服务器（不指定数据库）
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || 'root',
      multipleStatements: true
    });
    
    console.log('✅ 已连接到MySQL服务器');
    
    // 读取初始化SQL文件
    const sqlFile = path.join(__dirname, '..', 'sql', 'mysql', 'init_gaokongche.sql');
    console.log(`📖 读取SQL文件: ${sqlFile}`);
    
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // 执行SQL脚本
    console.log('🚀 开始执行SQL脚本...');
    await connection.query(sqlContent);
    
    console.log('✅ 数据库初始化成功！');
    console.log('\n📊 数据库统计：');
    
    // 切换到新创建的数据库
    await connection.query(`USE ${process.env.MYSQL_DB || 'gaokongche'}`);
    
    // 显示所有表
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`   - 数据库名: ${process.env.MYSQL_DB || 'gaokongche'}`);
    console.log(`   - 表数量: ${tables.length}`);
    console.log('\n📋 已创建的表:');
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`   ${index + 1}. ${tableName}`);
    });
    
    console.log('\n🎉 初始化完成！您现在可以启动后端服务了。');
    console.log('\n💡 默认管理员账号:');
    console.log('   用户名: admin');
    console.log('   密码: Admin@123');
    console.log('   （首次登录后请修改密码）');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 提示: 请检查.env文件中的数据库用户名和密码是否正确');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 提示: MySQL服务可能未启动，请先启动MySQL服务');
      console.error('   运行命令: net start mysql');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 已断开数据库连接');
    }
  }
}

// 运行初始化
initDatabase();
