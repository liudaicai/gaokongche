// 批量迁移设备的仓库字段：
// - 将有 storeId 的设备的 warehouse 更新为对应门店名称
// - 清理掉 "默认仓库" 和 "未指定仓库" 的字符串值（改为空字符串）
// - 打印迁移前后统计信息方便核验

import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB || 'high_altitude_rental';

function toObjectId(id) {
  if (!id) return id;
  try {
    if (id instanceof ObjectId) return id;
    return ObjectId.isValid(id) ? new ObjectId(id) : id;
  } catch (_) {
    return id;
  }
}

async function migrate() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const equipments = db.collection('equipments');
  const stores = db.collection('stores');

  try {
    console.log(`[Migration] Connected: ${MONGODB_URI}, DB: ${DB_NAME}`);

    // 迁移前统计
    const preCount = await equipments.countDocuments();
    const preDist = await equipments.aggregate([
      { $group: { _id: '$warehouse', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    console.log('[Migration] 迁移前设备总数:', preCount);
    console.log('[Migration] 迁移前仓库分布:', preDist);

    // 构建门店ID -> 名称映射
    const distinctStoreIds = (await equipments.distinct('storeId')).filter(Boolean);
    const storeIds = distinctStoreIds.map(toObjectId);
    const storeDocs = storeIds.length ? await stores.find({ _id: { $in: storeIds } }).toArray() : [];
    const storeMap = new Map(storeDocs.map(d => [String(d._id), d.name]));
    console.log('[Migration] 可映射的门店数量:', storeMap.size);

    // 遍历设备并生成批量更新操作
    const cursor = equipments.find({});
    const ops = [];
    let setByStoreCount = 0;
    let clearedDefaultCount = 0;
    let missingStoreIdCount = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const _id = doc._id;
      const storeId = doc.storeId ? String(doc.storeId) : null;
      const currentWarehouse = doc.warehouse ?? '';

      if (storeId && storeMap.has(storeId)) {
        const storeName = storeMap.get(storeId);
        if (currentWarehouse !== storeName) {
          ops.push({
            updateOne: {
              filter: { _id },
              update: { $set: { warehouse: storeName, updatedAt: new Date().toISOString() } }
            }
          });
          setByStoreCount += 1;
        }
      } else {
        if (storeId) missingStoreIdCount += 1; // storeId存在但无法映射
        // 清理默认/未指定仓库的字符串值
        if (currentWarehouse === '默认仓库' || currentWarehouse === '未指定仓库') {
          ops.push({
            updateOne: {
              filter: { _id },
              update: { $set: { warehouse: '', updatedAt: new Date().toISOString() } }
            }
          });
          clearedDefaultCount += 1;
        }
      }
    }

    if (ops.length) {
      const result = await equipments.bulkWrite(ops, { ordered: false });
      console.log('[Migration] 批量更新完成:', {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upserts: result.upsertedCount,
        totalOps: ops.length,
        setByStoreCount,
        clearedDefaultCount,
        missingStoreIdCount
      });
    } else {
      console.log('[Migration] 没有需要更新的记录');
    }

    // 迁移后统计
    const postDist = await equipments.aggregate([
      { $group: { _id: '$warehouse', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    console.log('[Migration] 迁移后仓库分布:', postDist);

  } catch (err) {
    console.error('[Migration] 执行失败:', err);
  } finally {
    await client.close();
  }
}

await migrate();