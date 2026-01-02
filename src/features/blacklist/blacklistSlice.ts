/**
 * 黑名单管理 Redux Slice
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';
import type { BlacklistRecord, BlacklistState, BlacklistCheckResult, BlacklistStats } from './types';

// 黑名单列表响应类型
interface BlacklistListResponse {
  data: BlacklistRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

const initialState: BlacklistState = {
  records: [],
  stats: null,
  loading: false,
  error: null,
  page: 1,
  pageSize: 10,
  total: 0,
};

// ==================== 异步操作 ====================

/**
 * 获取黑名单列表
 */
export const fetchBlacklist = createAsyncThunk(
  'blacklist/fetchList',
  async (params: { 
    page?: number; 
    pageSize?: number; 
    search?: string;
    status?: string;
    severity?: string;
  } = {}) => {
    const { page = 1, pageSize = 10, search = '', status = '', severity = '' } = params;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    
    if (search) queryParams.append('search', search);
    if (status) queryParams.append('status', status);
    if (severity) queryParams.append('severity', severity);
    
    const response = await apiGet<BlacklistListResponse>(`/blacklist?${queryParams.toString()}`);
    // 后端返回 { data, pagination: { page, pageSize, total } }
    return {
      data: response.data,
      page: response.pagination.page,
      pageSize: response.pagination.pageSize,
      total: response.pagination.total,
    };
  }
);

/**
 * 检查客户是否在黑名单中
 */
export const checkBlacklist = createAsyncThunk(
  'blacklist/check',
  async (params: {
    customerName?: string;
    customerPhone?: string;
    customerIdCard?: string;
    context?: string;
  }) => {
    const response = await apiPost('/blacklist/check', params);
    return response as BlacklistCheckResult;
  }
);

/**
 * 获取黑名单统计信息
 */
export const fetchBlacklistStats = createAsyncThunk(
  'blacklist/fetchStats',
  async () => {
    const response = await apiGet('/blacklist/stats/summary');
    return response as BlacklistStats;
  }
);

/**
 * 添加黑名单记录
 */
export const addBlacklistRecord = createAsyncThunk(
  'blacklist/add',
  async (record: {
    customerName: string;
    customerPhone?: string;
    customerIdCard?: string;
    reason: string;
    evidenceFiles?: string[];
    severity?: string;
  }) => {
    const response = await apiPost('/blacklist', record);
    return response as BlacklistRecord;
  }
);

/**
 * 更新黑名单记录（仅超管）
 */
export const updateBlacklistRecord = createAsyncThunk(
  'blacklist/update',
  async ({ id, data }: { 
    id: number; 
    data: Partial<BlacklistRecord>;
  }) => {
    const response = await apiPut(`/blacklist/${id}`, data);
    return response as BlacklistRecord;
  }
);

/**
 * 审核黑名单记录（仅超管）
 */
export const verifyBlacklistRecord = createAsyncThunk(
  'blacklist/verify',
  async ({ id, verifyNote }: { id: number; verifyNote?: string }) => {
    const response = await apiPost(`/blacklist/${id}/verify`, { verifyNote });
    return response as BlacklistRecord;
  }
);

/**
 * 移除黑名单记录（仅超管）
 */
export const removeBlacklistRecord = createAsyncThunk(
  'blacklist/remove',
  async ({ id, removeReason }: { id: number; removeReason: string }) => {
    const response = await apiPost(`/blacklist/${id}/remove`, { removeReason });
    return response as BlacklistRecord;
  }
);

/**
 * 删除黑名单记录（仅超管）
 */
export const deleteBlacklistRecord = createAsyncThunk(
  'blacklist/delete',
  async (id: number) => {
    await apiDelete(`/blacklist/${id}`);
    return id;
  }
);

// ==================== Slice ====================

const blacklistSlice = createSlice({
  name: 'blacklist',
  initialState,
  reducers: {
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    setPageSize(state, action: PayloadAction<number>) {
      state.pageSize = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // 获取黑名单列表
    builder
      .addCase(fetchBlacklist.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBlacklist.fulfilled, (state, action) => {
        state.loading = false;
        state.records = action.payload.data;
        state.page = action.payload.page;
        state.pageSize = action.payload.pageSize;
        state.total = action.payload.total;
      })
      .addCase(fetchBlacklist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取黑名单列表失败';
      });

    // 获取统计信息
    builder
      .addCase(fetchBlacklistStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });

    // 添加黑名单记录
    builder
      .addCase(addBlacklistRecord.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addBlacklistRecord.fulfilled, (state, action) => {
        state.loading = false;
        state.records.unshift(action.payload);
        state.total += 1;
      })
      .addCase(addBlacklistRecord.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '添加黑名单记录失败';
      });

    // 更新黑名单记录
    builder
      .addCase(updateBlacklistRecord.fulfilled, (state, action) => {
        const index = state.records.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.records[index] = action.payload;
        }
      });

    // 审核黑名单记录
    builder
      .addCase(verifyBlacklistRecord.fulfilled, (state, action) => {
        const index = state.records.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.records[index] = action.payload;
        }
      });

    // 移除黑名单记录
    builder
      .addCase(removeBlacklistRecord.fulfilled, (state, action) => {
        const index = state.records.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.records[index] = action.payload;
        }
      });

    // 删除黑名单记录
    builder
      .addCase(deleteBlacklistRecord.fulfilled, (state, action) => {
        state.records = state.records.filter(r => r.id !== action.payload);
        state.total -= 1;
      });
  },
});

export const { setPage, setPageSize, clearError } = blacklistSlice.actions;

export default blacklistSlice.reducer;

