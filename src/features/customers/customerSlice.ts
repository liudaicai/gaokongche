import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';

// 联系人接口
export interface Contact {
  id: string;
  name: string;
  phone: string;
  position: string;
  attachments?: string[];
}

// 客户基础接口
export interface BaseCustomer {
  id: string;
  region: string;
  businessManager: string;
  // 新增关联字段（可选，兼容旧结构）
  regionStoreId?: string;
  regionStoreName?: string;
  businessManagerId?: string;
  businessManagerName?: string;
  type: 'personal' | 'enterprise';
  createdAt: string;
  updatedAt: string;
  // 财务信息
  equipmentCount: number;
  contractAmount: number;
  outstandingAmount: number;
  receivedAmount: number;
}

// 个人客户接口
export interface PersonalCustomer extends BaseCustomer {
  type: 'personal';
  name: string;
  phone: string;
  idCardNumber?: string;
  attachments?: string[];
}

// 企业客户接口
export interface EnterpriseCustomer extends BaseCustomer {
  type: 'enterprise';
  companyName: string;
  creditCode: string;
  address: string;
  contacts: Contact[];
  attachments?: string[];
}

// 客户联合类型
export type Customer = PersonalCustomer | EnterpriseCustomer;

// 状态接口
interface CustomersState {
  customers: Customer[];
  loading: boolean;
  error: string | null;
}

// 初始状态
const initialState: CustomersState = {
  customers: [],
  loading: false,
  error: null
};

// 创建客户slice
export const customerSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    // 获取客户列表
    fetchCustomersStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchCustomersSuccess(state, action: PayloadAction<Customer[]>) {
      state.loading = false;
      state.customers = action.payload;
    },
    fetchCustomersFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    // 添加客户
    addCustomerStart(state) {
      state.loading = true;
      state.error = null;
    },
    addCustomerSuccess(state, action: PayloadAction<Customer>) {
      state.loading = false;
      state.customers.push(action.payload);
    },
    addCustomerFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    // 更新客户
    updateCustomerStart(state) {
      state.loading = true;
      state.error = null;
    },
    updateCustomerSuccess(state, action: PayloadAction<Customer>) {
      state.loading = false;
      const index = state.customers.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.customers[index] = action.payload;
      }
    },
    updateCustomerFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    // 删除客户
    deleteCustomerStart(state) {
      state.loading = true;
      state.error = null;
    },
    deleteCustomerSuccess(state, action: PayloadAction<string>) {
      state.loading = false;
      state.customers = state.customers.filter(c => c.id !== action.payload);
    },
    deleteCustomerFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    }
  }
});

// 导出actions
export const { 
  fetchCustomersStart, 
  fetchCustomersSuccess, 
  fetchCustomersFailure,
  addCustomerStart, 
  addCustomerSuccess, 
  addCustomerFailure,
  updateCustomerStart, 
  updateCustomerSuccess, 
  updateCustomerFailure,
  deleteCustomerStart, 
  deleteCustomerSuccess, 
  deleteCustomerFailure
} = customerSlice.actions;

// 后端DTO类型（与 /api/customers 返回结构匹配）
type CustomerDTO = {
  id: number;
  type: 'personal' | 'enterprise';
  name: string;
  creditCode?: string | null;
  taxNumber?: string | null;
  address?: string | null;
  region?: string;
  businessManager?: string;
  // 新增关联字段
  regionStoreId?: string;
  regionStoreName?: string;
  businessManagerId?: string;
  businessManagerName?: string;
  phone?: string;
  idCardNumber?: string;
  equipmentCount?: number;
  contractAmount?: number;
  outstandingAmount?: number;
  receivedAmount?: number;
  contacts?: any[];
  attachments?: any[];
  createdAt?: string;
  updatedAt?: string;
};

const mapDtoToCustomer = (dto: CustomerDTO): Customer => {
  const base = {
    id: String(dto.id),
    region: dto.region || '',
    businessManager: dto.businessManager || '',
    // 映射新增关联字段
    regionStoreId: dto.regionStoreId || undefined,
    regionStoreName: dto.regionStoreName || (dto.region || ''),
    businessManagerId: dto.businessManagerId || undefined,
    businessManagerName: dto.businessManagerName || (dto.businessManager || ''),
    type: dto.type,
    createdAt: dto.createdAt || new Date().toISOString(),
    updatedAt: dto.updatedAt || new Date().toISOString(),
    equipmentCount: dto.equipmentCount ?? 0,
    contractAmount: dto.contractAmount ?? 0,
    outstandingAmount: dto.outstandingAmount ?? 0,
    receivedAmount: dto.receivedAmount ?? 0,
  } as BaseCustomer;

  if (dto.type === 'personal') {
    return {
      ...base,
      type: 'personal',
      name: dto.name,
      phone: dto.phone || '',
      idCardNumber: dto.idCardNumber || '',
      attachments: dto.attachments || [],
    } as PersonalCustomer;
  }

  return {
    ...base,
    type: 'enterprise',
    companyName: dto.name,
    creditCode: dto.creditCode || '',
    address: dto.address || '',
    contacts: (dto.contacts || []).map((c, idx) => ({
      id: String((c && c.id) || `c_${dto.id}_${idx}`),
      name: c?.name || '',
      phone: c?.phone || '',
      position: c?.position || '',
      attachments: c?.attachments || [],
    })),
    attachments: dto.attachments || [],
  } as EnterpriseCustomer;
};

