// 统一API客户端配置（优化版）
export const API_BASE: string = (import.meta as any)?.env?.VITE_API_BASE || '/api';
import { t } from '../i18n';
import * as sessionManager from '../utils/sessionManager';

/**
 * API 响应基础接口
 */
export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  details?: any;
}

/**
 * 错误类
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 获取认证 token（使用sessionStorage）
 */
function getAuthToken(): string | null {
  return sessionManager.getAuthToken();
}

/**
 * 设置认证 token（使用sessionStorage）
 */
export function setAuthToken(token: string): void {
  sessionManager.setAuthToken(token);
}

/**
 * 清除认证信息（使用sessionStorage）
 */
export function clearAuth(): void {
  sessionManager.clearAuth();
}

/**
 * 获取认证头（导出供外部使用）
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
    };
  }
  return {};
}

/**
 * 翻译错误消息为中文
 */
function translateError(msg?: string): string {
  const m = String(msg || '')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\s+/g, ' ');
    
  if (!m) return t('errors.unknown');

  // 认证相关错误
  if (/no token provided|not authenticated/i.test(m)) {
    return '请先登录';
  }
  if (/invalid.*token|token.*invalid/i.test(m)) {
    return '登录已失效，请重新登录';
  }
  if (/token.*expired|expired.*token/i.test(m)) {
    return '登录已过期，请重新登录';
  }
  if (/insufficient permissions|forbidden/i.test(m)) {
    return '权限不足';
  }

  // 通用错误
  const errorMap: Array<[RegExp, string]> = [
    [/^list error$/i, t('errors.list')],
    [/^create error$/i, t('errors.create')],
    [/^update error$/i, t('errors.update')],
    [/^delete error$/i, t('errors.delete')],
    [/default error/i, t('errors.default')],
    [/get mapping error/i, t('errors.mapping_get')],
    [/update mapping error/i, t('errors.mapping_update')],
    [/^(get|post|put|delete)\s.+ failed$/i, t('fallback.request_failed')],
    [/vehicle already exists/i, t('errors.vehicle_exists')],
    [/driver not found/i, t('errors.driver_not_found')],
    [/order not found/i, t('errors.order_not_found')],
    [/model already exists/i, t('errors.model_exists')],
    [/equipment code already exists/i, t('errors.equipment_code_exists')],
    [/name\/address required/i, t('errors.name_address_required')],
    [/platenumber\/spec required/i, t('errors.plate_spec_required')],
    [/name\/phone required/i, t('errors.name_phone_required')],
    [/type is required/i, t('errors.type_required')],
    [/mapping object required/i, t('errors.mapping_required')],
    [/not found/i, t('errors.not_found')],
    [/duplicate key|duplicate entry/i, t('errors.duplicate')],
    [/failed to fetch/i, t('errors.network')],
    [/too many requests/i, '请求过于频繁，请稍后再试'],
    [/validation failed/i, '数据验证失败'],
    [/not implemented|501/i, '功能未实现，请重启后端服务'],
    [/suspensions table not implemented/i, '报停功能未实现，请重启后端服务'],
  ];

  for (const [pattern, translation] of errorMap) {
    if (pattern.test(m)) return translation;
  }

  // 如果已是中文，直接返回
  const hasChinese = /[\u4e00-\u9fa5]/.test(m);
  return hasChinese ? m : m;
}

/**
 * 处理认证错误
 */
function handleAuthError(statusCode: number): void {
  if (statusCode === 401) {
    // Token 过期或无效，清除认证信息并跳转到登录页
    sessionManager.clearAuth();
    
    // 如果不在登录页，则跳转
    if (!window.location.pathname.includes('/login')) {
      console.log('[ApiClient] 认证失败，跳转到登录页');
      window.location.href = '/login';
    }
  }
}

/**
 * 通用请求方法
 */
