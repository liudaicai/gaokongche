import express from 'express';
import { ObjectId } from 'mongodb';

// 兼容解析：允许值本身就是数组/对象，或JSON字符串/逗号串
const safeArray = (v) => {
  if (v == null) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return v.split(',').map(x => x.trim()).filter(Boolean);
    }
  }
  return [];
};
const safeObject = (v) => {
  if (v == null) return {};
  if (typeof v === 'object') return v;
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return p && typeof p === 'object' ? p : {};
    } catch {
      return {};
    }
  }
  return {};
};

export default function buildOrdersRouterMongo(db) {
  const router = express.Router();
  const orders = db.collection('orders');
  const itemsCol = db.collection('order_items');
  const receiptsCol = db.collection('receipts');
  const refundsCol = db.collection('refunds');
  const suspensionsCol = db.collection('suspensions');
  const claimsCol = db.collection('claims');
  const settlementsCol = db.collection('settlements');
  const clearancesCol = db.collection('clearances');
  const entriesCol = db.collection('entries');
  const exitsCol = db.collection('exits');
  const opLogsCol = db.collection('operation_logs');
  // 新增：设备集合与状态日志集合，用于进退场实时同步设备状态
  const equipmentsCol = db.collection('equipments');
  const statusLogsCol = db.collection('equipment_status_logs');
  // 新增：用于名称解析的集合与工具函数
  const verifications = db.collection('company_verifications');
  const customersCol = db.collection('customers');
  const employeesCol = db.collection('employees');
  // 合同编号生成序列
  const countersCol = db.collection('counters');
  orders.createIndex({ contract_number: 1 }, { unique: true }).catch(err => {
    console.warn('[Orders.Mongo] createIndex(contract_number) warn:', err?.message || err);
  });
  const nextContractNumber = async () => {
    const now = new Date();
    const year = now.getFullYear();
    const prefix = `HT-${year}-`;

    let lastSeq = 0;
    try {
      const lastOrder = await orders
        .find({ contract_number: { $regex: `^${prefix}\\d{4}$` } })
        .sort({ contract_number: -1 })
        .limit(1)
        .toArray();
      if (lastOrder.length) {
        const suffix = String(lastOrder[0].contract_number).slice(prefix.length);
        const parsed = parseInt(suffix, 10);
        if (Number.isFinite(parsed)) lastSeq = parsed;
      }
    } catch (e) {
      console.warn('[Orders.Mongo] reading last order seq failed', e);
    }

    const seq = lastSeq + 1;
    console.log('[Orders.Mongo] nextContractNumber', 'lastSeq=', lastSeq, 'seq=', seq);
    const num = String(seq).padStart(4, '0');
    return `${prefix}${num}`;
  };

  // 辅助方法：根据现有进退场记录重算在租设备集合，并同步设备租赁状态
  const recomputeRentedAndSyncEquipments = async (_id) => {
    const now = new Date().toISOString();
    const [orderDoc, entryDocs, exitDocs] = await Promise.all([
      orders.findOne({ _id }),
      entriesCol.find({ order_id: _id }).toArray(),
      exitsCol.find({ order_id: _id }).toArray(),
    ]);
    const entryCodes = new Set((entryDocs || []).flatMap(e => safeArray(e.equipment_codes)));
    const exitCodes = new Set((exitDocs || []).flatMap(x => safeArray(x.equipment_codes)));
    const rentingCodes = Array.from(entryCodes).filter(c => !exitCodes.has(c));

    // 使用单桶兜底：保持前端对 rentedEquipmentIds 的兼容（二维数组）
    const buckets = rentingCodes.length ? [rentingCodes] : [];
    await orders.updateOne({ _id }, { $set: { rented_equipment_ids: buckets, updatedAt: now } });

    // 同步设备状态：
    if (rentingCodes.length) {
      await equipmentsCol.updateMany(
        { code: { $in: rentingCodes } },
        { $set: { rentalStatus: 'renting', currentOrderId: _id, updatedAt: now } }
      );
    }
    await equipmentsCol.updateMany(
      { currentOrderId: _id, code: { $nin: rentingCodes } },
      { $set: { rentalStatus: 'waiting', currentOrderId: null, updatedAt: now } }
    );

    // 广播由调用方负责，这里只做数据同步
  };

  const resolveNameFromId = async (col, id, fields) => {
    if (!id) return null;
    const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
    const doc = await col.findOne({ _id });
    if (!doc) return null;
    for (const f of fields) {
      if (doc[f]) return doc[f];
    }
    return null;
  };

  // 列表
  router.get('/', async (_req, res) => {
    try {
      const docs = await orders.find({}).sort({ updatedAt: -1, _id: -1 }).toArray();
      const data = docs.map(o => ({
        id: String(o._id),
        contract_number: o.contract_number,
        lessor_id: o.lessor_id,
        lessor_name: o.lessor_name || o.vendor_name,
        vendor_name: o.vendor_name,
        customer_id: o.customer_id,
        customer_name: o.customer_name,
        project_name: o.project_name,
        business_manager_id: o.business_manager_id,
        business_manager_name: o.business_manager_name,
        delivery_location: o.delivery_location,
        payment_agreement: o.payment_agreement,
        month_calculation_method: o.month_calculation_method,
        status: {
          entryCount: Number(o.status_entry_count ?? o.status?.entryCount ?? 0),
          exitCount: Number(o.status_exit_count ?? o.status?.exitCount ?? 0),
          actualReceivedAmount: Number(o.status_actual_received_amount ?? o.status?.actualReceivedAmount ?? 0),
        },
        rentedEquipmentIds: safeArray(o.rented_equipment_ids),
        entryAttachments: safeObject(o.entry_attachments),
        exitAttachments: safeObject(o.exit_attachments),
        createdAt: o.createdAt || o.created_at,
        updatedAt: o.updatedAt || o.updated_at,
      }));
      res.json({ ok: true, data });
    } catch (err) {
      console.error('[Orders.Mongo] List error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'List error' });
    }
  });

  // 详情（含设备项与各记录）
  router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const o = await orders.findOne({ _id });
      if (!o) return res.status(404).json({ ok: false, error: 'Not found' });
      const items = await itemsCol.find({ order_id: _id }).sort({ _id: 1 }).toArray();
      const receipts = await receiptsCol.find({ order_id: _id }).sort({ _id: 1 }).toArray();
      const refunds = await refundsCol.find({ order_id: _id }).sort({ _id: 1 }).toArray();
      const suspensions = await suspensionsCol.find({ order_id: _id }).sort({ _id: 1 }).toArray();
      const claims = await claimsCol.find({ order_id: _id }).sort({ _id: 1 }).toArray();
      const settlements = await settlementsCol.find({ order_id: _id }).sort({ _id: 1 }).toArray();
      const clearances = await clearancesCol.find({ order_id: _id }).sort({ _id: 1 }).toArray();
      const entries = await entriesCol.find({ order_id: _id }).sort({ _id: 1 }).toArray();
      const exits = await exitsCol.find({ order_id: _id }).sort({ _id: 1 }).toArray();

      // 预取设备自编码：收集所有进、退场中的设备编码，一次性读取设备库，避免重复查询
      const collectCodes = (arr) => arr.flatMap(e => Array.isArray(e?.equipment_codes) ? e.equipment_codes.filter(Boolean) : []);
      const allCodes = Array.from(new Set([ ...collectCodes(entries), ...collectCodes(exits) ]));
      const eqDocs = allCodes.length ? await equipmentsCol.find({ code: { $in: allCodes } }).project({ code: 1, customCode: 1 }).toArray() : [];
      const eqByCode = new Map(eqDocs.map(d => [d.code, { customCode: d.customCode || null }]));

      res.json({ ok: true, data: {
        id: String(o._id),
        contract_number: o.contract_number,
        lessor_id: o.lessor_id,
        lessor_name: o.lessor_name,
        vendor_name: o.vendor_name,
        customer_id: o.customer_id,
        customer_name: o.customer_name,
        project_name: o.project_name,
        business_manager_id: o.business_manager_id,
        business_manager_name: o.business_manager_name,
        delivery_location: o.delivery_location,
        payment_agreement: o.payment_agreement,
        month_calculation_method: o.month_calculation_method,
        shipping_fee_reduction: o.shipping_fee_reduction,
        shipping_fee_calculation: o.shipping_fee_calculation,
        is_tax_invoice: o.is_tax_invoice,
        invoice_tax_rate: o.invoice_tax_rate,
        construction_category: o.construction_category,
        other_agreements: o.other_agreements,
        status: {
          entryCount: Number(o.status_entry_count ?? o.status?.entryCount ?? 0),
          exitCount: Number(o.status_exit_count ?? o.status?.exitCount ?? 0),
          performanceStatus: o.status_performance ?? o.status?.performanceStatus ?? '履约',
          actualReceivedAmount: Number(o.status_actual_received_amount ?? o.status?.actualReceivedAmount ?? 0),
        },
        rentedEquipmentIds: safeArray(o.rented_equipment_ids),
        entryAttachments: safeObject(o.entry_attachments),
        exitAttachments: safeObject(o.exit_attachments),
        equipmentItems: items.map(it => ({
          id: String(it._id),
          equipmentCode: it.equipment_code,
          equipmentType: it.equipment_type,
          height: it.height,
          name: it.name,
          model: it.model,
          quantity: it.quantity,
          unitPrice: it.unit_price,
          monthlyRate: it.monthly_rate,
          dailyRate: it.daily_rate,
          shippingFee: it.shipping_fee,
          deposit: it.deposit,
          modificationFee: it.modification_fee,
          scheduledEntryDate: it.scheduled_entry_date,
          estimatedExitDate: it.estimated_exit_date,
          rentalPeriod: it.rental_period,
          remarks: it.remarks,
          shippingType: it.shipping_type,
        })),
        receipts: receipts.map(r => ({
          id: String(r._id),
          receiptNumber: r.receipt_number,
          contractName: r.contract_name,
          receiptDate: r.receipt_date,
          paymentMethod: r.payment_method,
          amount: Number(r.amount),
          attachments: safeObject(r.attachments) || undefined,
          remark: r.remark || undefined,
          createdAt: r.createdAt || r.created_at,
        })),
        refunds: refunds.map(r => ({
          id: String(r._id),
          refundNumber: r.refund_number,
          contractName: r.contract_name,
          refundDate: r.refund_date,
          paymentMethod: r.payment_method,
          amount: Number(r.amount),
          attachments: safeObject(r.attachments) || undefined,
          remark: r.remark || undefined,
          createdAt: r.createdAt || r.created_at,
        })),
        suspensions: suspensions.map(s => ({
          id: String(s._id),
          suspensionNumber: s.suspension_number,
          contractName: s.contract_name,
          suspensionType: s.suspension_type,
          reason: s.reason || undefined,
          startDate: s.start_date,
          endDate: s.end_date,
          suspensionDays: s.suspension_days,
          equipmentSelections: safeArray(s.equipment_selections),
          attachments: safeObject(s.attachments) || undefined,
          createdAt: s.createdAt || s.created_at,
        })),
        claims: claims.map(c => ({
          id: String(c._id),
          claimNumber: c.claim_number,
          contractName: c.contract_name,
          reason: c.reason,
          claimDate: c.claim_date,
          claimAmount: c.claim_amount != null ? Number(c.claim_amount) : undefined,
          equipmentSelections: safeArray(c.equipment_selections),
          attachments: safeObject(c.attachments) || undefined,
          createdAt: c.createdAt || c.created_at,
        })),
        settlements: settlements.map(s => ({
          id: String(s._id),
          settlementNumber: s.settlement_number,
          contractName: s.contract_name,
          settlementDate: s.settlement_date,
          settlementAmount: Number(s.settlement_amount),
          attachments: safeObject(s.attachments) || undefined,
          remark: s.remark || undefined,
          createdAt: s.createdAt || s.created_at,
        })),
        clearances: clearances.map(c => ({
          id: String(c._id),
          clearanceNumber: c.clearance_number,
          contractName: c.contract_name,
          clearanceDate: c.clearance_date,
          clearanceAmount: c.clearance_amount != null ? Number(c.clearance_amount) : undefined,
          attachments: safeObject(c.attachments) || undefined,
          remark: c.remark || undefined,
          createdAt: c.createdAt || c.created_at,
        })),
        entries: entries.map(e => ({
          id: String(e._id),
          entryNumber: e.entry_number,
          contractName: e.contract_name,
          entryDate: e.entry_date,
          equipmentSummary: e.equipment_summary,
          equipmentCodes: safeArray(e.equipment_codes),
          // 新增：设备明细，包含设备编码与自编码，便于前端直接展示 [设备编码]-[自编码]
          equipmentDetails: safeArray(e.equipment_codes).map(code => ({
            code,
            customCode: (eqByCode.get(code)?.customCode ?? null),
          })),
          transportMethod: e.transport_method,
          businessManagerName: e.business_manager_name,
          handoverPerson: e.handover_person,
          attachments: safeObject(e.attachments) || undefined,
          vehicleId: e.vehicle_id ? String(e.vehicle_id) : undefined,
          driverId: e.driver_id ? String(e.driver_id) : undefined,
          companyId: e.company_id ? String(e.company_id) : undefined,
          companyContactName: e.company_contact_name || undefined,
          companyContactPhone: e.company_contact_phone || undefined,
          logisticsCost: e.logistics_cost != null ? Number(e.logistics_cost) : undefined,
          vehiclePlate: e.vehicle_plate || undefined,
          driverName: e.driver_name || undefined,
          driverPhone: e.driver_phone || undefined,
          companyName: e.company_name || undefined,
          createdAt: e.createdAt || e.created_at,
        })),
        exits: exits.map(x => ({
          id: String(x._id),
          exitNumber: x.exit_number,
          contractName: x.contract_name,
          exitDate: x.exit_date,
          equipmentSummary: x.equipment_summary,
          equipmentCodes: safeArray(x.equipment_codes),
          // 新增：设备明细，包含设备编码与自编码
          equipmentDetails: safeArray(x.equipment_codes).map(code => ({
            code,
            customCode: (eqByCode.get(code)?.customCode ?? null),
          })),
          transportMethod: x.transport_method,
          businessManagerName: x.business_manager_name,
          handoverPerson: x.handover_person,
          attachments: safeObject(x.attachments) || undefined,
          vehicleId: x.vehicle_id ? String(x.vehicle_id) : undefined,
          driverId: x.driver_id ? String(x.driver_id) : undefined,
          companyId: x.company_id ? String(x.company_id) : undefined,
          companyContactName: x.company_contact_name || undefined,
          companyContactPhone: x.company_contact_phone || undefined,
          logisticsCost: x.logistics_cost != null ? Number(x.logistics_cost) : undefined,
          vehiclePlate: x.vehicle_plate || undefined,
          driverName: x.driver_name || undefined,
          driverPhone: x.driver_phone || undefined,
          companyName: x.company_name || undefined,
          createdAt: x.createdAt || x.created_at,
        })),
        createdAt: o.createdAt || o.created_at,
        updatedAt: o.updatedAt || o.updated_at,
      } });
    } catch (err) {
      console.error('[Orders.Mongo] Get error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Get error' });
    }
  });

  // 删除前关联单据检查：返回各类关联记录的数量统计与合同基础信息
  router.get('/:id/delete-check', async (req, res) => {
    const { id } = req.params;
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const o = await orders.findOne({ _id });
      if (!o) return res.status(404).json({ ok: false, error: 'Order not found' });
      const [entriesCnt, exitsCnt, receiptsCnt, refundsCnt, suspensionsCnt, claimsCnt, settlementsCnt, clearancesCnt] = await Promise.all([
        entriesCol.countDocuments({ order_id: _id }),
        exitsCol.countDocuments({ order_id: _id }),
        receiptsCol.countDocuments({ order_id: _id }),
        refundsCol.countDocuments({ order_id: _id }),
        suspensionsCol.countDocuments({ order_id: _id }),
        claimsCol.countDocuments({ order_id: _id }),
        settlementsCol.countDocuments({ order_id: _id }),
        clearancesCol.countDocuments({ order_id: _id }),
      ]);
      const associations = {
        entries: entriesCnt,
        exits: exitsCnt,
        receipts: receiptsCnt,
        refunds: refundsCnt,
        suspensions: suspensionsCnt,
        claims: claimsCnt,
        settlements: settlementsCnt,
        clearances: clearancesCnt,
      };
      const contractNumber = o.contract_number;
      const contractName = [o.customer_name, o.project_name].filter(Boolean).join(' / ');
      res.json({ ok: true, data: { contractNumber, contractName, associations } });
    } catch (err) {
      console.error('[Orders.Mongo] Delete-check error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete-check error' });
    }
  });

  // 新建订单（含设备项）
  router.post('/', async (req, res) => {
    const body = req.body || {};
    const items = body.equipmentItems || [];
    try {
      const now = new Date().toISOString();
      const resolvedLessorName = await resolveNameFromId(verifications, body.lessor_id, ['companyName', 'name']);
      const resolvedCustomerName = await resolveNameFromId(customersCol, body.customer_id, ['name', 'companyName']);
      const resolvedManagerName = await resolveNameFromId(employeesCol, body.business_manager_id, ['name']);

      let orderId = null;
      let contractNumber = null;
      for (let i = 0; i < 5 && !orderId; i++) {
        const cn = await nextContractNumber();
        const doc = {
          contract_number: cn,
          lessor_id: body.lessor_id || null,
          lessor_name: resolvedLessorName ?? body.lessor_name ?? null,
          vendor_name: body.vendor_name || null,
          customer_id: body.customer_id || null,
          customer_name: resolvedCustomerName ?? body.customer_name ?? null,
          project_name: body.project_name || null,
          business_manager_id: body.business_manager_id || null,
          business_manager_name: resolvedManagerName ?? body.business_manager_name ?? null,
          delivery_location: body.delivery_location || null,
          payment_agreement: body.payment_agreement || null,
          month_calculation_method: body.month_calculation_method || null,
          shipping_fee_reduction: body.shipping_fee_reduction || null,
          shipping_fee_calculation: body.shipping_fee_calculation || null,
          is_tax_invoice: body.is_tax_invoice || null,
          invoice_tax_rate: body.invoice_tax_rate || null,
          construction_category: body.construction_category || null,
          other_agreements: body.other_agreements || null,
          status_entry_count: Number(body.status?.entryCount ?? 0),
          status_exit_count: Number(body.status?.exitCount ?? 0),
          status_performance: body.status?.performanceStatus ?? '履约',
          status_actual_received_amount: Number(body.status?.actualReceivedAmount ?? 0),
          rented_equipment_ids: body.rentedEquipmentIds ?? null,
          entry_attachments: body.entryAttachments ?? null,
          exit_attachments: body.exitAttachments ?? null,
          estimated_amount: body.estimated_amount ?? body.estimatedAmount ?? null,
          creation_date: body.creation_date ?? body.creationDate ?? null,
          createdAt: now,
          updatedAt: now,
        };
        try {
          const r = await orders.insertOne(doc);
          orderId = r.insertedId;
          contractNumber = cn;
        } catch (err) {
          const isDup = err?.code === 11000 || String(err?.message || '').includes('E11000');
          if (isDup) {
            console.warn('[Orders.Mongo] Create retry due to duplicate contract_number', cn);
            continue;
          }
          throw err;
        }
      }

      if (!orderId) {
        return res.status(500).json({ ok: false, error: 'Create failed: contract_number allocation conflict' });
      }

      // 插入设备项
      const bulkItems = items.map(it => ({
        order_id: orderId,
        equipment_code: it.equipmentCode ?? null,
        equipment_type: it.equipmentType ?? null,
        height: it.height ?? null,
        name: it.name ?? null,
        model: it.model ?? null,
        quantity: it.quantity ?? 0,
        unit_price: it.unitPrice ?? null,
        monthly_rate: it.monthlyRate ?? null,
        daily_rate: it.dailyRate ?? null,
        shipping_fee: it.shippingFee ?? null,
        deposit: it.deposit ?? null,
        modification_fee: it.modificationFee ?? null,
        scheduled_entry_date: it.scheduledEntryDate ?? null,
        estimated_exit_date: it.estimatedExitDate ?? null,
        rental_period: it.rentalPeriod ?? null,
        remarks: it.remarks ?? null,
        shipping_type: it.shippingType ?? null,
      }));
      if (bulkItems.length) await itemsCol.insertMany(bulkItems);
      res.json({ ok: true, id: String(orderId), contract_number: contractNumber });
    } catch (err) {
      console.error('[Orders.Mongo] Create error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Create error' });
    }
  });

  // 更新订单（合同编号不允许修改）
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const body = req.body || {};
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const resolvedLessorName = await resolveNameFromId(verifications, body.lessor_id, ['companyName', 'name']);
      const resolvedCustomerName = await resolveNameFromId(customersCol, body.customer_id, ['name', 'companyName']);
      const resolvedManagerName = await resolveNameFromId(employeesCol, body.business_manager_id, ['name']);
      const $set = {
        // contract_number: 不允许更新
        lessor_id: body.lessor_id ?? null,
        lessor_name: resolvedLessorName ?? body.lessor_name ?? null,
        vendor_name: body.vendor_name ?? null,
        customer_id: body.customer_id ?? null,
        customer_name: resolvedCustomerName ?? body.customer_name ?? null,
        project_name: body.project_name ?? null,
        business_manager_id: body.business_manager_id ?? null,
        business_manager_name: resolvedManagerName ?? body.business_manager_name ?? null,
        delivery_location: body.delivery_location ?? null,
        payment_agreement: body.payment_agreement ?? null,
        month_calculation_method: body.month_calculation_method ?? null,
        shipping_fee_reduction: body.shipping_fee_reduction ?? null,
        shipping_fee_calculation: body.shipping_fee_calculation ?? null,
        is_tax_invoice: body.is_tax_invoice ?? null,
        invoice_tax_rate: body.invoice_tax_rate ?? null,
        construction_category: body.construction_category ?? null,
        other_agreements: body.other_agreements ?? null,
        status_entry_count: body.status?.entryCount ?? null,
        status_exit_count: body.status?.exitCount ?? null,
        status_performance: body.status?.performanceStatus ?? null,
        status_actual_received_amount: body.status?.actualReceivedAmount ?? null,
        rented_equipment_ids: body.rentedEquipmentIds ?? null,
        entry_attachments: body.entryAttachments ?? null,
        exit_attachments: body.exitAttachments ?? null,
        estimated_amount: body.estimated_amount ?? body.estimatedAmount ?? null,
        creation_date: body.creation_date ?? body.creationDate ?? null,
        updatedAt: new Date().toISOString(),
      };
      await orders.updateOne({ _id }, { $set });

      // 同步 entries/exits（前端可能通过订单更新传入完整数组）
      if (Array.isArray(body.entries)) {
        await entriesCol.deleteMany({ order_id: _id });
        if (body.entries.length > 0) {
          const docs = body.entries.map(e => ({
            order_id: _id,
            entry_number: e.entryNumber,
            contract_name: e.contractName || null,
            entry_date: e.entryDate,
            equipment_summary: e.equipmentSummary || null,
            equipment_codes: Array.isArray(e.equipmentCodes) ? e.equipmentCodes : null,
            transport_method: e.transportMethod || null,
            business_manager_name: e.businessManagerName || null,
            handover_person: e.handoverPerson || null,
            attachments: e.attachments ?? null,
            // 新增：物流关联与展示字段
            vehicle_id: e.vehicleId ? (ObjectId.isValid(e.vehicleId) ? new ObjectId(e.vehicleId) : e.vehicleId) : null,
            driver_id: e.driverId ? (ObjectId.isValid(e.driverId) ? new ObjectId(e.driverId) : e.driverId) : null,
            company_id: e.companyId ? (ObjectId.isValid(e.companyId) ? new ObjectId(e.companyId) : e.companyId) : null,
            company_contact_name: e.companyContactName ?? null,
            company_contact_phone: e.companyContactPhone ?? null,
            logistics_cost: e.logisticsCost != null ? Number(e.logisticsCost) : null,
            vehicle_plate: e.vehiclePlate ?? null,
            driver_name: e.driverName ?? null,
            driver_phone: e.driverPhone ?? null,
            company_name: e.companyName ?? null,
            createdAt: e.createdAt || new Date().toISOString(),
          }));
          if (docs.length) await entriesCol.insertMany(docs);
        }
        // 自动联动更新进场计数
        const entryCount = await entriesCol.countDocuments({ order_id: _id });
        await orders.updateOne({ _id }, { $set: { status_entry_count: entryCount } });
      }
      if (Array.isArray(body.exits)) {
        await exitsCol.deleteMany({ order_id: _id });
        if (body.exits.length > 0) {
          const docs = body.exits.map(x => ({
            order_id: _id,
            exit_number: x.exitNumber,
            contract_name: x.contractName || null,
            exit_date: x.exitDate,
            equipment_summary: x.equipmentSummary || null,
            equipment_codes: Array.isArray(x.equipmentCodes) ? x.equipmentCodes : null,
            transport_method: x.transportMethod || null,
            business_manager_name: x.businessManagerName || null,
            handover_person: x.handoverPerson || null,
            attachments: x.attachments ?? null,
            // 新增：物流关联与展示字段
            vehicle_id: x.vehicleId ? (ObjectId.isValid(x.vehicleId) ? new ObjectId(x.vehicleId) : x.vehicleId) : null,
            driver_id: x.driverId ? (ObjectId.isValid(x.driverId) ? new ObjectId(x.driverId) : x.driverId) : null,
            company_id: x.companyId ? (ObjectId.isValid(x.companyId) ? new ObjectId(x.companyId) : x.companyId) : null,
            company_contact_name: x.companyContactName ?? null,
            company_contact_phone: x.companyContactPhone ?? null,
            logistics_cost: x.logisticsCost != null ? Number(x.logisticsCost) : null,
            vehicle_plate: x.vehiclePlate ?? null,
            driver_name: x.driverName ?? null,
            driver_phone: x.driverPhone ?? null,
            company_name: x.companyName ?? null,
            createdAt: x.createdAt || new Date().toISOString(),
          }));
          if (docs.length) await exitsCol.insertMany(docs);
        }
        // 自动联动更新退场计数
        const exitCount = await exitsCol.countDocuments({ order_id: _id });
        await orders.updateOne({ _id }, { $set: { status_exit_count: exitCount } });
      }

      res.json({ ok: true });
      try {
        const changed = Object.keys($set || {});
        req.app?.locals?.broadcast?.({ type: 'order.updated', orderId: String(id), changed });
      } catch (_) {}
    } catch (err) {
      console.error('[Orders.Mongo] Update error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Update error' });
    }
  });

  // 收款记录
  router.post('/:id/receipts', async (req, res) => {
    const { id } = req.params;
    const b = req.body || {};
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const r = await receiptsCol.insertOne({
        order_id: _id,
        receipt_number: b.receiptNumber,
        contract_name: b.contractName || null,
        receipt_date: b.receiptDate,
        payment_method: b.paymentMethod,
        amount: b.amount,
        attachments: b.attachments ?? null,
        remark: b.remark || null,
        createdAt: new Date().toISOString(),
      });
      // 联动更新订单的实收金额统计
      try {
        const inc = b.amount != null ? Number(b.amount) : 0;
        if (!Number.isNaN(inc) && inc !== 0) {
          await orders.updateOne({ _id }, { $inc: { status_actual_received_amount: inc } });
        }
      } catch (_) {}
      res.json({ ok: true, id: String(r.insertedId) });
      try { req.app?.locals?.broadcast?.({ type: 'order.suspension.added', orderId: String(id), suspensionId: String(r.insertedId) }); } catch (_) {}
      try { req.app?.locals?.broadcast?.({ type: 'order.receipt.added', orderId: String(id), receiptId: String(r.insertedId) }); } catch (_) {}
    } catch (err) {
      console.error('[Orders.Mongo] Add receipt error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Add receipt error' });
    }
  });

  // 新增：退款记录
  router.post('/:id/refunds', async (req, res) => {
    const { id } = req.params;
    const b = req.body || {};
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const r = await refundsCol.insertOne({
        order_id: _id,
        refund_number: b.refundNumber,
        contract_name: b.contractName || null,
        refund_date: b.refundDate,
        payment_method: b.paymentMethod,
        amount: b.amount,
        attachments: b.attachments ?? null,
        remark: b.remark || null,
        createdAt: new Date().toISOString(),
      });
      // 联动更新订单的实收金额统计（退款为负向）
      try {
        const dec = b.amount != null ? Number(b.amount) : 0;
        if (!Number.isNaN(dec) && dec !== 0) {
          await orders.updateOne({ _id }, { $inc: { status_actual_received_amount: -Math.abs(dec) } });
        }
      } catch (_) {}
      res.json({ ok: true, id: String(r.insertedId) });
      try { req.app?.locals?.broadcast?.({ type: 'order.refund.added', orderId: String(id), refundId: String(r.insertedId) }); } catch (_) {}
    } catch (err) {
      console.error('[Orders.Mongo] Add refund error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Add refund error' });
    }
  });

  // 删除收款记录（联动更新实收统计）
  router.delete('/:id/receipts/:receiptId', async (req, res) => {
    const { id, receiptId } = req.params;
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const _rid = ObjectId.isValid(receiptId) ? new ObjectId(receiptId) : receiptId;
      const doc = await receiptsCol.findOne({ _id: _rid, order_id: _id });
      if (!doc) return res.status(404).json({ ok: false, error: 'Receipt not found' });
      await receiptsCol.deleteOne({ _id: _rid });
      const dec = doc.amount != null ? Number(doc.amount) : 0;
      if (!Number.isNaN(dec) && dec !== 0) {
        await orders.updateOne({ _id }, { $inc: { status_actual_received_amount: -Math.abs(dec) }, $set: { updatedAt: new Date().toISOString() } });
      }
      res.json({ ok: true });
      try { req.app?.locals?.broadcast?.({ type: 'order.receipt.deleted', orderId: String(id), receiptId: String(receiptId) }); } catch (_) {}
      try { req.app?.locals?.broadcast?.({ type: 'order.updated', orderId: String(id), changed: ['status_actual_received_amount'] }); } catch (_) {}
    } catch (err) {
      console.error('[Orders.Mongo] Delete receipt error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete receipt error' });
    }
  });

  // 删除退款记录（联动更新实收统计）
  router.delete('/:id/refunds/:refundId', async (req, res) => {
    const { id, refundId } = req.params;
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const _fid = ObjectId.isValid(refundId) ? new ObjectId(refundId) : refundId;
      const doc = await refundsCol.findOne({ _id: _fid, order_id: _id });
      if (!doc) return res.status(404).json({ ok: false, error: 'Refund not found' });
      await refundsCol.deleteOne({ _id: _fid });
      const inc = doc.amount != null ? Number(doc.amount) : 0;
      if (!Number.isNaN(inc) && inc !== 0) {
        await orders.updateOne({ _id }, { $inc: { status_actual_received_amount: Math.abs(inc) }, $set: { updatedAt: new Date().toISOString() } });
      }
      res.json({ ok: true });
      try { req.app?.locals?.broadcast?.({ type: 'order.refund.deleted', orderId: String(id), refundId: String(refundId) }); } catch (_) {}
      try { req.app?.locals?.broadcast?.({ type: 'order.updated', orderId: String(id), changed: ['status_actual_received_amount'] }); } catch (_) {}
    } catch (err) {
      console.error('[Orders.Mongo] Delete refund error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete refund error' });
    }
  });

  // 进场记录
  router.post('/:id/entries', async (req, res) => {
    const { id } = req.params;
    const b = req.body || {};
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const r = await entriesCol.insertOne({
        order_id: _id,
        entry_number: b.entryNumber,
        contract_name: b.contractName || null,
        entry_date: b.entryDate,
        equipment_summary: b.equipmentSummary || null,
        equipment_codes: Array.isArray(b.equipmentCodes) ? b.equipmentCodes : null,
        transport_method: b.transportMethod || null,
        business_manager_name: b.businessManagerName || null,
        handover_person: b.handoverPerson || null,
        attachments: b.attachments ?? null,
        // 新增：物流关联与展示字段
        vehicle_id: b.vehicleId ? (ObjectId.isValid(b.vehicleId) ? new ObjectId(b.vehicleId) : b.vehicleId) : null,
        driver_id: b.driverId ? (ObjectId.isValid(b.driverId) ? new ObjectId(b.driverId) : b.driverId) : null,
        company_id: b.companyId ? (ObjectId.isValid(b.companyId) ? new ObjectId(b.companyId) : b.companyId) : null,
        company_contact_name: b.companyContactName ?? null,
        company_contact_phone: b.companyContactPhone ?? null,
        logistics_cost: b.logisticsCost != null ? Number(b.logisticsCost) : null,
        vehicle_plate: b.vehiclePlate ?? null,
        driver_name: b.driverName ?? null,
        driver_phone: b.driverPhone ?? null,
        company_name: b.companyName ?? null,
        createdAt: new Date().toISOString(),
      });
      // 自动联动更新进场计数
      const entryCount = await entriesCol.countDocuments({ order_id: _id });
      await orders.updateOne({ _id }, { $set: { status_entry_count: entryCount } });

      // 新增：进场后同步设备租赁状态为“在租”，并更新订单在租设备集合
      try {
        const now = new Date().toISOString();
        const codes = Array.isArray(b.equipmentCodes) ? b.equipmentCodes.filter(Boolean) : [];
        if (codes.length) {
          // 读取当前订单与设备、需求项
          const orderDoc = await orders.findOne({ _id });
          const orderItems = await itemsCol.find({ order_id: _id }).toArray();
          const eqDocs = await equipmentsCol.find({ code: { $in: codes } }).toArray();

          // 冲突检测与日志记录
          const actor = String(req.headers['x-user'] || req.headers['x-operator'] || 'system');
          const orderNumber = orderDoc?.contract_number;
          const logs = [];
          for (const d of eqDocs) {
            const prevStatus = d.rentalStatus || 'waiting';
            const prevOrderId = d.currentOrderId ? String(d.currentOrderId) : null;
            const conflict = prevStatus === 'renting' && prevOrderId && prevOrderId !== String(_id);
            logs.push({
              code: d.code,
              fromStatus: prevStatus,
              toStatus: 'renting',
              orderId: String(_id),
              orderNumber,
              operator: actor,
              ts: now,
              outcome: conflict ? 'conflict' : 'success',
              action: 'entry'
            });
          }
          if (logs.length) {
            try { await statusLogsCol.insertMany(logs); } catch (_) {}
          }

          // 批量更新设备为在租并绑定当前订单
          await equipmentsCol.updateMany(
            { code: { $in: codes } },
            { $set: { rentalStatus: 'renting', contractName: b.contractName || null, currentOrderId: _id, updatedAt: now } }
          );

          // 更新订单在租设备集合：按设备需求项类型/高度分桶追加
          const prevRented = safeArray(orderDoc?.rented_equipment_ids);
          const buckets = Array.isArray(prevRented) ? prevRented.map(arr => safeArray(arr)) : [];
          while (buckets.length < orderItems.length) buckets.push([]);
          const eqByCode = new Map(eqDocs.map(d => [d.code, d]));
          for (const code of codes) {
            const d = eqByCode.get(code);
            if (!d) continue;
            const idx = orderItems.findIndex(it => String(it.equipment_type) === String(d.type) && Number(it.height) === Number(d.height));
            if (idx >= 0) {
              const bucket = new Set(buckets[idx] || []);
              bucket.add(code);
              buckets[idx] = Array.from(bucket);
            } else {
              // 若无匹配项，放入第一个桶以兜底，确保在租集合包含该设备
              const bucket = new Set(buckets[0] || []);
              bucket.add(code);
              buckets[0] = Array.from(bucket);
            }
          }
          await orders.updateOne({ _id }, { $set: { rented_equipment_ids: buckets, updatedAt: now } });

          // 广播设备状态变更事件与订单刷新事件
          try { req.app?.locals?.broadcast?.({ type: 'equipment.status.changed', orderId: String(id), codes }); } catch (_) {}
          try { req.app?.locals?.broadcast?.({ type: 'order.updated', orderId: String(id), changed: ['status_entry_count','rented_equipment_ids'] }); } catch (_) {}
        }
      } catch (syncErr) {
        console.warn('[Orders.Mongo] Entry sync equipment status warn:', syncErr?.message || syncErr);
        // 失败保留原始状态并生成错误报告（写入日志）
        try {
          const now = new Date().toISOString();
          const codes = Array.isArray(b.equipmentCodes) ? b.equipmentCodes.filter(Boolean) : [];
          const orderDoc = await orders.findOne({ _id }, { projection: { contract_number: 1 } });
          const actor = String(req.headers['x-user'] || req.headers['x-operator'] || 'system');
          const logs = codes.map(code => ({ code, fromStatus: 'unknown', toStatus: 'renting', orderId: String(_id), orderNumber: orderDoc?.contract_number, operator: actor, ts: now, outcome: 'error', action: 'entry' }));
          if (logs.length) await statusLogsCol.insertMany(logs);
        } catch (_) {}
      }
      res.json({ ok: true, id: String(r.insertedId) });
      try { req.app?.locals?.broadcast?.({ type: 'order.claim.added', orderId: String(id), claimId: String(r.insertedId) }); } catch (_) {}
      try { req.app?.locals?.broadcast?.({ type: 'order.entry.added', orderId: String(id), entryId: String(r.insertedId) }); } catch (_) {}
    } catch (err) {
      console.error('[Orders.Mongo] Add entry error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Add entry error' });
    }
  });

  // 删除进场记录（联动计数与在租集合重算）
  router.delete('/:id/entries/:entryId', async (req, res) => {
    const { id, entryId } = req.params;
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const _eid = ObjectId.isValid(entryId) ? new ObjectId(entryId) : entryId;
      const doc = await entriesCol.findOne({ _id: _eid, order_id: _id });
      if (!doc) return res.status(404).json({ ok: false, error: 'Entry not found' });
      await entriesCol.deleteOne({ _id: _eid });
      const entryCount = await entriesCol.countDocuments({ order_id: _id });
      await orders.updateOne({ _id }, { $set: { status_entry_count: entryCount, updatedAt: new Date().toISOString() } });
      await recomputeRentedAndSyncEquipments(_id);
      res.json({ ok: true });
      try { req.app?.locals?.broadcast?.({ type: 'order.entry.deleted', orderId: String(id), entryId: String(entryId) }); } catch (_) {}
      try { req.app?.locals?.broadcast?.({ type: 'order.updated', orderId: String(id), changed: ['status_entry_count','rented_equipment_ids'] }); } catch (_) {}
    } catch (err) {
      console.error('[Orders.Mongo] Delete entry error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete entry error' });
    }
  });

  // 退场记录
  router.post('/:id/exits', async (req, res) => {
    const { id } = req.params;
    const b = req.body || {};
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const r = await exitsCol.insertOne({
        order_id: _id,
        exit_number: b.exitNumber,
        contract_name: b.contractName || null,
        exit_date: b.exitDate,
        equipment_summary: b.equipmentSummary || null,
        equipment_codes: Array.isArray(b.equipmentCodes) ? b.equipmentCodes : null,
        transport_method: b.transportMethod || null,
        business_manager_name: b.businessManagerName || null,
        handover_person: b.handoverPerson || null,
        attachments: b.attachments ?? null,
        // 新增：物流关联与展示字段
        vehicle_id: b.vehicleId ? (ObjectId.isValid(b.vehicleId) ? new ObjectId(b.vehicleId) : b.vehicleId) : null,
        driver_id: b.driverId ? (ObjectId.isValid(b.driverId) ? new ObjectId(b.driverId) : b.driverId) : null,
        company_id: b.companyId ? (ObjectId.isValid(b.companyId) ? new ObjectId(b.companyId) : b.companyId) : null,
        company_contact_name: b.companyContactName ?? null,
        company_contact_phone: b.companyContactPhone ?? null,
        logistics_cost: b.logisticsCost != null ? Number(b.logisticsCost) : null,
        vehicle_plate: b.vehiclePlate ?? null,
        driver_name: b.driverName ?? null,
        driver_phone: b.driverPhone ?? null,
        company_name: b.companyName ?? null,
        createdAt: new Date().toISOString(),
      });
      // 自动联动更新退场计数
      const exitCount = await exitsCol.countDocuments({ order_id: _id });
      await orders.updateOne({ _id }, { $set: { status_exit_count: exitCount } });

      // 新增：退场后同步设备租赁状态为“待租”，并更新订单在租设备集合（移除本次退场设备）
      try {
        const now = new Date().toISOString();
        const codes = Array.isArray(b.equipmentCodes) ? b.equipmentCodes.filter(Boolean) : [];
        if (codes.length) {
          const orderDoc = await orders.findOne({ _id });
          const eqDocs = await equipmentsCol.find({ code: { $in: codes } }).toArray();

          // 日志记录
          const actor = String(req.headers['x-user'] || req.headers['x-operator'] || 'system');
          const orderNumber = orderDoc?.contract_number;
          const logs = eqDocs.map(d => ({
            code: d.code,
            fromStatus: d.rentalStatus || 'waiting',
            toStatus: 'waiting',
            orderId: String(_id),
            orderNumber,
            operator: actor,
            ts: now,
            outcome: 'success',
            action: 'exit'
          }));
          if (logs.length) { try { await statusLogsCol.insertMany(logs); } catch (_) {} }

          // 批量更新设备为待租并解绑当前订单
          await equipmentsCol.updateMany(
            { code: { $in: codes } },
            { $set: { rentalStatus: 'waiting', contractName: null, currentOrderId: null, updatedAt: now } }
          );

          // 更新订单在租设备集合：从所有桶中移除这些编码
          const prevRented = safeArray(orderDoc?.rented_equipment_ids);
          const buckets = Array.isArray(prevRented) ? prevRented.map(arr => safeArray(arr)) : [];
          for (let i = 0; i < buckets.length; i++) {
            const set = new Set(buckets[i] || []);
            codes.forEach(code => set.delete(code));
            buckets[i] = Array.from(set);
          }
          await orders.updateOne({ _id }, { $set: { rented_equipment_ids: buckets, updatedAt: now } });

          // 广播设备状态变更事件与订单刷新事件
          try { req.app?.locals?.broadcast?.({ type: 'equipment.status.changed', orderId: String(id), codes }); } catch (_) {}
          try { req.app?.locals?.broadcast?.({ type: 'order.updated', orderId: String(id), changed: ['status_exit_count','rented_equipment_ids'] }); } catch (_) {}
        }
      } catch (syncErr) {
        console.warn('[Orders.Mongo] Exit sync equipment status warn:', syncErr?.message || syncErr);
        // 失败保留原始状态并生成错误报告
        try {
          const now = new Date().toISOString();
          const codes = Array.isArray(b.equipmentCodes) ? b.equipmentCodes.filter(Boolean) : [];
          const orderDoc = await orders.findOne({ _id }, { projection: { contract_number: 1 } });
          const actor = String(req.headers['x-user'] || req.headers['x-operator'] || 'system');
          const logs = codes.map(code => ({ code, fromStatus: 'unknown', toStatus: 'waiting', orderId: String(_id), orderNumber: orderDoc?.contract_number, operator: actor, ts: now, outcome: 'error', action: 'exit' }));
          if (logs.length) await statusLogsCol.insertMany(logs);
        } catch (_) {}
      }
      res.json({ ok: true, id: String(r.insertedId) });
      try { req.app?.locals?.broadcast?.({ type: 'order.settlement.added', orderId: String(id), settlementId: String(r.insertedId) }); } catch (_) {}
      try { req.app?.locals?.broadcast?.({ type: 'order.exit.added', orderId: String(id), exitId: String(r.insertedId) }); } catch (_) {}
    } catch (err) {
      console.error('[Orders.Mongo] Add exit error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Add exit error' });
    }
  });

  // 删除退场记录（联动计数与在租集合重算）
  router.delete('/:id/exits/:exitId', async (req, res) => {
    const { id, exitId } = req.params;
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const _xid = ObjectId.isValid(exitId) ? new ObjectId(exitId) : exitId;
      const doc = await exitsCol.findOne({ _id: _xid, order_id: _id });
      if (!doc) return res.status(404).json({ ok: false, error: 'Exit not found' });
      await exitsCol.deleteOne({ _id: _xid });
      const exitCount = await exitsCol.countDocuments({ order_id: _id });
      await orders.updateOne({ _id }, { $set: { status_exit_count: exitCount, updatedAt: new Date().toISOString() } });
      await recomputeRentedAndSyncEquipments(_id);
      res.json({ ok: true });
      try { req.app?.locals?.broadcast?.({ type: 'order.exit.deleted', orderId: String(id), exitId: String(exitId) }); } catch (_) {}
      try { req.app?.locals?.broadcast?.({ type: 'order.updated', orderId: String(id), changed: ['status_exit_count','rented_equipment_ids'] }); } catch (_) {}
    } catch (err) {
      console.error('[Orders.Mongo] Delete exit error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete exit error' });
    }
  });

  // 报停记录
  router.post('/:id/suspensions', async (req, res) => {
    const { id } = req.params;
    const b = req.body || {};
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const r = await suspensionsCol.insertOne({
        order_id: _id,
        suspension_number: b.suspensionNumber,
        contract_name: b.contractName || null,
        suspension_type: b.suspensionType,
        reason: b.reason || null,
        start_date: b.startDate,
        end_date: b.endDate,
        suspension_days: b.suspensionDays,
        equipment_selections: b.equipmentSelections ?? [],
        attachments: b.attachments ?? null,
        createdAt: new Date().toISOString(),
      });
      res.json({ ok: true, id: String(r.insertedId) });
      try { req.app?.locals?.broadcast?.({ type: 'order.clearance.added', orderId: String(id), clearanceId: String(r.insertedId) }); } catch (_) {}
    } catch (err) {
      console.error('[Orders.Mongo] Add suspension error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Add suspension error' });
    }
  });

  // 索赔记录
  router.post('/:id/claims', async (req, res) => {
    const { id } = req.params;
    const b = req.body || {};
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const r = await claimsCol.insertOne({
        order_id: _id,
        claim_number: b.claimNumber,
        contract_name: b.contractName || null,
        reason: b.reason,
        claim_date: b.claimDate,
        claim_amount: b.claimAmount ?? null,
        equipment_selections: b.equipmentSelections ?? [],
        attachments: b.attachments ?? null,
        createdAt: new Date().toISOString(),
      });
      res.json({ ok: true, id: String(r.insertedId) });
    } catch (err) {
      console.error('[Orders.Mongo] Add claim error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Add claim error' });
    }
  });

  // 结算记录
  router.post('/:id/settlements', async (req, res) => {
    const { id } = req.params;
    const b = req.body || {};
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      // 索引：结算单号唯一（兼容历史：仅对非空值施加唯一约束）
      try { await settlementsCol.createIndex({ settlement_number: 1 }, { unique: true, partialFilterExpression: { settlement_number: { $exists: true, $ne: null } } }); } catch (_) {}

      // 服务端生成结算单号，忽略客户端传入，确保不可修改与全局唯一
      const pad2 = (n) => String(n).padStart(2, '0');
      const genNumber = () => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const MM = pad2(now.getMonth() + 1);
        const dd = pad2(now.getDate());
        const hh = pad2(now.getHours());
        const mm = pad2(now.getMinutes());
        const ss = pad2(now.getSeconds());
        const rand = Math.floor(Math.random() * 9000) + 1000; // 4位随机数
        return `JS${yyyy}${MM}${dd}${hh}${mm}${ss}${rand}`;
      };

      const baseDoc = {
        order_id: _id,
        contract_name: b.contractName || null,
        settlement_date: b.settlementDate,
        settlement_amount: b.settlementAmount,
        attachments: b.attachments ?? null,
        remark: b.remark || null,
        createdAt: new Date().toISOString(),
      };

      let attempts = 0;
      let insertResult = null;
      let finalNumber = null;
      while (attempts < 5) {
        const num = genNumber();
        try {
          insertResult = await settlementsCol.insertOne({ ...baseDoc, settlement_number: num });
          finalNumber = num;
          break;
        } catch (err) {
          const msg = String(err?.message || '');
          if (err?.code === 11000 || msg.includes('duplicate key')) {
            attempts += 1;
            continue; // 再试一次生成
          }
          throw err;
        }
      }
      if (!insertResult) {
        return res.status(500).json({ ok: false, error: '生成唯一结算单号失败，请重试' });
      }
      res.json({ ok: true, id: String(insertResult.insertedId), settlementNumber: finalNumber });
    } catch (err) {
      console.error('[Orders.Mongo] Add settlement error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Add settlement error' });
    }
  });

  // 结清记录
  router.post('/:id/clearances', async (req, res) => {
    const { id } = req.params;
    const b = req.body || {};
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const r = await clearancesCol.insertOne({
        order_id: _id,
        clearance_number: b.clearanceNumber,
        contract_name: b.contractName || null,
        clearance_date: b.clearanceDate,
        clearance_amount: b.clearanceAmount ?? null,
        attachments: b.attachments ?? null,
        remark: b.remark || null,
        createdAt: new Date().toISOString(),
      });
      res.json({ ok: true, id: String(r.insertedId) });
    } catch (err) {
      console.error('[Orders.Mongo] Add clearance error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Add clearance error' });
    }
  });

  // 删除订单（严格校验 + 事务 + 操作日志）
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const o = await orders.findOne({ _id });
      if (!o) return res.status(404).json({ ok: false, error: 'Order not found' });

      // 简易权限校验：需要 superadmin 或包含权限标识头
      const role = (req.headers['x-role'] || '').toString();
      const perms = (req.headers['x-permissions'] || '').toString();
      const canDelete = role === 'superadmin' || perms.includes('合同管理-删除');
      if (!canDelete) {
        return res.status(403).json({ ok: false, error: '无删除权限：仅允许具有“合同管理-删除”权限的用户执行此操作' });
      }

      // 关联单据检查
      const [entriesCnt, exitsCnt, receiptsCnt, refundsCnt, suspensionsCnt, claimsCnt, settlementsCnt, clearancesCnt] = await Promise.all([
        entriesCol.countDocuments({ order_id: _id }),
        exitsCol.countDocuments({ order_id: _id }),
        receiptsCol.countDocuments({ order_id: _id }),
        refundsCol.countDocuments({ order_id: _id }),
        suspensionsCol.countDocuments({ order_id: _id }),
        claimsCol.countDocuments({ order_id: _id }),
        settlementsCol.countDocuments({ order_id: _id }),
        clearancesCol.countDocuments({ order_id: _id }),
      ]);
      const associations = {
        entries: entriesCnt,
        exits: exitsCnt,
        receipts: receiptsCnt,
        refunds: refundsCnt,
        suspensions: suspensionsCnt,
        claims: claimsCnt,
        settlements: settlementsCnt,
        clearances: clearancesCnt,
      };
      const assocTotal = Object.values(associations).reduce((a, b) => a + b, 0);
      const operator = (req.headers['x-user-name'] || 'unknown').toString();
      const contractNumber = o.contract_number;
      const contractName = [o.customer_name, o.project_name].filter(Boolean).join(' / ');

      if (assocTotal > 0) {
        // 记录阻止删除的日志
        try {
          await opLogsCol.insertOne({
            type: 'order_delete',
            order_id: _id,
            contract_number: contractNumber,
            contract_name: contractName,
            operator,
            role,
            validation_result: 'blocked',
            associations,
            createdAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('[Orders.Mongo] op log insert failed:', e?.message || e);
        }
        return res.status(400).json({ ok: false, error: '该合同下存在关联单据，请先删除所有关联单据后再执行合同删除操作', data: { contractNumber, contractName, associations } });
      }

      // 事务删除（如不支持事务，回退为非事务模式）
      const client = req.app?.locals?.mongoClient;
      const session = client && typeof client.startSession === 'function' ? client.startSession() : null;
      const now = new Date().toISOString();
      const runDeletes = async (sess) => {
        await orders.deleteOne({ _id }, { session: sess });
        await itemsCol.deleteMany({ order_id: _id }, { session: sess });
        await receiptsCol.deleteMany({ order_id: _id }, { session: sess });
        await refundsCol.deleteMany({ order_id: _id }, { session: sess });
        await suspensionsCol.deleteMany({ order_id: _id }, { session: sess });
        await claimsCol.deleteMany({ order_id: _id }, { session: sess });
        await settlementsCol.deleteMany({ order_id: _id }, { session: sess });
        await clearancesCol.deleteMany({ order_id: _id }, { session: sess });
        await entriesCol.deleteMany({ order_id: _id }, { session: sess });
        await exitsCol.deleteMany({ order_id: _id }, { session: sess });
        await equipmentsCol.updateMany(
          { $or: [ { currentOrderId: _id }, { currentOrderId: String(_id) } ] },
          { $set: { rentalStatus: 'waiting', contractName: null, currentOrderId: null, updatedAt: now } },
          { session: sess }
        );
      };

      if (session) {
        try {
          await session.withTransaction(async () => {
            await runDeletes(session);
          });
        } catch (e) {
          console.error('[Orders.Mongo] Transaction delete error:', e);
          try { await session.abortTransaction(); } catch (_) {}
          return res.status(500).json({ ok: false, error: e?.message || 'Delete error (transaction)' });
        } finally {
          await session.endSession();
        }
      } else {
        // 回退：非事务模式
        await runDeletes(null);
      }

      // 操作日志：删除成功
      try {
        await opLogsCol.insertOne({
          type: 'order_delete',
          order_id: _id,
          contract_number: contractNumber,
          contract_name: contractName,
          operator,
          role,
          validation_result: 'ok',
          associations,
          transaction_used: !!session,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('[Orders.Mongo] op log insert failed:', e?.message || e);
      }

      res.json({ ok: true });
      try { req.app?.locals?.broadcast?.({ type: 'order.deleted', orderId: String(id) }); } catch (_) {}
      try { req.app?.locals?.broadcast?.({ type: 'equipment.status.changed', orderId: String(id), codes: [] }); } catch (_) {}
    } catch (err) {
      console.error('[Orders.Mongo] Delete error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete error' });
    }
  });

  return router;
}