// 公司/租户类型定义

export interface Company {
  id: number;
  name: string;
  code: string;
  contactPerson?: string;
  contactPhone?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyFormData {
  name: string;
  code: string;
  contactPerson?: string;
  contactPhone?: string;
  address?: string;
  isActive?: boolean;
  // 创建公司时可选创建管理员
  adminUsername?: string;
  adminPassword?: string;
}

export interface CompanyStats {
  userCount: number;
  customerCount: number;
  equipmentCount: number;
  orderCount: number;
}
