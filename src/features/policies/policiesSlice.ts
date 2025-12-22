/**
 * 保单管理 Redux Slice
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';
import type { RootState } from '../../app/store';
import type { Policy, PolicyFormData, PolicyQueryParams } from './types';

interface PoliciesState {
  list: Policy[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

const initialState: PoliciesState = {
  list: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0
  }
};

// ==================== 异步Thunks ====================

// 获取保单列表
export const fetchPolicies = createAsyncThunk(
  'policies/fetchList',
  async (params: PolicyQueryParams = {}) => {
    const queryString = new URLSearchParams(params as any).toString();
    return await apiGet<{ data: Policy[]; total: number }>(`/policies?${queryString}`);
  }
);

// 获取保单详情
export const fetchPolicyDetail = createAsyncThunk(
  'policies/fetchDetail',
  async (id: string | number) => {
    return await apiGet<Policy>(`/policies/${id}`);
  }
);

// 创建保单
export const createPolicy = createAsyncThunk(
  'policies/create',
  async (data: PolicyFormData) => {
    return await apiPost<Policy>('/policies', data);
  }
);

// 更新保单
export const updatePolicy = createAsyncThunk(
  'policies/update',
  async ({ id, data }: { id: string | number; data: Partial<PolicyFormData> }) => {
    return await apiPut<Policy>(`/policies/${id}`, data);
  }
);

// 删除保单
export const deletePolicy = createAsyncThunk(
  'policies/delete',
  async (id: string | number) => {
    await apiDelete(`/policies/${id}`);
    return id;
  }
);

// 下载保单附件
export const downloadPolicyAttachment = createAsyncThunk(
  'policies/downloadAttachment',
  async ({ policyId, attachmentId }: { policyId: string | number; attachmentId: string | number }) => {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/policies/${policyId}/attachments/${attachmentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('下载失败');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `保单附件_${attachmentId}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return null;
  }
);

// ==================== Slice ====================

const policiesSlice = createSlice({
  name: 'policies',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setPagination: (state, action: PayloadAction<{ page: number; pageSize: number }>) => {
      state.pagination.page = action.payload.page;
      state.pagination.pageSize = action.payload.pageSize;
    }
  },
  extraReducers: (builder) => {
    // 获取保单列表
    builder
      .addCase(fetchPolicies.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPolicies.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data || action.payload as any || [];
        state.pagination.total = action.payload.total || 0;
      })
      .addCase(fetchPolicies.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取保单列表失败';
      });

    // 创建保单
    builder
      .addCase(createPolicy.pending, (state) => {
        state.loading = true;
      })
      .addCase(createPolicy.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createPolicy.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '创建保单失败';
      });

    // 更新保单
    builder
      .addCase(updatePolicy.pending, (state) => {
        state.loading = true;
      })
      .addCase(updatePolicy.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updatePolicy.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '更新保单失败';
      });

    // 删除保单
    builder
      .addCase(deletePolicy.pending, (state) => {
        state.loading = true;
      })
      .addCase(deletePolicy.fulfilled, (state, action) => {
        state.loading = false;
        state.list = state.list.filter(p => p.id !== action.payload);
      })
      .addCase(deletePolicy.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '删除保单失败';
      });
  }
});

export const { clearError, setPagination } = policiesSlice.actions;

// Selectors
export const selectPolicies = (state: RootState) => state.policies.list;
export const selectPoliciesLoading = (state: RootState) => state.policies.loading;
export const selectPoliciesError = (state: RootState) => state.policies.error;
export const selectPoliciesPagination = (state: RootState) => state.policies.pagination;

export default policiesSlice.reducer;

