// Workspace store and change pipeline.
// Browsers push changes as top-level field patches; each one goes through role checks and the
// domain rules (compliance gate, publish/reply hand-off, ticket numbering ...) before it is saved,
// audited and broadcast. Workers and webhooks change data through the same pipeline.
import { pool, tx, type Tx } from './db.js';
import { audit } from './audit.js';
import { publish, type Change } from './events.js';
import { enqueue, type JobSpec } from './queue.js';
import { log } from './log.js';

export const COLLECTIONS = ['accounts', 'rules', 'pointRules', 'watch', 'advocates', 'assets', 'tasks', 'posts', 'inbox', 'tickets', 'notifs', 'audit', 'ledger', 'negLog'] as const;
export type Col = typeof COLLECTIONS[number];
export const META_KEYS = ['listen', 'brandReach', 'ticketSeq', 'seededAt'] as const;
// Where server-created items go in a list (matches how the console adds them)
const FRONT: Set<string> = new Set(['inbox', 'notifs', 'audit', 'tickets', 'watch', 'assets', 'tasks', 'negLog']);
const isCol = (c: string): c is Col => (COLLECTIONS as readonly string[]).includes(c);

export interface Actor { userId: number | null; uid: string; name: string; role: string; admin: boolean; system?: boolean }
export const SYSTEM: Actor = { userId: null, uid: 'system', name: 'Lume', role: 'system', admin: true, system: true };

export interface Mutation { col: string; id: string; op: 'put' | 'del'; set?: Record<string, unknown>; unset?: string[]; baseVer?: number }
export interface PushBody { action?: string; args?: Record<string, string>; mutations?: Mutation[]; order?: Record<string, string[]>; meta?: Record<string, unknown> }

export class Rejection extends Error { constructor(msg: string, public code = 'rejected') { super(msg); } }

export interface HookCtx {
  c: Tx; ws: string; actor: Actor; col: Col; id: string; op: 'put' | 'del';
  before: any | null; after: any | null; changed: string[];
  jobs: JobSpec[]; side: { col: Col; data: any; front?: boolean }[];
  reject(msg: string): never; forbid(msg: string): never;
}
export type Hook = (ctx: HookCtx) => void | Promise<void>;
export type ActionHook = (a: { c: Tx; ws: string; actor: Actor; args: Record<string, string>; jobs: JobSpec[]; side: HookCtx['side'] }) => void | Promise<void>;

const hooks = new Map<string, Hook[]>();
const actionHooks = new Map<string, ActionHook>();
export function onCollection(col: Col, fn: Hook): void { hooks.set(col, [...(hooks.get(col) || []), fn]); }
export function onAction(name: string, fn: ActionHook): void { actionHooks.set(name, fn); }
export const knownActions = () => [...actionHooks.keys()];

/* ---------- reading ---------- */
export async function snapshot(ws: string): Promise<{ state: Record<string, unknown>; versions: Record<string, Record<string, number>> }> {
  const state: Record<string, unknown> = {};
  const versions: Record<string, Record<string, number>> = {};
  for (const c of COLLECTIONS) { state[c] = []; versions[c] = {}; }
  const { rows } = await pool.query('select col, id, data, ver from docs where ws=$1 order by col, pos, id', [ws]);
  for (const r of rows) {
    if (!isCol(r.col)) continue;
    (state[r.col] as unknown[]).push(r.data);
    versions[r.col][r.id] = r.ver;
  }
  const meta = await pool.query('select key, value from meta where ws=$1 and key = any($2)', [ws, META_KEYS as unknown as string[]]);
  for (const m of meta.rows) state[m.key] = m.value;
  return { state, versions };
}

export async function getDoc(ws: string, col: Col, id: string, c: Tx | typeof pool = pool): Promise<any | null> {
  const r = await c.query('select data from docs where ws=$1 and col=$2 and id=$3', [ws, col, id]);
  return r.rows[0]?.data ?? null;
}
export async function listDocs(ws: string, col: Col, where = '', params: unknown[] = []): Promise<any[]> {
  const r = await pool.query(`select data from docs where ws=$1 and col=$2 ${where} order by pos, id`, [ws, col, ...params]);
  return r.rows.map(x => x.data);
}
export async function getMeta<T = unknown>(ws: string, key: string, c: Tx | typeof pool = pool): Promise<T | null> {
  const r = await c.query('select value from meta where ws=$1 and key=$2', [ws, key]);
  return (r.rows[0]?.value ?? null) as T | null;
}
export async function setMeta(c: Tx, ws: string, key: string, value: unknown): Promise<void> {
  await c.query('insert into meta(ws, key, value) values ($1,$2,$3) on conflict (ws, key) do update set value = excluded.value', [ws, key, JSON.stringify(value)]);
}

