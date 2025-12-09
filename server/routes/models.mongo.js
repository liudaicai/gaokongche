import express from 'express';
import { ObjectId } from 'mongodb';

const toDto = (doc) => ({
  id: String(doc._id),
  category: doc.category,
  brand: doc.brand,
  model: doc.model,
  type: doc.type,
  height: Number(doc.height ?? 0),
  driveType: doc.driveType,
  createdAt: doc.createdAt || new Date().toISOString(),
  updatedAt: doc.updatedAt || new Date().toISOString(),
});

export default function buildModelsRouterMongo(db) {
  const router = express.Router();
  const models = db.collection('equipment_models');

  // 初始化索引（避免重复型号，提升查询效率）
  models.createIndex({ brand: 1, model: 1 }, { unique: true }).catch(() => {});
  models.createIndex({ category: 1 }).catch(() => {});
  models.createIndex({ type: 1 }).catch(() => {});
  models.createIndex({ driveType: 1 }).catch(() => {});

  // 列表
  router.get('/', async (req, res) => {
    const { category, brand, type, driveType } = req.query;
    try {
      const filter = {
        ...(category ? { category } : {}),
        ...(brand ? { brand } : {}),
        ...(type ? { type } : {}),
        ...(driveType ? { driveType } : {}),
      };
      const docs = await models.find(filter).sort({ updatedAt: -1, _id: -1 }).toArray();
      return res.json({ ok: true, data: docs.map(toDto) });
    } catch (err) {
      console.error('[Models.Mongo] List error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'List error' });
    }
  });

  // 新增
  router.post('/', async (req, res) => {
    const b = req.body || {};
    const category = b.category;
    const brand = (b.brand || '').trim();
    const model = (b.model || '').trim();
    const type = b.type;
    const height = Number(b.height);
    const driveType = b.driveType;

    if (!category || !brand || !model || !type || !driveType) {
      return res.status(400).json({ ok: false, error: 'category/brand/model/type/driveType required' });
    }
    if (!Number.isFinite(height) || height <= 0 || height > 200) {
      return res.status(400).json({ ok: false, error: 'height must be in (0, 200]' });
    }

    try {
      const now = new Date().toISOString();
      const r = await models.insertOne({ category, brand, model, type, height, driveType, createdAt: now, updatedAt: now });
      return res.json({ ok: true, id: String(r.insertedId) });
    } catch (err) {
      if (String(err?.message || '').includes('duplicate key')) {
        return res.status(409).json({ ok: false, error: 'Model already exists' });
      }
      console.error('[Models.Mongo] Create error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Create error' });
    }
  });

  // 详情
  router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const doc = await models.findOne({ _id });
      if (!doc) return res.status(404).json({ ok: false, error: 'Not found' });
      return res.json({ ok: true, data: toDto(doc) });
    } catch (err) {
      console.error('[Models.Mongo] Get error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Get error' });
    }
  });

  // 更新
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const b = req.body || {};
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const set = {
        ...(b.category !== undefined ? { category: b.category } : {}),
        ...(b.brand !== undefined ? { brand: String(b.brand || '').trim() } : {}),
        ...(b.model !== undefined ? { model: String(b.model || '').trim() } : {}),
        ...(b.type !== undefined ? { type: b.type } : {}),
        ...(b.height !== undefined ? { height: Number(b.height) } : {}),
        ...(b.driveType !== undefined ? { driveType: b.driveType } : {}),
        updatedAt: new Date().toISOString(),
      };
      await models.updateOne({ _id }, { $set: set });
      return res.json({ ok: true });
    } catch (err) {
      console.error('[Models.Mongo] Update error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Update error' });
    }
  });

  // 删除
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      await models.deleteOne({ _id });
      return res.json({ ok: true });
    } catch (err) {
      console.error('[Models.Mongo] Delete error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete error' });
    }
  });

  return router;
}