// HTTP API: sign-in, workspace, sync, live updates, AI, reports, admin, advocate app, platform webhooks.
import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import cookie from '@fastify/cookie';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { config } from './config.js';
import { pool } from './db.js';
import { log } from './log.js';
import { kernel, webSrcDir } from './kernel.js';
import { login, logout, resolveSession, requireUser, actorOf, setSessionCookie, COOKIE } from './auth.js';
import { snapshot, push, replaceWorkspace, getDoc, listDocs, knownActions, type Actor } from './store.js';
import { attach } from './events.js';
import { verifyChain } from './audit.js';
import { aiEnabled, aiWrite } from './services.js';
import { hmac, safeEqual, seal, randomToken, sha256 } from './crypto.js';
import { parseMetaWebhook } from './connectors/meta.js';
import { ingest } from './worker.js';
import { queue } from './queue.js';

const VERSION = '1.2.0';
declare module 'fastify' { interface FastifyRequest { rawBody?: Buffer } }

function webHtmlPath(): string | null {
  const cands = [config.WEB_DIST, path.resolve(webSrcDir(), '../dist/lume-cimb-niaga-desktop.html')].filter(Boolean);
  return cands.find(p => fs.existsSync(p)) || null;
}

export async function buildApi(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, bodyLimit: 8 * 1024 * 1024, trustProxy: true });
  await app.register(cookie);

  // keep the raw body for webhook signatures
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    (req as FastifyRequest).rawBody = body as Buffer;
    if (!(body as Buffer).length) return done(null, {});
    try { done(null, JSON.parse((body as Buffer).toString('utf8'))); } catch (e) { done(e as Error, undefined); }
  });

  app.addHook('onRequest', async (req, reply) => {
    await resolveSession(req);
    // CSRF: browsers can't add this header cross-site without a CORS preflight, which we never allow
    if (req.method !== 'GET' && req.url.startsWith('/api/') && req.headers['x-lume-csrf'] !== '1') {
      return reply.code(403).send({ error: 'Missing request header' });
    }
  });
  app.addHook('onSend', async (req, reply, payload) => {
    reply.header('x-content-type-options', 'nosniff');
    reply.header('referrer-policy', 'same-origin');
    reply.header('x-frame-options', 'DENY');
    reply.header('permissions-policy', 'camera=(), microphone=(), geolocation=()');
    if (config.COOKIE_SECURE) reply.header('strict-transport-security', 'max-age=31536000; includeSubDomains');
    if (req.url.startsWith('/api/')) reply.header('cache-control', 'no-store');
    return payload;
  });
  app.setErrorHandler((err, req, reply) => {
    const status = (err as any)?.name === 'ZodError' ? 400 : (err as any).statusCode && (err as any).statusCode < 500 ? (err as any).statusCode : 500;
    if (status >= 500) log.error({ err, url: req.url }, 'request failed');
    reply.code(status).send({ error: status >= 500 ? 'Something went wrong on the server' : (err as any)?.name === 'ZodError' ? 'Invalid request' : (err as Error).message });
  });

  /* ---------- app shell ---------- */
  app.get('/', async (_req, reply) => {
    const p = webHtmlPath();
    if (!p) return reply.code(500).type('text/plain').send('Web build not found. Run: cd web && python3 build.py --edition cimb');
    reply.header('content-security-policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    reply.header('cache-control', 'no-cache');
    return reply.type('text/html; charset=utf-8').send(fs.createReadStream(p));
  });

  // Advocate app (mobile web): opened from the magic link sent by WhatsApp
  app.get('/advocate', async (_req, reply) => {
    const here = path.dirname(new URL(import.meta.url).pathname);
    const p = [path.resolve(here, '../public/advocate.html'), '/app/server/public/advocate.html'].find(f => fs.existsSync(f));
    if (!p) return reply.code(404).send('not found');
    reply.header('content-security-policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
    reply.header('cache-control', 'no-cache');
    return reply.type('text/html; charset=utf-8').send(fs.createReadStream(p));
  });

  app.get('/api/v1/health', async () => {
    let db = false, redis = false;
    try { await pool.query('select 1'); db = true; } catch { /* reported below */ }
    try { const { redis: r } = await import('./events.js'); redis = (await r().ping()) === 'PONG'; } catch { /* reported below */ }
    return { engine: 'lume', version: VERSION, workspace: config.WORKSPACE_ID, connectors: config.CONNECTOR_MODE, cms: config.CMS_MODE, ai: aiEnabled(), demo: config.DEMO_MODE, db, redis, time: Date.now(), tz: config.TZ };
  });

  /* ---------- sign-in ---------- */
  app.post('/api/v1/auth/login', async (req, reply) => {
    const b = z.object({ uid: z.string().max(80), password: z.string().max(200), remember: z.boolean().optional() }).parse(req.body);
    const r = await login(config.WORKSPACE_ID, b.uid, b.password, !!b.remember, req.ip, String(req.headers['user-agent'] || ''));
    if (!r.ok) return reply.code(r.status).send({ error: r.error, retryIn: r.retryIn, left: r.left });
    setSessionCookie(reply, r.token, r.exp, !!b.remember);
    log.info({ uid: r.user.uid, ip: req.ip }, 'signed in');
    return { user: r.user, session: { at: Date.now(), exp: b.remember ? r.exp : 0 } };
  });
  app.post('/api/v1/auth/logout', async (req, reply) => {
    await logout(req.cookies[COOKIE]);
    reply.clearCookie(COOKIE, { path: '/' });
    return { ok: true };
  });
  app.get('/api/v1/auth/me', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: 'Not signed in' });
    return { user: req.user, session: req.sessionInfo };
  });

  /* ---------- workspace ---------- */
  app.get('/api/v1/workspace', async (req, reply) => {
    const u = requireUser(req, reply); if (!u) return;
    const snap = await snapshot(config.WORKSPACE_ID);
    // the console shows the latest 400 compliance log lines; the full log is in /api/v1/audit
    const audit = snap.state.audit as unknown[];
    if (audit.length > 400) snap.state.audit = audit.slice(0, 400);
    return { ...snap, user: u, session: req.sessionInfo, actions: knownActions(), server: { ai: aiEnabled(), demo: config.DEMO_MODE, connectors: config.CONNECTOR_MODE } };
  });

  const PushBody = z.object({
    action: z.string().max(60).optional(),
    args: z.record(z.string(), z.string().max(500)).optional(),
    mutations: z.array(z.object({ col: z.string(), id: z.string().max(120), op: z.enum(['put', 'del']), set: z.record(z.string(), z.unknown()).optional(), unset: z.array(z.string()).optional(), baseVer: z.number().optional() })).max(3000).optional(),
    order: z.record(z.string(), z.array(z.string())).optional(),
    meta: z.record(z.string(), z.unknown()).optional()
  });
  app.post('/api/v1/sync', async (req, reply) => {
    const u = requireUser(req, reply); if (!u) return;
    const body = PushBody.parse(req.body);
    const res = await push(config.WORKSPACE_ID, actorOf(req), body, String(req.headers['x-lume-client'] || ''));
    return res;
  });

  app.get('/api/v1/events', async (req, reply) => {
    const u = requireUser(req, reply); if (!u) return;
    const client = String((req.query as any).client || '').slice(0, 64);
    reply.hijack();
    reply.raw.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' });
    reply.raw.write(`retry: 3000\ndata: ${JSON.stringify({ type: 'notice', text: 'connected' })}\n\n`);
    const detach = attach(config.WORKSPACE_ID, client, reply.raw);
    req.raw.on('close', detach);
  });

  /* ---------- AI ---------- */
  app.post('/api/v1/ai/write', async (req, reply) => {
    const u = requireUser(req, reply); if (!u) return;
    if (!aiEnabled()) return reply.code(503).send({ error: 'AI is not switched on for this workspace' });
    const b = z.object({ prompt: z.string().min(1).max(8000), purpose: z.string().max(40).default('draft') }).parse(req.body);
    const r = await aiWrite(b.prompt, b.purpose);
    log.info({ uid: u.uid, purpose: b.purpose, masked: r.masked, model: r.model }, 'ai draft');
    return r;
  });

  /* ---------- governance ---------- */
  const staffWith = (req: FastifyRequest, reply: FastifyReply, roles: string[]) => {
    const u = requireUser(req, reply); if (!u) return null;
    if (!u.admin && !roles.includes(u.role)) { reply.code(403).send({ error: 'Not available for your team' }); return null; }
    return u;
  };
  app.get('/api/v1/audit', async (req, reply) => {
    if (!staffWith(req, reply, ['compliance'])) return;
    const q = req.query as any;
    const params: unknown[] = [config.WORKSPACE_ID, Math.min(Number(q.limit) || 200, 2000)];
    let where = '';
    if (q.col) { params.push(String(q.col)); where += ` and col=$${params.length}`; }
    if (q.id) { params.push(String(q.id)); where += ` and entity_id=$${params.length}`; }
    const r = await pool.query(`select seq, at, actor, role, action, col, entity_id, detail, hash from audit_log where ws=$1${where} order by seq desc limit $2`, params);
    return { rows: r.rows };
  });
  app.get('/api/v1/audit/verify', async (req, reply) => {
    if (!staffWith(req, reply, ['compliance'])) return;
    return verifyChain(config.WORKSPACE_ID);
  });
  app.get('/api/v1/deliveries', async (req, reply) => {
    if (!staffWith(req, reply, ['compliance', 'brand', 'care'])) return;
    const q = req.query as any;
    const r = await pool.query(`select id, kind, target, ref_col, ref_id, status, attempts, response, error, created_at, updated_at from deliveries where ws=$1 and ($2::text is null or ref_id=$2) order by id desc limit 300`, [config.WORKSPACE_ID, q.ref || null]);
    return { rows: r.rows };
  });

  /* OJK / SEOJK complaint register as CSV */
  app.get('/api/v1/reports/complaints.csv', async (req, reply) => {
    if (!staffWith(req, reply, ['compliance', 'care', 'brand'])) return;
    const q = req.query as any;
    const from = q.from ? Date.parse(q.from) : 0, to = q.to ? Date.parse(q.to) + 86400000 : Date.now() + 1;
    const tickets = (await listDocs(config.WORKSPACE_ID, 'tickets')).filter(t => t.createdAt >= from && t.createdAt < to);
    const cell = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const head = ['ticket', 'cms_reference', 'created', 'channel', 'account', 'product', 'cause_theme', 'priority', 'owner', 'documents_complete', 'extended', 'closed', 'working_days_used', 'ojk_status', 'satisfaction'];
    const rows = tickets.map(t => { const c = kernel().clockOf(t); return [t.id, t.cms, new Date(t.createdAt).toISOString(), t.src?.kind, t.src?.acc, t.product, t.theme, t.priority, t.owner, t.docsAt ? new Date(t.docsAt).toISOString() : '', t.extended ? 'yes' : 'no', t.closedAt ? new Date(t.closedAt).toISOString() : '', c.used, c.state, t.csat || ''].map(cell).join(','); });
    reply.header('content-disposition', `attachment; filename="complaints-${new Date().toISOString().slice(0, 10)}.csv"`);
    return reply.type('text/csv; charset=utf-8').send('﻿' + [head.join(','), ...rows].join('\r\n'));
  });

  /* ---------- admin ---------- */
  app.post('/api/v1/admin/reset', async (req, reply) => {
    const u = requireUser(req, reply); if (!u) return;
    if (!u.admin || !config.DEMO_MODE) return reply.code(403).send({ error: 'Only the pilot admin can reset the demo workspace' });
    await replaceWorkspace(config.WORKSPACE_ID, freshWorkspace(), actorOf(req));
    return { ok: true };
  });
  // Connect a platform account with a long-lived token (from Meta Business / X / TikTok developer consoles).
  app.post('/api/v1/accounts/:id/credentials', async (req, reply) => {
    const u = requireUser(req, reply); if (!u) return;
    if (!u.admin) return reply.code(403).send({ error: 'Only an administrator connects accounts' });
    const id = (req.params as any).id as string;
    const b = z.object({ externalId: z.string().min(1).max(64), token: z.string().min(10).max(4000), scopes: z.string().max(500).optional(), expiresAt: z.string().optional() }).parse(req.body);
    const acc = await getDoc(config.WORKSPACE_ID, 'accounts', id);
    if (!acc) return reply.code(404).send({ error: 'Unknown account' });
    await pool.query(
      `insert into channel_credentials(ws, account_id, platform, external_id, token_enc, scopes, expires_at, connected_by) values ($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict (ws, account_id) do update set external_id=excluded.external_id, token_enc=excluded.token_enc, scopes=excluded.scopes, expires_at=excluded.expires_at, connected_by=excluded.connected_by, connected_at=now()`,
      [config.WORKSPACE_ID, id, acc.platform, b.externalId, seal(b.token), b.scopes || '', b.expiresAt ? new Date(b.expiresAt) : null, u.uid]);
    const { systemUpdate } = await import('./store.js');
    await systemUpdate(config.WORKSPACE_ID, 'accounts', id, 'connect', d => ({ ...d, connected: 'Connected (live API)' }));
    return { ok: true };
  });
  // Pilot / UAT: send a message through the real listening pipeline as if a platform webhook delivered it.
  app.post('/api/v1/sandbox/incoming', async (req, reply) => {
    const u = requireUser(req, reply); if (!u) return;
    if (!config.DEMO_MODE) return reply.code(403).send({ error: 'Only in demo mode' });
    const b = z.object({ acc: z.string(), kind: z.enum(['Comment', 'DM', 'Mention', 'Reply']).default('Comment'), handle: z.string().max(60), text: z.string().min(1).max(2000) }).parse(req.body);
    const acc = await getDoc(config.WORKSPACE_ID, 'accounts', b.acc);
    if (!acc) return reply.code(404).send({ error: 'Unknown account' });
    const n = await ingest(config.WORKSPACE_ID, [{ platform: acc.platform, externalAccountId: 'sandbox', accountId: b.acc, kind: b.kind, handle: b.handle, text: b.text, at: Date.now(), dedupe: 'sbx:' + randomToken(8), platformMsgId: 'sbx_' + randomToken(6) }]);
    return { added: n };
  });

  /* ---------- advocate app API ---------- */
  app.post('/api/v1/advocate/links', async (req, reply) => {
    const u = requireUser(req, reply); if (!u) return;
    if (!u.admin && !['brand', 'hr', 'km'].includes(u.role)) return reply.code(403).send({ error: 'Not available for your team' });
    const b = z.object({ advocateId: z.string() }).parse(req.body);
    const adv = await getDoc(config.WORKSPACE_ID, 'advocates', b.advocateId);
    if (!adv) return reply.code(404).send({ error: 'Unknown advocate' });
    const token = randomToken(24);
    await pool.query('insert into advocate_tokens(id, ws, adv_id, expires_at) values ($1,$2,$3, now() + interval \'30 days\')', [sha256(token), config.WORKSPACE_ID, adv.id]);
    return { link: `${config.PUBLIC_URL}/advocate#t=${token}`, token, expiresInDays: 30 };
  });
  const advocateOf = async (req: FastifyRequest, reply: FastifyReply) => {
    const h = String(req.headers.authorization || '');
    const token = h.startsWith('Bearer ') ? h.slice(7) : '';
    const r = token ? (await pool.query('select adv_id from advocate_tokens where id=$1 and ws=$2 and expires_at > now()', [sha256(token), config.WORKSPACE_ID])).rows[0] : null;
    if (!r) { reply.code(401).send({ error: 'Link expired: ask your coordinator for a new one' }); return null; }
    return getDoc(config.WORKSPACE_ID, 'advocates', r.adv_id);
  };
  app.get('/api/v1/advocate/me', async (req, reply) => {
    const adv = await advocateOf(req, reply); if (!adv) return;
    const tasks = (await listDocs(config.WORKSPACE_ID, 'tasks')).filter(t => t.status === 'progress' && (t.exec || []).some((e: any) => e.adv === adv.id));
    return {
      advocate: { id: adv.id, name: adv.name, circle: adv.circle, points: adv.points, optIn: adv.optIn },
      tasks: tasks.map(t => ({ id: t.id, name: t.name, goal: t.goal, deadline: t.deadline, channels: t.channels, link: `${t.link}?ref=${adv.id}`, template: t.template, topics: t.topics, points: t.points, paid: !!t.paid, disclosure: !!t.disclosure, status: (t.exec.find((e: any) => e.adv === adv.id) || {}).st }))
    };
  });
  app.post('/api/v1/advocate/tasks/:id/submit', async (req, reply) => {
    const adv = await advocateOf(req, reply); if (!adv) return;
    const b = z.object({ platforms: z.array(z.string()).min(1).max(6), urls: z.array(z.string().max(300)).min(1).max(6), caption: z.string().max(4000) }).parse(req.body);
    const t = await getDoc(config.WORKSPACE_ID, 'tasks', (req.params as any).id);
    if (!t || t.status !== 'progress') return reply.code(404).send({ error: 'This task is not open' });
    const e = (t.exec || []).find((x: any) => x.adv === adv.id);
    if (!e || e.st === 'optout') return reply.code(403).send({ error: 'This task was not sent to you' });
    if (e.st === 'done') return reply.code(409).send({ error: 'Already submitted' });
    const rules = (await listDocs(config.WORKSPACE_ID, 'rules'));
    const chk = kernel().checkCompliance(rules.length ? rules : kernel().RULES0, b.caption, { product: t.product, paid: t.paid, disclosure: t.disclosure });
    if (chk.verdict === 'blocked') return reply.code(422).send({ error: 'Caption needs changes', issues: chk.blocking.map(x => x.name) });
    const exec = t.exec.map((x: any) => x.adv === adv.id ? { ...x, st: 'done', at: Date.now(), plats: b.platforms, url: b.urls, views: 0, likes: 0, comments: 0, shares: 0, clicks: 0, signups: 0, onTime: Date.now() <= t.deadline, caption: b.caption } : x);
    const actor: Actor = { userId: null, uid: 'advocate:' + adv.id, name: adv.name, role: 'advocate', admin: false, system: true };
    const muts: any[] = [{ col: 'tasks', id: t.id, op: 'put', set: { exec } }];
    if (t.points) {
      muts.push({ col: 'advocates', id: adv.id, op: 'put', set: { points: (adv.points || 0) + t.points } });
      muts.push({ col: 'ledger', id: 'lg_' + randomToken(6), op: 'put', set: { adv: adv.id, at: Date.now(), pts: t.points, reason: 'Menyelesaikan tugas: ' + t.name } });
    }
    muts.push({ col: 'audit', id: 'au_' + randomToken(6), op: 'put', set: { at: Date.now(), src: `Task ${t.id} · advocate caption`, text: b.caption.slice(0, 220), result: 'Ready', issues: [], by: adv.name, ver: 1 } });
    const res = await push(config.WORKSPACE_ID, actor, { action: 'advocate-submit', mutations: muts.map(m => ({ ...m, set: { ...m.set, id: m.id } })) });
    if (res.rejected.length) return reply.code(409).send({ error: res.rejected[0].reason });
    return { ok: true, points: t.points || 0 };
  });

  /* ---------- platform webhooks ---------- */
  app.get('/webhooks/meta', async (req, reply) => {
    const q = req.query as any;
    if (q['hub.mode'] === 'subscribe' && config.META_VERIFY_TOKEN && safeEqual(String(q['hub.verify_token'] || ''), config.META_VERIFY_TOKEN)) return reply.type('text/plain').send(String(q['hub.challenge'] || ''));
    return reply.code(403).send('forbidden');
  });
  app.post('/webhooks/meta', async (req, reply) => {
    const sig = String(req.headers['x-hub-signature-256'] || '');
    if (!config.META_APP_SECRET || !req.rawBody || !safeEqual(sig, 'sha256=' + hmac(config.META_APP_SECRET, req.rawBody))) return reply.code(401).send('bad signature');
    const items = parseMetaWebhook(req.body);
    if (items.length) await queue().add('ingest', { ws: config.WORKSPACE_ID, items });
    return reply.send('EVENT_RECEIVED'); // answer fast; processing happens in the worker
  });
  // X Account Activity API (Enterprise). Without it, mentions are polled every 2 minutes.
  app.get('/webhooks/x', async (req, reply) => {
    const crc = String((req.query as any).crc_token || '');
    if (!crc || !config.X_CONSUMER_SECRET) return reply.code(400).send({ error: 'missing crc_token' });
    return { response_token: 'sha256=' + hmac(config.X_CONSUMER_SECRET, crc, 'base64') };
  });
  app.post('/webhooks/x', async (req, reply) => {
    const sig = String(req.headers['x-twitter-webhooks-signature'] || '');
    if (!config.X_CONSUMER_SECRET || !req.rawBody || !safeEqual(sig, 'sha256=' + hmac(config.X_CONSUMER_SECRET, req.rawBody, 'base64'))) return reply.code(401).send('bad signature');
    const b = req.body as any;
    const forUser = String(b.for_user_id || '');
    const items = (b.tweet_create_events || []).filter((t: any) => t.user?.id_str !== forUser).map((t: any) => ({ platform: 'x', externalAccountId: forUser, platformMsgId: t.id_str, platformUserId: t.user?.id_str, kind: t.in_reply_to_status_id_str ? 'Reply' : 'Mention', handle: '@' + (t.user?.screen_name || 'user'), text: t.extended_tweet?.full_text || t.text || '', at: Number(t.timestamp_ms) || Date.now(), dedupe: 'x:' + t.id_str }));
    if (items.length) await queue().add('ingest', { ws: config.WORKSPACE_ID, items });
    return { ok: true };
  });

  return app;
}

export function freshWorkspace(): Record<string, any> {
  const S = kernel().freshState();
  // ledger lines have no ids in the browser seed; give them stable ones for the server
  (S.ledger || []).forEach((l: any, i: number) => { if (!l.id) l.id = 'lg_' + i.toString(36); });
  // the sample tickets start with their current clock state, so a fresh workspace doesn't raise old alerts
  (S.tickets || []).forEach((t: any) => { t.slaState = kernel().clockOf(t).state; });
  // sample replies already in the threads count as delivered
  (S.inbox || []).forEach((m: any) => { (m.thread || []).forEach((r: any, i: number) => { if (r.from === 'brand') (m.deliveries ||= {})[i] = { status: 'sent', at: r.at, sample: true }; }); });
  return S;
}
