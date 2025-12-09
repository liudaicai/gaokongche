import dotenv from 'dotenv';
dotenv.config();
import { initMongo } from './mongo.js';

async function main() {
  const { db, client } = await initMongo();
  try {
    const orders = db.collection('orders');
    const orderItems = db.collection('order_items');
    const receipts = db.collection('receipts');
    const suspensions = db.collection('suspensions');
    const claims = db.collection('claims');
    const settlements = db.collection('settlements');
    const clearances = db.collection('clearances');
    const entries = db.collection('entries');
    const exits = db.collection('exits');

    const now = new Date();
    const creationDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 基础订单文档（字段与 orders.mongo.js 列表返回保持一致）
    const orderDoc = {
      contract_number: 'HT-2025-0001',
      lessor_id: '1001',
      lessor_name: '广州某设备公司',
      vendor_name: '广州某设备公司',
      customer_id: '2001',
      customer_name: '深圳某施工单位',
      project_name: '南山科技园项目',
      business_manager_id: '3001',
      business_manager_name: '张业务',
      delivery_location: '深圳南山区科技园',
      payment_agreement: '按月结算，月底结算',
      month_calculation_method: '30天按月，非整月按日',
      shipping_fee_reduction: '运费优惠100元',
      shipping_fee_calculation: '包邮',
      is_tax_invoice: '是',
      invoice_tax_rate: 6.0,
      construction_category: '安装工程',
      other_agreements: '其他约定：现场保洁、材料自备',
      status_entry_count: 2,
      status_exit_count: 1,
      status_performance: '履约',
      status_actual_received_amount: 2000.0,
      rented_equipment_ids: ['EQ-1001', 'EQ-1002'],
      entry_attachments: { entryDoc: 'entry-001.pdf' },
      exit_attachments: { exitDoc: 'exit-001.pdf' },
      estimated_amount: 12345.67,
      creation_date: creationDate,
      created_at: creationDate,
      updated_at: now,
    };

    const rOrder = await orders.insertOne(orderDoc);
    const orderId = rOrder.insertedId;

    // 设备项（用于详情展示，可选）
    const items = [
      {
        order_id: orderId,
        equipment_code: 'EQ-1001',
        equipment_type: '剪叉车',
        height: '12m',
        name: '剪叉式高空作业平台',
        model: 'SJIII3219',
        quantity: 2,
        unit_price: 380.0,
        monthly_rate: 8000.0,
        daily_rate: 300.0,
        shipping_fee: 200.0,
        deposit: 1000.0,
        modification_fee: 0.0,
        scheduled_entry_date: '2025-10-01',
        estimated_exit_date: '2025-11-01',
        rental_period: 30,
        remarks: '含运维',
        shipping_type: '双程',
      },
      {
        order_id: orderId,
        equipment_code: 'EQ-1002',
        equipment_type: '曲臂车',
        height: '16m',
        name: '曲臂式高空作业平台',
        model: 'HA16RTJ',
        quantity: 1,
        unit_price: 500.0,
        monthly_rate: 12000.0,
        daily_rate: 450.0,
        shipping_fee: 300.0,
        deposit: 1500.0,
        modification_fee: 0.0,
        scheduled_entry_date: '2025-10-03',
        estimated_exit_date: '2025-11-05',
        rental_period: 33,
        remarks: '现场培训',
        shipping_type: '双程',
      },
    ];
    if (items.length) await orderItems.insertMany(items);

    // 收款记录（用于详情展示，可选）
    await receipts.insertOne({
      order_id: orderId,
      receipt_number: 'SK-2025-0001',
      contract_name: '标准合同模板',
      receipt_date: '2025-10-05',
      payment_method: '银行转账',
      amount: 5000.0,
      attachments: { invoice: 'inv-001.png' },
      remark: '首笔收款',
      created_at: now,
    });

    // 其他记录（用于详情展示，可选）
    await suspensions.insertOne({
      order_id: orderId,
      suspension_number: 'BT-2025-0001',
      contract_name: '标准合同模板',
      suspension_type: '部分报停',
      reason: '台风影响',
      start_date: '2025-10-12',
      end_date: '2025-10-15',
      suspension_days: 3,
      equipment_selections: ['EQ-1001'],
      attachments: { note: '天气原因' },
      created_at: now,
    });

    await claims.insertOne({
      order_id: orderId,
      claim_number: 'SP-2025-0001',
      contract_name: '标准合同模板',
      reason: '设备损坏赔偿',
      claim_date: '2025-10-08',
      claim_amount: 500.0,
      equipment_selections: ['EQ-1002'],
      attachments: { photo: 'damage-001.jpg' },
      created_at: now,
    });

    await settlements.insertOne({
      order_id: orderId,
      settlement_number: 'JS-2025-0001',
      contract_name: '标准合同模板',
      settlement_date: '2025-11-30',
      settlement_amount: 8000.0,
      attachments: { sheet: 'settlement-001.xlsx' },
      remark: '11月结算',
      created_at: now,
    });

    await clearances.insertOne({
      order_id: orderId,
      clearance_number: 'JQ-2025-0001',
      contract_name: '标准合同模板',
      clearance_date: '2025-12-15',
      clearance_amount: 1500.0,
      attachments: { proof: 'clearance-001.pdf' },
      remark: '结清差额',
      created_at: now,
    });

    // 进退场记录（用于详情展示，可选）
    await entries.insertOne({
      order_id: orderId,
      entry_number: 'JC-2025-0001',
      contract_name: '标准合同模板',
      entry_date: '2025-10-01',
      equipment_summary: 'EQ-1001*2, EQ-1002*1',
      transport_method: '自运',
      business_manager_name: '张业务',
      handover_person: '李师傅',
      attachments: { entrySheet: 'entry-001.pdf' },
      created_at: now,
    });

    await exits.insertOne({
      order_id: orderId,
      exit_number: 'TC-2025-0001',
      contract_name: '标准合同模板',
      exit_date: '2025-11-05',
      equipment_summary: 'EQ-1002*1',
      transport_method: '自运',
      business_manager_name: '张业务',
      handover_person: '王师傅',
      attachments: { exitSheet: 'exit-001.pdf' },
      created_at: now,
    });

    console.log(`[Seed.Mongo] Created order with id=${orderId}`);
  } catch (err) {
    console.error('[Seed.Mongo] Error:', err);
    throw err;
  } finally {
    try { await client.close(); } catch {}
  }
}

main().catch(err => {
  console.error('[Seed.Mongo] Failed:', err);
  process.exit(1);
});