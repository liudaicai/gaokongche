import express from 'express';
import { createAuditLog, AuditAction } from '../utils/auditLog.js';

const toDto = (row) => ({
  id: String(row.id),
  contract_number: row.contract_number,
  lessor_id: row.lessor_id ? String(row.lessor_id) : undefined,
  lessor_company_id: row.lessor_company_id ? String(row.lessor_company_id) : undefined,  // 添加对 lessor_company_id 的支持
  lessor_name: row.lessor_name || row.lessor_company_name || undefined,  // 优先使用公司名称
  customer_id: row.customer_id ? String(row.customer_id) : undefined,
  customer_name: row.customer_name || undefined,
  project_name: row.project_name || undefined,
  business_manager_id: row.business_manager_id ? String(row.business_manager_id) : undefined,
  business_manager_name: row.business_manager_name || undefined,
  month_calculation_method: row.month_calculation_method || undefined,
  delivery_location: row.delivery_location || undefined,
  payment_agreement: row.payment_agreement || undefined,
  shipping_fee_reduction: row.shipping_fee_reduction || undefined,
  shipping_fee_calculation: row.shipping_fee_calculation || undefined,
  is_tax_invoice: row.is_tax_invoice || undefined,
  invoice_tax_rate: row.invoice_tax_rate || undefined,
  construction_category: row.construction_category || undefined,
  other_agreements: row.other_agreements || undefined,
  attachments: [],
  rented_equipment_ids: [],
  createdAt: row.created_at?.toISOString?.() || row.created_at || new Date().toISOString(),
  updatedAt: row.updated_at?.toISOString?.() || row.updated_at || new Date().toISOString(),
});

