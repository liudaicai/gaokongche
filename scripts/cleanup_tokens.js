/**
 * 清理过期 Token 脚本
 * 
 * 用途：清理过期的会话、revoked tokens、密码重置令牌等
 * 使用方法：node scripts/cleanup_tokens.js
 * 建议：配置定时任务每天执行一次
 */

import dotenv from 'dotenv';
dotenv.config();

import mysql from 'mysql2/promise';

async function main() {
  console.log('========================================');
  console.log('  清理过期 Token');
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

    // 调用存储过程清理
    console.log('⏳ 执行清理操作...\n');
    
    const [result] = await connection.query('CALL sp_cleanup_expired_tokens()');
    
    console.log('📊 清理统计：\n');
    
    // 清理过期的 revoked tokens（保留30天）
    const [revokedResult] = await connection.query(
      'DELETE FROM revoked_tokens WHERE expires_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );
    console.log(`  • Revoked Tokens: ${revokedResult.affectedRows} 条`);
    
    // 清理过期的会话（保留30天）
    const [sessionsResult] = await connection.query(
      'DELETE FROM user_sessions WHERE expires_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );
    console.log(`  • User Sessions: ${sessionsResult.affectedRows} 条`);
    
    // 清理已使用的密码重置令牌（保留7天）
    const [usedTokensResult] = await connection.query(
      'DELETE FROM password_reset_tokens WHERE used_at IS NOT NULL AND used_at < DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );
    console.log(`  • Used Reset Tokens: ${usedTokensResult.affectedRows} 条`);
    
    // 清理过期未使用的密码重置令牌
    const [expiredTokensResult] = await connection.query(
      'DELETE FROM password_reset_tokens WHERE used_at IS NULL AND expires_at < NOW()'
    );
    console.log(`  • Expired Reset Tokens: ${expiredTokensResult.affectedRows} 条`);
    
    // 清理旧的审计日志（保留90天，可选）
    const cleanupAudit = process.env.CLEANUP_AUDIT_LOGS === 'true';
    if (cleanupAudit) {
      const [auditResult] = await connection.query(
        'DELETE FROM audit_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)'
      );
      console.log(`  • Old Audit Logs: ${auditResult.affectedRows} 条`);
    }

    const totalDeleted = 
      revokedResult.affectedRows + 
      sessionsResult.affectedRows + 
      usedTokensResult.affectedRows + 
      expiredTokensResult.affectedRows;

    console.log(`\n  📈 总计清理: ${totalDeleted} 条记录\n`);

    // 显示当前状态
    const [stats] = await connection.query(`
      SELECT 
        (SELECT COUNT(*) FROM revoked_tokens) as revoked_tokens,
        (SELECT COUNT(*) FROM user_sessions WHERE expires_at > NOW()) as active_sessions,
        (SELECT COUNT(*) FROM password_reset_tokens WHERE used_at IS NULL AND expires_at > NOW()) as pending_resets,
        (SELECT COUNT(*) FROM users WHERE is_active = 1) as active_users
    `);

    console.log('📊 当前数据库状态：\n');
    console.log(`  • 活跃用户: ${stats[0].active_users}`);
    console.log(`  • 活跃会话: ${stats[0].active_sessions}`);
    console.log(`  • Revoked Tokens: ${stats[0].revoked_tokens}`);
    console.log(`  • 待处理密码重置: ${stats[0].pending_resets}\n`);

    console.log('========================================');
    console.log('  ✅ 清理完成！');
    console.log('========================================\n');

    await connection.end();

  } catch (error) {
    console.error('\n❌ 错误：', error.message);
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error('\n提示：请先运行数据库迁移');
      console.error('  npm run db:migrate');
    }
    
    process.exit(1);
  }
}

// 运行脚本
main().catch(error => {
  console.error('脚本执行失败：', error);
  process.exit(1);
});

