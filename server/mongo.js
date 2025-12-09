import { MongoClient } from 'mongodb';

export const initMongo = async () => {
  const {
    MONGODB_URI = 'mongodb://localhost:27017',
    MONGODB_DB = 'high_altitude_rental',
  } = process.env;

  const client = new MongoClient(MONGODB_URI, {
    // modern unified topology by default
  });
  await client.connect();
  const db = client.db(MONGODB_DB);

  // Ensure basic indexes for customers collection (optional)
  try {
    const customers = db.collection('customers');
    await customers.createIndex({ name: 1 });
    await customers.createIndex({ type: 1 });
  } catch (e) {
    console.warn('[Mongo Init] Index creation warning:', e?.message || e);
  }

  console.log(`[Mongo Init] Connected to ${MONGODB_URI} (db: ${MONGODB_DB})`);
  return { client, db };
};

export const mongoHealthCheck = async (db) => {
  try {
    // ping command available in modern MongoDB servers
    const admin = db.admin();
    await admin.ping();
    return { ok: true, result: { ok: 1 } };
  } catch (err) {
    return { ok: false, error: err?.message || 'Mongo health error' };
  }
};

export const closeMongo = async (client) => {
  try {
    await client.close();
  } catch (e) {
    console.warn('[Mongo Close] Warning:', e?.message || e);
  }
};