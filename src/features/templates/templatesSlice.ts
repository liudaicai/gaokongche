import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { TemplatesState, Template, TemplateType, TemplateVersion } from './types';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';

const now = () => new Date().toISOString();

// ============================================
// 异步 Thunks - 连接后端 API
// ============================================

/**
 * 获取模板列表
 */
export const fetchTemplates = createAsyncThunk(
  'templates/fetchTemplates',
  async (params?: { type?: TemplateType; status?: string; page?: number; pageSize?: number }) => {
    let url = '/templates';
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.type) queryParams.append('type', params.type);
      if (params.status) queryParams.append('status', params.status);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
      const query = queryParams.toString();
      if (query) url += `?${query}`;
    }
    return await apiGet(url);
  }
);

/**
 * 获取单个模板详情
 */
export const fetchTemplateById = createAsyncThunk(
  'templates/fetchTemplateById',
  async (id: string) => {
    return await apiGet(`/templates/${id}`);
  }
);

/**
 * 创建模板
 */
export const createTemplate = createAsyncThunk(
  'templates/createTemplate',
  async (template: { name: string; type: TemplateType; content: string; description?: string; isDefault?: boolean; mappings?: any[] }) => {
    return await apiPost('/templates', template);
  }
);

/**
 * 更新模板
 */
export const updateTemplateAsync = createAsyncThunk(
  'templates/updateTemplate',
  async ({ id, changes }: { id: string; changes: Partial<Template> }) => {
    await apiPut(`/templates/${id}`, changes);
    return { id, changes };
  }
);

/**
 * 删除模板
 */
export const deleteTemplateAsync = createAsyncThunk(
  'templates/deleteTemplate',
  async (id: string) => {
    await apiDelete(`/templates/${id}`);
    return id;
  }
);

/**
 * 获取默认模板
 */
export const fetchDefaultTemplate = createAsyncThunk(
  'templates/fetchDefaultTemplate',
  async (type: TemplateType) => {
    return await apiGet(`/templates/default/${type}`);
  }
);

/**
 * 复制模板
 */
export const copyTemplateAsync = createAsyncThunk(
  'templates/copyTemplate',
  async (id: string) => {
    return await apiPost(`/templates/${id}/copy`, {});
  }
);

/**
 * 更新模板映射
 */
export const updateTemplateMappings = createAsyncThunk(
  'templates/updateMappings',
  async ({ id, mappings }: { id: string; mappings: any[] }) => {
    await apiPost(`/templates/${id}/mappings`, { mappings });
    return { id, mappings };
  }
);

/**
 * 回滚模板
 */
export const rollbackTemplateAsync = createAsyncThunk(
  'templates/rollbackTemplate',
  async ({ id, versionId }: { id: string; versionId: string }) => {
    await apiPost(`/templates/${id}/rollback/${versionId}`, {});
    return { id, versionId };
  }
);

// ============================================
// 初始状态（保留本地默认模板作为后备）
// ============================================