// Thunks：调用后端API
export const fetchCustomers = () => async (dispatch: any) => {
  dispatch(fetchCustomersStart());
  try {
    const response = await apiGet<{ data: CustomerDTO[]; pagination?: any }>('/customers?page=1&pageSize=1000');
    const list = Array.isArray(response) ? response : (response.data || []);
    dispatch(fetchCustomersSuccess(list.map(mapDtoToCustomer)));
  } catch (err: any) {
    dispatch(fetchCustomersFailure(err?.message || '获取客户列表失败'));
  }
};

export const addCustomer = (customer: Customer) => async (dispatch: any) => {
  dispatch(addCustomerStart());
  try {
    // 映射到后端字段（兼容旧字段 + 新关联）
    const payload: any = {
      type: customer.type,
      name:
        customer.type === 'enterprise'
          ? (customer as EnterpriseCustomer).companyName
          : (customer as PersonalCustomer).name,
      creditCode: customer.type === 'enterprise' ? (customer as EnterpriseCustomer).creditCode : undefined,
      address: customer.type === 'enterprise' ? (customer as EnterpriseCustomer).address : undefined,
      contacts: customer.type === 'enterprise' ? (customer as EnterpriseCustomer).contacts : [],
      phone: customer.type === 'personal' ? (customer as PersonalCustomer).phone : undefined,
      idCardNumber: customer.type === 'personal' ? (customer as PersonalCustomer).idCardNumber : undefined,
      // 旧字段：保留名称字符串
      region: (customer as any).region || (customer as any).regionStoreName || '',
      businessManager: (customer as any).businessManager || (customer as any).businessManagerName || '',
      // 新增关联字段：id + name
      regionStoreId: (customer as any).regionStoreId,
      regionStoreName: (customer as any).regionStoreName,
      businessManagerId: (customer as any).businessManagerId,
      businessManagerName: (customer as any).businessManagerName,
      attachments: (customer as any).attachments || [],
      equipmentCount: (customer as any).equipmentCount ?? 0,
      contractAmount: (customer as any).contractAmount ?? 0,
      outstandingAmount: (customer as any).outstandingAmount ?? 0,
      receivedAmount: (customer as any).receivedAmount ?? 0,
    };
    const resp = await apiPost<{ id: number }>('/customers', payload);
    
    // 创建成功后，重新获取该客户的数据以确保数据完整性
    const createdCustomer = await apiGet<CustomerDTO>(`/customers/${resp.id}`);
    const mappedCustomer = mapDtoToCustomer(createdCustomer);
    
    dispatch(addCustomerSuccess(mappedCustomer));
    return mappedCustomer;
  } catch (err: any) {
    dispatch(addCustomerFailure(err?.message || '添加客户失败'));
  }
};

export const updateCustomer = (customer: Customer) => async (dispatch: any) => {
  dispatch(updateCustomerStart());
  try {
    const id = String((customer as any).id);
    const payload: any = {
      type: customer.type,
      name:
        customer.type === 'enterprise'
          ? (customer as EnterpriseCustomer).companyName
          : (customer as PersonalCustomer).name,
      creditCode: customer.type === 'enterprise' ? (customer as EnterpriseCustomer).creditCode : undefined,
      address: customer.type === 'enterprise' ? (customer as EnterpriseCustomer).address : undefined,
      contacts: customer.type === 'enterprise' ? (customer as EnterpriseCustomer).contacts : [],
      phone: customer.type === 'personal' ? (customer as PersonalCustomer).phone : undefined,
      idCardNumber: customer.type === 'personal' ? (customer as PersonalCustomer).idCardNumber : undefined,
      // 旧字段：保留名称字符串
      region: (customer as any).region || (customer as any).regionStoreName || '',
      businessManager: (customer as any).businessManager || (customer as any).businessManagerName || '',
      // 新增关联字段：id + name
      regionStoreId: (customer as any).regionStoreId,
      regionStoreName: (customer as any).regionStoreName,
      businessManagerId: (customer as any).businessManagerId,
      businessManagerName: (customer as any).businessManagerName,
      attachments: (customer as any).attachments || [],
      equipmentCount: (customer as any).equipmentCount ?? 0,
      contractAmount: (customer as any).contractAmount ?? 0,
      outstandingAmount: (customer as any).outstandingAmount ?? 0,
      receivedAmount: (customer as any).receivedAmount ?? 0,
    };
    await apiPut(`/customers/${id}`, payload);
    
    // 更新成功后，重新获取该客户的数据以确保数据完整性
    const updatedCustomer = await apiGet<CustomerDTO>(`/customers/${id}`);
    const mappedCustomer = mapDtoToCustomer(updatedCustomer);
    
    dispatch(updateCustomerSuccess(mappedCustomer));
  } catch (err: any) {
    dispatch(updateCustomerFailure(err?.message || '更新客户失败'));
  }
};

export const deleteCustomer = (id: string) => async (dispatch: any) => {
  dispatch(deleteCustomerStart());
  try {
    await apiDelete(`/customers/${id}`);
    dispatch(deleteCustomerSuccess(id));
  } catch (err: any) {
    dispatch(deleteCustomerFailure(err?.message || '删除客户失败'));
  }
};

export default customerSlice.reducer;