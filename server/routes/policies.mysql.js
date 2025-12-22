import express, { Router } from 'express';
import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'node:crypto';
import multer from 'multer';

// 检测 equipments 表是否包含 custom_code 列，用于设备自编码映射
let HAS_CUSTOM_CODE_COL = null; // null=未知，true/false 已判定
async function ensureCustomCodeColumn(pool) {
  if (HAS_CUSTOM_CODE_COL !== null) return HAS_CUSTOM_CODE_COL;
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS cnt
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'equipments'
         AND COLUMN_NAME = 'custom_code'`
    );
    const cnt = Number((rows || [{}])[0]?.cnt || 0);
    HAS_CUSTOM_CODE_COL = cnt > 0;
  } catch (_) {
    HAS_CUSTOM_CODE_COL = false;
  }
  return HAS_CUSTOM_CODE_COL;
}

const ensureDir = (p) => {
  try { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); } catch (e) { console.error('[Policies] ensureDir error:', e); }
};

// 受限的附件类型与大小
const allowedMime = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
]);
const maxFileSize = 10 * 1024 * 1024; // 10MB

// 加密目录（不走静态访问）——Windows 下避免出现 "D:\\D:\\..." 拼接问题
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const secureBaseDir = path.join(__dirname, '..', 'secure_uploads', 'policies');
ensureDir(secureBaseDir);

// 简单权限控制占位（当前允许所有请求，通过后续集成鉴权完善）
const requireAuth = (_req, _res, next) => { next(); };

// 生成 AES-256-GCM 密钥（从环境变量派生）
function getCipherKey() {
  const secret = process.env.POLICY_FILES_SECRET || process.env.APP_SECRET || 'default-insecure-secret';
  return crypto.createHash('sha256').update(String(secret)).digest(); // 32 bytes
}

function buildListWhereAndParams(q) {
  const where = [];
  const params = [];
  if (q.number) { where.push('number LIKE ?'); params.push(`%${q.number}%`); }
  if (q.company) { where.push('company LIKE ?'); params.push(`%${q.company}%`); }
  if (q.startDateFrom) { where.push('start_date >= ?'); params.push(q.startDateFrom); }
  if (q.startDateTo) { where.push('start_date <= ?'); params.push(q.startDateTo); }
  if (q.endDateFrom) { where.push('end_date >= ?'); params.push(q.endDateFrom); }
  if (q.endDateTo) { where.push('end_date <= ?'); params.push(q.endDateTo); }
  const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';
  // 支持按保单编号、公司、开始/结束日期排序，默认按结束日期
  const sortBy = (q.sortBy === 'company')
    ? 'company'
    : (q.sortBy === 'start_date'
      ? 'start_date'
      : (q.sortBy === 'number'
        ? 'number'
        : 'end_date'));
  const sortOrder = (String(q.sortOrder).toLowerCase() === 'asc') ? 'ASC' : 'DESC';
  return { whereSql, params, sortSql: `ORDER BY ${sortBy} ${sortOrder}` };
}

export default function buildPoliciesRouterMySQL(pool) {
  const router = Router();

  // 配置Multer用于文件上传
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, secureBaseDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
      const ext = path.extname(file.originalname);
      cb(null, `policy-${uniqueSuffix}${ext}`);
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: maxFileSize },
    fileFilter: (req, file, cb) => {
      if (allowedMime.has(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('不支持的文件类型'));
      }
    }
  });

  // 列表（分页、查询、排序）
  router.get('/', async (req, res) => {
    try {
      const { page = '1', pageSize = '10' } = req.query;
      const p = Math.max(1, Number(page));
      const ps = Math.min(100, Math.max(1, Number(pageSize)));
      const { whereSql, params, sortSql } = buildListWhereAndParams(req.query);
      const [rows] = await pool.query(`SELECT SQL_CALC_FOUND_ROWS * FROM insurance_policies ${whereSql} ${sortSql} LIMIT ? OFFSET ?`, [...params, ps, (p - 1) * ps]);
      const [totalRows] = await pool.query('SELECT FOUND_ROWS() AS total');
      const total = Number(totalRows?.[0]?.total || 0);
      // 关联设备（聚合简化）
      const policyIds = rows.map(r => r.id);
      let equipsByPolicy = new Map();
      if (policyIds.length) {
        const hasCustom = await ensureCustomCodeColumn(pool);
        const selectCols = hasCustom
          ? 'pd.policy_id, e.id AS equipment_id, e.serial_no, e.custom_code'
          : 'pd.policy_id, e.id AS equipment_id, e.serial_no';
        const [ers] = await pool.query(
          `SELECT ${selectCols} FROM policy_devices pd LEFT JOIN equipments e ON pd.device_id = e.id WHERE pd.policy_id IN (?)`,
          [policyIds]
        );
        const ersArr = ers || [];
        equipsByPolicy = new Map();
        ersArr.forEach(r => {
          const list = equipsByPolicy.get(r.policy_id) || [];
          list.push({
            id: r.equipment_id,
            serial_no: r.serial_no,
            code: r.serial_no || '',
            customCode: hasCustom ? (r.custom_code || null) : null,
          });
          equipsByPolicy.set(r.policy_id, list);
        });
        try { const sample = Array.from(equipsByPolicy.values())[0]?.[0]; console.log('[Policies.MySQL] Equip sample', sample); } catch (_) {}
      }
      // 查询附件信息
      let attachmentsByPolicy = new Map();
      if (policyIds.length) {
        const [attRows] = await pool.query(
          `SELECT policy_id, id, name, mime_type, size FROM policy_attachments WHERE policy_id IN (?)`,
          [policyIds]
        );
        (attRows || []).forEach(att => {
          const list = attachmentsByPolicy.get(att.policy_id) || [];
          list.push({
            id: att.id,
            name: att.name,
            mime_type: att.mime_type,
            size: att.size
          });
          attachmentsByPolicy.set(att.policy_id, list);
        });
      }

      const data = rows.map(r => ({
        id: r.id,
        number: r.number,
        company: r.company,
        rate: Number(r.rate),
        start_date: dayjs(r.start_date).format('YYYY-MM-DD'),
        end_date: dayjs(r.end_date).format('YYYY-MM-DD'),
        equipments: (equipsByPolicy.get(r.id) || []).map(eq => ({
          ...eq,
          custom_code: eq.customCode // 添加custom_code字段
        })),
        equipment_count: (equipsByPolicy.get(r.id) || []).length,
        attachments: attachmentsByPolicy.get(r.id) || [],
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));
      res.json({ ok: true, data, page: p, pageSize: ps, total });
    } catch (err) {
      console.error('[Policies.MySQL] List error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'List error' });
    }
  });

  // 详情
  router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const [[row]] = await pool.query('SELECT * FROM insurance_policies WHERE id=?', [id]);
      if (!row) return res.status(404).json({ ok: false, error: 'Policy not found' });
      const hasCustom = await ensureCustomCodeColumn(pool);
      const selectCols = hasCustom ? 'e.id, e.serial_no, e.custom_code' : 'e.id, e.serial_no';
      const [ers] = await pool.query(
        `SELECT ${selectCols} FROM policy_devices pd LEFT JOIN equipments e ON pd.device_id = e.id WHERE pd.policy_id=?`,
        [id]
      );
      const enriched = (ers || []).map(r => ({
        id: r.id,
        serial_no: r.serial_no,
        code: r.serial_no || '',
        customCode: hasCustom ? (r.custom_code || null) : null,
      }));
      const [atts] = await pool.query('SELECT id, name, mime_type, size FROM policy_attachments WHERE policy_id=? ORDER BY id DESC', [id]);
      res.json({ ok: true, data: {
        id: row.id,
        number: row.number,
        company: row.company,
        rate: Number(row.rate),
        startDate: dayjs(row.start_date).format('YYYY-MM-DD'),
        endDate: dayjs(row.end_date).format('YYYY-MM-DD'),
        equipments: enriched || [],
        attachments: atts || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }});
    } catch (err) {
      console.error('[Policies.MySQL] Detail error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Get error' });
    }
  });

  function validatePayload(b) {
    console.log('[Policies.MySQL] Validating payload:', JSON.stringify(b, null, 2));
    
    const number = String(b.number || '').trim();
    const company = String(b.company || '').trim();
    const rate = Number(b.rate);
    // 支持驼峰式和下划线式两种命名方式
    const startDate = String(b.startDate || b.start_date || '').trim();
    const endDate = String(b.endDate || b.end_date || '').trim();
    
    if (!number) throw new Error('保单编号为必填');
    if (number.length > 64) throw new Error('保单编号长度不能超过64字符');
    if (!company) throw new Error('投保公司为必填');
    if (isNaN(rate) || rate < 0 || rate > 100) throw new Error('费率需在0-100之间');
    if (!startDate || !endDate) throw new Error('保单起止日期为必填');
    
    const sd = dayjs(startDate);
    const ed = dayjs(endDate);
    if (!sd.isValid() || !ed.isValid()) throw new Error('日期格式错误');
    if (sd.isAfter(ed)) throw new Error('开始日期不能晚于结束日期');
    
    // 注释掉结束日期不能早于当前日期的检查，允许创建历史保单
    // const today = dayjs().startOf('day');
    // if (ed.isBefore(today)) throw new Error('结束日期不能早于当前日期');
    
    // 支持驼峰式和下划线式两种命名方式以及数组字符串
    let equipmentIds = [];
    if (Array.isArray(b.equipmentIds || b.equipment_ids)) {
      equipmentIds = (b.equipmentIds || b.equipment_ids).map(Number).filter(Boolean);
    } else if (b['equipment_ids[]']) {
      // 处理表单数据中的数组格式
      const ids = Array.isArray(b['equipment_ids[]']) ? b['equipment_ids[]'] : [b['equipment_ids[]']];
      equipmentIds = ids.map(Number).filter(Boolean);
    }
    
    return { number, company, rate: Number(rate.toFixed(2)), startDate: sd.format('YYYY-MM-DD'), endDate: ed.format('YYYY-MM-DD'), equipmentIds };
  }

  // 新增（事务保证原子性）- 支持文件上传
  router.post('/', upload.array('attachments', 5), async (req, res) => {
    console.log('[Policies.MySQL] POST / - Raw body keys:', Object.keys(req.body));
    console.log('[Policies.MySQL] POST / - Request body:', req.body);
    console.log('[Policies.MySQL] POST / - Files:', req.files?.length || 0);
    
    const b = req.body || {};
    const files = req.files || [];
    
    // 检查必填字段是否存在
    console.log('[Policies.MySQL] number:', b.number, 'type:', typeof b.number);
    console.log('[Policies.MySQL] company:', b.company);
    console.log('[Policies.MySQL] rate:', b.rate);
    console.log('[Policies.MySQL] start_date:', b.start_date);
    console.log('[Policies.MySQL] end_date:', b.end_date);
    
    const conn = await pool.getConnection();
    try {
      const v = validatePayload(b);
      const now = new Date();
      await conn.beginTransaction();
      // 编号唯一性预检
      try {
        const [[dup]] = await conn.query('SELECT id FROM insurance_policies WHERE number = ? LIMIT 1', [v.number]);
        if (dup && dup.id) {
          await conn.rollback();
          // 清理已上传的文件
          files.forEach(f => {
            try { fs.unlinkSync(f.path); } catch (_) {}
          });
          return res.status(409).json({ ok: false, error: '保单编号已存在' });
        }
      } catch (_) {}
      const [insertResult] = await conn.query(
        'INSERT INTO insurance_policies (number, company, rate, start_date, end_date, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
        [v.number, v.company, v.rate, v.startDate, v.endDate, now, now]
      );
      const id = Number(insertResult?.insertId || 0);
      if (!id) {
        await conn.rollback();
        // 清理已上传的文件
        files.forEach(f => {
          try { fs.unlinkSync(f.path); } catch (_) {}
        });
        return res.status(500).json({ ok: false, error: 'Create failed' });
      }
      if (v.equipmentIds.length) {
        const values = v.equipmentIds.map(eid => [id, eid, now]);
        await conn.query('INSERT INTO policy_devices (policy_id, device_id, created_at) VALUES ?', [values]);
      }
      
      // 保存附件信息
      if (files.length > 0) {
        const attachmentValues = files.map(file => {
          // 加密文件
          const key = getCipherKey();
          const iv = crypto.randomBytes(16);
          const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
          
          const inputData = fs.readFileSync(file.path);
          const encrypted = Buffer.concat([cipher.update(inputData), cipher.final()]);
          const authTag = cipher.getAuthTag();
          
          // 保存加密文件
          const encryptedPath = file.path + '.enc';
          fs.writeFileSync(encryptedPath, encrypted);
          fs.unlinkSync(file.path); // 删除原始文件
          
          return [
            id,
            file.originalname,
            file.mimetype,
            file.size,
            path.basename(encryptedPath),
            iv,
            authTag,
            now
          ];
        });
        
        await conn.query(
          'INSERT INTO policy_attachments (policy_id, name, mime_type, size, storage_path, iv, auth_tag, created_at) VALUES ?',
          [attachmentValues]
        );
        
        console.log(`[Policies.MySQL] Uploaded ${files.length} attachments for policy ${id}`);
      }
      
      await conn.commit();
      res.json({ ok: true, id });
      try { req.app?.locals?.broadcast?.({ type: 'policy.created', policyId: id }); } catch (_) {}
    } catch (err) {
      try { await conn.rollback(); } catch (_) {}
      // 清理已上传的文件
      files.forEach(f => {
        try { fs.unlinkSync(f.path); } catch (_) {}
        try { fs.unlinkSync(f.path + '.enc'); } catch (_) {}
      });
      const msg = err?.message || '';
      if (String(err?.code).includes('ER_DUP_ENTRY') || /重复|已存在/.test(msg)) {
        return res.status(409).json({ ok: false, error: '保单编号已存在' });
      }
      console.error('[Policies.MySQL] Create error:', err);
      res.status(400).json({ ok: false, error: err?.message || 'Create error' });
    } finally {
      try { conn.release(); } catch (_) {}
    }
  });

  // 更新（事务保证原子性）
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const b = req.body || {};
    const conn = await pool.getConnection();
    try {
      const v = validatePayload(b);
      const now = new Date();
      await conn.beginTransaction();
      const [r] = await conn.query('UPDATE insurance_policies SET number=?, company=?, rate=?, start_date=?, end_date=?, updated_at=? WHERE id=?',[v.number, v.company, v.rate, v.startDate, v.endDate, now, id]);
      if (!r.affectedRows) {
        await conn.rollback();
        return res.status(404).json({ ok: false, error: 'Policy not found' });
      }
      // 重置设备关联
      await conn.query('DELETE FROM policy_devices WHERE policy_id=?', [id]);
      if (v.equipmentIds.length) {
        const values = v.equipmentIds.map(eid => [id, eid, now]);
        await conn.query('INSERT INTO policy_devices (policy_id, device_id, created_at) VALUES ?', [values]);
      }
      await conn.commit();
      res.json({ ok: true });
      try { req.app?.locals?.broadcast?.({ type: 'policy.updated', policyId: Number(id) }); } catch (_) {}
    } catch (err) {
      try { await conn.rollback(); } catch (_) {}
      const msg = err?.message || '';
      if (String(err?.code).includes('ER_DUP_ENTRY') || /重复|已存在/.test(msg)) {
        return res.status(409).json({ ok: false, error: '保单编号已存在' });
      }
      res.status(400).json({ ok: false, error: err?.message || 'Update error' });
    } finally {
      try { conn.release(); } catch (_) {}
    }
  });

  // 删除
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const [r] = await pool.query('DELETE FROM insurance_policies WHERE id=?',[id]);
      if (!r.affectedRows) return res.status(404).json({ ok: false, error: 'Policy not found' });
      // 关联表使用 ON DELETE CASCADE 删除
      res.json({ ok: true });
      try { req.app?.locals?.broadcast?.({ type: 'policy.deleted', policyId: Number(id) }); } catch (_) {}
    } catch (err) {
      res.status(500).json({ ok: false, error: err?.message || 'Delete error' });
    }
  });

  // 附件上传（加密存储）- 使用上面定义的upload配置
  router.post('/:id/attachments', requireAuth, upload.single('file'), async (req, res) => {
    const { id } = req.params;
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ ok: false, error: 'No file uploaded' });
      const [[row]] = await pool.query('SELECT id FROM insurance_policies WHERE id=?', [id]);
      if (!row) return res.status(404).json({ ok: false, error: 'Policy not found' });
      const key = getCipherKey();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const enc = Buffer.concat([cipher.update(file.buffer), cipher.final()]);
      const authTag = cipher.getAuthTag();
      const safeName = String(file.originalname).replace(/[^a-zA-Z0-9_.-]/g, '_');
      const ts = Date.now();
      const dir = path.join(secureBaseDir, String(id));
      ensureDir(dir);
      const storagePath = path.join(dir, `${ts}_${safeName}.enc`);
      await fs.promises.writeFile(storagePath, enc);
      const now = new Date();
      const [attInsert] = await pool.query(
        'INSERT INTO policy_attachments (policy_id, name, mime_type, size, storage_path, iv, auth_tag, created_at) VALUES (?,?,?,?,?,?,?,?)',
        [id, file.originalname, file.mimetype, file.size, storagePath, iv, authTag, now]
      );
      const attId = Number(attInsert?.insertId || 0);
      res.json({ ok: true, file: { id: attId, name: file.originalname, size: file.size, type: file.mimetype } });
    } catch (err) {
      console.error('[Policies.MySQL] Upload error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Upload error' });
    }
  });

  // 附件下载（解密流）
  // 下载附件
  const downloadAttachment = async (req, res) => {
    const { id, attId } = req.params;
    try {
      const [[att]] = await pool.query('SELECT * FROM policy_attachments WHERE id=? AND policy_id=?',[attId, id]);
      if (!att) return res.status(404).json({ ok: false, error: 'Attachment not found' });
      
      const key = getCipherKey();
      const iv = Buffer.from(att.iv);
      const authTag = Buffer.from(att.auth_tag || '');
      
      // 读取加密文件
      const encFilePath = path.join(secureBaseDir, att.storage_path);
      if (!fs.existsSync(encFilePath)) {
        return res.status(404).json({ ok: false, error: 'File not found' });
      }
      
      const encData = fs.readFileSync(encFilePath);
      
      // 解密
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      if (authTag?.length) decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(encData), decipher.final()]);
      
      // 返回文件
      res.setHeader('Content-Type', att.mime_type);
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(att.name)}`);
      res.send(decrypted);
    } catch (err) {
      console.error('[Policies.MySQL] Attachment download error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Download error' });
    }
  };

  router.get('/:id/attachments/:attId', requireAuth, downloadAttachment);
  router.get('/:id/attachments/:attId/download', requireAuth, downloadAttachment);

  // 转发（系统消息 + 邮件占位）
  router.post('/:id/forward', async (req, res) => {
    const { id } = req.params;
    const { toEmails = [] } = req.body || {};
    try {
      const [[row]] = await pool.query('SELECT * FROM insurance_policies WHERE id=?',[id]);
      if (!row) return res.status(404).json({ ok: false, error: 'Policy not found' });
      req.app?.locals?.broadcast?.({ type: 'policy.forwarded', policyId: Number(id), company: row.company, endDate: row.end_date });
      // 邮件占位：实际集成 SMTP 后实现
      console.log('[Policies.Forward] Emails:', toEmails);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err?.message || 'Forward error' });
    }
  });

  return router;
}