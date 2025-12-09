import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { API_BASE } from '../../api/client';
import { Order, OrdersState, OrderFormData, OrderEquipmentItem, ReceiptRecord, RefundRecord, SuspensionRecord, ClaimRecord, SettlementRecord, ClearanceRecord } from './types';
import { calculateOrderEstimatedAmount } from './pricing';

// 模块级工具函数：规范化在租设备ID二维数组结构
const normalizeRented = (r: any): string[][] | undefined => {
  if (!Array.isArray(r)) return undefined;
  if (r.length > 0 && !Array.isArray(r[0])) return [r as string[]];
  return r as string[][];
};

// 初始状态
const initialState: OrdersState = {
  orders: [],
  loading: false,
  error: null,
  selectedOrder: null,
  detailsById: {},
  detailsLoadingById: {}
};

// 异步Thunks
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (_, { rejectWithValue }) => {
    try {
      const resp = await fetch(`${API_BASE}/orders`, { headers: { 'Content-Type': 'application/json' } });
      const json = await resp.json();
      if (!resp.ok || json?.ok === false) {
        throw new Error(json?.error || '获取订单列表失败');
      }
      const toYMD = (x: any): string => {
        if (!x) return '';
        if (typeof x === 'string') return x.slice(0, 10);
        try { return x.toISOString().slice(0, 10); } catch (_) { return String(x).slice(0, 10); }
      };
      const data = (json?.data || []) as any[];
      const orders: Order[] = data.map((o) => ({
        id: String(o.id ?? ''),
        contractNumber: o.contract_number ?? '',
        lessorId: o.lessor_id ? String(o.lessor_id) : '',
        lessorName: o.lessor_name ?? o.vendor_name ?? '',
        customerId: o.customer_id ? String(o.customer_id) : '',
        customerName: o.customer_name ?? '',
        projectName: o.project_name ?? '',
        businessManagerId: o.business_manager_id ? String(o.business_manager_id) : '',
        businessManagerName: o.business_manager_name ?? '',
        monthCalculationMethod: o.month_calculation_method ?? '30天为一月',
        paymentAgreement: o.payment_agreement ?? '预付',
        shippingFeeReduction: o.shipping_fee_reduction ?? '无减免',
        shippingFeeCalculation: o.shipping_fee_calculation ?? '按台计费',
        isTaxInvoice: o.is_tax_invoice ?? '不开票',
        invoiceTaxRate: o.invoice_tax_rate ?? undefined,
        constructionCategory: o.construction_category ?? '其他',
        deliveryLocation: o.delivery_location ?? '',
        otherAgreements: o.other_agreements ?? '',
        equipmentItems: [],
        rentedEquipmentIds: normalizeRented(o.rentedEquipmentIds ?? o.rented_equipment_ids),
        estimatedAmount: Number(o.estimated_amount ?? 0),
        receipts: undefined,
        suspensions: undefined,
        claims: undefined,
        settlements: undefined,
        clearances: undefined,
        archivedAt: undefined,
        entryAttachments: o.entryAttachments ?? undefined,
        exitAttachments: o.exitAttachments ?? undefined,
        entries: o.entries ?? undefined,
        exits: o.exits ?? undefined,
        status: {
          entryCount: Number(o.status?.entryCount ?? 0),
          exitCount: Number(o.status?.exitCount ?? 0),
          performanceStatus: o.status?.performanceStatus ?? '履约',
          actualReceivedAmount: Number(o.status?.actualReceivedAmount ?? 0),
        },
        creationDate: toYMD(o.createdAt ?? new Date()),
      }));
      return orders;
    } catch (error) {
      return rejectWithValue('获取订单列表失败');
    }
  }
);