const initialState: TemplatesState = {
  templates: [
    {
      id: 'TPL-SETTLE-DEFAULT',
      name: '标准结算模板',
      type: '结算',
      isDefault: true,
      status: 'enabled',
      versions: [],
      content: `
      <div style="font-family: 'Microsoft YaHei', Arial; width: 920px; margin: 0 auto; color: #000;">
        <h2 style="text-align:center; margin: 12px 0;">高空设备租赁费结算单</h2>
        <table style="width:100%; border-collapse:collapse; font-size:13px;" border="1">
          <tr>
            <td style="padding:6px;">结算周期</td>
            <td style="padding:6px;">{{period_start}} - {{period_end}}</td>
            <td style="padding:6px;">制作时间</td>
            <td style="padding:6px; text-align:right;">{{print_date}}</td>
          </tr>
          <tr>
            <td style="padding:6px;">承租方</td>
            <td style="padding:6px;">{{customer_name}}</td>
            <td style="padding:6px;">项目名称</td>
            <td style="padding:6px; text-align:right;">{{project_name}}</td>
          </tr>
        </table>
        <div style="margin:8px 0;">租赁费用明细</div>
        <table style="width:100%; border-collapse:collapse; font-size:12px;" border="1">
          <thead>
            <tr>
              <th style="padding:4px;">序号</th>
              <th style="padding:4px;">设备号</th>
              <th style="padding:4px;">租期(天)</th>
              <th style="padding:4px;">日租金</th>
              <th style="padding:4px;">金额</th>
            </tr>
          </thead>
          <tbody>
            {{#each items}}
            <tr>
              <td style="padding:4px;">{{index}}</td>
              <td style="padding:4px;">{{equipment_code}}</td>
              <td style="padding:4px; text-align:right;">{{days}}</td>
              <td style="padding:4px; text-align:right;">{{daily_price}}</td>
              <td style="padding:4px; text-align:right;">{{amount}}</td>
            </tr>
            {{/each}}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="padding:6px;">合计</td>
              <td style="padding:6px; text-align:right;">{{total_amount}}</td>
            </tr>
          </tfoot>
        </table>
        <div style="margin-top:10px;">
          <div>本期应付金额：{{total_amount}}</div>
          <div>累计欠款总额：{{total_outstanding}}</div>
        </div>
        <div style="margin-top:14px; display:flex; justify-content:space-between;">
          <div>甲方（出租方）：{{lessor_name}}</div>
          <div>乙方（承租方）：{{lessee_name}}</div>
        </div>
      </div>
      `,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'TPL-ENTRY-DEFAULT',
      name: '标准进场模板',
      type: '进场',
      isDefault: true,
      status: 'enabled',
      versions: [],
      content: `
      <div style="font-family: 'Microsoft YaHei', Arial; width: 920px; margin: 0 auto; color: #000;">
        <h2 style="text-align:center; margin: 12px 0;">设备进场单</h2>
        <table style="width:100%; border-collapse:collapse; font-size:13px;" border="1">
          <tr>
            <td style="padding:6px;">进场单号</td>
            <td style="padding:6px;">{{entry_number}}</td>
            <td style="padding:6px;">制作时间</td>
            <td style="padding:6px; text-align:right;">{{print_date}}</td>
          </tr>
          <tr>
            <td style="padding:6px;">合同名称</td>
            <td style="padding:6px;">{{contract_name}}</td>
            <td style="padding:6px;">交车位置</td>
            <td style="padding:6px; text-align:right;">{{delivery_location}}</td>
          </tr>
          <tr>
            <td style="padding:6px;">承租方</td>
            <td style="padding:6px;">{{customer_name}}</td>
            <td style="padding:6px;">项目名称</td>
            <td style="padding:6px; text-align:right;">{{project_name}}</td>
          </tr>
          <tr>
            <td style="padding:6px;">物流类型</td>
            <td style="padding:6px;">{{logistics_type}}</td>
            <td style="padding:6px;">出库门店</td>
            <td style="padding:6px; text-align:right;">{{store_name}}</td>
          </tr>
        </table>
         <div style="margin:8px 0;">
           <span>本次进场台数：{{entry_current_count}}</span>
           <span style="margin-left:24px;">累计在租台数：{{rented_total_count}}</span>
         </div>
         <div style="margin:8px 0;">进场设备列表</div>
         <table style="width:100%; border-collapse:collapse; font-size:12px;" border="1">
          <thead>
            <tr>
              <th style="padding:4px;">序号</th>
              <th style="padding:4px;">设备号</th>
              <th style="padding:4px;">类型</th>
              <th style="padding:4px;">高度</th>
            </tr>
          </thead>
          <tbody>
            {{#each items}}
            <tr>
              <td style="padding:4px;">{{index}}</td>
              <td style="padding:4px;">{{equipment_code}}</td>
              <td style="padding:4px;">{{equipment_type}}</td>
              <td style="padding:4px;">{{height}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>
        <div style="margin-top:14px; display:flex; justify-content:space-between;">
          <div>甲方（出租方）：{{lessor_name}}</div>
          <div>乙方（承租方）：{{lessee_name}}</div>
        </div>
      </div>
      `,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'TPL-EXIT-DEFAULT',
      name: '标准退场模板',
      type: '退场',
      isDefault: true,
      status: 'enabled',
      versions: [],
      content: `
      <div style="font-family: 'Microsoft YaHei', Arial; width: 920px; margin: 0 auto; color: #000;">
        <h2 style="text-align:center; margin: 12px 0;">设备退场单</h2>
        <table style="width:100%; border-collapse:collapse; font-size:13px;" border="1">
          <tr>
            <td style="padding:6px;">退场单号</td>
            <td style="padding:6px;">{{exit_number}}</td>
            <td style="padding:6px;">制作时间</td>
            <td style="padding:6px; text-align:right;">{{print_date}}</td>
          </tr>
          <tr>
            <td style="padding:6px;">收车位置</td>
            <td style="padding:6px;">{{pickup_location}}</td>
            <td style="padding:6px;">回库门店</td>
            <td style="padding:6px; text-align:right;">{{return_store_name}}</td>
          </tr>
          <tr>
            <td style="padding:6px;">承租方</td>
            <td style="padding:6px;">{{customer_name}}</td>
            <td style="padding:6px;">项目名称</td>
            <td style="padding:6px; text-align:right;">{{project_name}}</td>
          </tr>
          <tr>
            <td style="padding:6px;">物流类型</td>
            <td style="padding:6px;">{{logistics_type}}</td>
            <td style="padding:6px;">司机</td>
            <td style="padding:6px; text-align:right;">{{driver_name}}</td>
          </tr>
          <tr>
            <td style="padding:6px;">租金结算日期</td>
            <td style="padding:6px;" colspan="3">{{settlement_date}}</td>
          </tr>
        </table>
        <div style="margin:8px 0;">退场设备列表</div>
        <table style="width:100%; border-collapse:collapse; font-size:12px;" border="1">
          <thead>
            <tr>
              <th style="padding:4px;">序号</th>
              <th style="padding:4px;">设备号</th>
              <th style="padding:4px;">类型</th>
              <th style="padding:4px;">高度</th>
            </tr>
          </thead>
          <tbody>
            {{#each items}}
            <tr>
              <td style="padding:4px;">{{index}}</td>
              <td style="padding:4px;">{{equipment_code}}</td>
              <td style="padding:4px;">{{equipment_type}}</td>
              <td style="padding:4px;">{{height}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>
        <div style="margin-top:14px; display:flex; justify-content:space-between;">
          <div>甲方（出租方）：{{lessor_name}}</div>
          <div>乙方（承租方）：{{lessee_name}}</div>
        </div>
      </div>
      `,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: 'TPL-CONTRACT-DEFAULT',
      name: '标准合同模板',
      type: '合同',
      isDefault: true,
      status: 'enabled',
      versions: [],
      content: `
      <div style="font-family: 'Microsoft YaHei', Arial; width: 920px; margin: 0 auto; color: #000;">
        <h2 style="text-align:center; margin: 12px 0;">设备租赁合同（预览）</h2>
        <table style="width:100%; border-collapse:collapse; font-size:13px;" border="1">
          <tr>
            <td style="padding:6px;">合同编号</td>
            <td style="padding:6px;">{{contract_number}}</td>
            <td style="padding:6px;">制作时间</td>
            <td style="padding:6px; text-align:right;">{{print_date}}</td>
          </tr>
          <tr>
            <td style="padding:6px;">出租方</td>
            <td style="padding:6px;">{{lessor_name}}</td>
            <td style="padding:6px;">承租方</td>
            <td style="padding:6px; text-align:right;">{{lessee_name}}</td>
          </tr>
          <tr>
            <td style="padding:6px;">项目名称</td>
            <td style="padding:6px;">{{project_name}}</td>
            <td style="padding:6px;">支付约定</td>
            <td style="padding:6px; text-align:right;">{{payment_agreement}}</td>
          </tr>
          <tr>
            <td style="padding:6px;">月份计算方式</td>
            <td style="padding:6px;">{{month_calc_method}}</td>
            <td style="padding:6px;">交机地点</td>
            <td style="padding:6px; text-align:right;">{{delivery_location}}</td>
          </tr>
        </table>
        <div style="margin:8px 0;">租赁设备清单</div>
        <table style="width:100%; border-collapse:collapse; font-size:12px;" border="1">
          <thead>
            <tr>
              <th style="padding:4px;">序号</th>
              <th style="padding:4px;">类型</th>
              <th style="padding:4px;">高度</th>
              <th style="padding:4px;">日租金</th>
              <th style="padding:4px;">月租金</th>
            </tr>
          </thead>
          <tbody>
            {{#each items}}
            <tr>
              <td style="padding:4px;">{{index}}</td>
              <td style="padding:4px;">{{equipment_type}}</td>
              <td style="padding:4px;">{{height}}</td>
              <td style="padding:4px; text-align:right;">{{daily_price}}</td>
              <td style="padding:4px; text-align:right;">{{monthly_rate}}</td>
            </tr>
            {{/each}}
          </tbody>
        </table>
        <div style="margin-top:14px; display:flex; justify-content:space-between;">
          <div>甲方（出租方）：{{lessor_name}}</div>
          <div>乙方（承租方）：{{lessee_name}}</div>
        </div>
      </div>
      `,
      createdAt: now(),
      updatedAt: now(),
    },
  ],
  mappings: {},
  loading: false,
  error: null,
};

