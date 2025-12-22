/**
 * 交互式数据库初始化脚本
 * 会提示用户输入MySQL密码
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// 创建readline接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function initDatabase() {
  let connection;
  
  try {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║      高空车租赁系统 - 数据库初始化工具                ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    // 询问数据库密码
    const mysqlPassword = await question(`请输入MySQL root用户的密码: `);
    console.log('');
    
    console.log('🔌 连接到MySQL服务器...');
    
    // 首先连接到MySQL服务器（不指定数据库）
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: mysqlPassword,
      multipleStatements: true
    });
    
    console.log('✅ 已连接到MySQL服务器');
    
    // 读取初始化SQL文件
    const sqlFile = path.join(__dirname, '..', 'sql', 'mysql', 'init_gaokongche.sql');
    console.log(`📖 读取SQL文件: ${sqlFile}`);
    
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // 执行SQL脚本
    console.log('🚀 开始执行SQL脚本...');
    console.log('   这可能需要几秒钟...\n');
    
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
      console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${tableName}`);
    });
    
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                🎉 初始化完成！                         ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    console.log('⚠️  重要提示：');
    console.log(`   请更新 .env 文件中的 MYSQL_PASSWORD 为: ${mysqlPassword}`);
    console.log('   否则后端服务将无法连接数据库\n');
    
    const updateEnv = await question('是否现在自动更新 .env 文件？(y/n): ');
    
    if (updateEnv.toLowerCase() === 'y' || updateEnv.toLowerCase() === 'yes') {
      // 更新.env文件
      const envPath = path.join(__dirname, '..', '.env');
      let envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent.replace(
        /MYSQL_PASSWORD=.*/,
        `MYSQL_PASSWORD=${mysqlPassword}`
      );
      fs.writeFileSync(envPath, envContent);
      console.log('✅ .env 文件已更新');
    }
    
    console.log('\n💡 下一步操作：');
    console.log('   1. 运行后端服务: npm run api');
    console.log('   2. 运行前端服务: npm run dev');
    console.log('   3. 使用默认管理员账号登录系统\n');
    
    console.log('🔑 默认管理员账号:');
    console.log('   用户名: admin');
    console.log('   密码: Admin@123');
    console.log('   （首次登录后请修改密码）\n');
    
  } catch (error) {
    console.error('\n❌ 数据库初始化失败:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 提示: 密码错误，请重新运行脚本并输入正确的密码');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 提示: MySQL服务可能未启动，请先启动MySQL服务');
      console.error('   运行命令: net start mysql');
    } else {
      console.error('\n详细错误信息:');
      console.error(error);
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 已断开数据库连接\n');
    }
    rl.close();
  }
}

// 运行初始化
initDatabase();
