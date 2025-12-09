import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Store, CompanyVerification, StoresState } from './types';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';

// 初始状态
const initialState: StoresState = {
  stores: [],
  companyVerifications: [],
  loading: false,
  error: null
};

// 模拟API调用：获取门店列表
export const fetchStores = createAsyncThunk(
  'stores/fetchStores',
  async () => {
    const list = await apiGet<Store[]>('/stores');
    return list;
  }
);

// 模拟API调用：获取公司认证列表
export const fetchCompanyVerifications = createAsyncThunk(
  'stores/fetchCompanyVerifications',
  async () => {
    const list = await apiGet<CompanyVerification[]>('/stores/company-verifications');
    return Array.isArray(list) ? list : [];
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
      });
  }
});

// 导出选择器
export const selectStores = (state: { stores: StoresState }) => state.stores.stores;
export const selectCompanyVerifications = (state: { stores: StoresState }) => state.stores.companyVerifications;
export const selectCompanyVerificationsLoading = (state: { stores: StoresState }) => state.stores.loading;
export const selectStoresLoading = (state: { stores: StoresState }) => state.stores.loading;
export const selectStoresError = (state: { stores: StoresState }) => state.stores.error;

export default storesSlice.reducer;