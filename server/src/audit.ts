// Tamper-evident audit trail. Each row stores sha256(prev_hash + row content); editing or deleting
// any past row breaks the chain, which /api/v1/audit/verify detects.
import { pool, type Tx } from './db.js';
import { sha256 } from './crypto.js';

export interface AuditEntry { actor: string; role?: string | null; action: string; col?: string | null; entityId?: string | null; detail?: unknown }

const GENESIS = '0'.repeat(64);
const canon = (v: unknown): string => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x));

export async function audit(c: Tx, ws: string, e: AuditEntry): Promise<void> {
  // one writer per workspace at a time keeps the chain linear
  await c.query('select pg_advisory_xact_lock(hashtext($1))', ['audit:' + ws]);
  const prev = (await c.query('select hash from audit_log where ws=$1 order by seq desc limit 1', [ws])).rows[0]?.hash || GENESIS;
  const at = new Date().toISOString();
  const body = { ws, at, actor: e.actor, role: e.role ?? null, action: e.action, col: e.col ?? null, entityId: e.entityId ?? null, detail: e.detail ?? null };
  const hash = sha256(prev + canon(body));
  await c.query(
    'insert into audit_log(ws, at, actor, role, action, col, entity_id, detail, prev_hash, hash) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
    [ws, at, body.actor, body.role, body.action, body.col, body.entityId, JSON.stringify(body.detail), prev, hash]
  );
}

export async function verifyChain(ws: string): Promise<{ ok: boolean; rows: number; brokenAt?: number }> {
  const { rows } = await pool.query('select seq, at, actor, role, action, col, entity_id, detail, prev_hash, hash from audit_log where ws=$1 order by seq', [ws]);
  let prev = GENESIS;
  for (const r of rows) {
    const body = { ws, at: new Date(r.at).toISOString(), actor: r.actor, role: r.role, action: r.action, col: r.col, entityId: r.entity_id, detail: r.detail };
    if (r.prev_hash !== prev || sha256(prev + canon(body)) !== r.hash) return { ok: false, rows: rows.length, brokenAt: Number(r.seq) };
    prev = r.hash;
  }
  return { ok: true, rows: rows.length };
}
