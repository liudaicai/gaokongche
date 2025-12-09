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

// 公司认证接口
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

// 门店管理状态接口
export interface StoresState {
  stores: Store[];
  companyVerifications: CompanyVerification[];
  loading: boolean;
  error: string | null;
}