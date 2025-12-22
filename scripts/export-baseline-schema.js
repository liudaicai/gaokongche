/**
 * Export Baseline Schema
 * 导出当前开发环境的完整数据库结构（无数据）
 * 用于新租户的快速初始化
 */

import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DB || 'gaokongche',
};

async function exportBaselineSchema() {
  console.log('🚀 开始导出 Baseline Schema...\n');
  console.log(`数据库: ${config.host}:${config.port}/${config.database}`);
  
  const connection = await mysql.createConnection(config);
  
  try {
    // 1. 获取所有表名
    console.log('\n📋 获取表列表...');
    const [tables] = await connection.query(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = "BASE TABLE" ORDER BY TABLE_NAME',
      [config.database]
    );
    
    console.log(`找到 ${tables.length} 个表`);
    
    let sqlOutput = [];
    
    // 添加文件头注释
    sqlOutput.push('-- ============================================');
    sqlOutput.push('-- Baseline Schema for Gaokongche System');
    sqlOutput.push(`-- Generated: ${new Date().toISOString()}`);
    sqlOutput.push(`-- Source Database: ${config.database}`);
    sqlOutput.push('-- Purpose: Fast initialization for new tenants');
    sqlOutput.push('-- ============================================\n');
    
    sqlOutput.push('SET NAMES utf8mb4;');
    sqlOutput.push('SET FOREIGN_KEY_CHECKS = 0;\n');
    
    // 2. 导出每个表的创建语句
    for (const { TABLE_NAME } of tables) {
      console.log(`  - ${TABLE_NAME}`);
      
      const [[createTableResult]] = await connection.query(`SHOW CREATE TABLE \`${TABLE_NAME}\``);
      let createTableSql = createTableResult['Create Table'];
      
      // 清理创建语句
      // 移除 AUTO_INCREMENT 的当前值（让每个租户从1开始）
      createTableSql = createTableSql.replace(/AUTO_INCREMENT=\d+\s*/gi, '');
      
      sqlOutput.push(`-- Table: ${TABLE_NAME}`);
      sqlOutput.push(`DROP TABLE IF EXISTS \`${TABLE_NAME}\`;`);
      sqlOutput.push(createTableSql + ';\n');
    }
    
    // 3. 导出视图
    console.log('\n📋 获取视图列表...');
    const [views] = await connection.query(
      'SELECT TABLE_NAME FROM information_schema.VIEWS WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
      [config.database]
    );
    
    if (views.length > 0) {
      console.log(`找到 ${views.length} 个视图`);
      sqlOutput.push('\n-- ============================================');
      sqlOutput.push('-- Views');
      sqlOutput.push('-- ============================================\n');
      
      for (const { TABLE_NAME } of views) {
        console.log(`  - ${TABLE_NAME}`);
        try {
          const [[createViewResult]] = await connection.query(`SHOW CREATE VIEW \`${TABLE_NAME}\``);
          let createViewSql = createViewResult['Create View'];
          
          // 提取 CREATE VIEW 部分（去掉 ALGORITHM 等前缀）
          const match = createViewSql.match(/CREATE.*?VIEW\s+`[^`]+`\s+AS\s+(.+)/is);
          if (match) {
            sqlOutput.push(`-- View: ${TABLE_NAME}`);
            sqlOutput.push(`DROP VIEW IF EXISTS \`${TABLE_NAME}\`;`);
            sqlOutput.push(`CREATE VIEW \`${TABLE_NAME}\` AS ${match[1]};\n`);
          }
        } catch (err) {
          console.warn(`  ⚠️  跳过视图 ${TABLE_NAME}: ${err.message}`);
        }
      }
    }
    
    sqlOutput.push('SET FOREIGN_KEY_CHECKS = 1;');
    sqlOutput.push('\n-- ============================================');
    sqlOutput.push('-- Baseline Schema Export Complete');
    sqlOutput.push('-- ============================================');
    
    // 4. 写入文件
    const outputPath = path.resolve(__dirname, '../sql/mysql/baseline_v1.0.sql');
    await fs.writeFile(outputPath, sqlOutput.join('\n'), 'utf8');
    
    console.log(`\n✅ Schema 导出成功！`);
    console.log(`📁 文件位置: ${outputPath}`);
    console.log(`📊 总表数: ${tables.length}`);
    console.log(`📊 总视图数: ${views.length}`);
    console.log(`📦 文件大小: ${(sqlOutput.join('\n').length / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error('❌ 导出失败:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// 执行导出
exportBaselineSchema().catch(console.error);