export const fetchOrderById = createAsyncThunk(
  'orders/fetchOrderById',
  async (orderId: string, { rejectWithValue }) => {
    try {
      const resp = await fetch(`${API_BASE}/orders/${orderId}`, { headers: { 'Content-Type': 'application/json' } });
      const json = await resp.json();
      if (!resp.ok || json?.ok === false) {
        throw new Error(json?.error || '获取订单详情失败');
      }
      const d = json.data || {};
      const toYMD = (x: any): string => {
        if (!x) return '';
        if (typeof x === 'string') return x.slice(0, 10);
        try { return x.toISOString().slice(0, 10); } catch (_) { return String(x).slice(0, 10); }
      };
      const order: Order = {
        id: String(d.id ?? orderId),
        contractNumber: d.contract_number ?? '',
        lessorId: d.lessor_id ? String(d.lessor_id) : '',
        lessorName: d.lessor_name ?? d.vendor_name ?? '',
        customerId: d.customer_id ? String(d.customer_id) : '',
        customerName: d.customer_name ?? '',
        projectName: d.project_name ?? '',
        businessManagerId: d.business_manager_id ? String(d.business_manager_id) : '',
        businessManagerName: d.business_manager_name ?? '',
        monthCalculationMethod: d.month_calculation_method ?? '30天为一月',
        paymentAgreement: d.payment_agreement ?? '预付',
        shippingFeeReduction: d.shipping_fee_reduction ?? '无减免',
        shippingFeeCalculation: d.shipping_fee_calculation ?? '按台计费',
        isTaxInvoice: d.is_tax_invoice ?? '不开票',
        invoiceTaxRate: d.invoice_tax_rate ?? undefined,
        constructionCategory: d.construction_category ?? '其他',
        deliveryLocation: d.delivery_location ?? '',
        otherAgreements: d.other_agreements ?? '',
        equipmentItems: (d.equipmentItems || d.equipment_items || []).map((it: any) => ({
          id: String(it.id ?? ''),
          equipmentType: it.equipmentType ?? it.equipment_type ?? '',
          height: it.height ?? '',
          quantity: Number(it.quantity ?? 0),
          dailyRate: Number(it.dailyRate ?? it.daily_rate ?? 0),
          monthlyRate: Number(it.monthlyRate ?? it.monthly_rate ?? 0),
          deposit: Number(it.deposit ?? 0),
          shippingFee: Number(it.shippingFee ?? it.shipping_fee ?? 0),
          modificationFee: Number(it.modificationFee ?? it.modification_fee ?? 0),
          scheduledEntryDate: it.scheduledEntryDate ?? it.scheduled_entry_date ?? '',
          estimatedExitDate: it.estimatedExitDate ?? it.estimated_exit_date ?? '',
          rentalPeriod: Number(it.rentalPeriod ?? it.rental_period ?? 0),
          shippingType: it.shippingType ?? (it.shipping_type ? (String(it.shipping_type) === '单程' ? '单程' : '双程') : '双程'),
        })),
        rentedEquipmentIds: d.rentedEquipmentIds as string[][] | undefined,
        estimatedAmount: Number(d.estimated_amount ?? 0),
        receipts: d.receipts ?? undefined,
        refunds: d.refunds ?? undefined,
        suspensions: d.suspensions ?? undefined,
        claims: d.claims ?? undefined,
        settlements: d.settlements ?? undefined,
        clearances: d.clearances ?? undefined,
        archivedAt: undefined,
        entryAttachments: d.entryAttachments ?? undefined,
        exitAttachments: d.exitAttachments ?? undefined,
        entries: d.entries ?? undefined,
        exits: d.exits ?? undefined,
        status: {
          entryCount: Number(d.status?.entryCount ?? 0),
          exitCount: Number(d.status?.exitCount ?? 0),
          performanceStatus: d.status?.performanceStatus ?? '履约',
          actualReceivedAmount: Number(d.status?.actualReceivedAmount ?? 0),
        },
        creationDate: toYMD(d.createdAt ?? new Date()),
      };
      return order;
    } catch (error) {
      return rejectWithValue('获取订单详情失败');
    }
  }
);

