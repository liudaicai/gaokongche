import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';
import type {
  EquipmentPurchase,
  PurchaseFormData,
  PurchaseStatistics,
} from './types';

interface PurchasesState {
  // 采购记录
  purchases: EquipmentPurchase[];
  currentPurchase: EquipmentPurchase | null;
  purchaseStats: PurchaseStatistics | null;
  
  // 厂家列表（用于下拉选择）
  manufacturers: string[];
  
  // 分页
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  
  // 加载状态
  loading: boolean;
  error: string | null;
}

const initialState: PurchasesState = {
  purchases: [],
  currentPurchase: null,
  purchaseStats: null,
  manufacturers: [],
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
  },
  loading: false,
  error: null,
};

// ==================== Async Thunks ====================

// 获取采购记录列表
export const fetchPurchases = createAsyncThunk(
  'purchases/fetchPurchases',
  async (params: {
    page?: number;
    pageSize?: number;
    manufacturerName?: string;
    purchaseType?: string;
    startDate?: string;
    endDate?: string;
  }, { rejectWithValue }) => {
    try {
      const query = new URLSearchParams();
      if (params.page) query.append('page', String(params.page));
      if (params.pageSize) query.append('pageSize', String(params.pageSize));
      if (params.manufacturerName) query.append('manufacturerName', params.manufacturerName);
      if (params.purchaseType) query.append('purchaseType', params.purchaseType);
      if (params.startDate) query.append('startDate', params.startDate);
      if (params.endDate) query.append('endDate', params.endDate);

      // apiGet 对于有 pagination 的响应会返回完整对象
      const response = await apiGet(`/equipment-purchases?${query.toString()}`);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 获取单个采购记录
export const fetchPurchase = createAsyncThunk(
  'purchases/fetchPurchase',
  async (id: number, { rejectWithValue }) => {
    try {
      // apiGet 已经自动提取了 data 字段
      const response = await apiGet(`/equipment-purchases/${id}`);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 创建采购记录
export const createPurchase = createAsyncThunk(
  'purchases/createPurchase',
  async (data: PurchaseFormData, { rejectWithValue }) => {
    try {
      // apiPost 已经自动提取了 data 字段，直接返回即可
      const response = await apiPost('/equipment-purchases', data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 更新采购记录
export const updatePurchase = createAsyncThunk(
  'purchases/updatePurchase',
  async ({ id, data }: { id: number; data: Partial<PurchaseFormData> }, { rejectWithValue }) => {
    try {
      await apiPut(`/equipment-purchases/${id}`, data);
      return { id, data };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 删除采购记录
export const deletePurchase = createAsyncThunk(
  'purchases/deletePurchase',
  async (id: number, { rejectWithValue }) => {
    try {
      await apiDelete(`/equipment-purchases/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 获取采购统计
export const fetchPurchaseStats = createAsyncThunk(
  'purchases/fetchPurchaseStats',
  async (_, { rejectWithValue }) => {
    try {
      // apiGet 已经自动提取了 data 字段
      const response = await apiGet('/equipment-purchases/stats/summary');
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 获取厂家列表
export const fetchManufacturers = createAsyncThunk(
  'purchases/fetchManufacturers',
  async (_, { rejectWithValue }) => {
    try {
      // apiGet 已经自动提取了 data 字段
      const response = await apiGet('/equipment-purchases/manufacturers/list');
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ==================== Slice ====================

const purchasesSlice = createSlice({
  name: 'purchases',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentPurchase: (state, action: PayloadAction<EquipmentPurchase | null>) => {
      state.currentPurchase = action.payload;
    },
  },
  extraReducers: (builder) => {
    // 采购列表
    builder.addCase(fetchPurchases.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchPurchases.fulfilled, (state, action) => {
      state.loading = false;
      state.purchases = action.payload.data;
      state.pagination = {
        page: action.payload.page,
        pageSize: action.payload.pageSize,
        total: action.payload.total,
      };
    });
    builder.addCase(fetchPurchases.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // 采购详情
    builder.addCase(fetchPurchase.fulfilled, (state, action) => {
      state.currentPurchase = action.payload;
    });

    // 采购统计
    builder.addCase(fetchPurchaseStats.fulfilled, (state, action) => {
      state.purchaseStats = action.payload;
    });

    // 厂家列表
    builder.addCase(fetchManufacturers.fulfilled, (state, action) => {
      state.manufacturers = action.payload;
    });
  },
});

export const { clearError, setCurrentPurchase } = purchasesSlice.actions;
export default purchasesSlice.reducer;