type UpdatePayload = { id: string; changes: Partial<Omit<Template, 'id'>> };

const templatesSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
    addTemplateWithMapping: (state, action: PayloadAction<Omit<Template, 'id'|'createdAt'|'updatedAt'> & { mapping?: Record<string, string> }>) => {
      const id = `TPL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const nowStr = now();
      const { mapping, ...base } = action.payload as any;
      const tpl: Template = { id, createdAt: nowStr, updatedAt: nowStr, status: 'enabled', versions: [], ...base };
      if (tpl.isDefault) {
        state.templates = state.templates.map(t => t.type === tpl.type ? { ...t, isDefault: false } : t);
      }
      state.templates.push(tpl);
      if (mapping && Object.keys(mapping).length) {
        state.mappings[id] = mapping;
      }
    },
    addTemplate: (state, action: PayloadAction<Omit<Template, 'id'|'createdAt'|'updatedAt'>>) => {
      const id = `TPL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const nowStr = now();
      const tpl: Template = { id, createdAt: nowStr, updatedAt: nowStr, status: 'enabled', versions: [], ...action.payload };
      // 若设置为默认，清除同类型默认
      if (tpl.isDefault) {
        state.templates = state.templates.map(t => t.type === tpl.type ? { ...t, isDefault: false } : t);
      }
      state.templates.push(tpl);
    },
    updateTemplate: (state, action: PayloadAction<UpdatePayload>) => {
      const { id, changes } = action.payload;
      const idx = state.templates.findIndex(t => t.id === id);
      if (idx >= 0) {
        const prev = state.templates[idx];
        const next = { ...prev, ...changes, updatedAt: now() };
        // 内容变更则记录历史版本
        if (changes.content !== undefined && changes.content !== prev.content) {
          const ver: TemplateVersion = { id: `VER-${Math.random().toString(36).slice(2,8).toUpperCase()}`, content: prev.content, createdAt: now() };
          next.versions = [...(prev.versions || []), ver];
        }
        // 若变更为默认，则清理同类型默认
        if (changes.isDefault) {
          state.templates = state.templates.map(t => t.type === next.type ? { ...t, isDefault: false } : t);
        }
        state.templates[idx] = next;
      }
    },
    deleteTemplate: (state, action: PayloadAction<string>) => {
      state.templates = state.templates.filter(t => t.id !== action.payload);
    },
    setDefaultTemplate: (state, action: PayloadAction<{ type: TemplateType; id: string }>) => {
      const { type, id } = action.payload;
      state.templates = state.templates.map(t => {
        if (t.type !== type) return t;
        return { ...t, isDefault: t.id === id };
      });
    },
    toggleTemplateStatus: (state, action: PayloadAction<{ id: string; status: 'enabled' | 'disabled' }>) => {
      const { id, status } = action.payload;
      const idx = state.templates.findIndex(t => t.id === id);
      if (idx >= 0) {
        state.templates[idx].status = status;
        state.templates[idx].updatedAt = now();
      }
    },
    copyTemplate: (state, action: PayloadAction<string>) => {
      const src = state.templates.find(t => t.id === action.payload);
      if (!src) return;
      const id = `TPL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const nowStr = now();
      const copy: Template = {
        ...src,
        id,
        name: `${src.name}（副本）`,
        isDefault: false,
        createdAt: nowStr,
        updatedAt: nowStr,
      };
      state.templates.push(copy);
    },
    rollbackTemplate: (state, action: PayloadAction<{ id: string; versionId: string }>) => {
      const { id, versionId } = action.payload;
      const idx = state.templates.findIndex(t => t.id === id);
      if (idx < 0) return;
      const tpl = state.templates[idx];
      const ver = (tpl.versions || []).find(v => v.id === versionId);
      if (!ver) return;
      // 将当前内容入栈
      const currVer: TemplateVersion = { id: `VER-${Math.random().toString(36).slice(2,8).toUpperCase()}`, content: tpl.content, createdAt: now(), note: 'rollback-from-current' };
      tpl.versions = [...(tpl.versions || []), currVer];
      tpl.content = ver.content;
      tpl.updatedAt = now();
    },
    setTemplateMapping: (state, action: PayloadAction<{ id: string; mapping: Record<string, string> }>) => {
      const { id, mapping } = action.payload;
      state.mappings[id] = mapping;
    },
  },
  extraReducers: (builder) => {
    // 获取模板列表
    builder.addCase(fetchTemplates.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTemplates.fulfilled, (state, action) => {
      state.loading = false;
      if (Array.isArray(action.payload)) {
        state.templates = action.payload;
      } else {
        // 处理分页响应
        state.templates = action.payload;
      }
    });
    builder.addCase(fetchTemplates.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || '获取模板失败';
    });

    // 获取单个模板
    builder.addCase(fetchTemplateById.fulfilled, (state, action) => {
      const idx = state.templates.findIndex(t => t.id === action.payload.id);
      if (idx >= 0) {
        state.templates[idx] = action.payload;
      } else {
        state.templates.push(action.payload);
      }
    });

    // 创建模板
    builder.addCase(createTemplate.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(createTemplate.fulfilled, (state, action) => {
      state.loading = false;
      // 重新获取列表（因为后端返回的可能不是完整的模板对象）
      // 或者可以手动构造一个临时对象
    });
    builder.addCase(createTemplate.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || '创建模板失败';
    });

    // 更新模板
    builder.addCase(updateTemplateAsync.fulfilled, (state, action) => {
      const { id, changes } = action.payload;
      const idx = state.templates.findIndex(t => t.id === id);
      if (idx >= 0) {
        state.templates[idx] = { ...state.templates[idx], ...changes, updatedAt: now() };
      }
    });

    // 删除模板
    builder.addCase(deleteTemplateAsync.fulfilled, (state, action) => {
      state.templates = state.templates.filter(t => t.id !== action.payload);
    });

    // 获取默认模板
    builder.addCase(fetchDefaultTemplate.fulfilled, (state, action) => {
      const template = action.payload;
      const idx = state.templates.findIndex(t => t.id === template.id);
      if (idx >= 0) {
        state.templates[idx] = template;
      } else {
        state.templates.push(template);
      }
    });

    // 复制模板
    builder.addCase(copyTemplateAsync.fulfilled, (state) => {
      // 重新获取列表
      state.loading = false;
    });
  },
});

export const { addTemplateWithMapping, addTemplate, updateTemplate, deleteTemplate, setDefaultTemplate, toggleTemplateStatus, copyTemplate, rollbackTemplate, setTemplateMapping } = templatesSlice.actions;
export default templatesSlice.reducer;

// 选择器
export const selectTemplates = (state: any) => state.templates.templates as Template[];
export const selectTemplatesByType = (type: TemplateType) => (state: any) =>
  (state.templates.templates as Template[]).filter(t => t.type === type);
export const selectDefaultTemplate = (type: TemplateType) => (state: any) =>
  (state.templates.templates as Template[]).find(t => t.type === type && t.isDefault);
export const selectTemplateMapping = (id: string) => (state: any) => (state.templates.mappings || {})[id] || {};