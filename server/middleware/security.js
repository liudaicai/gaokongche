import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

/**
 * 安全头中间件配置
 */
export function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  });
}

/**
 * 速率限制配置
 */
export function createRateLimiter(options = {}) {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15分钟
  const max = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

  return rateLimit({
    windowMs,
    max,
    message: { 
      ok: false, 
      error: 'Too many requests, please try again later.' 
    },
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
  });
}

/**
 * 严格的速率限制 - 用于登录等敏感操作
 */
export function strictRateLimiter() {
  // 开发环境禁用速率限制，生产环境启用
  if (process.env.NODE_ENV === 'development') {
    return (req, res, next) => next();
  }
  return createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 20, // 最多20次请求
    message: { 
      ok: false, 
      error: 'Too many attempts, please try again after 15 minutes.' 
    },
  });
}

/**
 * CORS 配置
 */
export function corsMiddleware() {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:5176',
        'http://localhost:5177',
      ];

  return cors({
    origin: (origin, callback) => {
      // 允许没有 origin 的请求（如移动应用、Postman）
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
}
