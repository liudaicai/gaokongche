import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DB || 'gaokongche',
  waitForConnections: true,
  connectionLimit: 10,
});

async function createTables() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🚀 开始创建自动化系统表...\n');

    // 1. 账单表
    console.log('📋 创建账单表 (billings)...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS billings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        billing_number VARCHAR(50) UNIQUE NOT NULL COMMENT '账单编号',
        order_id INT NOT NULL COMMENT '订单ID',
        customer_id INT NOT NULL COMMENT '客户ID',
        billing_type VARCHAR(50) DEFAULT 'monthly' COMMENT '账单类型: initial, monthly, final, adjustment',
        period_start DATE COMMENT '账期开始',
        period_end DATE COMMENT '账期结束',
        
        -- 费用明细
        rental_fee DECIMAL(10,2) DEFAULT 0 COMMENT '租金',
        deposit DECIMAL(10,2) DEFAULT 0 COMMENT '押金',
        shipping_fee DECIMAL(10,2) DEFAULT 0 COMMENT '运费',
        modification_fee DECIMAL(10,2) DEFAULT 0 COMMENT '改装费',
        late_fee DECIMAL(10,2) DEFAULT 0 COMMENT '滞纳金',
        adjustment DECIMAL(10,2) DEFAULT 0 COMMENT '调整金额',
        total_amount DECIMAL(10,2) NOT NULL COMMENT '总金额',
        paid_amount DECIMAL(10,2) DEFAULT 0 COMMENT '已付金额',
        
        status VARCHAR(20) DEFAULT 'unpaid' COMMENT '状态: unpaid, partial, paid, overdue, cancelled',
        due_date DATE NOT NULL COMMENT '到期日期',
        paid_date DATE COMMENT '支付日期',
        overdue_days INT DEFAULT 0 COMMENT '逾期天数',
        
        remark TEXT COMMENT '备注',
        attachments JSON COMMENT '附件',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        INDEX idx_order (order_id),
        INDEX idx_customer (customer_id),
        INDEX idx_status (status),
        INDEX idx_due_date (due_date),
        INDEX idx_billing_number (billing_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='账单表';
    `);
    console.log('✅ 账单表创建成功\n');

    // 2. 任务执行日志表
    console.log('📋 创建任务执行日志表 (task_logs)...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS task_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        task_name VARCHAR(100) NOT NULL COMMENT '任务名称',
        task_type VARCHAR(50) NOT NULL COMMENT '任务类型: scheduled, manual, triggered',
        status VARCHAR(20) NOT NULL COMMENT '状态: success, failed, partial',
        start_time DATETIME NOT NULL COMMENT '开始时间',
        end_time DATETIME COMMENT '结束时间',
        duration_ms INT COMMENT '执行时长(毫秒)',
        processed_count INT DEFAULT 0 COMMENT '处理数量',
        success_count INT DEFAULT 0 COMMENT '成功数量',
        failed_count INT DEFAULT 0 COMMENT '失败数量',
        error_message TEXT COMMENT '错误信息',
        details JSON COMMENT '详细信息',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_task_name (task_name),
        INDEX idx_start_time (start_time),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务执行日志表';
    `);
    console.log('✅ 任务执行日志表创建成功\n');

    // 3. 通知记录表
    console.log('📋 创建通知记录表 (notification_logs)...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notification_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        notification_type VARCHAR(50) NOT NULL COMMENT '通知类型: in_app, email, sms, wechat',
        recipient VARCHAR(255) NOT NULL COMMENT '收件人',
        title VARCHAR(255) COMMENT '标题',
        content TEXT COMMENT '内容',
        status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending, sent, failed',
        sent_at DATETIME COMMENT '发送时间',
        error_message TEXT COMMENT '错误信息',
        metadata JSON COMMENT '元数据',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_type (notification_type),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知记录表';
    `);
    console.log('✅ 通知记录表创建成功\n');

    console.log('✅ 所有表创建完成！');
    console.log('\n📊 创建的表：');
    console.log('  - billings (账单表)');
    console.log('  - task_logs (任务执行日志表)');
    console.log('  - notification_logs (通知记录表)');

  } catch (error) {
    console.error('❌ 创建表失败:', error);
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

createTables().catch(console.error);

