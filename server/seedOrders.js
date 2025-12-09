import dotenv from 'dotenv';
dotenv.config();
import { initPool } from './db.js';

const toJson = (v) => (v === undefined || v === null ? null : JSON.stringify(v));

async function main() {
  const pool = await initPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const now = new Date();
    const creationDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 插入订单
    const [rOrder] = await conn.query(
      `INSERT INTO orders (
        contract_number, lessor_id, lessor_name, vendor_name, customer_id, customer_name, project_name,
        business_manager_id, business_manager_name, delivery_location, payment_agreement, month_calculation_method,
        shipping_fee_reduction, shipping_fee_calculation, is_tax_invoice, invoice_tax_rate, construction_category, other_agreements,
        status_entry_count, status_exit_count, status_performance, status_actual_received_amount,
        rented_equipment_ids, entry_attachments, exit_attachments, estimated_amount, creation_date
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        'HT-2025-0001',
        1001,
        '广州某设备公司',
        '广州某设备公司',
        2001,
        '深圳某施工单位',
        '南山科技园项目',
        3001,
        '张业务',
        '深圳南山区科技园',
        '按月结算，月底结算',
        '30天按月，非整月按日',
        '运费优惠100元',
        '包邮',
        '是',
        6.00,
        '安装工程',
        '其他约定：现场保洁、材料自备',
        2,
        1,
        '履约',
        2000.00,
        toJson(['EQ-1001','EQ-1002']),
        toJson({ entryDoc: 'entry-001.pdf' }),
        toJson({ exitDoc: 'exit-001.pdf' }),
        12345.67,
        creationDate,
      ]
    );
    const orderId = rOrder.insertId;

    // 插入设备项
    const items = [
      {
        equipmentCode: 'EQ-1001', equipmentType: '剪叉车', height: '12m', name: '剪叉式高空作业平台', model: 'SJIII3219', quantity: 2,
        unitPrice: 380.00, monthlyRate: 8000.00, dailyRate: 300.00, shippingFee: 200.00, deposit: 1000.00,
        modificationFee: 0.00, scheduledEntryDate: '2025-10-01', estimatedExitDate: '2025-11-01', rentalPeriod: 30, remarks: '含运维'
      },
      {
        equipmentCode: 'EQ-1002', equipmentType: '曲臂车', height: '16m', name: '曲臂式高空作业平台', model: 'HA16RTJ', quantity: 1,
        unitPrice: 500.00, monthlyRate: 12000.00, dailyRate: 450.00, shippingFee: 300.00, deposit: 1500.00,
        modificationFee: 0.00, scheduledEntryDate: '2025-10-03', estimatedExitDate: '2025-11-05', rentalPeriod: 33, remarks: '现场培训'
      },
    ];
    for (const it of items) {
      await conn.query(
        `INSERT INTO order_items (
          order_id, equipment_code, equipment_type, height, name, model, quantity, unit_price, monthly_rate, daily_rate,
          shipping_fee, deposit, modification_fee, scheduled_entry_date, estimated_exit_date, rental_period, remarks
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          orderId,
          it.equipmentCode,
          it.equipmentType,
          it.height,
          it.name,
          it.model,
          it.quantity,
          it.unitPrice,
          it.monthlyRate,
          it.dailyRate,
          it.shippingFee,
          it.deposit,
          it.modificationFee,
          it.scheduledEntryDate,
          it.estimatedExitDate,
          it.rentalPeriod,
          it.remarks,
        ]
      );
    }

    // 收款记录
    await conn.query(
      `INSERT INTO receipts (order_id, receipt_number, contract_name, receipt_date, payment_method, amount, attachments, remark)
       VALUES (?,?,?,?,?,?,?,?)`,
      [orderId, 'SK-2025-0001', '标准合同模板', '2025-10-05', '银行转账', 5000.00, toJson({ invoice: 'inv-001.png' }), '首笔收款']
    );

    // 报停记录
    await conn.query(
      `INSERT INTO suspensions (order_id, suspension_number, contract_name, suspension_type, reason, start_date, end_date, suspension_days, equipment_selections, attachments)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [orderId, 'BT-2025-0001', '标准合同模板', '部分报停', '台风影响', '2025-10-12', '2025-10-15', 3, toJson(['EQ-1001']), toJson({ note: '天气原因' })]
    );

    // 索赔记录
    await conn.query(
      `INSERT INTO claims (order_id, claim_number, contract_name, reason, claim_date, claim_amount, equipment_selections, attachments)
       VALUES (?,?,?,?,?,?,?,?)`,
      [orderId, 'SP-2025-0001', '标准合同模板', '设备损坏赔偿', '2025-10-08', 500.00, toJson(['EQ-1002']), toJson({ photo: 'damage-001.jpg' })]
    );

    // 结算记录
    await conn.query(
      `INSERT INTO settlements (order_id, settlement_number, contract_name, settlement_date, settlement_amount, attachments, remark)
       VALUES (?,?,?,?,?,?,?)`,
      [orderId, 'JS-2025-0001', '标准合同模板', '2025-11-30', 8000.00, toJson({ sheet: 'settlement-001.xlsx' }), '11月结算']
    );

    // 结清记录
    await conn.query(
      `INSERT INTO clearances (order_id, clearance_number, contract_name, clearance_date, clearance_amount, attachments, remark)
       VALUES (?,?,?,?,?,?,?)`,
      [orderId, 'JQ-2025-0001', '标准合同模板', '2025-12-15', 1500.00, toJson({ proof: 'clearance-001.pdf' }), '结清差额']
    );

    await conn.commit();
    console.log(`[Seed] Created order with id=${orderId}`);
  } catch (err) {
    await conn.rollback();
    console.error('[Seed] Error:', err);
    throw err;
  } finally {
    conn.release();
    try { await pool.end(); } catch {}
  }
}

main().catch(err => {
  console.error('[Seed] Failed:', err);
  process.exit(1);
});