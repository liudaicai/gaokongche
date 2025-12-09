import dotenv from 'dotenv';
dotenv.config();
import { initMongo, closeMongo } from './mongo.js';

const samples = [
  {
    category: '高空车',
    brand: 'Genie',
    model: 'GS-1930',
    type: '剪叉车',
    height: 7.8,
    driveType: '电驱',
  },
  {
    category: '高空车',
    brand: 'JLG',
    model: '450AJ',
    type: '曲臂车',
    height: 15.7,
    driveType: '油动',
  },
  {
    category: '高空车',
    brand: 'Haulotte',
    model: 'COMPACT 12',
    type: '剪叉车',
    height: 12,
    driveType: '电驱',
  },
  {
    category: '车载高空车',
    brand: '徐工',
    model: 'XZJ5061JGK',
    type: '直臂车',
    height: 18,
    driveType: '油动',
  },
];

(async () => {
  const mongo = await initMongo();
  const col = mongo.db.collection('equipment_models');

  // 保证唯一索引
  try {
    await col.createIndex({ brand: 1, model: 1 }, { unique: true });
  } catch {}

  const now = new Date().toISOString();
  for (const s of samples) {
    try {
      const exist = await col.findOne({ brand: s.brand, model: s.model });
      if (exist) {
        await col.updateOne({ _id: exist._id }, { $set: { ...s, updatedAt: now } });
      } else {
        await col.insertOne({ ...s, createdAt: now, updatedAt: now });
      }
      console.log(`[SeedModels] upsert: ${s.brand} ${s.model}`);
    } catch (err) {
      console.warn('[SeedModels] Warning:', err?.message || err);
    }
  }

  await closeMongo(mongo.client);
  console.log('[SeedModels] Done.');
})();