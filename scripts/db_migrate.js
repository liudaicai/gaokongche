/**
 * 数据库迁移工具
 * 
 * 用途：自动执行数据库迁移脚本
 * 使用方法：node scripts/db_migrate.js
 */

import dotenv from 'dotenv';
dotenv.config();

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '../sql/mysql');

async function main() {
  console.log('========================================');
  console.log('  数据库迁移工具');
  console.log('========================================\n');

  try {
    // 连接数据库
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DB || 'gaokongche',
      multipleStatements: true, // 允许执行多条SQL语句
    });

    console.log('✅ 数据库连接成功');
    console.log(`📂 迁移目录: ${MIGRATIONS_DIR}\n`);

    // 创建迁移记录表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INT NOT NULL AUTO_INCREMENT,
        filename VARCHAR(255) NOT NULL,
        executed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        UNIQUE KEY uniq_filename (filename)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('✅ 迁移记录表已准备\n');

    // 获取已执行的迁移
    const [executedMigrations] = await connection.query(
      'SELECT filename FROM _migrations ORDER BY id'
    );
    // MySQL 的 VARCHAR 在比较时可能忽略尾部空格，导致：
    // - JS Set 认为不同（带空格 vs 不带空格）
    // - UNIQUE KEY 认为相同（插入时报 Duplicate entry）
    // 因此统一 trim 再比较。
    const executedFiles = new Set(executedMigrations.map(row => String(row.filename).trim()));

    console.log(`📋 已执行的迁移: ${executedFiles.size} 个\n`);

    // 读取迁移文件
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort(); // 按文件名排序

    // 支持只执行指定迁移文件（用于紧急修复/定向补丁）
    // 用法：node scripts/db_migrate.js --only 072_add_part_name.sql
    const onlyArgIndex = process.argv.indexOf('--only');
    const onlyFilename = onlyArgIndex >= 0 ? process.argv[onlyArgIndex + 1] : null;

    let pendingMigrations = files.filter(f => !executedFiles.has(String(f).trim()));

    if (onlyFilename) {
      const normalizedOnly = String(onlyFilename).trim();
      if (!files.includes(normalizedOnly)) {
        console.error(`❌ 指定的迁移文件不存在: ${normalizedOnly}`);
        console.error('提示：请确认文件位于 sql/mysql/ 目录下，并且文件名完全一致。');
        process.exit(1);
      }

      if (executedFiles.has(normalizedOnly)) {
        console.log(`✅ 指定迁移已执行过，跳过：${normalizedOnly}`);
        await connection.end();
        return;
      }

      pendingMigrations = [normalizedOnly];
      console.log(`🎯 仅执行指定迁移: ${normalizedOnly}\n`);
    }

    if (pendingMigrations.length === 0) {
      console.log('✅ 没有待执行的迁移');
      await connection.end();
      return;
    }

    console.log(`📝 待执行的迁移: ${pendingMigrations.length} 个\n`);

    // 执行迁移
    for (const filename of pendingMigrations) {
      const normalizedFilename = String(filename).trim();
      console.log(`⏳ 执行迁移: ${normalizedFilename}`);
      
      const filePath = path.join(MIGRATIONS_DIR, normalizedFilename);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        // 执行迁移 SQL
        await connection.query(sql);

        // 记录迁移
        await connection.query(
          'INSERT IGNORE INTO _migrations (filename) VALUES (?)',
          [normalizedFilename]
        );

        console.log(`   ✅ ${normalizedFilename} 执行成功\n`);
      } catch (error) {
        console.error(`   ❌ ${normalizedFilename} 执行失败:`);
        console.error(`   ${error.message}\n`);
        
        // 判断是否是可容忍的错误
        const tolerableErrors = [
          'Duplicate entry',         // 迁移记录重复（通常是尾部空格/重复执行导致）
          'Duplicate key name',      // 索引已存在
          'Duplicate column name',   // 字段已存在
          'Duplicate foreign key constraint name', // 外键约束名已存在
          "check that column/key exists",          // DROP 不存在的列/索引/外键
          'already exists',          // 其他已存在错误
        ];
        
        const isTolerableError = tolerableErrors.some(msg => 
          error.message.includes(msg)
        );
        
        if (isTolerableError || normalizedFilename.includes('schema.sql') || normalizedFilename.includes('004_')) {
          console.log('   提示：该错误可能是正常的（字段/索引已存在）');
          console.log('        继续执行其他迁移...\n');
          
          // 尝试记录迁移（即使部分失败）
          try {
            await connection.query(
              'INSERT IGNORE INTO _migrations (filename) VALUES (?)',
              [normalizedFilename]
            );
          } catch (e) {
            // 忽略记录错误
          }
        } else {
          throw error;
        }
      }
    }

    console.log('========================================');
    console.log('  ✅ 所有迁移执行完成！');
    console.log('========================================\n');

    // 显示数据库状态
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`📊 数据库表数量: ${tables.length}`);
    
    const [migrations] = await connection.query(
      'SELECT COUNT(*) as count FROM _migrations'
    );
    console.log(`📋 已执行迁移: ${migrations[0].count}\n`);

    await connection.end();

  } catch (error) {
    console.error('\n❌ 错误：', error.message);
    
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n提示：数据库不存在，请先创建数据库：');
      console.error(`  CREATE DATABASE ${process.env.MYSQL_DB || 'gaokongche'};`);
    } else if (error.code === 'EACCES') {
      console.error('\n提示：数据库访问被拒绝，请检查：');
      console.error('  1. MySQL 用户名和密码是否正确');
      console.error('  2. 用户是否有足够的权限');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n提示：无法连接到 MySQL 服务器，请检查：');
      console.error('  1. MySQL 服务是否运行');
      console.error('  2. 主机和端口配置是否正确');
    }
    
    process.exit(1);
  }
}

// 运行脚本
main().catch(error => {
  console.error('脚本执行失败：', error);
  process.exit(1);
});

