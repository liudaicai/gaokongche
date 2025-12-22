import { createSlice, PayloadAction, createAction, createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';
import { apiPost } from '../../api/client';

// 附件接口
export interface Attachment {
  id: string;
  name: string;
  url: string;
}

// 门店接口
export interface Store {
  id: string;
  name: string;
}

// 车辆接口
export interface Vehicle {
  id: string;
  plateNumber: string; // 车牌
  spec: string; // 规格
  stores: Store[]; // 服务门店
  remark?: string; // 备注
  attachments?: Attachment[]; // 附件
  createdAt: string;
  updatedAt: string;
}

// 司机接口
export interface Driver {
  id: string;
  name: string; // 司机姓名
  phone: string; // 电话
  stores: Store[]; // 服务门店
  remark?: string; // 备注
  attachments?: Attachment[]; // 附件
  createdAt: string;
  updatedAt: string;
}

// 物流公司接口
export interface LogisticsCompany {
  id: string;
  name: string; // 公司名
  stores: Store[]; // 服务门店
  contactPerson: string; // 联系人
  contactPhone: string; // 电话
  pricingRule: string; // 计费规则
  attachments?: Attachment[]; // 附件
  createdAt: string;
  updatedAt: string;
}

// 物流类型
export type LogisticsType = 'own' | 'third';

// 记录类型（进场/退场/仓库调拨）
export type RecordType = 'entry' | 'exit' | 'warehouse_transfer';

// 物流台账项接口
export interface LogisticsLedgerItem {
  id: string;
  ledgerNumber?: string;
  orderId?: number;
  orderNumber: string;
  customerName?: string;
  projectName?: string;
  entryId?: number;
  exitId?: number;
  logisticsType: LogisticsType;
  recordType: RecordType;
  storeId: string;
  storeName: string;
  sourceStoreId?: string;
  sourceStoreName?: string;
  targetStoreId?: string;
  targetStoreName?: string;
  amount: number;
  logisticsCost?: number;
  date: string;
  recordDate?: string;
  remark?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  companyId?: string;
  companyName?: string;
  companyContactName?: string;
  companyContactPhone?: string;
  vehicleInfo?: string;
  driverInfo?: string;
  companyInfo?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 状态接口
export interface LogisticsState {
  vehicles: Vehicle[];
  drivers: Driver[];
  companies: LogisticsCompany[];
  stores: Store[];
  ledgerData: LogisticsLedgerItem[];
  loading: boolean;
  error: string | null;
}

// 获取物流台账数据
export const fetchLedgerDataStart = createAction('logistics/fetchLedgerDataStart');
export const fetchLedgerDataSuccess = createAction<LogisticsLedgerItem[]>('logistics/fetchLedgerDataSuccess');
export const fetchLedgerDataFailure = createAction<string>('logistics/fetchLedgerDataFailure');

// 创建物流台账记录（异步thunk）
export const addLedgerItem = createAsyncThunk(
  'logistics/addLedgerItem',
  async (item: LogisticsLedgerItem, { rejectWithValue }) => {
    try {
      const response = await apiPost<{ ok: boolean; id: string; ledgerNumber: string }>(
        '/logistics/ledger',
        item
      );
      
      if (!response.ok) {
        return rejectWithValue('创建台账记录失败');
      }
      
      // 返回创建的记录（带上服务器生成的ID和编号）
      return {
        ...item,
        id: response.id,
        ledgerNumber: response.ledgerNumber
      };
    } catch (err: any) {
      return rejectWithValue(err?.message || '创建台账记录失败');
    }
  }
);

// 初始状态（改为完全由后端数据驱动，不使用本地模拟数据）
const initialState: LogisticsState = {
  vehicles: [],
  drivers: [],
  companies: [],
  stores: [],
  loading: false,
  error: null,
  ledgerData: []
};

// 创建slice
export const logisticsSlice = createSlice({
  name: 'logistics',
  initialState,
  reducers: {
    // 获取车辆列表
    fetchVehiclesStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchVehiclesSuccess(state, action: PayloadAction<Vehicle[]>) {
      state.loading = false;
      state.vehicles = action.payload;
    },
    fetchVehiclesFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    
    // 添加车辆
    addVehicleStart(state) {
      state.loading = true;
      state.error = null;
    },
    addVehicleSuccess(state, action: PayloadAction<Vehicle>) {
      state.loading = false;
      state.vehicles.push(action.payload);
    },
    addVehicleFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    
    // 更新车辆
    updateVehicleStart(state) {
      state.loading = true;
      state.error = null;
    },
    updateVehicleSuccess(state, action: PayloadAction<Vehicle>) {
      state.loading = false;
      const index = state.vehicles.findIndex(v => v.id === action.payload.id);
      if (index !== -1) {
        state.vehicles[index] = action.payload;
      }
    },
    updateVehicleFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    
    // 删除车辆
    deleteVehicleStart(state) {
      state.loading = true;
      state.error = null;
    },
    deleteVehicleSuccess(state, action: PayloadAction<string>) {
      state.loading = false;
      state.vehicles = state.vehicles.filter(v => v.id !== action.payload);
    },
    deleteVehicleFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    
    // 获取司机列表
    fetchDriversStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchDriversSuccess(state, action: PayloadAction<Driver[]>) {
      state.loading = false;
      state.drivers = action.payload;
    },
    fetchDriversFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    
    // 添加司机
    addDriverStart(state) {
      state.loading = true;
      state.error = null;
    },
    addDriverSuccess(state, action: PayloadAction<Driver>) {
      state.loading = false;
      state.drivers.push(action.payload);
    },
    addDriverFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    
    // 更新司机
    updateDriverStart(state) {
      state.loading = true;
      state.error = null;
    },
    updateDriverSuccess(state, action: PayloadAction<Driver>) {
      state.loading = false;
      const index = state.drivers.findIndex(d => d.id === action.payload.id);
      if (index !== -1) {
        state.drivers[index] = action.payload;
      }
    },
    updateDriverFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    
    // 删除司机
    deleteDriverStart(state) {
      state.loading = true;
      state.error = null;
    },
    deleteDriverSuccess(state, action: PayloadAction<string>) {
      state.loading = false;
      state.drivers = state.drivers.filter(d => d.id !== action.payload);
    },
    deleteDriverFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    
    // 获取物流公司列表
    fetchCompaniesStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchCompaniesSuccess(state, action: PayloadAction<LogisticsCompany[]>) {
      state.loading = false;
      state.companies = action.payload;
    },
    fetchCompaniesFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    
    // 添加物流公司
    addCompanyStart(state) {
      state.loading = true;
      state.error = null;
    },
    addCompanySuccess(state, action: PayloadAction<LogisticsCompany>) {
      state.loading = false;
      state.companies.push(action.payload);
    },
    addCompanyFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    
    // 更新物流公司
    updateCompanyStart(state) {
      state.loading = true;
      state.error = null;
    },
    updateCompanySuccess(state, action: PayloadAction<LogisticsCompany>) {
      state.loading = false;
      const index = state.companies.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.companies[index] = action.payload;
      }
    },
    updateCompanyFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    
    // 删除物流公司
    deleteCompanyStart(state) {
      state.loading = true;
      state.error = null;
    },
    deleteCompanySuccess(state, action: PayloadAction<string>) {
      state.loading = false;
      state.companies = state.companies.filter(c => c.id !== action.payload);
    },
    deleteCompanyFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    
    // 获取门店列表
    fetchStoresStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchStoresSuccess(state, action: PayloadAction<Store[]>) {
      state.loading = false;
      state.stores = action.payload;
    },
    fetchStoresFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    // 添加台账记录（同步到Redux和数据库）
    addLedgerItemStart(state) {
      state.loading = true;
      state.error = null;
    },
    addLedgerItemSuccess(state, action: PayloadAction<LogisticsLedgerItem>) {
      state.loading = false;
      state.ledgerData.push(action.payload);
    },
    addLedgerItemFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLedgerDataStart, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLedgerDataSuccess, (state, action: PayloadAction<LogisticsLedgerItem[]>) => {
        state.loading = false;
        state.ledgerData = action.payload;
      })
      .addCase(fetchLedgerDataFailure, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
      })
      // addLedgerItem thunk
      .addCase(addLedgerItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addLedgerItem.fulfilled, (state, action) => {
        state.loading = false;
        state.ledgerData.push(action.payload);
      })
      .addCase(addLedgerItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || '创建台账记录失败';
      });
  }
});

