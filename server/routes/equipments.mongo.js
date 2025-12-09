import express from 'express';
import { ObjectId } from 'mongodb';

const toObjectId = (id) => {
  try {
    return ObjectId.isValid(id) ? new ObjectId(id) : id;
  } catch (_) {
    return id;
  }
};

const toEquipmentDto = (doc, storeNameMap) => ({
  id: String(doc._id),
  code: doc.code,
  customCode: doc.customCode,
  type: doc.type,
  height: Number(doc.height ?? 0),
  model: doc.model,
  brand: doc.brand,
  source: doc.source || 'self-owned',
  rentalStatus: doc.rentalStatus || 'waiting',
  contractName: doc.contractName,
  insuranceStatus: doc.insuranceStatus || 'insured',
  warehouse: doc.warehouse || '',
  category: doc.category,
  storeId: doc.storeId ? String(doc.storeId) : undefined,
  storeName: doc.storeId ? (storeNameMap.get(String(doc.storeId)) || '') : undefined,
  purchaseDate: doc.purchaseDate,
  factoryDate: doc.factoryDate,
  attachments: Array.isArray(doc.attachments) ? doc.attachments : [],
  createdAt: doc.createdAt || new Date().toISOString(),
  updatedAt: doc.updatedAt || new Date().toISOString(),
});