export default function buildOrdersRouterMySQL(pool) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      console.log('[Orders.MySQL] GET / - Fetching orders list');
            const sql = `
        SELECT o.id, o.contract_number, o.project_name, o.delivery_location, o.payment_agreement,
               o.month_calculation_method, o.created_at, o.updated_at,
               o.lessor_id, o.lessor_company_id, o.customer_id, o.business_manager_id,
               o.shipping_fee_reduction, o.shipping_fee_calculation, o.is_tax_invoice,
               o.invoice_tax_rate, o.construction_category, o.other_agreements,
               l.name AS lessor_name, 
               lc.company_name AS lessor_company_name,
               c.name AS customer_name, e.name AS business_manager_name,
               COALESCE(entry_stats.entry_count, 0) AS entry_count,
               COALESCE(exit_stats.exit_count, 0) AS exit_count,
               COALESCE(receipt_stats.receipts_sum, 0) AS receipts_sum,
               COALESCE(refund_stats.refunds_sum, 0) AS refunds_sum
        FROM orders o
        LEFT JOIN customers l ON l.id = o.lessor_id
        LEFT JOIN company_verifications lc ON lc.id = o.lessor_company_id
        LEFT JOIN customers c ON c.id = o.customer_id
        LEFT JOIN employees e ON e.id = o.business_manager_id
        LEFT JOIN (SELECT order_id, COALESCE(SUM(equipment_count), 0) AS entry_count FROM order_entries GROUP BY order_id
        ) entry_stats ON entry_stats.order_id = o.id
        LEFT JOIN (SELECT order_id, COALESCE(SUM(equipment_count), 0) AS exit_count FROM order_exits GROUP BY order_id
        ) exit_stats ON exit_stats.order_id = o.id
        LEFT JOIN (
          SELECT order_id, SUM(amount) AS receipts_sum
          FROM order_receipts
          GROUP BY order_id
        ) receipt_stats ON receipt_stats.order_id = o.id
        LEFT JOIN (
          SELECT order_id, SUM(amount) AS refunds_sum
          FROM order_refunds
          GROUP BY order_id
        ) refund_stats ON refund_stats.order_id = o.id
        WHERE 1=1
        ORDER BY o.updated_at DESC, o.id DESC`;
      console.log('[Orders.MySQL] Executing SQL query');
      const [rows] = await pool.query(sql);
      console.log('[Orders.MySQL] Query successful, rows:', rows.length);

      // 映射数据，添加status字段
      const ordersWithStatus = rows.map((row) => ({
        ...toDto(row),
        status: {
          entryCount: Number(row.entry_count || 0),
          exitCount: Number(row.exit_count || 0),
          performanceStatus: '履约',
          actualReceivedAmount: Number(row.receipts_sum || 0) - Number(row.refunds_sum || 0),
        },
      }));

      res.json({ ok: true, data: ordersWithStatus });
    } catch (err) {
      console.error('[Orders.MySQL] List error:', err);
      console.error('[Orders.MySQL] Error code:', err.code);
      console.error('[Orders.MySQL] Error sqlMessage:', err.sqlMessage);
      console.error('[Orders.MySQL] Error sqlState:', err.sqlState);
      res.status(500).json({ ok: false, error: err?.message || 'List error' });
    }
  });

  // 删除前预检查：返回关联单据统计，供前端阻止删除
  router.get('/:id/delete-check', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid order id' });
    }
    try {
      const [orderRows] = await pool.query(
        `SELECT o.id, o.contract_number, o.project_name, c.name AS customer_name
         FROM orders o
         LEFT JOIN customers c ON c.id = o.customer_id
         WHERE o.id = ?`,
        [id]
      );
      const order = (orderRows || [])[0];
      if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });

      const queries = [
        pool.query('SELECT COUNT(*) AS cnt FROM order_entries WHERE order_id = ?', [id]),
        pool.query('SELECT COUNT(*) AS cnt FROM order_exits WHERE order_id = ?', [id]),
        pool.query('SELECT COUNT(*) AS cnt FROM order_receipts WHERE order_id = ?', [id]),
        pool.query('SELECT COUNT(*) AS cnt FROM order_refunds WHERE order_id = ?', [id]),
        // 查询报停记录数
        pool.query('SELECT COUNT(*) AS cnt FROM order_suspensions WHERE order_id = ?', [id]),
        pool.query('SELECT COUNT(*) AS cnt FROM order_claims WHERE order_id = ?', [id]),
        pool.query('SELECT COUNT(*) AS cnt FROM order_settlements WHERE order_id = ?', [id]),
        pool.query('SELECT COUNT(*) AS cnt FROM order_clearances WHERE order_id = ?', [id]),
        pool.query('SELECT COUNT(*) AS cnt FROM order_invoices WHERE order_id = ?', [id]),
      ];
      const results = await Promise.all(queries);
      const [entriesCnt] = results[0][0];
      const [exitsCnt] = results[1][0];
      const [receiptsCnt] = results[2][0];
      const [refundsCnt] = results[3][0];
      const [suspensionsCnt] = results[4][0];
      const [claimsCnt] = results[5][0];
      const [settlementsCnt] = results[6][0];
      const [clearancesCnt] = results[7][0];
      const [invoicesCnt] = results[8][0];

      const associations = {
        entries: Number(entriesCnt?.cnt || 0),
        exits: Number(exitsCnt?.cnt || 0),
        receipts: Number(receiptsCnt?.cnt || 0),
        refunds: Number(refundsCnt?.cnt || 0),
        suspensions: Number(suspensionsCnt?.cnt || 0),
        claims: Number(claimsCnt?.cnt || 0),
        settlements: Number(settlementsCnt?.cnt || 0),
        clearances: Number(clearancesCnt?.cnt || 0),
        invoices: Number(invoicesCnt?.cnt || 0),
      };

      const contractNumber = order.contract_number || null;
      const contractName = [order.customer_name, order.project_name].filter(Boolean).join(' / ');
      res.json({ ok: true, data: { contractNumber, contractName, associations } });
    } catch (err) {
      console.error('[Orders.MySQL] Delete-check error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete-check error' });
    }
  });

  // 订单详情：返回基础字段、设备项与状态摘要
  router.get('/:id', async (req, res) => {
    try {
      console.log('[Hit] orders(mysql) detail GET', req.originalUrl);
      console.log('[Orders.MySQL] Params:', req.params);
      // 如果路径包含 /suspensions，说明应该被嵌套路由处理，不应该匹配这里
      if (req.originalUrl.includes('/suspensions')) {
        console.log('[Orders.MySQL] ⚠️ 警告：/:id 路由匹配了包含 /suspensions 的路径，这不应该发生！');
        return res.status(404).json({ ok: false, error: 'Route not found' });
      }
    } catch (_) { }
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid order id' });
    }
    try {
      const [orderRows] = await pool.query(
        `SELECT o.id, o.contract_number, o.project_name, o.delivery_location, o.payment_agreement,
                o.month_calculation_method, o.created_at, o.updated_at,
                o.lessor_id, o.lessor_company_id, o.customer_id, o.business_manager_id,
                o.shipping_fee_reduction, o.shipping_fee_calculation, o.is_tax_invoice,
                o.invoice_tax_rate, o.construction_category, o.other_agreements,
                l.name AS lessor_name, 
                lc.company_name AS lessor_company_name,
                c.name AS customer_name, e.name AS business_manager_name
         FROM orders o
         LEFT JOIN customers l ON l.id = o.lessor_id
         LEFT JOIN company_verifications lc ON lc.id = o.lessor_company_id
         LEFT JOIN customers c ON c.id = o.customer_id
         LEFT JOIN employees e ON e.id = o.business_manager_id
         WHERE o.id = ?`,
        [id]
      );
      const o = (orderRows || [])[0];
      if (!o) return res.status(404).json({ ok: false, error: 'Order not found' });

      // 设备项
      let itemRows = [];
      try {
        const [rows] = await pool.query(
          `SELECT id, equipment_type, height, quantity, daily_rate, monthly_rate, deposit,
                  shipping_fee, modification_fee, scheduled_entry_date, estimated_exit_date,
                  rental_period, shipping_type
           FROM order_items WHERE order_id = ? ORDER BY id ASC`,
          [id]
        );
        itemRows = rows || [];
      } catch (e) {
        // 容错：当 order_items 表不存在或字段不匹配时，返回空设备项而非 500
        itemRows = [];
      }

      // 进退场记录详情 - 查询并解析JSON字段
      let entryRows = [];
      let exitRows = [];
      try {
        const [entries] = await pool.query(
          `SELECT * FROM order_entries WHERE order_id = ? ORDER BY created_at DESC, id DESC`,
          [id]
        );
        // 解析 attachments_json 字段
        entryRows = (entries || []).map(entry => {
          const extraData = typeof entry.attachments_json === 'string'
            ? JSON.parse(entry.attachments_json || '{}')
            : (entry.attachments_json || {});

          return {
            id: entry.id,
            orderId: entry.order_id,
            equipmentId: entry.equipment_id,
            entryDate: entry.entry_date,
            entryLocation: entry.entry_location,
            entryPerson: entry.entry_person,
            entryContact: entry.entry_contact,
            logisticsCost: entry.logistics_cost,
            equipment_count: entry.equipment_count || 1, // 设备数量
            createdAt: entry.created_at,
            updatedAt: entry.updated_at,
            ...extraData
          };
        });

        // 为每条进场记录查询设备详情（包含自编号）
        console.log(`[Orders.MySQL] 🔍 开始查询进场记录的设备详情，记录数: ${entryRows.length}`);
        for (const entry of entryRows) {
          if (entry.equipmentCodes && Array.isArray(entry.equipmentCodes)) {
            console.log(`[Orders.MySQL] 进场记录 ${entry.id}，设备编号: ${JSON.stringify(entry.equipmentCodes)}`);
            const equipmentDetails = [];
            for (const code of entry.equipmentCodes) {
              try {
                const [equipmentRows] = await pool.query(
                  `SELECT code, custom_code, brand, type, model, height FROM equipments WHERE code = ? LIMIT 1`,
                  [code]
                );
                if (equipmentRows.length > 0) {
                  const eq = equipmentRows[0];
                  const detail = {
                    code: eq.code,
                    customCode: eq.custom_code || '',
                    brand: eq.brand || '',
                    type: eq.type || '',
                    model: eq.model || '',
                    height: eq.height || 0
                  };
                  equipmentDetails.push(detail);
                  console.log(`[Orders.MySQL]   设备 ${code} 详情: customCode=${detail.customCode}`);
                }
              } catch (err) {
                console.error('[Orders.MySQL] Error fetching equipment details:', err);
              }
            }
            entry.equipmentDetails = equipmentDetails;
            console.log(`[Orders.MySQL]   进场记录 ${entry.id} 的 equipmentDetails 数量: ${equipmentDetails.length}`);
          }
        }
      } catch (e) {
        console.log('[Orders.MySQL] order_entries query error (skipped):', e.message);
        entryRows = [];
      }

      try {
        const [exits] = await pool.query(
          `SELECT * FROM order_exits WHERE order_id = ? ORDER BY created_at DESC, id DESC`,
          [id]
        );
        // 解析 attachments_json 字段
        exitRows = (exits || []).map(exit => {
          const extraData = typeof exit.attachments_json === 'string'
            ? JSON.parse(exit.attachments_json || '{}')
            : (exit.attachments_json || {});

          return {
            id: exit.id,
            orderId: exit.order_id,
            equipmentId: exit.equipment_id,
            exitDate: exit.exit_date,
            logisticsCost: exit.logistics_cost,
            equipment_count: exit.equipment_count || 1, // 设备数量
            createdAt: exit.created_at,
            updatedAt: exit.updated_at,
            ...extraData
          };
        });

        // 为每条退场记录查询设备详情（包含自编号）
        console.log(`[Orders.MySQL] 🔍 开始查询退场记录的设备详情，记录数: ${exitRows.length}`);
        for (const exit of exitRows) {
          if (exit.equipmentCodes && Array.isArray(exit.equipmentCodes)) {
            console.log(`[Orders.MySQL] 退场记录 ${exit.id}，设备编号: ${JSON.stringify(exit.equipmentCodes)}`);
            const equipmentDetails = [];
            for (const code of exit.equipmentCodes) {
              try {
                const [equipmentRows] = await pool.query(
                  `SELECT code, custom_code, brand, type, model, height FROM equipments WHERE code = ? LIMIT 1`,
                  [code]
                );
                if (equipmentRows.length > 0) {
                  const eq = equipmentRows[0];
                  const detail = {
                    code: eq.code,
                    customCode: eq.custom_code || '',
                    brand: eq.brand || '',
                    type: eq.type || '',
                    model: eq.model || '',
                    height: eq.height || 0
                  };
                  equipmentDetails.push(detail);
                  console.log(`[Orders.MySQL]   设备 ${code} 详情: customCode=${detail.customCode}`);
                }
              } catch (err) {
                console.error('[Orders.MySQL] Error fetching equipment details:', err);
              }
            }
            exit.equipmentDetails = equipmentDetails;
            console.log(`[Orders.MySQL]   退场记录 ${exit.id} 的 equipmentDetails 数量: ${equipmentDetails.length}`);
          }
        }
      } catch (e) {
        console.log('[Orders.MySQL] order_exits query error (skipped):', e.message);
        exitRows = [];
      }

      // 统计：进退场设备数量与实收金额
      // ❗️ 使用 equipment_count 字段累加实际设备数量，而不是记录条数
      const entryCount = (entryRows || []).reduce((sum, r) => sum + (Number(r.equipment_count) || r.equipmentCodes?.length || 1), 0);
      const exitCount = (exitRows || []).reduce((sum, r) => sum + (Number(r.equipment_count) || r.equipmentCodes?.length || 1), 0);
      const [receiptsSumRows] = await pool.query('SELECT COALESCE(SUM(amount), 0) AS sum FROM order_receipts WHERE order_id = ?', [id]);
      const [refundsSumRows] = await pool.query('SELECT COALESCE(SUM(amount), 0) AS sum FROM order_refunds WHERE order_id = ?', [id]);
      const receiptsSum = Number((receiptsSumRows || [{}])[0]?.sum || 0);
      const refundsSum = Number((refundsSumRows || [{}])[0]?.sum || 0);

      // 计算在租设备：从进场记录中获取所有设备，排除已退场的设备
      // ⚠️ 关键修复：entryRows 已经解析过 attachments_json，equipmentCodes 已经在对象顶层
      const enteredEquipmentCodes = new Set();
      console.log(`[Orders.MySQL] 🔍 开始计算在租设备，订单ID: ${id}`);
      console.log(`[Orders.MySQL] entryRows数量: ${entryRows.length}`);
      (entryRows || []).forEach((entry, idx) => {
        try {
          console.log(`[Orders.MySQL] 处理进场记录 ${idx + 1}:`, {
            id: entry.id,
            hasEquipmentCodes: !!entry.equipmentCodes,
            equipmentCodes: entry.equipmentCodes,
            equipmentCodesType: typeof entry.equipmentCodes,
            isArray: Array.isArray(entry.equipmentCodes)
          });
          // entryRows 已经通过 ...extraData 展开，equipmentCodes 直接在 entry 对象中
          const codes = entry?.equipmentCodes || [];
          if (Array.isArray(codes)) {
            console.log(`[Orders.MySQL]   设备编号数组: ${JSON.stringify(codes)}`);
            codes.forEach(code => {
              // 确保设备编号统一为字符串类型
              if (code) {
                const codeStr = String(code);
                enteredEquipmentCodes.add(codeStr);
                console.log(`[Orders.MySQL]   添加到在租集合: ${codeStr}`);
              }
            });
          } else {
            console.log(`[Orders.MySQL]   ⚠️ equipmentCodes 不是数组或为空`);
          }
        } catch (e) {
          console.error('[Orders.MySQL] Parse entry equipmentCodes error:', e);
        }
      });
      console.log(`[Orders.MySQL] ✅ 进场设备集合大小: ${enteredEquipmentCodes.size}`);
      console.log(`[Orders.MySQL] ✅ 进场设备集合内容: ${JSON.stringify(Array.from(enteredEquipmentCodes))}`);

      const exitedEquipmentCodes = new Set();
      console.log(`[Orders.MySQL] exitRows数量: ${exitRows.length}`);
      (exitRows || []).forEach((exit, idx) => {
        try {
          console.log(`[Orders.MySQL] 处理退场记录 ${idx + 1}:`, {
            id: exit.id,
            hasEquipmentCodes: !!exit.equipmentCodes,
            equipmentCodes: exit.equipmentCodes
          });
          // exitRows 已经通过 ...extraData 展开，equipmentCodes 直接在 exit 对象中
          const codes = exit?.equipmentCodes || [];
          if (Array.isArray(codes)) {
            codes.forEach(code => {
              // 确保设备编号统一为字符串类型
              if (code) exitedEquipmentCodes.add(String(code));
            });
          }
        } catch (e) {
          console.error('[Orders.MySQL] Parse exit equipmentCodes error:', e);
        }
      });
      console.log(`[Orders.MySQL] ✅ 退场设备集合大小: ${exitedEquipmentCodes.size}`);

      // 在租设备 = 已进场 - 已退场
      const rentedEquipmentCodes = Array.from(enteredEquipmentCodes).filter(
        code => !exitedEquipmentCodes.has(String(code))
      );

      console.log('[Orders.MySQL] ⚠️ Rented equipment calculation for order', id);
      console.log('[Orders.MySQL]   - Total entry records:', entryRows.length);
      console.log('[Orders.MySQL]   - Total exit records:', exitRows.length);
      console.log('[Orders.MySQL]   - Entered equipment codes:', Array.from(enteredEquipmentCodes));
      console.log('[Orders.MySQL]   - Exited equipment codes:', Array.from(exitedEquipmentCodes));
      console.log('[Orders.MySQL]   - 🔑 RENTED equipment codes:', rentedEquipmentCodes);
      console.log('[Orders.MySQL]   - 🔑 RENTED equipment ids (final):', rentedEquipmentCodes.length > 0 ? [rentedEquipmentCodes] : []);

      const data = {
        id: String(o.id),
        contract_number: o.contract_number,
        lessor_id: o.lessor_id ? String(o.lessor_id) : undefined,
        lessor_company_id: o.lessor_company_id ? String(o.lessor_company_id) : undefined,  // 添加对 lessor_company_id 的支持
        lessor_name: o.lessor_name || o.lessor_company_name || undefined,  // 优先使用公司名称
        customer_id: o.customer_id ? String(o.customer_id) : undefined,
        customer_name: o.customer_name || undefined,
        project_name: o.project_name || undefined,
        business_manager_id: o.business_manager_id ? String(o.business_manager_id) : undefined,
        business_manager_name: o.business_manager_name || undefined,
        month_calculation_method: o.month_calculation_method || undefined,
        delivery_location: o.delivery_location || undefined,
        payment_agreement: o.payment_agreement || undefined,
        shipping_fee_reduction: o.shipping_fee_reduction || undefined,
        shipping_fee_calculation: o.shipping_fee_calculation || undefined,
        is_tax_invoice: o.is_tax_invoice || undefined,
        invoice_tax_rate: o.invoice_tax_rate || undefined,
        construction_category: o.construction_category || undefined,
        other_agreements: o.other_agreements || undefined,
        attachments: [],
        rented_equipment_ids: rentedEquipmentCodes.length > 0 ? [rentedEquipmentCodes] : [],
        equipment_items: (itemRows || []).map((it) => ({
          id: String(it.id),
          equipment_type: it.equipment_type || undefined,
          height: it.height || undefined,
          quantity: it.quantity != null ? Number(it.quantity) : undefined,
          daily_rate: it.daily_rate != null ? Number(it.daily_rate) : undefined,
          monthly_rate: it.monthly_rate != null ? Number(it.monthly_rate) : undefined,
          deposit: it.deposit != null ? Number(it.deposit) : undefined,
          shipping_fee: it.shipping_fee != null ? Number(it.shipping_fee) : undefined,
          modification_fee: it.modification_fee != null ? Number(it.modification_fee) : undefined,
          scheduled_entry_date: it.scheduled_entry_date || undefined,
          estimated_exit_date: it.estimated_exit_date || undefined,
          rental_period: it.rental_period != null ? Number(it.rental_period) : undefined,
          shipping_type: it.shipping_type || '双程',
        })),
        entries: entryRows,
        exits: exitRows,
        receipts: [],
        refunds: [],
        suspensions: [],
        claims: [],
        settlements: [],
        clearances: [],
        status: {
          entryCount,
          exitCount,
          totalReceivedAmount: receiptsSum - refundsSum,
          actualReceivedAmount: receiptsSum - refundsSum,
        },
        createdAt: o.created_at?.toISOString?.() || o.created_at || new Date().toISOString(),
        updatedAt: o.updated_at?.toISOString?.() || o.updated_at || new Date().toISOString(),
      };

      console.log(`[Orders.MySQL] ✅ Data对象已创建，订单ID: ${id}`);
      console.log(`[Orders.MySQL] 当前 receipts 长度: ${data.receipts.length}`);

      // 收款记录
      try {
        console.log(`[Orders.MySQL] 查询订单 ${id} 的收款记录...`);
        const [receiptRows] = await pool.query(
          `SELECT id, amount, receipt_date, attachments_json, created_at
           FROM order_receipts WHERE order_id = ? ORDER BY receipt_date DESC, id DESC`,
          [id]
        );
        console.log(`[Orders.MySQL] 查询到 ${receiptRows.length} 条收款记录`);
        data.receipts = (receiptRows || []).map((it) => {
          // 解析 attachments_json 字段
          const extraData = it.attachments_json
            ? (typeof it.attachments_json === 'string' ? JSON.parse(it.attachments_json) : it.attachments_json)
            : {};

          return {
            id: String(it.id),
            receiptAmount: Number(it.amount || 0),
            amount: Number(it.amount || 0), // 兼容旧字段
            receiptDate: it.receipt_date || undefined,
            receipt_date: it.receipt_date || undefined, // 兼容旧字段
            createdAt: it.created_at || undefined,
            // 从JSON字段中解析的数据
            receiptNumber: extraData.receiptNumber,
            contractName: extraData.contractName,
            paymentMethod: extraData.paymentMethod,
            remark: extraData.remark,
            attachments: extraData.attachments || []
          };
        });
        console.log(`[Orders.MySQL] 处理后的收款记录数量: ${data.receipts.length}`);
      } catch (e) {
        console.error('[Orders.MySQL] Error parsing receipts:', e);
        data.receipts = [];
      }

      // 退款记录
      try {
        const [refundRows] = await pool.query(
          `SELECT id, amount, refund_date, attachments_json, created_at
           FROM order_refunds WHERE order_id = ? ORDER BY refund_date DESC, id DESC`,
          [id]
        );
        data.refunds = (refundRows || []).map((it) => {
          // 解析 attachments_json 字段
          const extraData = it.attachments_json
            ? (typeof it.attachments_json === 'string' ? JSON.parse(it.attachments_json) : it.attachments_json)
            : {};

          return {
            id: String(it.id),
            refundAmount: Number(it.amount || 0),
            amount: Number(it.amount || 0), // 兼容旧字段
            refundDate: it.refund_date || undefined,
            refund_date: it.refund_date || undefined, // 兼容旧字段
            createdAt: it.created_at || undefined,
            // 从JSON字段中解析的数据
            refundNumber: extraData.refundNumber,
            contractName: extraData.contractName,
            paymentMethod: extraData.paymentMethod,
            remark: extraData.remark,
            attachments: extraData.attachments || []
          };
        });
      } catch (e) {
        console.error('[Orders.MySQL] Error parsing refunds:', e);
        data.refunds = [];
      }

      // 报停记录
      try {
        const [suspRows] = await pool.query(
          `SELECT id, start_date, end_date, attachments, created_at
           FROM order_suspensions WHERE order_id = ? ORDER BY start_date DESC, id DESC`,
          [id]
        );
        data.suspensions = (suspRows || []).map((it) => {
          // 解析 attachments 字段
          const extraData = it.attachments
            ? (typeof it.attachments === 'string' ? JSON.parse(it.attachments) : it.attachments)
            : {};

          return {
            id: String(it.id),
            startDate: it.start_date || extraData.startDate,
            endDate: it.end_date || extraData.endDate,
            createdAt: it.created_at || undefined,
            // 从JSON字段中解析的数据
            suspensionNumber: extraData.suspensionNumber,
            contractName: extraData.contractName,
            suspensionType: extraData.suspensionType,
            suspensionDays: Number(extraData.suspensionDays || 0),
            equipmentSelections: extraData.equipmentSelections || [],
            reason: extraData.reason,
            attachments: extraData.attachments || []
          };
        });
      } catch (e) {
        console.error('[Orders.MySQL] Error parsing suspensions:', e);
        data.suspensions = [];
      }

      // 索赔记录
      try {
        const [claimRows] = await pool.query(
          `SELECT id, claim_amount, claim_date, attachments_json, created_at
           FROM order_claims WHERE order_id = ? ORDER BY claim_date DESC, id DESC`,
          [id]
        );
        data.claims = (claimRows || []).map((it) => {
          // 解析 attachments_json 字段
          const extraData = it.attachments_json
            ? (typeof it.attachments_json === 'string' ? JSON.parse(it.attachments_json) : it.attachments_json)
            : {};

          return {
            id: String(it.id),
            claimAmount: Number(it.claim_amount || 0),
            claimDate: it.claim_date || undefined,
            createdAt: it.created_at || undefined,
            // 从JSON字段中解析的数据
            claimNumber: extraData.claimNumber,
            contractName: extraData.contractName,
            claimType: extraData.claimType,
            equipmentSelections: extraData.equipmentSelections || [],
            reason: extraData.reason,
            attachments: extraData.attachments || []
          };
        });
      } catch (e) {
        console.error('[Orders.MySQL] Error parsing claims:', e);
        data.claims = [];
      }

      // 结算记录
      try {
        const [settlementRows] = await pool.query(
          `SELECT id, settlement_amount, settlement_date, attachments_json, created_at
           FROM order_settlements WHERE order_id = ? ORDER BY settlement_date DESC, id DESC`,
          [id]
        );
        data.settlements = (settlementRows || []).map((it) => {
          // 解析 attachments_json 字段
          const extraData = it.attachments_json
            ? (typeof it.attachments_json === 'string' ? JSON.parse(it.attachments_json) : it.attachments_json)
            : {};

          return {
            id: String(it.id),
            settlementAmount: Number(it.settlement_amount || 0),
            settlementDate: it.settlement_date || undefined,
            createdAt: it.created_at || undefined,
            // 从JSON字段中解析的数据
            settlementNumber: extraData.settlementNumber,
            contractName: extraData.contractName,
            cycleStartDate: extraData.cycleStartDate,
            cycleEndDate: extraData.cycleEndDate,
            remark: extraData.remark,
            status: extraData.status,
            attachments: extraData.attachments || []
          };
        });
      } catch (e) {
        console.error('[Orders.MySQL] Error parsing settlements:', e);
        data.settlements = [];
      }

      // 清款记录
      try {
        const [clearanceRows] = await pool.query(
          `SELECT id, clearance_amount, clearance_date, attachments_json, created_at
           FROM order_clearances WHERE order_id = ? ORDER BY clearance_date DESC, id DESC`,
          [id]
        );
        data.clearances = (clearanceRows || []).map((it) => {
          // 解析 attachments_json 字段
          const extraData = it.attachments_json
            ? (typeof it.attachments_json === 'string' ? JSON.parse(it.attachments_json) : it.attachments_json)
            : {};

          return {
            id: String(it.id),
            clearanceAmount: Number(it.clearance_amount || 0),
            clearanceDate: it.clearance_date || undefined,
            createdAt: it.created_at || undefined,
            // 从JSON字段中解析的数据
            clearanceNumber: extraData.clearanceNumber,
            contractName: extraData.contractName,
            remark: extraData.remark,
            attachments: extraData.attachments || []
          };
        });
      } catch (e) {
        console.error('[Orders.MySQL] Error parsing clearances:', e);
        data.clearances = [];
      }

      console.log(`[Orders.MySQL] 🎯 准备返回订单详情，订单ID: ${id}`);
      console.log(`[Orders.MySQL] receipts 数量: ${data.receipts.length}`);
      console.log(`[Orders.MySQL] refunds 数量: ${data.refunds.length}`);
      console.log(`[Orders.MySQL] claims 数量: ${data.claims.length}`);

      // 调试日志：检查进场记录中的 equipmentDetails
      if (data.entries && data.entries.length > 0) {
        console.log(`[Orders.MySQL] 📦 进场记录数量: ${data.entries.length}`);
        data.entries.forEach((entry, idx) => {
          console.log(`[Orders.MySQL]   进场${idx + 1}: equipmentDetails存在=${!!entry.equipmentDetails}, 数量=${entry.equipmentDetails?.length || 0}`);
          if (entry.equipmentDetails && entry.equipmentDetails.length > 0) {
            console.log(`[Orders.MySQL]   进场${idx + 1} equipmentDetails:`, JSON.stringify(entry.equipmentDetails));
          }
        });
      }

      res.json({ ok: true, data });
    } catch (err) {
      console.error('[Orders.MySQL] Detail error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Detail error' });
    }
  });

  // 创建订单
  router.post('/', async (req, res) => {
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();
      console.log('[Orders.MySQL] 开始创建订单事务');
      console.log('[Orders.MySQL] Request body:', JSON.stringify(req.body, null, 2));

      // 不再检查 company_id（多租户已移除）
      const companyId = null;

      // 支持驼峰和下划线两种命名格式
      const {
        contractNumber, contract_number,
        lessorId, lessor_id,
        lessorCompanyId, lessor_company_id,  // 添加对 lessor_company_id 的支持
        customerId, customer_id,
        projectName, project_name,
        businessManagerId, business_manager_id,
        monthCalculationMethod, month_calculation_method,
        deliveryLocation, delivery_location,
        paymentAgreement, payment_agreement,
        shippingFeeReduction, shipping_fee_reduction,
        shippingFeeCalculation, shipping_fee_calculation,
        isTaxInvoice, is_tax_invoice,
        invoiceTaxRate, invoice_tax_rate,
        constructionCategory, construction_category,
        otherAgreements, other_agreements,
        equipmentItems, equipment_items
      } = req.body;

      const finalContractNumber = contractNumber || contract_number;
      let finalLessorId = lessorId || lessor_id;
      const finalLessorCompanyId = lessorCompanyId || lessor_company_id;  // 获取 lessor_company_id
      const finalCustomerId = customerId || customer_id;
      const finalProjectName = projectName || project_name;
      const finalBusinessManagerId = businessManagerId || business_manager_id;
      const finalMonthCalculationMethod = monthCalculationMethod || month_calculation_method || '30天为一月';
      const finalDeliveryLocation = deliveryLocation || delivery_location;
      const finalPaymentAgreement = paymentAgreement || payment_agreement || '预付';
      const finalShippingFeeReduction = shippingFeeReduction || shipping_fee_reduction || '无减免';
      const finalShippingFeeCalculation = shippingFeeCalculation || shipping_fee_calculation || '按台计费';
      const finalIsTaxInvoice = isTaxInvoice || is_tax_invoice || '不开票';
      const finalInvoiceTaxRate = invoiceTaxRate || invoice_tax_rate || null;
      const finalConstructionCategory = constructionCategory || construction_category || '其他';
      const finalOtherAgreements = otherAgreements || other_agreements || null;
      const finalEquipmentItems = equipmentItems || equipment_items;

      console.log('[Orders.MySQL] Parsed fields:', {
        contractNumber: finalContractNumber,
        lessorId: finalLessorId,
        lessorCompanyId: finalLessorCompanyId,
        customerId: finalCustomerId,
        projectName: finalProjectName,
        businessManagerId: finalBusinessManagerId
      });

      // 验证客户是否存在（如果提供了customerId）
      if (finalCustomerId) {
        console.log('[Orders.MySQL] Validating customer exists:', finalCustomerId);
        const [customerRows] = await conn.query('SELECT id FROM customers WHERE id = ?', [finalCustomerId]);
        if (!customerRows || customerRows.length === 0) {
          console.log('[Orders.MySQL] Customer not found:', finalCustomerId);
          return res.status(400).json({
            ok: false,
            error: `客户ID ${finalCustomerId} 不存在`
          });
        }
      }
      console.log('[Orders.MySQL] Customer validated successfully');

      // 如果提供了出租方ID，进行验证
      // 出租方可以来自 customers 表或 company_verifications 表
      let validatedLessorId = finalLessorId;
      let validatedLessorCompanyId = finalLessorCompanyId;

      // 如果提供了 lessor_company_id，优先使用它
      if (finalLessorCompanyId) {
        console.log('[Orders.MySQL] Validating lessor company exists:', finalLessorCompanyId);
        const [companyRows] = await conn.query('SELECT id FROM company_verifications WHERE id = ?', [finalLessorCompanyId]);
        if (!companyRows || companyRows.length === 0) {
          console.log('[Orders.MySQL] Lessor company not found:', finalLessorCompanyId);
          return res.status(400).json({
            ok: false,
            error: `出租方公司ID ${finalLessorCompanyId} 不存在`
          });
        }
        console.log('[Orders.MySQL] Lessor company validated successfully');
        // 当使用 company_verifications 时，将 lessor_id 设为 NULL
        validatedLessorId = null;
      } else if (finalLessorId) {
        console.log('[Orders.MySQL] Validating lessor exists:', finalLessorId);
        // 检查是否在 customers 表中存在
        const [lessorRows] = await conn.query('SELECT id FROM customers WHERE id = ?', [finalLessorId]);
        if (lessorRows && lessorRows.length > 0) {
          console.log('[Orders.MySQL] Lessor validated successfully in customers table');
        } else {
          // 如果在 customers 表中不存在，检查是否在 company_verifications 表中存在
          console.log('[Orders.MySQL] Lessor not found in customers table, checking company_verifications table');
          const [companyRows] = await conn.query('SELECT id FROM company_verifications WHERE id = ?', [finalLessorId]);
          if (!companyRows || companyRows.length === 0) {
            console.log('[Orders.MySQL] Lessor not found in company_verifications table');
            // 出租方在两个表中都不存在，返回错误
            return res.status(400).json({
              ok: false,
              error: `出租方ID ${finalLessorId} 不存在`
            });
          }
          // 出租方在 company_verifications 中存在
          console.log('[Orders.MySQL] Found company in company_verifications table, using it as lessor');
          // 注意: lessor_id 是可为 NULL 的，需要判断是来自 customers 是 company_verifications
          // 此处为了不破坎数据库简整性，我们将 lessor_id 设为 NULL，使用 lessor_company_id
          validatedLessorId = null;
          validatedLessorCompanyId = finalLessorId;
        }
      }

      const now = new Date();

      // 生成合同编号（如果前端未提供）
      let contractNum = finalContractNumber;
      if (!contractNum) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const [countRows] = await conn.query(
          'SELECT COUNT(*) as cnt FROM orders WHERE DATE(created_at) = CURDATE()'
        );
        const dailyCount = (countRows[0]?.cnt || 0) + 1;
        contractNum = `HT-${dateStr}-${String(dailyCount).padStart(3, '0')}`;
      }

      // 生成临时 mongo_id（24字符）- 格式：timestamp(13) + random(11)
      const mongoId = `${Date.now()}${Math.random().toString(36).slice(2, 13).padEnd(11, '0')}`;
      console.log('[Orders.MySQL] Generated mongo_id:', mongoId);
      console.log('[Orders.MySQL] Generated contract_number:', contractNum);

      // 插入订单主表
      console.log('[Orders.MySQL] Inserting order into database...');
      const [result] = await conn.query(
        `INSERT INTO orders (
          mongo_id, contract_number, lessor_id, lessor_company_id, customer_id, project_name,
          business_manager_id, month_calculation_method, delivery_location,
          payment_agreement, shipping_fee_reduction, shipping_fee_calculation,
          is_tax_invoice, invoice_tax_rate, construction_category, other_agreements,
          company_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mongoId,
          contractNum,
          validatedLessorId || null,
          validatedLessorCompanyId || null,  // 添加 lessor_company_id
          finalCustomerId,
          finalProjectName || null,
          finalBusinessManagerId || null,
          finalMonthCalculationMethod,
          finalDeliveryLocation || null,
          finalPaymentAgreement,
          finalShippingFeeReduction,
          finalShippingFeeCalculation,
          finalIsTaxInvoice,
          finalInvoiceTaxRate,
          finalConstructionCategory,
          finalOtherAgreements,
          companyId,
          now,
          now
        ]
      );

      const orderId = result.insertId;
      console.log('[Orders.MySQL] Order created successfully, ID:', orderId);

      // 插入设备需求项
      if (finalEquipmentItems && Array.isArray(finalEquipmentItems) && finalEquipmentItems.length > 0) {
        console.log('[Orders.MySQL] Inserting equipment items, count:', finalEquipmentItems.length);
        for (const item of finalEquipmentItems) {
          console.log('[Orders.MySQL] Inserting equipment item:', JSON.stringify(item));
          await conn.query(
            `INSERT INTO order_items (
              order_id, equipment_type, height, quantity,
              daily_rate, monthly_rate, deposit, shipping_fee,
              modification_fee, scheduled_entry_date, estimated_exit_date,
              rental_period, shipping_type, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              orderId,
              item.equipmentType || item.equipment_type || null,
              item.height || null,
              item.quantity || 0,
              item.dailyRate || item.daily_rate || 0,
              item.monthlyRate || item.monthly_rate || 0,
              item.deposit || 0,
              item.shippingFee || item.shipping_fee || 0,
              item.modificationFee || item.modification_fee || 0,
              item.scheduledEntryDate || item.scheduled_entry_date || null,
              item.estimatedExitDate || item.estimated_exit_date || null,
              item.rentalPeriod || item.rental_period || 0,
              item.shippingType || item.shipping_type || '双程',
              now,
              now
            ]
          );
        }
        console.log('[Orders.MySQL] All equipment items inserted successfully');
      } else {
        console.log('[Orders.MySQL] No equipment items to insert');
      }

      await conn.commit();
      console.log('[Orders.MySQL] ✅ 订单创建事务提交成功');
      res.json({ ok: true, id: orderId });
    } catch (err) {
      await conn.rollback();
      console.error('[Orders.MySQL] ❌ 订单创建事务回滚，错误:', err);
      console.error('[Orders.MySQL] Error stack:', err.stack);
      console.error('[Orders.MySQL] Error code:', err.code);
      console.error('[Orders.MySQL] Error sqlMessage:', err.sqlMessage);
      console.error('[Orders.MySQL] Error sqlState:', err.sqlState);

      // 检查重复的合同编号
      if (err.code === 'ER_DUP_ENTRY') {
        console.log('[Orders.MySQL] Duplicate contract number detected, error details:', err.sqlMessage);
        return res.status(409).json({
          ok: false,
          error: '合同编号已存在，请检查或让系统自动生成',
          code: 'DUPLICATE_CONTRACT_NUMBER'
        });
      }

      // 检查数据库字段错误
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        return res.status(500).json({
          ok: false,
          error: `数据库字段错误: ${err.sqlMessage || err.message}`
        });
      }

      res.status(500).json({
        ok: false,
        error: err?.message || 'Create error',
        details: process.env.NODE_ENV === 'development' ? {
          code: err.code,
          sqlMessage: err.sqlMessage,
          sqlState: err.sqlState
        } : undefined
      });
    } finally {
      conn.release();
    }
  });

  // 更新订单
  router.put('/:id', async (req, res, next) => {
    console.log('[Orders.MySQL] PUT /:id - 收到请求');
    console.log('[Orders.MySQL] req.path:', req.path);
    console.log('[Orders.MySQL] req.originalUrl:', req.originalUrl);
    console.log('[Orders.MySQL] req.params:', req.params);

    // 如果路径包含 settlements 或 clearances，跳过此路由（由更具体的路由处理）
    // 使用 originalUrl 检查完整路径
    if (req.originalUrl && (req.originalUrl.includes('/settlements/') || req.originalUrl.includes('/clearances/'))) {
      console.log('[Orders.MySQL] PUT /:id - 跳过，由更具体的路由处理:', req.originalUrl);
      return next();
    }

    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid order id' });
    }

    try {
      // 支持驼峰和下划线两种命名格式
      const {
        contractNumber, contract_number,
        lessorId, lessor_id,
        customerId, customer_id,
        projectName, project_name,
        businessManagerId, business_manager_id,
        monthCalculationMethod, month_calculation_method,
        deliveryLocation, delivery_location,
        paymentAgreement, payment_agreement,
        shippingFeeReduction, shipping_fee_reduction,
        shippingFeeCalculation, shipping_fee_calculation,
        isTaxInvoice, is_tax_invoice,
        invoiceTaxRate, invoice_tax_rate,
        constructionCategory, construction_category,
        otherAgreements, other_agreements,
        equipmentItems, equipment_items
      } = req.body;

      const finalContractNumber = contractNumber || contract_number;
      const finalLessorId = lessorId || lessor_id;
      const finalCustomerId = customerId || customer_id;
      const finalProjectName = projectName || project_name;
      const finalBusinessManagerId = businessManagerId || business_manager_id;
      const finalMonthCalculationMethod = monthCalculationMethod || month_calculation_method || '30天为一月';
      const finalDeliveryLocation = deliveryLocation || delivery_location;
      const finalPaymentAgreement = paymentAgreement || payment_agreement || '预付';
      const finalShippingFeeReduction = shippingFeeReduction || shipping_fee_reduction || '无减免';
      const finalShippingFeeCalculation = shippingFeeCalculation || shipping_fee_calculation || '按台计费';
      const finalIsTaxInvoice = isTaxInvoice || is_tax_invoice || '不开票';
      const finalInvoiceTaxRate = invoiceTaxRate || invoice_tax_rate || null;
      const finalConstructionCategory = constructionCategory || construction_category || '其他';
      const finalOtherAgreements = otherAgreements || other_agreements || null;
      const finalEquipmentItems = equipmentItems || equipment_items;

      // 验证客户是否存在（如果提供了customerId）
      if (finalCustomerId) {
        const [customerRows] = await pool.query('SELECT id FROM customers WHERE id = ?', [finalCustomerId]);
        if (!customerRows || customerRows.length === 0) {
          return res.status(400).json({
            ok: false,
            error: `客户ID ${finalCustomerId} 不存在`
          });
        }
      }

      // 如果提供了出租方ID，验证它是否在customers表中存在
      // 如果不存在，则检查是否在company_verifications表中存在，如果存在则在customers表中创建对应记录
      let validatedLessorId = finalLessorId;
      if (finalLessorId) {
        console.log('[Orders.MySQL] Validating lessor exists for update:', finalLessorId);
        const [lessorRows] = await pool.query('SELECT id FROM customers WHERE id = ?', [finalLessorId]);
        if (!lessorRows || lessorRows.length === 0) {
          // 出租方在customers表中不存在，检查是否在company_verifications表中存在
          console.log('[Orders.MySQL] Lessor not found in customers table for update, checking company_verifications table');
          const [companyRows] = await pool.query('SELECT id, company_name FROM company_verifications WHERE id = ?', [finalLessorId]);
          if (companyRows && companyRows.length > 0) {
            // 在company_verifications表中找到了对应的公司，创建customers表中的记录
            console.log('[Orders.MySQL] Found company in company_verifications table for update, creating customer record');
            const companyName = companyRows[0].company_name;
            const now = new Date();
            const [createResult] = await pool.query(
              `INSERT INTO customers (name, created_at, updated_at) VALUES (?, ?, ?)`,
              [companyName, now, now]
            );
            console.log('[Orders.MySQL] Created customer record with ID for update:', createResult.insertId);
            // 使用新创建的 customer ID 作为 lessor_id
            validatedLessorId = createResult.insertId;
          } else {
            console.log('[Orders.MySQL] Lessor not found in company_verifications table for update');
            // 出租方在两个表中都不存在，返回错误
            return res.status(400).json({
              ok: false,
              error: `出租方ID ${finalLessorId} 不存在`
            });
          }
        } else {
          console.log('[Orders.MySQL] Lessor validated successfully for update');
        }
      }

      const now = new Date();

      // 更新订单主表
      const [result] = await pool.query(
        `UPDATE orders SET
          contract_number = ?, lessor_id = ?, customer_id = ?,
          project_name = ?, business_manager_id = ?,
          month_calculation_method = ?, delivery_location = ?,
          payment_agreement = ?, shipping_fee_reduction = ?,
          shipping_fee_calculation = ?, is_tax_invoice = ?,
          invoice_tax_rate = ?, construction_category = ?,
          other_agreements = ?, updated_at = ?
          WHERE id = ?`,
        [
          finalContractNumber,
          validatedLessorId || null,
          finalCustomerId,
          finalProjectName || null,
          finalBusinessManagerId || null,
          finalMonthCalculationMethod,
          finalDeliveryLocation || null,
          finalPaymentAgreement,
          finalShippingFeeReduction,
          finalShippingFeeCalculation,
          finalIsTaxInvoice,
          finalInvoiceTaxRate,
          finalConstructionCategory,
          finalOtherAgreements,
          now,
          id
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ ok: false, error: 'Order not found' });
      }

      // 更新设备需求项（只在明确传入时才更新）
      // ⚠️ 关键修复：只在请求体中包含 equipmentItems 字段时才更新，避免意外清空
      if (finalEquipmentItems !== undefined) {
        console.log('[Orders.MySQL] 更新设备需求项，数量:', finalEquipmentItems?.length || 0);
        // 先删除旧的设备项
        await pool.query('DELETE FROM order_items WHERE order_id = ?', [id]);

        // 插入新的设备项（如果有）
        if (Array.isArray(finalEquipmentItems) && finalEquipmentItems.length > 0) {
          for (const item of finalEquipmentItems) {
            await pool.query(
              `INSERT INTO order_items (
                order_id, equipment_type, height, quantity,
                daily_rate, monthly_rate, deposit, shipping_fee,
                modification_fee, scheduled_entry_date, estimated_exit_date,
                rental_period, shipping_type, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                id,
                item.equipmentType || item.equipment_type || null,
                item.height || null,
                item.quantity || 0,
                item.dailyRate || item.daily_rate || 0,
                item.monthlyRate || item.monthly_rate || 0,
                item.deposit || 0,
                item.shippingFee || item.shipping_fee || 0,
                item.modificationFee || item.modification_fee || 0,
                item.scheduledEntryDate || item.scheduled_entry_date || null,
                item.estimatedExitDate || item.estimated_exit_date || null,
                item.rentalPeriod || item.rental_period || 0,
                item.shippingType || item.shipping_type || '双程',
                now,
                now
              ]
            );
          }
        }
      } else {
        console.log('[Orders.MySQL] equipmentItems 未传入，保留原有设备需求');
      }

      res.json({ ok: true });
    } catch (err) {
      console.error('[Orders.MySQL] Update error:', err);
      // 检查重复的合同编号
      if (err.code === 'ER_DUP_ENTRY') {
        console.log('[Orders.MySQL] Duplicate contract number detected during update, error details:', err.sqlMessage);
        return res.status(409).json({
          ok: false,
          error: '合同编号已存在，请修改或检查其他订单',
          code: 'DUPLICATE_CONTRACT_NUMBER'
        });
      }
      res.status(500).json({ ok: false, error: err?.message || 'Update error' });
    }
  });

  // 删除订单：不受关联单据影响，级联删除所有相关记录
  router.delete('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid order id' });
    }
    try {
      const [orderRows] = await pool.query(
        `SELECT o.id, o.contract_number, o.project_name, c.name AS customer_name
         FROM orders o
         LEFT JOIN customers c ON c.id = o.customer_id
         WHERE o.id = ?`,
        [id]
      );
      const order = (orderRows || [])[0];
      if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });
      // 事务删除（如不支持事务则直接删除订单主表）
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        // 若存在子表，确保清理（容错：即使不存在亦不会报错）
        // 注：suspensions（停工单）表在 MySQL 暂不存在，故无需删除
        await conn.query('DELETE FROM order_items WHERE order_id = ?', [id]).catch(() => { });
        await conn.query('DELETE FROM order_entries WHERE order_id = ?', [id]).catch(() => { });
        await conn.query('DELETE FROM order_exits WHERE order_id = ?', [id]).catch(() => { });
        await conn.query('DELETE FROM order_receipts WHERE order_id = ?', [id]).catch(() => { });
        await conn.query('DELETE FROM order_refunds WHERE order_id = ?', [id]).catch(() => { });
        await conn.query('DELETE FROM order_claims WHERE order_id = ?', [id]).catch(() => { });
        await conn.query('DELETE FROM order_settlements WHERE order_id = ?', [id]).catch(() => { });
        await conn.query('DELETE FROM order_clearances WHERE order_id = ?', [id]).catch(() => { });
        // 删除主表
        await conn.query('DELETE FROM orders WHERE id = ?', [id]);
        await conn.commit();
      } catch (e) {
        try { await conn.rollback(); } catch (_) { }
        throw e;
      } finally {
        conn.release();
      }

      res.json({ ok: true });
    } catch (err) {
      console.error('[Orders.MySQL] Delete error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete error' });
    }
  });

  // ==================== 进场记录嵌套路由 ====================
  // GET /api/orders/:orderId/entries
  router.get('/:orderId/entries', async (req, res) => {
    const orderId = Number(req.params.orderId);
    try {
      const [entries] = await pool.query(
        `SELECT * FROM order_entries WHERE order_id = ? ORDER BY created_at DESC, id DESC`,
        [orderId]
      );

      // 解析 attachments_json 字段，将JSON数据合并到记录对象中
      const processedEntries = (entries || []).map(entry => {
        const extraData = typeof entry.attachments_json === 'string'
          ? JSON.parse(entry.attachments_json || '{}')
          : (entry.attachments_json || {});

        return {
          id: entry.id,
          orderId: entry.order_id,
          equipmentId: entry.equipment_id,
          entryDate: entry.entry_date,
          entryLocation: entry.entry_location,
          entryPerson: entry.entry_person,
          entryContact: entry.entry_contact,
          logisticsCost: entry.logistics_cost,
          createdAt: entry.created_at,
          updatedAt: entry.updated_at,
          // 从JSON字段中解析的数据
          ...extraData
        };
      });

      res.json({ ok: true, data: processedEntries });
    } catch (err) {
      console.error('[Orders.MySQL] Get entries error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Get entries error' });
    }
  });

  // POST /api/orders/:orderId/entries
  router.post('/:orderId/entries', async (req, res) => {
    const orderId = Number(req.params.orderId);
    const record = req.body;
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();
      console.log('[Orders.MySQL] 开始进场事务，订单ID:', orderId);

      // 提取基础字段
      const entryDate = record.entryDate || record.entry_date || null;
      const entryLocation = record.entryLocation || record.entry_location || null;
      const entryPerson = record.entryPerson || record.entry_person || null;
      const entryContact = record.entryContact || record.entry_contact || null;
      const equipmentId = record.equipmentId || record.equipment_id || null;
      const logisticsCost = Number(record.logisticsCost || record.logistics_cost || 0);

      // 将所有额外字段（进场单号、运输方式、业务负责人等）存储为JSON
      const extraData = {
        entryNumber: record.entryNumber,
        leaseStartDate: record.leaseStartDate,
        equipmentCodes: record.equipmentCodes || [],
        equipmentSummary: record.equipmentSummary,
        equipmentCount: record.equipmentCount,
        transportMethod: record.transportMethod,
        businessManagerName: record.businessManagerName,
        handoverPerson: record.handoverPerson,
        storeId: record.storeId,  // 添加门店ID
        vehicleId: record.vehicleId,
        driverId: record.driverId,
        companyId: record.companyId,
        companyContactName: record.companyContactName,
        companyContactPhone: record.companyContactPhone,
        vehiclePlate: record.vehiclePlate,
        driverName: record.driverName,
        driverPhone: record.driverPhone,
        companyName: record.companyName,
        attachments: record.attachments
      };

      console.log('[Orders.MySQL] 接收到的进场数据 - 门店ID:', record.storeId, '物流成本:', logisticsCost);
      console.log('[Orders.MySQL] 物流信息 - 车辆:', record.vehicleId, record.vehiclePlate, '司机:', record.driverId, record.driverName, '公司:', record.companyId, record.companyName);

      // 插入进场记录（包含设备数量）
      const equipmentCount = (extraData.equipmentCodes || []).length || 1;
      const [result] = await conn.query(
        `INSERT INTO order_entries (order_id, equipment_id, entry_date, entry_location, entry_person, entry_contact,
          attachments_json, logistics_cost, equipment_count, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
        [orderId, equipmentId, entryDate, entryLocation, entryPerson, entryContact, JSON.stringify(extraData), logisticsCost, equipmentCount]
      );

      console.log('[Orders.MySQL] 进场记录已插入，ID:', result.insertId);

      // 🔄 更新设备租赁状态
      const equipmentCodes = extraData.equipmentCodes || [];
      if (equipmentCodes.length > 0) {
        console.log('[Orders.MySQL] 开始更新设备租赁状态，设备数量:', equipmentCodes.length);

        // 批量更新设备状态为"在租"
        const placeholders = equipmentCodes.map(() => '?').join(',');
        const updateSql = `
          UPDATE equipments 
          SET rental_status = 'renting', 
              updated_at = NOW(3)
          WHERE (code IN (${placeholders}) OR custom_code IN (${placeholders}))
        `;
        await conn.query(updateSql, [...equipmentCodes, ...equipmentCodes]);

        console.log('[Orders.MySQL] ✅ 设备租赁状态已更新为"在租"');
      }

      // 记录操作日志
      await conn.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, status, created_at)
         VALUES (?, 'entry_created', 'order', ?, ?, 'success', NOW())`,
        [
          req.user?.id || null,
          orderId,
          JSON.stringify({
            entryId: result.insertId,
            entryNumber: extraData.entryNumber,
            entryDate,
            equipmentCount: extraData.equipmentCount,
            equipmentSummary: extraData.equipmentSummary
          })
        ]
      );

      console.log('[Orders.MySQL] 审计日志已记录');

      // 🚀 自动创建物流台账记录
      console.log('[Orders.MySQL] 检查物流信息 - 物流类型:', extraData.transportMethod, '物流成本:', logisticsCost);

      // 只要不是客户自提，就创建物流台账（即使成本为0）
      const shouldCreateLedger = extraData.transportMethod &&
        extraData.transportMethod !== '客户自提' &&
        extraData.transportMethod !== 'customer';

      if (shouldCreateLedger) {
        console.log('[Orders.MySQL] ✅ 开始创建进场物流台账记录...');

        // 获取订单信息
        const [orderRows] = await conn.query(
          'SELECT contract_number, lessor_company_id FROM orders WHERE id = ?',
          [orderId]
        );
        const orderInfo = orderRows[0] || {};

        // 生成物流台账编号（格式：年月日-序号）
        // 使用 MAX 查询最大序号 + FOR UPDATE 锁定，避免并发冲突
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const [maxRows] = await conn.query(
          `SELECT ledger_number FROM logistics_ledger 
           WHERE ledger_number LIKE ? 
           ORDER BY ledger_number DESC 
           LIMIT 1 FOR UPDATE`,
          [`${dateStr}-%`]
        );
        let seq = 1;
        if (maxRows.length > 0 && maxRows[0].ledger_number) {
          const lastNumber = maxRows[0].ledger_number;
          const lastSeq = parseInt(lastNumber.split('-')[1] || '0');
          seq = lastSeq + 1;
        }
        const ledgerNumber = `${dateStr}-${seq}`;
        console.log('[Orders.MySQL] 生成台账编号:', ledgerNumber);

        // 确定物流类型
        const logisticsType = extraData.transportMethod === 'self' ? 'own' :
          extraData.transportMethod === 'third' ? 'third' :
            extraData.transportMethod === 'customer' ? 'customer' :
              extraData.transportMethod === '我方物流' ? 'own' :
                extraData.transportMethod === '第三方物流' ? 'third' :
                  extraData.transportMethod === '客户自提' ? 'customer' : 'own';

        console.log('[Orders.MySQL] 物流类型映射:', extraData.transportMethod, '=>', logisticsType);
        console.log('[Orders.MySQL] 物流详情 - vehicleId:', extraData.vehicleId, 'vehiclePlate:', extraData.vehiclePlate, 'driverId:', extraData.driverId, 'driverName:', extraData.driverName, 'companyId:', extraData.companyId);

        // 插入物流台账
        const transportDate = entryDate || new Date().toISOString().split('T')[0];

        // 从前端传来的数据中获取门店ID（优先使用前端选择的门店）
        const storeId = extraData.storeId || orderInfo.lessor_company_id || 1;
        console.log('[Orders.MySQL] 使用门店ID:', storeId, '来源:', extraData.storeId ? '前端选择' : '订单关联');

        // 查询真实门店名称
        let storeName = '默认门店';
        try {
          const [storeRows] = await conn.query(
            'SELECT name FROM stores WHERE id = ?',
            [storeId]
          );
          if (storeRows.length > 0) {
            storeName = storeRows[0].name;
            console.log('[Orders.MySQL] 查询到门店名称:', storeName);
          } else {
            console.warn('[Orders.MySQL] 门店ID', storeId, '不存在，使用默认门店');
          }
        } catch (storeErr) {
          console.warn('[Orders.MySQL] 查询门店失败，使用默认门店:', storeErr.message);
        }

        await conn.query(
          `INSERT INTO logistics_ledger (
            ledger_number, order_id, order_number, entry_id, 
            logistics_type, record_type, transport_type, transport_date, 
            store_id, store_name, source_store_id, source_store_name, target_store_id, target_store_name,
            logistics_cost, record_date,
            vehicle_id, vehicle_plate, driver_id, driver_name, driver_phone,
            company_id, company_name, company_contact_name, company_contact_phone,
            remark, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'entry', '进场运输', ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
          [
            ledgerNumber,
            orderId,
            orderInfo.contract_number || '',
            result.insertId,
            logisticsType,
            transportDate,
            storeId,
            storeName,
            storeId,           // source_store_id: 进场时出库门店
            storeName,         // source_store_name: 进场时出库门店名称
            logisticsCost,
            entryDate || new Date().toISOString().slice(0, 10),
            extraData.vehicleId || null,
            extraData.vehiclePlate || null,
            extraData.driverId || null,
            extraData.driverName || null,
            extraData.driverPhone || null,
            extraData.companyId || null,
            extraData.companyName || null,
            extraData.companyContactName || null,
            extraData.companyContactPhone || null,
            `进场单号：${extraData.entryNumber || ''}` || null
          ]
        );

        console.log('[Orders.MySQL] ✅ 物流台账记录已创建，编号:', ledgerNumber);
      } else {
        console.log('[Orders.MySQL] ⚠️ 跳过进场物流台账创建（客户自提或物流类型未选择）');
      }

      await conn.commit();
      console.log('[Orders.MySQL] ✅ 进场事务提交成功');

      res.json({ ok: true, id: result.insertId });
    } catch (err) {
      await conn.rollback();
      console.error('[Orders.MySQL] ❌ 进场事务回滚，错误:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Create entry error' });
    } finally {
      conn.release();
    }
  });

  // DELETE /api/orders/:orderId/entries/:entryId
  router.delete('/:orderId/entries/:entryId', async (req, res) => {
    const { orderId, entryId } = req.params;
    console.log(`[Orders.MySQL] 🗑️ 开始删除进场记录，订单ID: ${orderId}, 进场ID: ${entryId}`);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 🔍 先查询进场记录，获取设备编号列表
      const [entryRows] = await conn.query(
        `SELECT attachments_json FROM order_entries WHERE id = ? AND order_id = ?`,
        [entryId, orderId]
      );

      if (entryRows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ ok: false, error: 'Entry not found' });
      }

      // 解析设备编号列表
      let equipmentCodes = [];
      try {
        const attachmentsJson = entryRows[0].attachments_json;
        if (attachmentsJson) {
          const extraData = typeof attachmentsJson === 'string' ? JSON.parse(attachmentsJson) : attachmentsJson;
          equipmentCodes = extraData.equipmentCodes || [];
        }
      } catch (parseErr) {
        console.warn('[Orders.MySQL] 解析进场记录数据失败:', parseErr);
      }

      console.log(`[Orders.MySQL] 进场记录关联的设备数量: ${equipmentCodes.length}`, equipmentCodes);

      // 🔄 恢复设备租赁状态为"待租"
      if (equipmentCodes.length > 0) {
        const placeholders = equipmentCodes.map(() => '?').join(',');
        
        // 检查设备是否还有其他在租订单
        const [otherOrdersRows] = await conn.query(
          `SELECT DISTINCT e.code, e.custom_code
           FROM order_entries oe
           INNER JOIN equipments e ON (
             JSON_CONTAINS(oe.attachments_json, JSON_QUOTE(e.code), '$.equipmentCodes') OR
             JSON_CONTAINS(oe.attachments_json, JSON_QUOTE(e.custom_code), '$.equipmentCodes')
           )
           WHERE oe.id != ? 
           AND oe.order_id IN (
             SELECT id FROM orders WHERE status IN ('confirmed', 'in_progress')
           )
           AND (e.code IN (${placeholders}) OR e.custom_code IN (${placeholders}))`,
          [entryId, ...equipmentCodes, ...equipmentCodes]
        );

        // 记录还在其他订单中的设备
        const equipmentInOtherOrders = new Set();
        otherOrdersRows.forEach(row => {
          if (row.code) equipmentInOtherOrders.add(row.code);
          if (row.custom_code) equipmentInOtherOrders.add(row.custom_code);
        });

        console.log(`[Orders.MySQL] 还在其他订单中的设备: ${equipmentInOtherOrders.size}个`, Array.from(equipmentInOtherOrders));

        // 只恢复没有其他订单的设备
        const equipmentToRestore = equipmentCodes.filter(code => !equipmentInOtherOrders.has(code));

        if (equipmentToRestore.length > 0) {
          const restorePlaceholders = equipmentToRestore.map(() => '?').join(',');
          const updateSql = `
            UPDATE equipments 
            SET rental_status = 'available', 
                updated_at = NOW(3)
            WHERE (code IN (${restorePlaceholders}) OR custom_code IN (${restorePlaceholders}))
          `;
          const [updateResult] = await conn.query(updateSql, [...equipmentToRestore, ...equipmentToRestore]);
          console.log(`[Orders.MySQL] ✅ 已恢复 ${updateResult.affectedRows} 个设备的租赁状态为"待租"`);
        } else {
          console.log(`[Orders.MySQL] ℹ️ 所有设备都还在其他订单中，不恢复状态`);
        }
      }

      // 先查询是否有关联的物流台账记录
      const [checkRows] = await conn.query(
        `SELECT id, ledger_number FROM logistics_ledger WHERE entry_id = ?`,
        [entryId]
      );
      console.log(`[Orders.MySQL] 查询到 ${checkRows.length} 条关联的物流台账记录:`, checkRows.map(r => `${r.id}(${r.ledger_number})`).join(', '));

      // 删除关联的物流台账记录
      if (checkRows.length > 0) {
        const [ledgerResult] = await conn.query(
          `DELETE FROM logistics_ledger WHERE entry_id = ?`,
          [entryId]
        );
        console.log(`[Orders.MySQL] ✅ 已删除 ${ledgerResult.affectedRows} 条关联的物流台账记录`);
      } else {
        console.log(`[Orders.MySQL] ℹ️ 该进场记录没有关联的物流台账记录`);
      }

      // 删除进场记录
      const [result] = await conn.query(
        `DELETE FROM order_entries WHERE id = ? AND order_id = ?`,
        [entryId, orderId]
      );

      await conn.commit();
      console.log(`[Orders.MySQL] ✅ 已删除进场记录 ${entryId}，并恢复设备状态`);
      res.json({ ok: true });
    } catch (err) {
      await conn.rollback();
      console.error('[Orders.MySQL] ❌ Delete entry error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete entry error' });
    } finally {
      conn.release();
    }
  });

  // ==================== 退场记录嵌套路由 ====================
  // GET /api/orders/:orderId/exits
  router.get('/:orderId/exits', async (req, res) => {
    const orderId = Number(req.params.orderId);
    try {
      const [exits] = await pool.query(
        `SELECT * FROM order_exits WHERE order_id = ? ORDER BY created_at DESC, id DESC`,
        [orderId]
      );

      // 解析 attachments_json 字段，将JSON数据合并到记录对象中
      const processedExits = (exits || []).map(exit => {
        const extraData = typeof exit.attachments_json === 'string'
          ? JSON.parse(exit.attachments_json || '{}')
          : (exit.attachments_json || {});

        return {
          id: exit.id,
          orderId: exit.order_id,
          equipmentId: exit.equipment_id,
          exitDate: exit.exit_date,
          logisticsCost: exit.logistics_cost,
          createdAt: exit.created_at,
          updatedAt: exit.updated_at,
          // 从JSON字段中解析的数据
          ...extraData
        };
      });

      res.json({ ok: true, data: processedExits });
    } catch (err) {
      console.error('[Orders.MySQL] Get exits error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Get exits error' });
    }
  });

  // POST /api/orders/:orderId/exits
  router.post('/:orderId/exits', async (req, res) => {
    const orderId = Number(req.params.orderId);
    const record = req.body;
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();
      console.log('[Orders.MySQL] 开始退场事务，订单ID:', orderId);

      // 提取基础字段
      const exitDate = record.exitDate || record.exit_date || null;
      const equipmentId = record.equipmentId || record.equipment_id || null;
      const logisticsCost = Number(record.logisticsCost || record.logistics_cost || 0);

      // 将所有额外字段（退场单号、运输方式、租金截止日期等）存储为JSON
      const extraData = {
        exitNumber: record.exitNumber,
        rentEndDate: record.rentEndDate,
        settlementDate: record.settlementDate,
        equipmentCodes: record.equipmentCodes || [],
        equipmentSummary: record.equipmentSummary,
        equipmentCount: record.equipmentCount,
        transportMethod: record.transportMethod,
        businessManagerName: record.businessManagerName,
        handoverPerson: record.handoverPerson,
        returnStoreId: record.returnStoreId,  // 添加退场门店ID
        vehicleId: record.vehicleId,
        driverId: record.driverId,
        companyId: record.companyId,
        companyContactName: record.companyContactName,
        companyContactPhone: record.companyContactPhone,
        vehiclePlate: record.vehiclePlate,
        driverName: record.driverName,
        driverPhone: record.driverPhone,
        companyName: record.companyName,
        attachments: record.attachments
      };

      console.log('[Orders.MySQL] 接收到的退场数据 - 门店ID:', record.returnStoreId, '物流成本:', logisticsCost);

      // 插入退场记录（包含设备数量）
      const equipmentCount = (extraData.equipmentCodes || []).length || 1;
      const [result] = await conn.query(
        `INSERT INTO order_exits (order_id, equipment_id, exit_date, attachments_json, logistics_cost, equipment_count, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
        [orderId, equipmentId, exitDate, JSON.stringify(extraData), logisticsCost, equipmentCount]
      );

      console.log('[Orders.MySQL] 退场记录已插入，ID:', result.insertId);

      // 🔄 更新设备租赁状态为待租
      const equipmentCodes = extraData.equipmentCodes || [];
      if (equipmentCodes.length > 0) {
        console.log('[Orders.MySQL] 开始更新设备租赁状态为待租，设备数量:', equipmentCodes.length);

        // 批量更新设备状态为"待租"
        const placeholders = equipmentCodes.map(() => '?').join(',');
        const updateSql = `
          UPDATE equipments 
          SET rental_status = 'idle', 
              updated_at = NOW(3)
          WHERE (code IN (${placeholders}) OR custom_code IN (${placeholders}))
        `;
        await conn.query(updateSql, [...equipmentCodes, ...equipmentCodes]);

        console.log('[Orders.MySQL] ✅ 设备租赁状态已更新为"待租"');
      }

      // 记录操作日志
      await conn.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, status, created_at)
         VALUES (?, 'exit_created', 'order', ?, ?, 'success', NOW())`,
        [
          req.user?.id || null,
          orderId,
          JSON.stringify({
            exitId: result.insertId,
            exitNumber: extraData.exitNumber,
            exitDate,
            equipmentCount: extraData.equipmentCount,
            equipmentSummary: extraData.equipmentSummary
          })
        ]
      );

      console.log('[Orders.MySQL] 审计日志已记录');

      // 🚀 自动创建物流台账记录
      console.log('[Orders.MySQL] 检查物流信息 - 物流类型:', extraData.transportMethod, '物流成本:', logisticsCost);

      // 只要不是客户自提，就创建物流台账（即使成本为0）
      const shouldCreateLedger = extraData.transportMethod &&
        extraData.transportMethod !== '客户自提' &&
        extraData.transportMethod !== 'customer';

      if (shouldCreateLedger) {
        console.log('[Orders.MySQL] ✅ 开始创建退场物流台账记录...');

        // 获取订单信息
        const [orderRows] = await conn.query(
          'SELECT contract_number, lessor_company_id FROM orders WHERE id = ?',
          [orderId]
        );
        const orderInfo = orderRows[0] || {};

        // 生成物流台账编号（格式：年月日-序号）
        // 使用 MAX 查询最大序号 + FOR UPDATE 锁定，避免并发冲突
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const [maxRows] = await conn.query(
          `SELECT ledger_number FROM logistics_ledger 
           WHERE ledger_number LIKE ? 
           ORDER BY ledger_number DESC 
           LIMIT 1 FOR UPDATE`,
          [`${dateStr}-%`]
        );
        let seq = 1;
        if (maxRows.length > 0 && maxRows[0].ledger_number) {
          const lastNumber = maxRows[0].ledger_number;
          const lastSeq = parseInt(lastNumber.split('-')[1] || '0');
          seq = lastSeq + 1;
        }
        const ledgerNumber = `${dateStr}-${seq}`;
        console.log('[Orders.MySQL] 生成台账编号:', ledgerNumber);

        // 确定物流类型（支持中英文映射）
        const logisticsType = extraData.transportMethod === 'self' ? 'own' :
          extraData.transportMethod === 'third' ? 'third' :
            extraData.transportMethod === 'customer' ? 'customer' :
              extraData.transportMethod === '我方物流' ? 'own' :
                extraData.transportMethod === '第三方物流' ? 'third' :
                  extraData.transportMethod === '客户自提' ? 'customer' : 'own';

        // 插入物流台账
        const transportDateExit = exitDate || new Date().toISOString().split('T')[0];

        // 从前端传来的数据中获取门店ID（优先使用前端选择的门店，退场时字段名为returnStoreId）
        const storeId = extraData.returnStoreId || extraData.storeId || orderInfo.lessor_company_id || 1;
        console.log('[Orders.MySQL] 使用门店ID:', storeId, '来源:', extraData.returnStoreId ? '前端选择(退场)' : '订单关联');

        // 查询真实门店名称
        let storeName = '默认门店';
        try {
          const [storeRows] = await conn.query(
            'SELECT name FROM stores WHERE id = ?',
            [storeId]
          );
          if (storeRows.length > 0) {
            storeName = storeRows[0].name;
            console.log('[Orders.MySQL] 查询到门店名称:', storeName);
          } else {
            console.warn('[Orders.MySQL] 门店ID', storeId, '不存在，使用默认门店');
          }
        } catch (storeErr) {
          console.warn('[Orders.MySQL] 查询门店失败，使用默认门店:', storeErr.message);
        }

        await conn.query(
          `INSERT INTO logistics_ledger (
            ledger_number, order_id, order_number, exit_id, 
            logistics_type, record_type, transport_type, transport_date, 
            store_id, store_name, source_store_id, source_store_name, target_store_id, target_store_name,
            logistics_cost, record_date,
            vehicle_id, vehicle_plate, driver_id, driver_name, driver_phone,
            company_id, company_name, company_contact_name, company_contact_phone,
            remark, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'exit', '退场运输', ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
          [
            ledgerNumber,
            orderId,
            orderInfo.contract_number || '',
            result.insertId,
            logisticsType,
            transportDateExit,
            storeId,
            storeName,
            storeId,           // target_store_id: 退场时入库门店
            storeName,         // target_store_name: 退场时入库门店名称
            logisticsCost,
            exitDate || new Date().toISOString().slice(0, 10),
            extraData.vehicleId || null,
            extraData.vehiclePlate || null,
            extraData.driverId || null,
            extraData.driverName || null,
            extraData.driverPhone || null,
            extraData.companyId || null,
            extraData.companyName || null,
            extraData.companyContactName || null,
            extraData.companyContactPhone || null,
            `退场单号：${extraData.exitNumber || ''}` || null
          ]
        );

        console.log('[Orders.MySQL] ✅ 物流台账记录已创建，编号:', ledgerNumber);
      } else {
        console.log('[Orders.MySQL] ⚠️ 跳过退场物流台账创建（客户自提或物流类型未选择）');
      }

      await conn.commit();
      console.log('[Orders.MySQL] ✅ 退场事务提交成功');

      res.json({ ok: true, id: result.insertId });
    } catch (err) {
      await conn.rollback();
      console.error('[Orders.MySQL] ❌ 退场事务回滚，错误:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Create exit error' });
    } finally {
      conn.release();
    }
  });

  // DELETE /api/orders/:orderId/exits/:exitId
  router.delete('/:orderId/exits/:exitId', async (req, res) => {
    const { orderId, exitId } = req.params;
    console.log(`[Orders.MySQL] 🗑️ 开始删除退场记录，订单ID: ${orderId}, 退场ID: ${exitId}`);

    try {
      // 先查询是否有关联的物流台账记录
      const [checkRows] = await pool.query(
        `SELECT id, ledger_number FROM logistics_ledger WHERE exit_id = ?`,
        [exitId]
      );
      console.log(`[Orders.MySQL] 查询到 ${checkRows.length} 条关联的物流台账记录:`, checkRows.map(r => `${r.id}(${r.ledger_number})`).join(', '));

      // 删除关联的物流台账记录
      if (checkRows.length > 0) {
        try {
          const [ledgerResult] = await pool.query(
            `DELETE FROM logistics_ledger WHERE exit_id = ?`,
            [exitId]
          );
          console.log(`[Orders.MySQL] ✅ 已删除 ${ledgerResult.affectedRows} 条关联的物流台账记录`);
        } catch (ledgerErr) {
          console.error('[Orders.MySQL] ❌ 删除物流台账失败:', ledgerErr);
          throw ledgerErr; // 抛出错误，阻止删除退场记录
        }
      } else {
        console.log(`[Orders.MySQL] ℹ️ 该退场记录没有关联的物流台账记录`);
      }

      // 删除退场记录
      const [result] = await pool.query(
        `DELETE FROM order_exits WHERE id = ? AND order_id = ?`,
        [exitId, orderId]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ ok: false, error: 'Exit not found' });
      }

      console.log(`[Orders.MySQL] ✅ 已删除退场记录 ${exitId}`);
      res.json({ ok: true });
    } catch (err) {
      console.error('[Orders.MySQL] ❌ Delete exit error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete exit error' });
    }
  });

  // ==================== 收款记录嵌套路由 ====================
  // POST /api/orders/:orderId/receipts
  router.post('/:orderId/receipts', async (req, res) => {
    const orderId = Number(req.params.orderId);
    const record = req.body;
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();
      console.log('[Orders.MySQL] 开始收款事务，订单ID:', orderId);

      // 提取基础字段
      const receiptDate = record.receiptDate || record.receipt_date || null;
      const amount = record.amount ? Number(record.amount) : 0;

      // 将所有额外字段存储为JSON
      const extraData = {
        receiptNumber: record.receiptNumber,
        contractName: record.contractName,
        paymentMethod: record.paymentMethod,
        remark: record.remark,
        attachments: record.attachments
      };

      // 插入收款记录
      const [result] = await conn.query(
        `INSERT INTO order_receipts (order_id, amount, receipt_date, attachments_json, created_at, updated_at) 
         VALUES (?, ?, ?, ?, NOW(3), NOW(3))`,
        [orderId, amount, receiptDate, JSON.stringify(extraData)]
      );

      console.log('[Orders.MySQL] 收款记录已插入，ID:', result.insertId);

      // 记录操作日志
      await conn.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, status, created_at)
         VALUES (?, 'receipt_created', 'order', ?, ?, 'success', NOW())`,
        [
          req.user?.id || null,
          orderId,
          JSON.stringify({
            receiptId: result.insertId,
            receiptNumber: extraData.receiptNumber,
            amount,
            receiptDate
          })
        ]
      );

      console.log('[Orders.MySQL] 审计日志已记录');

      // 🚀 自动创建财务记录
      console.log('[Orders.MySQL] ✅ 开始创建财务收款记录，金额:', amount);

      // 获取订单信息（关联客户表获取客户名称）
      const [orderRows] = await conn.query(
        `SELECT o.contract_number, o.customer_id, c.name as customer_name 
         FROM orders o 
         LEFT JOIN customers c ON o.customer_id = c.id 
         WHERE o.id = ?`,
        [orderId]
      );
      const orderInfo = orderRows[0] || {};

      // 生成财务记录编号
      const financeRecordNumber = `FR${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(result.insertId).padStart(6, '0')}`;

      // 插入财务记录
      await conn.query(
        `INSERT INTO finance_records (
          record_number, record_type, source_type, source_id,
          order_id, order_number, amount, payment_method, record_date,
          customer_id, customer_name, remark, attachments_json,
          created_at, updated_at
        ) VALUES (?, 'receipt', 'order', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
        [
          financeRecordNumber,
          result.insertId,
          orderId,
          orderInfo.contract_number || '',
          amount,
          extraData.paymentMethod || null,
          receiptDate || new Date().toISOString().slice(0, 10),
          orderInfo.customer_id || null,
          orderInfo.customer_name || '',
          extraData.remark || `收款单号：${extraData.receiptNumber || ''}`,
          JSON.stringify(extraData)
        ]
      );

      console.log('[Orders.MySQL] ✅ 财务收款记录已创建，编号:', financeRecordNumber);

      await conn.commit();
      console.log('[Orders.MySQL] ✅ 收款事务提交成功');

      res.json({ ok: true, id: result.insertId });
    } catch (err) {
      await conn.rollback();
      console.error('[Orders.MySQL] ❌ 收款事务回滚，错误:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Create receipt error' });
    } finally {
      conn.release();
    }
  });

  // DELETE /api/orders/:orderId/receipts/:receiptId
  router.delete('/:orderId/receipts/:receiptId', async (req, res) => {
    const { orderId, receiptId } = req.params;
    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();
      
      // 先查询收款记录信息用于日志
      const [receiptRows] = await conn.query(
        `SELECT * FROM order_receipts WHERE id = ? AND order_id = ?`,
        [receiptId, orderId]
      );

      if (receiptRows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ ok: false, error: 'Receipt not found' });
      }

      const receipt = receiptRows[0];

      // 🚀 删除关联的财务记录
      await conn.query(
        `DELETE FROM finance_records 
         WHERE record_type = 'receipt' 
           AND source_type = 'order' 
           AND source_id = ?`,
        [receiptId]
      );
      console.log('[Orders.MySQL] ✅ 已删除关联的财务收款记录');

      // 删除收款记录
      await conn.query(
        `DELETE FROM order_receipts WHERE id = ? AND order_id = ?`,
        [receiptId, orderId]
      );

      // 记录操作日志
      try {
        const extraData = typeof receipt.attachments_json === 'string'
          ? JSON.parse(receipt.attachments_json || '{}')
          : (receipt.attachments_json || {});

        await conn.query(
          `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, status, created_at)
           VALUES (?, 'receipt_deleted', 'order', ?, ?, 'success', NOW())`,
          [
            req.user?.id || null,
            orderId,
            JSON.stringify({
              receiptId,
              receiptNumber: extraData.receiptNumber,
              amount: receipt.amount
            })
          ]
        );
      } catch (logErr) {
        console.error('[Orders.MySQL] Failed to log receipt deletion:', logErr);
      }

      await conn.commit();
      console.log('[Orders.MySQL] ✅ 收款记录删除事务提交成功');
      
      res.json({ ok: true });
    } catch (err) {
      await conn.rollback();
      console.error('[Orders.MySQL] Delete receipt error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete receipt error' });
    } finally {
      conn.release();
    }
  });

  // ==================== 退款记录嵌套路由 ====================
  // POST /api/orders/:orderId/refunds
  router.post('/:orderId/refunds', async (req, res) => {
    const orderId = Number(req.params.orderId);
    const record = req.body;
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();
      console.log('[Orders.MySQL] 开始退款事务，订单ID:', orderId);

      // 提取基础字段
      const refundDate = record.refundDate || record.refund_date || null;
      const amount = record.amount ? Number(record.amount) : 0;

      // 将所有额外字段存储为JSON
      const extraData = {
        refundNumber: record.refundNumber,
        contractName: record.contractName,
        paymentMethod: record.paymentMethod,
        remark: record.remark,
        attachments: record.attachments
      };

      // 插入退款记录
      const [result] = await conn.query(
        `INSERT INTO order_refunds (order_id, amount, refund_date, attachments_json, created_at, updated_at) 
         VALUES (?, ?, ?, ?, NOW(3), NOW(3))`,
        [orderId, amount, refundDate, JSON.stringify(extraData)]
      );

      console.log('[Orders.MySQL] 退款记录已插入，ID:', result.insertId);

      // 记录操作日志
      await conn.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, status, created_at)
         VALUES (?, 'refund_created', 'order', ?, ?, 'success', NOW())`,
        [
          req.user?.id || null,
          orderId,
          JSON.stringify({
            refundId: result.insertId,
            refundNumber: extraData.refundNumber,
            amount,
            refundDate
          })
        ]
      );

      console.log('[Orders.MySQL] 审计日志已记录');

      // 🚀 自动创建财务记录
      console.log('[Orders.MySQL] ✅ 开始创建财务退款记录，金额:', amount);

      // 获取订单信息（关联客户表获取客户名称）
      const [orderRows] = await conn.query(
        `SELECT o.contract_number, o.customer_id, c.name as customer_name 
         FROM orders o 
         LEFT JOIN customers c ON o.customer_id = c.id 
         WHERE o.id = ?`,
        [orderId]
      );
      const orderInfo = orderRows[0] || {};

      // 生成财务记录编号
      const financeRecordNumber = `FR${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(result.insertId + 20000).padStart(6, '0')}`;

      // 插入财务记录
      await conn.query(
        `INSERT INTO finance_records (
          record_number, record_type, source_type, source_id,
          order_id, order_number, amount, payment_method, record_date,
          customer_id, customer_name, remark, attachments_json,
          created_at, updated_at
        ) VALUES (?, 'refund', 'order', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
        [
          financeRecordNumber,
          result.insertId,
          orderId,
          orderInfo.contract_number || '',
          amount,
          extraData.paymentMethod || null,
          refundDate || new Date().toISOString().slice(0, 10),
          orderInfo.customer_id || null,
          orderInfo.customer_name || '',
          extraData.remark || `退款单号：${extraData.refundNumber || ''}`,
          JSON.stringify(extraData)
        ]
      );

      console.log('[Orders.MySQL] ✅ 财务退款记录已创建，编号:', financeRecordNumber);

      await conn.commit();
      console.log('[Orders.MySQL] ✅ 退款事务提交成功');

      res.json({ ok: true, id: result.insertId });
    } catch (err) {
      await conn.rollback();
      console.error('[Orders.MySQL] ❌ 退款事务回滚，错误:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Create refund error' });
    } finally {
      conn.release();
    }
  });

  // DELETE /api/orders/:orderId/refunds/:refundId
  router.delete('/:orderId/refunds/:refundId', async (req, res) => {
    const { orderId, refundId } = req.params;
    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();
      
      // 先查询退款记录信息用于日志
      const [refundRows] = await conn.query(
        `SELECT * FROM order_refunds WHERE id = ? AND order_id = ?`,
        [refundId, orderId]
      );

      if (refundRows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ ok: false, error: 'Refund not found' });
      }

      const refund = refundRows[0];

      // 🚀 删除关联的财务记录
      await conn.query(
        `DELETE FROM finance_records 
         WHERE record_type = 'refund' 
           AND source_type = 'order' 
           AND source_id = ?`,
        [refundId]
      );
      console.log('[Orders.MySQL] ✅ 已删除关联的财务退款记录');

      // 删除退款记录
      await conn.query(
        `DELETE FROM order_refunds WHERE id = ? AND order_id = ?`,
        [refundId, orderId]
      );

      // 记录操作日志
      try {
        const extraData = typeof refund.attachments_json === 'string'
          ? JSON.parse(refund.attachments_json || '{}')
          : (refund.attachments_json || {});

        await conn.query(
          `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, status, created_at)
           VALUES (?, 'refund_deleted', 'order', ?, ?, 'success', NOW())`,
          [
            req.user?.id || null,
            orderId,
            JSON.stringify({
              refundId,
              refundNumber: extraData.refundNumber,
              amount: refund.amount
            })
          ]
        );
      } catch (logErr) {
        console.error('[Orders.MySQL] Failed to log refund deletion:', logErr);
      }

      await conn.commit();
      console.log('[Orders.MySQL] ✅ 退款记录删除事务提交成功');
      
      res.json({ ok: true });
    } catch (err) {
      await conn.rollback();
      console.error('[Orders.MySQL] Delete refund error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete refund error' });
    } finally {
      conn.release();
    }
  });

  // ==================== 索赔记录嵌套路由 ====================
  // POST /api/orders/:orderId/claims
  router.post('/:orderId/claims', async (req, res) => {
    const orderId = Number(req.params.orderId);
    const record = req.body;
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();
      console.log('[Orders.MySQL] 开始索赔事务，订单ID:', orderId);

      // 提取基础字段
      const claimDate = record.claimDate || record.claim_date || null;
      const claimAmount = record.claimAmount ? Number(record.claimAmount) : 0;

      // 将所有额外字段存储为JSON
      const extraData = {
        claimNumber: record.claimNumber,
        contractName: record.contractName,
        claimType: record.claimType,
        equipmentSelections: record.equipmentSelections || [],
        reason: record.reason,
        attachments: record.attachments
      };

      // 插入索赔记录
      const [result] = await conn.query(
        `INSERT INTO order_claims (order_id, claim_amount, claim_date, attachments_json, created_at, updated_at) 
         VALUES (?, ?, ?, ?, NOW(3), NOW(3))`,
        [orderId, claimAmount, claimDate, JSON.stringify(extraData)]
      );

      console.log('[Orders.MySQL] 索赔记录已插入，ID:', result.insertId);

      // 记录操作日志
      await conn.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, status, created_at)
         VALUES (?, 'claim_created', 'order', ?, ?, 'success', NOW())`,
        [
          req.user?.id || null,
          orderId,
          JSON.stringify({
            claimId: result.insertId,
            claimNumber: extraData.claimNumber,
            claimAmount,
            claimType: extraData.claimType,
            claimDate
          })
        ]
      );

      console.log('[Orders.MySQL] 审计日志已记录');

      await conn.commit();
      console.log('[Orders.MySQL] ✅ 索赔事务提交成功');

      res.json({ ok: true, id: result.insertId });
    } catch (err) {
      await conn.rollback();
      console.error('[Orders.MySQL] ❌ 索赔事务回滚，错误:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Create claim error' });
    } finally {
      conn.release();
    }
  });

  // GET /api/orders/:orderId/claims
  router.get('/:orderId/claims', async (req, res) => {
    try {
      const orderId = Number(req.params.orderId);
      if (!Number.isFinite(orderId) || orderId <= 0) {
        return res.status(400).json({ ok: false, error: 'Invalid order ID' });
      }

      const [claimRows] = await pool.query(
        `SELECT id, claim_amount, claim_date, attachments_json, created_at
         FROM order_claims WHERE order_id = ? ORDER BY claim_date DESC, id DESC`,
        [orderId]
      );

      const claims = (claimRows || []).map((it) => {
        const extraData = it.attachments_json
          ? (typeof it.attachments_json === 'string' ? JSON.parse(it.attachments_json) : it.attachments_json)
          : {};

        return {
          id: String(it.id),
          claimAmount: Number(it.claim_amount || 0),
          claimDate: it.claim_date || undefined,
          createdAt: it.created_at || undefined,
          claimNumber: extraData.claimNumber,
          contractName: extraData.contractName,
          claimType: extraData.claimType,
          equipmentSelections: extraData.equipmentSelections || [],
          reason: extraData.reason,
          attachments: extraData.attachments || []
        };
      });

      res.json({ ok: true, data: claims });
    } catch (err) {
      console.error('[Orders.MySQL] Get claims error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Get claims error' });
    }
  });

  // DELETE /api/orders/:orderId/claims/:claimId
  router.delete('/:orderId/claims/:claimId', async (req, res) => {
    const { orderId, claimId } = req.params;
    try {
      const [result] = await pool.query(
        `DELETE FROM order_claims WHERE id = ? AND order_id = ?`,
        [claimId, orderId]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ ok: false, error: 'Claim not found' });
      }
      res.json({ ok: true });
    } catch (err) {
      console.error('[Orders.MySQL] Delete claim error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete claim error' });
    }
  });

  // ==================== 结算记录嵌套路由 ====================

  // 辅助函数：检查日期区间是否重叠
  const hasDateOverlap = (start1, end1, start2, end2) => {
    const s1 = new Date(start1);
    const e1 = new Date(end1);
    const s2 = new Date(start2);
    const e2 = new Date(end2);
    return s1 < e2 && e1 > s2;
  };

  // 辅助函数：验证结算记录，防止重复结算
  const validateSettlement = async (conn, orderId, cycleStartDate, cycleEndDate, excludeSettlementId = null) => {
    const warnings = [];

    // 1. 检查是否有重叠的结算周期
    let query = `
      SELECT id, settlement_date, attachments_json 
      FROM order_settlements 
      WHERE order_id = ?
    `;
    const params = [orderId];

    if (excludeSettlementId) {
      query += ' AND id != ?';
      params.push(excludeSettlementId);
    }

    const [existingSettlements] = await conn.query(query, params);

    for (const settlement of existingSettlements) {
      let extraData = {};
      try {
        extraData = settlement.attachments_json
          ? (typeof settlement.attachments_json === 'string'
            ? JSON.parse(settlement.attachments_json)
            : settlement.attachments_json)
          : {};
      } catch (e) {
        continue;
      }

      const existingStart = extraData.cycleStartDate;
      const existingEnd = extraData.cycleEndDate;

      if (existingStart && existingEnd && hasDateOverlap(cycleStartDate, cycleEndDate, existingStart, existingEnd)) {
        warnings.push({
          type: 'date_overlap',
          message: `结算周期与已有结算记录 ${extraData.settlementNumber || settlement.id} 重叠`,
          existingCycle: `${existingStart} 至 ${existingEnd}`,
          settlementId: settlement.id
        });
      }
    }

    return warnings;
  };

  // POST /api/orders/:orderId/settlements
  router.post('/:orderId/settlements', async (req, res) => {
    const orderId = Number(req.params.orderId);
    const record = req.body;
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();
      console.log('[Orders.MySQL] 开始结算事务，订单ID:', orderId);

      // 提取基础字段
      const settlementDate = record.settlementDate || record.settlement_date || null;
      const settlementAmount = record.settlementAmount ? Number(record.settlementAmount) : 0;

      // 将所有额外字段存储为JSON
      const extraData = {
        settlementNumber: record.settlementNumber,
        contractName: record.contractName,
        cycleStartDate: record.cycleStartDate,
        cycleEndDate: record.cycleEndDate,
        remark: record.remark,
        status: record.status,
        attachments: record.attachments
      };

      // 验证结算记录，防止重复结算
      const warnings = await validateSettlement(conn, orderId, extraData.cycleStartDate, extraData.cycleEndDate);

      if (warnings.length > 0) {
        console.warn('[Orders.MySQL] 结算验证警告:', warnings);
        // 将警告信息添加到 extraData 中
        extraData.validationWarnings = warnings;
      }

      // 插入结算记录
      const [result] = await conn.query(
        `INSERT INTO order_settlements (order_id, settlement_amount, settlement_date, attachments_json, created_at, updated_at) 
         VALUES (?, ?, ?, ?, NOW(3), NOW(3))`,
        [orderId, settlementAmount, settlementDate, JSON.stringify(extraData)]
      );

      console.log('[Orders.MySQL] 结算记录已插入，ID:', result.insertId);

      // 记录操作日志
      await conn.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, status, created_at)
         VALUES (?, 'settlement_created', 'order', ?, ?, 'success', NOW())`,
        [
          req.user?.id || null,
          orderId,
          JSON.stringify({
            settlementId: result.insertId,
            settlementNumber: extraData.settlementNumber,
            settlementAmount,
            cycleStartDate: extraData.cycleStartDate,
            cycleEndDate: extraData.cycleEndDate,
            settlementDate
          })
        ]
      );

      console.log('[Orders.MySQL] 审计日志已记录');

      await conn.commit();
      console.log('[Orders.MySQL] ✅ 结算事务提交成功');

      res.json({ ok: true, id: result.insertId });
    } catch (err) {
      await conn.rollback();
      console.error('[Orders.MySQL] ❌ 结算事务回滚，错误:', err);
      res.status(500).json({
        ok: false,
        error: err?.message || 'Create settlement error',
        details: err?.sqlMessage || err?.code || 'Unknown SQL error'
      });
    } finally {
      conn.release();
    }
  });

  // PUT /api/orders/:orderId/settlements/:settlementId - 更新结算记录
  router.put('/:orderId/settlements/:settlementId', async (req, res) => {
    console.log('[Orders.MySQL] PUT /:orderId/settlements/:settlementId - 收到更新结算记录请求');
    console.log('[Orders.MySQL] 路径:', req.path);
    console.log('[Orders.MySQL] 参数:', req.params);
    const { orderId, settlementId } = req.params;
    const record = req.body;

    try {
      // 获取现有记录
      const [existing] = await pool.query(
        'SELECT * FROM order_settlements WHERE id = ? AND order_id = ?',
        [settlementId, orderId]
      );

      if (!existing || existing.length === 0) {
        return res.status(404).json({ ok: false, error: 'Settlement not found' });
      }

      // 解析现有的 JSON 数据
      let existingExtra = {};
      try {
        existingExtra = existing[0].attachments_json
          ? (typeof existing[0].attachments_json === 'string'
            ? JSON.parse(existing[0].attachments_json)
            : existing[0].attachments_json)
          : {};
      } catch (e) {
        existingExtra = {};
      }

      // 合并更新的字段
      const updatedExtra = {
        ...existingExtra,
        settlementNumber: record.settlementNumber ?? existingExtra.settlementNumber,
        contractName: record.contractName ?? existingExtra.contractName,
        cycleStartDate: record.cycleStartDate ?? existingExtra.cycleStartDate,
        cycleEndDate: record.cycleEndDate ?? existingExtra.cycleEndDate,
        remark: record.remark ?? existingExtra.remark,
        status: record.status ?? existingExtra.status,
        attachments: record.attachments ?? existingExtra.attachments
      };

      // 如果更新了结算周期，验证是否与其他结算记录重叠
      if (record.cycleStartDate || record.cycleEndDate) {
        const conn = await pool.getConnection();
        try {
          const warnings = await validateSettlement(
            conn,
            orderId,
            updatedExtra.cycleStartDate,
            updatedExtra.cycleEndDate,
            settlementId  // 排除当前记录
          );

          if (warnings.length > 0) {
            console.warn('[Orders.MySQL] 结算更新验证警告:', warnings);
            updatedExtra.validationWarnings = warnings;
          }
        } finally {
          conn.release();
        }
      }

      // 更新记录
      const settlementDate = record.settlementDate ?? existing[0].settlement_date;
      const settlementAmount = record.settlementAmount !== undefined
        ? Number(record.settlementAmount)
        : existing[0].settlement_amount;

      await pool.query(
        `UPDATE order_settlements 
         SET settlement_amount = ?, settlement_date = ?, attachments_json = ?, updated_at = NOW(3)
         WHERE id = ? AND order_id = ?`,
        [settlementAmount, settlementDate, JSON.stringify(updatedExtra), settlementId, orderId]
      );

      // 记录操作日志
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, status, created_at)
         VALUES (?, 'settlement_updated', 'order', ?, ?, 'success', NOW())`,
        [
          req.user?.id || null,
          orderId,
          JSON.stringify({
            settlementId,
            status: updatedExtra.status,
            settlementAmount
          })
        ]
      );

      console.log('[Orders.MySQL] 结算记录已更新，ID:', settlementId, '状态:', updatedExtra.status);

      res.json({ ok: true });
    } catch (err) {
      console.error('[Orders.MySQL] Update settlement error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Update settlement error' });
    }
  });

  // DELETE /api/orders/:orderId/settlements/:settlementId
  router.delete('/:orderId/settlements/:settlementId', async (req, res) => {
    const { orderId, settlementId } = req.params;
    try {
      // 记录操作日志
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, status, created_at)
         VALUES (?, 'settlement_deleted', 'order', ?, ?, 'success', NOW())`,
        [
          req.user?.id || null,
          orderId,
          JSON.stringify({ settlementId })
        ]
      );

      const [result] = await pool.query(
        `DELETE FROM order_settlements WHERE id = ? AND order_id = ?`,
        [settlementId, orderId]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ ok: false, error: 'Settlement not found' });
      }
      res.json({ ok: true });
    } catch (err) {
      console.error('[Orders.MySQL] Delete settlement error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete settlement error' });
    }
  });

  // ==================== 清款记录嵌套路由 ====================
  // POST /api/orders/:orderId/clearances
  router.post('/:orderId/clearances', async (req, res) => {
    const orderId = Number(req.params.orderId);
    const record = req.body;
    try {
      // 提取基础字段
      const clearanceDate = record.clearanceDate || record.clearance_date || null;
      const clearanceAmount = record.clearanceAmount ? Number(record.clearanceAmount) : 0;

      // 将所有额外字段存储为JSON
      const extraData = {
        clearanceNumber: record.clearanceNumber,
        contractName: record.contractName,
        remark: record.remark,
        attachments: record.attachments
      };

      // 插入清款记录
      const [result] = await pool.query(
        `INSERT INTO order_clearances (order_id, clearance_amount, clearance_date, attachments_json, created_at, updated_at) 
         VALUES (?, ?, ?, ?, NOW(3), NOW(3))`,
        [orderId, clearanceAmount, clearanceDate, JSON.stringify(extraData)]
      );

      res.json({ ok: true, id: result.insertId });
    } catch (err) {
      console.error('[Orders.MySQL] Create clearance error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Create clearance error' });
    }
  });

  // DELETE /api/orders/:orderId/clearances/:clearanceId
  router.delete('/:orderId/clearances/:clearanceId', async (req, res) => {
    const { orderId, clearanceId } = req.params;
    try {
      const [result] = await pool.query(
        `DELETE FROM order_clearances WHERE id = ? AND order_id = ?`,
        [clearanceId, orderId]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ ok: false, error: 'Clearance not found' });
      }
      res.json({ ok: true });
    } catch (err) {
      console.error('[Orders.MySQL] Delete clearance error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete clearance error' });
    }
  });

  // ==================== 订单操作日志 ====================
  // GET /api/orders/:orderId/logs
  router.get('/:orderId/logs', async (req, res) => {
    try {
      const orderId = Number(req.params.orderId);
      if (!Number.isFinite(orderId) || orderId <= 0) {
        return res.status(400).json({ ok: false, error: 'Invalid order ID' });
      }

      // 查询订单的操作日志
      const [rows] = await pool.query(
        `SELECT 
          al.id,
          al.user_id,
          al.action,
          al.resource_type,
          al.resource_id,
          al.details,
          al.created_at,
          u.username,
          u.name AS user_name
         FROM audit_logs al
         LEFT JOIN users u ON u.id = al.user_id
         WHERE al.resource_type = 'order' AND al.resource_id = ?
         ORDER BY al.created_at DESC
         LIMIT 100`,
        [orderId]
      );

      // 处理日志数据
      const logs = (rows || []).map(row => {
        let details = {};
        try {
          details = typeof row.details === 'string' ? JSON.parse(row.details) : (row.details || {});
        } catch (e) {
          details = {};
        }

        return {
          id: String(row.id),
          userId: row.user_id ? String(row.user_id) : undefined,
          username: row.username || '系统',
          userName: row.user_name || '系统',
          action: row.action,
          resourceType: row.resource_type,
          resourceId: String(row.resource_id),
          details: details,
          createdAt: row.created_at
        };
      });

      res.json({ ok: true, data: logs });
    } catch (err) {
      console.error('[Orders.MySQL] Get logs error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Get logs error' });
    }
  });

  return router;
}