// 导出actions
export const {
  fetchVehiclesStart,
  fetchVehiclesSuccess,
  fetchVehiclesFailure,
  addVehicleStart,
  addVehicleSuccess,
  addVehicleFailure,
  updateVehicleStart,
  updateVehicleSuccess,
  updateVehicleFailure,
  deleteVehicleStart,
  deleteVehicleSuccess,
  deleteVehicleFailure,
  fetchDriversStart,
  fetchDriversSuccess,
  fetchDriversFailure,
  addDriverStart,
  addDriverSuccess,
  addDriverFailure,
  updateDriverStart,
  updateDriverSuccess,
  updateDriverFailure,
  deleteDriverStart,
  deleteDriverSuccess,
  deleteDriverFailure,
  fetchCompaniesStart,
  fetchCompaniesSuccess,
  fetchCompaniesFailure,
  addCompanyStart,
  addCompanySuccess,
  addCompanyFailure,
  updateCompanyStart,
  updateCompanySuccess,
  updateCompanyFailure,
  deleteCompanyStart,
  deleteCompanySuccess,
  deleteCompanyFailure,
  fetchStoresStart,
  fetchStoresSuccess,
  fetchStoresFailure
} = logisticsSlice.actions;

// 选择器
export const selectVehicles = (state: RootState) => state.logistics.vehicles;
export const selectDrivers = (state: RootState) => state.logistics.drivers;
export const selectCompanies = (state: RootState) => state.logistics.companies;
export const selectStores = (state: RootState) => state.logistics.stores;
export const selectLoading = (state: RootState) => state.logistics.loading;
export const selectError = (state: RootState) => state.logistics.error;

export default logisticsSlice.reducer;