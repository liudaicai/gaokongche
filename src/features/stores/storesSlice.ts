import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Store, CompanyVerification, TenantCompany, StoresState } from './types';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';

// 初始状态
const initialState: StoresState = {
  stores: [],
  companyVerifications: [],
  tenantCompanies: [],
  loading: false,
  error: null
};

// 模拟API调用：获取门店列表
export const fetchStores = createAsyncThunk(
  'stores/fetchStores',
  async () => {
    const response = await apiGet<{ data: Store[]; pagination?: any }>('/stores');
    // 后端返回的是 { ok: true, data: [...], pagination: {...} } 格式
    // 如果返回的是数组，直接使用；如果是对象，提取 data 字段
    return Array.isArray(response) ? response : (response.data || []);
  }
);

// 模拟API调用：获取公司认证列表（仅超级管理员）
export const fetchCompanyVerifications = createAsyncThunk(
  'stores/fetchCompanyVerifications',
  async (_, { rejectWithValue }) => {
    try {
      // ✅ 检查用户角色：只有超级管理员才能访问
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.role !== 'super_admin' && user.role !== 'superadmin') {
          console.log('[Stores] 非超级管理员，跳过获取租户列表');
          return [];
        }
      } else {
        console.log('[Stores] 未登录，跳过获取租户列表');
        return [];
      }

      const response = await apiGet<CompanyVerification[] | { data: CompanyVerification[] }>('/stores/company-verifications');
      // 后端返回 { ok: true, data: [...] }，但 apiGet 会自动提取 data
      // 如果是数组，直接使用；如果是对象，提取 data 字段
      return Array.isArray(response) ? response : (response.data || []);
    } catch (error) {
      console.error('[Stores] Fetch company verifications error:', error);
      // 静默失败，不影响其他功能
      return [];
    }
  }
);

// 模拟API调用：添加门店
export const addStore = createAsyncThunk(
  'stores/addStore',
  async (storeData: Omit<Store, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const resp = await apiPost<{ id: string }>('/stores', {
      name: storeData.name,
      address: storeData.address,
      managerId: storeData.managerId,
      managerName: storeData.managerName,
      managerPhone: storeData.managerPhone,
    });
    const newStore: Store = {
      ...storeData,
      id: String(resp.id),
      createdAt: now,
      updatedAt: now,
    };
    return newStore;
  }
);

// 模拟API调用：更新门店
export const updateStore = createAsyncThunk(
  'stores/updateStore',
  async (storeData: Store) => {
    const now = new Date().toISOString();
    await apiPut(`/stores/${storeData.id}`, {
      name: storeData.name,
      address: storeData.address,
      managerId: storeData.managerId,
      managerName: storeData.managerName,
      managerPhone: storeData.managerPhone,
    });
    const updatedStore: Store = { ...storeData, updatedAt: now };
    return updatedStore;
  }
);

// 模拟API调用：删除门店
export const deleteStore = createAsyncThunk(
  'stores/deleteStore',
  async (storeId: string) => {
    await apiDelete(`/stores/${storeId}`);
    return storeId;
  }
);

// ==================== 租户公司主体（新接口，所有租户） ====================

// 获取租户公司主体列表
export const fetchTenantCompanies = createAsyncThunk(
  'stores/fetchTenantCompanies',
  async () => {
    const response = await apiGet<TenantCompany[] | { data: TenantCompany[] }>('/tenant-companies');
    return Array.isArray(response) ? response : (response.data || []);
  }
);

// 添加公司主体
export const addTenantCompany = createAsyncThunk(
  'stores/addTenantCompany',
  async (companyData: Omit<TenantCompany, 'id' | 'createdAt' | 'updatedAt'>) => {
    const resp = await apiPost<{ id: string; data?: TenantCompany }>('/tenant-companies', companyData);
    return resp;
  }
);

// 更新公司主体
export const updateTenantCompany = createAsyncThunk(
  'stores/updateTenantCompany',
  async (companyData: TenantCompany) => {
    await apiPut(`/tenant-companies/${companyData.id}`, companyData);
    return companyData;
  }
);

// 删除公司主体
export const deleteTenantCompany = createAsyncThunk(
  'stores/deleteTenantCompany',
  async (companyId: string) => {
    await apiDelete(`/tenant-companies/${companyId}`);
    return companyId;
  }
);

// 设置默认公司主体
export const setDefaultTenantCompany = createAsyncThunk(
  'stores/setDefaultTenantCompany',
  async (companyId: string) => {
    await apiPut(`/tenant-companies/${companyId}/set-default`, {});
    return companyId;
  }
);

// ==================== 旧接口（保留，兼容性） ====================

// 模拟API调用：添加公司认证
export const addCompanyVerification = createAsyncThunk(
  'stores/addCompanyVerification',
  async (companyData: Omit<CompanyVerification, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const resp = await apiPost<{ id: string }>('/stores/company-verifications', {
      companyName: companyData.companyName,
      companyAddress: companyData.companyAddress,
      creditCode: companyData.creditCode,
      bankAccount: companyData.bankAccount,
      bankName: companyData.bankName,
    });
    const newCompany: CompanyVerification = {
      ...companyData,
      id: String(resp.id),
      createdAt: now,
      updatedAt: now,
    };
    return newCompany;
  }
);

