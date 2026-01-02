/**
 * 生成测试账号的正确密码哈希
 * 密码：123456
 */

import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

async function generateTestUsersWithCorrectHash() {
  // 生成密码哈希
  const password = '123456';
  const passwordHash = await bcrypt.hash(password, 10);
  
  console.log('生成的密码哈希:', passwordHash);
  console.log('密码:', password);
  
  // 连接数据库
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gaokongche',
    waitForConnections: true,
    connectionLimit: 10,
  });

  try {
    // 更新测试账号的密码哈希
    console.log('\n开始更新测试账号密码...');
    
    const accounts = ['test_admin_a', 'test_admin_b', 'superadmin'];
    
    for (const username of accounts) {
      const [result] = await pool.query(
        'UPDATE users SET password_hash = ? WHERE username = ?',
        [passwordHash, username]
      );
      
      if (result.affectedRows > 0) {
        console.log(`✅ ${username} 密码已更新`);
      } else {
        console.log(`⚠️ ${username} 不存在，跳过`);
      }
    }
    
    console.log('\n✅ 所有测试账号密码已更新！');
    console.log('📝 测试账号清单:');
    console.log('  - test_admin_a / 123456');
    console.log('  - test_admin_b / 123456');
    console.log('  - superadmin / 123456');
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await pool.end();
  }
}

generateTestUsersWithCorrectHash();
