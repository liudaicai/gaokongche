/**
 * 初始化管理员账号脚本
 * 
 * 用途：创建默认的超级管理员账号
 * 使用方法：node scripts/init_admin_user.js
 */

import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import readline from 'readline';

// 创建命令行输入接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('========================================');
  console.log('  初始化管理员账号');
  console.log('========================================\n');

  try {
    // 连接数据库
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DB || 'gaokongche',
    });

    console.log('✅ 数据库连接成功\n');

    // 检查是否已存在管理员账号
    const [existingAdmins] = await connection.query(
      'SELECT COUNT(*) as count FROM users WHERE role = ?',
      ['admin']
    );

    if (existingAdmins[0].count > 0) {
      console.log(`⚠️  已存在 ${existingAdmins[0].count} 个管理员账号`);
      const overwrite = await question('是否继续创建新管理员？(y/N): ');
      
      if (overwrite.toLowerCase() !== 'y') {
        console.log('操作已取消');
        await connection.end();
        rl.close();
        return;
      }
    }

    // 获取管理员信息
    console.log('\n请输入管理员信息：\n');
    
    const username = await question('用户名 (默认: admin): ') || 'admin';
    const name = await question('真实姓名 (默认: 系统管理员): ') || '系统管理员';
    const email = await question('邮箱 (可选): ') || null;
    const phone = await question('电话 (可选): ') || null;
    
    let password = await question('密码 (默认: admin123): ');
    if (!password) {
      password = 'admin123';
      console.log('⚠️  使用默认密码: admin123（生产环境请立即修改！）');
    }

    // 检查用户名是否已存在
    const [existingUsers] = await connection.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      console.log(`\n❌ 错误：用户名 "${username}" 已存在`);
      await connection.end();
      rl.close();
      return;
    }

    // 生成密码哈希
    console.log('\n正在生成密码哈希...');
    const passwordHash = await bcrypt.hash(password, 10);

    // 插入管理员账号
    const [result] = await connection.query(
      `INSERT INTO users 
        (username, email, password_hash, name, role, phone, is_active, password_changed_at) 
       VALUES (?, ?, ?, ?, 'admin', ?, 1, NOW())`,
      [username, email, passwordHash, name, phone]
    );

    const userId = result.insertId;

    // 授予所有权限
    const adminPermissions = [
      'users.create',
      'users.read',
      'users.update',
      'users.delete',
      'customers.create',
      'customers.read',
      'customers.update',
      'customers.delete',
      'orders.create',
      'orders.read',
      'orders.update',
      'orders.delete',
      'equipments.create',
      'equipments.read',
      'equipments.update',
      'equipments.delete',
      'employees.create',
      'employees.read',
      'employees.update',
      'employees.delete',
      'policies.create',
      'policies.read',
      'policies.update',
      'policies.delete',
      'system.settings',
      'audit.logs',
    ];

    for (const permission of adminPermissions) {
      await connection.query(
        'INSERT INTO user_permissions (user_id, permission, granted_by) VALUES (?, ?, ?)',
        [userId, permission, userId]
      );
    }

    // 记录审计日志
    await connection.query(
      `INSERT INTO audit_logs 
        (user_id, username, action, resource_type, resource_id, details, status) 
       VALUES (?, ?, 'create', 'user', ?, ?, 'success')`,
      [
        userId, 
        username, 
        userId.toString(), 
        JSON.stringify({ role: 'admin', permissions_count: adminPermissions.length })
      ]
    );

    console.log('\n========================================');
    console.log('  ✅ 管理员账号创建成功！');
    console.log('========================================\n');
    console.log('账号信息：');
    console.log(`  用户ID: ${userId}`);
    console.log(`  用户名: ${username}`);
    console.log(`  姓名: ${name}`);
    console.log(`  邮箱: ${email || '(未设置)'}`);
    console.log(`  电话: ${phone || '(未设置)'}`);
    console.log(`  角色: admin`);
    console.log(`  权限: ${adminPermissions.length} 项\n`);

    if (password === 'admin123') {
      console.log('⚠️  安全提示：');
      console.log('   请在首次登录后立即修改默认密码！');
      console.log('   生产环境禁止使用弱密码！\n');
    }

    await connection.end();
    rl.close();

  } catch (error) {
    console.error('\n❌ 错误：', error.message);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error('\n提示：请先运行数据库迁移脚本');
      console.error('  mysql -u root -p < sql/mysql/schema.sql');
      console.error('  mysql -u root -p < sql/mysql/001_add_users_and_auth.sql');
    }
    rl.close();
    process.exit(1);
  }
}

// 运行脚本
main().catch(error => {
  console.error('脚本执行失败：', error);
  process.exit(1);
});

