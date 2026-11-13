// Domain rules: who may change what, and what the engine does when something changes.
// The browser runs the same checks for a quick answer; these are the ones that count.
import { kernel } from './kernel.js';
import { config } from './config.js';
import { onCollection, onAction, listDocs, getDoc, type HookCtx, type Actor } from './store.js';
import type { Tx } from './db.js';

const K = () => kernel();
const uid = (p: string) => p + '_' + Math.random().toString(36).slice(2, 9);
const PLANNERS = ['brand', 'compliance'];

export async function rulesOf(c: Tx, ws: string): Promise<any[]> {
  const r = await c.query("select data from docs where ws=$1 and col='rules' order by pos", [ws]);
  return r.rows.length ? r.rows.map(x => x.data) : K().RULES0;
}
async function accountOf(c: Tx, ws: string, id: string): Promise<any | null> { return getDoc(ws, 'accounts', id, c); }
export function canPublish(actor: Actor, accId: string): boolean {
  if (actor.system) return true;
  const role = K().ROLES[actor.role];
  return !!role && role.publish.includes(accId);
}
const onlyKeys = (ctx: HookCtx, keys: string[]) => ctx.changed.every(k => keys.includes(k));
const notif = (text: string, ic: string, go = '') => ({ col: 'notifs' as const, data: { id: uid('n'), at: Date.now(), ic, text, go, unread: true }, front: true });
function stripServerFields(ctx: HookCtx, keys: string[]) {
  if (ctx.actor.system || !ctx.after) return;
  for (const k of keys) { if (ctx.before && k in ctx.before) ctx.after[k] = ctx.before[k]; else delete ctx.after[k]; }
  ctx.changed = ctx.changed.filter(k => !keys.includes(k));
}
function denyRoles(ctx: HookCtx, roles: string[], what: string) {
  if (!ctx.actor.system && roles.includes(ctx.actor.role)) ctx.forbid(`${K().ROLES[ctx.actor.role]?.name || ctx.actor.role} can’t ${what}`);
}

/* ---------------- calendar posts ---------------- */
onCollection('posts', async ctx => {
  const { actor, before } = ctx;
  stripServerFields(ctx, ['pub', 'approvedAt', 'approvedBy', 'check']);
  const after = ctx.after;
  if (ctx.op === 'del') {
    if (!canPublish(actor, before.acc) && !(actor.role === 'compliance' && before.status === 'draft')) ctx.forbid('Each team changes only its own accounts');
    if (['published', 'publishing'].includes(before.status)) ctx.reject('Published posts stay in the calendar for the audit trail');
    return;
  }
  if (!ctx.changed.length) return;
  const own = canPublish(actor, after.acc);
  if (before) {
    if (['published', 'publishing'].includes(before.status) && !actor.system) ctx.reject('This post is already published');
    const plannerMove = PLANNERS.includes(actor.role) && onlyKeys(ctx, ['at']);
    const approval = actor.role === 'compliance' && onlyKeys(ctx, ['status']) && before.status === 'draft' && after.status === 'scheduled';
    if (!own && !plannerMove && !approval) ctx.forbid('Each team publishes only to its own accounts');
    if (approval) { after.approvedAt = Date.now(); after.approvedBy = actor.name; }
    if (ctx.changed.some(k => ['caption', 'title', 'product'].includes(k))) { delete after.approvedAt; delete after.approvedBy; }
  } else if (!own) ctx.forbid('Each team publishes only to its own accounts');
  if (after.at && after.status === 'scheduled' && after.at < Date.now() - 5 * 60000 && ctx.changed.includes('at')) ctx.reject('Pick a time in the future');

  // compliance gate (server-side, on every save)
  const chk = K().checkCompliance(await rulesOf(ctx.c, ctx.ws), after.caption || after.title || '', { product: after.product });
  after.check = { verdict: chk.verdict };
  if (chk.verdict === 'blocked' && after.status !== 'draft') ctx.reject('Blocked by the compliance check: ' + chk.blocking.map(b => b.name).join(', '));
  if (chk.verdict === 'route' && !after.approvedAt && after.status !== 'draft') {
    after.status = 'draft';
    ctx.side.push(notif(`“${after.title}” waits for Compliance before it can publish`, 'shield', '#compliance'));
  }
  // "Publish now": the engine publishes; the post shows "publishing" until the platform confirms
  if (after.status === 'published' && !actor.system) {
    after.status = 'publishing'; after.at = Date.now();
    after.pub = { status: 'queued', at: Date.now() };
    ctx.jobs.push({ name: 'publish-post', data: { ws: ctx.ws, postId: ctx.id } });
  }
});

