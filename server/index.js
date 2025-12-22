import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载根目录的 .env 文件
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import { initMySQL } from './mysql.js';
import { authMiddleware } from './middleware/auth.js';
// ✅ 多租户已完全移除 (2025-12-21)
import buildUploadRouter from './routes/upload.js';
// MySQL 版本路由
import buildAuthRouter from './routes/auth.mysql.js';
import buildOrdersRouterMySQL from './routes/orders.mysql.js';
import buildOrderSuspensionsRouter from './routes/order-suspensions.mysql.js';
import buildCustomersRouter from './routes/customers.mysql.js';
import buildPoliciesRouter from './routes/policies.mysql.js';
import buildEquipmentsRouter from './routes/equipments.mysql.js';
import buildStoresRouter from './routes/stores.mysql.js';
import buildModelsRouter from './routes/models.mysql.js';
import buildLogisticsRouter from './routes/logistics.mysql.js';
import buildEquipmentRepairsRouter from './routes/equipment-repairs.mysql.js';
import buildEquipmentReplacementsRouter from './routes/equipment-replacements.mysql.js';
import buildCompaniesRouter from './routes/companies.mysql.js';
import buildUsersRouter from './routes/users.mysql.js';
import buildInvoicesRouter from './routes/invoices.mysql.js';
import buildEmployeesRouter from './routes/employees.mysql.js';
import ocrRouter from './routes/ocr.js';
import buildSubleaseRouter from './routes/sublease.mysql.js';
import buildDashboardRouter from './routes/dashboard.mysql.js';
import buildPartsRouter from './routes/parts.mysql.js';
import buildRemindersRouter from './routes/reminders.mysql.js';
import buildApprovalsRouter from './routes/approvals.mysql.js';
import buildApprovalConfigRouter from './routes/approval-config.mysql.js';
import buildDepartmentsRouter from './routes/departments.mysql.js';
import buildPositionsRouter from './routes/positions.mysql.js';
import buildEquipmentRentStatsRouter from './routes/equipment-rent-stats.mysql.js';
import buildEquipmentPurchasesRouter from './routes/equipment-purchases.mysql.js';

