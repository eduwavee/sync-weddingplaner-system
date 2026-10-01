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

/* Migraciones versionadas: cada archivo de migrations/ corre una sola vez,
   en orden y dentro de su transacción. El lock evita que dos instancias que
   arrancan juntas apliquen la misma. */
export async function migrate() {
  const dir = path.join(here, '..', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
  const client = await pool.connect();
  try {
    await client.query('select pg_advisory_lock(72310)');
    await client.query(`create table if not exists schema_migrations (
      version text primary key, applied_at timestamptz not null default now())`);
    const { rows } = await client.query('select version from schema_migrations');
    const done = new Set(rows.map((r) => r.version));
    for (const f of files) {
      if (done.has(f)) continue;
      await client.query('begin');
      try {
        await client.query(fs.readFileSync(path.join(dir, f), 'utf8'));
        await client.query('insert into schema_migrations (version) values ($1)', [f]);
        await client.query('commit');
        console.log(`migración aplicada: ${f}`);
      } catch (err) {
        await client.query('rollback');
        throw new Error(`falló la migración ${f}: ${err.message}`);
      }
    }
  } finally {
    await client.query('select pg_advisory_unlock(72310)').catch(() => {});
    client.release();
  }
}