/* ---------------- care inbox ---------------- */
function canReplyOn(actor: Actor, accId: string): boolean {
  if (actor.system) return true;
  if (['care', 'brand'].includes(actor.role)) return true;
  if (actor.role === 'km') return accId === 'ig_km';
  if (actor.role === 'hr') return accId === 'ig_hy';
  if (actor.role === 'syariah') return accId === 'ig_sy';
  return false;
}
onCollection('inbox', async ctx => {
  const { actor, before } = ctx;
  stripServerFields(ctx, ['deliveries']);
  const after = ctx.after;
  if (ctx.op === 'del') ctx.reject('Messages are kept for the complaint record');
  if (!before) {
    // a new incoming message typed in the console (simulation) - classify it here, not in the browser
    if (!config.DEMO_MODE && !actor.system) ctx.forbid('Incoming messages arrive from the platforms');
    const fresh = K().prepInbox({ id: ctx.id, at: Number(after.at) || Date.now(), acc: after.acc, kind: after.kind || 'Comment', handle: K().maskPII(after.handle || '').text, raw: String(after.raw || ''), status: 'new', thread: [], shares: after.shares, simulated: true });
    ctx.after = fresh;
    return;
  }
  if (!ctx.changed.length) return;
  if (!canReplyOn(actor, before.acc)) ctx.forbid('This team can’t act on ' + before.acc);
  for (const k of ['raw', 'text', 'pii', 'ai', 'acc', 'handle', 'at']) if (ctx.changed.includes(k) && !actor.system) after[k] = before[k];
  const prev: any[] = before.thread || [], next: any[] = after.thread || [];
  for (let i = 0; i < Math.min(prev.length, next.length); i++) {
    if (JSON.stringify(prev[i]) !== JSON.stringify(next[i])) ctx.reject('Posted replies can’t be edited');
  }
  if (next.length < prev.length) ctx.reject('Posted replies can’t be deleted');
  const rules = await rulesOf(ctx.c, ctx.ws);
  after.deliveries = { ...(before.deliveries || {}) };
  for (let i = prev.length; i < next.length; i++) {
    const r = next[i];
    if (r.from === 'brand') {
      const chk = K().checkCompliance(rules, r.text, { kind: 'reply' });
      if (chk.verdict === 'blocked') ctx.reject('Reply blocked by the compliance check: ' + chk.blocking.map(b => b.name).join(', '));
      r.at = Date.now();
      after.deliveries[i] = { status: 'queued' };
      ctx.jobs.push({ name: 'send-reply', data: { ws: ctx.ws, msgId: ctx.id, idx: i } });
    } else if (!config.DEMO_MODE && !actor.system) ctx.reject('Customer messages arrive from the platforms');
  }
  if (after.status === 'hidden' && before.status !== 'hidden') ctx.jobs.push({ name: 'hide-comment', data: { ws: ctx.ws, msgId: ctx.id } });
  if (after.escalated && !before.escalated) ctx.jobs.push({ name: 'notify', data: { ws: ctx.ws, team: 'comms', subject: 'Escalated social post', text: `Escalated by ${actor.name}: ${before.text}`, link: '#care' } });
});

/* ---------------- complaint tickets (OJK clock) ---------------- */
onCollection('tickets', async ctx => {
  const { actor, before } = ctx;
  stripServerFields(ctx, ['slaState', 'cmsSync']);
  const after = ctx.after;
  if (ctx.op === 'del') ctx.reject('Tickets are kept for the OJK record');
  if (!actor.system && !['care', 'brand', 'km', 'hr', 'syariah'].includes(actor.role)) ctx.forbid('Compliance can view tickets but not change them');
  if (!before) {
    after.createdAt = Math.min(Number(after.createdAt) || Date.now(), Date.now());
    after.slaState = 'nodocs';
    ctx.jobs.push({ name: 'cms-create', data: { ws: ctx.ws, ticketId: ctx.id } });
    return;
  }
  if (!['care', 'brand'].includes(actor.role) && !actor.system) ctx.forbid('Only the care desk and brand team update tickets');
  if (before.closedAt && !actor.system) ctx.reject('This ticket is closed');
  const prevLog: any[] = before.log || [], nextLog: any[] = after.log || [];
  if (nextLog.length < prevLog.length || prevLog.some((l, i) => JSON.stringify(l) !== JSON.stringify(nextLog[i]))) ctx.reject('The ticket timeline is append-only');
  if (after.extended && !before.extended && !before.docsAt) ctx.reject('Extend only after documents are complete');
  if (after.owner !== before.owner) ctx.jobs.push({ name: 'notify', data: { ws: ctx.ws, team: 'owner:' + after.owner, subject: `Ticket ${ctx.id} routed to ${after.owner}`, text: `${after.issue} (${after.product} / ${after.theme})`, link: '#ticket-' + ctx.id } });
  if (after.closedAt && !before.closedAt) after.closedAt = Date.now();
  if (after.docsAt && !before.docsAt) after.docsAt = Math.min(Number(after.docsAt), Date.now());
  ctx.jobs.push({ name: 'sla-check', data: { ws: ctx.ws, ticketId: ctx.id }, opts: { delay: 1000 } });
});

