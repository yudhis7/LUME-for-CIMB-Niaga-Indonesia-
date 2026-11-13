import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { log } from './log.js';

// JSON numbers stay numbers; bigint ids come back as strings, which is fine for ids.
export const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.DATABASE_SSL ? { rejectUnauthorized: true } : undefined,
  max: 15,
  idleTimeoutMillis: 30000
});
pool.on('error', e => log.error({ err: e }, 'postgres pool error'));

export type Tx = pg.PoolClient;

export async function tx<T>(fn: (c: Tx) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('begin');
    const out = await fn(c);
    await c.query('commit');
    return out;
  } catch (e) {
    await c.query('rollback').catch(() => undefined);
    throw e;
  } finally {
    c.release();
  }
}

export async function migrate(): Promise<void> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const dir = [path.resolve(here, '../migrations'), '/app/server/migrations'].find(d => fs.existsSync(d));
  if (!dir) throw new Error('migrations folder not found');
  await pool.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
  const done = new Set((await pool.query('select name from schema_migrations')).rows.map(r => r.name));
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
    if (done.has(f)) continue;
    await tx(async c => {
      await c.query(fs.readFileSync(path.join(dir, f), 'utf8'));
      await c.query('insert into schema_migrations(name) values ($1)', [f]);
    });
    log.info({ migration: f }, 'migration applied');
  }
}
