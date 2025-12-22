// Dashboard数据类型定义

export interface DashboardKPI {
  equipment: {
    total: number;
    available: number;
    renting: number;
    maintenance: number;
  };
  customers: {
    total: number;
  };
  orders: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  revenue: {
    currentMonth: number;  // 本月创收金额（合同额）
    lastMonth: number;  // 上月创收金额
    currentMonthReceived: number;  // 本月实收金额（已到账）
    lastMonthReceived: number;  // 上月实收金额
  };
}

export interface TrendData {
  date: string;
  count: number;
  revenue: number;
}

export interface DashboardTrends {
  orders: TrendData[];
}

export interface DashboardAlert {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  count: number;
  action: string;
}

export interface DashboardActivity {
  id: string;
  type: 'order' | 'entry' | 'exit' | 'repair';
  title: string;
  description: string;
  status: string;
  time: string;
}

export interface EquipmentUtilization {
  type: string;
  total: number;
  renting: number;
  available: number;
  utilizationRate: number;
  totalPurchaseValue: number;         // 总采购额
  rentingPurchaseValue: number;       // 出租中设备的采购额
  availablePurchaseValue: number;     // 未出租设备的采购额
  equipmentWithPrice: number;         // 有价格的设备数量
  equipmentWithoutPrice: number;      // 无价格的设备数量
}

export interface EquipmentInventoryStat {
  type: string;
  height: string | number;
  area: string;
  waitingCount: number;
  rentingCount: number;
  repairingCount: number;
  totalCount: number;
}

export interface PartStat {
  id: number;
  name: string;
  code: string;
  totalQuantity: number;
  minStock: number;
}