// 模拟API调用：更新公司认证
export const updateCompanyVerification = createAsyncThunk(
  'stores/updateCompanyVerification',
  async (companyData: CompanyVerification) => {
    const now = new Date().toISOString();
    await apiPut(`/stores/company-verifications/${companyData.id}`, {
      companyName: companyData.companyName,
      companyAddress: companyData.companyAddress,
      creditCode: companyData.creditCode,
      bankAccount: companyData.bankAccount,
      bankName: companyData.bankName,
    });
    const updatedCompany: CompanyVerification = { ...companyData, updatedAt: now };
    return updatedCompany;
  }
);

// 模拟API调用：删除公司认证
export const deleteCompanyVerification = createAsyncThunk(
  'stores/deleteCompanyVerification',
  async (companyId: string) => {
    await apiDelete(`/stores/company-verifications/${companyId}`);
    return companyId;
  }
);

// 创建slice
const storesSlice = createSlice({
  name: 'stores',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // 获取门店列表
    builder
      .addCase(fetchStores.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStores.fulfilled, (state, action: PayloadAction<Store[]>) => {
        state.loading = false;
        state.stores = action.payload;
      })
      .addCase(fetchStores.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取门店列表失败';
      })
    
    // 获取公司认证列表
      .addCase(fetchCompanyVerifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanyVerifications.fulfilled, (state, action: PayloadAction<CompanyVerification[]>) => {
        state.loading = false;
        state.companyVerifications = action.payload;
      })
      .addCase(fetchCompanyVerifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取公司认证列表失败';
      })
    
    // 添加门店
      .addCase(addStore.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addStore.fulfilled, (state, action: PayloadAction<Store>) => {
        state.loading = false;
        state.stores.push(action.payload);
      })
      .addCase(addStore.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '添加门店失败';
      })
    
    // 更新门店
      .addCase(updateStore.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateStore.fulfilled, (state, action: PayloadAction<Store>) => {
        state.loading = false;
        const index = state.stores.findIndex(store => store.id === action.payload.id);
        if (index !== -1) {
          state.stores[index] = action.payload;
        }
      })
      .addCase(updateStore.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '更新门店失败';
      })
    
    // 删除门店
      .addCase(deleteStore.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteStore.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.stores = state.stores.filter(store => store.id !== action.payload);
      })
      .addCase(deleteStore.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '删除门店失败';
      })
    
    // 添加公司认证
      .addCase(addCompanyVerification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addCompanyVerification.fulfilled, (state, action: PayloadAction<CompanyVerification>) => {
        state.loading = false;
        state.companyVerifications.push(action.payload);
      })
      .addCase(addCompanyVerification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '添加公司认证失败';
      })
    
    // 更新公司认证
      .addCase(updateCompanyVerification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCompanyVerification.fulfilled, (state, action: PayloadAction<CompanyVerification>) => {
        state.loading = false;
        const index = state.companyVerifications.findIndex(company => company.id === action.payload.id);
        if (index !== -1) {
          state.companyVerifications[index] = action.payload;
        }
      })
      .addCase(updateCompanyVerification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '更新公司认证失败';
      })
    
    // 删除公司认证
      .addCase(deleteCompanyVerification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCompanyVerification.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.companyVerifications = state.companyVerifications.filter(company => company.id !== action.payload);
      })
      .addCase(deleteCompanyVerification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '删除公司认证失败';
      })
    
    // ==================== 租户公司主体（新接口） ====================
    
    // 获取租户公司主体列表
      .addCase(fetchTenantCompanies.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTenantCompanies.fulfilled, (state, action: PayloadAction<TenantCompany[]>) => {
        state.loading = false;
        state.tenantCompanies = action.payload;
      })
      .addCase(fetchTenantCompanies.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取公司主体列表失败';
      })
    
    // 添加公司主体
      .addCase(addTenantCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addTenantCompany.fulfilled, (state) => {
        state.loading = false;
        // 重新获取列表
      })
      .addCase(addTenantCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '添加公司主体失败';
      })
    
    // 更新公司主体
      .addCase(updateTenantCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTenantCompany.fulfilled, (state, action: PayloadAction<TenantCompany>) => {
        state.loading = false;
        const index = state.tenantCompanies.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.tenantCompanies[index] = action.payload;
        }
      })
      .addCase(updateTenantCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '更新公司主体失败';
      })
    
    // 删除公司主体
      .addCase(deleteTenantCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTenantCompany.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.tenantCompanies = state.tenantCompanies.filter(c => c.id !== action.payload);
      })
      .addCase(deleteTenantCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '删除公司主体失败';
      })
    
    // 设置默认公司主体
      .addCase(setDefaultTenantCompany.pending, (state) => {
        state.loading = true;
      })
      .addCase(setDefaultTenantCompany.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        // 更新所有公司的默认状态
        state.tenantCompanies = state.tenantCompanies.map(c => ({
          ...c,
          isDefault: c.id === action.payload
        }));
      })
      .addCase(setDefaultTenantCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '设置默认公司失败';
      });
  }
});

// 导出选择器
export const selectStores = (state: { stores: StoresState }) => state.stores.stores;
export const selectCompanyVerifications = (state: { stores: StoresState }) => state.stores.companyVerifications;
export const selectTenantCompanies = (state: { stores: StoresState }) => state.stores.tenantCompanies;
export const selectCompanyVerificationsLoading = (state: { stores: StoresState }) => state.stores.loading;
export const selectTenantCompaniesLoading = (state: { stores: StoresState }) => state.stores.loading;
export const selectStoresLoading = (state: { stores: StoresState }) => state.stores.loading;
export const selectStoresError = (state: { stores: StoresState }) => state.stores.error;

export default storesSlice.reducer;