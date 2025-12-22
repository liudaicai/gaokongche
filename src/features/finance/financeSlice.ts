/**
 * 财务管理 Redux Slice - 重构版
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';
import type {
  FinanceRecord,
  FinanceFormData,
  FinanceQueryParams,
  Pagination
} from './types';

interface FinanceState {
  receipts: FinanceRecord[];      // 收款记录
  payments: FinanceRecord[];      // 付款记录
  loading: boolean;
  error: string | null;
  pagination: Pagination;
}

const initialState: FinanceState = {
  receipts: [],
  payments: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    pageSize: 50,
    total: 0
  }
};

// ==================== 异步Thunks ====================

// 获取收款记录列表
export const fetchReceipts = createAsyncThunk(
  'finance/fetchReceipts',
  async (params: FinanceQueryParams) => {
    const queryString = new URLSearchParams(params as any).toString();
    return await apiGet<{ data: FinanceRecord[]; pagination: Pagination }>(
      `/finance/receipts?${queryString}`
    );
  }
);

// 获取付款记录列表
export const fetchPayments = createAsyncThunk(
  'finance/fetchPayments',
  async (params: FinanceQueryParams) => {
    const queryString = new URLSearchParams(params as any).toString();
    return await apiGet<{ data: FinanceRecord[]; pagination: Pagination }>(
      `/finance/payments?${queryString}`
    );
  }
);

// 创建财务记录（支持文件上传）
export const createFinanceRecord = createAsyncThunk(
  'finance/createRecord',
  async (formData: FormData) => {
    // 使用FormData支持文件上传
    const token = localStorage.getItem('auth_token');
    const response = await fetch('/api/finance', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '创建失败');
    }
    
    return await response.json();
  }
);

// 更新财务记录
export const updateFinanceRecord = createAsyncThunk(
  'finance/updateRecord',
  async ({ id, formData }: { id: number; formData: FormData }) => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/finance/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '更新失败');
    }
    
    return await response.json();
  }
);

// 删除财务记录
export const deleteFinanceRecord = createAsyncThunk(
  'finance/deleteRecord',
  async (id: number) => {
    return await apiDelete(`/finance/${id}`);
  }
);

// 导出收款记录
export const exportReceipts = createAsyncThunk(
  'finance/exportReceipts',
  async (params: FinanceQueryParams) => {
    const queryString = new URLSearchParams(params as any).toString();
    const url = `/finance/export/receipts?${queryString}`;
    
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api${url}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('导出失败');
    }
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `收款记录_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    return null;
  }
);

// 导出付款记录
export const exportPayments = createAsyncThunk(
  'finance/exportPayments',
  async (params: FinanceQueryParams) => {
    const queryString = new URLSearchParams(params as any).toString();
    const url = `/finance/export/payments?${queryString}`;
    
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api${url}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('导出失败');
    }
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `付款记录_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    return null;
  }
);

// ==================== Slice ====================

const financeSlice = createSlice({
  name: 'finance',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // 收款记录
    builder
      .addCase(fetchReceipts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchReceipts.fulfilled, (state, action) => {
        state.loading = false;
        state.receipts = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchReceipts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取收款记录失败';
      });

    // 付款记录
    builder
      .addCase(fetchPayments.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPayments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取付款记录失败';
      });

    // 创建记录
    builder
      .addCase(createFinanceRecord.pending, (state) => {
        state.loading = true;
      })
      .addCase(createFinanceRecord.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createFinanceRecord.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '创建失败';
      });

    // 更新记录
    builder
      .addCase(updateFinanceRecord.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateFinanceRecord.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateFinanceRecord.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '更新失败';
      });

    // 删除记录
    builder
      .addCase(deleteFinanceRecord.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteFinanceRecord.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(deleteFinanceRecord.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '删除失败';
      });
  }
});

export const { clearError } = financeSlice.actions;
export default financeSlice.reducer;

// 兼容性导出（标记为废弃）
/** @deprecated 使用 fetchPayments 替代 */
export const fetchRefunds = fetchPayments;

/** @deprecated 使用 createFinanceRecord 替代 */
export const createReceipt = createFinanceRecord;

/** @deprecated 使用 updateFinanceRecord 替代 */
export const updateReceipt = updateFinanceRecord;

/** @deprecated 使用 deleteFinanceRecord 替代 */
export const deleteReceipt = deleteFinanceRecord;

/** @deprecated 使用 exportPayments 替代 */
export const exportRefunds = exportPayments;
