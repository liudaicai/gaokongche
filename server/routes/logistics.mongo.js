import express from 'express';
import { ObjectId } from 'mongodb';

// 工具：把可能是字符串的id转换为ObjectId或保留原值
const toObjectId = (id) => {
  try {
    return ObjectId.isValid(id) ? new ObjectId(id) : id;
  } catch (_) {
    return id;
  }
};

// 工具：将车辆文档转换为DTO（含门店名称映射）
const toVehicleDto = (doc, storeNameMap) => ({
  id: String(doc._id),
  plateNumber: doc.plateNumber,
  spec: doc.spec,
  stores: Array.isArray(doc.stores)
    ? doc.stores.map((sid) => ({ id: String(sid), name: storeNameMap.get(String(sid)) || '' }))
    : [],
  remark: doc.remark || '',
  attachments: Array.isArray(doc.attachments) ? doc.attachments : [],
  createdAt: doc.createdAt || new Date().toISOString(),
  updatedAt: doc.updatedAt || new Date().toISOString(),
});

// 工具：将司机文档转换为DTO（含门店名称映射）
const toDriverDto = (doc, storeNameMap) => ({
  id: String(doc._id),
  name: doc.name,
  phone: doc.phone,
  stores: Array.isArray(doc.stores)
    ? doc.stores.map((sid) => ({ id: String(sid), name: storeNameMap.get(String(sid)) || '' }))
    : [],
  remark: doc.remark || '',
  attachments: Array.isArray(doc.attachments) ? doc.attachments : [],
  createdAt: doc.createdAt || new Date().toISOString(),
  updatedAt: doc.updatedAt || new Date().toISOString(),
});

// 工具：将物流公司文档转换为DTO（含门店名称映射）
const toCompanyDto = (doc, storeNameMap) => ({
  id: String(doc._id),
  name: doc.name,
  stores: Array.isArray(doc.stores)
    ? doc.stores.map((sid) => ({ id: String(sid), name: storeNameMap.get(String(sid)) || '' }))
    : [],
  contactPerson: doc.contactPerson,
  contactPhone: doc.contactPhone,
  pricingRule: doc.pricingRule,
  attachments: Array.isArray(doc.attachments) ? doc.attachments : [],
  createdAt: doc.createdAt || new Date().toISOString(),
  updatedAt: doc.updatedAt || new Date().toISOString(),
});

