import zhCN from './zh-CN.json';

type Dict = Record<string, string>;
const dict: Dict = zhCN as Dict;

export const DEFAULT_LOCALE = 'zh-CN';

export function t(key: string, vars?: Record<string, string | number>): string {
  let s = dict[key] || key;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }
  return s;
}

export function hasKey(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(dict, key);
}