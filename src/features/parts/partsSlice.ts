import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiGet, apiPost, apiDelete } from '../../api/client';
import type { Part, AddPartFormData, StockInFormData, PartOperationData, PartTransaction, WriteOffFormData, ReturnPendingFormData } from './types';

interface PartsState {
  parts: Part[];
  transactions: PartTransaction[];
  pendingWriteoffs: PartTransaction[]; // 待核销配件列表
  loading: boolean;
  transactionsLoading: boolean;
  pendingLoading: boolean;
  error: string | null;
}

const initialState: PartsState = {
  parts: [],
  transactions: [],
  pendingWriteoffs: [],
  loading: false,
  transactionsLoading: false,
  pendingLoading: false,
  error: null,
};

// 获取配件列表
export const fetchParts = createAsyncThunk('parts/fetchParts', async () => {
  const data = await apiGet<Part[]>('/parts');
  return data;
});

// 获取下一个配件编号
export const fetchNextPartCode = createAsyncThunk('parts/fetchNextPartCode', async () => {
  const data = await apiGet<{ nextCode: string }>('/parts/next-code');
  return data.nextCode;
});

// 新增配件
export const addPart = createAsyncThunk('parts/addPart', async (formData: AddPartFormData) => {
  const data = await apiPost<Part>('/parts', formData);
  return data;
});

// 配件入库
export const stockInParts = createAsyncThunk('parts/stockIn', async (formData: StockInFormData) => {
  await apiPost('/parts/stock-in', formData);
});

// 配件领用
export const usePart = createAsyncThunk('parts/use', async (formData: PartOperationData) => {
  await apiPost('/parts/use', formData);
});

// 配件退回
export const returnPart = createAsyncThunk('parts/return', async (formData: PartOperationData) => {
  await apiPost('/parts/return', formData);
});

// 配件报废
export const scrapPart = createAsyncThunk('parts/scrap', async (formData: PartOperationData) => {
  await apiPost('/parts/scrap', formData);
});

// 删除配件
export const deletePart = createAsyncThunk('parts/delete', async (id: number) => {
  await apiDelete(`/parts/${id}`);
  return id;
});

// 获取所有配件的出入库记录
export const fetchTransactions = createAsyncThunk('parts/fetchTransactions', async () => {
  const data = await apiGet<PartTransaction[]>('/parts/transactions/all');
  return data;
});

// 获取待核销配件列表
export const fetchPendingWriteoffs = createAsyncThunk('parts/fetchPendingWriteoffs', async () => {
  const data = await apiGet<PartTransaction[]>('/parts/pending-writeoffs/list');
  return data;
});

// 配件核销
export const writeOffPart = createAsyncThunk('parts/writeOff', async (formData: WriteOffFormData) => {
  await apiPost('/parts/write-off', formData);
});

// 退回待核销配件
export const returnPendingPart = createAsyncThunk('parts/returnPending', async (formData: ReturnPendingFormData) => {
  await apiPost('/parts/return-pending', formData);
});

const partsSlice = createSlice({
  name: 'parts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 获取配件列表
      .addCase(fetchParts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchParts.fulfilled, (state, action: PayloadAction<Part[]>) => {
        state.loading = false;
        state.parts = action.payload;
      })
      .addCase(fetchParts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取配件列表失败';
      })
      // 新增配件
      .addCase(addPart.fulfilled, (state, action: PayloadAction<Part>) => {
        state.parts.unshift(action.payload);
      })
      // 删除配件
      .addCase(deletePart.fulfilled, (state, action: PayloadAction<number>) => {
        state.parts = state.parts.filter(p => p.id !== action.payload);
      })
      // 获取交易记录
      .addCase(fetchTransactions.pending, (state) => {
        state.transactionsLoading = true;
      })
      .addCase(fetchTransactions.fulfilled, (state, action: PayloadAction<PartTransaction[]>) => {
        state.transactionsLoading = false;
        state.transactions = action.payload;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.transactionsLoading = false;
        state.error = action.error.message || '获取交易记录失败';
      })
      // 获取待核销配件
      .addCase(fetchPendingWriteoffs.pending, (state) => {
        state.pendingLoading = true;
      })
      .addCase(fetchPendingWriteoffs.fulfilled, (state, action: PayloadAction<PartTransaction[]>) => {
        state.pendingLoading = false;
        state.pendingWriteoffs = action.payload;
      })
      .addCase(fetchPendingWriteoffs.rejected, (state, action) => {
        state.pendingLoading = false;
        state.error = action.error.message || '获取待核销配件失败';
      });
  },
});

export const { clearError } = partsSlice.actions;
export default partsSlice.reducer;
