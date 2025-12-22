import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

function getEnv(name, def = undefined) {
  const v = process.env[name];
  if (v === undefined && def === undefined) throw new Error(`Missing env ${name}`);
  return v ?? def;
}

const samples = [
  { category: '高空车', brand: 'Genie', model: 'GS-1930', type: '剪叉车', height: 7.8, driveType: '电驱' },
  { category: '高空车', brand: 'JLG', model: '450AJ', type: '曲臂车', height: 15.7, driveType: '油动' },
  { category: '高空车', brand: 'Haulotte', model: 'COMPACT 12', type: '剪叉车', height: 12, driveType: '电驱' },
  { category: '车载高空车', brand: '徐工', model: 'XZJ5061JGK', type: '直臂车', height: 18, driveType: '油动' },
];

async function main() {
  const host = getEnv('MYSQL_HOST', '127.0.0.1');
  const port = Number(getEnv('MYSQL_PORT', '3306'));
  const user = getEnv('MYSQL_USER', 'root');
  const password = getEnv('MYSQL_PASSWORD', '');
  const database = getEnv('MYSQL_DB');

  const conn = await mysql.createPool({ host, port, user, password, database, waitForConnections: true, connectionLimit: 5 });
  try {
    const now = new Date();
    for (const s of samples) {
      try {
        const [existRows] = await conn.query(`SELECT id FROM equipment_models WHERE brand = ? AND model = ? LIMIT 1`, [s.brand, s.model]);
        const exist = Array.isArray(existRows) && existRows[0];
        if (exist) {
          await conn.query(
            `UPDATE equipment_models SET category = ?, type = ?, height = ?, drive_type = ?, updated_at = ? WHERE id = ?`,
            [s.category, s.type, Number(s.height), s.driveType, now, exist.id]
          );
          console.log(`[SeedModels.MySQL] update: ${s.brand} ${s.model} (id=${exist.id})`);
        } else {
          const [r] = await conn.query(
            `INSERT INTO equipment_models (category, brand, model, type, height, drive_type, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [s.category, s.brand, s.model, s.type, Number(s.height), s.driveType, now, now]
          );
          console.log(`[SeedModels.MySQL] insert: ${s.brand} ${s.model} (id=${r.insertId})`);
        }
      } catch (e) {
        console.warn('[SeedModels.MySQL] Warning:', e?.message || e);
      }
    }
    console.log('[SeedModels.MySQL] Done.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('[SeedModels.MySQL] failed:', err?.message || err);
  process.exit(1);
});