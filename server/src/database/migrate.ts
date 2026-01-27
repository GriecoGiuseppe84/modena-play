import fs from 'node:fs';
import path from 'node:path';
import { pool } from './pg';

export async function runMigrations() {
  const file = path.resolve(process.cwd(), 'src/database/migrations/001_init_schema.sql');
  const sql = fs.readFileSync(file, 'utf-8');
  const client = await pool.connect();
  try {
    await client.query(sql);
  } finally {
    client.release();
  }
}
