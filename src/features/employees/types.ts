// 员工类型定义
export interface Employee {
  id: string;
  username: string; // 登录账号
  name: string; // 姓名
  phone: string; // 手机号
  idCardNumber: string; // 身份证号码
  position: string; // 职务
  region: string; // 所属区域
  directLeader: string; // 直属领导
  password?: string; // 密码（只在创建和修改时使用）
  createdAt: string;
  updatedAt: string;
}

// 新增员工表单数据
export interface AddEmployeeFormData {
  region: string;
  username: string;
  position: string;
  directLeader: string;
  name: string;
  phone: string;
  idCardNumber: string;
  password: string;
  confirmPassword: string;
}

// 员工状态类型
export interface EmployeesState {
  employees: Employee[];
  loading: boolean;
  error: string | null;
}