import express from 'express';
import bcrypt from 'bcryptjs';
import { generateToken, verifyToken } from '../middleware/auth.js';
import { validate, loginSchema } from '../utils/validators.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { strictRateLimiter } from '../middleware/security.js';

/**
 * 构建认证路由
 */
export default function buildAuthRouter(pool) {
  const router = express.Router();

  /**
   * POST /api/auth/login
   * 用户登录
   */
  router.post(
    '/login',
    // strictRateLimiter(), // 开发环境临时禁用，避免频繁登录失败时被限流
    asyncHandler(async (req, res) => {
      // 从请求体中获取用户名和密码（验证中间件）
      const { username, password } = req.body || {};

      // 验证必填字段
      if (!username || !password) {
        return res.status(400).json({
          ok: false,
          error: 'Username and password are required',
        });
      }

      // 验证最小长度
      if (username.length < 3 || password.length < 6) {
        return res.status(400).json({
          ok: false,
          error: 'Validation failed',
          details: [
            ...(username.length < 3 ? [{ field: 'username', message: '"username" length must be at least 3 characters long' }] : []),
            ...(password.length < 6 ? [{ field: 'password', message: '"password" length must be at least 6 characters long' }] : []),
          ],
        });
      }
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      try {
        // 从数据库查询用户（联表查询公司名称）
        const [rows] = await pool.query(
          `SELECT u.id, u.username, u.password_hash, u.role, u.name, u.email, u.phone, u.company_id,
                  u.is_active, u.is_locked, u.failed_login_attempts,
                  cv.company_name as company_name
           FROM users u
           LEFT JOIN company_verifications cv ON u.company_id = cv.id
           WHERE u.username = ?`,
          [username]
        );

        const user = rows[0];

        // 用户不存在或未激活
        if (!user || !user.is_active) {
          // 记录失败的登录尝试
          await pool.query(
            `INSERT INTO audit_logs (username, action, resource_type, ip_address, user_agent, status, error_message)
             VALUES (?, 'login', 'user', ?, ?, 'failed', 'User not found or inactive')`,
            [username, ipAddress, userAgent]
          );

          return res.status(401).json({
            ok: false,
            error: '用户名或密码错误',
          });
        }

        // 账号被锁定
        if (user.is_locked) {
          await pool.query(
            `INSERT INTO audit_logs (user_id, username, action, resource_type, ip_address, user_agent, status, error_message)
             VALUES (?, ?, 'login', 'user', ?, ?, 'failed', 'Account locked')`,
            [user.id, username, ipAddress, userAgent]
          );

          return res.status(403).json({
            ok: false,
            error: '账号已被锁定，请联系管理员',
          });
        }

        // 验证密码
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
          // 增加失败次数
          const newFailedAttempts = user.failed_login_attempts + 1;
          const shouldLock = newFailedAttempts >= 5;

          await pool.query(
            `UPDATE users 
             SET failed_login_attempts = ?, is_locked = ? 
             WHERE id = ?`,
            [newFailedAttempts, shouldLock ? 1 : 0, user.id]
          );

          // 记录失败的登录尝试
          await pool.query(
            `INSERT INTO audit_logs (user_id, username, action, resource_type, ip_address, user_agent, status, error_message)
             VALUES (?, ?, 'login', 'user', ?, ?, 'failed', ?)`,
            [user.id, username, ipAddress, userAgent,
            shouldLock ? 'Account locked due to too many failed attempts' : 'Invalid password']
          );

          if (shouldLock) {
            return res.status(403).json({
              ok: false,
              error: '密码错误次数过多，账号已被锁定',
            });
          }

          return res.status(401).json({
            ok: false,
            error: '用户名或密码错误',
          });
        }

        // 登录成功，重置失败次数
        await pool.query(
          `UPDATE users 
           SET failed_login_attempts = 0, last_login_at = NOW(), last_login_ip = ? 
           WHERE id = ?`,
          [ipAddress, user.id]
        );

        // 生成 token
        const token = generateToken({
          id: String(user.id),
          username: user.username,
          name: user.name || user.username,
          role: user.role,
          company_id: user.company_id,
        });

        // 创建会话记录（可选）
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天后
        await pool.query(
          `INSERT INTO user_sessions (user_id, token_jti, ip_address, user_agent, expires_at)
           VALUES (?, ?, ?, ?, ?)`,
          [user.id, `jti_${user.id}_${Date.now()}`, ipAddress, userAgent, expiresAt]
        );

        // 记录成功的登录
        await pool.query(
          `INSERT INTO audit_logs (user_id, username, action, resource_type, ip_address, user_agent, status)
           VALUES (?, ?, 'login', 'user', ?, ?, 'success')`,
          [user.id, username, ipAddress, userAgent]
        );

        res.json({
          ok: true,
          data: {
            token,
            user: {
              id: String(user.id),
              username: user.username,
              role: user.role,
              name: user.name,
              email: user.email,
              phone: user.phone,
              company_id: user.company_id,
              companyName: user.company_name,
            },
          },
        });

      } catch (error) {
        console.error('[Auth] Login error:', error);

        // 如果是数据库错误且提示表不存在，返回友好提示
        if (error.code === 'ER_NO_SUCH_TABLE') {
          return res.status(503).json({
            ok: false,
            error: '数据库未初始化，请先运行数据库迁移',
            hint: 'npm run db:migrate',
          });
        }

        throw error;
      }
    })
  );

  /**
   * POST /api/auth/logout
   * 用户登出（客户端删除token即可，服务端可选实现token黑名单）
   */
  router.post('/logout', (req, res) => {
    // 如果需要实现token黑名单，可以在这里添加
    res.json({
      ok: true,
      message: 'Logged out successfully',
    });
  });

  /**
   * GET /api/auth/me
   * 获取当前用户信息（需要认证）
   */
  router.get(
    '/me',
    asyncHandler(async (req, res) => {
      // 从 Authorization header 获取 token
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          ok: false,
          error: 'No token provided'
        });
      }

      const token = authHeader.substring(7);

      // 验证token（使用与generateToken相同的secret）
      const decoded = verifyToken(token);

      if (!decoded) {
        return res.status(401).json({
          ok: false,
          error: 'Invalid or expired token',
        });
      }

      // 从数据库获取用户详细信息（联表查询公司名称）
      const [rows] = await pool.query(
        `SELECT u.id, u.username, u.role, u.name, u.email, u.phone, u.company_id,
                c.name as company_name
         FROM users u
         LEFT JOIN companies c ON u.company_id = c.id
         WHERE u.id = ?`,
        [decoded.id]
      );

      const user = rows[0];
      if (!user) {
        return res.status(404).json({
          ok: false,
          error: 'User not found',
        });
      }

      res.json({
        ok: true,
        data: {
          id: String(user.id),
          username: user.username,
          role: user.role,
          name: user.name,
          email: user.email,
          phone: user.phone,
          company_id: user.company_id,
          companyName: user.company_name,
        },
      });
    })
  );

  return router;
}

/**
 * 工具函数：生成密码 hash
 * 可以在用户注册或重置密码时使用
 */
export async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * 工具函数：验证密码
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

