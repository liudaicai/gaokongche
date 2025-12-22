import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';
import type { Employee, EmployeesState, CreateEmployeeData, UpdateEmployeeData } from './types';

// 初始状态
const initialState: EmployeesState = {
  employees: [],
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pageSize: 10
};

// 获取员工列表
export const fetchEmployees = createAsyncThunk(
  'employees/fetchEmployees',
  async (params: { page?: number; pageSize?: number; search?: string; status?: string } = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', String(params.page));
    if (params.pageSize) queryParams.append('pageSize', String(params.pageSize));
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    
    const response = await apiGet<{ data: Employee[]; pagination: { page: number; pageSize: number; total: number } }>(`/employees?${queryParams.toString()}`);
    return response;
  }
);

// 获取单个员工详情
export const fetchEmployee = createAsyncThunk(
  'employees/fetchEmployee',
  async (id: string) => {
    const response = await apiGet<Employee>(`/employees/${id}`);
    return response;
  }
);

// 添加员工
export const addEmployee = createAsyncThunk(
  'employees/addEmployee',
  async (employeeData: CreateEmployeeData) => {
    const { confirmPassword, ...data } = employeeData;
    const response = await apiPost<{ id: string; userId: string }>('/employees', data);
    return response;
  }
);

// 更新员工
export const updateEmployee = createAsyncThunk(
  'employees/updateEmployee',
  async (employeeData: UpdateEmployeeData) => {
    const { id, ...data } = employeeData;
    await apiPut(`/employees/${id}`, data);
    return employeeData;
  }
);

// 删除员工
export const deleteEmployee = createAsyncThunk(
  'employees/deleteEmployee',
  async (id: string) => {
    await apiDelete(`/employees/${id}`);
    return id;
  }
);

// 创建slice
const employeesSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
    setPageSize: (state, action: PayloadAction<number>) => {
      state.pageSize = action.payload;
    }
  },
  extraReducers: (builder) => {
    // 获取员工列表
    builder
      .addCase(fetchEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.employees = action.payload.data;
        state.total = action.payload.pagination.total;
        state.page = action.payload.pagination.page;
        state.pageSize = action.payload.pagination.pageSize;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取员工列表失败';
      });
    
    // 获取单个员工
    builder
      .addCase(fetchEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployee.fulfilled, (state, action) => {
        state.loading = false;
        // 更新员工列表中的数据
        const index = state.employees.findIndex(emp => emp.id === action.payload.id);
        if (index !== -1) {
          state.employees[index] = action.payload;
        }
      })
      .addCase(fetchEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取员工信息失败';
      });
    
    // 添加员工
    builder
      .addCase(addEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addEmployee.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '添加员工失败';
      });
    
    // 更新员工
    builder
      .addCase(updateEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateEmployee.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '更新员工失败';
      });
    
    // 删除员工
    builder
      .addCase(deleteEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.employees = state.employees.filter(emp => emp.id !== action.payload);
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(deleteEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '删除员工失败';
      });
  }
});

// 导出actions
export const { clearError, setPage, setPageSize } = employeesSlice.actions;

// 导出selectors
export const selectEmployees = (state: { employees: EmployeesState }) => state.employees.employees;
export const selectEmployeesLoading = (state: { employees: EmployeesState }) => state.employees.loading;
export const selectEmployeesError = (state: { employees: EmployeesState }) => state.employees.error;
export const selectEmployeesTotal = (state: { employees: EmployeesState }) => state.employees.total;
export const selectEmployeesPage = (state: { employees: EmployeesState }) => state.employees.page;
export const selectEmployeesPageSize = (state: { employees: EmployeesState }) => state.employees.pageSize;

export default employeesSlice.reducer;