export const addOrder = createAsyncThunk(
  'orders/addOrder',
  async (orderData: OrderFormData, { rejectWithValue }) => {
    try {
      const calculateEstimatedAmount = (items: OrderEquipmentItem[]): number => {
        return calculateOrderEstimatedAmount(items);
      };
      const payload = {
        // 合同编号由后端生成并保证唯一
        lessor_id: orderData.lessorId,
        lessor_name: null,
        vendor_name: null,
        customer_id: orderData.customerId,
        customer_name: null,
        project_name: orderData.projectName,
        business_manager_id: orderData.businessManagerId,
        business_manager_name: null,
        month_calculation_method: orderData.monthCalculationMethod,
        payment_agreement: orderData.paymentAgreement,
        shipping_fee_reduction: orderData.shippingFeeReduction,
        shipping_fee_calculation: orderData.shippingFeeCalculation,
        is_tax_invoice: orderData.isTaxInvoice,
        invoice_tax_rate: orderData.invoiceTaxRate ?? null,
        construction_category: orderData.constructionCategory,
        delivery_location: orderData.deliveryLocation,
        other_agreements: orderData.otherAgreements,
        status: { entryCount: 0, exitCount: 0, performanceStatus: '履约', actualReceivedAmount: 0 },
        rentedEquipmentIds: undefined,
        entryAttachments: undefined,
        exitAttachments: undefined,
        entries: undefined,
        exits: undefined,
        estimated_amount: calculateEstimatedAmount(orderData.equipmentItems),
        creation_date: new Date().toISOString().slice(0, 10),
        equipmentItems: orderData.equipmentItems.map(it => ({
          equipmentType: it.equipmentType,
          height: it.height,
          quantity: it.quantity,
          monthlyRate: it.monthlyRate,
          dailyRate: it.dailyRate,
          deposit: it.deposit,
          shippingFee: it.shippingFee,
          modificationFee: it.modificationFee,
          scheduledEntryDate: it.scheduledEntryDate,
          estimatedExitDate: it.estimatedExitDate,
          rentalPeriod: it.rentalPeriod,
          shippingType: it.shippingType,
        })),
      } as any;
      const createResp = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const createJson = await createResp.json();
      if (!createResp.ok || createJson?.ok === false) {
        throw new Error(createJson?.error || '新增订单失败');
      }
      const id = String(createJson.id);
      const detailResp = await fetch(`${API_BASE}/orders/${id}`);
      const detailJson = await detailResp.json();
      if (!detailResp.ok || detailJson?.ok === false) {
        throw new Error(detailJson?.error || '获取订单详情失败');
      }
      const d = detailJson.data || {};
      const toYMD = (x: any): string => {
        if (!x) return '';
        if (typeof x === 'string') return x.slice(0, 10);
        try { return x.toISOString().slice(0, 10); } catch (_) { return String(x).slice(0, 10); }
      };
      const order: Order = {
        id: String(d.id ?? id),
        contractNumber: d.contract_number ?? '',
        lessorId: d.lessor_id ? String(d.lessor_id) : '',
        lessorName: d.lessor_name ?? d.vendor_name ?? '',
        customerId: d.customer_id ? String(d.customer_id) : '',
        customerName: d.customer_name ?? '',
        projectName: d.project_name ?? '',
        businessManagerId: d.business_manager_id ? String(d.business_manager_id) : '',
        businessManagerName: d.business_manager_name ?? '',
        monthCalculationMethod: d.month_calculation_method ?? '30天为一月',
        paymentAgreement: d.payment_agreement ?? '预付',
        shippingFeeReduction: d.shipping_fee_reduction ?? '无减免',
        shippingFeeCalculation: d.shipping_fee_calculation ?? '按台计费',
        isTaxInvoice: d.is_tax_invoice ?? '不开票',
        invoiceTaxRate: d.invoice_tax_rate ?? undefined,
        constructionCategory: d.construction_category ?? '其他',
        deliveryLocation: d.delivery_location ?? '',
        otherAgreements: d.other_agreements ?? '',
        equipmentItems: (d.equipmentItems || d.equipment_items || []).map((it: any) => ({
          id: String(it.id ?? ''),
          equipmentType: it.equipmentType ?? it.equipment_type ?? '',
          height: it.height ?? '',
          quantity: Number(it.quantity ?? 0),
          dailyRate: Number(it.dailyRate ?? it.daily_rate ?? 0),
          monthlyRate: Number(it.monthlyRate ?? it.monthly_rate ?? 0),
          deposit: Number(it.deposit ?? 0),
          shippingFee: Number(it.shippingFee ?? it.shipping_fee ?? 0),
          modificationFee: Number(it.modificationFee ?? it.modification_fee ?? 0),
          scheduledEntryDate: it.scheduledEntryDate ?? it.scheduled_entry_date ?? '',
          estimatedExitDate: it.estimatedExitDate ?? it.estimated_exit_date ?? '',
          rentalPeriod: Number(it.rentalPeriod ?? it.rental_period ?? 0),
          shippingType: it.shippingType ?? (it.shipping_type ? (String(it.shipping_type) === '单程' ? '单程' : '双程') : '双程'),
        })),
        rentedEquipmentIds: normalizeRented(d.rentedEquipmentIds ?? d.rented_equipment_ids),
        estimatedAmount: Number(d.estimated_amount ?? 0),
        receipts: d.receipts ?? undefined,
        refunds: d.refunds ?? undefined,
        suspensions: d.suspensions ?? undefined,
        claims: d.claims ?? undefined,
        settlements: d.settlements ?? undefined,
        clearances: d.clearances ?? undefined,
        archivedAt: undefined,
        entryAttachments: d.entryAttachments ?? undefined,
        exitAttachments: d.exitAttachments ?? undefined,
        entries: d.entries ?? undefined,
        exits: d.exits ?? undefined,
        status: {
          entryCount: Number(d.status?.entryCount ?? 0),
          exitCount: Number(d.status?.exitCount ?? 0),
          performanceStatus: d.status?.performanceStatus ?? '履约',
          actualReceivedAmount: Number(d.status?.actualReceivedAmount ?? 0),
        },
        creationDate: toYMD(d.createdAt ?? new Date()),
      };
      return order;
    } catch (error) {
      return rejectWithValue('新增订单失败');
    }
  }
);