/* ---------- writing ---------- */
async function edgePos(c: Tx, ws: string, col: string, front: boolean): Promise<number> {
  const r = await c.query(`select ${front ? 'min' : 'max'}(pos) as p from docs where ws=$1 and col=$2`, [ws, col]);
  const p = r.rows[0]?.p;
  return p == null ? 0 : front ? Number(p) - 1 : Number(p) + 1;
}

async function writeDoc(c: Tx, ws: string, col: string, id: string, data: unknown, by: string, pos?: number): Promise<{ ver: number; pos: number }> {
  const p = pos ?? await edgePos(c, ws, col, FRONT.has(col));
  const r = await c.query(
    `insert into docs(ws, col, id, data, ver, pos, updated_by) values ($1,$2,$3,$4,1,$5,$6)
     on conflict (ws, col, id) do update set data = excluded.data, ver = docs.ver + 1, updated_at = now(), updated_by = excluded.updated_by
     returning ver, pos`,
    [ws, col, id, JSON.stringify(data), p, by]
  );
  return { ver: r.rows[0].ver, pos: Number(r.rows[0].pos) };
}

function changedKeys(before: any, after: any): string[] {
  if (!before) return Object.keys(after || {});
  const keys = new Set([...Object.keys(before), ...Object.keys(after || {})]);
  return [...keys].filter(k => JSON.stringify(before[k]) !== JSON.stringify(after?.[k]));
}

async function runHooks(base: Omit<HookCtx, 'reject' | 'forbid'>): Promise<HookCtx> {
  const ctx = base as HookCtx;
  ctx.reject = (m: string) => { throw new Rejection(m); };
  ctx.forbid = (m: string) => { throw new Rejection(m, 'forbidden'); };
  for (const h of hooks.get(ctx.col) || []) await h(ctx);
  return ctx;
}

export interface PushResult { applied: Change[]; rejected: { col: string; id: string; code: string; reason: string; current: unknown; ver: number | null }[]; remap: Record<string, string> }

