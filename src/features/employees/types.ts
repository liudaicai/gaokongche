/**
 * 员工管理类型定义
 */

export interface Employee {
  id: string;
  userId?: string;
  username: string;
  name: string;
  phone: string;
  email?: string;
  idCardNumber?: string;
  position?: string;
  department?: string;
  level?: 'intern' | 'staff' | 'senior' | 'manager' | 'director';
  storeId?: string | null;
  storeName?: string;
  directLeaderId?: string | null;
  directLeaderName?: string;
  hireDate?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  status?: 'active' | 'inactive' | 'resigned';
  resignDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeData {
  username: string;
  name: string;
  phone: string;
  email?: string;
  idCardNumber?: string;
  position?: string;
  department?: string;
  level?: string;
  storeId?: string;
  directLeaderId?: string;
  directLeaderName?: string;
  password: string;
  confirmPassword?: string;
  hireDate?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  status?: string;
  notes?: string;
}

export interface UpdateEmployeeData {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  idCardNumber?: string;
  position?: string;
  department?: string;
  level?: string;
  storeId?: string;
  directLeaderId?: string;
  directLeaderName?: string;
  hireDate?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  status?: string;
  resignDate?: string;
  notes?: string;
}

export interface EmployeesState {
  employees: Employee[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  pageSize: number;
}

