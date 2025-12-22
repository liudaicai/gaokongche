import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';
import { Order, OrdersState, OrderFormData, OrderEquipmentItem } from './types';
import { calculateOrderEstimatedAmount } from './pricing';

// 模块级工具函数：规范化在租设备ID二维数组结构
const normalizeRented = (r: any): string[][] | undefined => {
  if (!Array.isArray(r)) return undefined;
  if (r.length > 0 && !Array.isArray(r[0])) return [r as string[]];
  return r as string[][];
};

// 异步Thunks
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiGet<any[]>('/orders');
      console.log('[OrdersSlice] API response:', response);
      const toYMD = (x: any): string => {
        if (!x) return '';
        if (typeof x === 'string') return x.slice(0, 10);
        try { return x.toISOString().slice(0, 10); } catch (_) { return String(x).slice(0, 10); }
      };
      // apiGet 会直接返回 data 数组，而不是完整的响应对象
      const data = Array.isArray(response) ? response : ((response as any)?.data || []) as any[];
      console.log('[OrdersSlice] Orders data from API:', data);
      if (!Array.isArray(data)) {
        console.error('[OrdersSlice] Data is not an array:', data);
        return rejectWithValue('订单数据格式错误');
      }
      const orders: Order[] = data.map((o: any) => ({
        id: String(o.id ?? ''),
        contractNumber: o.contract_number ?? '',
        lessorId: o.lessor_id ? String(o.lessor_id) : '',
        lessorCompanyId: o.lessor_company_id ? String(o.lessor_company_id) : '',  // 添加对 lessor_company_id 的支持
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
        equipmentItems: (o.equipmentItems || o.equipment_items || []).map((it: any) => ({
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
          shippingType: it.shippingType ?? it.shipping_type ?? '双程',
        })),
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
      console.log('[OrdersSlice] Processed orders:', orders);
      return orders;
    } catch (error) {
      console.error('[OrdersSlice] Fetch orders error:', error);
      return rejectWithValue('获取订单列表失败');
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
        equipment_items: orderData.equipmentItems.map(it => ({
          equipment_category: it.equipmentCategory || '其他',
          equipment_type: it.equipmentType,
          height: it.height,
          quantity: it.quantity,
          monthly_rate: it.monthlyRate,
          daily_rate: it.dailyRate,
          deposit: it.deposit,
          shipping_fee: it.shippingFee,
          modification_fee: it.modificationFee,
          scheduled_entry_date: it.scheduledEntryDate,
          estimated_exit_date: it.estimatedExitDate,
          rental_period: it.rentalPeriod,
          shipping_type: it.shippingType,
        })),
      } as any;
      
      // 添加日志以便调试
      console.log('[OrdersSlice] Creating order with payload:', payload);
      
      const createJson = await apiPost<any>('/orders', payload);
      console.log('[OrdersSlice] Order creation response:', createJson);
      
      // 确保正确提取订单ID
      const id = String((createJson as any)?.id || (createJson as any)?.data?.id || (createJson as any)?.insertId);
      if (!id) {
        throw new Error('无法获取创建的订单ID');
      }
      
      // 获取创建的订单详情
      const detailJson = await apiGet<any>(`/orders/${id}`);
      console.log('[OrdersSlice] Order detail response:', detailJson);
      
      // apiGet 会直接返回 订单对象，而不是 { data: {...} }
      const d = Array.isArray(detailJson) ? {} : (typeof detailJson === 'object' && detailJson !== null ? detailJson : {});
      const toYMD = (x: any): string => {
        if (!x) return '';
        if (typeof x === 'string') return x.slice(0, 10);
        try { return x.toISOString().slice(0, 10); } catch (_) { return String(x).slice(0, 10); }
      };
      
      const order: Order = {
        id: String(d.id ?? id),
        contractNumber: d.contract_number ?? '',
        lessorId: d.lessor_id ? String(d.lessor_id) : '',
        lessorCompanyId: d.lessor_company_id ? String(d.lessor_company_id) : '',  // 添加对 lessor_company_id 的支持
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
      
      console.log('[OrdersSlice] Processed order:', order);
      return order;
    } catch (error: any) {
      console.error('[OrdersSlice] Add order error:', error);
      // 提供更详细的错误信息
      const errorMessage = error?.message || error?.error || '新增订单失败';
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateOrder = createAsyncThunk(
  'orders/updateOrder',
  async (updatedOrder: Order, { rejectWithValue }) => {
    try {
      // 调用后端更新订单基础信息（状态/附件/在租设备等）
      await apiPut(`/orders/${updatedOrder.id}`, {
          contract_number: updatedOrder.contractNumber,
          lessor_id: updatedOrder.lessorId,
          lessor_company_id: updatedOrder.lessorCompanyId,  // 添加对 lessor_company_id 的支持
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
        });
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
      await apiDelete(`/orders/${orderId}`);
      return orderId;
    } catch (error) {
      return rejectWithValue('删除订单失败');
    }
  }
);

// 新增：添加进场记录
export const addEntry = createAsyncThunk(
  'orders/addEntry',
  async ({ orderId, record }: { orderId: string; record: any }, { rejectWithValue }) => {
    try {
      const response = await apiPost<{ id: number }>(`/orders/${orderId}/entries`, record);
      return { orderId, record: { ...record, id: String(response.id) } };
    } catch (error) {
      return rejectWithValue('添加进场记录失败');
    }
  }
);

// 新增：添加退场记录
export const addExit = createAsyncThunk(
  'orders/addExit',
  async ({ orderId, record }: { orderId: string; record: any }, { rejectWithValue }) => {
    try {
      const response = await apiPost<{ id: number }>(`/orders/${orderId}/exits`, record);
      return { orderId, record: { ...record, id: String(response.id) } };
    } catch (error) {
      return rejectWithValue('添加退场记录失败');
    }
  }
);

// 新增：添加收款记录
export const addReceipt = createAsyncThunk(
  'orders/addReceipt',
  async ({ orderId, record }: { orderId: string; record: any }, { rejectWithValue }) => {
    try {
      const response = await apiPost<{ id: number }>(`/orders/${orderId}/receipts`, record);
      return { orderId, record: { ...record, id: String(response.id) } };
    } catch (error) {
      return rejectWithValue('添加收款记录失败');
    }
  }
);

// 新增：添加退款记录
export const addRefund = createAsyncThunk(
  'orders/addRefund',
  async ({ orderId, record }: { orderId: string; record: any }, { rejectWithValue }) => {
    try {
      const response = await apiPost<{ id: number }>(`/orders/${orderId}/refunds`, record);
      return { orderId, record: { ...record, id: String(response.id) } };
    } catch (error) {
      return rejectWithValue('添加退款记录失败');
    }
  }
);

// 新增：删除收款记录
export const deleteReceipt = createAsyncThunk(
  'orders/deleteReceipt',
  async ({ orderId, receiptId }: { orderId: string; receiptId: string }, { rejectWithValue }) => {
    try {
      await apiDelete(`/orders/${orderId}/receipts/${receiptId}`);
      return { orderId, receiptId };
    } catch (error) {
      return rejectWithValue('删除收款记录失败');
    }
  }
);

// 新增：删除退款记录
export const deleteRefund = createAsyncThunk(
  'orders/deleteRefund',
  async ({ orderId, refundId }: { orderId: string; refundId: string }, { rejectWithValue }) => {
    try {
      await apiDelete(`/orders/${orderId}/refunds/${refundId}`);
      return { orderId, refundId };
    } catch (error) {
      return rejectWithValue('删除退款记录失败');
    }
  }
);

// 新增：添加报停记录
export const addSuspension = createAsyncThunk(
  'orders/addSuspension',
  async ({ orderId, record }: { orderId: string; record: any }, { rejectWithValue }) => {
    try {
      console.log('[addSuspension] 提交报停记录:', { orderId, record });
      const response = await apiPost<{ id: number }>(`/orders/${orderId}/suspensions`, record);
      return { orderId, record: { ...record, id: String(response.id) } };
    } catch (error: any) {
      console.error('[addSuspension] 错误:', error);
      const errorMessage = error?.message || error?.error || '添加报停记录失败';
      return rejectWithValue(errorMessage);
    }
  }
);

// 新增：添加索赔记录
export const addClaim = createAsyncThunk(
  'orders/addClaim',
  async ({ orderId, record }: { orderId: string; record: any }, { rejectWithValue }) => {
    try {
      const response = await apiPost<{ id: number }>(`/orders/${orderId}/claims`, record);
      return { orderId, record: { ...record, id: String(response.id) } };
    } catch (error) {
      return rejectWithValue('添加索赔记录失败');
    }
  }
);

// 新增：添加结算记录
export const addSettlement = createAsyncThunk(
  'orders/addSettlement',
  async ({ orderId, record }: { orderId: string; record: any }, { rejectWithValue }) => {
    try {
      const response = await apiPost<{ id: number }>(`/orders/${orderId}/settlements`, record);
      return { orderId, record: { ...record, id: String(response.id) } };
    } catch (error: any) {
      const message = error.message || '添加结算记录失败';
      const details = error.details ? ` (${JSON.stringify(error.details)})` : '';
      return rejectWithValue(message + details);
    }
  }
);

// 新增：更新结算记录（用于对账状态等）
export const updateSettlement = createAsyncThunk(
  'orders/updateSettlement',
  async ({ orderId, settlementId, updates }: { orderId: string; settlementId: string; updates: any }, { rejectWithValue }) => {
    try {
      await apiPut(`/orders/${orderId}/settlements/${settlementId}`, updates);
      return { orderId, settlementId, updates };
    } catch (error: any) {
      const message = error.message || '更新结算记录失败';
      return rejectWithValue(message);
    }
  }
);

// 新增：删除结算记录
export const deleteSettlement = createAsyncThunk(
  'orders/deleteSettlement',
  async ({ orderId, settlementId }: { orderId: string; settlementId: string }, { rejectWithValue }) => {
    try {
      await apiDelete(`/orders/${orderId}/settlements/${settlementId}`);
      return { orderId, settlementId };
    } catch (error: any) {
      const message = error.message || '删除结算记录失败';
      return rejectWithValue(message);
    }
  }
);

// 新增：添加结清记录
export const addClearance = createAsyncThunk(
  'orders/addClearance',
  async ({ orderId, record }: { orderId: string; record: any }, { rejectWithValue }) => {
    try {
      const response = await apiPost<{ id: number }>(`/orders/${orderId}/clearances`, record);
      return { orderId, record: { ...record, id: String(response.id) } };
    } catch (error: any) {
      const message = error.message || '添加结清记录失败';
      const details = error.details ? ` (${JSON.stringify(error.details)})` : '';
      return rejectWithValue(message + details);
    }
  }
);

// 新增：删除进场记录
export const deleteEntry = createAsyncThunk(
  'orders/deleteEntry',
  async ({ orderId, entryId }: { orderId: string; entryId: string }, { rejectWithValue }) => {
    try {
      await apiDelete(`/orders/${orderId}/entries/${entryId}`);
      return { orderId, entryId };
    } catch (error) {
      return rejectWithValue('删除进场记录失败');
    }
  }
);

// 新增：删除退场记录
export const deleteExit = createAsyncThunk(
  'orders/deleteExit',
  async ({ orderId, exitId }: { orderId: string; exitId: string }, { rejectWithValue }) => {
    try {
      await apiDelete(`/orders/${orderId}/exits/${exitId}`);
      return { orderId, exitId };
    } catch (error) {
      return rejectWithValue('删除退场记录失败');
    }
  }
);

export const fetchOrderById = createAsyncThunk(
  'orders/fetchOrderById',
  async (orderId: string, { rejectWithValue }) => {
    try {
      // 优先请求详情接口；若不可用，则回退到列表查询并根据 id 取一条
      let d: any = {};
      try {
        const json = await apiGet<any>(`/orders/${orderId}`);
        // apiGet 会直接返回 订单对象，而不是 { data: {...} }
        d = Array.isArray(json) ? {} : (typeof json === 'object' && json !== null ? json : {});
      } catch (_) {
        // 回退：从列表中查找
        const listJson = await apiGet<any[]>('/orders');
        const list = Array.isArray(listJson) ? listJson : (listJson as any)?.data || [];
        const found = list.find((o: any) => String(o.id) === String(orderId));
        if (!found) throw new Error('获取订单详情失败');
        d = found;
      }
      const toYMD = (x: any): string => {
        if (!x) return '';
        if (typeof x === 'string') return x.slice(0, 10);
        try { return x.toISOString().slice(0, 10); } catch (_) { return String(x).slice(0, 10); }
      };
      const order: Order = {
        id: String(d.id ?? orderId),
        contractNumber: d.contract_number ?? '',
        lessorId: d.lessor_id ? String(d.lessor_id) : '',
        lessorCompanyId: d.lessor_company_id ? String(d.lessor_company_id) : '',  // 添加对 lessor_company_id 的支持
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
      console.log('[fetchOrderById] ⚠️ API返回数据:', {
        orderId,
        raw_rentedEquipmentIds: d.rentedEquipmentIds,
        raw_rented_equipment_ids: d.rented_equipment_ids,
        normalized: order.rentedEquipmentIds,
        flatCount: (order.rentedEquipmentIds || []).flat().length
      });
      console.log('[fetchOrderById] 进场记录数据:', JSON.stringify(d.entries, null, 2));
      console.log('[fetchOrderById] 退场记录数据:', JSON.stringify(d.exits, null, 2));
      return order;
    } catch (error) {
      return rejectWithValue('获取订单详情失败');
    }
  }
);

// 初始状态
const initialState: OrdersState = {
  orders: [],
  loading: false,
  error: null,
  selectedOrder: null,
  detailsById: {},
  detailsLoadingById: {}
};

export const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    selectOrder: (state, action: PayloadAction<Order | null>) => {
      state.selectedOrder = action.payload;
    },
    clearOrderError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchOrders.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchOrders.fulfilled, (state, action) => {
      state.loading = false;
      state.orders = action.payload;
    });
    builder.addCase(fetchOrders.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    builder.addCase(addOrder.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(addOrder.fulfilled, (state, action) => {
      state.loading = false;
      state.orders.push(action.payload);
    });
    builder.addCase(addOrder.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    builder.addCase(updateOrder.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateOrder.fulfilled, (state, action) => {
      state.loading = false;
      const index = state.orders.findIndex((o) => o.id === action.payload.id);
      if (index !== -1) {
        state.orders[index] = action.payload;
      }
    });
    builder.addCase(updateOrder.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    builder.addCase(deleteOrder.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteOrder.fulfilled, (state, action) => {
      state.loading = false;
      state.orders = state.orders.filter((o) => o.id !== action.payload);
    });
    builder.addCase(deleteOrder.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    // addEntry
    builder.addCase(addEntry.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(addEntry.fulfilled, (state, action) => {
      state.loading = false;
      const { orderId, record } = action.payload;
      const order = state.orders.find(o => o.id === orderId);
      if (order) {
        if (!order.entries) order.entries = [];
        order.entries.push(record);
        // 更新进场数量
        order.status.entryCount = (order.status.entryCount || 0) + (record.equipmentCount || record.equipmentCodes?.length || 0);
      }
    });
    builder.addCase(addEntry.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    // addExit
    builder.addCase(addExit.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(addExit.fulfilled, (state, action) => {
      state.loading = false;
      const { orderId, record } = action.payload;
      const order = state.orders.find(o => o.id === orderId);
      if (order) {
        if (!order.exits) order.exits = [];
        order.exits.push(record);
        // 更新退场数量
        order.status.exitCount = (order.status.exitCount || 0) + (record.equipmentCount || record.equipmentCodes?.length || 0);
      }
    });
    builder.addCase(addExit.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    // addReceipt
    builder.addCase(addReceipt.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(addReceipt.fulfilled, (state, action) => {
      state.loading = false;
      const { orderId, record } = action.payload;
      const order = state.orders.find(o => o.id === orderId);
      if (order) {
        if (!order.receipts) order.receipts = [];
        order.receipts.push(record);
      }
    });
    builder.addCase(addReceipt.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    // addRefund
    builder.addCase(addRefund.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(addRefund.fulfilled, (state, action) => {
      state.loading = false;
      const { orderId, record } = action.payload;
      const order = state.orders.find(o => o.id === orderId);
      if (order) {
        if (!order.refunds) order.refunds = [];
        order.refunds.push(record);
      }
    });
    builder.addCase(addRefund.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    // deleteReceipt
    builder.addCase(deleteReceipt.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteReceipt.fulfilled, (state, action) => {
      state.loading = false;
      const { orderId, receiptId } = action.payload;
      const order = state.orders.find(o => o.id === orderId);
      if (order && order.receipts) {
        order.receipts = order.receipts.filter(r => r.id !== receiptId);
      }
    });
    builder.addCase(deleteReceipt.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    // deleteRefund
    builder.addCase(deleteRefund.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteRefund.fulfilled, (state, action) => {
      state.loading = false;
      const { orderId, refundId } = action.payload;
      const order = state.orders.find(o => o.id === orderId);
      if (order && order.refunds) {
        order.refunds = order.refunds.filter(r => r.id !== refundId);
      }
    });
    builder.addCase(deleteRefund.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    // addSuspension
    builder.addCase(addSuspension.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(addSuspension.fulfilled, (state, action) => {
      state.loading = false;
      const { orderId, record } = action.payload;
      const order = state.orders.find(o => o.id === orderId);
      if (order) {
        if (!order.suspensions) order.suspensions = [];
        order.suspensions.push(record);
      }
    });
    builder.addCase(addSuspension.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    // addClaim
    builder.addCase(addClaim.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(addClaim.fulfilled, (state, action) => {
      state.loading = false;
      const { orderId, record } = action.payload;
      const order = state.orders.find(o => o.id === orderId);
      if (order) {
        if (!order.claims) order.claims = [];
        order.claims.push(record);
      }
    });
    builder.addCase(addClaim.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    // addSettlement
    builder.addCase(addSettlement.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(addSettlement.fulfilled, (state, action) => {
      state.loading = false;
      const { orderId, record } = action.payload;
      const order = state.orders.find(o => o.id === orderId);
      if (order) {
        if (!order.settlements) order.settlements = [];
        order.settlements.push(record);
      }
    });
    builder.addCase(addSettlement.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    // updateSettlement
    builder.addCase(updateSettlement.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateSettlement.fulfilled, (state, action) => {
      state.loading = false;
      const { orderId, settlementId, updates } = action.payload;
      const order = state.orders.find(o => o.id === orderId);
      if (order && order.settlements) {
        const settlement = order.settlements.find((s: any) => s.id === settlementId);
        if (settlement) {
          Object.assign(settlement, updates);
        }
      }
    });
    builder.addCase(updateSettlement.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    // deleteSettlement
    builder.addCase(deleteSettlement.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteSettlement.fulfilled, (state, action) => {
      state.loading = false;
      const { orderId, settlementId } = action.payload;
      const order = state.orders.find(o => o.id === orderId);
      if (order && order.settlements) {
        order.settlements = order.settlements.filter((s: any) => s.id !== settlementId);
      }
    });
    builder.addCase(deleteSettlement.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    // addClearance
    builder.addCase(addClearance.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(addClearance.fulfilled, (state, action) => {
      state.loading = false;
      const { orderId, record } = action.payload;
      const order = state.orders.find(o => o.id === orderId);
      if (order) {
        if (!order.clearances) order.clearances = [];
        order.clearances.push(record);
      }
    });
    builder.addCase(addClearance.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    // deleteEntry
    builder.addCase(deleteEntry.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteEntry.fulfilled, (state, action) => {
      state.loading = false;
      const { orderId, entryId } = action.payload;
      const order = state.orders.find(o => o.id === orderId);
      if (order && order.entries) {
        order.entries = order.entries.filter(e => e.id !== entryId);
        // 更新进场数量
        if (order.status) {
          order.status.entryCount = order.entries.length;
        }
      }
      // 同时更新detailsById
      if (state.detailsById && state.detailsById[orderId]) {
        const detailOrder = state.detailsById[orderId];
        console.log('[deleteEntry] 删除前 equipmentItems:', detailOrder.equipmentItems?.length || 0);
        if (detailOrder.entries) {
          // ⚠️ 关键修复：确保只修改 entries，保留其他所有属性（包括 equipmentItems）
          detailOrder.entries = detailOrder.entries.filter(e => e.id !== entryId);
          if (detailOrder.status) {
            detailOrder.status.entryCount = detailOrder.entries.length;
          }
        }
        console.log('[deleteEntry] 删除后 equipmentItems:', detailOrder.equipmentItems?.length || 0);
      }
    });
    builder.addCase(deleteEntry.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    // deleteExit
    builder.addCase(deleteExit.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteExit.fulfilled, (state, action) => {
      state.loading = false;
      const { orderId, exitId } = action.payload;
      const order = state.orders.find(o => o.id === orderId);
      if (order && order.exits) {
        order.exits = order.exits.filter(e => e.id !== exitId);
        // 更新退场数量
        if (order.status) {
          order.status.exitCount = order.exits.length;
        }
      }
      // 同时更新detailsById
      if (state.detailsById && state.detailsById[orderId]) {
        const detailOrder = state.detailsById[orderId];
        console.log('[deleteExit] 删除前 equipmentItems:', detailOrder.equipmentItems?.length || 0);
        if (detailOrder.exits) {
          // ⚠️ 关键修复：确保只修改 exits，保留其他所有属性（包括 equipmentItems）
          detailOrder.exits = detailOrder.exits.filter(e => e.id !== exitId);
          if (detailOrder.status) {
            detailOrder.status.exitCount = detailOrder.exits.length;
          }
        }
        console.log('[deleteExit] 删除后 equipmentItems:', detailOrder.equipmentItems?.length || 0);
      }
    });
    builder.addCase(deleteExit.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    // fetchOrderById
    builder
      .addCase(fetchOrderById.pending, (state, action) => {
        const id = action.meta.arg as string;
        if (state.detailsLoadingById) state.detailsLoadingById[id] = true;
        state.error = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        const order = action.payload as Order;
        if (state.detailsLoadingById) state.detailsLoadingById[order.id] = false;
        if (state.detailsById) state.detailsById[order.id] = order;
        // 同时更新 orders 数组中的订单，确保 rentedEquipmentIds 在整个 store 中一致
        const index = state.orders.findIndex((o) => o.id === order.id);
        if (index !== -1) {
          state.orders[index] = order;
          console.log('[fetchOrderById.fulfilled] ✅ 已更新 orders 数组中的订单', order.id, {
            rentedCount: (order.rentedEquipmentIds || []).flat().length
          });
        }
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        const id = (action.meta as any)?.arg as string;
        if (state.detailsLoadingById) state.detailsLoadingById[id] = false;
        state.error = action.payload as string;
      });
  }
});

export const { selectOrder, clearOrderError } = ordersSlice.actions;

// 添加选择器
export const selectOrders = (state: { orders: OrdersState }) => state.orders.orders;
export const selectOrdersLoading = (state: { orders: OrdersState }) => state.orders.loading;
export const selectOrdersError = (state: { orders: OrdersState }) => state.orders.error;
export const selectOrderById = (state: { orders: OrdersState }, orderId: string) => 
  state.orders.detailsById?.[orderId];

export default ordersSlice.reducer;