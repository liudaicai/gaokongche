import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// 定义用户类型
interface User {
  id: string;
  username: string;
  role: string;
  // 权限列表（可选），用于权限判断
  permissions?: string[];
}

// 定义认证状态类型
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

// 初始状态
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
};

// 模拟登录API调用
// 这里使用硬编码的管理员账号和密码：admin / admin123
export const login = createAsyncThunk(
  'auth/login',
  async ({ username, password }: { username: string; password: string }) => {
    // 优化：减少模拟API请求延迟以提升用户体验
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 验证用户名和密码
    if (username === 'admin' && password === 'admin123') {
      // 登录成功，返回用户信息
      return {
        id: '1',
        username: 'admin',
        role: 'superadmin',
        // 为超级管理员赋予所有关键权限
        permissions: [
          '合同管理-删除',
          '合同管理-编辑',
          '合同管理-结算',
          '设备管理-编辑',
          '设备管理-删除'
        ]
      };
    } else {
      // 登录失败，抛出错误
      throw new Error('用户名或密码错误');
    }
  }
);

// 退出登录
export const logout = createAsyncThunk('auth/logout', async () => {
  // 模拟退出登录的API调用
  await new Promise(resolve => setTimeout(resolve, 300));
  return true;
});

// 创建auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // 清除错误信息
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // 处理登录请求开始
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      // 处理登录成功
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
        // 保存用户信息到localStorage，确保JSON序列化正确
        try {
          localStorage.setItem('user', JSON.stringify(action.payload));
          // 可选：设置认证标志，便于快速检查
          localStorage.setItem('isAuthenticated', 'true');
        } catch (error) {
          console.error('保存用户信息到localStorage失败:', error);
        }
      })
      // 处理登录失败
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.error.message || '登录失败';
      })
      // 处理退出登录成功
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        // 从localStorage中移除用户信息和认证标志
        localStorage.removeItem('user');
        localStorage.removeItem('isAuthenticated');
      });
  },
});

// 导出actions
export const { clearError } = authSlice.actions;

// 导出reducer
export default authSlice.reducer;