/** Apply a batch of changes from a person (browser) or the advocate API. */
export async function push(ws: string, actor: Actor, body: PushBody, origin?: string): Promise<PushResult> {
  const result: PushResult = { applied: [], rejected: [], remap: {} };
  const jobs: JobSpec[] = [];
  const muts = [...(body.mutations || [])].filter(m => isCol(m.col) && typeof m.id === 'string' && m.id.length <= 120);
  // tickets first, so new ticket numbers can be re-issued and references rewritten before the rest
  muts.sort((a, b) => (a.col === 'tickets' ? 0 : 1) - (b.col === 'tickets' ? 0 : 1));

  await tx(async c => {
    await c.query('select pg_advisory_xact_lock(hashtext($1))', ['push:' + ws]);
    if (body.action && actionHooks.has(body.action)) {
      const side: HookCtx['side'] = [];
      await actionHooks.get(body.action)!({ c, ws, actor, args: body.args || {}, jobs, side });
      for (const s of side) result.applied.push(await insertSide(c, ws, actor, s));
      await audit(c, ws, { actor: actor.uid, role: actor.role, action: 'action:' + body.action, detail: body.args || null });
    }
    for (let m of muts) {
      if (Object.keys(result.remap).length) m = rewrite(m, result.remap);
      const col = m.col as Col;
      await c.query('savepoint m');
      try {
        const cur = await c.query('select data, ver from docs where ws=$1 and col=$2 and id=$3 for update', [ws, col, m.id]);
        let before = cur.rows[0]?.data ?? null;
        let id = m.id;
        let after: any = null;
        if (m.op === 'del') { if (!before) { await c.query('release savepoint m'); continue; } }
        else {
          after = { ...(before || {}), ...(m.set || {}) };
          for (const k of m.unset || []) delete after[k];
          if (before && m.baseVer === 0) {
            // the browser created this as new, but the id is taken (another desk got there first)
            if (col !== 'tickets') throw new Rejection('This item already exists', 'conflict');
          }
          if (col === 'tickets' && (!before || m.baseVer === 0)) {
            const fresh = await reissueTicketId(c, ws, after);
            if (fresh !== id) { result.remap[id] = fresh; id = fresh; after = { ...(m.set || {}), id: fresh }; before = null; }
          }
          if (after.id !== undefined && after.id !== id) after.id = id;
        }
        const ctx = await runHooks({ c, ws, actor, col, id, op: m.op, before, after, changed: changedKeys(before, after), jobs, side: [] });
        if (m.op === 'put' && before && !changedKeys(before, ctx.after).length && !ctx.side.length) { await c.query('release savepoint m'); continue; }
        if (m.op === 'del') {
          await c.query('delete from docs where ws=$1 and col=$2 and id=$3', [ws, col, id]);
          result.applied.push({ col, id, op: 'del', by: actor.uid });
        } else {
          const w = await writeDoc(c, ws, col, id, ctx.after, actor.uid);
          result.applied.push({ col, id, op: 'put', data: ctx.after, ver: w.ver, pos: w.pos, by: actor.uid });
        }
        for (const s of ctx.side) result.applied.push(await insertSide(c, ws, actor, s));
        if (col !== 'audit' && col !== 'ledger' && col !== 'notifs') {
          await audit(c, ws, { actor: actor.uid, role: actor.role, action: (body.action || 'edit') + ':' + m.op, col, entityId: id, detail: { fields: ctx.changed.slice(0, 20) } });
        } else if (m.op === 'put' && !before) {
          await audit(c, ws, { actor: actor.uid, role: actor.role, action: 'append', col, entityId: id, detail: col === 'audit' ? { result: ctx.after.result, src: ctx.after.src } : null });
        }
        await c.query('release savepoint m');
      } catch (e) {
        await c.query('rollback to savepoint m');
        if (!(e instanceof Rejection)) { log.error({ err: e, col, id: m.id }, 'push failed'); }
        const cur = await c.query('select data, ver from docs where ws=$1 and col=$2 and id=$3', [ws, col, m.id]);
        result.rejected.push({ col, id: m.id, code: e instanceof Rejection ? e.code : 'error', reason: e instanceof Error ? e.message : String(e), current: cur.rows[0]?.data ?? null, ver: cur.rows[0]?.ver ?? null });
        await audit(c, ws, { actor: actor.uid, role: actor.role, action: 'rejected', col, entityId: m.id, detail: { reason: e instanceof Error ? e.message : String(e) } });
      }
    }
    if (muts.some(m => m.col === 'tickets' && m.op === 'put')) {
      result.applied.push({ col: 'meta', id: 'ticketSeq', op: 'put', data: await getMeta(ws, 'ticketSeq', c), by: 'system' });
    }
    // list order (only ids that exist; new server-side items keep their place)
    for (const [col, ids] of Object.entries(body.order || {})) {
      if (!isCol(col) || !Array.isArray(ids)) continue;
      const mapped = ids.map(i => result.remap[i] || i);
      await c.query(
        `update docs d set pos = o.ord from unnest($3::text[]) with ordinality as o(id, ord) where d.ws=$1 and d.col=$2 and d.id=o.id and d.pos <> o.ord`,
        [ws, col, mapped]
      );
    }
    for (const [k, v] of Object.entries(body.meta || {})) {
      if (!(META_KEYS as readonly string[]).includes(k)) continue;
      if (k === 'ticketSeq') continue; // the server owns ticket numbering
      if (k === 'seededAt') continue;
      await setMeta(c, ws, k, v);
      result.applied.push({ col: 'meta', id: k, op: 'put', data: v, by: actor.uid });
    }
  });
  await afterCommit(ws, result.applied, jobs, origin, body.order);
  return result;
}

async function insertSide(c: Tx, ws: string, actor: Actor, s: { col: Col; data: any; front?: boolean }): Promise<Change> {
  const pos = s.front === undefined ? undefined : await edgePos(c, ws, s.col, s.front);
  const w = await writeDoc(c, ws, s.col, s.data.id, s.data, actor.uid, pos);
  return { col: s.col, id: s.data.id, op: 'put', data: s.data, ver: w.ver, pos: w.pos, by: actor.uid };
}

async function afterCommit(ws: string, applied: Change[], jobs: JobSpec[], origin?: string, order?: Record<string, string[]>) {
  for (const j of jobs) await enqueue(j).catch(e => log.error({ err: e, job: j.name }, 'enqueue failed'));
  if (applied.length || (order && Object.keys(order).length)) {
    await publish(ws, { type: 'changes', changes: applied, origin }).catch(e => log.error({ err: e }, 'publish failed'));
  }
}

