#!/usr/bin/env node
/**
 * 从超级管理员数据库导出最新Schema到baseline文件（纯Node.js版本）
 * 
 * 使用方法：
 *   node scripts/export-master-schema.mjs
 * 
 * 功能：
 *   - 从 gaokongche_tenant_1 导出完整schema（不含数据）
 *   - 不依赖 mysqldump，使用纯 Node.js 实现
 *   - 自动清理和格式化输出
 *   - 保存到 sql/mysql/baseline_v1.0.sql
 */

import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env') });

// 配置
// 注意：如果没有 tenant_1，可以使用其他租户数据库作为基准
const MASTER_DB = process.env.SCHEMA_MASTER_DB || 'gaokongche_tenant_1';  // 基准数据库
const OUTPUT_FILE = path.join(__dirname, '../sql/mysql/baseline_v1.0.sql');

// MySQL连接配置
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root',
  database: MASTER_DB
};

async function checkMasterDatabase(conn) {
  console.log('🔍 检查超管数据库...');
  
  try {
    const [rows] = await conn.query(
      `SELECT COUNT(*) as table_count 
       FROM information_schema.tables 
       WHERE table_schema = ?`,
      [MASTER_DB]
    );
    
    const tableCount = rows[0].table_count;
    console.log(`✅ 超管数据库连接正常 (${tableCount} 张表)\n`);
    return true;
  } catch (err) {
    console.error('❌ 超管数据库检查失败:', err.message);
    console.error('\n提示：');
    console.error('  1. 确保MySQL服务正在运行');
    console.error(`  2. 确保数据库 ${MASTER_DB} 存在`);
    console.error('  3. 检查 .env 文件中的MySQL连接配置');
    return false;
  }
}

async function getTableCreateStatement(conn, tableName) {
  const [rows] = await conn.query(`SHOW CREATE TABLE \`${tableName}\``);
  return rows[0]['Create Table'];
}

async function getTriggers(conn, tableName) {
  const [rows] = await conn.query(
    `SHOW TRIGGERS WHERE \`Table\` = ?`,
    [tableName]
  );
  
  const triggers = [];
  for (const trigger of rows) {
    const [createRows] = await conn.query(
      `SHOW CREATE TRIGGER \`${trigger.Trigger}\``
    );
    if (createRows.length > 0) {
      triggers.push(createRows[0]['SQL Original Statement']);
    }
  }
  
  return triggers;
}

