import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import apiClient from '../../api/client';
import type {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowTask,
  WorkflowHistory,
  WorkflowStats,
  StartWorkflowForm,
  TaskCompleteForm,
} from './types';

interface WorkflowsState {
  definitions: WorkflowDefinition[];
  instances: WorkflowInstance[];
  currentInstance: WorkflowInstance | null;
  pendingTasks: WorkflowTask[];
  stats: WorkflowStats | null;
  history: WorkflowHistory[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

const initialState: WorkflowsState = {
  definitions: [],
  instances: [],
  currentInstance: null,
  pendingTasks: [],
  stats: null,
  history: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    pageSize: 20,
    total: 0,
  },
};

// 获取工作流定义列表
export const fetchWorkflowDefinitions = createAsyncThunk(
  'workflows/fetchDefinitions',
  async (params: { category?: string; status?: string } = {}) => {
    const response = await apiClient.get('/api/workflows/definitions', { params });
    return response.data.data;
  }
);

// 获取流程实例列表
export const fetchWorkflowInstances = createAsyncThunk(
  'workflows/fetchInstances',
  async (params: {
    page?: number;
    pageSize?: number;
    status?: string;
    businessType?: string;
    initiatorId?: number;
  } = {}) => {
    const response = await apiClient.get('/api/workflows/instances', { params });
    return response.data;
  }
);

// 获取流程实例详情
export const fetchWorkflowInstance = createAsyncThunk(
  'workflows/fetchInstance',
  async (id: number) => {
    const response = await apiClient.get(`/api/workflows/instances/${id}`);
    return response.data.data;
  }
);

// 启动流程
export const startWorkflow = createAsyncThunk(
  'workflows/start',
  async (data: StartWorkflowForm) => {
    const response = await apiClient.post('/api/workflows/instances/start', data);
    return response.data;
  }
);

// 获取我的待办任务
export const fetchPendingTasks = createAsyncThunk(
  'workflows/fetchPendingTasks',
  async () => {
    const response = await apiClient.get('/api/workflows/tasks/pending');
    return response.data.data;
  }
);

// 完成任务（审批/拒绝）
export const completeTask = createAsyncThunk(
  'workflows/completeTask',
  async ({ taskId, data }: { taskId: number; data: TaskCompleteForm }) => {
    const response = await apiClient.post(`/api/workflows/tasks/${taskId}/complete`, data);
    return response.data;
  }
);

// 获取工作流统计数据
export const fetchWorkflowStats = createAsyncThunk(
  'workflows/fetchStats',
  async () => {
    const response = await apiClient.get('/api/workflows/stats/dashboard');
    return response.data.data;
  }
);

const workflowsSlice = createSlice({
  name: 'workflows',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentInstance: (state) => {
      state.currentInstance = null;
      state.history = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // 获取工作流定义列表
      .addCase(fetchWorkflowDefinitions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkflowDefinitions.fulfilled, (state, action) => {
        state.loading = false;
        state.definitions = action.payload;
      })
      .addCase(fetchWorkflowDefinitions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取工作流定义失败';
      })
      // 获取流程实例列表
      .addCase(fetchWorkflowInstances.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkflowInstances.fulfilled, (state, action) => {
        state.loading = false;
        state.instances = action.payload.data;
        if (action.payload.pagination) {
          state.pagination = action.payload.pagination;
        }
      })
      .addCase(fetchWorkflowInstances.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取流程实例失败';
      })
      // 获取流程实例详情
      .addCase(fetchWorkflowInstance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkflowInstance.fulfilled, (state, action) => {
        state.loading = false;
        state.currentInstance = {
          ...action.payload,
          tasks: undefined,
          history: undefined,
        };
        state.history = action.payload.history || [];
      })
      .addCase(fetchWorkflowInstance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取流程详情失败';
      })
      // 启动流程
      .addCase(startWorkflow.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startWorkflow.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(startWorkflow.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '启动流程失败';
      })
      // 获取待办任务
      .addCase(fetchPendingTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPendingTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingTasks = action.payload;
      })
      .addCase(fetchPendingTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '获取待办任务失败';
      })
      // 完成任务
      .addCase(completeTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(completeTask.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(completeTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || '处理任务失败';
      })
      // 获取统计数据
      .addCase(fetchWorkflowStats.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchWorkflowStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      .addCase(fetchWorkflowStats.rejected, (state, action) => {
        state.error = action.error.message || '获取统计数据失败';
      });
  },
});

export const { clearError, clearCurrentInstance } = workflowsSlice.actions;
export default workflowsSlice.reducer;