export const updateOrder = createAsyncThunk(
  'orders/updateOrder',
  async (updatedOrder: Order, { rejectWithValue }) => {
    try {
      // 调用后端更新订单基础信息（状态/附件/在租设备等）
      const resp = await fetch(`${API_BASE}/orders/${updatedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_number: updatedOrder.contractNumber,
          lessor_id: updatedOrder.lessorId,
          lessor_name: updatedOrder.lessorName,
          customer_id: updatedOrder.customerId,
          customer_name: updatedOrder.customerName,
          project_name: updatedOrder.projectName,
          business_manager_id: updatedOrder.businessManagerId,
          business_manager_name: updatedOrder.businessManagerName,
          delivery_location: updatedOrder.deliveryLocation,
          payment_agreement: updatedOrder.paymentAgreement,
          month_calculation_method: updatedOrder.monthCalculationMethod,
          shipping_fee_reduction: updatedOrder.shippingFeeReduction,
          shipping_fee_calculation: updatedOrder.shippingFeeCalculation,
          is_tax_invoice: updatedOrder.isTaxInvoice,
          invoice_tax_rate: updatedOrder.invoiceTaxRate,
          construction_category: updatedOrder.constructionCategory,
          other_agreements: updatedOrder.otherAgreements,
          status: updatedOrder.status,
          rentedEquipmentIds: updatedOrder.rentedEquipmentIds,
          entryAttachments: updatedOrder.entryAttachments,
          exitAttachments: updatedOrder.exitAttachments,
          entries: updatedOrder.entries,
          exits: updatedOrder.exits,
          estimatedAmount: updatedOrder.estimatedAmount,
          creationDate: updatedOrder.creationDate,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || data?.ok === false) {
        throw new Error(data?.error || '更新订单失败');
      }
      return updatedOrder;
    } catch (error) {
      return rejectWithValue('更新订单失败');
    }
  }
);

export const deleteOrder = createAsyncThunk(
  'orders/deleteOrder',
  async (orderId: string, { rejectWithValue }) => {
    try {
      const resp = await fetch(`${API_BASE}/orders/${orderId}`, { method: 'DELETE' });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || data?.ok === false) {
        throw new Error(data?.error || '删除订单失败');
      }
      return orderId;
    } catch (error) {
      return rejectWithValue('删除订单失败');
    }
  }
);

// 记录创建 thunks
export const addReceipt = createAsyncThunk(
  'orders/addReceipt',
  async (params: { orderId: string; record: ReceiptRecord }, { rejectWithValue }) => {
    try {
      const { orderId, record } = params;
      const resp = await fetch(`${API_BASE}/orders/${orderId}/receipts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptNumber: record.receiptNumber,
          contractName: record.contractName,
          receiptDate: record.receiptDate,
          paymentMethod: record.paymentMethod,
          amount: record.amount,
          attachments: record.attachments,
          remark: record.remark,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || data?.ok === false) {
        throw new Error(data?.error || '新增收款记录失败');
      }
      return { orderId, record: { ...record, id: String(data.id || record.id) } };
    } catch (error: any) {
      return rejectWithValue(error?.message || '新增收款记录失败');
    }
  }
);

