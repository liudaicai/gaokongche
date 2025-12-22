/**
 * 智能提醒中心 - Redux Slice
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';
import type { RootState } from '../../app/store';
import type {
  ReminderRule,
  ReminderRecord,
  UserReminderSettings,
  ContractRenewalRecord,
  RuleFormData,
  ReminderSearchParams,
  RenewalFormData,
  RuleListResponse,
  RuleDetailResponse,
  ReminderListResponse,
  UnreadCountResponse,
  SettingsResponse,
  RenewalListResponse,
  ApiResponse
} from './types';

// ==================== State类型定义 ====================

interface RemindersState {
  // 规则相关
  rules: ReminderRule[];
  currentRule: ReminderRule | null;
  rulesLoading: boolean;
  rulesPagination: {
    page: number;
    pageSize: number;
    total: number;
  };

  // 提醒记录相关
  reminders: ReminderRecord[];
  currentReminder: ReminderRecord | null;
  remindersLoading: boolean;
  unreadCount: number;
  remindersPagination: {
    page: number;
    pageSize: number;
    total: number;
  };

  // 用户设置
  settings: UserReminderSettings | null;
  settingsLoading: boolean;

  // 续约提醒
  renewalReminders: ContractRenewalRecord[];
  renewalLoading: boolean;

  // 错误状态
  error: string | null;
}

// ==================== 初始状态 ====================

const initialState: RemindersState = {
  rules: [],
  currentRule: null,
  rulesLoading: false,
  rulesPagination: {
    page: 1,
    pageSize: 20,
    total: 0
  },

  reminders: [],
  currentReminder: null,
  remindersLoading: false,
  unreadCount: 0,
  remindersPagination: {
    page: 1,
    pageSize: 20,
    total: 0
  },

  settings: null,
  settingsLoading: false,

  renewalReminders: [],
  renewalLoading: false,

  error: null
};

// ==================== Async Thunks - 提醒规则 ====================

// 获取规则列表
export const fetchReminderRules = createAsyncThunk(
  'reminders/fetchRules',
  async (params: { page?: number; pageSize?: number; ruleType?: string; isEnabled?: boolean }, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', String(params.page));
      if (params.pageSize) queryParams.append('pageSize', String(params.pageSize));
      if (params.ruleType) queryParams.append('ruleType', params.ruleType);
      if (params.isEnabled !== undefined) queryParams.append('isEnabled', String(params.isEnabled));

      const response = await apiGet<RuleListResponse>(`/reminders/rules?${queryParams.toString()}`);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 获取规则详情
export const fetchRuleDetail = createAsyncThunk(
  'reminders/fetchRuleDetail',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await apiGet<RuleDetailResponse>(`/reminders/rules/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 创建规则
export const createReminderRule = createAsyncThunk(
  'reminders/createRule',
  async (data: RuleFormData, { rejectWithValue }) => {
    try {
      const response = await apiPost<ApiResponse>('/reminders/rules', data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 更新规则
export const updateReminderRule = createAsyncThunk(
  'reminders/updateRule',
  async ({ id, data }: { id: number; data: Partial<RuleFormData> }, { rejectWithValue }) => {
    try {
      const response = await apiPut<ApiResponse>(`/reminders/rules/${id}`, data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 删除规则
export const deleteReminderRule = createAsyncThunk(
  'reminders/deleteRule',
  async (id: number, { rejectWithValue }) => {
    try {
      await apiDelete(`/reminders/rules/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 启用/禁用规则
export const toggleReminderRule = createAsyncThunk(
  'reminders/toggleRule',
  async ({ id, isEnabled }: { id: number; isEnabled: boolean }, { rejectWithValue }) => {
    try {
      await apiPut(`/reminders/rules/${id}/toggle`, { isEnabled });
      return { id, isEnabled };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ==================== Async Thunks - 提醒记录 ====================

// 获取提醒列表
export const fetchReminders = createAsyncThunk(
  'reminders/fetchReminders',
  async (params: ReminderSearchParams = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const response = await apiGet<ReminderListResponse>(`/reminders?${queryParams.toString()}`);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 获取未读数量
export const fetchUnreadCount = createAsyncThunk(
  'reminders/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      // apiGet 已自动提取 data，response 就是 { count: number }
      const response: any = await apiGet('/reminders/unread-count');
      return response.count;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 获取提醒详情
export const fetchReminderDetail = createAsyncThunk(
  'reminders/fetchReminderDetail',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await apiGet<{ ok: boolean; data: ReminderRecord }>(`/reminders/${id}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 标记为已读
export const markAsRead = createAsyncThunk(
  'reminders/markAsRead',
  async (id: number, { rejectWithValue }) => {
    try {
      await apiPut(`/reminders/${id}/read`, {});
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 标记为已处理
export const markAsHandled = createAsyncThunk(
  'reminders/markAsHandled',
  async ({ id, note }: { id: number; note?: string }, { rejectWithValue }) => {
    try {
      await apiPut(`/reminders/${id}/handle`, { note });
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 批量标记已读
export const batchMarkAsRead = createAsyncThunk(
  'reminders/batchMarkAsRead',
  async (ids: number[], { rejectWithValue }) => {
    try {
      await apiPost('/reminders/batch-read', { ids });
      return ids;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 删除提醒
export const deleteReminder = createAsyncThunk(
  'reminders/deleteReminder',
  async (id: number, { rejectWithValue }) => {
    try {
      await apiDelete(`/reminders/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ==================== Async Thunks - 用户设置 ====================

// 获取用户设置
export const fetchUserSettings = createAsyncThunk(
  'reminders/fetchSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiGet<SettingsResponse>('/reminders/settings');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 更新用户设置
export const updateUserSettings = createAsyncThunk(
  'reminders/updateSettings',
  async (data: Partial<UserReminderSettings>, { rejectWithValue }) => {
    try {
      await apiPut('/reminders/settings', data);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ==================== Async Thunks - 合同续约 ====================

// 获取续约提醒列表
export const fetchRenewalReminders = createAsyncThunk(
  'reminders/fetchRenewalReminders',
  async (orderId: number, { rejectWithValue }) => {
    try {
      const response = await apiGet<RenewalListResponse>(`/contracts/${orderId}/renewal-reminders`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 创建续约提醒
export const createRenewalReminder = createAsyncThunk(
  'reminders/createRenewalReminder',
  async ({ orderId, data }: { orderId: number; data: RenewalFormData }, { rejectWithValue }) => {
    try {
      const response = await apiPost<ApiResponse>(`/contracts/${orderId}/renewal-reminder`, data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 更新续约提醒
export const updateRenewalReminder = createAsyncThunk(
  'reminders/updateRenewalReminder',
  async ({ orderId, id, data }: { orderId: number; id: number; data: Partial<RenewalFormData> }, { rejectWithValue }) => {
    try {
      await apiPut(`/contracts/${orderId}/renewal-reminders/${id}`, data);
      return { id, data };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 删除续约提醒
export const deleteRenewalReminder = createAsyncThunk(
  'reminders/deleteRenewalReminder',
  async ({ orderId, id }: { orderId: number; id: number }, { rejectWithValue }) => {
    try {
      await apiDelete(`/contracts/${orderId}/renewal-reminders/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ==================== Slice ====================

const remindersSlice = createSlice({
  name: 'reminders',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentRule: (state) => {
      state.currentRule = null;
    },
    clearCurrentReminder: (state) => {
      state.currentReminder = null;
    },
    setCurrentRule: (state, action: PayloadAction<ReminderRule>) => {
      state.currentRule = action.payload;
    },
    setCurrentReminder: (state, action: PayloadAction<ReminderRecord>) => {
      state.currentReminder = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // ==================== 提醒规则 ====================
      .addCase(fetchReminderRules.pending, (state) => {
        state.rulesLoading = true;
        state.error = null;
      })
      .addCase(fetchReminderRules.fulfilled, (state, action) => {
        state.rulesLoading = false;
        state.rules = action.payload.data;
        state.rulesPagination = action.payload.pagination;
      })
      .addCase(fetchReminderRules.rejected, (state, action) => {
        state.rulesLoading = false;
        state.error = action.payload as string;
      })

      .addCase(fetchRuleDetail.fulfilled, (state, action) => {
        state.currentRule = action.payload;
      })

      .addCase(deleteReminderRule.fulfilled, (state, action) => {
        state.rules = state.rules.filter(rule => rule.id !== action.payload);
      })

      .addCase(toggleReminderRule.fulfilled, (state, action) => {
        const rule = state.rules.find(r => r.id === action.payload.id);
        if (rule) {
          rule.isEnabled = action.payload.isEnabled;
        }
      })

      // ==================== 提醒记录 ====================
      .addCase(fetchReminders.pending, (state) => {
        state.remindersLoading = true;
        state.error = null;
      })
      .addCase(fetchReminders.fulfilled, (state, action) => {
        state.remindersLoading = false;
        state.reminders = action.payload.data;
        state.remindersPagination = action.payload.pagination;
      })
      .addCase(fetchReminders.rejected, (state, action) => {
        state.remindersLoading = false;
        state.error = action.payload as string;
      })

      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })

      .addCase(fetchReminderDetail.fulfilled, (state, action) => {
        state.currentReminder = action.payload;
      })

      .addCase(markAsRead.fulfilled, (state, action) => {
        const reminder = state.reminders.find(r => r.id === action.payload);
        if (reminder) {
          reminder.status = 'read';
          reminder.readAt = new Date().toISOString();
        }
        if (state.unreadCount > 0) {
          state.unreadCount -= 1;
        }
      })

      .addCase(markAsHandled.fulfilled, (state, action) => {
        const reminder = state.reminders.find(r => r.id === action.payload);
        if (reminder) {
          reminder.status = 'handled';
          reminder.handledAt = new Date().toISOString();
        }
      })

      .addCase(batchMarkAsRead.fulfilled, (state, action) => {
        action.payload.forEach(id => {
          const reminder = state.reminders.find(r => r.id === id);
          if (reminder && reminder.status !== 'read') {
            reminder.status = 'read';
            reminder.readAt = new Date().toISOString();
            if (state.unreadCount > 0) {
              state.unreadCount -= 1;
            }
          }
        });
      })

      .addCase(deleteReminder.fulfilled, (state, action) => {
        state.reminders = state.reminders.filter(r => r.id !== action.payload);
      })

      // ==================== 用户设置 ====================
      .addCase(fetchUserSettings.pending, (state) => {
        state.settingsLoading = true;
      })
      .addCase(fetchUserSettings.fulfilled, (state, action) => {
        state.settingsLoading = false;
        state.settings = action.payload;
      })
      .addCase(fetchUserSettings.rejected, (state, action) => {
        state.settingsLoading = false;
        state.error = action.payload as string;
      })

      .addCase(updateUserSettings.fulfilled, (state, action) => {
        if (state.settings) {
          state.settings = { ...state.settings, ...action.payload };
        }
      })

      // ==================== 续约提醒 ====================
      .addCase(fetchRenewalReminders.pending, (state) => {
        state.renewalLoading = true;
      })
      .addCase(fetchRenewalReminders.fulfilled, (state, action) => {
        state.renewalLoading = false;
        state.renewalReminders = action.payload;
      })
      .addCase(fetchRenewalReminders.rejected, (state, action) => {
        state.renewalLoading = false;
        state.error = action.payload as string;
      })

      .addCase(deleteRenewalReminder.fulfilled, (state, action) => {
        state.renewalReminders = state.renewalReminders.filter(r => r.id !== action.payload);
      });
  }
});

// ==================== Selectors ====================

export const selectReminderRules = (state: RootState) => state.reminders.rules;
export const selectCurrentRule = (state: RootState) => state.reminders.currentRule;
export const selectRulesLoading = (state: RootState) => state.reminders.rulesLoading;
export const selectRulesPagination = (state: RootState) => state.reminders.rulesPagination;

export const selectReminders = (state: RootState) => state.reminders.reminders;
export const selectCurrentReminder = (state: RootState) => state.reminders.currentReminder;
export const selectRemindersLoading = (state: RootState) => state.reminders.remindersLoading;
export const selectUnreadCount = (state: RootState) => state.reminders.unreadCount;
export const selectRemindersPagination = (state: RootState) => state.reminders.remindersPagination;

export const selectUserSettings = (state: RootState) => state.reminders.settings;
export const selectSettingsLoading = (state: RootState) => state.reminders.settingsLoading;

export const selectRenewalReminders = (state: RootState) => state.reminders.renewalReminders;
export const selectRenewalLoading = (state: RootState) => state.reminders.renewalLoading;

export const selectRemindersError = (state: RootState) => state.reminders.error;

// ==================== Actions ====================

export const {
  clearError,
  clearCurrentRule,
  clearCurrentReminder,
  setCurrentRule,
  setCurrentReminder
} = remindersSlice.actions;

export default remindersSlice.reducer;

