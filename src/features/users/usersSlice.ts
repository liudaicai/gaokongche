import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';
import type { UserDetail, UserFormData } from './types';

interface UsersState {
  users: UserDetail[];
  currentUser: UserDetail | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
}

const initialState: UsersState = {
  users: [],
  currentUser: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pageSize: 10,
};

// 获取用户列表
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (params: { page?: number; pageSize?: number; search?: string; companyId?: number } = {}) => {
    const { page = 1, pageSize = 10, search = '', companyId } = params;
    const queryParams = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      ...(search && { search }),
      ...(companyId && { companyId: String(companyId) }),
    });
    
    const response = await apiGet<{
      data: UserDetail[];
      pagination: { page: number; pageSize: number; total: number };
    }>(`/users?${queryParams}`);
    
    return response;
  }
);

// 获取单个用户详情
export const fetchUserById = createAsyncThunk(
  'users/fetchUserById',
  async (id: string) => {
    const response = await apiGet<UserDetail>(`/users/${id}`);
    return response;
  }
);

// 创建用户
export const createUser = createAsyncThunk(
  'users/createUser',
  async (data: UserFormData) => {
    const response = await apiPost<{ id: string }>('/users', data);
    return response;
  }
);

// 更新用户
export const updateUser = createAsyncThunk(
  'users/updateUser',
  async ({ id, data }: { id: string; data: Partial<UserFormData> }) => {
    await apiPut(`/users/${id}`, data);
    return { id, data };
  }
);

// 删除用户
export const deleteUser = createAsyncThunk(
  'users/deleteUser',
  async (id: string) => {
    await apiDelete(`/users/${id}`);
    return id;
  }
);

// 解锁用户
export const unlockUser = createAsyncThunk(
  'users/unlockUser',
  async (id: string) => {
    await apiPost(`/users/${id}/unlock`, {});
    return id;
  }
);

// 批量删除用户
export const batchDeleteUsers = createAsyncThunk(
  'users/batchDeleteUsers',
  async (ids: string[]) => {
    await Promise.all(ids.map(id => apiDelete(`/users/${id}`)));
    return ids;
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentUser: (state) => {
      state.currentUser = null;
    },
  },
  extraReducers: (builder) => {
    // 获取用户列表
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.data;
        state.total = action.payload.pagination.total;
        state.page = action.payload.pagination.page;
        state.pageSize = action.payload.pagination.pageSize;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取用户列表失败';
      });

    // 获取用户详情
    builder
      .addCase(fetchUserById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取用户详情失败';
      });

    // 创建用户
    builder
      .addCase(createUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '创建用户失败';
      });

    // 更新用户
    builder
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.users.findIndex(u => u.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = { ...state.users[index], ...action.payload.data };
        }
        if (state.currentUser && state.currentUser.id === action.payload.id) {
          state.currentUser = { ...state.currentUser, ...action.payload.data };
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '更新用户失败';
      });

    // 删除用户
    builder
      .addCase(deleteUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.loading = false;
        state.users = state.users.filter(u => u.id !== action.payload);
        if (state.currentUser && state.currentUser.id === action.payload) {
          state.currentUser = null;
        }
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '删除用户失败';
      });

    // 解锁用户
    builder
      .addCase(unlockUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(unlockUser.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.users.findIndex(u => u.id === action.payload);
        if (index !== -1) {
          state.users[index] = { ...state.users[index], is_locked: false };
        }
      })
      .addCase(unlockUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '解锁用户失败';
      });

    // 批量删除用户
    builder
      .addCase(batchDeleteUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(batchDeleteUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = state.users.filter(u => !action.payload.includes(u.id));
      })
      .addCase(batchDeleteUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '批量删除失败';
      });
  },
});

export const { clearError, clearCurrentUser } = usersSlice.actions;
export default usersSlice.reducer;
