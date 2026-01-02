/**
 * 多租户中间件
 * 用于自动过滤租户数据，实现数据隔离
 * 
 * 使用方式：
 * import { tenantMiddleware, sharedResourceMiddleware } from './middleware/tenant.js';
 * router.get('/', tenantMiddleware, async (req, res) => { ... });
 */

/**
 * 核心多租户中间件
 * 根据用户角色自动设置数据过滤条件
 * 
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express next函数
 */
export function tenantMiddleware(req, res, next) {
  const user = req.user;
  
  // 未认证用户
  if (!user) {
    return res.status(401).json({ 
      ok: false, 
      error: '未认证，请先登录' 
    });
  }
  
  // 超级管理员：不受限制，可以查看所有租户数据
  if (user.role === 'super_admin' || user.role === 'superadmin') {
    req.tenantFilter = { 
      where: '1=1', 
      params: [] 
    };
    req.tenantId = null; // 不自动设置 company_id
    return next();
  }
  
  // 公司级用户：只能访问本公司数据
  if (!user.company_id) {
    return res.status(403).json({ 
      ok: false, 
      error: '用户未分配公司，请联系管理员分配所属公司' 
    });
  }
  
  // 设置租户过滤条件
  req.tenantFilter = {
    where: 'company_id = ?',
    params: [user.company_id]
  };
  req.tenantId = user.company_id;
  
  next();
}

/**
 * 共享资源中间件
 * 允许访问本公司数据 + 系统级共享数据（company_id = NULL）
 * 
 * 适用场景：
 * - 设备型号（equipment_models）：系统级数据
 * - 系统配置：全局配置
 * 
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express next函数
 */
export function sharedResourceMiddleware(req, res, next) {
  const user = req.user;
  
  if (!user) {
    return res.status(401).json({ 
      ok: false, 
      error: '未认证，请先登录' 
    });
  }
  
  // 超级管理员：不受限制
  if (user.role === 'super_admin' || user.role === 'superadmin') {
    req.tenantFilter = { 
      where: '1=1', 
      params: [] 
    };
    req.tenantId = null;
    return next();
  }
  
  // 公司级用户：可以访问本公司数据 + 系统级数据（NULL）
  if (!user.company_id) {
    return res.status(403).json({ 
      ok: false, 
      error: '用户未分配公司，请联系管理员' 
    });
  }
  
  req.tenantFilter = {
    where: '(company_id = ? OR company_id IS NULL)',
    params: [user.company_id]
  };
  req.tenantId = user.company_id;
  
  next();
}

/**
 * 可选：租户切换中间件（仅超级管理员）
 * 允许超级管理员通过 header 临时切换租户视角
 * 
 * 使用方式：
 * 前端设置 header: X-Tenant-Override: 123
 * 
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express next函数
 */
export function tenantSwitchMiddleware(req, res, next) {
  const user = req.user;
  
  // 仅超级管理员可以切换租户
  if (user && (user.role === 'super_admin' || user.role === 'superadmin')) {
    const overrideTenantId = req.headers['x-tenant-override'];
    
    if (overrideTenantId && overrideTenantId !== 'null') {
      const tenantId = parseInt(overrideTenantId, 10);
      
      if (Number.isFinite(tenantId) && tenantId > 0) {
        // 临时切换到指定租户
        req.tenantFilter = {
          where: 'company_id = ?',
          params: [tenantId]
        };
        req.tenantId = tenantId;
        req.tenantOverride = true; // 标记为临时切换
        
        console.log(`[Tenant] 超级管理员切换到租户: ${tenantId}`);
        return next();
      }
    }
  }
  
  // 未切换，继续正常流程
  next();
}

/**
 * 辅助函数：构建SQL WHERE子句
 * 
 * @param {Object} req - Express请求对象
 * @param {Array} additionalConditions - 额外的WHERE条件数组 ['status = ?', 'is_deleted = 0']
 * @param {Array} additionalParams - 额外的参数数组 ['active', 0]
 * @returns {Object} { where: string, params: array }
 * 
 * @example
 * const { where, params } = buildWhereClause(req, ['status = ?', 'is_deleted = 0'], ['active', 0]);
 * // 结果: { where: 'company_id = ? AND status = ? AND is_deleted = 0', params: [123, 'active', 0] }
 */
export function buildWhereClause(req, additionalConditions = [], additionalParams = []) {
  const { where, params } = req.tenantFilter || { where: '1=1', params: [] };
  
  const allConditions = [where, ...additionalConditions].filter(Boolean);
  const allParams = [...params, ...additionalParams];
  
  return {
    where: allConditions.join(' AND '),
    params: allParams
  };
}

/**
 * 辅助函数：为INSERT/UPDATE自动设置 company_id
 * 
 * @param {Object} req - Express请求对象
 * @param {Object} data - 要插入/更新的数据对象
 * @returns {Object} 添加了 company_id 的数据对象
 * 
 * @example
 * const data = setTenantId(req, { name: 'Test Order' });
 * // 结果: { name: 'Test Order', company_id: 123 }
 */
export function setTenantId(req, data) {
  // 超级管理员如果没有切换租户，不自动设置 company_id
  if (!req.tenantId) {
    return data;
  }
  
  return {
    ...data,
    company_id: req.tenantId
  };
}

export default {
  tenantMiddleware,
  sharedResourceMiddleware,
  tenantSwitchMiddleware,
  buildWhereClause,
  setTenantId
};
