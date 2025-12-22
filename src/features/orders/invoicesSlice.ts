import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';

/**
 * 订单发票类型定义
 */
export interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  invoiceType: 'vat_normal' | 'vat_special' | 'electronic';
  invoiceDate: string;
  invoiceTitle: string;
  taxNumber: string;
  invoiceContent?: string;
  amount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  invoiceStatus: 'issued' | 'sent' | 'received' | 'cancelled' | 'red_flushed';
  sentDate?: string;
  receivedDate?: string;
  cancelledDate?: string;
  cancelledReason?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  expressCompany?: string;
  expressNumber?: string;
  issuerCompany?: string;
  receiverCompany?: string;
  attachments?: any[];
  notes?: string;
  createdBy?: string;
  sentBy?: string;
  cancelledBy?: string;
  createdAt?: string;
  updatedAt?: string;
  // 关联信息
  orderContractNumber?: string;
  customerName?: string;
}

export interface InvoiceFormData {
  orderId: string;
  invoiceNumber: string;
  invoiceType?: string;
  invoiceDate: string;
  invoiceTitle: string;
  taxNumber: string;
  invoiceContent?: string;
  amount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  notes?: string;
}

interface InvoicesState {
  list: Invoice[];
  currentInvoice: Invoice | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
}

const initialState: InvoicesState = {
  list: [],
  currentInvoice: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pageSize: 20,
};

/**
 * 获取指定订单的发票列表
 */
export const fetchInvoicesByOrder = createAsyncThunk(
  'invoices/fetchByOrder',
  async (orderId: string, { rejectWithValue }) => {
    try {
      const response = await apiGet<Invoice[]>(`/invoices/order/${orderId}`);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取发票列表失败');
    }
  }
);

/**
 * 获取所有发票列表（带分页）
 */
export const fetchInvoices = createAsyncThunk(
  'invoices/fetchAll',
  async (
    params: { page?: number; pageSize?: number; status?: string; type?: string; orderId?: string },
    { rejectWithValue }
  ) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.set('page', params.page.toString());
      if (params.pageSize) queryParams.set('pageSize', params.pageSize.toString());
      if (params.status) queryParams.set('status', params.status);
      if (params.type) queryParams.set('type', params.type);
      if (params.orderId) queryParams.set('orderId', params.orderId);

      const response = await apiGet<{
        data: Invoice[];
        page: number;
        pageSize: number;
        total: number;
      }>(`/invoices?${queryParams.toString()}`);

      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取发票列表失败');
    }
  }
);

/**
 * 获取单个发票详情
 */
export const fetchInvoiceById = createAsyncThunk(
  'invoices/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiGet<Invoice>(`/invoices/${id}`);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取发票详情失败');
    }
  }
);

/**
 * 创建发票
 */
export const createInvoice = createAsyncThunk(
  'invoices/create',
  async (data: InvoiceFormData, { rejectWithValue }) => {
    try {
      const response = await apiPost<{ id: string }>('/invoices', data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || '创建发票失败');
    }
  }
);

/**
 * 更新发票
 */
export const updateInvoice = createAsyncThunk(
  'invoices/update',
  async ({ id, data }: { id: string; data: Partial<Invoice> }, { rejectWithValue }) => {
    try {
      await apiPut(`/invoices/${id}`, data);
      return { id, data };
    } catch (error: any) {
      return rejectWithValue(error.message || '更新发票失败');
    }
  }
);

/**
 * 作废发票
 */
export const cancelInvoice = createAsyncThunk(
  'invoices/cancel',
  async ({ id, reason }: { id: string; reason?: string }, { rejectWithValue }) => {
    try {
      await apiPost(`/invoices/${id}/cancel`, { reason });
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || '作废发票失败');
    }
  }
);

/**
 * 删除发票
 */
export const deleteInvoice = createAsyncThunk(
  'invoices/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiDelete(`/invoices/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || '删除发票失败');
    }
  }
);

/**
 * 上传发票附件
 */
export const uploadInvoiceAttachments = createAsyncThunk(
  'invoices/uploadAttachments',
  async ({ id, attachments }: { id: string; attachments: any[] }, { rejectWithValue }) => {
    try {
      const response = await apiPost<{ attachments: any[] }>(`/invoices/${id}/attachments`, {
        attachments,
      });
      return { id, attachments: response.attachments };
    } catch (error: any) {
      return rejectWithValue(error.message || '上传附件失败');
    }
  }
);

const invoicesSlice = createSlice({
  name: 'invoices',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentInvoice: (state) => {
      state.currentInvoice = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 获取订单发票列表
      .addCase(fetchInvoicesByOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoicesByOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchInvoicesByOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // 获取所有发票列表
      .addCase(fetchInvoices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoices.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.list = action.payload.data;
        state.page = action.payload.page;
        state.pageSize = action.payload.pageSize;
        state.total = action.payload.total;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // 获取发票详情
      .addCase(fetchInvoiceById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoiceById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentInvoice = action.payload;
      })
      .addCase(fetchInvoiceById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // 创建发票
      .addCase(createInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createInvoice.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // 更新发票
      .addCase(updateInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateInvoice.fulfilled, (state, action) => {
        state.loading = false;
        const { id, data } = action.payload;
        const index = state.list.findIndex((inv) => inv.id === id);
        if (index !== -1) {
          state.list[index] = { ...state.list[index], ...data };
        }
        if (state.currentInvoice?.id === id) {
          state.currentInvoice = { ...state.currentInvoice, ...data };
        }
      })
      .addCase(updateInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // 作废发票
      .addCase(cancelInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelInvoice.fulfilled, (state, action) => {
        state.loading = false;
        const id = action.payload;
        const index = state.list.findIndex((inv) => inv.id === id);
        if (index !== -1) {
          state.list[index].invoiceStatus = 'cancelled';
        }
      })
      .addCase(cancelInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // 删除发票
      .addCase(deleteInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteInvoice.fulfilled, (state, action) => {
        state.loading = false;
        const id = action.payload;
        state.list = state.list.filter((inv) => inv.id !== id);
      })
      .addCase(deleteInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // 上传附件
      .addCase(uploadInvoiceAttachments.fulfilled, (state, action) => {
        const { id, attachments } = action.payload;
        const index = state.list.findIndex((inv) => inv.id === id);
        if (index !== -1) {
          state.list[index].attachments = attachments;
        }
        if (state.currentInvoice?.id === id) {
          state.currentInvoice.attachments = attachments;
        }
      });
  },
});

export const { clearError, clearCurrentInvoice } = invoicesSlice.actions;
export default invoicesSlice.reducer;