async function request<T>(
  method: string,
  path: string,
  body?: any
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const authHeaders = getAuthHeaders();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...authHeaders,
  };

  try {
    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    let json: ApiResponse<T>;

    try {
      json = await response.json();
    } catch (e) {
      // 响应不是有效的 JSON
      throw new ApiError(
        '服务器响应格式错误',
        response.status
      );
    }

    // 只在 401 时处理认证错误
    if (response.status === 401) {
      handleAuthError(response.status);
    }

    if (!response.ok || json.ok === false) {
      // 处理 501 错误（Not Implemented）
      if (response.status === 501) {
        throw new ApiError(
          '功能未实现，请重启后端服务以加载最新代码',
          501,
          json.details
        );
      }
      
      // 处理 401 错误（认证失败）
      if (response.status === 401) {
        throw new ApiError(
          '认证失败，请重新登录',
          401,
          json.details
        );
      }
      
      // 处理 403 错误（权限不足）
      if (response.status === 403) {
        throw new ApiError(
          '权限不足，无法执行此操作',
          403,
          json.details
        );
      }
      
      // 处理 400 错误（请求参数错误）
      if (response.status === 400) {
        throw new ApiError(
          json.error || '请求参数错误',
          400,
          json.details
        );
      }
      
      const errorMessage = translateError(json.error || `${method} ${path} failed`);
      throw new ApiError(
        errorMessage,
        response.status,
        json.details
      );
    }

    // 返回数据
    // 如果响应包含 pagination，返回完整对象（包含 data 和 pagination）
    // 否则优先返回 data 字段，若无则返回整个响应
    if (typeof json === 'object' && json !== null && 'pagination' in json) {
      return json as T;
    }
    return (json.data !== undefined ? json.data : json) as T;
  } catch (error) {
    // 网络错误或其他异常
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(
        '网络连接失败，请检查您的网络连接',
        0
      );
    }

    throw new ApiError(
      translateError(error instanceof Error ? error.message : String(error)),
      0
    );
  }
}

/**
 * GET 请求
 */
export async function apiGet<T>(path: string): Promise<T> {
  return request<T>('GET', path);
}

/**
 * POST 请求
 */
export async function apiPost<T>(path: string, body: any): Promise<T> {
  return request<T>('POST', path, body);
}

/**
 * PUT 请求
 */
export async function apiPut<T>(path: string, body: any): Promise<T> {
  return request<T>('PUT', path, body);
}

/**
 * PATCH 请求
 */
export async function apiPatch<T>(path: string, body: any): Promise<T> {
  return request<T>('PATCH', path, body);
}

/**
 * DELETE 请求
 */
export async function apiDelete<T>(path: string): Promise<T> {
  return request<T>('DELETE', path);
}

/**
 * 文件上传
 */
export async function apiUpload<T>(
  path: string,
  formData: FormData
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers = getAuthHeaders();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers, // 不设置 Content-Type，让浏览器自动设置（包括 boundary）
      body: formData,
    });

    let json: ApiResponse<T>;
    try {
      json = await response.json();
    } catch (e) {
      throw new ApiError('服务器响应格式错误', response.status);
    }

    // 只在 401 时处理认证错误
    if (response.status === 401) {
      handleAuthError(response.status);
    }

    if (!response.ok || json.ok === false) {
      const errorMessage = translateError(json.error || 'Upload failed');
      throw new ApiError(errorMessage, response.status, json.details);
    }

    return (json.data !== undefined ? json.data : json) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      translateError(error instanceof Error ? error.message : String(error)),
      0
    );
  }
}

/**
 * API 客户端对象（默认导出）
 */
const apiClient = {
  get: async <T = any>(url: string, params?: any): Promise<{ data: ApiResponse<T> }> => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    const fullUrl = url + queryString;
    const data = await request<T>('GET', fullUrl);
    return { data: { ok: true, data } as ApiResponse<T> };
  },
  
  post: async <T = any>(url: string, data?: any): Promise<{ data: ApiResponse<T> }> => {
    const result = await request<T>('POST', url, data);
    return { data: { ok: true, data: result } as ApiResponse<T> };
  },
  
  put: async <T = any>(url: string, data?: any): Promise<{ data: ApiResponse<T> }> => {
    const result = await request<T>('PUT', url, data);
    return { data: { ok: true, data: result } as ApiResponse<T> };
  },
  
  patch: async <T = any>(url: string, data?: any): Promise<{ data: ApiResponse<T> }> => {
    const result = await request<T>('PATCH', url, data);
    return { data: { ok: true, data: result } as ApiResponse<T> };
  },
  
  delete: async <T = any>(url: string): Promise<{ data: ApiResponse<T> }> => {
    const result = await request<T>('DELETE', url);
    return { data: { ok: true, data: result } as ApiResponse<T> };
  },
};

export default apiClient;