async function exportMasterSchema() {
  console.log('📦 开始导出Schema...');
  console.log(`   源数据库: ${MASTER_DB}`);
  console.log(`   目标文件: ${OUTPUT_FILE}`);
  console.log('');

  let conn;
  
  try {
    // 连接数据库
    conn = await mysql.createConnection(MYSQL_CONFIG);
    
    // 获取所有表
    const [tables] = await conn.query(
      `SELECT TABLE_NAME 
       FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`,
      [MASTER_DB]
    );
    
    if (tables.length === 0) {
      throw new Error(`数据库 ${MASTER_DB} 中没有表`);
    }
    
    console.log(`📊 找到 ${tables.length} 张表，开始导出...`);
    
    // 构建文件头
    const header = `-- ============================================
-- 高空车租赁系统 Baseline Schema (自动生成)
-- ============================================
-- 
-- 源数据库: ${MASTER_DB}
-- 导出时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
-- 字符集: utf8mb4
-- 排序规则: utf8mb4_unicode_ci
-- 
-- 📝 注意事项：
--   1. 此文件由脚本自动生成，请勿手动编辑
--   2. 如需修改表结构，请在超管数据库操作后重新导出
--   3. 使用命令: npm run schema:export
-- 
-- 🎯 用途：
--   - 新租户数据库的初始化模板
--   - 确保所有租户schema一致性
--   - Git版本控制和差异对比
-- 
-- ============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

`;
    
    let schema = header;
    let processedCount = 0;
    let triggerCount = 0;
    
    // 逐表导出
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      processedCount++;
      
      // 显示进度
      if (processedCount % 5 === 0 || processedCount === tables.length) {
        console.log(`   进度: ${processedCount}/${tables.length} (${tableName})`);
      }
      
      // 添加表注释
      schema += `-- ----------------------------\n`;
      schema += `-- Table: ${tableName}\n`;
      schema += `-- ----------------------------\n`;
      
      // 获取建表语句
      const createStatement = await getTableCreateStatement(conn, tableName);
      schema += createStatement + ';\n\n';
      
      // 获取触发器（如果有）
      const triggers = await getTriggers(conn, tableName);
      if (triggers.length > 0) {
        schema += `-- Triggers for ${tableName}\n`;
        for (const trigger of triggers) {
          schema += trigger + ';\n';
          triggerCount++;
        }
        schema += '\n';
      }
    }
    
    // 文件尾
    schema += `SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- 导出完成
-- 总表数: ${tables.length}
-- 总触发器数: ${triggerCount}
-- ============================================
`;
    
    // 确保输出目录存在
    const outputDir = path.dirname(OUTPUT_FILE);
    await fs.mkdir(outputDir, { recursive: true });
    
    // 保存到文件
    await fs.writeFile(OUTPUT_FILE, schema, 'utf8');
    
    console.log('\n✅ Schema导出成功！');
    
    // 统计信息
    const stats = await fs.stat(OUTPUT_FILE);
    const sizeKB = (stats.size / 1024).toFixed(2);
    
    console.log('\n📊 导出统计：');
    console.log(`   ✓ 表 (Tables):      ${tables.length}`);
    if (triggerCount > 0) {
      console.log(`   ✓ 触发器 (Triggers):  ${triggerCount}`);
    }
    console.log(`   ✓ 文件大小:         ${sizeKB} KB`);
    
    console.log('\n💡 下一步：');
    console.log('   1. 查看生成的文件: code sql/mysql/baseline_v1.0.sql');
    console.log('   2. 提交到Git: git add sql/mysql/baseline_v1.0.sql');
    console.log('   3. 验证租户: npm run schema:verify');
    
    return { 
      ok: true, 
      tables: tables.length,
      triggers: triggerCount,
      fileSizeKB: sizeKB 
    };
  } catch (err) {
    console.error('\n❌ 导出失败:', err.message);
    
    // 提供诊断信息
    if (err.code === 'ECONNREFUSED') {
      console.error('\n❌ 错误原因: 无法连接到MySQL服务器');
      console.error('\n解决方法：');
      console.error('  1. 确保MySQL服务正在运行');
      console.error('  2. 检查 .env 文件中的连接配置');
      console.error(`  3. 尝试: mysql -h ${MYSQL_CONFIG.host} -P ${MYSQL_CONFIG.port} -u ${MYSQL_CONFIG.user} -p`);
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n❌ 错误原因: 数据库访问被拒绝');
      console.error('\n解决方法：');
      console.error('  1. 检查MySQL用户名和密码');
      console.error('  2. 确保用户有读取权限');
    } else if (err.code === 'ER_BAD_DB_ERROR') {
      console.error('\n❌ 错误原因: 数据库不存在');
      console.error('\n解决方法：');
      console.error(`  1. 确保数据库 ${MASTER_DB} 存在`);
      console.error('  2. 创建数据库: CREATE DATABASE gaokongche_tenant_1;');
    }
    
    throw err;
  } finally {
    if (conn) await conn.end();
  }
}

// 主函数
async function main() {
  console.log('═'.repeat(60));
  console.log('📦 超管数据库Schema导出工具 (纯Node.js版本)');
  console.log('═'.repeat(60));
  console.log('');
  
  let conn;
  
  try {
    // 连接数据库检查
    conn = await mysql.createConnection(MYSQL_CONFIG);
    const dbOk = await checkMasterDatabase(conn);
    await conn.end();
    
    if (!dbOk) {
      process.exit(1);
    }
    
    // 导出schema
    const result = await exportMasterSchema();
    
    console.log('');
    console.log('═'.repeat(60));
    console.log('✅ 导出完成！');
    console.log('═'.repeat(60));
    
    process.exit(0);
  } catch (err) {
    console.error('');
    console.error('═'.repeat(60));
    console.error('❌ 导出失败');
    console.error('═'.repeat(60));
    console.error('');
    console.error('错误详情:', err.message);
    if (err.stack) {
      console.error('\n堆栈跟踪:');
      console.error(err.stack);
    }
    process.exit(1);
  } finally {
    if (conn) {
      try {
        await conn.end();
      } catch (e) {
        // ignore
      }
    }
  }
}

// 执行
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});

export { exportMasterSchema, checkMasterDatabase };
