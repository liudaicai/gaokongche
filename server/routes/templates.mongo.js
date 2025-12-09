import express from 'express';
import { ObjectId } from 'mongodb';

const toDto = (doc, mapping) => ({
  id: String(doc._id),
  name: doc.name,
  type: doc.type,
  content: doc.content,
  isDefault: !!doc.isDefault,
  status: doc.status || 'enabled',
  createdAt: doc.createdAt || new Date().toISOString(),
  updatedAt: doc.updatedAt || new Date().toISOString(),
  ...(mapping ? { mapping } : {}),
});

export default function buildTemplatesRouterMongo(db) {
  const router = express.Router();
  const templates = db.collection('templates');
  const mappings = db.collection('template_mappings');
  const versions = db.collection('template_versions');

  // 列表（可按类型过滤），可带上映射
  router.get('/', async (req, res) => {
    const { type, includeMapping } = req.query;
    try {
      const filter = type ? { type } : {};
      const docs = await templates.find(filter).sort({ updatedAt: -1, _id: -1 }).toArray();
      if (includeMapping) {
        const ids = docs.map(d => d._id);
        const ms = await mappings.find({ template_id: { $in: ids } }).toArray();
        const mIndex = new Map(ms.map(m => [String(m.template_id), m.mapping || {}]));
        return res.json({ ok: true, data: docs.map(d => toDto(d, mIndex.get(String(d._id)) || {})) });
      }
      return res.json({ ok: true, data: docs.map(d => toDto(d)) });
    } catch (err) {
      console.error('[Templates.Mongo] List error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'List error' });
    }
  });

  // 默认模板（按类型）
  router.get('/default', async (req, res) => {
    const { type } = req.query;
    if (!type) return res.status(400).json({ ok: false, error: 'type is required' });
    try {
      const doc = await templates.findOne({ type, isDefault: true });
      if (!doc) return res.json({ ok: true, data: null });
      const m = await mappings.findOne({ template_id: doc._id });
      return res.json({ ok: true, data: toDto(doc, m?.mapping || {}) });
    } catch (err) {
      console.error('[Templates.Mongo] Default error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Default error' });
    }
  });

  // 新建模板（可带映射）
  router.post('/', async (req, res) => {
    const { name, type, content, isDefault, status = 'enabled', mapping } = req.body || {};
    if (!name || !type || !content) return res.status(400).json({ ok: false, error: 'name/type/content required' });
    try {
      if (isDefault) {
        await templates.updateMany({ type }, { $set: { isDefault: false } });
      }
      const now = new Date().toISOString();
      const r = await templates.insertOne({ name, type, content, isDefault: !!isDefault, status, createdAt: now, updatedAt: now });
      if (mapping && Object.keys(mapping).length) {
        await mappings.insertOne({ template_id: r.insertedId, mapping, createdAt: now, updatedAt: now });
      }
      return res.json({ ok: true, id: String(r.insertedId) });
    } catch (err) {
      console.error('[Templates.Mongo] Create error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Create error' });
    }
  });

  // 单个模板详情（含映射）
  router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const doc = await templates.findOne({ _id });
      if (!doc) return res.status(404).json({ ok: false, error: 'Not found' });
      const m = await mappings.findOne({ template_id: doc._id });
      return res.json({ ok: true, data: toDto(doc, m?.mapping || {}) });
    } catch (err) {
      console.error('[Templates.Mongo] Get error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Get error' });
    }
  });

  // 更新模板（内容变更记录版本），可更新默认状态与映射
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, type, content, isDefault, status, mapping } = req.body || {};
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const prev = await templates.findOne({ _id });
      if (!prev) return res.status(404).json({ ok: false, error: 'Template not found' });
      if (isDefault && (type || prev.type)) {
        const atType = type || prev.type;
        await templates.updateMany({ type: atType, _id: { $ne: _id } }, { $set: { isDefault: false } });
      }
      const set = {
        ...(name !== undefined ? { name } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(content !== undefined ? { content } : {}),
        ...(typeof isDefault === 'boolean' ? { isDefault: !!isDefault } : {}),
        ...(status !== undefined ? { status } : {}),
        updatedAt: new Date().toISOString(),
      };
      await templates.updateOne({ _id }, { $set: set });

      // 内容变更则记录版本
      if (content !== undefined && content !== prev.content) {
        await versions.insertOne({ template_id: _id, content: prev.content, createdAt: new Date().toISOString() });
      }

      // 更新映射（UPSERT）
      if (mapping) {
        const exist = await mappings.findOne({ template_id: _id });
        if (exist) {
          await mappings.updateOne({ template_id: _id }, { $set: { mapping, updatedAt: new Date().toISOString() } });
        } else {
          await mappings.insertOne({ template_id: _id, mapping, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        }
      }

      return res.json({ ok: true });
    } catch (err) {
      console.error('[Templates.Mongo] Update error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Update error' });
    }
  });

  // 删除模板（级联删除映射与版本）
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      await templates.deleteOne({ _id });
      await mappings.deleteMany({ template_id: _id });
      await versions.deleteMany({ template_id: _id });
      return res.json({ ok: true });
    } catch (err) {
      console.error('[Templates.Mongo] Delete error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete error' });
    }
  });

  // 映射接口
  router.get('/:id/mapping', async (req, res) => {
    const { id } = req.params;
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const m = await mappings.findOne({ template_id: _id });
      return res.json({ ok: true, data: m?.mapping || {} });
    } catch (err) {
      console.error('[Templates.Mongo] Get mapping error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Get mapping error' });
    }
  });

  router.put('/:id/mapping', async (req, res) => {
    const { id } = req.params;
    const { mapping } = req.body || {};
    if (!mapping || typeof mapping !== 'object') return res.status(400).json({ ok: false, error: 'mapping object required' });
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const exist = await mappings.findOne({ template_id: _id });
      if (exist) {
        await mappings.updateOne({ template_id: _id }, { $set: { mapping, updatedAt: new Date().toISOString() } });
      } else {
        await mappings.insertOne({ template_id: _id, mapping, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }
      return res.json({ ok: true });
    } catch (err) {
      console.error('[Templates.Mongo] Update mapping error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Update mapping error' });
    }
  });

  return router;
}