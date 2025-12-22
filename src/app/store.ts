import { configureStore } from '@reduxjs/toolkit'

// 导入各个slice
import customerReducer from '../features/customers/customerSlice'
import equipmentReducer from '../features/equipment/equipmentslice'
import authReducer from '../features/user/authSlice'
import logisticsReducer from '../features/logistics/logisticsSlice'
import storesReducer from '../features/stores/storesSlice'
import ordersReducer from '../features/orders/ordersSlice'
import invoicesReducer from '../features/orders/invoicesSlice'
import templatesReducer from '../features/templates/templatesSlice'
import billingsReducer from '../features/billings/billingsSlice'
import companiesReducer from '../features/companies/companiesSlice'
import usersReducer from '../features/users/usersSlice'
import partsReducer from '../features/parts/partsSlice'
import repairsReducer from '../features/repairs/repairsSlice'
import financeReducer from '../features/finance/financeSlice'
import policiesReducer from '../features/policies/policiesSlice'
import employeesReducer from '../features/employees/employeesSlice'
import subleaseReducer from '../features/sublease/subleaseSlice'
import remindersReducer from '../features/reminders/remindersSlice'
import dashboardReducer from '../features/dashboard/dashboardSlice'
import purchasesReducer from '../features/purchases/purchasesSlice'
import workflowsReducer from '../features/workflows/workflowsSlice'

// 创建store配置
export const store = configureStore({
  reducer: {
    customers: customerReducer,
    equipment: equipmentReducer,
    logistics: logisticsReducer,
    stores: storesReducer,
    orders: ordersReducer,
    invoices: invoicesReducer,
    templates: templatesReducer,
    billings: billingsReducer,
    companies: companiesReducer,
    users: usersReducer,
    parts: partsReducer,
    repairs: repairsReducer,
    finance: financeReducer,
    policies: policiesReducer,
    employees: employeesReducer,
    sublease: subleaseReducer,
    reminders: remindersReducer,
    dashboard: dashboardReducer,
    purchases: purchasesReducer,
    workflows: workflowsReducer,
    app: (state = {}) => state,
    auth: authReducer
  },
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {customers: CustomersState, app: object}
export type AppDispatch = typeof store.dispatch