import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiPost } from '../../api/client';
import type { User, LoginCredentials } from './types';
import * as sessionManager from '../../utils/sessionManager';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// 从 sessionStorage 恢复状态（关闭页面后会清除）
function loadAuthState(): Pick<AuthState, 'user' | 'token' | 'isAuthenticated'> {
  try {
    const token = sessionManager.getAuthToken();
    const user = sessionManager.getUserInfo();

    if (token && user && sessionManager.isSessionValid()) {
      return {
        token,
        user,
        isAuthenticated: true,
      };
    }
  } catch (error) {
    console.error('[Auth] 加载会话状态失败:', error);
  }

  return {
    token: null,
    user: null,
    isAuthenticated: false,
  };
}

const initialState: AuthState = {
  ...loadAuthState(),
  loading: false,
  error: null,
};

/**
 * 登录异步操作
 */
export const login = createAsyncThunk<
  { user: User; token: string },
  LoginCredentials,
  { rejectValue: string }
>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await apiPost<{ user: User; token: string }>(
        '/auth/login',
        credentials
      );

      // 调试：查看登录响应
      console.log('[Auth] 登录响应:', response);
      console.log('[Auth] 用户信息:', response.user);
      console.log('[Auth] 公司名称:', response.user?.companyName);

      // 保存 token 和用户信息到 sessionStorage（关闭页面后会清除）
      sessionManager.setAuthToken(response.token);
      sessionManager.setUserInfo(response.user);

      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

/**
 * 登出操作
 */
export const logout = createAsyncThunk<void, void, { rejectValue: string }>(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // 调用后端登出接口（可选）
      try {
        await apiPost('/auth/logout', {});
      } catch (e) {
        // 即使后端登出失败也继续清除本地状态
        console.warn('Backend logout failed:', e);
      }

      // 清除会话认证信息
      sessionManager.clearAuth();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Logout failed');
    }
  }
);

/**
 * 刷新用户信息
 */
export const refreshUser = createAsyncThunk<User, void, { rejectValue: string }>(
  'auth/refreshUser',
  async (_, { rejectWithValue }) => {
    try {
      const user = await apiPost<User>('/auth/me', {});
      sessionManager.setUserInfo(user);
      return user;
    } catch (error: any) {
      // Token 可能已过期
      sessionManager.clearAuth();
      return rejectWithValue(error.message || 'Failed to refresh user info');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // 清除错误
    clearError: (state) => {
      state.error = null;
    },
    // 手动设置用户（用于注册后自动登录等场景）
    setUser: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;

      sessionManager.setAuthToken(action.payload.token);
      sessionManager.setUserInfo(action.payload.user);
    },
    // 更新用户信息（不改变token）
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        sessionManager.setUserInfo(state.user);
      }
    },
  },
  extraReducers: (builder) => {
    // 登录
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = action.payload || 'Login failed';
      });

    // 登出
    builder
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        // 即使登出失败也清除状态
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = action.payload || 'Logout failed';
      });

    // 刷新用户信息
    builder
      .addCase(refreshUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(refreshUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(refreshUser.rejected, (state, action) => {
        state.loading = false;
        // Token 过期或无效，清除认证状态
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = action.payload || 'Failed to refresh user info';
      });
  },
});

export const { clearError, setUser, updateUser } = authSlice.actions;
export default authSlice.reducer;

