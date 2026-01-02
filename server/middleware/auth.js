import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-please-change';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * 生成 JWT token
 * @param {Object} payload - 用户信息 { id, username, role }
 * @returns {string} JWT token
 */
export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * 验证 JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} 解码后的用户信息，验证失败返回 null
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * JWT 认证中间件
 * 从 Authorization header 中提取 token 并验证
 */
export function authMiddleware(req, res, next) {
  console.log('[AuthMiddleware] 请求路径:', req.method, req.originalUrl);
  console.log('[AuthMiddleware] Authorization 头:', req.headers.authorization?.substring(0, 30) + '...');
  
  // 从 Authorization header 获取 token
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[AuthMiddleware] ❌ 无有效的 Authorization 头');
    return res.status(401).json({ 
      ok: false, 
      error: 'No token provided. Please login.' 
    });
  }

  const token = authHeader.substring(7); // 移除 'Bearer ' 前缀
  console.log('[AuthMiddleware] Token:', token.substring(0, 20) + '...');
  
  const decoded = verifyToken(token);

  if (!decoded) {
    console.log('[AuthMiddleware] ❌ Token 验证失败');
    return res.status(401).json({ 
      ok: false, 
      error: 'Invalid or expired token. Please login again.' 
    });
  }

  console.log('[AuthMiddleware] ✅ Token 验证成功, 用户:', decoded);
  
  // 将用户信息附加到 request 对象上
  req.user = decoded;
  
  // ✅ 多租户和超管限制已完全移除 (2025-12-21)
  // 单租户系统：所有登录用户都有完整权限
  
  next();
}

/**
 * 可选的认证中间件 - token 无效时也放行，但会设置 req.user
 */
export function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  
  next();
}

/**
 * 角色验证中间件工厂
 * @param {string[]} allowedRoles - 允许的角色列表
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        ok: false, 
        error: '未登录，请先登录' 
      });
    }

    const userRole = req.user.role;
    
    // 检查用户角色是否在允许的角色列表中
    if (!allowedRoles.includes(userRole)) {
      console.log(`[RequireRole] ❌ 权限不足: 用户角色=${userRole}, 需要角色=${allowedRoles.join('|')}`);
      return res.status(403).json({ 
        ok: false, 
        error: `权限不足，需要 ${allowedRoles.join(' 或 ')} 权限` 
      });
    }

    console.log(`[RequireRole] ✅ 权限验证通过: 用户角色=${userRole}`);
    next();
  };
}

/**
 * 超级管理员验证中间件
 * 只允许超级管理员访问
 */
export function requireSuperAdmin(req, res, next) {
  return requireRole('super_admin', 'superadmin')(req, res, next);
}
