/**
 * 配件更换记录相关类型定义
 */

// 配件类别
export interface PartCategory {
  id: number;
  categoryName: string;
  categoryCode: string;
  description?: string;
  typicalPriceRange?: string;
  defaultWarrantyMonths: number;
  isCritical: boolean;
  sortOrder: number;
}

// 旧件信息
export interface OldPartInfo {
  serialNumber?: string;
  usageDays?: number;
  usageHours?: number;
}

// 财务信息
export interface PartFinancialInfo {
  partCost: number;
  laborCost: number;
  totalCost: number;
}

// 保修信息
export interface PartWarrantyInfo {
  months: number;
  startDate: string;
  endDate: string;
  status: '在保' | '已过保' | '即将过保';
  daysUntilExpires: number;
}

// 供应商信息
export interface PartSupplierInfo {
  name?: string;
  contact?: string;
  purchaseOrderNo?: string;
}

// 技师信息
export interface TechnicianInfo {
  name?: string;
  workHours?: number;
}

// 配件更换记录
export interface PartReplacementRecord {
  id: number;
  equipmentId: number;
  equipmentCode?: string;
  equipmentBrand?: string;
  equipmentModel?: string;
  partCategory: {
    id: number;
    name: string;
    code: string;
    description?: string;
  };
  partName: string;
  partModel?: string;
  partBrand?: string;
  partSerialNumber?: string;
  replacementDate: string;
  replacementReason: '故障' | '损坏' | '老化' | '升级' | '保养' | '其他';
  failureDescription?: string;
  oldPart?: OldPartInfo;
  financial: PartFinancialInfo;
  warranty?: PartWarrantyInfo;
  supplier?: PartSupplierInfo;
  technician?: TechnicianInfo;
  orderId?: number;
  invoiceFile?: string;
  photoFiles?: string[];
  notes?: string;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

// 创建配件更换记录的表单数据
export interface PartReplacementFormData {
  equipmentId: number;
  partCategoryId: number;
  partName: string;
  partModel?: string;
  partBrand?: string;
  partSerialNumber?: string;
  replacementDate: string;
  replacementReason?: '故障' | '损坏' | '老化' | '升级' | '保养' | '其他';
  failureDescription?: string;
  oldPartSerialNumber?: string;
  oldPartUsageDays?: number;
  oldPartUsageHours?: number;
  partCost: number;
  laborCost?: number;
  warrantyMonths?: number;
  warrantyStartDate?: string;
  supplierName?: string;
  supplierContact?: string;
  purchaseOrderNo?: string;
  technicianName?: string;
  workHours?: number;
  orderId?: number;
  invoiceFile?: string;
  photoFiles?: string[];
  notes?: string;
}

// 配件更换汇总
export interface PartReplacementSummary {
  equipmentId: number;
  equipmentCode?: string;
  brand?: string;
  model?: string;
  totalReplacements: number;
  replacedPartTypes: number;
  totalReplacementCost: number;
  lastReplacementDate?: string;
  partsUnderWarranty: number;
  partsExpiringSoon: number;
  partsOutOfWarranty: number;
}

// 保修提醒
export interface WarrantyAlert {
  replacementId: number;
  partName: string;
  partModel?: string;
  partSerialNumber?: string;
  replacementDate: string;
  warrantyEndDate: string;
  warrantyStatus: '在保' | '已过保' | '即将过保';
  daysRemaining: number;
  alertLevel: 'expired' | 'urgent' | 'warning' | 'normal';
  equipment: {
    id: number;
    code: string;
    brand: string;
    model: string;
  };
  category: {
    name: string;
    code: string;
  };
}

