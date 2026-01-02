/**
 * 黑名单相关类型定义
 */

export type BlacklistSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BlacklistStatus = 'active' | 'removed';

export interface BlacklistRecord {
  id: number;
  customerName: string;
  customerPhone?: string;
  customerIdCard?: string;
  reason: string;
  evidenceFiles?: string[];
  severity: BlacklistSeverity;
  status: BlacklistStatus;
  
  // 上传者信息
  uploadedBy: number;
  uploaderTenantId: number;
  uploaderName: string;
  uploadTime: string;
  
  // 审核信息
  verified: boolean;
  verifiedBy?: number;
  verifyTime?: string;
  verifyNote?: string;
  
  // 移除信息
  removedBy?: number;
  removeTime?: string;
  removeReason?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface BlacklistCheckResult {
  isBlacklisted: boolean;
  records: BlacklistRecord[];
  count: number;
}

export interface BlacklistStats {
  total: number;
  active: number;
  removed: number;
  verified: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface BlacklistState {
  records: BlacklistRecord[];
  stats: BlacklistStats | null;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  total: number;
}

