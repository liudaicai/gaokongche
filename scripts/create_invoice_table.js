import mysql from 'mysql2/promise';

async function main() {
  const pool = await mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '19900809ldc',
    database: 'gaokongche',
    multipleStatements: true
  });

  const sql = `
    CREATE TABLE IF NOT EXISTS order_invoices (
      id INT NOT NULL AUTO_INCREMENT,
      order_id INT NOT NULL COMMENT '订单ID',
      invoice_number VARCHAR(50) NOT NULL COMMENT '发票号码',
      invoice_type VARCHAR(50) NOT NULL DEFAULT 'vat_normal' COMMENT '发票类型: vat_special(专票), vat_normal(普票)',
      invoice_date DATE NOT NULL COMMENT '开票日期',
      invoice_title VARCHAR(255) NOT NULL COMMENT '发票抬头',
      tax_number VARCHAR(100) NOT NULL DEFAULT '' COMMENT '纳税人识别号',
      invoice_content TEXT NULL COMMENT '开票内容',
      amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '开票金额',
      tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '税率（%）',
      tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '税额',
      total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '价税合计',
      invoice_status VARCHAR(50) NOT NULL DEFAULT 'issued' COMMENT '发票状态',
      sent_date DATE NULL COMMENT '寄出日期',
      received_date DATE NULL COMMENT '收到日期',
      cancelled_date DATE NULL COMMENT '作废日期',
      cancelled_reason TEXT NULL COMMENT '作废原因',
      recipient_name VARCHAR(100) NULL COMMENT '收件人姓名',
      recipient_phone VARCHAR(50) NULL COMMENT '收件人电话',
      recipient_address VARCHAR(500) NULL COMMENT '收件地址',
      express_company VARCHAR(100) NULL COMMENT '快递公司',
      express_number VARCHAR(100) NULL COMMENT '快递单号',
      issuer_company VARCHAR(255) NULL COMMENT '开票公司',
      receiver_company VARCHAR(255) NULL COMMENT '收票公司',
      attachments JSON NULL COMMENT '附件',
      notes TEXT NULL COMMENT '备注',
      created_by INT NULL COMMENT '创建人',
      sent_by INT NULL COMMENT '寄出操作人',
      cancelled_by INT NULL COMMENT '作废操作人',
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY uniq_invoice_number (invoice_number),
      INDEX idx_order_id (order_id),
      INDEX idx_invoice_status (invoice_status),
      INDEX idx_invoice_date (invoice_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单发票表';
  `;

  try {
    await pool.query(sql);
    console.log('order_invoices table created/verified');
  } catch (err) {
    console.error('Error:', err.message);
  }

  await pool.end();
}

main();
