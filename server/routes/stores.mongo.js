import express from 'express';
import { ObjectId } from 'mongodb';

const toStoreDto = (doc) => ({
  id: String(doc._id),
  name: doc.name,
  address: doc.address,
  managerId: doc.managerId || '',
  managerName: doc.managerName || '',
  managerPhone: doc.managerPhone || '',
  createdAt: doc.createdAt || new Date().toISOString(),
  updatedAt: doc.updatedAt || new Date().toISOString(),
});

const toCompanyVerificationDto = (doc) => ({
  id: String(doc._id),
  companyName: doc.companyName,
  companyAddress: doc.companyAddress,
  creditCode: doc.creditCode,
  bankAccount: doc.bankAccount,
  bankName: doc.bankName,
  createdAt: doc.createdAt || new Date().toISOString(),
  updatedAt: doc.updatedAt || new Date().toISOString(),
});

export default function buildStoresRouterMongo(db) {
  const router = express.Router();
  const stores = db.collection('stores');
  const verifications = db.collection('company_verifications');

  // 门店列表
  router.get('/', async (_req, res) => {
    try {
      const docs = await stores.find({}).sort({ updatedAt: -1, _id: -1 }).toArray();
      return res.json({ ok: true, data: docs.map(toStoreDto) });
    } catch (err) {
      console.error('[Stores.Mongo] List error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'List error' });
    }
  });

  // 新增门店
  router.post('/', async (req, res) => {
    const { name, address, managerId = '', managerName = '', managerPhone = '' } = req.body || {};
    if (!name || !address) return res.status(400).json({ ok: false, error: 'name/address required' });
    try {
      const now = new Date().toISOString();
      const r = await stores.insertOne({ name, address, managerId, managerName, managerPhone, createdAt: now, updatedAt: now });
      return res.json({ ok: true, id: String(r.insertedId) });
    } catch (err) {
      console.error('[Stores.Mongo] Create error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Create error' });
    }
  });

  // 更新门店
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, address, managerId, managerName, managerPhone } = req.body || {};
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const set = {
        ...(name !== undefined ? { name } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(managerId !== undefined ? { managerId } : {}),
        ...(managerName !== undefined ? { managerName } : {}),
        ...(managerPhone !== undefined ? { managerPhone } : {}),
        updatedAt: new Date().toISOString(),
      };
      const r = await stores.updateOne({ _id }, { $set: set });
      if (!r.matchedCount) return res.status(404).json({ ok: false, error: 'Store not found' });
      return res.json({ ok: true });
    } catch (err) {
      console.error('[Stores.Mongo] Update error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Update error' });
    }
  });

  // 删除门店
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      await stores.deleteOne({ _id });
      return res.json({ ok: true });
    } catch (err) {
      console.error('[Stores.Mongo] Delete error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete error' });
    }
  });

  // 公司认证列表
  router.get('/company-verifications', async (_req, res) => {
    try {
      const docs = await verifications.find({}).sort({ updatedAt: -1, _id: -1 }).toArray();
      return res.json({ ok: true, data: docs.map(toCompanyVerificationDto) });
    } catch (err) {
      console.error('[Stores.Mongo] List verifications error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'List verifications error' });
    }
  });

  // 新增公司认证
  router.post('/company-verifications', async (req, res) => {
    const { companyName, companyAddress, creditCode, bankAccount, bankName } = req.body || {};
    if (!companyName || !companyAddress || !creditCode) return res.status(400).json({ ok: false, error: 'companyName/companyAddress/creditCode required' });
    try {
      const now = new Date().toISOString();
      const r = await verifications.insertOne({ companyName, companyAddress, creditCode, bankAccount, bankName, createdAt: now, updatedAt: now });
      return res.json({ ok: true, id: String(r.insertedId) });
    } catch (err) {
      console.error('[Stores.Mongo] Create verification error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Create verification error' });
    }
  });

  // 更新公司认证
  router.put('/company-verifications/:id', async (req, res) => {
    const { id } = req.params;
    const { companyName, companyAddress, creditCode, bankAccount, bankName } = req.body || {};
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const set = {
        ...(companyName !== undefined ? { companyName } : {}),
        ...(companyAddress !== undefined ? { companyAddress } : {}),
        ...(creditCode !== undefined ? { creditCode } : {}),
        ...(bankAccount !== undefined ? { bankAccount } : {}),
        ...(bankName !== undefined ? { bankName } : {}),
        updatedAt: new Date().toISOString(),
      };
      const r = await verifications.updateOne({ _id }, { $set: set });
      if (!r.matchedCount) return res.status(404).json({ ok: false, error: 'Verification not found' });
      return res.json({ ok: true });
    } catch (err) {
      console.error('[Stores.Mongo] Update verification error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Update verification error' });
    }
  });

  // 删除公司认证
  router.delete('/company-verifications/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      await verifications.deleteOne({ _id });
      return res.json({ ok: true });
    } catch (err) {
      console.error('[Stores.Mongo] Delete verification error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete verification error' });
    }
  });

  return router;
}