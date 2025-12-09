import express from 'express';
import { ObjectId } from 'mongodb';

export default function buildTransfersRouterMongo(db) {
  const router = express.Router();
  const transfers = db.collection('transfers');

  // 索引：调拨单号唯一
  transfers.createIndex({ orderNumber: 1 }, { unique: true }).catch(() => {});

  // 创建调拨单（含后端验证：调入/调出仓库不能相同）
  router.post('/', async (req, res) => {
    try {
      const body = req.body || {};
      const sourceWarehouse = String(body.sourceWarehouse || '').trim();
      const targetWarehouse = String(body.targetWarehouse || '').trim();

      if (!sourceWarehouse || !targetWarehouse) {
        return res.status(400).json({ ok: false, error: 'sourceWarehouse/targetWarehouse 为必填' });
      }
      if (sourceWarehouse === targetWarehouse) {
        return res.status(400).json({ ok: false, error: '调入仓库和调出仓库不能选择相同门店' });
      }

      const orderNumber = String(body.orderNumber || '').trim();
      if (!orderNumber) {
        return res.status(400).json({ ok: false, error: 'orderNumber 为必填' });
      }

      // 物流类型验证（新增）
      const logisticsType = body.logisticsType ? String(body.logisticsType).trim() : undefined;
      if (!logisticsType) {
        return res.status(400).json({ ok: false, error: 'logisticsType 为必填（退场物流/我方物流/第三方物流）' });
      }
      if (!['退场物流', '我方物流', '第三方物流'].includes(logisticsType)) {
        return res.status(400).json({ ok: false, error: 'logisticsType 取值非法' });
      }

      // 根据物流类型进行必要字段校验
      if (logisticsType === '我方物流') {
        const vehicleId = String(body.vehicleId || '').trim();
        const driverId = String(body.driverId || '').trim();
        if (!vehicleId || !driverId) {
          return res.status(400).json({ ok: false, error: '我方物流需提供 vehicleId 与 driverId' });
        }
      }
      if (logisticsType === '第三方物流') {
        const companyId = String(body.companyId || '').trim();
        const logisticsCost = body.logisticsCost != null ? Number(body.logisticsCost) : NaN;
        if (!companyId) {
          return res.status(400).json({ ok: false, error: '第三方物流需提供 companyId' });
        }
        if (Number.isNaN(logisticsCost)) {
          return res.status(400).json({ ok: false, error: '第三方物流需提供有效的 logisticsCost' });
        }
      }

      const equipmentIds = Array.isArray(body.equipmentIds) ? body.equipmentIds : [];
      if (!equipmentIds.length) {
        return res.status(400).json({ ok: false, error: '至少选择一个设备' });
      }

      const now = new Date().toISOString();
      const doc = {
        orderNumber,
        applicant: body.applicant || '',
        sourceWarehouse,
        targetWarehouse,
        useLogistics: !!body.useLogistics,
        logisticsType,
        // 我方物流/第三方物流字段
        vehicleId: body.vehicleId || undefined,
        driverId: body.driverId || undefined,
        companyId: body.companyId || undefined,
        companyContactName: body.companyContactName || undefined,
        companyContactPhone: body.companyContactPhone || undefined,
        logisticsCompany: body.logisticsCompany || undefined,
        logisticsCost: body.logisticsCost != null ? Number(body.logisticsCost) : undefined,
        logisticsContact: body.logisticsContact || undefined,
        logisticsPhone: body.logisticsPhone || undefined,
        reason: body.reason || undefined,
        equipmentIds,
        status: body.status || 'pending',
        createdAt: now,
        updatedAt: now,
      };

      const result = await transfers.insertOne(doc);
      return res.json({ ok: true, id: String(result.insertedId) });
    } catch (err) {
      const msg = String(err?.message || '');
      if (msg.includes('duplicate key')) {
        return res.status(409).json({ ok: false, error: '调拨单号已存在' });
      }
      console.error('[Transfers.Mongo] Create error:', err);
      return res.status(500).json({ ok: false, error: err?.message || 'Create error' });
    }
  });

  // 获取调拨单列表
  router.get('/', async (req, res) => {
    try {
      const list = await transfers.find({}).sort({ createdAt: -1 }).toArray();
      const result = list.map(doc => ({
        id: String(doc._id),
        orderNumber: doc.orderNumber,
        applicant: doc.applicant,
        sourceWarehouse: doc.sourceWarehouse,
        targetWarehouse: doc.targetWarehouse,
        useLogistics: doc.useLogistics,
        logisticsType: doc.logisticsType,
        vehicleId: doc.vehicleId,
        driverId: doc.driverId,
        companyId: doc.companyId,
        companyContactName: doc.companyContactName,
        companyContactPhone: doc.companyContactPhone,
        logisticsCompany: doc.logisticsCompany,
        logisticsCost: doc.logisticsCost,
        logisticsContact: doc.logisticsContact,
        logisticsPhone: doc.logisticsPhone,
        reason: doc.reason,
        equipmentIds: doc.equipmentIds,
        status: doc.status,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }));
      res.json({ ok: true, data: result });
    } catch (err) {
      console.error('[Transfers.Mongo] List error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'List error' });
    }
  });

  // 获取单个调拨单详情
  router.get('/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const doc = await transfers.findOne({ _id });
      
      if (!doc) {
        return res.status(404).json({ ok: false, error: '调拨单不存在' });
      }

      const result = {
        id: String(doc._id),
        orderNumber: doc.orderNumber,
        applicant: doc.applicant,
        sourceWarehouse: doc.sourceWarehouse,
        targetWarehouse: doc.targetWarehouse,
        useLogistics: doc.useLogistics,
        logisticsType: doc.logisticsType,
        vehicleId: doc.vehicleId,
        driverId: doc.driverId,
        companyId: doc.companyId,
        companyContactName: doc.companyContactName,
        companyContactPhone: doc.companyContactPhone,
        logisticsCompany: doc.logisticsCompany,
        logisticsCost: doc.logisticsCost,
        logisticsContact: doc.logisticsContact,
        logisticsPhone: doc.logisticsPhone,
        reason: doc.reason,
        equipmentIds: doc.equipmentIds,
        status: doc.status,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
      
      res.json({ ok: true, data: result });
    } catch (err) {
      console.error('[Transfers.Mongo] Get detail error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Get detail error' });
    }
  });

  // 更新调拨单状态（审批/完成）
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const body = req.body || {};
    
    try {
      const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
      const transfer = await transfers.findOne({ _id });
      
      if (!transfer) {
        return res.status(404).json({ ok: false, error: '调拨单不存在' });
      }

      const status = body.status;
      if (!status || !['pending', 'approved', 'completed'].includes(status)) {
        return res.status(400).json({ ok: false, error: '状态值无效' });
      }

      const now = new Date().toISOString();
      
      // 如果是完成调拨，需要同步更新设备档案的仓库信息
      if (status === 'completed') {
        const equipments = db.collection('equipments');
         const stores = db.collection('stores');
        
        // 获取目标仓库的门店信息
        const targetStore = await stores.findOne({ name: transfer.targetWarehouse });
        if (!targetStore) {
          return res.status(400).json({ ok: false, error: '目标仓库门店信息不存在' });
        }

        // 批量更新设备档案的仓库信息
        const equipmentIds = transfer.equipmentIds || [];
        if (equipmentIds.length > 0) {
          const updateResult = await equipments.updateMany(
            { 
              _id: { 
                $in: equipmentIds.map(eid => 
                   ObjectId.isValid(eid) ? new ObjectId(eid) : eid
                 ) 
              } 
            },
            { 
              $set: { 
                warehouse: transfer.targetWarehouse,
                storeId: String(targetStore._id),
                storeName: targetStore.name,
                updatedAt: now
              } 
            }
          );
          
          console.log(`[Transfers.Mongo] Updated ${updateResult.modifiedCount} equipment records`);
        }
      }

      // 更新调拨单状态
      await transfers.updateOne(
        { _id },
        { 
          $set: { 
            status: status,
            updatedAt: now
          } 
        }
      );

      res.json({ ok: true });
    } catch (err) {
      console.error('[Transfers.Mongo] Update error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Update error' });
    }
  });

  return router;
}