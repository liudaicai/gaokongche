/**
 * 转租管理 Redux Slice
 */

import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';

// ==================== 类型定义 ====================

export type CompanyStatus = 'active' | 'inactive' | 'blacklist';
export type EquipmentStatus = 'idle' | 'renting' | 'returned' | 'suspended' | 'maintenance';
export type PaymentMethod = 'cash' | 'transfer' | 'check' | 'other';
export type ReconciliationStatus = 'pending' | 'confirmed' | 'rejected';

export interface SubleaseCompany {
  id: number;
  companyName: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  businessLicense?: string;
  taxId?: string;
  bankName?: string;
  bankAccount?: string;
  creditRating: number;
  rentingCount: number;
  returnedCount: number;
  idleCount: number;
  totalPayable: number;
  totalPaid: number;
  outstandingAmount: number;
  remark?: string;
  status: CompanyStatus;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubleaseEquipment {
  id: number;
  companyId: number;
  companyName: string;
  equipmentCode?: string;
  factoryNumber?: string;
  category: string;
  equipmentType: string;
  model?: string;
  brand?: string;
  height?: string;
  dailyRate: number;
  monthlyRate: number;
  deposit: number;
  startDate?: string;
  endDate?: string;
  actualReturnDate?: string;
  rentalDays: number;
  totalCost: number;
  paidAmount: number;
  outstandingAmount: number;
  status: EquipmentStatus;
  suspensionReason?: string;
  suspensionStartDate?: string;
  suspensionEndDate?: string;
  linkedOrderId?: number;
  linkedOrderNumber?: string;
  remark?: string;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubleasePayment {
  id: number;
  companyId: number;
  companyName: string;
  paymentNumber: string;
  paymentDate: string;
  paymentAmount: number;
  paymentMethod: PaymentMethod;
  paymentAccount?: string;
  relatedEquipmentIds?: number[];
  receiptUrl?: string;
  handlerId?: number;
  handlerName?: string;
  remark?: string;
  createdBy?: number;
  createdAt: string;
}

export interface SubleaseReconciliation {
  id: number;
  companyId: number;
  companyName: string;
  reconciliationNumber: string;
  reconciliationDate: string;
  startDate?: string;
  endDate?: string;
  reconciliationAmount: number;
  relatedEquipmentIds?: number[];
  status: ReconciliationStatus;
  confirmedBy?: number;
  confirmedAt?: string;
  attachmentUrl?: string;
  remark?: string;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

interface SubleaseState {
  companies: SubleaseCompany[];
  equipments: SubleaseEquipment[];
  payments: SubleasePayment[];
  reconciliations: SubleaseReconciliation[];
  currentCompany: SubleaseCompany | null;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  total: number;
}

// ==================== 初始状态 ====================

const initialState: SubleaseState = {
  companies: [],
  equipments: [],
  payments: [],
  reconciliations: [],
  currentCompany: null,
  loading: false,
  error: null,
  page: 1,
  pageSize: 20,
  total: 0,
};

// ==================== 异步 Thunks ====================

/**
 * 获取转租公司列表
 */
export const fetchCompanies = createAsyncThunk(
  'sublease/fetchCompanies',
  async (params: { page?: number; pageSize?: number; search?: string; status?: string } = {}) => {
    const { page = 1, pageSize = 20, search = '', status = '' } = params;
    
    // 构建URL with query params
    const queryParams = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      ...(search && { search }),
      ...(status && { status }),
    });
    
    // 使用fetch直接调用，因为apiGet会自动提取data字段
    const url = `/api/sublease/companies?${queryParams}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('auth_token')}`,
      },
    });
    
    const json = await response.json();
    if (!json.ok) {
      throw new Error(json.error || '获取公司列表失败');
    }
    
    return json; // 返回完整响应（包含 data, page, pageSize, total）
  }
);

/**
 * 获取公司详情
 */
export const fetchCompanyDetail = createAsyncThunk(
  'sublease/fetchCompanyDetail',
  async (id: number) => {
    const response: any = await apiGet(`/sublease/companies/${id}`);
    return response.data;
  }
);

/**
 * 创建转租公司
 */
export const createCompany = createAsyncThunk(
  'sublease/createCompany',
  async (data: Partial<SubleaseCompany>) => {
    const response: any = await apiPost('/sublease/companies', data);
    return response.data;
  }
);

/**
 * 更新转租公司
 */
export const updateCompany = createAsyncThunk(
  'sublease/updateCompany',
  async ({ id, data }: { id: number; data: Partial<SubleaseCompany> }) => {
    await apiPut(`/sublease/companies/${id}`, data);
    return { id, data };
  }
);

/**
 * 删除转租公司
 */
export const deleteCompany = createAsyncThunk(
  'sublease/deleteCompany',
  async (id: number) => {
    await apiDelete(`/sublease/companies/${id}`);
    return id;
  }
);

/**
 * 获取转租设备列表
 */
export const fetchEquipments = createAsyncThunk(
  'sublease/fetchEquipments',
  async (params: { page?: number; pageSize?: number; companyId?: number; status?: string; search?: string } = {}) => {
    const { page = 1, pageSize = 20, companyId, status = '', search = '' } = params;
    
    const queryParams = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      ...(companyId && { companyId: String(companyId) }),
      ...(status && { status }),
      ...(search && { search }),
    });
    
    // 使用fetch直接调用，因为apiGet会自动提取data字段
    const url = `/api/sublease/equipments?${queryParams}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('auth_token')}`,
      },
    });
    
    const json = await response.json();
    if (!json.ok) {
      throw new Error(json.error || '获取设备列表失败');
    }
    
    return json; // 返回完整响应（包含 data, page, pageSize, total）
  }
);

