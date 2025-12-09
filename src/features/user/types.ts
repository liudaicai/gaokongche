// 登录表单数据类型
export interface LoginFormData {
  username: string;
  password: string;
}

// 用户信息类型
export interface User {
  id: string;
  username: string;
  role: string;
  // 可选权限字段，避免其他模块引用时出现属性不存在报错
  permissions?: string[];
}