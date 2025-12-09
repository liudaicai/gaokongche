import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');

// 确保上传目录存在
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  console.error('[Upload] Failed to ensure uploads dir:', e);
}

// 存储策略：使用时间戳与原始文件名，避免覆盖
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (_req, file, cb) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const ts = Date.now();
    cb(null, `${ts}_${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 最大 10MB
  fileFilter: function (_req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  }
});

export default function buildUploadRouter() {
  const router = Router();

  // 单文件上传（Upload.Dragger 默认每次上传一个文件）
  router.post('/', upload.single('file'), async (req, res) => {
    try {
      const f = req.file;
      if (!f) return res.status(400).json({ ok: false, error: 'No file uploaded' });
      const file = {
        name: f.originalname,
        path: f.path,
        url: `/uploads/${path.basename(f.path)}`,
        size: f.size,
        type: f.mimetype,
      };
      res.json({ ok: true, file });
    } catch (err) {
      console.error('[Upload] Error:', err);
      res.status(500).json({ ok: false, error: err.message || 'Upload error' });
    }
  });

  return router;
}