/**
 * 创建转租设备
 */
export const createEquipment = createAsyncThunk(
  'sublease/createEquipment',
  async (data: Partial<SubleaseEquipment>) => {
    const response: any = await apiPost('/sublease/equipments', data);
    return response.data;
  }
);

/**
 * 更新转租设备
 */
export const updateEquipment = createAsyncThunk(
  'sublease/updateEquipment',
  async ({ id, data }: { id: number; data: Partial<SubleaseEquipment> }) => {
    await apiPut(`/sublease/equipments/${id}`, data);
    return { id, data };
  }
);

/**
 * 还租设备
 */
export const returnEquipment = createAsyncThunk(
  'sublease/returnEquipment',
  async ({ id, returnDate, remark }: { id: number; returnDate: string; remark?: string }) => {
    await apiPut(`/sublease/equipments/${id}/return`, { returnDate, remark });
    return id;
  }
);

/**
 * 报停设备
 */
export const suspendEquipment = createAsyncThunk(
  'sublease/suspendEquipment',
  async ({ id, suspensionReason, suspensionStartDate, suspensionEndDate }: { 
    id: number; 
    suspensionReason: string; 
    suspensionStartDate: string; 
    suspensionEndDate?: string;
  }) => {
    await apiPut(`/sublease/equipments/${id}/suspend`, {
      suspensionReason,
      suspensionStartDate,
      suspensionEndDate,
    });
    return id;
  }
);

/**
 * 创建付款记录
 */
export const createPayment = createAsyncThunk(
  'sublease/createPayment',
  async (data: Partial<SubleasePayment>) => {
    const response: any = await apiPost('/sublease/payments', data);
    return response.data;
  }
);

/**
 * 获取付款记录
 */
export const fetchPayments = createAsyncThunk(
  'sublease/fetchPayments',
  async (companyId?: number) => {
    const queryParams = companyId ? `?companyId=${companyId}` : '';
    const response: any = await apiGet(`/sublease/payments${queryParams}`);
    return response.data;
  }
);

/**
 * 创建对账记录
 */
export const createReconciliation = createAsyncThunk(
  'sublease/createReconciliation',
  async (data: Partial<SubleaseReconciliation>) => {
    const response: any = await apiPost('/sublease/reconciliations', data);
    return response.data;
  }
);

/**
 * 获取对账记录
 */
export const fetchReconciliations = createAsyncThunk(
  'sublease/fetchReconciliations',
  async (companyId?: number) => {
    const queryParams = companyId ? `?companyId=${companyId}` : '';
    const response: any = await apiGet(`/sublease/reconciliations${queryParams}`);
    return response.data;
  }
);

// ==================== Slice ====================

const subleaseSlice = createSlice({
  name: 'sublease',
  initialState,
  reducers: {
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    setPageSize(state, action: PayloadAction<number>) {
      state.pageSize = action.payload;
    },
    clearCurrentCompany(state) {
      state.currentCompany = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 获取公司列表
      .addCase(fetchCompanies.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanies.fulfilled, (state, action) => {
        state.loading = false;
        state.companies = action.payload.data;
        // 不要在这里更新 page/pageSize，避免触发无限循环
        // state.page = action.payload.page;
        // state.pageSize = action.payload.pageSize;
        state.total = action.payload.total;
      })
      .addCase(fetchCompanies.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取公司列表失败';
      })
      
      // 获取公司详情
      .addCase(fetchCompanyDetail.fulfilled, (state, action) => {
        state.currentCompany = action.payload;
      })
      
      // 删除公司
      .addCase(deleteCompany.fulfilled, (state, action) => {
        state.companies = state.companies.filter(c => c.id !== action.payload);
      })
      
      // 获取设备列表
      .addCase(fetchEquipments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEquipments.fulfilled, (state, action) => {
        state.loading = false;
        state.equipments = action.payload.data;
        // 不要在这里更新 page/pageSize，避免触发无限循环
        // state.page = action.payload.page;
        // state.pageSize = action.payload.pageSize;
        state.total = action.payload.total;
      })
      .addCase(fetchEquipments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取设备列表失败';
      })
      
      // 获取付款记录
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.payments = action.payload;
      })
      
      // 获取对账记录
      .addCase(fetchReconciliations.fulfilled, (state, action) => {
        state.reconciliations = action.payload;
      });
  },
});

// ==================== Actions & Selectors ====================

export const {
  setPage,
  setPageSize,
  clearCurrentCompany,
  clearError,
} = subleaseSlice.actions;

export const selectCompanies = (state: RootState) => state.sublease.companies;
export const selectEquipments = (state: RootState) => state.sublease.equipments;
export const selectPayments = (state: RootState) => state.sublease.payments;
export const selectReconciliations = (state: RootState) => state.sublease.reconciliations;
export const selectCurrentCompany = (state: RootState) => state.sublease.currentCompany;
export const selectLoading = (state: RootState) => state.sublease.loading;
export const selectError = (state: RootState) => state.sublease.error;
export const selectPagination = createSelector(
  [(state: RootState) => state.sublease],
  (sublease) => ({
    page: sublease.page,
    pageSize: sublease.pageSize,
    total: sublease.total,
  })
);

export default subleaseSlice.reducer;

