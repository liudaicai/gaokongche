import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function runMigration() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB || 'gaokongche',
    multipleStatements: true
  });

  try {
    console.log('🔄 开始执行迁移...\n');

    // 检查列是否已存在
    const [entryCols] = await pool.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'order_entries' AND COLUMN_NAME = 'equipment_count'
    `, [process.env.MYSQL_DB || 'gaokongche']);

    if (entryCols.length === 0) {
      console.log('📝 添加 equipment_count 列到 order_entries 表...');
      await pool.query(`
        ALTER TABLE order_entries 
        ADD COLUMN equipment_count INT NOT NULL DEFAULT 1 COMMENT '进场设备数量'
      `);
      console.log('✅ order_entries 表 equipment_count 列添加成功');
    } else {
      console.log('✅ order_entries 表 equipment_count 列已存在');
    }

    const [exitCols] = await pool.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'order_exits' AND COLUMN_NAME = 'equipment_count'
    `, [process.env.MYSQL_DB || 'gaokongche']);

    if (exitCols.length === 0) {
      console.log('📝 添加 equipment_count 列到 order_exits 表...');
      await pool.query(`
        ALTER TABLE order_exits 
        ADD COLUMN equipment_count INT NOT NULL DEFAULT 1 COMMENT '退场设备数量'
      `);
      console.log('✅ order_exits 表 equipment_count 列添加成功');
    } else {
      console.log('✅ order_exits 表 equipment_count 列已存在');
    }

    // 回填已有记录的 equipment_count 值
    console.log('\n🔄 回填已有记录的 equipment_count 值...');

    // 获取所有进场记录
    const [entries] = await pool.query('SELECT id, attachments_json FROM order_entries');
    let entryUpdated = 0;
    for (const entry of entries) {
      let count = 1;
      try {
        const json = typeof entry.attachments_json === 'string' 
          ? JSON.parse(entry.attachments_json) 
          : entry.attachments_json;
        if (json && Array.isArray(json.equipmentCodes)) {
          count = json.equipmentCodes.length || 1;
        }
      } catch (e) {
        // 解析失败使用默认值1
      }
      await pool.query('UPDATE order_entries SET equipment_count = ? WHERE id = ?', [count, entry.id]);
      entryUpdated++;
    }
    console.log(`✅ 更新了 ${entryUpdated} 条进场记录的 equipment_count`);

    // 获取所有退场记录
    const [exits] = await pool.query('SELECT id, attachments_json FROM order_exits');
    let exitUpdated = 0;
    for (const exit of exits) {
      let count = 1;
      try {
        const json = typeof exit.attachments_json === 'string' 
          ? JSON.parse(exit.attachments_json) 
          : exit.attachments_json;
        if (json && Array.isArray(json.equipmentCodes)) {
          count = json.equipmentCodes.length || 1;
        }
      } catch (e) {
        // 解析失败使用默认值1
      }
      await pool.query('UPDATE order_exits SET equipment_count = ? WHERE id = ?', [count, exit.id]);
      exitUpdated++;
    }
    console.log(`✅ 更新了 ${exitUpdated} 条退场记录的 equipment_count`);

    // 验证结果
    console.log('\n📊 验证结果:');
    const [entryStats] = await pool.query(`
      SELECT COUNT(*) as total_records, SUM(equipment_count) as total_equipment_count 
      FROM order_entries
    `);
    const [exitStats] = await pool.query(`
      SELECT COUNT(*) as total_records, SUM(equipment_count) as total_equipment_count 
      FROM order_exits
    `);

    console.log(`   order_entries: ${entryStats[0].total_records} 条记录, 共 ${entryStats[0].total_equipment_count || 0} 台设备`);
    console.log(`   order_exits: ${exitStats[0].total_records} 条记录, 共 ${exitStats[0].total_equipment_count || 0} 台设备`);

    console.log('\n✅ 迁移完成!');
  } catch (err) {
    console.error('❌ 迁移失败:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
