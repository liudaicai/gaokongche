export type TemplateType = '合同' | '进场' | '退场' | '结算' | '索赔' | '报停';

export interface TemplateVersion {
  id: string;
  content: string;
  createdAt: string;
  note?: string;
}

export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  content: string; // HTML字符串，打印模板内容
  isDefault?: boolean;
  status?: 'enabled' | 'disabled';
  versions?: TemplateVersion[]; // 历史版本
  createdAt: string;
  updatedAt: string;
}

export interface TemplatesState {
  templates: Template[];
  mappings: Record<string, Record<string, string>>; // 模板占位符映射（按模板id）
  loading: boolean;
  error: string | null;
}

export const TEMPLATE_TYPE_OPTIONS: TemplateType[] = ['合同', '进场', '退场', '结算', '索赔', '报停'];