// 用户管理类型定义

export interface UserFormData {
  username: string;
  password?: string;
  role: 'superadmin' | 'admin' | 'user';
  name?: string;
  email?: string;
  phone?: string;
  company_id?: number;
  is_active?: boolean;
  is_locked?: boolean;
}

export interface UserDetail extends UserFormData {
  id: string;
  company_name?: string;
  created_at?: string;
  updated_at?: string;
}