/* ---------------- advocate tasks ---------------- */
function taskTemplate(t: any) {
  return String(t.template || '').replace('{link}', t.link || '').replace('{topik}', (t.topics || []).join(' ')).replace('{cerita}', '').replace('{kota}', 'Jakarta').replace('{cabang}', 'Sudirman');
}
onCollection('tasks', async ctx => {
  const { actor, before } = ctx;
  stripServerFields(ctx, ['approvedBy']);
  const after = ctx.after;
  const canEdit = (t: any) => actor.system || actor.role === t.owner || actor.role === 'brand';
  if (ctx.op === 'del') {
    if (!canEdit(before)) ctx.forbid('Only the owning team can delete this task');
    if (before.status !== 'draft') ctx.reject('Only drafts can be deleted');
    return;
  }
  if (!before) {
    denyRoles(ctx, ['care', 'compliance'], 'create advocate tasks');
    if (after.status !== 'draft' && !(after.status === 'progress' && after.camp === 'waspada')) after.status = 'draft';
  } else if (ctx.changed.length) {
    const advocateOnly = onlyKeys(ctx, ['exec']);
    const review = actor.role === 'compliance' && onlyKeys(ctx, ['status', 'start']) && before.status === 'review' && ['progress', 'draft'].includes(after.status);
    if (advocateOnly) {
      if (!config.DEMO_MODE && !actor.system && actor.role !== 'advocate') ctx.forbid('Advocates submit through the advocate app');
      if (actor.role === 'advocate' && ctx.after.exec.some((e: any, i: number) => e.adv !== actor.uid.replace('advocate:', '') && JSON.stringify(e) !== JSON.stringify(ctx.before.exec[i]))) ctx.forbid('Advocates can only report their own posts');
      verifyExecChanges(ctx);
      return;
    }
    if (!review && !canEdit(before)) ctx.forbid('Only the owning team can change this task');
    if (review && after.status === 'progress') after.approvedBy = actor.name;
  }
  if (after.status === 'progress' && (!before || before.status !== 'progress')) {
    const chk = K().checkCompliance(await rulesOf(ctx.c, ctx.ws), taskTemplate(after), { product: after.product, paid: after.paid, disclosure: after.disclosure });
    if (chk.verdict === 'blocked') ctx.reject('The caption template is blocked by the compliance check');
    if (chk.verdict === 'route' && !after.approvedBy) {
      after.status = 'review';
      ctx.side.push(notif(`Task “${after.name}” waits for Compliance`, 'shield', '#task-' + ctx.id));
      ctx.jobs.push({ name: 'notify', data: { ws: ctx.ws, team: 'compliance', subject: 'Task waiting for review', text: after.name, link: '#task-' + ctx.id } });
      return;
    }
    (after.exec || []).forEach((e: any) => { if (e.st !== 'optout') e.st = e.st === 'done' ? 'done' : 'pending'; });
    ctx.jobs.push({ name: 'notify-advocates', data: { ws: ctx.ws, taskId: ctx.id, kind: 'new' } });
  }
  if (after.status === 'review' && before?.status !== 'review') {
    ctx.jobs.push({ name: 'notify', data: { ws: ctx.ws, team: 'compliance', subject: 'Task waiting for review', text: after.name, link: '#task-' + ctx.id } });
  }
});
function verifyExecChanges(ctx: HookCtx) {
  const prev = new Map<string, any>((ctx.before.exec || []).map((e: any) => [e.adv, e]));
  for (const e of ctx.after.exec || []) {
    const p = prev.get(e.adv);
    if (e.st === 'done' && (!p || p.st !== 'done')) {
      e.at = Date.now(); e.onTime = Date.now() <= Number(ctx.after.deadline);
      const caption = String(e.caption || '');
      if (caption) {
        // the advocate's own caption must also pass (paid / rewarded disclosure, risk wording ...)
        // rules are checked in the advocate API too; here we just record the verdict
        e.check = 'pending';
      }
      e.verified = 'pending';
      ctx.jobs.push({ name: 'verify-advocate-post', data: { ws: ctx.ws, taskId: ctx.id, adv: e.adv } });
    }
  }
}

