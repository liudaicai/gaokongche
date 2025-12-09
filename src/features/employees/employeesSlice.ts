import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Employee, EmployeesState } from './types';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';

// 初始状态
const initialState: EmployeesState = {
  employees: [],
  loading: false,
  error: null
};

// 使用真实API：获取员工列表
export const fetchEmployees = createAsyncThunk(
  'employees/fetchEmployees',
  async () => {
    const list = await apiGet<Employee[]>('/employees');
    return Array.isArray(list) ? list : [];
  }
);

// 使用真实API：添加员工
export const addEmployee = createAsyncThunk(
  'employees/addEmployee',
  async (employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const resp = await apiPost<{ id: string }>('/employees', {
      username: employeeData.username,
      name: employeeData.name,
      phone: employeeData.phone,
      idCardNumber: employeeData.idCardNumber,
      position: employeeData.position,
      region: employeeData.region,
      directLeader: employeeData.directLeader,
      password: (employeeData as any).password,
    });
    const newEmployee: Employee = {
      ...employeeData,
      id: String(resp.id),
      createdAt: now,
      updatedAt: now,
    } as Employee;
    return newEmployee;
  }
);

// 使用真实API：更新员工
export const updateEmployee = createAsyncThunk(
  'employees/updateEmployee',
  async (employeeData: Employee) => {
    const now = new Date().toISOString();
    await apiPut(`/employees/${employeeData.id}`, {
      username: employeeData.username,
      name: employeeData.name,
      phone: employeeData.phone,
      idCardNumber: employeeData.idCardNumber,
      position: employeeData.position,
      region: employeeData.region,
      directLeader: employeeData.directLeader,
    });
    const updatedEmployee: Employee = {
      ...employeeData,
      updatedAt: now,
    };
    return updatedEmployee;
  }
);

// 使用真实API：删除员工
export const deleteEmployee = createAsyncThunk(
  'employees/deleteEmployee',
  async (employeeId: string) => {
    await apiDelete(`/employees/${employeeId}`);
    return employeeId;
  }
);

// 创建slice
const employeesSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // 获取员工列表
    builder
      .addCase(fetchEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action: PayloadAction<Employee[]>) => {
        state.loading = false;
        state.employees = action.payload;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取员工列表失败';
      })
      
    // 添加员工
      .addCase(addEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addEmployee.fulfilled, (state, action: PayloadAction<Employee>) => {
        state.loading = false;
        state.employees.push(action.payload);
      })
      .addCase(addEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '添加员工失败';
      })
      
    // 更新员工
      .addCase(updateEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateEmployee.fulfilled, (state, action: PayloadAction<Employee>) => {
        state.loading = false;
        const index = state.employees.findIndex(emp => emp.id === action.payload.id);
        if (index !== -1) {
          state.employees[index] = action.payload;
        }
      })
      .addCase(updateEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '更新员工失败';
      })
      
    // 删除员工
      .addCase(deleteEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteEmployee.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.employees = state.employees.filter(emp => emp.id !== action.payload);
      })
      .addCase(deleteEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '删除员工失败';
      });
  }
});

// 选择器导出（保持现有页面引用不变）
export const selectEmployees = (state: { employees: EmployeesState }) => state.employees.employees;
export const selectEmployeesLoading = (state: { employees: EmployeesState }) => state.employees.loading;
export const selectEmployeesError = (state: { employees: EmployeesState }) => state.employees.error;

export default employeesSlice.reducer;