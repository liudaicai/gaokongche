/**
 * 智能配件管理系统 V3.0 - Redux Slice
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';
import type { RootState } from '../../app/store';
import type {
  Accessory,
  AccessorySearchParams,
  AccessoryFormData,
  AccessoryStats,
  SmartSearchParams,
  RecommendedAccessory,
  EquipmentAccessoryKnowledge,
  AccessoryTransaction,
  TransactionFormData,
  KnowledgeFormData,
  AccessoryListResponse,
  AccessoryDetailResponse,
  SmartRecommendationResponse,
  AccessoryStatsResponse,
  KnowledgeListResponse,
  TransactionListResponse
} from './types';

// ==================== State 类型定义 ====================

interface AccessoriesState {
  // 配件列表
  list: Accessory[];
  currentAccessory: Accessory | null;
  
  // 智能推荐
  recommendations: RecommendedAccessory[];
  recommendationSessionId: string | null;
  
  // 适配知识库
  knowledgeList: EquipmentAccessoryKnowledge[];
  
  // 出入库记录
  transactions: AccessoryTransaction[];
  
  // 统计数据
  stats: AccessoryStats | null;
  
  // 加载状态
  loading: boolean;
  recommendationLoading: boolean;
  error: string | null;
  
  // 分页信息
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  
  transactionsPagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

// ==================== 初始状态 ====================

const initialState: AccessoriesState = {
  list: [],
  currentAccessory: null,
  recommendations: [],
  recommendationSessionId: null,
  knowledgeList: [],
  transactions: [],
  stats: null,
  loading: false,
  recommendationLoading: false,
  error: null,
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  },
  transactionsPagination: {
    page: 1,
    pageSize: 20,
    total: 0
  }
};

// ==================== 异步操作 ====================

// 获取配件列表
export const fetchAccessories = createAsyncThunk(
  'accessories/fetchList',
  async (params: AccessorySearchParams = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const response = await apiGet<AccessoryListResponse>(`/accessories?${queryParams.toString()}`);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 获取配件详情
export const fetchAccessoryDetail = createAsyncThunk(
  'accessories/fetchDetail',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await apiGet<AccessoryDetailResponse>(`/accessories/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 智能搜索配件（AI推荐）
export const smartSearchAccessories = createAsyncThunk(
  'accessories/smartSearch',
  async (params: SmartSearchParams, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const response = await apiGet<SmartRecommendationResponse>(`/accessories/smart-search?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 获取统计数据
export const fetchAccessoriesStats = createAsyncThunk(
  'accessories/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiGet<AccessoryStatsResponse>('/accessories/stats');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 创建配件
export const createAccessory = createAsyncThunk(
  'accessories/create',
  async (data: AccessoryFormData, { rejectWithValue }) => {
    try {
      await apiPost('/accessories', data);
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 更新配件
export const updateAccessory = createAsyncThunk(
  'accessories/update',
  async ({ id, data }: { id: number; data: Partial<AccessoryFormData> }, { rejectWithValue }) => {
    try {
      await apiPut(`/accessories/${id}`, data);
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 删除配件
export const deleteAccessory = createAsyncThunk(
  'accessories/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await apiDelete(`/accessories/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 获取适配知识库
export const fetchKnowledgeList = createAsyncThunk(
  'accessories/fetchKnowledge',
  async (accessoryId: number, { rejectWithValue }) => {
    try {
      const response = await apiGet<KnowledgeListResponse>(`/accessories/${accessoryId}/knowledge`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 添加适配知识
export const addKnowledge = createAsyncThunk(
  'accessories/addKnowledge',
  async ({ accessoryId, data }: { accessoryId: number; data: KnowledgeFormData }, { rejectWithValue }) => {
    try {
      await apiPost(`/accessories/${accessoryId}/knowledge`, data);
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 获取出入库记录
export const fetchTransactions = createAsyncThunk(
  'accessories/fetchTransactions',
  async ({ id, page = 1, pageSize = 20 }: { id: number; page?: number; pageSize?: number }, { rejectWithValue }) => {
    try {
      const response = await apiGet<TransactionListResponse>(`/accessories/${id}/transactions?page=${page}&pageSize=${pageSize}`);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 执行出入库操作
export const performTransaction = createAsyncThunk(
  'accessories/transaction',
  async ({ id, data }: { id: number; data: TransactionFormData }, { rejectWithValue }) => {
    try {
      const response = await apiPost<{
        data: {
          beforeQuantity: number;
          afterQuantity: number;
          availableQuantity: number;
        };
      }>(`/accessories/${id}/transaction`, data);
      return { id, ...response.data };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 提交AI推荐反馈
export const submitRecommendationFeedback = createAsyncThunk(
  'accessories/submitFeedback',
  async ({ sessionId, feedback }: { sessionId: string; feedback: any }, { rejectWithValue }) => {
    try {
      await apiPost('/accessories/recommendation-feedback', { sessionId, feedback });
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ==================== Slice ====================

const accessoriesSlice = createSlice({
  name: 'accessories',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentAccessory: (state) => {
      state.currentAccessory = null;
      state.knowledgeList = [];
      state.transactions = [];
    },
    clearRecommendations: (state) => {
      state.recommendations = [];
      state.recommendationSessionId = null;
    },
    setCurrentAccessory: (state, action: PayloadAction<Accessory>) => {
      state.currentAccessory = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // 获取配件列表
      .addCase(fetchAccessories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccessories.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchAccessories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 获取配件详情
      .addCase(fetchAccessoryDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccessoryDetail.fulfilled, (state, action) => {
        state.loading = false;
        state.currentAccessory = action.payload;
      })
      .addCase(fetchAccessoryDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // 智能搜索
      .addCase(smartSearchAccessories.pending, (state) => {
        state.recommendationLoading = true;
        state.error = null;
      })
      .addCase(smartSearchAccessories.fulfilled, (state, action) => {
        state.recommendationLoading = false;
        state.recommendations = action.payload.recommendations;
        state.recommendationSessionId = action.payload.sessionId;
      })
      .addCase(smartSearchAccessories.rejected, (state, action) => {
        state.recommendationLoading = false;
        state.error = action.payload as string;
      })

      // 获取统计数据
      .addCase(fetchAccessoriesStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })

      // 删除配件
      .addCase(deleteAccessory.fulfilled, (state, action) => {
        state.list = state.list.filter(item => item.id !== action.payload);
      })

      // 获取适配知识库
      .addCase(fetchKnowledgeList.fulfilled, (state, action) => {
        state.knowledgeList = action.payload;
      })

      // 获取出入库记录
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.transactions = action.payload.data;
        state.transactionsPagination = action.payload.pagination;
      })

      // 执行出入库操作
      .addCase(performTransaction.fulfilled, (state, action) => {
        // 更新当前配件的库存信息
        if (state.currentAccessory && state.currentAccessory.id === action.payload.id) {
          state.currentAccessory.totalQuantity = action.payload.afterQuantity;
          state.currentAccessory.availableQuantity = action.payload.availableQuantity;
        }
        // 更新列表中的配件库存
        const index = state.list.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.list[index].totalQuantity = action.payload.afterQuantity;
          state.list[index].availableQuantity = action.payload.availableQuantity;
        }
      });
  }
});

// ==================== Selectors ====================

export const selectAccessoriesList = (state: RootState) => state.accessories.list;
export const selectCurrentAccessory = (state: RootState) => state.accessories.currentAccessory;
export const selectRecommendations = (state: RootState) => state.accessories.recommendations;
export const selectRecommendationSessionId = (state: RootState) => state.accessories.recommendationSessionId;
export const selectKnowledgeList = (state: RootState) => state.accessories.knowledgeList;
export const selectTransactions = (state: RootState) => state.accessories.transactions;
export const selectAccessoriesStats = (state: RootState) => state.accessories.stats;
export const selectAccessoriesLoading = (state: RootState) => state.accessories.loading;
export const selectRecommendationLoading = (state: RootState) => state.accessories.recommendationLoading;
export const selectAccessoriesError = (state: RootState) => state.accessories.error;
export const selectAccessoriesPagination = (state: RootState) => state.accessories.pagination;

// ==================== Actions ====================

export const { clearError, clearCurrentAccessory, clearRecommendations, setCurrentAccessory } = accessoriesSlice.actions;

export default accessoriesSlice.reducer;

