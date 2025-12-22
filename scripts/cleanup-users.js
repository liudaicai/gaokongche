/**
 * 清理用户 - 只保留超级管理员
 * 
 * ⚠️ 警告：此操作不可逆！执行前请确认！
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import readline from 'readline';

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

// 创建命令行界面
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 询问用户确认
function askConfirmation(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function cleanupUsers() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║        清理用户 - 只保留超级管理员            ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  try {
    // 1. 检查当前用户情况
    console.log('📊 正在检查当前用户...\n');
    
    const [allUsers] = await pool.query(
      'SELECT id, username, name, role, created_at FROM users ORDER BY created_at'
    );
    
    console.log(`当前系统中共有 ${allUsers.length} 个用户：\n`);
    
    // 分类显示
    const superAdmins = allUsers.filter(u => 
      u.role === 'superadmin' || u.role === 'super_admin'
    );
    const normalUsers = allUsers.filter(u => 
      u.role !== 'superadmin' && u.role !== 'super_admin'
    );
    
    console.log('✅ 超级管理员（将保留）:');
    superAdmins.forEach(u => {
      console.log(`   - ID: ${u.id}, 用户名: ${u.username}, 姓名: ${u.name || '-'}, 角色: ${u.role}`);
    });
    
    console.log('\n❌ 普通用户（将被删除）:');
    if (normalUsers.length === 0) {
      console.log('   （无）');
    } else {
      normalUsers.forEach(u => {
        console.log(`   - ID: ${u.id}, 用户名: ${u.username}, 姓名: ${u.name || '-'}, 角色: ${u.role}`);
      });
    }
    
    console.log('\n' + '═'.repeat(50));
    console.log(`总计: 保留 ${superAdmins.length} 个, 删除 ${normalUsers.length} 个`);
    console.log('═'.repeat(50) + '\n');
    
    // 2. 如果没有超级管理员，警告并退出
    if (superAdmins.length === 0) {
      console.log('❌ 错误：系统中没有超级管理员！');
      console.log('   为了安全，操作已取消。\n');
      return;
    }
    
    // 3. 如果没有普通用户，提示并退出
    if (normalUsers.length === 0) {
      console.log('✅ 系统中只有超级管理员，无需清理。\n');
      return;
    }
    
    // 4. 要求确认
    console.log('⚠️  警告：此操作将永久删除以上列出的普通用户及其相关数据！');
    console.log('⚠️  警告：此操作不可逆！\n');
    
    const confirmed = await askConfirmation('确定要继续吗？(yes/no): ');
    
    if (!confirmed) {
      console.log('\n❌ 操作已取消。\n');
      return;
    }
    
    // 5. 再次确认
    const doubleConfirmed = await askConfirmation('\n最后确认：真的要删除这些用户吗？(yes/no): ');
    
    if (!doubleConfirmed) {
      console.log('\n❌ 操作已取消。\n');
      return;
    }
    
    // 6. 执行删除
    console.log('\n🔄 正在删除普通用户...\n');
    
    const userIdsToDelete = normalUsers.map(u => u.id);
    
    // 使用事务确保数据一致性
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 删除相关数据
      console.log('   - 删除用户会话...');
      await connection.query(
        'DELETE FROM user_sessions WHERE user_id IN (?)',
        [userIdsToDelete]
      );
      
      console.log('   - 删除用户提醒设置...');
      await connection.query(
        'DELETE FROM user_reminder_settings WHERE user_id IN (?)',
        [userIdsToDelete]
      );
      
      console.log('   - 删除密码重置令牌...');
      await connection.query(
        'DELETE FROM password_reset_tokens WHERE user_id IN (?)',
        [userIdsToDelete]
      );
      
      console.log('   - 删除撤销的令牌...');
      await connection.query(
        'DELETE FROM revoked_tokens WHERE user_id IN (?)',
        [userIdsToDelete]
      );
      
      // 删除用户记录
      console.log('   - 删除用户账号...');
      const [deleteResult] = await connection.query(
        'DELETE FROM users WHERE id IN (?) AND role NOT IN (?, ?)',
        [userIdsToDelete, 'superadmin', 'super_admin']
      );
      
      await connection.commit();
      
      console.log('\n✅ 删除完成！');
      console.log(`   共删除 ${deleteResult.affectedRows} 个用户账号\n`);
      
      // 7. 显示最终结果
      const [remainingUsers] = await connection.query(
        'SELECT id, username, name, role FROM users ORDER BY id'
      );
      
      console.log('📊 当前剩余用户：\n');
      remainingUsers.forEach(u => {
        console.log(`   ✓ ID: ${u.id}, 用户名: ${u.username}, 姓名: ${u.name || '-'}, 角色: ${u.role}`);
      });
      console.log('');
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('\n❌ 操作失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    rl.close();
    await pool.end();
  }
}

// 执行清理
cleanupUsers();