// 新增：退款记录
export const addRefund = createAsyncThunk(
  'orders/addRefund',
  async (params: { orderId: string; record: RefundRecord }, { rejectWithValue }) => {
    try {
      const { orderId, record } = params;
      const resp = await fetch(`${API_BASE}/orders/${orderId}/refunds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refundNumber: record.refundNumber,
          contractName: record.contractName,
          refundDate: record.refundDate,
          paymentMethod: record.paymentMethod,
          amount: record.amount,
          attachments: record.attachments,
          remark: record.remark,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || data?.ok === false) {
        throw new Error(data?.error || '新增退款记录失败');
      }
      return { orderId, record: { ...record, id: String(data.id || record.id) } };
    } catch (error: any) {
      return rejectWithValue(error?.message || '新增退款记录失败');
    }
  }
);

export const addSuspension = createAsyncThunk(
  'orders/addSuspension',
  async (params: { orderId: string; record: SuspensionRecord }, { rejectWithValue }) => {
    try {
      const { orderId, record } = params;
      const resp = await fetch(`${API_BASE}/orders/${orderId}/suspensions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suspensionNumber: record.suspensionNumber,
          contractName: record.contractName,
          suspensionType: record.suspensionType,
          reason: record.reason,
          startDate: record.startDate,
          endDate: record.endDate,
          suspensionDays: record.suspensionDays,
          equipmentSelections: record.equipmentSelections,
          attachments: record.attachments,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || data?.ok === false) {
        throw new Error(data?.error || '新增报停记录失败');
      }
      return { orderId, record: { ...record, id: String(data.id || record.id) } };
    } catch (error: any) {
      return rejectWithValue(error?.message || '新增报停记录失败');
    }
  }
);

export const addClaim = createAsyncThunk(
  'orders/addClaim',
  async (params: { orderId: string; record: ClaimRecord }, { rejectWithValue }) => {
    try {
      const { orderId, record } = params;
      const resp = await fetch(`${API_BASE}/orders/${orderId}/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimNumber: record.claimNumber,
          contractName: record.contractName,
          reason: record.reason,
          claimDate: record.claimDate,
          claimAmount: record.claimAmount,
          equipmentSelections: record.equipmentSelections,
          attachments: record.attachments,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || data?.ok === false) {
        throw new Error(data?.error || '新增索赔记录失败');
      }
      return { orderId, record: { ...record, id: String(data.id || record.id) } };
    } catch (error: any) {
      return rejectWithValue(error?.message || '新增索赔记录失败');
    }
  }
);

export const addSettlement = createAsyncThunk(
  'orders/addSettlement',
  async (params: { orderId: string; record: SettlementRecord }, { rejectWithValue }) => {
    try {
      const { orderId, record } = params;
      const resp = await fetch(`${API_BASE}/orders/${orderId}/settlements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlementNumber: record.settlementNumber,
          contractName: record.contractName,
          settlementDate: record.settlementDate,
          settlementAmount: record.settlementAmount,
          attachments: record.attachments,
          remark: record.remark,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || data?.ok === false) {
        throw new Error(data?.error || '新增结算记录失败');
      }
      return { orderId, record: { ...record, id: String(data.id || record.id) } };
    } catch (error: any) {
      return rejectWithValue(error?.message || '新增结算记录失败');
    }
  }
);

