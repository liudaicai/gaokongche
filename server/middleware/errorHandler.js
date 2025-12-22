import { logger } from '../utils/logger.js';

/**
 * 统一错误响应格式
 */
export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'ApiError';
  }
}

/**
 * 全局错误处理中间件
 */
export function errorHandler(err, req, res, next) {
  // 记录错误日志
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    user: req.user?.username || 'anonymous',
  });

  // 处理自定义 API 错误
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      ok: false,
      error: err.message,
      details: err.details,
    });
  }

  // 处理 JWT 错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      ok: false,
      error: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      ok: false,
      error: 'Token expired',
    });
  }

  // 处理验证错误
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      ok: false,
      error: 'Validation failed',
      details: err.details?.map(d => d.message),
    });
  }

  // 处理数据库错误
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      ok: false,
      error: 'Duplicate entry',
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      ok: false,
      error: 'Referenced entity does not exist',
    });
  }

  // 默认服务器错误
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(statusCode).json({
    ok: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * 404 错误处理
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    error: 'Route not found',
    path: req.path,
  });
}

/**
 * 异步路由处理器包装器 - 自动捕获异步错误
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
