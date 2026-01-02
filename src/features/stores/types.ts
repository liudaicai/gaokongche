// 门店接口
export interface Store {
  id: string;
  name: string;
  address: string;
  managerId: string; // 负责人ID（关联员工）
  managerName: string; // 负责人姓名
  managerPhone: string; // 负责人电话
  createdAt: string;
  updatedAt: string;
}

// 公司认证接口（租户管理用，仅超管）
export interface CompanyVerification {
  id: string;
  companyName: string;
  companyAddress: string;
  creditCode: string; // 企业信用代码
  bankAccount: string; // 账号
  bankName: string; // 开户行
  createdAt: string;
  updatedAt: string;
}

// 租户公司主体接口（业务用，所有租户）
export interface TenantCompany {
  id: string;
  companyId?: string; // 所属租户ID
  companyName: string;
  companyAddress?: string;
  creditCode: string; // 统一社会信用代码
  bankAccount?: string;
  bankName?: string;
  legalPerson?: string; // 法人代表
  contactName?: string; // 联系人
  contactPhone?: string; // 联系电话
  isDefault?: boolean; // 是否默认
  status?: 'active' | 'inactive'; // 状态
  remark?: string; // 备注
  createdAt?: string;
  updatedAt?: string;
}

// 门店管理状态接口
export interface StoresState {
  stores: Store[];
  companyVerifications: CompanyVerification[]; // 租户列表（仅超管）
  tenantCompanies: TenantCompany[]; // 公司主体（所有租户）
  loading: boolean;
  error: string | null;
}