const app = express();
// 增加 body 大小限制，支持 OCR 图片上传（base64 图片较大）
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
  origin: (origin, callback) => {
    // 开发环境：允许本地访问
    const devOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'http://localhost:5177',
    ];

    // 生产环境：允许特定域名
    const prodOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];

    // 合并允许的来源
    const allowedOrigins = [...devOrigins, ...prodOrigins];

    // 如果没有 origin（如直接通过 IP 访问），允许
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Rejected origin: ${origin}`);
      callback(null, true); // 暂时允许，便于调试
    }
  },
  credentials: true,
}));

// 强制使用MySQL数据库
const mysql = await initMySQL();
// 暴露MySQL池到app.locals，便于路由中使用
app.locals.mysqlPool = mysql.pool;

// 静态资源：提供上传文件访问
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API健康检查
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// OCR 路由（在其他路由之前，避免被 404 捕获）
app.use('/api/ocr', ocrRouter);

// 数据库健康检查（需要在 OCR 路由之后）
app.get('/api/health/db', async (_req, res) => {
  try {
    const [rows] = await mysql.pool.query('SELECT 1');
    res.json({ ok: true, ts: Date.now(), db: 'MySQL' });
  } catch (err) {
    console.error('[DB Health] Error:', err);
    res.status(500).json({ ok: false, error: err.message || 'DB error' });
  }
});

// 实时事件（Server-Sent Events）
const sseClients = new Set();
function sendSse(res, event) {
  try {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  } catch (e) {
    // 如果写入失败，认为连接断开，移除客户端
    try { sseClients.delete(res); } catch (_) { }
  }
}
app.locals.broadcast = (event) => {
  // 统一事件结构，便于前端解析
  const payload = {
    ts: Date.now(),
    ...event,
  };
  for (const res of sseClients) {
    sendSse(res, payload);
  }
};
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // 允许CORS预检与跨源SSE
  try {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  } catch (_) { }
  res.flushHeaders?.();

  // 初始握手事件（可选）
  sendSse(res, { type: 'sse.connected', ts: Date.now() });
  sseClients.add(res);

  // 心跳保持连接（防止中间代理超时）
  const heartbeat = setInterval(() => {
    try { res.write(':heartbeat\n\n'); } catch (_) { }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// 业务路由（所有都是MySQL）
// 认证
app.use('/api/auth', (req, res, next) => { console.log('[Hit] auth mount', req.method, req.originalUrl); next(); }, buildAuthRouter(mysql.pool));

// 订单相关
const ordersRouter = buildOrdersRouterMySQL(mysql.pool);
app.use('/api/orders', authMiddleware, (req, res, next) => { console.log('[Hit] orders mount', req.method, req.originalUrl); next(); }, ordersRouter);
app.use('/api/orders/:orderId/suspensions', authMiddleware, (req, res, next) => { console.log('[Hit] order-suspensions mount', req.method, req.originalUrl); next(); }, buildOrderSuspensionsRouter(mysql.pool));

// 基础数据
const customersRouter = buildCustomersRouter(mysql.pool);
app.use('/api/customers', authMiddleware, (req, res, next) => { console.log('[Hit] customers mount', req.method, req.originalUrl); next(); }, customersRouter);
app.use('/api/policies', authMiddleware, (req, res, next) => { console.log('[Hit] policies mount', req.method, req.originalUrl); next(); }, buildPoliciesRouter(mysql.pool));
app.use('/api/equipments', authMiddleware, (req, res, next) => { console.log('[Hit] equipments mount', req.method, req.originalUrl); next(); }, buildEquipmentsRouter(mysql.pool));
app.use('/api/devices', authMiddleware, (req, res, next) => { console.log('[Hit] devices mount', req.method, req.originalUrl); next(); }, buildEquipmentsRouter(mysql.pool));
app.use('/api/stores', authMiddleware, (req, res, next) => { console.log('[Hit] stores mount', req.method, req.originalUrl); next(); }, buildStoresRouter(mysql.pool));
app.use('/api/models', authMiddleware, (req, res, next) => { console.log('[Hit] models mount', req.method, req.originalUrl); next(); }, buildModelsRouter(mysql.pool));
app.use('/api/logistics', authMiddleware, (req, res, next) => { console.log('[Hit] logistics mount', req.method, req.originalUrl); next(); }, buildLogisticsRouter(mysql.pool));
app.use('/api/equipment-repairs', authMiddleware, (req, res, next) => { console.log('[Hit] equipment-repairs mount', req.method, req.originalUrl); next(); }, buildEquipmentRepairsRouter(mysql.pool));
app.use('/api/equipment-replacements', authMiddleware, (req, res, next) => { console.log('[Hit] equipment-replacements mount', req.method, req.originalUrl); next(); }, buildEquipmentReplacementsRouter(mysql.pool));
app.use('/api/companies', authMiddleware, (req, res, next) => { console.log('[Hit] companies mount', req.method, req.originalUrl); next(); }, buildCompaniesRouter(mysql.pool));
app.use('/api/users', authMiddleware, (req, res, next) => { console.log('[Hit] users mount', req.method, req.originalUrl); next(); }, buildUsersRouter(mysql.pool));
app.use('/api/employees', authMiddleware, (req, res, next) => { console.log('[Hit] employees mount', req.method, req.originalUrl); next(); }, buildEmployeesRouter(mysql.pool));
app.use('/api/invoices', authMiddleware, (req, res, next) => { console.log('[Hit] invoices mount', req.method, req.originalUrl); next(); }, buildInvoicesRouter(mysql.pool));
app.use('/api/sublease', authMiddleware, (req, res, next) => { console.log('[Hit] sublease mount', req.method, req.originalUrl); next(); }, buildSubleaseRouter(mysql.pool));
app.use('/api/dashboard', authMiddleware, (req, res, next) => { console.log('[Hit] dashboard mount', req.method, req.originalUrl); next(); }, buildDashboardRouter(mysql.pool));
app.use('/api/equipment-rent-stats', authMiddleware, (req, res, next) => { console.log('[Hit] equipment-rent-stats mount', req.method, req.originalUrl); next(); }, buildEquipmentRentStatsRouter(mysql.pool));
app.use('/api/equipment-purchases', authMiddleware, (req, res, next) => { console.log('[Hit] equipment-purchases mount', req.method, req.originalUrl); next(); }, buildEquipmentPurchasesRouter(mysql.pool));
app.use('/api/parts', authMiddleware, (req, res, next) => { console.log('[Hit] parts mount', req.method, req.originalUrl); next(); }, buildPartsRouter(mysql.pool));
app.use('/api/reminders', authMiddleware, (req, res, next) => { console.log('[Hit] reminders mount', req.method, req.originalUrl); next(); }, buildRemindersRouter(mysql.pool));
app.use('/api/approvals', authMiddleware, (req, res, next) => { console.log('[Hit] approvals mount', req.method, req.originalUrl); next(); }, buildApprovalsRouter(mysql.pool));
app.use('/api/approval-config', authMiddleware, (req, res, next) => { console.log('[Hit] approval-config mount', req.method, req.originalUrl); next(); }, buildApprovalConfigRouter(mysql.pool));
app.use('/api/departments', authMiddleware, (req, res, next) => { console.log('[Hit] departments mount', req.method, req.originalUrl); next(); }, buildDepartmentsRouter(mysql.pool));
app.use('/api/positions', authMiddleware, (req, res, next) => { console.log('[Hit] positions mount', req.method, req.originalUrl); next(); }, buildPositionsRouter(mysql.pool));

app.use('/api/upload', buildUploadRouter());

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server listening at http://0.0.0.0:${PORT}`);
});