export const addClearance = createAsyncThunk(
  'orders/addClearance',
  async (params: { orderId: string; record: ClearanceRecord }, { rejectWithValue }) => {
    try {
      const { orderId, record } = params;
      const resp = await fetch(`${API_BASE}/orders/${orderId}/clearances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clearanceNumber: record.clearanceNumber,
          contractName: record.contractName,
          clearanceDate: record.clearanceDate,
          clearanceAmount: record.clearanceAmount,
          attachments: record.attachments,
          remark: record.remark,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || data?.ok === false) {
        throw new Error(data?.error || '新增结清记录失败');
      }
      return { orderId, record: { ...record, id: String(data.id || record.id) } };
    } catch (error: any) {
      return rejectWithValue(error?.message || '新增结清记录失败');
    }
  }
);

// 新增：进场记录
export const addEntry = createAsyncThunk(
  'orders/addEntry',
  async (params: { orderId: string; record: any }, { rejectWithValue }) => {
    try {
      const { orderId, record } = params;
      const resp = await fetch(`${API_BASE}/orders/${orderId}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryNumber: record.entryNumber,
          contractName: record.contractName,
          entryDate: record.entryDate,
          equipmentSummary: record.equipmentSummary,
          equipmentCodes: record.equipmentCodes,
          transportMethod: record.transportMethod,
          businessManagerName: record.businessManagerName,
          handoverPerson: record.handoverPerson,
          attachments: record.attachments,
          vehicleId: record.vehicleId,
          driverId: record.driverId,
          companyId: record.companyId,
          companyContactName: record.companyContactName,
          companyContactPhone: record.companyContactPhone,
          logisticsCost: record.logisticsCost,
          vehiclePlate: record.vehiclePlate,
          driverName: record.driverName,
          driverPhone: record.driverPhone,
          companyName: record.companyName,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || data?.ok === false) {
        throw new Error(data?.error || '新增进场记录失败');
      }
      return { orderId, record: { ...record, id: String(data.id || record.id) } };
    } catch (error: any) {
      return rejectWithValue(error?.message || '新增进场记录失败');
    }
  }
);

