// 统一API客户端配置
// 优先使用 VITE_API_BASE，其次回退到相对路径，开发由 Vite 代理到 API 服务
export const API_BASE: string = (import.meta as any)?.env?.VITE_API_BASE || '/api';
import { t } from '../i18n';

function getAuthHeaders(): Record<string, string> {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return {};
    const u = JSON.parse(raw || '{}');
    const headers: Record<string, string> = {};
    if (u?.role) headers['x-role'] = String(u.role);
    if (u?.username) headers['x-user-name'] = String(u.username);
    return headers;
  } catch (_) {
    return {};
  }
}

function translateToZh(msg?: string): string {
  const m = String(msg || '')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\s+/g, ' ');
  if (!m) return t('errors.unknown');
  const pairs: Array<[RegExp, string]> = [
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
    [/duplicate key/i, t('errors.duplicate')],
    [/failed to fetch/i, t('errors.network')],
  ];
  for (const [pattern, zh] of pairs) {
    if (pattern.test(m)) return zh;
  }
  // 如果后端已返回中文，直接原文返回；否则使用原文作为兜底
  const hasChinese = /[\u4e00-\u9fa5]/.test(m);
  return hasChinese ? m : m;
}

export async function apiGet<T>(path: string): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || (json && json.ok === false)) {
    const raw = (json && json.error) || `GET ${path} failed`;
    throw new Error(translateToZh(raw));
  }
  return (json && json.data !== undefined ? json.data : json) as T;
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || (json && json.ok === false)) {
    const raw = (json && json.error) || `POST ${path} failed`;
    throw new Error(translateToZh(raw));
  }
  return (json && json.data !== undefined ? json.data : json) as T;
}

export async function apiPut<T>(path: string, body: any): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || (json && json.ok === false)) {
    const raw = (json && json.error) || `PUT ${path} failed`;
    throw new Error(translateToZh(raw));
  }
  return (json && json.data !== undefined ? json.data : json) as T;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || (json && json.ok === false)) {
    const raw = (json && json.error) || `DELETE ${path} failed`;
    throw new Error(translateToZh(raw));
  }
  return (json && json.data !== undefined ? json.data : json) as T;
}