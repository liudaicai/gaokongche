import express from 'express';
import { ObjectId } from 'mongodb';

const toEmployeeDto = (doc) => ({
  id: String(doc._id),
  username: doc.username,
  name: doc.name,
  phone: doc.phone,
  idCardNumber: doc.idCardNumber,
  position: doc.position,
  region: doc.region,
  directLeader: doc.directLeader,
  createdAt: doc.createdAt || new Date().toISOString(),
  updatedAt: doc.updatedAt || new Date().toISOString(),
});

export default function buildEmployeesRouterMongo(db) {
  const router = express.Router();
  const employees = db.collection('employees');

  // 索引：用户名唯一，便于登录、避免重复
  employees.createIndex({ username: 1 }, { unique: true }).catch(() => {});
  employees.createIndex({ region: 1 }).catch(() => {});
  employees.createIndex({ position: 1 }).catch(() => {});

  // 获取员工列表
  router.get('/', async (_req, res) => {
    try {
      const docs = await employees.find({}).sort({ updatedAt: -1, _id: -1 }).toArray();
      return res.json({ ok: true, data: docs.map(toEmployeeDto) });
    } catch (err) {
      console.error('[Employees.Mongo] List error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'List error' });
    }
  });

  // 新增员工
  router.post('/', async (req, res) => {
    const b = req.body || {};
    const { username, name, phone, idCardNumber, position, region, directLeader, password } = b;
    if (!username || !name || !phone || !idCardNumber || !position || !region || !directLeader || !password) {
      return res.status(400).json({ ok: false, error: 'username/name/phone/idCardNumber/position/region/directLeader/password required' });
    }
    try {
      const now = new Date().toISOString();
      const r = await employees.insertOne({
        username,
        name,
        phone,
        idCardNumber,
        position,
        region,
        directLeader,
        password, // 简化处理：实际生产应存储哈希
        createdAt: now,
        updatedAt: now,
      });
      return res.json({ ok: true, id: String(r.insertedId) });
    } catch (err) {
      const msg = String(err?.message || '');
      if (msg.includes('duplicate key')) {
        return res.status(409).json({ ok: false, error: 'Username already exists' });
      }
      console.error('[Employees.Mongo] Create error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Create error' });
    }
  });

  // 更新员工
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const b = req.body || {};
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const set = {
        ...(b.username !== undefined ? { username: b.username } : {}),
        ...(b.name !== undefined ? { name: b.name } : {}),
        ...(b.phone !== undefined ? { phone: b.phone } : {}),
        ...(b.idCardNumber !== undefined ? { idCardNumber: b.idCardNumber } : {}),
        ...(b.position !== undefined ? { position: b.position } : {}),
        ...(b.region !== undefined ? { region: b.region } : {}),
        ...(b.directLeader !== undefined ? { directLeader: b.directLeader } : {}),
        ...(b.password !== undefined ? { password: b.password } : {}),
        updatedAt: new Date().toISOString(),
      };
      const r = await employees.updateOne({ _id }, { $set: set });
      if (!r.matchedCount) return res.status(404).json({ ok: false, error: 'Employee not found' });
      return res.json({ ok: true });
    } catch (err) {
      const msg = String(err?.message || '');
      if (msg.includes('duplicate key')) {
        return res.status(409).json({ ok: false, error: 'Username already exists' });
      }
      console.error('[Employees.Mongo] Update error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Update error' });
    }
  });

  // 删除员工
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      await employees.deleteOne({ _id });
      return res.json({ ok: true });
    } catch (err) {
      console.error('[Employees.Mongo] Delete error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete error' });
    }
  });

  return router;
}