#!/usr/bin/env node
/**
 * 清除公司管理数据
 * ⚠️  警告：此操作将删除主数据库中的公司管理数据
 * 
 * 操作内容：
 * 1. 备份当前 companies 表数据
 * 2. 清空 companies 表（保留表结构）
 * 3. 更新 users 表，移除 company_id 关联
 * 4. 不影响租户数据库
 */

import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root',
  database: 'gaokongche'  // 主数据库
};

async function clearCompanyManagement() {
  let conn;
  
  try {
    console.log('═'.repeat(60));
    console.log('🗑️  清除公司管理数据');
    console.log('═'.repeat(60));
    console.log('');
    
    conn = await mysql.createConnection(MYSQL_CONFIG);
    
    // 1. 检查当前数据
    console.log('📊 检查当前数据...\n');
    
    const [companies] = await conn.query('SELECT COUNT(*) as cnt FROM companies');
    const [users] = await conn.query('SELECT COUNT(*) as cnt FROM users WHERE company_id IS NOT NULL');
    
    console.log(`  公司数量: ${companies[0].cnt}`);
    console.log(`  关联用户: ${users[0].cnt}`);
    console.log('');
    
    if (companies[0].cnt === 0) {
      console.log('✅ companies 表已经是空的，无需清除');
      return;
    }
    
    // 2. 备份数据
    console.log('💾 备份当前数据...\n');
    
    const [companiesData] = await conn.query('SELECT * FROM companies');
    const backupFile = path.join(__dirname, `../backups/companies_backup_${Date.now()}.json`);
    
    await fs.mkdir(path.join(__dirname, '../backups'), { recursive: true });
    await fs.writeFile(
      backupFile,
      JSON.stringify(companiesData, null, 2),
      'utf8'
    );
    
    console.log(`  ✓ 已备份到: ${backupFile}`);
    console.log('');
    
    // 3. 确认操作
    console.log('⚠️  警告：即将执行以下操作：');
    console.log('  1. 清空 gaokongche.companies 表');
    console.log('  2. 更新 gaokongche.users 表，移除 company_id');
    console.log('  3. 不影响租户数据库（gaokongche_tenant_X）');
    console.log('');
    
    // 自动确认（如果需要手动确认，可以添加交互式输入）
    console.log('⏳ 开始执行清理...\n');
    
    // 4. 开始事务
    await conn.beginTransaction();
    
    try {
      // 4.1 更新 users 表，移除 company_id
      console.log('  1️⃣ 更新 users 表...');
      const [updateResult] = await conn.query(
        'UPDATE users SET company_id = NULL WHERE company_id IS NOT NULL'
      );
      console.log(`     ✓ 已更新 ${updateResult.affectedRows} 个用户\n`);
      
      // 4.2 清空 companies 表
      console.log('  2️⃣ 清空 companies 表...');
      const [deleteResult] = await conn.query('DELETE FROM companies');
      console.log(`     ✓ 已删除 ${deleteResult.affectedRows} 条记录\n`);
      
      // 4.3 重置自增ID（可选）
      console.log('  3️⃣ 重置自增ID...');
      await conn.query('ALTER TABLE companies AUTO_INCREMENT = 1');
      console.log('     ✓ 已重置\n');
      
      // 提交事务
      await conn.commit();
      
      console.log('✅ 清理完成！\n');
      
      // 5. 验证结果
      console.log('🔍 验证结果...\n');
      
      const [newCompanies] = await conn.query('SELECT COUNT(*) as cnt FROM companies');
      const [newUsers] = await conn.query('SELECT COUNT(*) as cnt FROM users WHERE company_id IS NOT NULL');
      
      console.log(`  公司数量: ${newCompanies[0].cnt} (应为 0)`);
      console.log(`  关联用户: ${newUsers[0].cnt} (应为 0)`);
      console.log('');
      
      if (newCompanies[0].cnt === 0 && newUsers[0].cnt === 0) {
        console.log('✅ 验证通过！');
      } else {
        console.log('⚠️  验证失败，请检查数据');
      }
      
    } catch (err) {
      // 回滚事务
      await conn.rollback();
      throw err;
    }
    
    console.log('');
    console.log('═'.repeat(60));
    console.log('📝 后续操作建议：');
    console.log('═'.repeat(60));
    console.log('');
    console.log('1. 前端：移除公司管理相关的菜单项（如果需要）');
    console.log('2. 后端：保留 API 路由（供未来使用）');
    console.log('3. 数据库：companies 表结构保留（供租户使用）');
    console.log('4. 备份：已保存到 backups/ 目录');
    console.log('');
    
  } catch (err) {
    console.error('\n❌ 清理失败:', err.message);
    console.error('\n错误详情:');
    console.error(err);
    
    if (err.code === 'ECONNREFUSED') {
      console.error('\n💡 提示：');
      console.error('  1. 确保 MySQL 服务正在运行');
      console.error('  2. 检查 .env 文件中的数据库配置');
    }
    
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

// 主函数
async function main() {
  try {
    await clearCompanyManagement();
    process.exit(0);
  } catch (err) {
    console.error('Unhandled error:', err);
    process.exit(1);
  }
}

main();
