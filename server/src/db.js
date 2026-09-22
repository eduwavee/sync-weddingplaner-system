import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));

// `date` como texto plano 'YYYY-MM-DD' (el front trabaja así, sin husos horarios)
pg.types.setTypeParser(1082, (v) => v);
// bigint: los montos de esta app entran holgados en un Number
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'require' ? { rejectUnauthorized: false } : undefined,
  max: 10,
});

export const q = (text, params) => pool.query(text, params);

/** Una transacción. Si el callback tira, rollback. */
export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const out = await fn(client);
    await client.query('commit');
    return out;
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

export async function migrate() {
  const sql = fs.readFileSync(path.join(here, '..', 'schema.sql'), 'utf8');
  await pool.query(sql);
}
