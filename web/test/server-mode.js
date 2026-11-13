// Browser test against a running Lume engine: two people signed in at once (care desk + brand team).
// Start the engine first (server/README.md), then:  node web/test/server-mode.js [http://localhost:8080]
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const BASE = process.argv[2] || process.env.LUME_URL || 'http://localhost:8080';
const SHOTS = path.resolve(__dirname, '../shots'); fs.mkdirSync(SHOTS, { recursive: true });
const errs = []; const fails = [];
const ok = (cond, label) => { console.log((cond ? 'ok   ' : 'FAIL ') + label); if (!cond) fails.push(label); };

async function signIn(b, uid, pw = 'lume2026') {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(uid + ': ' + e.message));
  await p.goto(BASE + '/'); await p.waitForSelector('#si-form');
  await p.fill('#si-uid', uid); await p.fill('#si-pw', pw); await p.click('#si-submit');
  await p.waitForSelector('#main .page', { timeout: 10000 });
  return { ctx, p, ev: (fn, a) => p.evaluate(fn, a) };
}
const until = async (page, fn, arg, ms = 20000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 300 }).then(() => true).catch(() => false);

(async () => {
  const b = await chromium.launch();
  // reset the shared workspace as the pilot admin
  const admin = await signIn(b, 'whale.admin');
  await admin.p.evaluate(async () => { await api('POST', '/api/v1/admin/reset'); });
  await admin.p.waitForTimeout(800);

  // wrong password shows a message and does not sign in
  const anon = await (await b.newContext()).newPage();
  await anon.goto(BASE + '/'); await anon.waitForSelector('#si-form');
  await anon.fill('#si-uid', 'agus.firmansyah'); await anon.fill('#si-pw', 'wrong'); await anon.click('#si-submit'); await anon.waitForTimeout(500);
  ok(/not right/.test(await anon.textContent('#si-msg')), 'wrong password is refused by the engine');

  const care = await signIn(b, 'agus.firmansyah');
  const brand = await signIn(b, 'dewi.anggraini');
  ok(await care.ev(() => SERVER.on && S.role === 'care' && S.inbox.length > 10), 'care desk loads the shared workspace');
  ok(await brand.ev(() => S.role === 'brand' && !document.querySelector('#rolesel')), 'brand user is locked to the brand team');

  // 1. care desk answers a complaint; the reply is delivered and the ticket is created
  await care.ev(() => location.hash = '#care'); await care.p.waitForTimeout(400);
  const bu = await care.ev(() => S.inbox.find(m => m.handle === '@bu***45').id);
  await care.p.click(`.qi[data-id="${bu}"]`); await care.p.waitForTimeout(200);
  await care.p.click('[data-act="care-draft"]'); await care.p.waitForTimeout(200);
  await care.p.click('[data-act="care-post"]');
  ok(await until(care.p, id => { const m = S.inbox.find(x => x.id === id); return m && m.deliveries && m.deliveries[m.thread.length - 1] && m.deliveries[m.thread.length - 1].status === 'sent'; }, bu), 'reply delivered to the platform (sandbox)');
  const tk = await care.ev(id => S.inbox.find(x => x.id === id).ticketId, bu);
  ok(/^SM-\d+$/.test(tk || ''), 'complaint ticket created: ' + tk);
  await care.ev(id => { S.ui.careF = 'all'; S.ui.careSel = id; render(); }, bu); await care.p.waitForTimeout(300);
  ok(/✓ sent/.test(await care.p.textContent('#main')), 'care desk shows "✓ sent" on the reply');
  await care.p.screenshot({ path: SHOTS + '/srv_care.png' });

  // 2. the brand team sees it live, without reloading
  ok(await until(brand.p, ([id, t]) => { const m = S.inbox.find(x => x.id === id); return m && m.ticketId === t && S.tickets.some(x => x.id === t); }, [bu, tk]), 'brand team receives the reply and ticket live');

  // 3. a new customer message arrives through the listening pipeline and shows up for the care desk
  await admin.p.evaluate(async () => api('POST', '/api/v1/sandbox/incoming', { acc: 'ig_main', kind: 'Comment', handle: '@nasabah_baru', text: 'Kartu kredit saya diblokir, no kartu 4111 1111 1111 1111 tolong bantu' }));
  ok(await until(care.p, () => S.inbox.some(m => /diblokir, no kartu/.test(m.text) && m.ai.type === 'Complaint' && /••••1111/.test(m.text))), 'incoming message classified and masked, live in the care queue');

  // 4. brand schedules a post and publishes it now; the engine publishes and returns the link
  await brand.ev(() => location.hash = '#calendar'); await brand.p.waitForTimeout(400);
  await brand.p.click('.toolbar [data-act="post-new"]'); await brand.p.waitForTimeout(200);
  await brand.p.fill('#np-title', 'Tips aman bertransaksi');
  await brand.p.fill('#np-cap', 'CIMB Niaga tidak pernah meminta OTP, PIN, atau password. #WaspadaSelalu');
  await brand.p.waitForTimeout(150);
  await brand.p.click('[data-act="np-save"]'); await brand.p.waitForTimeout(800);
  const pid = await brand.ev(() => (S.posts.filter(p => p.title === 'Tips aman bertransaksi')[0] || {}).id);
  ok(!!pid, 'post scheduled');
  ok(await until(brand.p, id => SERVER.ver.posts.get(id) >= 1, pid), 'post saved by the engine');
  await brand.ev(id => { ACT['post-open']({ dataset: { id } }); }, pid); await brand.p.waitForTimeout(200);
  await brand.p.click('[data-act="post-now"]');
  ok(await until(brand.p, id => { const p = S.posts.find(x => x.id === id); return p && p.status === 'published' && p.pub && p.pub.url; }, pid), 'engine published the post and saved the link');
  await brand.ev(id => { ACT['post-open']({ dataset: { id } }); }, pid); await brand.p.waitForTimeout(200);
  ok(/On the platform/.test(await brand.p.textContent('#modal')), 'post dialog shows the platform link');
  await brand.p.screenshot({ path: SHOTS + '/srv_post.png' }); await brand.p.keyboard.press('Escape');

  // 5. care desk tries to post on the brand calendar: the engine refuses even if the browser is bypassed
  const forced = await care.ev(async () => { const r = await api('POST', '/api/v1/sync', { mutations: [{ col: 'posts', id: 'p_hack', op: 'put', set: { id: 'p_hack', acc: 'ig_main', at: Date.now() + 86400000, title: 'x', camp: 'tip', format: 'Post', status: 'scheduled', caption: 'x' }, baseVer: 0 }] }); return r.data.rejected && r.data.rejected[0] && r.data.rejected[0].code; });
  ok(forced === 'forbidden', 'engine refuses a post from the care desk (' + forced + ')');

  // 6. advocate phone (demo): task submission reaches the engine and points are awarded
  await admin.ev(() => { S.ui.drawer = true; document.body.classList.add('has-drawer'); render(); }); await admin.p.waitForTimeout(300);
  await admin.p.click('[data-act="ph-open"][data-id="t1"]'); await admin.p.waitForTimeout(200);
  await admin.p.click('[data-act="ph-ai"]'); await admin.p.waitForTimeout(300);
  const pts0 = await admin.ev(() => advById('a0').points);
  await admin.p.click('[data-act="ph-post"]'); await admin.p.waitForTimeout(2500);
  ok(await until(brand.p, p0 => advById('a0').points > p0 && taskById('t1').exec.find(e => e.adv === 'a0').st === 'done', pts0), 'advocate post and points reach other people live');
  ok(await until(admin.p, () => taskById('t1').exec.find(e => e.adv === 'a0').verified === 'yes'), 'engine verified the advocate link');

  // 7. reload keeps the session; sign out works
  await care.p.reload(); await care.p.waitForSelector('#main .page', { timeout: 10000 });
  ok(await care.ev(() => SERVER.user && SERVER.user.uid === 'agus.firmansyah'), 'session survives a reload');
  await care.p.click('[data-act="user-menu"]'); await care.p.click('[data-act="sign-out"]'); await care.p.waitForTimeout(500);
  ok(!!(await care.p.$('#si-form')), 'sign out returns to the sign-in screen');
  const after = await care.ev(async () => (await api('GET', '/api/v1/workspace')).status);
  ok(after === 401, 'signed-out browser can no longer read the workspace');

  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASSED');
  process.exit(fails.length ? 1 : 0);
})();
