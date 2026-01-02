/**
 * 印章管理路由 - MySQL
 * 用于管理操作证等证件所需的印章
 * ✅ 多租户支持：通过 tenantMiddleware 自动过滤 company_id
 */
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { tenantMiddleware, setTenantId, buildWhereClause } from '../middleware/tenant.js';

export default function buildSealsRouter(pool) {
  const router = express.Router();

  // 配置文件上传
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      // 从项目根目录（server 的上级目录）创建 uploads 目录
      const uploadDir = path.join(process.cwd(), 'uploads', 'seals');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'seal-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|svg/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      }
      cb(new Error('只允许上传图片文件！'));
    }
  });

  // ==================== 印章列表（分页、搜索、筛选） ====================
  router.get('/', tenantMiddleware, async (req, res) => {
    try {
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 10;
      const offset = (page - 1) * pageSize;
      const search = req.query.search || '';
      const type = req.query.type || '';
      const isActive = req.query.isActive;
      
      // ✅ 多租户过滤：使用中间件注入的条件
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;
      let whereClause = `WHERE deleted_at IS NULL AND ${tenantWhere}`;
      const params = [...tenantParams];
      
      // 搜索条件（名称、描述）
      if (search) {
        whereClause += ' AND (name LIKE ? OR description LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern);
      }
      
      // 印章类型过滤
      if (type) {
        whereClause += ' AND type = ?';
        params.push(type);
      }
      
      // 启用状态过滤
      if (isActive !== undefined && isActive !== '') {
        whereClause += ' AND is_active = ?';
        params.push(isActive === 'true' || isActive === '1' ? 1 : 0);
      }
      
      // 查询总数
      const [countRows] = await pool.query(
        `SELECT COUNT(*) as total FROM seals ${whereClause}`,
        params
      );
      const total = countRows[0]?.total || 0;
      
      // 查询列表
      const [rows] = await pool.query(
        `SELECT 
          id, name, type, description, image_url, image_width, image_height,
          file_size, format, is_active, usage_count, last_used_at,
          company_id, created_at, updated_at
         FROM seals
         ${whereClause}
         ORDER BY is_active DESC, created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
      
      // 处理数据
      const data = rows.map(row => ({
        ...row,
        isActive: Boolean(row.is_active)
      }));
      
      res.json({
        ok: true,
        data,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      });
    } catch (err) {
      console.error('[Seals.MySQL] List error:', err);
      res.status(500).json({ ok: false, error: err?.message || '获取印章列表失败' });
    }
  });

  // ==================== 统计信息 ====================
  router.get('/stats', tenantMiddleware, async (req, res) => {
    try {
      // ✅ 使用租户过滤
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;
      const whereClause = `WHERE deleted_at IS NULL AND ${tenantWhere}`;
      const params = [...tenantParams];
      
      const [stats] = await pool.query(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as activeCount,
          SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactiveCount,
          SUM(usage_count) as totalUsage
        FROM seals 
        ${whereClause}`,
        params
      );
      
      // 按类型统计
      const [typeStats] = await pool.query(
        `SELECT 
          type,
          COUNT(*) as count
        FROM seals 
        ${whereClause}
        GROUP BY type`,
        params
      );
      
      res.json({ 
        ok: true, 
        data: {
          ...stats[0],
          byType: typeStats
        }
      });
    } catch (err) {
      console.error('[Seals.MySQL] Stats error:', err);
      res.status(500).json({ ok: false, error: err?.message || '获取统计信息失败' });
    }
  });

  // ==================== 获取印章类型列表 ====================
  router.get('/types', async (req, res) => {
    try {
      const types = [
        { value: 'official', label: '公章' },
        { value: 'finance', label: '财务章' },
        { value: 'hr', label: '人事章' },
        { value: 'equipment', label: '设备章' }
      ];
      
      res.json({ ok: true, data: types });
    } catch (err) {
      console.error('[Seals.MySQL] Types error:', err);
      res.status(500).json({ ok: false, error: err?.message || '获取印章类型失败' });
    }
  });

  // ==================== 上传印章图片 ====================
  router.post('/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ ok: false, error: '请选择要上传的文件' });
      }

      const originalPath = req.file.path;
      const processedFilename = 'processed-' + req.file.filename.replace(/\.(jpg|jpeg|gif|bmp)$/i, '.png');
      const processedPath = path.join(process.cwd(), 'uploads', 'seals', processedFilename);

      try {
        console.log('[Seals] 开始处理图片，去除白色背景:', originalPath);
        
        // 读取原始图片并处理
        const imageBuffer = await sharp(originalPath)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        
        const { data, info } = imageBuffer;
        const { width, height, channels } = info;
        
        console.log('[Seals] 图片信息:', { width, height, channels });
        
        // 创建新的 RGBA 数据
        const pixelCount = width * height;
        const newData = Buffer.alloc(pixelCount * 4);
        
        // 遍历每个像素
        for (let i = 0; i < pixelCount; i++) {
          const offset = i * channels;
          const r = data[offset];
          const g = data[offset + 1];
          const b = data[offset + 2];
          const a = channels === 4 ? data[offset + 3] : 255;
          
          // 判断是否为白色或浅色背景（可调整阈值）
          // 使用更宽松的阈值来捕获浅灰色等
          const brightness = (r + g + b) / 3;
          const isBackground = brightness > 235 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20;
          
          // 写入 RGBA 数据
          const newOffset = i * 4;
          newData[newOffset] = r;
          newData[newOffset + 1] = g;
          newData[newOffset + 2] = b;
          newData[newOffset + 3] = isBackground ? 0 : a; // 背景设为完全透明
        }
        
        // 保存为 PNG（带透明通道）
        await sharp(newData, {
          raw: {
            width,
            height,
            channels: 4
          }
        })
        .png({ compressionLevel: 9, palette: false }) // 确保使用完整的 RGBA
        .toFile(processedPath);
        
        console.log('[Seals] 图片处理完成，已保存:', processedPath);

        // 删除原始文件
        if (fs.existsSync(originalPath)) {
          fs.unlinkSync(originalPath);
        }

        // 获取处理后的文件信息
        const stats = fs.statSync(processedPath);
        const metadata = await sharp(processedPath).metadata();

        const fileUrl = `/uploads/seals/${processedFilename}`;
        const fileInfo = {
          url: fileUrl,
          filename: processedFilename,
          originalName: req.file.originalname,
          size: stats.size,
          mimetype: 'image/png',
          width: metadata.width,
          height: metadata.height
        };

        res.json({ ok: true, data: fileInfo });
      } catch (processErr) {
        console.error('[Seals.MySQL] Image processing error:', processErr);
        
        // 如果处理失败，使用原始文件
        const fileUrl = `/uploads/seals/${req.file.filename}`;
        const fileInfo = {
          url: fileUrl,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        };
        
        res.json({ ok: true, data: fileInfo, warning: '背景去除失败，使用原始图片' });
      }
    } catch (err) {
      console.error('[Seals.MySQL] Upload error:', err);
      res.status(500).json({ ok: false, error: err?.message || '上传失败' });
    }
  });

  // ==================== 创建印章 ====================
  router.post('/', tenantMiddleware, async (req, res) => {
    const {
      name,
      type = 'official',
      description,
      imageUrl,
      imageWidth,
      imageHeight,
      fileSize,
      format = 'PNG',
      isActive = true
    } = req.body;
    
    if (!name || !imageUrl) {
      return res.status(400).json({ ok: false, error: '印章名称和图片不能为空' });
    }
    
    try {
      // ✅ 从当前用户获取 company_id（多租户隔离）
      const companyId = req.user.company_id;
      
      const [result] = await pool.query(
        `INSERT INTO seals 
        (company_id, name, type, description, image_url, image_width, image_height,
         file_size, format, is_active, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          companyId, name, type, description || null, imageUrl, 
          imageWidth || null, imageHeight || null, fileSize || null, 
          format, isActive ? 1 : 0, req.user?.id || null
        ]
      );
      
      res.json({ ok: true, id: result.insertId });
    } catch (err) {
      console.error('[Seals.MySQL] Create error:', err);
      res.status(500).json({ ok: false, error: err?.message || '创建印章失败' });
    }
  });

  // ==================== 获取印章详情 ====================
  router.get('/:id', tenantMiddleware, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: '印章ID无效' });
    }
    
    try {
      // ✅ 多租户过滤
      const { where, params } = buildWhereClause(req, ['id = ?', 'deleted_at IS NULL'], [id]);
      
      const [rows] = await pool.query(
        `SELECT * FROM seals WHERE ${where}`,
        params
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ ok: false, error: '印章不存在' });
      }
      
      const seal = {
        ...rows[0],
        isActive: Boolean(rows[0].is_active)
      };
      
      res.json({ ok: true, data: seal });
    } catch (err) {
      console.error('[Seals.MySQL] Get detail error:', err);
      res.status(500).json({ ok: false, error: err?.message || '获取印章详情失败' });
    }
  });

  // ==================== 更新印章 ====================
  router.put('/:id', tenantMiddleware, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: '印章ID无效' });
    }
    
    const {
      name,
      type,
      description,
      imageUrl,
      imageWidth,
      imageHeight,
      fileSize,
      format,
      isActive
    } = req.body;
    
    try {
      // ✅ 多租户过滤：检查印章是否存在且属于当前租户
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;
      const [existing] = await pool.query(
        `SELECT id, company_id FROM seals WHERE id = ? AND deleted_at IS NULL AND ${tenantWhere}`,
        [id, ...tenantParams]
      );
      
      if (existing.length === 0) {
        return res.status(404).json({ ok: false, error: '印章不存在或无权访问' });
      }
      
      const updateFields = [];
      const updateValues = [];
      
      if (name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(name);
      }
      if (type !== undefined) {
        updateFields.push('type = ?');
        updateValues.push(type);
      }
      if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(description || null);
      }
      if (imageUrl !== undefined) {
        updateFields.push('image_url = ?');
        updateValues.push(imageUrl);
      }
      if (imageWidth !== undefined) {
        updateFields.push('image_width = ?');
        updateValues.push(imageWidth || null);
      }
      if (imageHeight !== undefined) {
        updateFields.push('image_height = ?');
        updateValues.push(imageHeight || null);
      }
      if (fileSize !== undefined) {
        updateFields.push('file_size = ?');
        updateValues.push(fileSize || null);
      }
      if (format !== undefined) {
        updateFields.push('format = ?');
        updateValues.push(format);
      }
      if (isActive !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(isActive ? 1 : 0);
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({ ok: false, error: '没有要更新的字段' });
      }
      
      // ✅ 多租户过滤：更新时包含租户条件（使用前面已声明的变量）
      updateValues.push(id);
      updateValues.push(...tenantParams);
      
      await pool.query(
        `UPDATE seals SET ${updateFields.join(', ')} WHERE id = ? AND ${tenantWhere}`,
        updateValues
      );
      
      res.json({ ok: true });
    } catch (err) {
      console.error('[Seals.MySQL] Update error:', err);
      res.status(500).json({ ok: false, error: err?.message || '更新印章失败' });
    }
  });

  // ==================== 删除印章（软删除） ====================
  router.delete('/:id', tenantMiddleware, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: '印章ID无效' });
    }
    
    try {
      // ✅ 多租户过滤：检查印章是否存在且属于当前租户
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;
      const [existing] = await pool.query(
        `SELECT id FROM seals WHERE id = ? AND deleted_at IS NULL AND ${tenantWhere}`,
        [id, ...tenantParams]
      );
      
      if (existing.length === 0) {
        return res.status(404).json({ ok: false, error: '印章不存在或无权访问' });
      }
      
      // ✅ 软删除时包含租户条件
      const [result] = await pool.query(
        `UPDATE seals SET deleted_at = NOW() WHERE id = ? AND ${tenantWhere}`,
        [id, ...tenantParams]
      );
      
      res.json({ ok: true });
    } catch (err) {
      console.error('[Seals.MySQL] Delete error:', err);
      res.status(500).json({ ok: false, error: err?.message || '删除印章失败' });
    }
  });

  // ==================== 记录印章使用 ====================
  router.post('/:id/use', tenantMiddleware, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: '印章ID无效' });
    }

    const { usedFor = 'certificate', referenceId } = req.body;

    try {
      // ✅ 多租户过滤：更新印章使用统计
      const { where: tenantWhere, params: tenantParams } = req.tenantFilter;
      await pool.query(
        `UPDATE seals 
         SET usage_count = usage_count + 1, 
             last_used_at = NOW() 
         WHERE id = ? AND deleted_at IS NULL AND ${tenantWhere}`,
        [id, ...tenantParams]
      );

      // 记录使用日志
      await pool.query(
        `INSERT INTO seal_usage_logs (seal_id, used_for, reference_id, used_by)
         VALUES (?, ?, ?, ?)`,
        [id, usedFor, referenceId || null, req.user?.id || null]
      );

      res.json({ ok: true });
    } catch (err) {
      console.error('[Seals.MySQL] Use error:', err);
      res.status(500).json({ ok: false, error: err?.message || '记录使用失败' });
    }
  });

  return router;
}
