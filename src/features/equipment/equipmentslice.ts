import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';

// 设备类型定义
export interface Equipment {
  id: string;
  code: string; // 出厂编号
  customCode: string; // 自编码
  type: string; // 类型
  height: number; // 高度
  model: string; // 型号
  brand: string; // 品牌
  source: 'sublease' | 'self-owned'; // 设备来源：转租、自有
  rentalStatus: 'renting' | 'waiting' | 'repairing'; // 租赁状态：在租、待租、维修
  contractName?: string; // 合同名称
  orderId?: string; // 关联的订单ID（当设备在租时）
  customerName?: string; // 客户名称（当设备在租时，从订单获取）
  projectName?: string; // 项目名称（当设备在租时，从订单获取）
  contractNumber?: string; // 合同编号（当设备在租时，从订单获取）
  insuranceStatus: 'insured' | 'uninsured' | 'expiring'; // 保险状态：在保、脱保、即将到期
  warehouse: string; // 所在仓库
  // 保单信息
  policyNumber?: string; // 保单号
  policyCompany?: string; // 投保公司
  policyEndDate?: string; // 保单到期日
  daysToExpire?: number; // 剩余天数
  // 新增字段（可选），用于更完整的设备信息
  category?: string; // 设备类别（如 高空车、叉车、吊车）
  storeId?: string; // 所属门店ID
  storeName?: string; // 所属门店名称
  purchaseDate?: string; // 采购日期（YYYY-MM-DD）
  factoryDate?: string; // 出厂日期（YYYY-MM-DD）
  purchasePrice?: number; // 采购价格（元），用于资产利用率计算
  attachments?: Array<{id: string; name: string; url: string; size?: number; type?: string}>; // 附件
  createdAt: string;
  updatedAt: string;
}

// 设备库存统计类型
export interface EquipmentInventory {
  type: string;
  height: number;
  area: string;
  waitingCount: number; // 待租数量
  rentingCount: number; // 在租数量
  repairingCount: number; // 维修数量
  totalCount: number; // 合计
}

// 调拨单类型
export interface TransferOrder {
  id: string;
  orderNumber: string; // 单号
  applicant: string; // 申请人
  sourceWarehouse: string; // 调出仓库
  targetWarehouse: string; // 调入仓库
  useLogistics: boolean; // 是否物流
  // 物流类型（调拨单专用）：退场物流 / 我方物流 / 第三方物流
  logisticsType?: '退场物流' | '我方物流' | '第三方物流';
  logisticsCompany?: string; // 物流公司
  logisticsCost?: number; // 物流费用
  logisticsContact?: string; // 物流联系人
  logisticsPhone?: string; // 物流电话
  // 物流明细字段（与进退场一致）
  vehicleId?: string; // 我方物流：车辆ID
  driverId?: string; // 我方物流：司机ID
  companyId?: string; // 第三方物流：公司ID
  companyContactName?: string; // 第三方物流：联系人
  companyContactPhone?: string; // 第三方物流：电话
  reason: string; // 调拨原因
  equipmentIds: string[]; // 设备ID列表
  status: 'pending' | 'approved' | 'completed'; // 状态：待审批、已审批、已完成
  createdAt: string;
  updatedAt: string;
}

// 配件类型
export interface Accessory {
  id: string;
  materialNumber: string; // 物料号
  modelSpec: string; // 型号规格
  totalQuantity: number; // 总量
  usedQuantity: number; // 领用量
  availableQuantity: number; // 可用数量
  name: string; // 名称
  applicableScope: string; // 适用范围
  warehouse: string; // 所在仓库
  category: string; // 类别
  area: string; // 区域
  createdAt: string;
  updatedAt: string;
}

// 配件出入库记录类型
export interface AccessoryTransaction {
  id: string;
  accessoryId: string;
  type: 'in' | 'out'; // 类型：入库、领用
  quantity: number;
  reason?: string;
  operator: string;
  createdAt: string;
}

// 状态接口
export interface EquipmentState {
  equipmentList: Equipment[];
  inventoryList: EquipmentInventory[];
  transferOrders: TransferOrder[];
  accessories: Accessory[];
  accessoryTransactions: AccessoryTransaction[];
  loading: boolean;
  error: string | null;
}

