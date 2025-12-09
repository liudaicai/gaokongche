/**
 * 智能配件管理系统 V3.0 - TypeScript 类型定义
 */

// ==================== 配件主表类型 ====================

export type PartType = 'original' | 'oem' | 'aftermarket' | 'generic';

export type AccessoryStatus = 'active' | 'discontinued' | 'obsolete' | 'out_of_stock';

export interface Accessory {
  id: number;
  materialNumber: string;
  name: string;
  
  // 分类信息
  category: string;
  subCategory?: string;
  systemCategory?: string;
  
  // 规格信息
  modelSpec?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };
  weight?: number;
  unit: string;
  
  // 品牌厂商
  partType: PartType;
  manufacturer?: string;
  brand?: string;
  originCountry?: string;
  oemNumber?: string;
  standardNumber?: string;
  
  // 技术参数
  technicalSpecs?: Record<string, any>;
  materialComposition?: Record<string, any>;
  performanceMetrics?: Record<string, any>;
  
  // 库存管理
  totalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  
  // 价格成本
  costPrice: number;
  sellingPrice: number;
  totalValue: number;
  
  // 质保信息
  warrantyMonths: number;
  shelfLifeMonths?: number;
  expectedLifespanHours?: number;
  
  // 供应商信息
  primarySupplierId?: number;
  primarySupplierName?: string;
  supplierContact?: string;
  supplierLeadTime: number;
  
  // 仓储信息
  warehouseName?: string;
  area?: string;
  shelfLocation?: string;
  
  // 多媒体信息
  images?: string[];
  '3dModelUrl'?: string;
  installationVideos?: string[];
  documents?: Array<{ name: string; url: string }>;
  
  // 智能推荐数据
  compatibilityScore: number;
  popularityScore: number;
  reliabilityScore: number;
  aiRecommendWeight: number;
  
  // 使用统计
  totalUsageCount: number;
  lastUsedDate?: string;
  failureCount: number;
  failureRate: number;
  
  // 状态与标签
  status: AccessoryStatus;
  tags?: string[];
  notes?: string;
  
  // 系统字段
  companyId?: number;
  createdBy?: number;
  updatedBy?: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt?: string;
}

// ==================== 适配知识库类型 ====================

export type CompatibilityLevel = 'perfect' | 'excellent' | 'good' | 'fair' | 'poor';
export type InstallationDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type ReplacementIntervalUnit = 'hours' | 'days' | 'months' | 'km';

export interface EquipmentAccessoryKnowledge {
  id: number;
  
  // 设备信息
  equipmentBrand: string;
  equipmentType: string;
  equipmentModel: string;
  equipmentHeight?: number;
  equipmentCategory?: string;
  
  // 配件信息
  accessoryId: number;
  partPosition: string;
  partFunction: string;
  
  // 适配等级
  compatibilityLevel: CompatibilityLevel;
  compatibilityScore: number;
  isOriginalRecommended: boolean;
  
  // 安装信息
  installationDifficulty: InstallationDifficulty;
  installationTimeMinutes?: number;
  specialToolsRequired?: string[];
  installationNotes?: string;
  
  // 更换周期
  replacementInterval?: number;
  replacementIntervalUnit: ReplacementIntervalUnit;
  
  // 使用统计
  usageCount: number;
  successRate: number;
  avgLifespanHours?: number;
  
  // 用户反馈
  userRating: number;
  feedbackCount: number;
  positiveFeedbackCount: number;
  negativeFeedbackCount: number;
  commonIssues?: string[];
  
  // AI学习数据
  confidenceScore: number;
  dataSource: string;
  lastVerifiedDate?: string;
  
  // 系统字段
  companyId?: number;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// ==================== AI推荐类型 ====================

export interface AIRecommendationLog {
  id: number;
  sessionId: string;
  
  // 输入条件
  equipmentBrand: string;
  equipmentType: string;
  equipmentModel: string;
  equipmentId?: number;
  searchCriteria: Record<string, any>;
  
  // 推荐算法
  recommendationAlgorithm: string;
  algorithmVersion: string;
  
  // 推荐结果
  recommendedAccessories: RecommendedAccessory[];
  topRecommendationId?: number;
  alternativesCount: number;
  
  // 用户交互
  userId?: number;
  userFeedback?: Record<string, any>;
  finalSelection?: Record<string, any>;
  isAccepted?: boolean;
  
  // 性能指标
  responseTimeMs: number;
  confidenceScore: number;
  accuracyScore?: number;
  
  // 系统字段
  companyId?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface RecommendedAccessory {
  accessory: Accessory;
  knowledge?: EquipmentAccessoryKnowledge;
  recommendScore: number;
  reasonTags: string[];
  alternatives?: Accessory[];
}

// ==================== 3D位置标注类型 ====================

export interface Accessory3DPosition {
  id: number;
  accessoryId: number;
  equipmentModel: string;
  
  // 3D位置数据
  positionData: { x: number; y: number; z: number };
  rotationData?: { rx: number; ry: number; rz: number };
  scaleData?: { sx: number; sy: number; sz: number };
  