// 新增：退场记录
export const addExit = createAsyncThunk(
  'orders/addExit',
  async (params: { orderId: string; record: any }, { rejectWithValue }) => {
    try {
      const { orderId, record } = params;
      const resp = await fetch(`${API_BASE}/orders/${orderId}/exits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exitNumber: record.exitNumber,
          contractName: record.contractName,
          exitDate: record.exitDate,
          equipmentSummary: record.equipmentSummary,
          equipmentCodes: record.equipmentCodes,
          transportMethod: record.transportMethod,
          businessManagerName: record.businessManagerName,
          handoverPerson: record.handoverPerson,
          attachments: record.attachments,
          vehicleId: record.vehicleId,
          driverId: record.driverId,
          companyId: record.companyId,
          companyContactName: record.companyContactName,
          companyContactPhone: record.companyContactPhone,
          logisticsCost: record.logisticsCost,
          vehiclePlate: record.vehiclePlate,
          driverName: record.driverName,
          driverPhone: record.driverPhone,
          companyName: record.companyName,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || data?.ok === false) {
        throw new Error(data?.error || '新增退场记录失败');
      }
      return { orderId, record: { ...record, id: String(data.id || record.id) } };
    } catch (error: any) {
      return rejectWithValue(error?.message || '新增退场记录失败');
    }
  }
);

// Slice创建
const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    selectOrder: (state, action: PayloadAction<Order | null>) => {
      state.selectedOrder = action.payload;
    },
    clearOrderError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // fetchOrders
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
    
    // addOrder
    builder
      .addCase(addOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.orders.push(action.payload);
      })
      .addCase(addOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
    
    // updateOrder
    builder
      .addCase(updateOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOrder.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.orders.findIndex(order => order.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        }
        // 同步详情缓存，避免详情页数据陈旧
        const id = action.payload.id;
        if (state.detailsById && state.detailsById[id]) {
          state.detailsById[id] = action.payload;
        }
      })
      .addCase(updateOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
    
    // deleteOrder
    builder
      .addCase(deleteOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = state.orders.filter(order => order.id !== action.payload);
      })
      .addCase(deleteOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // addReceipt
    builder
      .addCase(addReceipt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addReceipt.fulfilled, (state, action) => {
        state.loading = false;
        const { orderId, record } = action.payload as { orderId: string; record: ReceiptRecord };
        const idx = state.orders.findIndex(o => o.id === orderId);
        if (idx !== -1) {
          const prev = state.orders[idx];
          const currentAmount = prev.status?.actualReceivedAmount || 0;
          state.orders[idx] = {
            ...prev,
            receipts: [...(prev.receipts || []), record],
            status: { ...prev.status, actualReceivedAmount: currentAmount + (record.amount || 0) }
          } as Order;
        }
        if (state.detailsById && state.detailsById[orderId]) {
          const prev = state.detailsById[orderId] as Order;
          const currentAmount = prev.status?.actualReceivedAmount || 0;
          state.detailsById[orderId] = {
            ...prev,
            receipts: [...(prev.receipts || []), record],
            status: { ...prev.status, actualReceivedAmount: currentAmount + (record.amount || 0) }
          } as Order;
        }
      })
      .addCase(addReceipt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // addRefund
    builder
      .addCase(addRefund.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addRefund.fulfilled, (state, action) => {
        state.loading = false;
        const { orderId, record } = action.payload as { orderId: string; record: RefundRecord };
        const idx = state.orders.findIndex(o => o.id === orderId);
        if (idx !== -1) {
          const prev = state.orders[idx];
          const currentAmount = prev.status?.actualReceivedAmount || 0;
          state.orders[idx] = {
            ...prev,
            refunds: [...(prev.refunds || []), record],
            status: { ...prev.status, actualReceivedAmount: Math.max(0, currentAmount - (record.amount || 0)) }
          } as Order;
        }
        if (state.detailsById && state.detailsById[orderId]) {
          const prev = state.detailsById[orderId] as Order;
          const currentAmount = prev.status?.actualReceivedAmount || 0;
          state.detailsById[orderId] = {
            ...prev,
            refunds: [...(prev.refunds || []), record],
            status: { ...prev.status, actualReceivedAmount: Math.max(0, currentAmount - (record.amount || 0)) }
          } as Order;
        }
      })
      .addCase(addRefund.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // addSuspension
    builder
      .addCase(addSuspension.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addSuspension.fulfilled, (state, action) => {
        state.loading = false;
        const { orderId, record } = action.payload as { orderId: string; record: SuspensionRecord };
        const idx = state.orders.findIndex(o => o.id === orderId);
        if (idx !== -1) {
          const prev = state.orders[idx];
          state.orders[idx] = {
            ...prev,
            suspensions: [...(prev.suspensions || []), record],
          } as Order;
        }
      })
      .addCase(addSuspension.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // addClaim
    builder
      .addCase(addClaim.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addClaim.fulfilled, (state, action) => {
        state.loading = false;
        const { orderId, record } = action.payload as { orderId: string; record: ClaimRecord };
        const idx = state.orders.findIndex(o => o.id === orderId);
        if (idx !== -1) {
          const prev = state.orders[idx];
          state.orders[idx] = {
            ...prev,
            claims: [...(prev.claims || []), record],
          } as Order;
        }
      })
      .addCase(addClaim.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // addSettlement
    builder
      .addCase(addSettlement.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addSettlement.fulfilled, (state, action) => {
        state.loading = false;
        const { orderId, record } = action.payload as { orderId: string; record: SettlementRecord };
        const idx = state.orders.findIndex(o => o.id === orderId);
        if (idx !== -1) {
          const prev = state.orders[idx];
          state.orders[idx] = {
            ...prev,
            settlements: [...(prev.settlements || []), record],
          } as Order;
        }
      })
      .addCase(addSettlement.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // addClearance
    builder
      .addCase(addClearance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addClearance.fulfilled, (state, action) => {
        state.loading = false;
        const { orderId, record } = action.payload as { orderId: string; record: ClearanceRecord };
        const idx = state.orders.findIndex(o => o.id === orderId);
        if (idx !== -1) {
          const prev = state.orders[idx];
          state.orders[idx] = {
            ...prev,
            clearances: [...(prev.clearances || []), record],
          } as Order;
        }
      })
      .addCase(addClearance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // addEntry
      .addCase(addEntry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addEntry.fulfilled, (state, action) => {
        state.loading = false;
        const { orderId, record } = action.payload as { orderId: string; record: any };
        const idx = state.orders.findIndex(o => o.id === orderId);
        if (idx !== -1) {
          const prev = state.orders[idx];
          const nextEntries = [...(prev.entries || []), record];
          const currentCount = prev.status?.entryCount || 0;
          const inc = (record.equipmentCount != null ? record.equipmentCount : Array.isArray(record.equipmentCodes) ? record.equipmentCodes.length : 1);
          state.orders[idx] = { ...prev, entries: nextEntries, status: { ...prev.status, entryCount: currentCount + inc } } as Order;
        }
        if (state.detailsById && state.detailsById[orderId]) {
          const prev = state.detailsById[orderId] as Order;
          const nextEntries = [...(prev.entries || []), record];
          const currentCount = prev.status?.entryCount || 0;
          const inc = (record.equipmentCount != null ? record.equipmentCount : Array.isArray(record.equipmentCodes) ? record.equipmentCodes.length : 1);
          state.detailsById[orderId] = { ...prev, entries: nextEntries, status: { ...prev.status, entryCount: currentCount + inc } } as Order;
        }
      })
      .addCase(addEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // addExit
      .addCase(addExit.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addExit.fulfilled, (state, action) => {
        state.loading = false;
        const { orderId, record } = action.payload as { orderId: string; record: any };
        const idx = state.orders.findIndex(o => o.id === orderId);
        if (idx !== -1) {
          const prev = state.orders[idx];
          const nextExits = [...(prev.exits || []), record];
          const currentCount = prev.status?.exitCount || 0;
          const inc = (record.equipmentCount != null ? record.equipmentCount : Array.isArray(record.equipmentCodes) ? record.equipmentCodes.length : 1);
          state.orders[idx] = { ...prev, exits: nextExits, status: { ...prev.status, exitCount: currentCount + inc } } as Order;
        }
        if (state.detailsById && state.detailsById[orderId]) {
          const prev = state.detailsById[orderId] as Order;
          const nextExits = [...(prev.exits || []), record];
          const currentCount = prev.status?.exitCount || 0;
          const inc = (record.equipmentCount != null ? record.equipmentCount : Array.isArray(record.equipmentCodes) ? record.equipmentCodes.length : 1);
          state.detailsById[orderId] = { ...prev, exits: nextExits, status: { ...prev.status, exitCount: currentCount + inc } } as Order;
        }
      })
      .addCase(addExit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchOrderById
      .addCase(fetchOrderById.pending, (state, action) => {
        const id = action.meta.arg as string;
        if (state.detailsLoadingById) state.detailsLoadingById[id] = true;
        state.error = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        const order = action.payload as Order;
        if (state.detailsLoadingById) state.detailsLoadingById[order.id] = false;
        if (state.detailsById) state.detailsById[order.id] = order;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        const id = (action.meta as any)?.arg as string;
        if (state.detailsLoadingById) state.detailsLoadingById[id] = false;
        state.error = action.payload as string;
      });
  }
});

// 导出actions
export const { selectOrder, clearOrderError } = ordersSlice.actions;

// 导出选择器
export const selectOrders = (state: { orders: OrdersState }) => state.orders.orders;
export const selectOrdersLoading = (state: { orders: OrdersState }) => state.orders.loading;
export const selectOrdersError = (state: { orders: OrdersState }) => state.orders.error;
export const selectSelectedOrder = (state: { orders: OrdersState }) => state.orders.selectedOrder;
export const selectOrderDetailsById = (id: string) => (state: { orders: OrdersState }) => state.orders.detailsById?.[id];
export const selectOrderDetailsLoadingById = (id: string) => (state: { orders: OrdersState }) => state.orders.detailsLoadingById?.[id] || false;
export const selectOrderById = (id: string) => (state: { orders: OrdersState }) => state.orders.detailsById?.[id] || state.orders.orders.find(o => o.id === id) || null;

// 导出reducer
export default ordersSlice.reducer;