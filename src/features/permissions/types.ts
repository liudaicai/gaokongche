// 权限管理类型定义

export interface Permission {
  id: number;
  parentId: number | null;
  code: string;
  name: string;
  type: 'module' | 'menu' | 'action' | 'operation';
  path?: string;
  sequence: number;
  icon?: string;
  description?: string;
  status: 'enabled' | 'disabled';
  createdAt: string;
  updatedAt: string;
  children?: Permission[];
}

export interface RolePermission {
  id: number;
  companyId: number;
  roleCode: string;
  roleName: string;
  permissionIds: number[];
  createdBy?: number;
  updatedBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserPermission {
  id: number;
  companyId: number;
  userId: number;
  permissionIds: number[];
  isOverride: boolean;
  createdBy?: number;
  updatedBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EffectivePermission {
  permissionIds: number[];
  source: 'user_override' | 'merged' | 'role';
}
