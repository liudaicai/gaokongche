
import dotenv from 'dotenv';
dotenv.config();

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '../sql/mysql');
const TARGET_FILE = '054_add_missing_order_fields.sql';

async function main() {
  console.log('Running specific migration:', TARGET_FILE);

  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DB || 'gaokongche',
      multipleStatements: true,
    });

    console.log('Connected to database.');

    const filePath = path.join(MIGRATIONS_DIR, TARGET_FILE);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log('Executing SQL...');
    await connection.query(sql);
    console.log('SQL executed successfully.');
    
    // Try to record it, ignore if fails
    try {
       await connection.query(
        'INSERT IGNORE INTO _migrations (filename) VALUES (?)',
        [TARGET_FILE]
      );
      console.log('Recorded in _migrations.');
    } catch (e) {
        console.log('Failed to record in _migrations (ignored):', e.message);
    }

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
