import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function updateSuspensionsTable() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DB || 'gaokongche',
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true
  });

  const conn = await pool.getConnection();
  
  try {
    await conn.beginTransaction();
    console.log('🔄 开始更新 order_suspensions 表结构...\n');

    // 检查字段是否存在
    const checkColumn = async (columnName) => {
      const [rows] = await conn.query(
        `SELECT COUNT(*) AS cnt 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'order_suspensions' AND COLUMN_NAME = ?`,
        [process.env.MYSQL_DB || 'gaokongche', columnName]
      );
      return rows[0].cnt > 0;
    };

    // 1. 添加 suspension_type
    if (!(await checkColumn('suspension_type'))) {
      await conn.query(
        `ALTER TABLE order_suspensions 
         ADD COLUMN suspension_type VARCHAR(50) NULL COMMENT '报停类型：weather, site_stop, maintenance, customer_request' AFTER equipment_id`
      );
      console.log('✅ 添加 suspension_type 字段');
    } else {
      console.log('ℹ️  suspension_type 字段已存在');
    }

    // 2. 处理 start_date（重命名 suspension_date 或添加新字段）
    if (!(await checkColumn('start_date'))) {
      if (await checkColumn('suspension_date')) {
        await conn.query(
          `ALTER TABLE order_suspensions 
           CHANGE COLUMN suspension_date start_date DATE NOT NULL COMMENT '报停开始日期'`
        );
        console.log('✅ 重命名 suspension_date 为 start_date');
      } else {
        await conn.query(
          `ALTER TABLE order_suspensions 
           ADD COLUMN start_date DATE NOT NULL COMMENT '报停开始日期' AFTER suspension_type`
        );
        console.log('✅ 添加 start_date 字段');
      }
    } else {
      console.log('ℹ️  start_date 字段已存在');
    }

    // 3. 处理 end_date（重命名 resume_date 或添加新字段）
    if (!(await checkColumn('end_date'))) {
      if (await checkColumn('resume_date')) {
        await conn.query(
          `ALTER TABLE order_suspensions 
           CHANGE COLUMN resume_date end_date DATE NULL COMMENT '报停结束日期（NULL表示未恢复）'`
        );
        console.log('✅ 重命名 resume_date 为 end_date');
      } else {
        await conn.query(
          `ALTER TABLE order_suspensions 
           ADD COLUMN end_date DATE NULL COMMENT '报停结束日期（NULL表示未恢复）' AFTER start_date`
        );
        console.log('✅ 添加 end_date 字段');
      }
    } else {
      console.log('ℹ️  end_date 字段已存在');
    }

    // 4. 添加 suspension_days
    if (!(await checkColumn('suspension_days'))) {
      await conn.query(
        `ALTER TABLE order_suspensions 
         ADD COLUMN suspension_days INT NULL COMMENT '报停天数' AFTER end_date`
      );
      console.log('✅ 添加 suspension_days 字段');
    } else {
      console.log('ℹ️  suspension_days 字段已存在');
    }

    // 5. 添加 is_charge_free
    if (!(await checkColumn('is_charge_free'))) {
      await conn.query(
        `ALTER TABLE order_suspensions 
         ADD COLUMN is_charge_free TINYINT(1) DEFAULT 1 COMMENT '是否免费（1=免费，0=照常计费）' AFTER suspension_days`
      );
      console.log('✅ 添加 is_charge_free 字段');
    } else {
      console.log('ℹ️  is_charge_free 字段已存在');
    }

    // 6. 添加 discount_rate
    if (!(await checkColumn('discount_rate'))) {
      await conn.query(
        `ALTER TABLE order_suspensions 
         ADD COLUMN discount_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT '折扣率（0-100，100表示免费）' AFTER is_charge_free`
      );
      console.log('✅ 添加 discount_rate 字段');
    } else {
      console.log('ℹ️  discount_rate 字段已存在');
    }

    // 7. 添加 status
    if (!(await checkColumn('status'))) {
      await conn.query(
        `ALTER TABLE order_suspensions 
         ADD COLUMN status VARCHAR(20) DEFAULT 'pending' COMMENT '状态：pending, approved, rejected, ended' AFTER discount_rate`
      );
      console.log('✅ 添加 status 字段');
    } else {
      console.log('ℹ️  status 字段已存在');
    }

    // 8. 处理 attachments（重命名 attachments_json 或添加新字段）
    if (!(await checkColumn('attachments'))) {
      if (await checkColumn('attachments_json')) {
        await conn.query(
          `ALTER TABLE order_suspensions 
           CHANGE COLUMN attachments_json attachments JSON NULL COMMENT '附件（证明文件）'`
        );
        console.log('✅ 重命名 attachments_json 为 attachments');
      } else {
        await conn.query(
          `ALTER TABLE order_suspensions 
           ADD COLUMN attachments JSON NULL COMMENT '附件（证明文件）' AFTER status`
        );
        console.log('✅ 添加 attachments 字段');
      }
    } else {
      console.log('ℹ️  attachments 字段已存在');
    }

    // 9. 添加 notes
    if (!(await checkColumn('notes'))) {
      await conn.query(
        `ALTER TABLE order_suspensions 
         ADD COLUMN notes TEXT NULL COMMENT '备注' AFTER attachments`
      );
      console.log('✅ 添加 notes 字段');
    } else {
      console.log('ℹ️  notes 字段已存在');
    }

    // 10. 添加 approved_by
    if (!(await checkColumn('approved_by'))) {
      await conn.query(
        `ALTER TABLE order_suspensions 
         ADD COLUMN approved_by INT NULL COMMENT '审批人ID' AFTER notes`
      );
      console.log('✅ 添加 approved_by 字段');
    } else {
      console.log('ℹ️  approved_by 字段已存在');
    }

    // 11. 添加 approved_at
    if (!(await checkColumn('approved_at'))) {
      await conn.query(
        `ALTER TABLE order_suspensions 
         ADD COLUMN approved_at DATETIME NULL COMMENT '审批时间' AFTER approved_by`
      );
      console.log('✅ 添加 approved_at 字段');
    } else {
      console.log('ℹ️  approved_at 字段已存在');
    }

    // 12. 添加 created_by
    if (!(await checkColumn('created_by'))) {
      await conn.query(
        `ALTER TABLE order_suspensions 
         ADD COLUMN created_by INT NULL COMMENT '创建人ID' AFTER approved_at`
      );
      console.log('✅ 添加 created_by 字段');
    } else {
      console.log('ℹ️  created_by 字段已存在');
    }

    // 添加索引
    try {
      await conn.query(`CREATE INDEX idx_order_suspensions_status ON order_suspensions(status)`);
      console.log('✅ 添加 status 索引');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  status 索引已存在');
      } else {
        throw e;
      }
    }

    try {
      await conn.query(`CREATE INDEX idx_order_suspensions_dates ON order_suspensions(start_date, end_date)`);
      console.log('✅ 添加 dates 索引');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  dates 索引已存在');
      } else {
        throw e;
      }
    }

    await conn.commit();
    console.log('\n✅ 表结构更新完成！');
    
  } catch (error) {
    await conn.rollback();
    console.error('❌ 更新失败:', error);
    throw error;
  } finally {
    conn.release();
    await pool.end();
  }
}

updateSuspensionsTable().catch(console.error);

