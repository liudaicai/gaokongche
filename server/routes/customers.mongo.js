import { Router } from 'express';
import { ObjectId } from 'mongodb';

// Shape adapter to keep frontend compatibility
const toDto = (doc) => {
  const id = doc._id ? String(doc._id) : String(doc.id ?? '');
  return {
    id,
    type: doc.type,
    name: doc.type === 'enterprise' ? (doc.companyName || doc.name) : doc.name,
    creditCode: doc.creditCode ?? null,
    taxNumber: doc.taxNumber ?? null,
    address: doc.address ?? null,
    // 兼容旧字段，同时提供新关联字段
    region: doc.region ?? (doc.regionStoreName ?? ''),
    businessManager: doc.businessManager ?? (doc.businessManagerName ?? ''),
    regionStoreId: doc.regionStoreId ? String(doc.regionStoreId) : undefined,
    regionStoreName: doc.regionStoreName ?? (doc.region ?? ''),
    businessManagerId: doc.businessManagerId ? String(doc.businessManagerId) : undefined,
    businessManagerName: doc.businessManagerName ?? (doc.businessManager ?? ''),
    phone: doc.phone ?? '',
    idCardNumber: doc.idCardNumber ?? '',
    equipmentCount: Number(doc.equipmentCount ?? 0),
    contractAmount: Number(doc.contractAmount ?? 0),
    outstandingAmount: Number(doc.outstandingAmount ?? 0),
    receivedAmount: Number(doc.receivedAmount ?? 0),
    contacts: Array.isArray(doc.contacts) ? doc.contacts : [],
    attachments: Array.isArray(doc.attachments) ? doc.attachments : [],
    createdAt: doc.createdAt || new Date().toISOString(),
    updatedAt: doc.updatedAt || new Date().toISOString(),
  };
};

export default function buildCustomersRouterMongo(db) {
  const router = Router();
  const col = db.collection('customers');

  // List
  router.get('/', async (_req, res) => {
    try {
      const docs = await col.find({}).sort({ _id: -1 }).toArray();
      res.json({ ok: true, data: docs.map(toDto) });
    } catch (err) {
      console.error('[Customers.Mongo] List error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'List error' });
    }
  });

  // Create
  router.post('/', async (req, res) => {
    const b = req.body || {};
    try {
      const doc = {
        type: b.type,
        name: b.name,
        companyName: b.type === 'enterprise' ? b.name : undefined,
        creditCode: b.creditCode ?? undefined,
        taxNumber: b.taxNumber ?? undefined,
        address: b.address ?? undefined,
        // 兼容老字段：字符串区域与负责人
        region: b.region ?? '',
        businessManager: b.businessManager ?? '',
        // 新增关联：门店与员工
        regionStoreId: b.regionStoreId ? (ObjectId.isValid(b.regionStoreId) ? new ObjectId(b.regionStoreId) : b.regionStoreId) : undefined,
        regionStoreName: b.regionStoreName ?? undefined,
        businessManagerId: b.businessManagerId ? (ObjectId.isValid(b.businessManagerId) ? new ObjectId(b.businessManagerId) : b.businessManagerId) : undefined,
        businessManagerName: b.businessManagerName ?? undefined,
        phone: b.phone ?? undefined,
        idCardNumber: b.idCardNumber ?? undefined,
        equipmentCount: Number(b.equipmentCount ?? 0),
        contractAmount: Number(b.contractAmount ?? 0),
        outstandingAmount: Number(b.outstandingAmount ?? 0),
        receivedAmount: Number(b.receivedAmount ?? 0),
        contacts: Array.isArray(b.contacts) ? b.contacts : [],
        attachments: Array.isArray(b.attachments) ? b.attachments : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const r = await col.insertOne(doc);
      res.json({ ok: true, id: String(r.insertedId) });
    } catch (err) {
      console.error('[Customers.Mongo] Create error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Create error' });
    }
  });

  // Update
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const b = req.body || {};
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const $set = {
        type: b.type,
        name: b.name,
        companyName: b.type === 'enterprise' ? b.name : undefined,
        creditCode: b.creditCode ?? undefined,
        taxNumber: b.taxNumber ?? undefined,
        address: b.address ?? undefined,
        // 兼容老字段
        region: b.region ?? '',
        businessManager: b.businessManager ?? '',
        // 新增关联字段
        regionStoreId: b.regionStoreId ? (ObjectId.isValid(b.regionStoreId) ? new ObjectId(b.regionStoreId) : b.regionStoreId) : undefined,
        regionStoreName: b.regionStoreName ?? undefined,
        businessManagerId: b.businessManagerId ? (ObjectId.isValid(b.businessManagerId) ? new ObjectId(b.businessManagerId) : b.businessManagerId) : undefined,
        businessManagerName: b.businessManagerName ?? undefined,
        phone: b.phone ?? undefined,
        idCardNumber: b.idCardNumber ?? undefined,
        equipmentCount: Number(b.equipmentCount ?? 0),
        contractAmount: Number(b.contractAmount ?? 0),
        outstandingAmount: Number(b.outstandingAmount ?? 0),
        receivedAmount: Number(b.receivedAmount ?? 0),
        contacts: Array.isArray(b.contacts) ? b.contacts : [],
        attachments: Array.isArray(b.attachments) ? b.attachments : [],
        updatedAt: new Date().toISOString(),
      };
      await col.updateOne({ _id }, { $set });
      res.json({ ok: true });
    } catch (err) {
      console.error('[Customers.Mongo] Update error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Update error' });
    }
  });

  // Delete
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      await col.deleteOne({ _id });
      res.json({ ok: true });
    } catch (err) {
      console.error('[Customers.Mongo] Delete error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete error' });
    }
  });

  return router;
}