/** Server-side change (worker, webhook, sweep). fn gets a copy and returns the new data, or null to skip. */
export async function systemUpdate(ws: string, col: Col, id: string, action: string, fn: (d: any) => any | null, opts: { jobs?: JobSpec[]; side?: { col: Col; data: any; front?: boolean }[] } = {}): Promise<any | null> {
  const applied: Change[] = [];
  let out: any = null;
  await tx(async c => {
    const cur = await c.query('select data from docs where ws=$1 and col=$2 and id=$3 for update', [ws, col, id]);
    if (!cur.rows[0]) return;
    const next = fn(structuredClone(cur.rows[0].data));
    if (!next) return;
    const w = await writeDoc(c, ws, col, id, next, 'system');
    applied.push({ col, id, op: 'put', data: next, ver: w.ver, pos: w.pos, by: 'system' });
    for (const s of opts.side || []) applied.push(await insertSide(c, ws, SYSTEM, s));
    await audit(c, ws, { actor: 'system', role: 'system', action, col, entityId: id, detail: { fields: changedKeys(cur.rows[0].data, next).slice(0, 20) } });
    out = next;
  });
  if (applied.length) await afterCommit(ws, applied, opts.jobs || []);
  return out;
}

/** Server-side insert (incoming message, notification ...). */
export async function systemInsert(ws: string, col: Col, data: any, action: string, opts: { front?: boolean; jobs?: JobSpec[]; side?: { col: Col; data: any; front?: boolean }[] } = {}): Promise<void> {
  const applied: Change[] = [];
  await tx(async c => {
    applied.push(await insertSide(c, ws, SYSTEM, { col, data, front: opts.front ?? FRONT.has(col) }));
    for (const s of opts.side || []) applied.push(await insertSide(c, ws, SYSTEM, s));
    await audit(c, ws, { actor: 'system', role: 'system', action, col, entityId: data.id, detail: null });
  });
  await afterCommit(ws, applied, opts.jobs || []);
}

/** Replace the whole workspace (seed / demo reset). */
export async function replaceWorkspace(ws: string, state: Record<string, any>, actor: Actor): Promise<void> {
  await tx(async c => {
    await c.query('select pg_advisory_xact_lock(hashtext($1))', ['push:' + ws]);
    await c.query('delete from docs where ws=$1', [ws]);
    await c.query('delete from meta where ws=$1', [ws]);
    for (const col of COLLECTIONS) {
      const list: any[] = Array.isArray(state[col]) ? state[col] : [];
      const rows = list.map((d, i) => ({ id: String(d.id ?? `${col}_${i}`), data: d.id ? d : { ...d, id: `${col}_${i}` }, pos: i }));
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        await c.query(
          `insert into docs(ws, col, id, data, pos, updated_by) select $1, $2, x.id, x.data, x.pos, $4 from jsonb_to_recordset($3::jsonb) as x(id text, data jsonb, pos double precision)`,
          [ws, col, JSON.stringify(chunk), actor.uid]
        );
      }
    }
    for (const k of META_KEYS) if (state[k] !== undefined) await setMeta(c, ws, k, state[k]);
    await audit(c, ws, { actor: actor.uid, role: actor.role, action: 'workspace:reset', detail: { counts: Object.fromEntries(COLLECTIONS.map(col => [col, (state[col] || []).length])) } });
  });
  await publish(ws, { type: 'reload', text: 'The workspace was reset' });
}

/* ---------- ticket numbering ---------- */
async function reissueTicketId(c: Tx, ws: string, t: any): Promise<string> {
  const seq = Number(await getMeta<number>(ws, 'ticketSeq', c) || 0);
  const want = String(t.id || '');
  const m = /^SM-(\d+)$/.exec(want);
  const exists = m ? (await c.query('select 1 from docs where ws=$1 and col=$2 and id=$3', [ws, 'tickets', want])).rowCount : 1;
  if (m && !exists && Number(m[1]) > seq) { await setMeta(c, ws, 'ticketSeq', Number(m[1])); return want; }
  let next = seq + 1;
  while ((await c.query('select 1 from docs where ws=$1 and col=$2 and id=$3', [ws, 'tickets', 'SM-' + next])).rowCount) next++;
  await setMeta(c, ws, 'ticketSeq', next);
  return 'SM-' + next;
}
function rewrite(m: Mutation, remap: Record<string, string>): Mutation {
  let s = JSON.stringify(m);
  for (const [from, to] of Object.entries(remap)) s = s.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?!\\d)', 'g'), to);
  return JSON.parse(s);
}
