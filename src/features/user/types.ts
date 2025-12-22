// 登录表单数据类型
export interface LoginFormData {
  username: string;
  password: string;
}

// 登录凭证类型（别名）
export type LoginCredentials = LoginFormData;

// 用户信息类型
export interface User {
  id: string;
  username: string;
  role: string;
  name?: string;
  email?: string;
  phone?: string;
  company_id?: number; // 所属公司ID
  companyName?: string; // 公司名称
  // 可选权限字段，避免其他模块引用时出现属性不存在报错
  permissions?: string[];
}