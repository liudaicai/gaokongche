import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiGet } from '../../api/client';
import type {
  DashboardKPI,
  DashboardTrends,
  DashboardAlert,
  DashboardActivity,
  EquipmentUtilization,
  EquipmentInventoryStat,
  PartStat,
} from './types';

interface DashboardState {
  kpi: DashboardKPI | null;
  trends: DashboardTrends | null;
  alerts: DashboardAlert[];
  activities: DashboardActivity[];
  utilization: EquipmentUtilization[];
  equipmentInventory: EquipmentInventoryStat[];
  parts: PartStat[];
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  kpi: null,
  trends: null,
  alerts: [],
  activities: [],
  utilization: [],
  equipmentInventory: [],
  parts: [],
  loading: false,
  error: null,
};

// 异步获取KPI数据
export const fetchDashboardKPI = createAsyncThunk(
  'dashboard/fetchKPI',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiGet('/dashboard/kpi');
      return response;  // apiGet已经提取了data字段，直接返回
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 异步获取趋势数据
export const fetchDashboardTrends = createAsyncThunk(
  'dashboard/fetchTrends',
  async (days: number = 30, { rejectWithValue }) => {
    try {
      const response = await apiGet(`/dashboard/trends?days=${days}`);
      return response;  // apiGet已经提取了data字段，直接返回
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 异步获取提醒数据
export const fetchDashboardAlerts = createAsyncThunk(
  'dashboard/fetchAlerts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiGet('/dashboard/alerts');
      return response;  // apiGet已经提取了data字段，直接返回
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 异步获取最近活动
export const fetchDashboardActivities = createAsyncThunk(
  'dashboard/fetchActivities',
  async (limit: number = 10, { rejectWithValue }) => {
    try {
      const response = await apiGet(`/dashboard/recent-activities?limit=${limit}`);
      return response;  // apiGet已经提取了data字段，直接返回
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 异步获取设备利用率
export const fetchEquipmentUtilization = createAsyncThunk(
  'dashboard/fetchUtilization',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiGet('/dashboard/equipment-utilization');
      return response;  // apiGet已经提取了data字段，直接返回
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 异步获取设备库存统计
export const fetchEquipmentInventory = createAsyncThunk(
  'dashboard/fetchEquipmentInventory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiGet('/equipments/inventory/stats');
      return response;  // apiGet已经提取了data字段，直接返回
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 异步获取配件统计
export const fetchPartsStats = createAsyncThunk(
  'dashboard/fetchPartsStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiGet('/parts');
      return response;  // apiGet已经提取了data字段，直接返回
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // KPI
    builder.addCase(fetchDashboardKPI.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchDashboardKPI.fulfilled, (state, action) => {
      state.loading = false;
      state.kpi = action.payload;
    });
    builder.addCase(fetchDashboardKPI.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Trends
    builder.addCase(fetchDashboardTrends.fulfilled, (state, action) => {
      state.trends = action.payload;
    });

    // Alerts
    builder.addCase(fetchDashboardAlerts.fulfilled, (state, action) => {
      state.alerts = action.payload;
    });

    // Activities
    builder.addCase(fetchDashboardActivities.fulfilled, (state, action) => {
      state.activities = action.payload;
    });

    // Utilization
    builder.addCase(fetchEquipmentUtilization.fulfilled, (state, action) => {
      state.utilization = action.payload;
    });

    // Equipment Inventory
    builder.addCase(fetchEquipmentInventory.fulfilled, (state, action) => {
      state.equipmentInventory = action.payload;
    });

    // Parts
    builder.addCase(fetchPartsStats.fulfilled, (state, action) => {
      state.parts = action.payload;
    });
  },
});

export const { clearError } = dashboardSlice.actions;
export default dashboardSlice.reducer;