/* ---------------- library, rules, accounts, network ---------------- */
onCollection('assets', ctx => {
  const { actor, before, after } = ctx;
  if (ctx.op === 'del') { denyRoles(ctx, ['care', 'km', 'hr', 'syariah'], 'delete library assets'); return; }
  if (!before) {
    if (actor.role === 'compliance' && !actor.system) ctx.forbid('Compliance reviews content; teams upload it');
    if (actor.role === 'care' && after.type !== 'UGC') ctx.forbid('The care desk adds customer stories (UGC) only');
    return;
  }
  if (ctx.changed.includes('status') && ['Cleared', 'Rejected'].includes(after.status) && before.status === 'Pending review' && actor.role !== 'compliance' && !actor.system) ctx.forbid('Only Compliance & Legal approves library content');
});
onCollection('rules', ctx => { if (!ctx.actor.system && ctx.actor.role !== 'compliance') ctx.forbid('Only Compliance & Legal can change check rules'); });
onCollection('pointRules', ctx => { if (!ctx.actor.system && !['hr', 'brand'].includes(ctx.actor.role)) ctx.forbid('Only HR and the brand team change points rules'); });
onCollection('accounts', async ctx => {
  if (!ctx.actor.system && !['brand', 'compliance'].includes(ctx.actor.role)) ctx.forbid('Only the brand team manages the account family');
  if (ctx.op === 'del') ctx.reject('Disconnect accounts instead of deleting them');
  if (!ctx.before) { ctx.after.connected = 'Connector pending'; ctx.after.status = 'Pending connector'; }
  // connection state comes from the credential store, not the browser
  if (ctx.before && ctx.changed.includes('connected') && !ctx.actor.system) ctx.after.connected = ctx.before.connected;
});
onCollection('watch', ctx => {
  if (ctx.before && ctx.after?.status === 'Reported' && ctx.before.status !== 'Reported') {
    ctx.jobs.push({ name: 'report-impersonation', data: { ws: ctx.ws, watchId: ctx.id } });
  }
});
for (const col of ['audit', 'ledger'] as const) {
  onCollection(col, ctx => {
    if (ctx.op === 'del' || (ctx.before && ctx.changed.length)) ctx.reject('This log is append-only');
    if (ctx.before) return;
    if (col === 'audit') ctx.after.by = ctx.after.by || ctx.actor.name;
    ctx.after.at = Math.min(Number(ctx.after.at) || Date.now(), Date.now());
  });
}

/* ---------------- actions that reach people outside the console ---------------- */
onAction('care-fraud', async ({ ws, actor, args, jobs, c }) => {
  const m = await getDoc(ws, 'inbox', String(args.id || ''), c);
  if (m) jobs.push({ name: 'notify', data: { ws, team: 'fraud', subject: 'Fraud alert from social media', text: `${m.text}\n\nSource: ${m.acc} ${m.kind} by ${m.handle}. Flagged by ${actor.name}.`, link: '#care' } });
});
onAction('care-recog', ({ ws, actor, jobs }) => { jobs.push({ name: 'notify', data: { ws, team: 'care', subject: 'Customer praise for a branch employee', text: `Shared by ${actor.name} with the branch head and HR`, link: '#care' } }); });
onAction('task-remind', async ({ ws, args, jobs }) => { jobs.push({ name: 'notify-advocates', data: { ws, taskId: String(args.id || ''), kind: 'reminder' } }); });
onAction('brief-send', ({ ws, actor, jobs }) => { jobs.push({ name: 'notify', data: { ws, team: 'care', subject: 'Daily social brief', text: `Daily brief sent by ${actor.name}`, link: '#command' } }); });
onAction('wave-push', ({ ws, actor, jobs }) => {
  jobs.push({ name: 'notify', data: { ws, team: 'fraud', subject: '#WaspadaSelalu pushed', text: `Scam-wave response started by ${actor.name}: warning posts scheduled and advocates alerted.`, link: '#care' } });
  jobs.push({ name: 'notify', data: { ws, team: 'comms', subject: '#WaspadaSelalu pushed', text: `Scam-wave response started by ${actor.name}.`, link: '#command' } });
});

export async function workspaceRules(ws: string): Promise<any[]> {
  const r = await listDocs(ws, 'rules');
  return r.length ? r : K().RULES0;
}
