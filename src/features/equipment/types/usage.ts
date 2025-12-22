/**
 * 设备使用率分析相关类型定义
 */

// 设备使用率统计
export interface EquipmentUsageStatistics {
  month: string;
  totalDays: number;
  rentalDays: number;
  idleDays: number;
  maintenanceDays: number;
  utilizationRate: number;
  availabilityRate: number;
  rentalIncome: number;
  maintenanceCost: number;
  partsCost: number;
  netProfit: number;
  rentalCount: number;
  customerCount: number;
  averageRentalDays: number;
}

// 使用率汇总
export interface UsageSummary {
  avgUtilizationRate: number;
  avgAvailabilityRate: number;
  totalIncome: number;
  totalProfit: number;
  totalRentalDays: number;
  totalIdleDays: number;
  totalMaintenanceDays: number;
  totalRentalCount: number;
  totalCustomerCount: number;
}

// 设备使用率响应
export interface EquipmentUsageResponse {
  equipment: any;
  statistics: EquipmentUsageStatistics[];
  summary: UsageSummary;
}

// 设备使用率排行
export interface EquipmentUsageRanking {
  equipmentId: number;
  equipmentCode: string;
  brand: string;
  model: string;
  status: string;
  month: string;
  utilizationRate: number;
  availabilityRate: number;
  rentalIncome: number;
  netProfit: number;
  rentalDays: number;
  idleDays: number;
  maintenanceDays: number;
  rentalCount: number;
}

