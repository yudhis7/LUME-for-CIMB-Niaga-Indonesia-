// Background workers: publishing, replies, listening, OJK clock, alerts, metrics and housekeeping.
import { Worker, type Job } from 'bullmq';
import { config } from './config.js';
import { pool } from './db.js';
import { kernel } from './kernel.js';
import { queue, QUEUE } from './queue.js';
import { log } from './log.js';
import { getDoc, getMeta, listDocs, systemInsert, systemUpdate, type Col } from './store.js';
import { channelFor, credentialFor, ManualStep } from './connectors/index.js';
import { xMentions, sendWhatsAppTemplate } from './connectors/others.js';
import type { Incoming } from './connectors/meta.js';
import { sendAlert, createComplaint } from './services.js';
import { workspaceRules } from './domain.js';

const K = () => kernel();
const uid = (p: string) => p + '_' + Math.random().toString(36).slice(2, 9);
const notifDoc = (text: string, ic: string, go = '') => ({ col: 'notifs' as Col, data: { id: uid('n'), at: Date.now(), ic, text, go, unread: true }, front: true });
const maskHandle = (h: string) => { const s = String(h || ''); if (s.includes('***') || !s.startsWith('@')) return s; const b = s.slice(1); return b.length < 5 ? '@' + b[0] + '***' : '@' + b.slice(0, 2) + '***' + b.slice(-2); };

/* ---------- delivery records (every outbound call) ---------- */
async function startDelivery(ws: string, kind: string, target: string, refCol: string | null, refId: string | null, request: unknown): Promise<number> {
  const r = await pool.query('insert into deliveries(ws, kind, target, ref_col, ref_id, request, attempts) values ($1,$2,$3,$4,$5,$6,1) returning id', [ws, kind, target, refCol, refId, JSON.stringify(request ?? null)]);
  return Number(r.rows[0].id);
}
async function endDelivery(id: number, status: 'sent' | 'failed' | 'manual', response?: unknown, error?: string): Promise<void> {
  await pool.query('update deliveries set status=$2, response=$3, error=$4, updated_at=now() where id=$1', [id, status, JSON.stringify(response ?? null), error ?? null]);
}
const isLastAttempt = (job: Job) => job.attemptsMade + 1 >= (job.opts.attempts || 1);

