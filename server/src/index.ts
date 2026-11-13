// Entry point.  node dist/index.js <api|worker|all|migrate|seed>
import './tz.js';
import { config, assertProductionSafe } from './config.js';
import { log } from './log.js';
import { pool, migrate } from './db.js';
import { kernel } from './kernel.js';
import './domain.js';
import { seedUsers } from './auth.js';
import { replaceWorkspace, getMeta, SYSTEM } from './store.js';
import { closeEvents, startFanout } from './events.js';
import { closeQueue } from './queue.js';

const mode = process.argv[2] || 'all';
process.env.LUME_ROLE = mode;

async function seedIfEmpty(force = false): Promise<void> {
  await seedUsers(config.WORKSPACE_ID);
  if (!force && (await getMeta(config.WORKSPACE_ID, 'seededAt'))) return;
  const { freshWorkspace } = await import('./api.js');
  await replaceWorkspace(config.WORKSPACE_ID, freshWorkspace(), SYSTEM);
  log.info({ ws: config.WORKSPACE_ID }, 'workspace seeded with pilot sample data');
}

// API and worker containers may start together: only one migrates and seeds at a time.
async function withStartupLock(fn: () => Promise<void>): Promise<void> {
  const c = await pool.connect();
  try { await c.query('select pg_advisory_lock(746135)'); await fn(); }
  finally { await c.query('select pg_advisory_unlock(746135)').catch(() => undefined); c.release(); }
}

async function main() {
  assertProductionSafe();
  kernel(); // load the rules once at start-up so a broken web/src fails fast
  if (mode === 'migrate') { await migrate(); await pool.end(); return; }
  if (mode === 'seed') { await withStartupLock(async () => { await migrate(); await seedIfEmpty(process.argv.includes('--force')); }); await closeEvents(); await pool.end(); return; }

  await withStartupLock(async () => { await migrate(); await seedIfEmpty(); });
  const stops: (() => Promise<unknown>)[] = [];
  if (mode === 'api' || mode === 'all') {
    const { buildApi } = await import('./api.js');
    await startFanout();
    const app = await buildApi();
    await app.listen({ port: config.PORT, host: config.HOST });
    log.info({ port: config.PORT, connectors: config.CONNECTOR_MODE, demo: config.DEMO_MODE }, 'api listening');
    stops.push(() => app.close());
  }
  if (mode === 'worker' || mode === 'all') {
    const { startWorker } = await import('./worker.js');
    const w = await startWorker();
    stops.push(() => w.close());
  }
  const shutdown = async (sig: string) => {
    log.info({ sig }, 'shutting down');
    for (const s of stops) await s().catch(() => undefined);
    await closeQueue(); await closeEvents(); await pool.end().catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch(e => { log.error({ err: e }, 'fatal'); process.exit(1); });
