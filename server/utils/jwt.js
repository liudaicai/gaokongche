import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * 生成JWT token
 * @param {Object} payload - token载荷数据
 * @returns {string} JWT token
 */
export function generateToken(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

/**
 * 验证JWT token
 * @param {string} token - JWT token
 * @returns {Object} 解码后的payload
 * @throws {Error} token无效或过期
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token已过期，请重新登录');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('无效的Token');
    }
    throw error;
  }
}

/**
 * 从请求头中提取token
 * @param {Object} req - Express请求对象
 * @returns {string|null} token字符串或null
 */
export function extractToken(req) {
  // 支持多种token传递方式
  // 1. Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 2. Cookie中的token
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  // 3. 查询参数中的token（不推荐，仅用于特殊场景）
  if (req.query && req.query.token) {
    return req.query.token;
  }

  return null;
}

/**
 * 刷新token（生成新的token）
 * @param {string} oldToken - 旧的token
 * @returns {string} 新的token
 */
export function refreshToken(oldToken) {
  const decoded = verifyToken(oldToken);
  // 移除jwt自带的字段
  const { iat, exp, ...payload } = decoded;
  return generateToken(payload);
}