/* ---------- publishing ---------- */
async function publishPost(job: Job) {
  const { ws, postId } = job.data;
  const p = await getDoc(ws, 'posts', postId);
  if (!p || p.status !== 'publishing') return;
  const acc = await getDoc(ws, 'accounts', p.acc);
  const chk = K().checkCompliance(await workspaceRules(ws), p.caption || p.title || '', { product: p.product });
  if (chk.verdict === 'blocked') {
    await systemUpdate(ws, 'posts', postId, 'publish:blocked', d => ({ ...d, status: 'draft', pub: { status: 'failed', error: 'Blocked by the compliance check at publish time', at: Date.now() } }), { side: [notifDoc(`Not published: “${p.title}” no longer passes the compliance check`, 'x', '#calendar')] });
    return;
  }
  const media = (p.mediaUrls || []) as string[];
  const did = await startDelivery(ws, 'publish', `${acc?.platform}:${acc?.handle}`, 'posts', postId, { title: p.title, format: p.format, media: media.length });
  try {
    const res = await channelFor(acc.platform).publish(acc, await credentialFor(ws, acc.id), { caption: p.caption || p.title, title: p.title, format: p.format, mediaUrls: media });
    await endDelivery(did, 'sent', res);
    await systemUpdate(ws, 'posts', postId, 'publish:done', d => ({ ...d, status: 'published', at: d.at, pub: { status: 'sent', url: res.url, platformId: res.platformId, at: Date.now() } }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (e instanceof ManualStep || isLastAttempt(job)) {
      await endDelivery(did, e instanceof ManualStep ? 'manual' : 'failed', null, msg);
      await systemUpdate(ws, 'posts', postId, 'publish:failed', d => ({ ...d, status: 'failed', pub: { status: e instanceof ManualStep ? 'manual' : 'failed', error: msg, at: Date.now() } }), { side: [notifDoc(`Publishing “${p.title}” on ${acc?.handle} needs attention: ${msg}`, 'alert', '#calendar')] });
      return;
    }
    await endDelivery(did, 'failed', null, msg);
    throw e;
  }
}

async function sweepPosts() {
  const ws = config.WORKSPACE_ID;
  const due = await pool.query(`select id from docs where ws=$1 and col='posts' and data->>'status'='scheduled' and (data->>'at')::double precision <= $2 order by (data->>'at')::double precision limit 50`, [ws, Date.now()]);
  for (const r of due.rows) {
    const moved = await systemUpdate(ws, 'posts', r.id, 'publish:start', d => d.status === 'scheduled' ? { ...d, status: 'publishing', pub: { status: 'queued', at: Date.now() } } : null);
    if (moved) await queue().add('publish-post', { ws, postId: r.id });
  }
}

/* ---------- care replies ---------- */
async function sendReply(job: Job) {
  const { ws, msgId, idx } = job.data;
  const m = await getDoc(ws, 'inbox', msgId);
  if (!m || !m.thread?.[idx]) return;
  if (m.deliveries?.[idx]?.status === 'sent') return;
  const acc = await getDoc(ws, 'accounts', m.acc);
  const text = m.thread[idx].text;
  const did = await startDelivery(ws, 'reply', `${acc?.platform}:${acc?.handle}`, 'inbox', msgId, { idx, chars: text.length });
  const set = (v: any) => systemUpdate(ws, 'inbox', msgId, 'reply:' + v.status, d => ({ ...d, deliveries: { ...(d.deliveries || {}), [idx]: v } }));
  try {
    const res = await channelFor(acc.platform).reply(acc, await credentialFor(ws, acc.id), { kind: m.kind, handle: m.handle, platformMsgId: m.ext?.msgId, platformUserId: m.ext?.userId, postId: m.ext?.postId }, text);
    await endDelivery(did, 'sent', res);
    await set({ status: 'sent', platformId: res.platformId, at: Date.now() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (e instanceof ManualStep || isLastAttempt(job)) {
      await endDelivery(did, e instanceof ManualStep ? 'manual' : 'failed', null, msg);
      await set({ status: e instanceof ManualStep ? 'manual' : 'failed', error: msg, at: Date.now() });
      if (!(e instanceof ManualStep)) await systemInsert(ws, 'notifs', notifDoc(`Reply on ${acc?.handle} was not delivered: ${msg}`, 'alert', '#care').data, 'notify');
      return;
    }
    await endDelivery(did, 'failed', null, msg);
    throw e;
  }
}

async function hideComment(job: Job) {
  const { ws, msgId } = job.data;
  const m = await getDoc(ws, 'inbox', msgId); if (!m) return;
  const acc = await getDoc(ws, 'accounts', m.acc);
  const did = await startDelivery(ws, 'hide', `${acc?.platform}:${acc?.handle}`, 'inbox', msgId, null);
  try {
    await channelFor(acc.platform).hide(acc, await credentialFor(ws, acc.id), { kind: m.kind, handle: m.handle, platformMsgId: m.ext?.msgId });
    await endDelivery(did, 'sent');
    await systemUpdate(ws, 'inbox', msgId, 'hide:done', d => ({ ...d, hiddenOnPlatform: true }));
  } catch (e) {
    await endDelivery(did, e instanceof ManualStep ? 'manual' : 'failed', null, String((e as Error).message));
    if (!(e instanceof ManualStep) && !isLastAttempt(job)) throw e;
  }
}

/* ---------- listening: incoming messages ---------- */
export async function ingest(ws: string, items: (Incoming & { accountId?: string })[]): Promise<number> {
  let added = 0;
  for (const it of items) {
    const dupe = await pool.query('insert into inbound_events(ws, source, dedupe_key, payload) values ($1,$2,$3,$4) on conflict (ws, source, dedupe_key) do nothing returning id', [ws, it.platform, it.dedupe, JSON.stringify(it)]);
    if (!dupe.rowCount) continue;
    let accId = it.accountId;
    if (!accId) {
      const c = await pool.query('select account_id from channel_credentials where ws=$1 and platform=$2 and external_id=$3', [ws, it.platform, it.externalAccountId]);
      accId = c.rows[0]?.account_id;
    }
    if (!accId) { await pool.query('update inbound_events set error=$2 where id=$1', [dupe.rows[0].id, 'unknown account']); continue; }
    const item = K().prepInbox({ id: uid('m'), at: Math.min(it.at || Date.now(), Date.now()), acc: accId, kind: it.kind, handle: maskHandle(it.handle), raw: it.text, status: 'new', thread: [], ext: { msgId: it.platformMsgId, userId: it.platformUserId, postId: it.postId } });
    const side: { col: Col; data: any; front?: boolean }[] = [];
    if (item.ai.type === 'Fraud risk') side.push(notifDoc(`Fraud risk on ${accId}: ${item.text.slice(0, 70)}`, 'shield', '#care'));
    if (item.ai.type === 'Crisis or viral') side.push(notifDoc(`Possible crisis on ${accId}: ${item.text.slice(0, 70)}`, 'alert', '#care'));
    await systemInsert(ws, 'inbox', item, 'ingest', { side });
    await pool.query('update inbound_events set processed=true where id=$1', [dupe.rows[0].id]);
    await bumpListening(ws, item);
    if (item.ai.type === 'Fraud risk') { await sendAlert('fraud', 'Fraud risk mention', item.text, '#care').catch(() => undefined); await scamWave(ws); }
    if (item.ai.type === 'Crisis or viral') await sendAlert('comms', 'Possible crisis on social media', item.text, '#care').catch(() => undefined);
    added++;
  }
  return added;
}
async function bumpListening(ws: string, m: any) {
  const L = await getMeta<any>(ws, 'listen'); if (!L) return;
  L.byAcc = L.byAcc || {}; L.byAcc[m.acc] = (L.byAcc[m.acc] || 0) + 1;
  if (L.sent) L.sent[m.ai.sentiment === 'positive' ? 'pos' : m.ai.sentiment === 'negative' ? 'neg' : 'neu']++;
  const h = new Date().getHours(); if (L.hourly && L.hourly[h] != null) L.hourly[h]++;
  await pool.query('update meta set value=$3 where ws=$1 and key=$2', [ws, 'listen', JSON.stringify(L)]);
}
async function scamWave(ws: string) {
  const since = Date.now() - config.SCAM_WAVE_WINDOW_MIN * 60000;
  const n = Number((await pool.query(`select count(*)::int as n from docs where ws=$1 and col='inbox' and data->'ai'->>'type'='Fraud risk' and (data->>'at')::double precision >= $2`, [ws, since])).rows[0].n);
  if (n < config.SCAM_WAVE_THRESHOLD) return;
  const last = Number(await getMeta<number>(ws, 'lastWaveAt') || 0);
  if (Date.now() - last < config.SCAM_WAVE_WINDOW_MIN * 60000) return;
  await pool.query(`insert into meta(ws,key,value) values ($1,'lastWaveAt',$2) on conflict (ws,key) do update set value=excluded.value`, [ws, JSON.stringify(Date.now())]);
  await systemInsert(ws, 'notifs', notifDoc(`Scam wave: ${n} fraud mentions in the last ${config.SCAM_WAVE_WINDOW_MIN} minutes`, 'alert', '#care').data, 'scam-wave');
  await sendAlert('fraud', 'Scam wave detected', `${n} fraud mentions in the last ${config.SCAM_WAVE_WINDOW_MIN} minutes. Consider pushing #WaspadaSelalu from the Command centre.`, '#command').catch(() => undefined);
}

async function pollX() {
  if (config.CONNECTOR_MODE !== 'live') return;
  const ws = config.WORKSPACE_ID;
  const accs = (await listDocs(ws, 'accounts')).filter(a => a.platform === 'x');
  for (const a of accs) {
    const cred = await credentialFor(ws, a.id); if (!cred) continue;
    const since = await getMeta<string>(ws, 'xSince:' + a.id);
    const list = await xMentions(cred, since || undefined);
    if (!list.length) continue;
    await ingest(ws, list.map(t => ({ platform: 'x', externalAccountId: cred.externalId, accountId: a.id, platformMsgId: t.id, platformUserId: t.authorId, kind: 'Mention' as const, handle: t.author, text: t.text, at: t.at, dedupe: 'x:' + t.id })));
    const maxId = list.map(t => t.id).sort((p, q) => (BigInt(q) > BigInt(p) ? 1 : -1))[0];
    await pool.query(`insert into meta(ws,key,value) values ($1,$2,$3) on conflict (ws,key) do update set value=excluded.value`, [ws, 'xSince:' + a.id, JSON.stringify(maxId)]);
  }
}

/* ---------- OJK complaint clock and first-response targets ---------- */
async function slaCheck(ws: string, ticketId: string) {
  const t = await getDoc(ws, 'tickets', ticketId); if (!t) return;
  const c = K().clockOf(t);
  if (c.state === t.slaState) return;
  const side: { col: Col; data: any; front?: boolean }[] = [];
  if (c.state === 'risk') side.push(notifDoc(`${t.id} is at risk of missing the OJK deadline (${c.label})`, 'clock', '#ticket-' + t.id));
  if (c.state === 'overdue') side.push(notifDoc(`${t.id} is past the OJK deadline (${c.label})`, 'alert', '#ticket-' + t.id));
  await systemUpdate(ws, 'tickets', ticketId, 'sla:' + c.state, d => ({ ...d, slaState: c.state }), { side });
  if (c.state === 'risk' || c.state === 'overdue') await sendAlert('owner:' + t.owner, `${t.id}: ${c.label}`, `${t.issue}\nOwner: ${t.owner}\nDeadline: ${c.dl ? new Date(c.dl).toISOString().slice(0, 10) : '-'}`, '#ticket-' + t.id).catch(() => undefined);
}
async function sweepSla() {
  const ws = config.WORKSPACE_ID;
  const open = await pool.query(`select id from docs where ws=$1 and col='tickets' and data->>'closedAt' is null`, [ws]);
  for (const r of open.rows) await slaCheck(ws, r.id);
  // first-response targets: unanswered fraud / crisis messages past their target get one alert
  const late = await pool.query(`select id, data from docs where ws=$1 and col='inbox' and data->>'status'='new' and (data->>'due')::double precision < $2 and coalesce((data->>'slaAlerted')::boolean, false) = false and data->'ai'->>'urgency' in ('urgent','high') limit 20`, [ws, Date.now()]);
  for (const r of late.rows) {
    await systemUpdate(ws, 'inbox', r.id, 'sla:late-reply', d => ({ ...d, slaAlerted: true }), { side: [notifDoc(`No reply yet, past the ${r.data.ai.type} target: ${String(r.data.text).slice(0, 60)}`, 'clock', '#care')] });
  }
}

/* ---------- advocates ---------- */
async function notifyAdvocates(job: Job) {
  const { ws, taskId, kind } = job.data;
  const t = await getDoc(ws, 'tasks', taskId); if (!t) return;
  const pending = (t.exec || []).filter((e: any) => e.st === 'pending').map((e: any) => e.adv);
  const advs = (await listDocs(ws, 'advocates')).filter(a => pending.includes(a.id) && a.optIn);
  const did = await startDelivery(ws, 'advocate-' + kind, 'whatsapp', 'tasks', taskId, { advocates: advs.length });
  if (config.CONNECTOR_MODE === 'sandbox' || !config.WHATSAPP_TOKEN) { await endDelivery(did, 'sent', { simulated: true, advocates: advs.length }); return; }
  let sent = 0, skipped = 0;
  for (const a of advs) {
    if (!a.phone) { skipped++; continue; }
    try { await sendWhatsAppTemplate(a.phone, config.WHATSAPP_TASK_TEMPLATE, [a.name.split(' ')[0], t.name, new Date(t.deadline).toLocaleDateString('id-ID')]); sent++; } catch { skipped++; }
  }
  await endDelivery(did, 'sent', { sent, skipped });
}
async function verifyAdvocatePost(job: Job) {
  const { ws, taskId, adv } = job.data;
  const t = await getDoc(ws, 'tasks', taskId); if (!t) return;
  const e = (t.exec || []).find((x: any) => x.adv === adv); if (!e) return;
  const urls: string[] = (e.url || []).map((u: string) => (u.startsWith('http') ? u : 'https://' + u));
  const allowed = /^(https:\/\/)?(www\.)?(instagram\.com|tiktok\.com|facebook\.com|fb\.watch|x\.com|twitter\.com|threads\.net|youtube\.com|youtu\.be)\//i;
  let ok = urls.length > 0 && urls.every(u => allowed.test(u));
  if (ok && config.CONNECTOR_MODE === 'live') {
    for (const u of urls) {
      const r = await fetch(u, { method: 'GET', redirect: 'follow' }).catch(() => null);
      if (!r || r.status >= 400) { ok = false; break; }
    }
  }
  await systemUpdate(ws, 'tasks', taskId, 'advocate:verify', d => ({ ...d, exec: d.exec.map((x: any) => x.adv === adv ? { ...x, verified: ok ? 'yes' : 'no' } : x) }));
}

/* ---------- metrics ---------- */
async function pullMetrics() {
  const ws = config.WORKSPACE_ID;
  const since = Date.now() - 14 * 86400000;
  const posts = await pool.query(`select id, data from docs where ws=$1 and col='posts' and data->>'status'='published' and data->'pub'->>'platformId' is not null and (data->>'at')::double precision >= $2`, [ws, since]);
  for (const r of posts.rows) {
    const acc = await getDoc(ws, 'accounts', r.data.acc); if (!acc) continue;
    try {
      const m = await channelFor(acc.platform).postMetrics(acc, await credentialFor(ws, acc.id), r.data.pub.platformId);
      await systemUpdate(ws, 'posts', r.id, 'metrics', d => ({ ...d, metrics: { ...m, at: Date.now() } }));
    } catch (e) { log.warn({ err: e, post: r.id }, 'metrics failed'); }
  }
}

async function housekeeping() {
  await pool.query(`delete from inbound_events where received_at < now() - make_interval(days => $1)`, [config.RAW_EVENT_RETENTION_DAYS]);
  await pool.query(`delete from sessions where expires_at < now()`);
  await pool.query(`delete from login_attempts where locked_until is null or locked_until < now() - interval '1 day'`);
}

/* ---------- wiring ---------- */
const handlers: Record<string, (job: Job) => Promise<unknown>> = {
  'publish-post': publishPost,
  'sweep-posts': () => sweepPosts(),
  'send-reply': sendReply,
  'hide-comment': hideComment,
  'cms-create': async job => {
    const { ws, ticketId } = job.data;
    const t = await getDoc(ws, 'tickets', ticketId); if (!t) return;
    const did = await startDelivery(ws, 'cms', config.CMS_MODE, 'tickets', ticketId, { product: t.product, theme: t.theme });
    try {
      const ref = await createComplaint(t);
      await endDelivery(did, 'sent', { reference: ref });
      if (ref !== t.cms) await systemUpdate(ws, 'tickets', ticketId, 'cms:created', d => ({ ...d, cms: ref, log: [...(d.log || []), { at: Date.now(), text: 'Registered in the CIMB Niaga complaint system: ' + ref, by: 'Lume API' }] }));
    } catch (e) { await endDelivery(did, 'failed', null, (e as Error).message); if (!isLastAttempt(job)) throw e; }
  },
  'sla-check': job => slaCheck(job.data.ws, job.data.ticketId),
  'sweep-sla': () => sweepSla(),
  notify: async job => {
    const { ws, team, subject, text, link } = job.data;
    const did = await startDelivery(ws, 'alert', team, null, null, { subject });
    try { const r = await sendAlert(team, subject, text, link); await endDelivery(did, 'sent', r); }
    catch (e) { await endDelivery(did, 'failed', null, (e as Error).message); if (!isLastAttempt(job)) throw e; }
  },
  'notify-advocates': notifyAdvocates,
  'verify-advocate-post': verifyAdvocatePost,
  'report-impersonation': async job => {
    const { ws, watchId } = job.data;
    const w = await getDoc(ws, 'watch', watchId); if (!w) return;
    const did = await startDelivery(ws, 'report', w.platform, 'watch', watchId, { handle: w.handle });
    await endDelivery(did, 'manual', null, 'Submit the impersonation report in the platform’s brand-rights form; Lume keeps the record');
    await sendAlert('fraud', `Impersonator reported: ${w.handle}`, `${w.platform}: ${w.reason}`, '#accounts').catch(() => undefined);
  },
  ingest: job => ingest(job.data.ws, job.data.items),
  'poll-x': () => pollX(),
  'pull-metrics': () => pullMetrics(),
  housekeeping: () => housekeeping()
};

export async function startWorker(): Promise<Worker> {
  const q = queue();
  await q.upsertJobScheduler('sweep-posts', { every: 30_000 }, { name: 'sweep-posts', data: {} });
  await q.upsertJobScheduler('sweep-sla', { every: 5 * 60_000 }, { name: 'sweep-sla', data: {} });
  await q.upsertJobScheduler('pull-metrics', { every: 60 * 60_000 }, { name: 'pull-metrics', data: {} });
  await q.upsertJobScheduler('poll-x', { every: 2 * 60_000 }, { name: 'poll-x', data: {} });
  await q.upsertJobScheduler('housekeeping', { pattern: '17 2 * * *', tz: config.TZ }, { name: 'housekeeping', data: {} });
  const w = new Worker(QUEUE, async job => {
    const h = handlers[job.name];
    if (!h) { log.warn({ job: job.name }, 'no handler'); return; }
    return h(job);
  }, { connection: { url: config.REDIS_URL, maxRetriesPerRequest: null }, concurrency: 8 });
  w.on('failed', (job, err) => log.warn({ job: job?.name, id: job?.id, attempts: job?.attemptsMade, err }, 'job failed'));
  w.on('error', err => log.error({ err }, 'worker error'));
  log.info('worker started');
  return w;
}
