// End-to-end API tests against a running engine (sandbox connectors, demo mode).
// Start one first:  npm run build && node dist/index.js all   (with Postgres + Redis up)
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.LUME_URL || 'http://localhost:8080';
const PW = process.env.PILOT_PASSWORD || 'lume2026';

class Session {
  cookie = '';
  constructor(public role?: string) {}
  async req(method: string, path: string, body?: unknown, extra: Record<string, string> = {}) {
    const res = await fetch(BASE + path, {
      method,
      headers: { 'content-type': 'application/json', 'x-lume-csrf': '1', 'x-lume-client': 'test', ...(this.cookie ? { cookie: this.cookie } : {}), ...(this.role ? { 'x-lume-role': this.role } : {}), ...extra },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const set = res.headers.get('set-cookie');
    if (set) this.cookie = set.split(';')[0];
    const text = await res.text();
    let json: any = null; try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, body: json };
  }
  async login(uid: string, password = PW) { return this.req('POST', '/api/v1/auth/login', { uid, password }); }
  async ws() { return (await this.req('GET', '/api/v1/workspace')).body; }
  async put(col: string, id: string, set: Record<string, unknown>, action?: string) { return (await this.req('POST', '/api/v1/sync', { action, mutations: [{ col, id, op: 'put', set }] })).body; }
}
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
async function until<T>(fn: () => Promise<T | null | undefined | false>, ms = 15000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) { const v = await fn(); if (v) return v as T; if (Date.now() > end) throw new Error('timed out'); await wait(400); }
}

const admin = new Session();
before(async () => {
  const h = await fetch(BASE + '/api/v1/health').then(r => r.json());
  assert.equal(h.engine, 'lume'); assert.equal(h.db, true); assert.equal(h.redis, true);
  assert.equal((await admin.login('whale.admin')).status, 200);
  assert.equal((await admin.req('POST', '/api/v1/admin/reset')).status, 200);
  await wait(300);
});

