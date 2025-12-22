import express from 'express';

export default function buildModelsRouterMySQL(pool) {
  const router = express.Router();

  const mapRow = (r) => ({
    id: String(r.id),
    category: r.category,
    brand: r.brand,
    model: r.model,
    type: r.type,
    height: r.height != null ? Number(r.height) : undefined,
    driveType: r.drive_type,
    createdAt: r.created_at?.toISOString?.() || r.created_at || new Date().toISOString(),
    updatedAt: r.updated_at?.toISOString?.() || r.updated_at || new Date().toISOString(),
  });

  router.get('/', async (_req, res) => {
    try {
      console.log('[Models.MySQL] 开始查询设备型号列表');
      
      // 先尝试使用 is_deleted 字段，如果字段不存在则使用不带过滤的查询
      let query = 'SELECT id, category, brand, model, type, height, drive_type, created_at, updated_at FROM equipment_models';
      
      // 检查表是否有 is_deleted 字段
      try {
        const [columns] = await pool.query(
          "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipment_models' AND COLUMN_NAME = 'is_deleted'"
        );
        console.log('[Models.MySQL] is_deleted 字段检查结果:', columns.length > 0 ? '存在' : '不存在');
        if (columns.length > 0) {
          query += ' WHERE is_deleted = FALSE';
        }
      } catch (e) {
        console.warn('[Models.MySQL] 无法检查 is_deleted 字段:', e.message);
      }
      
      query += ' ORDER BY id DESC';
      console.log('[Models.MySQL] 执行查询:', query);
      
      const [rows] = await pool.query(query);
      console.log('[Models.MySQL] 查询到', rows.length, '条记录');
      
      const list = Array.isArray(rows) ? rows.map(mapRow) : [];
      console.log('[Models.MySQL] 返回数据:', JSON.stringify({ ok: true, dataLength: list.length }));
      
      res.json({ ok: true, data: list });
    } catch (err) {
      console.error('[Models.MySQL] list error:', err?.message || err);
      res.status(500).json({ ok: false, error: err?.message || 'List error' });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const { category, brand, model, type, height, driveType } = req.body || {};
      if (!category || !brand || !model || !type || height == null || !driveType) {
        return res.status(400).json({ ok: false, error: 'Missing required fields' });
      }
      const now = new Date();
      const [r] = await pool.query(
        `INSERT INTO equipment_models (category, brand, model, type, height, drive_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [category, brand, model, type, Number(height), driveType, now, now]
      );
      const id = String(r.insertId);
      res.json({ ok: true, id });
    } catch (err) {
      console.error('[Models.MySQL] create error:', err?.message || err);
      res.status(500).json({ ok: false, error: err?.message || 'Create error' });
    }
  });

  router.put('/:id', async (req, res) => {
    try {
      const idNum = Number(req.params.id);
      if (!Number.isFinite(idNum) || idNum <= 0) {
        return res.status(400).json({ ok: false, error: 'Invalid id' });
      }
      const { category, brand, model, type, height, driveType } = req.body || {};
      const now = new Date();
      const [r] = await pool.query(
        `UPDATE equipment_models
         SET category = ?, brand = ?, model = ?, type = ?, height = ?, drive_type = ?, updated_at = ?
         WHERE id = ?`,
        [category, brand, model, type, height != null ? Number(height) : null, driveType, now, idNum]
      );
      res.json({ ok: true, affectedRows: r.affectedRows });
    } catch (err) {
      console.error('[Models.MySQL] update error:', err?.message || err);
      res.status(500).json({ ok: false, error: err?.message || 'Update error' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const idNum = Number(req.params.id);
      if (!Number.isFinite(idNum) || idNum <= 0) {
        return res.status(400).json({ ok: false, error: 'Invalid id' });
      }
      const [r] = await pool.query(`DELETE FROM equipment_models WHERE id = ?`, [idNum]);
      res.json({ ok: true, affectedRows: r.affectedRows });
    } catch (err) {
      console.error('[Models.MySQL] delete error:', err?.message || err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete error' });
    }
  });

  return router;
}