import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';
import type { Company, CompanyFormData, CompanyStats } from './types';

interface CompaniesState {
  companies: Company[];
  currentCompany: Company | null;
  stats: CompanyStats | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
}

const initialState: CompaniesState = {
  companies: [],
  currentCompany: null,
  stats: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pageSize: 10,
};

// 获取公司列表
export const fetchCompanies = createAsyncThunk(
  'companies/fetchCompanies',
  async (params: { page?: number; pageSize?: number; search?: string } = {}) => {
    const { page = 1, pageSize = 10, search = '' } = params;
    const queryParams = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      ...(search && { search }),
    });
    
    const response = await apiGet<{
      data: Company[];
      pagination: { page: number; pageSize: number; total: number };
    }>(`/companies?${queryParams}`);
    
    return response;
  }
);

// 获取单个公司详情
export const fetchCompanyById = createAsyncThunk(
  'companies/fetchCompanyById',
  async (id: number) => {
    const response = await apiGet<Company>(`/companies/${id}`);
    return response;
  }
);

// 创建公司
export const createCompany = createAsyncThunk(
  'companies/createCompany',
  async (data: CompanyFormData) => {
    const response = await apiPost<{ id: number }>('/companies', data);
    return response;
  }
);

// （方案B）初始化/创建租户库（幂等，可重复调用）
export const provisionCompanyDb = createAsyncThunk(
  'companies/provisionCompanyDb',
  async (companyId: number) => {
    const response = await apiPost<any>(`/companies/${companyId}/provision-db`, {});
    return { companyId, result: response };
  }
);

// 更新公司
export const updateCompany = createAsyncThunk(
  'companies/updateCompany',
  async ({ id, data }: { id: number; data: Partial<CompanyFormData> }) => {
    await apiPut(`/companies/${id}`, data);
    return { id, data };
  }
);

// 删除公司
export const deleteCompany = createAsyncThunk(
  'companies/deleteCompany',
  async (id: number) => {
    await apiDelete(`/companies/${id}`);
    return id;
  }
);

// 获取公司统计信息
export const fetchCompanyStats = createAsyncThunk(
  'companies/fetchCompanyStats',
  async (id: number) => {
    const response = await apiGet<CompanyStats>(`/companies/${id}/stats`);
    return response;
  }
);

const companiesSlice = createSlice({
  name: 'companies',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentCompany: (state) => {
      state.currentCompany = null;
      state.stats = null;
    },
  },
  extraReducers: (builder) => {
    // 获取公司列表
    builder
      .addCase(fetchCompanies.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanies.fulfilled, (state, action) => {
        state.loading = false;
        state.companies = action.payload.data;
        state.total = action.payload.pagination.total;
        state.page = action.payload.pagination.page;
        state.pageSize = action.payload.pagination.pageSize;
      })
      .addCase(fetchCompanies.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取公司列表失败';
      });

    // 获取公司详情
    builder
      .addCase(fetchCompanyById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanyById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCompany = action.payload;
      })
      .addCase(fetchCompanyById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取公司详情失败';
      });

    // 创建公司
    builder
      .addCase(createCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCompany.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '创建公司失败';
      });

    // 更新公司
    builder
      .addCase(updateCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCompany.fulfilled, (state, action) => {
        state.loading = false;
        // 更新列表中的公司信息
        const index = state.companies.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.companies[index] = { ...state.companies[index], ...action.payload.data };
        }
        // 更新当前公司信息
        if (state.currentCompany && state.currentCompany.id === action.payload.id) {
          state.currentCompany = { ...state.currentCompany, ...action.payload.data };
        }
      })
      .addCase(updateCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '更新公司失败';
      });

    // 删除公司
    builder
      .addCase(deleteCompany.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCompany.fulfilled, (state, action) => {
        state.loading = false;
        state.companies = state.companies.filter(c => c.id !== action.payload);
        if (state.currentCompany && state.currentCompany.id === action.payload) {
          state.currentCompany = null;
        }
      })
      .addCase(deleteCompany.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '删除公司失败';
      });

    // 获取公司统计信息
    builder
      .addCase(fetchCompanyStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanyStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchCompanyStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取统计信息失败';
      });
  },
});

export const { clearError, clearCurrentCompany } = companiesSlice.actions;
export default companiesSlice.reducer;