  // 视图设置
  viewAngles?: Array<{ azimuth: number; elevation: number }>;
  cameraPositions?: Array<{ x: number; y: number; z: number }>;
  annotationPoints?: Array<{ x: number; y: number; z: number; label: string }>;
  highlightColor: string;
  
  // 说明信息
  description?: string;
  installationGuide?: string;
  
  // 系统字段
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// ==================== 出入库记录类型 ====================

export type TransactionType = 'purchase' | 'issue' | 'return' | 'adjust' | 'scrap' | 'transfer';

export interface AccessoryTransaction {
  id: number;
  accessoryId: number;
  
  // 交易类型
  transactionType: TransactionType;
  transactionNumber?: string;
  quantity: number;
  
  // 操作人信息
  operatorId?: number;
  operatorName?: string;
  
  // 关联业务信息
  relatedOrderId?: number;
  relatedEquipmentId?: number;
  relatedOrderNumber?: string;
  relatedEquipmentCode?: string;
  
  // 业务说明
  purpose?: string;
  reason?: string;
  notes?: string;
  
  // 价格成本
  unitPrice: number;
  totalAmount: number;
  
  // 库存快照
  beforeQuantity?: number;
  afterQuantity?: number;
  
  // 系统字段
  companyId?: number;
  createdAt: string;
}

// ==================== 搜索和过滤类型 ====================

export interface AccessorySearchParams {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  subCategory?: string;
  systemCategory?: string;
  partType?: PartType;
  manufacturer?: string;
  brand?: string;
  warehouse?: string;
  status?: AccessoryStatus;
  lowStock?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface SmartSearchParams {
  equipmentBrand: string;
  equipmentType: string;
  equipmentModel: string;
  equipmentId?: number;
  category?: string;
  subCategory?: string;
  partPosition?: string;
  compatibilityLevel?: string;
  includeAlternatives?: boolean;
}

export interface AccessoryStats {
  totalCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValue: number;
  availableQuantity: number;
  byCategory: Array<{
    category: string;
    count: number;
    totalQty: number;
    availableQty: number;
    value: number;
  }>;
  byPartType: Array<{
    partType: string;
    count: number;
    value: number;
  }>;
  topPopular: Accessory[];
  recentlyUsed: Accessory[];
}

// ==================== 表单类型 ====================

export interface AccessoryFormData {
  materialNumber: string;
  name: string;
  category: string;
  subCategory?: string;
  systemCategory?: string;
  modelSpec?: string;
  dimensions?: Record<string, any>;
  weight?: number;
  unit?: string;
  partType?: PartType;
  manufacturer?: string;
  brand?: string;
  originCountry?: string;
  oemNumber?: string;
  standardNumber?: string;
  technicalSpecs?: Record<string, any>;
  totalQuantity?: number;
  minStock?: number;
  maxStock?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  costPrice?: number;
  sellingPrice?: number;
  warrantyMonths?: number;
  shelfLifeMonths?: number;
  expectedLifespanHours?: number;
  primarySupplierName?: string;
  supplierContact?: string;
  supplierLeadTime?: number;
  warehouseName?: string;
  area?: string;
  shelfLocation?: string;
  images?: string[];
  '3dModelUrl'?: string;
  installationVideos?: string[];
  documents?: Array<{ name: string; url: string }>;
  tags?: string[];
  notes?: string;
}

export interface TransactionFormData {
  transactionType: TransactionType;
  quantity: number;
  transactionNumber?: string;
  purpose?: string;
  reason?: string;
  unitPrice?: number;
  relatedOrderId?: number;
  relatedEquipmentId?: number;
  notes?: string;
}

export interface KnowledgeFormData {
  equipmentBrand: string;
  equipmentType: string;
  equipmentModel: string;
  equipmentHeight?: number;
  partPosition: string;
  partFunction: string;
  compatibilityLevel?: CompatibilityLevel;
  compatibilityScore?: number;
  isOriginalRecommended?: boolean;
  installationDifficulty?: InstallationDifficulty;
  installationTimeMinutes?: number;
  specialToolsRequired?: string[];
  installationNotes?: string;
  replacementInterval?: number;
  replacementIntervalUnit?: ReplacementIntervalUnit;
}

// ==================== API 响应类型 ====================

export interface AccessoryListResponse {
  ok: boolean;
  data: Accessory[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface AccessoryDetailResponse {
  ok: boolean;
  data: Accessory;
}

export interface SmartRecommendationResponse {
  ok: boolean;
  data: {
    recommendations: RecommendedAccessory[];
    sessionId: string;
    algorithm: string;
    confidenceScore: number;
  };
}

export interface AccessoryStatsResponse {
  ok: boolean;
  data: AccessoryStats;
}

export interface KnowledgeListResponse {
  ok: boolean;
  data: EquipmentAccessoryKnowledge[];
}

export interface TransactionListResponse {
  ok: boolean;
  data: AccessoryTransaction[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