export default function buildEquipmentsRouterMongo(db) {
  const router = express.Router();
  const equipments = db.collection('equipments');
  const stores = db.collection('stores');

  // 索引：设备编码唯一，类型和高度便于查询
  equipments.createIndex({ code: 1 }, { unique: true }).catch(() => {});
  // 自编号唯一（仅对非空值施加唯一约束，避免历史空值冲突）
  equipments
    .createIndex(
      { customCode: 1 },
      { unique: true, partialFilterExpression: { customCode: { $exists: true, $ne: '' } } }
    )
    .catch(() => {});
  equipments.createIndex({ type: 1 }).catch(() => {});
  equipments.createIndex({ height: 1 }).catch(() => {});

  const buildStoreNameMap = async (storeIds) => {
    const validIds = (storeIds || [])
      .filter(Boolean)
      .map(toObjectId);
    if (!validIds.length) return new Map();
    const docs = await stores.find({ _id: { $in: validIds } }).toArray();
    return new Map(docs.map((d) => [String(d._id), d.name]));
  };

  // 库存统计 - 必须在通用路由之前定义
  router.get('/inventory/stats', async (req, res) => {
    try {
      const pipeline = [
        {
          $addFields: {
            area: {
              $cond: [
                { $and: [{ $ne: ['$warehouse', null] }, { $ne: ['$warehouse', ''] }] },
                '$warehouse',
                '未指定仓库'
              ]
            }
          }
        },
        {
          $match: {
            area: { $nin: ['默认仓库', '未指定仓库'] }
          }
        },
        {
          $group: {
            _id: {
              type: '$type',
              height: '$height',
              area: '$area'
            },
            waitingCount: {
              $sum: {
                $cond: [{ $eq: ['$rentalStatus', 'waiting'] }, 1, 0]
              }
            },
            rentingCount: {
              $sum: {
                $cond: [{ $eq: ['$rentalStatus', 'renting'] }, 1, 0]
              }
            },
            repairingCount: {
              $sum: {
                $cond: [{ $eq: ['$rentalStatus', 'repairing'] }, 1, 0]
              }
            },
            totalCount: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            type: '$_id.type',
            height: '$_id.height',
            area: '$_id.area',
            waitingCount: 1,
            rentingCount: 1,
            repairingCount: 1,
            totalCount: 1
          }
        },
        {
          $sort: { type: 1, height: 1, area: 1 }
        }
      ];

      const stats = await equipments.aggregate(pipeline).toArray();
      
      return res.json({ 
        ok: true, 
        data: stats 
      });
    } catch (err) {
      console.error('[Equipments.Mongo] Inventory stats error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Inventory stats error' });
    }
  });

  // 列表
  router.get('/', async (req, res) => {
    try {
      // 调试日志：打印查询参数以核对过滤条件是否生效
      try {
        console.log('[Equipments.Mongo] List hit with query:', req.query);
      } catch (_) {}
      // 兼容性解析：优先使用 URLSearchParams，避免框架或代理对 req.query 的影响
      let type = '';
      let height = '';
      let brand = '';
      let model = '';
      let code = '';
      let customCode = '';
      try {
        const u = new URL(req.originalUrl, 'http://localhost');
        type = u.searchParams.get('type') || '';
        height = u.searchParams.get('height') || '';
        brand = u.searchParams.get('brand') || '';
        model = u.searchParams.get('model') || '';
        code = u.searchParams.get('code') || '';
        customCode = u.searchParams.get('customCode') || '';
      } catch (_) {
        const q = req.query || {};
        const safeQ = (v) => (Array.isArray(v) ? (v[0] ?? '') : (v ?? ''));
        type = safeQ(q.type);
        height = safeQ(q.height);
        brand = safeQ(q.brand);
        model = safeQ(q.model);
        code = safeQ(q.code);
        customCode = safeQ(q.customCode);
      }
      const filter = {
        ...(type ? { type } : {}),
        ...(brand ? { brand } : {}),
        ...(model ? { model } : {}),
        ...(height ? { height: Number(height) } : {}),
        ...(code ? { code: String(code).trim() } : {}),
        ...(customCode ? { customCode: String(customCode).trim() } : {}),
      };
      try {
        console.log('[Equipments.Mongo] Built filter:', filter);
      } catch (_) {}
      const docs = await equipments.find(filter).sort({ updatedAt: -1, _id: -1 }).toArray();
      const storeIds = docs.map((d) => d.storeId).filter(Boolean);
      const storeMap = await buildStoreNameMap(storeIds);
      const payload = { ok: true, data: docs.map((d) => toEquipmentDto(d, storeMap)) };
      if (req.query && (req.query.debug === '1' || req.query.debug === 'true')) {
        payload.debug = { filter };
      }
      return res.json(payload);
    } catch (err) {
      console.error('[Equipments.Mongo] List error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'List error' });
    }
  });

  // 新增
  router.post('/', async (req, res) => {
    const b = req.body || {};
    const code = (b.code || '').trim();
    const customCode = (b.customCode || '').trim();
    const type = b.type;
    const height = Number(b.height);
    const model = (b.model || '').trim();
    const brand = (b.brand || '').trim();
    const source = b.source || 'self-owned';
    const rentalStatus = b.rentalStatus || 'waiting';
    const contractName = b.contractName;
    const insuranceStatus = b.insuranceStatus || 'insured';
    const warehouse = b.warehouse || '';
    const category = b.category;
    const storeId = b.storeId;
    const purchaseDate = b.purchaseDate;
    const factoryDate = b.factoryDate;
    const attachments = Array.isArray(b.attachments) ? b.attachments : [];

    if (!code || !type || !model || !brand) {
      return res.status(400).json({ ok: false, error: 'code/type/model/brand required' });
    }
    if (!Number.isFinite(height) || height <= 0 || height > 200) {
      return res.status(400).json({ ok: false, error: 'height must be in (0, 200]' });
    }

    try {
      // 业务校验：编码唯一性（新增请求）
      const existsByCode = await equipments.findOne({ code });
      if (existsByCode) {
        return res.status(409).json({ ok: false, error: `设备编码[ ${code} ]已存在` });
      }
      if (customCode) {
        const existsByCustomCode = await equipments.findOne({ customCode });
        if (existsByCustomCode) {
          return res.status(409).json({ ok: false, error: `自编码[ ${customCode} ]已存在` });
        }
      }

      const now = new Date().toISOString();
      const r = await equipments.insertOne({
        code,
        customCode,
        type,
        height,
        model,
        brand,
        source,
        rentalStatus,
        contractName,
        insuranceStatus,
        warehouse,
        category,
        storeId: storeId ? toObjectId(storeId) : undefined,
        purchaseDate,
        factoryDate,
        attachments,
        createdAt: now,
        updatedAt: now,
      });
      return res.json({ ok: true, id: String(r.insertedId) });
    } catch (err) {
      const msg = String(err?.message || '');
      if (msg.includes('duplicate key')) {
        // 兜底：唯一索引触发的重复错误
        // 由于上方已有业务前置校验，这里统一返回更明确的中文提示
        return res.status(409).json({ ok: false, error: '设备编码或自编号已存在' });
      }
      console.error('[Equipments.Mongo] Create error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Create error' });
    }
  });

  // 更新
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const b = req.body || {};
    try {
      const _id = toObjectId(id);
      const set = {
        ...(b.code !== undefined ? { code: String(b.code || '').trim() } : {}),
        ...(b.customCode !== undefined ? { customCode: String(b.customCode || '').trim() } : {}),
        ...(b.type !== undefined ? { type: b.type } : {}),
        ...(b.height !== undefined ? { height: Number(b.height) } : {}),
        ...(b.model !== undefined ? { model: String(b.model || '').trim() } : {}),
        ...(b.brand !== undefined ? { brand: String(b.brand || '').trim() } : {}),
        ...(b.source !== undefined ? { source: b.source } : {}),
        ...(b.rentalStatus !== undefined ? { rentalStatus: b.rentalStatus } : {}),
        ...(b.contractName !== undefined ? { contractName: b.contractName } : {}),
        ...(b.insuranceStatus !== undefined ? { insuranceStatus: b.insuranceStatus } : {}),
        ...(b.warehouse !== undefined ? { warehouse: b.warehouse } : {}),
        ...(b.category !== undefined ? { category: b.category } : {}),
        ...(b.storeId !== undefined ? { storeId: b.storeId ? toObjectId(b.storeId) : undefined } : {}),
        ...(b.purchaseDate !== undefined ? { purchaseDate: b.purchaseDate } : {}),
        ...(b.factoryDate !== undefined ? { factoryDate: b.factoryDate } : {}),
        ...(b.attachments !== undefined ? { attachments: Array.isArray(b.attachments) ? b.attachments : [] } : {}),
        updatedAt: new Date().toISOString(),
      };
      const r = await equipments.updateOne({ _id }, { $set: set });
      if (!r.matchedCount) return res.status(404).json({ ok: false, error: 'Equipment not found' });
      return res.json({ ok: true });
    } catch (err) {
      const msg = String(err?.message || '');
      if (msg.includes('duplicate key')) {
        return res.status(409).json({ ok: false, error: 'Equipment code already exists' });
      }
      console.error('[Equipments.Mongo] Update error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Update error' });
    }
  });

  // 删除
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const _id = toObjectId(id);
      await equipments.deleteOne({ _id });
      return res.json({ ok: true });
    } catch (err) {
      console.error('[Equipments.Mongo] Delete error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Delete error' });
    }
  });

  return router;
}