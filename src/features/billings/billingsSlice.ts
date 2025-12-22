import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';

export interface Billing {
  id: string;
  billingNumber: string;
  orderId: string;
  customerId: string;
  customerName?: string;
  contractNumber?: string;
  projectName?: string;
  billingType: string;
  periodStart: string;
  periodEnd: string;
  rentalFee: number;
  deposit: number;
  shippingFee: number;
  modificationFee: number;
  lateFee: number;
  adjustment: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  dueDate: string;
  paidDate?: string;
  overdueDays: number;
  remark?: string;
  attachments?: any[];
  createdAt: string;
  updatedAt: string;
}

interface BillingsState {
  billings: Billing[];
  currentBilling: Billing | null;
  stats: {
    totalCount: number;
    unpaidCount: number;
    paidCount: number;
    overdueCount: number;
    totalAmount: number;
    paidAmount: number;
    unpaidAmount: number;
  } | null;
  loading: boolean;
  error: string | null;
}

const initialState: BillingsState = {
  billings: [],
  currentBilling: null,
  stats: null,
  loading: false,
  error: null,
};

export const fetchBillings = createAsyncThunk(
  'billings/fetchBillings',
  async (params: { status?: string; customerId?: string; orderId?: string; page?: number; size?: number } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.append('status', params.status);
      if (params.customerId) queryParams.append('customerId', params.customerId);
      if (params.orderId) queryParams.append('orderId', params.orderId);
      if (params.page) queryParams.append('page', String(params.page));
      if (params.size) queryParams.append('size', String(params.size));

      const response: any = await apiGet(`/billings?${queryParams.toString()}`);
      return response.data || response;
    } catch (error: any) {
      return rejectWithValue(error?.message || '获取账单列表失败');
    }
  }
);

export const fetchBillingById = createAsyncThunk(
  'billings/fetchBillingById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response: any = await apiGet(`/billings/${id}`);
      return response.data || response;
    } catch (error: any) {
      return rejectWithValue(error?.message || '获取账单详情失败');
    }
  }
);

export const createBilling = createAsyncThunk(
  'billings/create',
  async (data: Partial<Billing>, { rejectWithValue }) => {
    try {
      const response: any = await apiPost('/billings', data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.message || '创建账单失败');
    }
  }
);

export const updateBilling = createAsyncThunk(
  'billings/update',
  async ({ id, data }: { id: string; data: Partial<Billing> }, { rejectWithValue }) => {
    try {
      await apiPut(`/billings/${id}`, data);
      return { id, data };
    } catch (error: any) {
      return rejectWithValue(error?.message || '更新账单失败');
    }
  }
);

export const recordPayment = createAsyncThunk(
  'billings/recordPayment',
  async ({ id, amount, paymentDate }: { id: string; amount: number; paymentDate?: string }, { rejectWithValue }) => {
    try {
      const response: any = await apiPost(`/billings/${id}/payment`, { amount, paymentDate });
      return { id, ...response };
    } catch (error: any) {
      return rejectWithValue(error?.message || '记录付款失败');
    }
  }
);

export const cancelBilling = createAsyncThunk(
  'billings/cancel',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiDelete(`/billings/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error?.message || '取消账单失败');
    }
  }
);

export const fetchBillingStats = createAsyncThunk(
  'billings/fetchStats',
  async (params: { startDate?: string; endDate?: string } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);

      const response: any = await apiGet(`/billings/stats/summary?${queryParams.toString()}`);
      return response.data || response;
    } catch (error: any) {
      return rejectWithValue(error?.message || '获取统计数据失败');
    }
  }
);

const billingsSlice = createSlice({
  name: 'billings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentBilling: (state) => {
      state.currentBilling = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchBillings
      .addCase(fetchBillings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBillings.fulfilled, (state, action) => {
        state.loading = false;
        state.billings = action.payload;
      })
      .addCase(fetchBillings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchBillingById
      .addCase(fetchBillingById.fulfilled, (state, action) => {
        state.currentBilling = action.payload;
      })
      // createBilling
      .addCase(createBilling.fulfilled, () => {
        // 需要重新获取列表
      })
      // recordPayment
      .addCase(recordPayment.fulfilled, (state, action) => {
        const billing = state.billings.find(b => b.id === action.payload.id);
        if (billing) {
          billing.paidAmount = action.payload.paidAmount;
          billing.status = action.payload.status;
        }
      })
      // cancelBilling
      .addCase(cancelBilling.fulfilled, (state, action) => {
        const index = state.billings.findIndex(b => b.id === action.payload);
        if (index !== -1) {
          state.billings.splice(index, 1);
        }
      })
      // fetchBillingStats
      .addCase(fetchBillingStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  },
});

export const { clearError, clearCurrentBilling } = billingsSlice.actions;
export default billingsSlice.reducer;

// Selectors
export const selectBillings = (state: { billings: BillingsState }) => state.billings.billings;
export const selectCurrentBilling = (state: { billings: BillingsState }) => state.billings.currentBilling;
export const selectBillingStats = (state: { billings: BillingsState }) => state.billings.stats;
export const selectBillingsLoading = (state: { billings: BillingsState }) => state.billings.loading;