export default function buildLogisticsRouterMongo(db) {
  const router = express.Router();
  const vehicles = db.collection('logistics_vehicles');
  const drivers = db.collection('logistics_drivers');
  const companies = db.collection('logistics_companies');
  const stores = db.collection('stores');

  // 索引
  vehicles.createIndex({ plateNumber: 1 }, { unique: true }).catch(() => {});
  drivers.createIndex({ phone: 1 }).catch(() => {});
  companies.createIndex({ name: 1 }, { unique: true }).catch(() => {});

  // 获取门店名称映射
  const buildStoreNameMap = async (ids) => {
    const validIds = ids
      .filter(Boolean)
      .map(toObjectId);
    const docs = await stores.find({ _id: { $in: validIds } }).toArray();
    const map = new Map(docs.map((d) => [String(d._id), d.name]));
    return map;
  };

  // 车辆列表
  router.get('/vehicles', async (_req, res) => {
    try {
      const docs = await vehicles.find({}).sort({ updatedAt: -1, _id: -1 }).toArray();
      const allStoreIds = docs.flatMap((d) => Array.isArray(d.stores) ? d.stores : []);
      const storeMap = await buildStoreNameMap(allStoreIds);
      return res.json({ ok: true, data: docs.map((d) => toVehicleDto(d, storeMap)) });
    } catch (err) {
      console.error('[Logistics.Mongo] Vehicles list error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'List error' });
    }
  });

  // 新增车辆
  router.post('/vehicles', async (req, res) => {
    const b = req.body || {};
    const { plateNumber, spec, storeIds = [], remark = '' } = b;
    if (!plateNumber || !spec) return res.status(400).json({ ok: false, error: 'plateNumber/spec required' });
    try {
      const now = new Date().toISOString();
      const r = await vehicles.insertOne({
        plateNumber,
        spec,
        stores: Array.isArray(storeIds) ? storeIds.map(toObjectId) : [],
        remark,
        attachments: [],
        createdAt: now,
        updatedAt: now,
      });
      return res.json({ ok: true, id: String(r.insertedId) });
    } catch (err) {
      const msg = String(err?.message || '');
      if (msg.includes('duplicate key')) {
        return res.status(409).json({ ok: false, error: 'Vehicle already exists' });
      }
      console.error('[Logistics.Mongo] Create vehicle error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Create error' });
    }
  });

  // 更新车辆
  router.put('/vehicles/:id', async (req, res) => {
    const { id } = req.params;
    const b = req.body || {};
    try {
      const _id = toObjectId(id);
      const set = {
        ...(b.plateNumber !== undefined ? { plateNumber: b.plateNumber } : {}),
        ...(b.spec !== undefined ? { spec: b.spec } : {}),
        ...(b.storeIds !== undefined ? { stores: Array.isArray(b.storeIds) ? b.storeIds.map(toObjectId) : [] } : {}),
        ...(b.remark !== undefined ? { remark: b.remark } : {}),
        updatedAt: new Date().toISOString(),
      };
      const r = await vehicles.updateOne({ _id }, { $set: set });
      if (!r.matchedCount) return res.status(404).json({ ok: false, error: 'Vehicle not found' });
      return res.json({ ok: true });
    } catch (err) {
      console.error('[Logistics.Mongo] Update vehicle error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Update error' });
    }
  });

  // 删除车辆
  router.delete('/vehicles/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const _id = toObjectId(id);
      await vehicles.deleteOne({ _id });
      return res.json({ ok: true });
    } catch (err) {
      console.error('[Logistics.Mongo] Delete vehicle error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete error' });
    }
  });

  // 司机列表
  router.get('/drivers', async (_req, res) => {
    try {
      const docs = await drivers.find({}).sort({ updatedAt: -1, _id: -1 }).toArray();
      const allStoreIds = docs.flatMap((d) => Array.isArray(d.stores) ? d.stores : []);
      const storeMap = await buildStoreNameMap(allStoreIds);
      return res.json({ ok: true, data: docs.map((d) => toDriverDto(d, storeMap)) });
    } catch (err) {
      console.error('[Logistics.Mongo] Drivers list error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'List error' });
    }
  });

  // 新增司机
  router.post('/drivers', async (req, res) => {
    const b = req.body || {};
    const { name, phone, storeIds = [], remark = '' } = b;
    if (!name || !phone) return res.status(400).json({ ok: false, error: 'name/phone required' });
    try {
      const now = new Date().toISOString();
      const r = await drivers.insertOne({
        name,
        phone,
        stores: Array.isArray(storeIds) ? storeIds.map(toObjectId) : [],
        remark,
        attachments: [],
        createdAt: now,
        updatedAt: now,
      });
      return res.json({ ok: true, id: String(r.insertedId) });
    } catch (err) {
      console.error('[Logistics.Mongo] Create driver error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Create error' });
    }
  });

  // 更新司机
  router.put('/drivers/:id', async (req, res) => {
    const { id } = req.params;
    const b = req.body || {};
    try {
      const _id = toObjectId(id);
      const set = {
        ...(b.name !== undefined ? { name: b.name } : {}),
        ...(b.phone !== undefined ? { phone: b.phone } : {}),
        ...(b.storeIds !== undefined ? { stores: Array.isArray(b.storeIds) ? b.storeIds.map(toObjectId) : [] } : {}),
        ...(b.remark !== undefined ? { remark: b.remark } : {}),
        updatedAt: new Date().toISOString(),
      };
      const r = await drivers.updateOne({ _id }, { $set: set });
      if (!r.matchedCount) return res.status(404).json({ ok: false, error: 'Driver not found' });
      return res.json({ ok: true });
    } catch (err) {
      console.error('[Logistics.Mongo] Update driver error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Update error' });
    }
  });

  // 删除司机
  router.delete('/drivers/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const _id = toObjectId(id);
      await drivers.deleteOne({ _id });
      return res.json({ ok: true });
    } catch (err) {
      console.error('[Logistics.Mongo] Delete driver error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete error' });
    }
  });

  // 物流公司列表
  router.get('/companies', async (_req, res) => {
    try {
      const docs = await companies.find({}).sort({ updatedAt: -1, _id: -1 }).toArray();
      const allStoreIds = docs.flatMap((d) => Array.isArray(d.stores) ? d.stores : []);
      const storeMap = await buildStoreNameMap(allStoreIds);
      return res.json({ ok: true, data: docs.map((d) => toCompanyDto(d, storeMap)) });
    } catch (err) {
      console.error('[Logistics.Mongo] Companies list error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'List error' });
    }
  });

  // 新增物流公司
  router.post('/companies', async (req, res) => {
    const b = req.body || {};
    const { name, storeIds = [], contactPerson = '', contactPhone = '', pricingRule = '', remark = '' } = b;
    if (!name) return res.status(400).json({ ok: false, error: 'name required' });
    try {
      const now = new Date().toISOString();
      const r = await companies.insertOne({
        name,
        stores: Array.isArray(storeIds) ? storeIds.map(toObjectId) : [],
        contactPerson,
        contactPhone,
        pricingRule,
        remark,
        attachments: [],
        createdAt: now,
        updatedAt: now,
      });
      return res.json({ ok: true, id: String(r.insertedId) });
    } catch (err) {
      const msg = String(err?.message || '');
      if (msg.includes('duplicate key')) {
        return res.status(409).json({ ok: false, error: 'Company already exists' });
      }
      console.error('[Logistics.Mongo] Create company error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Create error' });
    }
  });

  // 更新物流公司
  router.put('/companies/:id', async (req, res) => {
    const { id } = req.params;
    const b = req.body || {};
    try {
      const _id = toObjectId(id);
      const set = {
        ...(b.name !== undefined ? { name: b.name } : {}),
        ...(b.storeIds !== undefined ? { stores: Array.isArray(b.storeIds) ? b.storeIds.map(toObjectId) : [] } : {}),
        ...(b.contactPerson !== undefined ? { contactPerson: b.contactPerson } : {}),
        ...(b.contactPhone !== undefined ? { contactPhone: b.contactPhone } : {}),
        ...(b.pricingRule !== undefined ? { pricingRule: b.pricingRule } : {}),
        ...(b.remark !== undefined ? { remark: b.remark } : {}),
        updatedAt: new Date().toISOString(),
      };
      const r = await companies.updateOne({ _id }, { $set: set });
      if (!r.matchedCount) return res.status(404).json({ ok: false, error: 'Company not found' });
      return res.json({ ok: true });
    } catch (err) {
      console.error('[Logistics.Mongo] Update company error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Update error' });
    }
  });

  // 删除物流公司
  router.delete('/companies/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const _id = toObjectId(id);
      await companies.deleteOne({ _id });
      return res.json({ ok: true });
    } catch (err) {
      console.error('[Logistics.Mongo] Delete company error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete error' });
    }
  });

  return router;
}