// 初始状态
const initialState: EquipmentState = {
  equipmentList: [],
  inventoryList: [],
  transferOrders: [],
  accessories: [],
  accessoryTransactions: [],
  loading: false,
  error: null
};

// 创建slice
const equipmentSlice = createSlice({
  name: 'equipment',
  initialState,
  reducers: {
    // 设备管理相关reducers
    fetchEquipmentsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchEquipmentsSuccess: (state, action: PayloadAction<Equipment[]>) => {
      state.loading = false;
      // 防御：确保赋值为数组，避免运行时非数组导致组件内 filter/map 报错
      state.equipmentList = Array.isArray(action.payload) ? action.payload : [];
    },
    fetchEquipmentsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    addEquipmentSuccess: (state, action: PayloadAction<Equipment>) => {
      state.equipmentList.push(action.payload);
    },
    updateEquipmentSuccess: (state, action: PayloadAction<Equipment>) => {
      const index = state.equipmentList.findIndex(equip => equip.id === action.payload.id);
      if (index !== -1) {
        state.equipmentList[index] = action.payload;
      }
    },
    deleteEquipmentSuccess: (state, action: PayloadAction<string>) => {
      state.equipmentList = state.equipmentList.filter(equip => equip.id !== action.payload);
    },

    // 库存管理相关reducers
    fetchInventoryStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchInventorySuccess: (state, action: PayloadAction<EquipmentInventory[]>) => {
      state.loading = false;
      state.inventoryList = action.payload;
    },
    fetchInventoryFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    // 调拨管理相关reducers
    fetchTransferOrdersStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchTransferOrdersSuccess: (state, action: PayloadAction<TransferOrder[]>) => {
      state.loading = false;
      state.transferOrders = action.payload;
    },
    fetchTransferOrdersFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    addTransferOrderSuccess: (state, action: PayloadAction<TransferOrder>) => {
      state.transferOrders.push(action.payload);
    },
    updateTransferOrderSuccess: (state, action: PayloadAction<TransferOrder>) => {
      const index = state.transferOrders.findIndex(order => order.id === action.payload.id);
      if (index !== -1) {
        state.transferOrders[index] = action.payload;
      }
    },

    // 配件管理相关reducers
    fetchAccessoriesStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchAccessoriesSuccess: (state, action: PayloadAction<Accessory[]>) => {
      state.loading = false;
      state.accessories = action.payload;
    },
    fetchAccessoriesFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    addAccessorySuccess: (state, action: PayloadAction<Accessory>) => {
      state.accessories.push(action.payload);
    },
    updateAccessorySuccess: (state, action: PayloadAction<Accessory>) => {
      const index = state.accessories.findIndex(acc => acc.id === action.payload.id);
      if (index !== -1) {
        state.accessories[index] = action.payload;
      }
    },
    addAccessoryTransactionSuccess: (state, action: PayloadAction<AccessoryTransaction>) => {
      state.accessoryTransactions.push(action.payload);
    }
  }
});

// Action creators
export const {
  fetchEquipmentsStart,
  fetchEquipmentsSuccess,
  fetchEquipmentsFailure,
  addEquipmentSuccess,
  updateEquipmentSuccess,
  deleteEquipmentSuccess,
  fetchInventoryStart,
  fetchInventorySuccess,
  fetchInventoryFailure,
  fetchTransferOrdersStart,
  fetchTransferOrdersSuccess,
  fetchTransferOrdersFailure,
  addTransferOrderSuccess,
  updateTransferOrderSuccess,
  fetchAccessoriesStart,
  fetchAccessoriesSuccess,
  fetchAccessoriesFailure,
  addAccessorySuccess,
  updateAccessorySuccess,
  addAccessoryTransactionSuccess
} = equipmentSlice.actions;

// Selectors
export const selectEquipmentList = (state: RootState) => state.equipment.equipmentList;
export const selectInventoryList = (state: RootState) => state.equipment.inventoryList;
export const selectTransferOrders = (state: RootState) => state.equipment.transferOrders;
export const selectAccessories = (state: RootState) => state.equipment.accessories;
export const selectLoading = (state: RootState) => state.equipment.loading;
export const selectError = (state: RootState) => state.equipment.error;

export default equipmentSlice.reducer;