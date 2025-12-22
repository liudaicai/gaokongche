// 设备维修管理 Redux Slice
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';
import type {
  EquipmentRepair,
  CreateRepairRequest,
  UpdateRepairRequest,
  CompleteRepairRequest,
  RepairListParams,
  RepairListResponse,
} from '../../types/equipmentRepair';

interface RepairState {
  repairs: EquipmentRepair[];
  currentRepair: EquipmentRepair | null;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  total: number;
}

const initialState: RepairState = {
  repairs: [],
  currentRepair: null,
  loading: false,
  error: null,
  page: 1,
  pageSize: 20,
  total: 0,
};

// 获取维修单列表
export const fetchRepairs = createAsyncThunk(
  'repairs/fetchRepairs',
  async (params: RepairListParams = {}, { rejectWithValue }) => {
    try {
      // 构建查询参数
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', String(params.page));
      if (params.pageSize) queryParams.append('pageSize', String(params.pageSize));
      if (params.equipmentCode) queryParams.append('equipmentCode', params.equipmentCode);
      if (params.status) queryParams.append('status', params.status);
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      
      const queryString = queryParams.toString();
      const path = queryString ? `/equipment-repairs?${queryString}` : '/equipment-repairs';
      
      const response = await apiGet<RepairListResponse>(path);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取维修单列表失败');
    }
  }
);

// 获取单个维修单
export const fetchRepairById = createAsyncThunk(
  'repairs/fetchRepairById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await apiGet<{ ok: boolean; data: EquipmentRepair }>(`/equipment-repairs/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || '获取维修单详情失败');
    }
  }
);

// 创建维修单
export const createRepair = createAsyncThunk(
  'repairs/createRepair',
  async (data: CreateRepairRequest, { rejectWithValue }) => {
    try {
      const response = await apiPost<{ ok: boolean; id: string; repairNumber: string }>('/equipment-repairs', data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || '创建维修单失败');
    }
  }
);

// 更新维修单
export const updateRepair = createAsyncThunk(
  'repairs/updateRepair',
  async ({ id, data }: { id: string; data: UpdateRepairRequest }, { rejectWithValue }) => {
    try {
      await apiPut(`/equipment-repairs/${id}`, data);
      return { id, data };
    } catch (error: any) {
      return rejectWithValue(error.message || '更新维修单失败');
    }
  }
);

// 删除维修单（取消维修）
export const deleteRepair = createAsyncThunk(
  'repairs/deleteRepair',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiDelete(`/equipment-repairs/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || '取消维修单失败');
    }
  }
);

// 完成维修
export const completeRepair = createAsyncThunk(
  'repairs/completeRepair',
  async ({ id, data }: { id: string; data: CompleteRepairRequest }, { rejectWithValue }) => {
    try {
      await apiPost(`/equipment-repairs/${id}/complete`, data);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || '完成维修失败');
    }
  }
);

const repairsSlice = createSlice({
  name: 'repairs',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentRepair: (state) => {
      state.currentRepair = null;
    },
  },
  extraReducers: (builder) => {
    // 获取维修单列表
    builder.addCase(fetchRepairs.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchRepairs.fulfilled, (state, action: PayloadAction<RepairListResponse>) => {
      state.loading = false;
      state.repairs = action.payload.data;
      state.page = action.payload.page;
      state.pageSize = action.payload.pageSize;
      state.total = action.payload.total;
    });
    builder.addCase(fetchRepairs.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // 获取单个维修单
    builder.addCase(fetchRepairById.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchRepairById.fulfilled, (state, action: PayloadAction<EquipmentRepair>) => {
      state.loading = false;
      state.currentRepair = action.payload;
    });
    builder.addCase(fetchRepairById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // 创建维修单
    builder.addCase(createRepair.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createRepair.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(createRepair.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // 更新维修单
    builder.addCase(updateRepair.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateRepair.fulfilled, (state, action) => {
      state.loading = false;
      const { id, data } = action.payload;
      // 更新列表中的维修单
      const index = state.repairs.findIndex(r => r.id === id);
      if (index !== -1) {
        state.repairs[index] = { ...state.repairs[index], ...data };
      }
      // 更新当前维修单
      if (state.currentRepair?.id === id) {
        state.currentRepair = { ...state.currentRepair, ...data };
      }
    });
    builder.addCase(updateRepair.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // 删除维修单
    builder.addCase(deleteRepair.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteRepair.fulfilled, (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.repairs = state.repairs.filter(r => r.id !== action.payload);
      if (state.currentRepair?.id === action.payload) {
        state.currentRepair = null;
      }
    });
    builder.addCase(deleteRepair.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // 完成维修
    builder.addCase(completeRepair.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(completeRepair.fulfilled, (state, action: PayloadAction<string>) => {
      state.loading = false;
      // 更新列表中的维修单状态
      const index = state.repairs.findIndex(r => r.id === action.payload);
      if (index !== -1) {
        state.repairs[index].status = 'completed';
      }
      // 更新当前维修单状态
      if (state.currentRepair?.id === action.payload) {
        state.currentRepair.status = 'completed';
      }
    });
    builder.addCase(completeRepair.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearError, clearCurrentRepair } = repairsSlice.actions;
export default repairsSlice.reducer;