test('sign-in: wrong password, lockout, CSRF header, session', async () => {
  const s = new Session();
  const bad = await s.login('agus.firmansyah', 'nope');
  assert.equal(bad.status, 401); assert.equal(bad.body.left, 4);
  const noCsrf = await fetch(BASE + '/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(noCsrf.status, 403);
  const lock = new Session();
  for (let i = 0; i < 5; i++) await lock.login('hasan.lubis', 'x' + i);
  const locked = await lock.login('hasan.lubis');
  assert.equal(locked.status, 429); assert.ok(locked.body.retryIn > 0);
  const ok = await s.login('agus.firmansyah');
  assert.equal(ok.status, 200); assert.equal(ok.body.user.role, 'care');
  assert.equal((await s.req('GET', '/api/v1/auth/me')).body.user.uid, 'agus.firmansyah');
  assert.equal((await new Session().req('GET', '/api/v1/workspace')).status, 401);
});

test('workspace snapshot has every collection', async () => {
  const w = await admin.ws();
  for (const k of ['accounts', 'posts', 'tasks', 'inbox', 'tickets', 'advocates', 'rules', 'ledger']) assert.ok(Array.isArray(w.state[k]) && w.state[k].length, k);
  assert.ok(w.state.listen && w.state.ticketSeq > 24000);
  assert.ok(w.versions.posts[w.state.posts[0].id] >= 1);
});

test('teams publish only to their own accounts', async () => {
  const km = new Session(); await km.login('fikri.ramadhan');
  const when = Date.now() + 2 * 86400000;
  const denied = await km.put('posts', 'p_test_km1', { id: 'p_test_km1', acc: 'ig_main', at: when, title: 'Hijack', camp: 'km', format: 'Post', status: 'scheduled', caption: 'Halo' });
  assert.equal(denied.rejected[0].code, 'forbidden');
  const ok = await km.put('posts', 'p_test_km2', { id: 'p_test_km2', acc: 'ig_km', at: when, title: 'Member story', camp: 'km', format: 'Reel', status: 'scheduled', caption: 'Seru banget di Kejar Mimpi!' });
  assert.equal(ok.applied[0].data.status, 'scheduled');
});

test('compliance gate: blocked captions are refused, high-risk products wait for Compliance', async () => {
  const brand = new Session(); await brand.login('dewi.anggraini');
  const when = Date.now() + 86400000;
  const blocked = await brand.put('posts', 'p_test_b1', { id: 'p_test_b1', acc: 'ig_main', at: when, title: 'Reksa dana', camp: 'tip', format: 'Post', status: 'scheduled', caption: 'Reksa dana pasti untung 12% per tahun!', product: 'Reksa dana' });
  assert.equal(blocked.rejected.length, 1); assert.match(blocked.rejected[0].reason, /Guaranteed returns/);
  const routed = await brand.put('posts', 'p_test_b2', { id: 'p_test_b2', acc: 'ig_main', at: when, title: 'Reksa dana', camp: 'tip', format: 'Post', status: 'scheduled', product: 'Reksa dana', caption: 'Mulai investasi reksa dana di OCTO. Investasi reksa dana mengandung risiko. Calon investor wajib membaca dan memahami prospektus sebelum berinvestasi. Kinerja masa lalu tidak mencerminkan kinerja masa datang.' });
  const p = routed.applied.find((c: any) => c.col === 'posts');
  assert.equal(p.data.status, 'draft');
  assert.ok(routed.applied.some((c: any) => c.col === 'notifs'));
  const brandApprove = await brand.put('posts', 'p_test_b2', { status: 'scheduled' });
  assert.equal(brandApprove.applied[0].data.status, 'draft', 'brand cannot self-approve');
  const comp = new Session(); await comp.login('maria.tambunan');
  const approved = await comp.put('posts', 'p_test_b2', { status: 'scheduled' });
  assert.equal(approved.applied[0].data.status, 'scheduled');
  assert.equal(approved.applied[0].data.approvedBy, 'Maria Tambunan');
});

test('publish now: the worker publishes through the connector and records the link', async () => {
  const brand = new Session(); await brand.login('dewi.anggraini');
  const id = 'p_test_now';
  await brand.put('posts', id, { id, acc: 'x_main', at: Date.now() + 3600000, title: 'Waspada', camp: 'waspada', format: 'Post', status: 'scheduled', caption: 'CIMB Niaga tidak pernah meminta OTP. #WaspadaSelalu' });
  const r = await brand.put('posts', id, { status: 'published' }, 'post-now');
  assert.equal(r.applied[0].data.status, 'publishing');
  const done = await until(async () => { const w = await brand.ws(); const p = w.state.posts.find((x: any) => x.id === id); return p.status === 'published' && p; });
  assert.match(done.pub.url, /^https:\/\/x\.com\//);
  const d = await admin.req('GET', '/api/v1/deliveries?ref=' + id);
  assert.equal(d.body.rows[0].status, 'sent');
});

test('scheduled posts publish when their time comes; failures are reported', async () => {
  const brand = new Session(); await brand.login('dewi.anggraini');
  await brand.put('posts', 'p_test_due', { id: 'p_test_due', acc: 'fb_main', at: Date.now() + 1500, title: 'Due soon', camp: 'tip', format: 'Post', status: 'scheduled', caption: 'Tips hemat minggu ini dari OCTO.' });
  await brand.put('posts', 'p_test_fail', { id: 'p_test_fail', acc: 'fb_main', at: Date.now() + 1500, title: 'Will fail', camp: 'tip', format: 'Post', status: 'scheduled', caption: 'Tes [fail] simulasi.' });
  const ok = await until(async () => { const w = await brand.ws(); const p = w.state.posts.find((x: any) => x.id === 'p_test_due'); return p.status === 'published' && p; }, 45000);
  assert.ok(ok.pub.platformId);
  // the failing one retries with back-off; it is either still retrying or failed with a reason
  const w = await brand.ws(); const f = w.state.posts.find((x: any) => x.id === 'p_test_fail');
  assert.ok(['publishing', 'failed'].includes(f.status));
});

test('care desk: incoming message is classified and masked; reply is checked and delivered; ticket numbers are issued by the server', async () => {
  const care = new Session(); await care.login('agus.firmansyah');
  const inc = await care.req('POST', '/api/v1/sandbox/incoming', { acc: 'x_main', kind: 'Mention', handle: '@budi_santoso', text: 'Saldo terpotong tapi transfer gagal ke rek 7060123456, tolong dicek!' });
  assert.equal(inc.body.added, 1);
  const m = await until(async () => (await care.ws()).state.inbox.find((x: any) => /transfer gagal ke rek/.test(x.text)));
  assert.equal(m.ai.type, 'Complaint'); assert.ok(m.pii.includes('account')); assert.match(m.text, /\[rekening ••••3456\]/); assert.equal(m.handle, '@bu***so');
  // a reply that asks for an OTP is refused
  const bad = await care.put('inbox', m.id, { thread: [{ from: 'brand', at: Date.now(), text: 'Kirimkan kode OTP Kakak ke DM ya', by: 'Agus F.' }], status: 'replied' });
  assert.equal(bad.rejected.length, 1);
  // a good reply with a new ticket: the ticket id the browser picked is replaced if taken
  const w = await care.ws(); const taken = w.state.tickets[0].id;
  const t = { id: taken, createdAt: Date.now(), src: { acc: m.acc, kind: m.kind, handle: m.handle }, issue: m.text.slice(0, 60), product: 'OCTO', theme: 'Transfer delayed', sentiment: 'Negative', priority: 'High', owner: 'Digital banking care', contact: 'Moved to Ask OCTO WhatsApp', status: 'new', docsAt: null, extended: false, cms: 'CMS-2026-118999', step: 3, log: [{ at: Date.now(), text: 'Captured', by: 'Lume' }] };
  const res = (await care.req('POST', '/api/v1/sync', { action: 'care-post', mutations: [
    { col: 'inbox', id: m.id, op: 'put', set: { thread: [{ from: 'brand', at: Date.now(), text: `Mohon maaf atas kendalanya, Kak. Demi keamanan, jangan bagikan data rekening di sini ya. Tim kami hubungi via DM. No. tiket: ${taken}.`, by: 'Agus F.' }], status: 'ticketed', ticketId: taken } },
    { col: 'tickets', id: taken, op: 'put', set: t, baseVer: 0 }
  ] })).body;
  assert.equal(res.rejected.length, 0, JSON.stringify(res.rejected));
  const newId = res.remap[taken]; assert.ok(newId && newId !== taken);
  const saved = res.applied.find((c: any) => c.col === 'inbox').data;
  assert.equal(saved.ticketId, newId); assert.match(saved.thread[0].text, new RegExp(newId));
  const sent = await until(async () => { const x = (await care.ws()).state.inbox.find((y: any) => y.id === m.id); return x.deliveries?.[0]?.status === 'sent' && x; });
  assert.ok(sent.deliveries[0].platformId);
  // posted replies can't be edited
  const edit = await care.put('inbox', m.id, { thread: [{ ...saved.thread[0], text: 'changed' }] });
  assert.equal(edit.rejected.length, 1);
});

test('scam wave: three fraud mentions within the hour raise one alert', async () => {
  const care = new Session(); await care.login('agus.firmansyah');
  for (const txt of ['Ada yang telp ngaku CS CIMB minta kode OTP saya', 'Akun cs palsu minta PIN lewat DM', 'Dapat link palsu hadiah undian CIMB, penipuan ya?']) {
    await care.req('POST', '/api/v1/sandbox/incoming', { acc: 'x_main', kind: 'Mention', handle: '@warga_' + Math.random().toString(36).slice(2, 6), text: txt });
  }
  const n = await until(async () => (await care.ws()).state.notifs.find((x: any) => /^Scam wave/.test(x.text)));
  assert.match(n.text, /fraud mentions/);
});

test('tasks: compliance approves high-risk tasks; advocates are notified', async () => {
  const brand = new Session(); await brand.login('dewi.anggraini');
  const w = await brand.ws();
  const kos = w.state.advocates.filter((a: any) => a.circle === 'KOS' && a.optIn).slice(0, 5).map((a: any) => a.id);
  const task = { id: 't_test1', name: 'Reksa dana explainer', playbook: 'Product launches', goal: 'Explain', circles: ['KOS'], assignees: kos, channels: ['instagram'], start: Date.now(), deadline: Date.now() + 5 * 86400000, product: 'Reksa dana', camp: 'tip', link: 'cimb.id/rd', paid: false, disclosure: true, topics: ['#OCTO'], assets: [], template: 'Mulai investasi di OCTO {link} {topik} #iklan Investasi reksa dana mengandung risiko. Calon investor wajib membaca dan memahami prospektus sebelum berinvestasi. Kinerja masa lalu tidak mencerminkan kinerja masa datang.', status: 'draft', points: 20, creator: 'Dewi Anggraini', owner: 'brand', exec: kos.map((a: string) => ({ adv: a, st: 'pending' })) };
  assert.equal((await brand.put('tasks', task.id, task)).rejected.length, 0);
  const pub = await brand.put('tasks', task.id, { status: 'progress' }, 'task-publish');
  assert.equal(pub.applied.find((c: any) => c.col === 'tasks').data.status, 'review');
  const care = new Session(); await care.login('agus.firmansyah');
  assert.equal((await care.put('tasks', task.id, { status: 'progress' })).rejected[0].code, 'forbidden');
  const comp = new Session(); await comp.login('maria.tambunan');
  const ok = await comp.put('tasks', task.id, { status: 'progress' }, 'task-approve');
  assert.equal(ok.applied[0].data.status, 'progress');
  const d = await until(async () => (await admin.req('GET', '/api/v1/deliveries?ref=t_test1')).body.rows.find((r: any) => r.kind === 'advocate-new' && r.status === 'sent'));
  assert.equal(d.response.advocates, 5);
});

test('advocate app: magic link, task list, caption check, submission and points', async () => {
  const brand = new Session(); await brand.login('dewi.anggraini');
  const w = await brand.ws();
  const t = w.state.tasks.find((x: any) => x.status === 'progress' && !x.paid && x.exec.some((e: any) => e.st === 'pending'));
  const e = t.exec.find((x: any) => x.st === 'pending');
  const link = await brand.req('POST', '/api/v1/advocate/links', { advocateId: e.adv });
  assert.equal(link.status, 200);
  const auth = { authorization: 'Bearer ' + link.body.token };
  const me = await new Session().req('GET', '/api/v1/advocate/me', undefined, auth);
  assert.ok(me.body.tasks.some((x: any) => x.id === t.id));
  const bad = await new Session().req('POST', `/api/v1/advocate/tasks/${t.id}/submit`, { platforms: ['instagram'], urls: ['https://instagram.com/p/abc'], caption: 'Dijamin untung pakai OCTO!' }, auth);
  assert.equal(bad.status, 422);
  const before = w.state.advocates.find((a: any) => a.id === e.adv).points;
  const caption = t.template.replace('{cerita}', 'Seru!').replace('{link}', t.link).replace('{topik}', t.topics.join(' ')).replace('{kota}', 'Jakarta').replace('{cabang}', 'Sudirman') + (t.disclosure && !/#iklan/.test(t.template) ? ' #iklan' : '');
  const good = await new Session().req('POST', `/api/v1/advocate/tasks/${t.id}/submit`, { platforms: ['instagram'], urls: ['https://instagram.com/p/abc123'], caption }, auth);
  assert.equal(good.status, 200, JSON.stringify(good.body));
  const after = await until(async () => { const x = await brand.ws(); const ex = x.state.tasks.find((y: any) => y.id === t.id).exec.find((y: any) => y.adv === e.adv); return ex.verified === 'yes' && x; });
  assert.equal(after.state.advocates.find((a: any) => a.id === e.adv).points, before + (t.points || 0));
});

test('OJK clock: documents complete starts the clock; closed tickets are locked; CSV export', async () => {
  const care = new Session(); await care.login('agus.firmansyah');
  const w = await care.ws();
  const t = w.state.tickets.find((x: any) => !x.closedAt && !x.docsAt);
  const r = await care.put('tickets', t.id, { docsAt: Date.now(), status: 'progress', step: 6, log: [...t.log, { at: Date.now(), text: 'Documents complete', by: 'Agus Firmansyah' }] });
  assert.equal(r.rejected.length, 0);
  const comp = new Session(); await comp.login('maria.tambunan');
  assert.equal((await comp.put('tickets', t.id, { owner: 'Cards' })).rejected[0].code, 'forbidden');
  const shortened = await care.put('tickets', t.id, { log: [] });
  assert.equal(shortened.rejected.length, 1);
  const csv = await comp.req('GET', '/api/v1/reports/complaints.csv');
  assert.equal(csv.status, 200); assert.match(String(csv.body), /ticket,cms_reference,created/);
});

test('rules and audit: only Compliance changes rules; the audit chain verifies', async () => {
  const brand = new Session(); await brand.login('dewi.anggraini');
  assert.equal((await brand.put('rules', 'tone', { on: false })).rejected[0].code, 'forbidden');
  const comp = new Session(); await comp.login('maria.tambunan');
  assert.equal((await comp.put('rules', 'tone', { on: true })).rejected.length, 0);
  const v = await comp.req('GET', '/api/v1/audit/verify');
  assert.equal(v.body.ok, true); assert.ok(v.body.rows > 10);
  assert.equal((await brand.req('GET', '/api/v1/audit/verify')).status, 403);
});

test('admin role switcher is honoured only for admins', async () => {
  const care = new Session('brand'); await care.login('agus.firmansyah');
  const r = await care.put('posts', 'p_test_sw', { id: 'p_test_sw', acc: 'ig_main', at: Date.now() + 86400000, title: 'x', camp: 'tip', format: 'Post', status: 'scheduled', caption: 'Tips' });
  assert.equal(r.rejected[0].code, 'forbidden');
  const adm = new Session('km'); await adm.login('whale.admin');
  assert.equal((await adm.put('posts', 'p_test_sw2', { id: 'p_test_sw2', acc: 'ig_km', at: Date.now() + 86400000, title: 'x', camp: 'km', format: 'Post', status: 'scheduled', caption: 'Seru' })).rejected.length, 0);
});

test('webhooks: Meta signature is required', async () => {
  const r = await fetch(BASE + '/webhooks/meta', { method: 'POST', headers: { 'content-type': 'application/json', 'x-hub-signature-256': 'sha256=00' }, body: JSON.stringify({ object: 'instagram', entry: [] }) });
  assert.equal(r.status, 401);
});
