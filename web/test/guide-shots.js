// Generates the annotated screenshots for docs/USER_GUIDE.md.
// Run from web/:  node test/guide-shots.js   (needs Playwright + Chromium)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(__dirname, '../../docs/guide/img');
const APP = 'file://' + path.resolve(__dirname, '../dist/lume-cimb-niaga.html');
fs.mkdirSync(OUT, { recursive: true });

// Lets the page grow to full height so any region can be captured, and hides toasts/tooltips.
const FLOW_CSS = `html,body{height:auto!important}.app{height:auto!important;grid-template-rows:52px auto!important}
.body{min-height:100vh}.main{overflow:visible!important}.toasts,.chart-tip{display:none!important}`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));

  const wait = ms => p.waitForTimeout(ms);
  const ev = (fn, arg) => p.evaluate(fn, arg);
  const go = async hash => { await ev(h => { location.hash = h; }, hash); await wait(350); await ev(() => window.scrollTo(0, 0)); };
  const size = async h => { await p.setViewportSize({ width: 1440, height: h }); await wait(150); };
  const click = async (sel, text) => {
    const ok = await ev(([s, t]) => {
      const el = [...document.querySelectorAll(s)].filter(e => !t || (e.textContent || '').includes(t))[0];
      if (!el) return false; el.click(); return true;
    }, [sel, text || '']);
    if (!ok) throw new Error('click target not found: ' + sel + ' ' + (text || ''));
    await wait(250);
  };
  const state = async fn => { await ev(fn); await ev(() => render()); await wait(250); };

  async function fresh() {
    await p.goto(APP + '#command');
    await ev(() => localStorage.clear());
    await p.reload();
    await wait(700);
    await p.addStyleTag({ content: FLOW_CSS });
  }

  // Draws numbered callouts. items: {sel, text, nth, n, pos, pad, noBox}
  async function annotate(items) {
    const missing = await ev(items => {
      const old = document.getElementById('__ann'); if (old) old.remove();
      const root = document.createElement('div'); root.id = '__ann';
      root.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;z-index:2147483000;pointer-events:none';
      const miss = [];
      for (const it of items) {
        let els = [...document.querySelectorAll(it.sel)];
        if (it.text) els = els.filter(e => (e.textContent || '').includes(it.text));
        els = els.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
        const el = els[it.nth || 0];
        if (!el) { miss.push(it.sel + (it.text ? ' [' + it.text + ']' : '')); continue; }
        const r = el.getBoundingClientRect(); const pad = it.pad ?? 4;
        const x = r.left + scrollX - pad, y = r.top + scrollY - pad, w = r.width + pad * 2, h = r.height + pad * 2;
        if (!it.noBox) {
          const b = document.createElement('div');
          b.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border:3px solid #ff2d55;border-radius:8px;box-shadow:0 0 0 2px rgba(255,255,255,.95)`;
          root.appendChild(b);
        }
        const s = 28; let bx = x - s / 2, by = y - s / 2;
        if (it.pos === 'tr') bx = x + w - s / 2;
        if (it.pos === 'l') { bx = x - s - 6; by = y + h / 2 - s / 2; }
        if (it.pos === 'r') { bx = x + w + 6; by = y + h / 2 - s / 2; }
        if (it.pos === 'in') { bx = x + 6; by = y + 6; }
        const d = document.createElement('div'); d.textContent = it.n;
        d.style.cssText = `position:absolute;left:${Math.max(2, bx)}px;top:${Math.max(2, by)}px;width:${s}px;height:${s}px;border-radius:50%;background:#ff2d55;color:#fff;font:800 15px/28px system-ui,-apple-system,Segoe UI,sans-serif;text-align:center;box-shadow:0 0 0 3px #fff,0 2px 6px rgba(0,0,0,.35)`;
        root.appendChild(d);
      }
      document.body.appendChild(root);
      return miss;
    }, items);
    if (missing.length) console.warn('  annotation targets missing:', missing.join(', '));
  }

  // clip: 'top' (viewport), or a list of {sel,text,nth} whose union (+margin) is captured.
  async function shot(name, items, clip = 'top', margin = 18) {
    await annotate(items || []);
    let rect;
    if (clip === 'top') {
      const vp = p.viewportSize(); rect = { x: 0, y: 0, width: vp.width, height: vp.height };
    } else {
      rect = await ev(([parts, m]) => {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const it of parts) {
          let els = [...document.querySelectorAll(it.sel)];
          if (it.text) els = els.filter(e => (e.textContent || '').includes(it.text));
          els = els.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
          const el = els[it.nth || 0]; if (!el) continue;
          const r = el.getBoundingClientRect();
          x0 = Math.min(x0, r.left + scrollX); y0 = Math.min(y0, r.top + scrollY);
          x1 = Math.max(x1, r.right + scrollX); y1 = Math.max(y1, r.bottom + scrollY);
        }
        if (x0 === Infinity) return null;
        const W = document.documentElement.scrollWidth, H = document.documentElement.scrollHeight;
        x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(W, x1 + m); y1 = Math.min(H, y1 + m);
        return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
      }, [clip, margin]);
      if (!rect) throw new Error('clip target not found for ' + name);
    }
    await p.screenshot({ path: path.join(OUT, name + '.png'), clip: rect, fullPage: true });
    await ev(() => { const a = document.getElementById('__ann'); if (a) a.remove(); });
    console.log('  ' + name);
  }
  const closeModal = async () => { await p.keyboard.press('Escape'); await wait(150); };
  const sel = (s, text, nth) => ({ sel: s, text, nth });

  await fresh();

  /* ---------- Getting around ---------- */
  await shot('01-overview', [
    { sel: '#nav', n: 1, pad: -2 }, { sel: '#topbar .search', n: 2 }, { sel: '.ai-badge', n: 3 },
    { sel: '[data-act="notifs"]', n: 4 }, { sel: '#topbar [data-act="drawer"]', n: 5 },
    { sel: 'label:has(#rolesel)', n: 6 }, { sel: '#nav [data-act="reset"]', n: 7 }, { sel: '.page .pagehead', n: 8 }
  ]);
  await click('[data-act="notifs"]');
  await shot('02-notifications', [{ sel: '[data-act="notifs"]', n: 1 }, { sel: '.popover', n: 2 }], [sel('[data-act="notifs"]'), sel('.popover')], 14);
  await closeModal(); await ev(() => closePops());
  await p.fill('#gsearch', 'kejar'); await wait(250);
  await shot('03-search', [{ sel: '#topbar .search', n: 1 }, { sel: '.popover', n: 2 }], [sel('#topbar .search'), sel('.popover')], 14);
  await p.fill('#gsearch', ''); await ev(() => closePops());

  /* ---------- Command centre ---------- */
  await go('#command');
  await shot('04-command-kpis', [
    { sel: '.callout.crit', n: 1 }, { sel: '.page > .grid.g6', n: 2 }, { sel: '.page > .grid.mt12', n: 3 },
    { sel: '.pagehead [data-act="brief"]', n: 4 }, { sel: '.pagehead [data-act="sim-open"]', n: 5 }
  ], [sel('.pagehead'), sel('.page > .grid.mt12')]);
  await shot('05-command-day', [
    { sel: '.card', text: 'How today runs across all accounts', n: 1 }, { sel: '.dark-panel', text: 'Automatic outputs', n: 2 },
    { sel: '.card', text: 'Voice network this week', n: 3 }, { sel: '.card', text: 'What customers ask in branches', n: 4 }
  ], [sel('.page > .grid.mt12', null, 1), sel('.page > .grid.mt12', null, 2)]);
  await click('.pagehead [data-act="brief"]');
  await shot('06-daily-brief', [{ sel: '#brief-txt', n: 1, pad: 2 }, { sel: '.modal [data-act="copy"]', n: 2 }, { sel: '[data-act="brief-send"]', n: 3 }], [sel('.modal')], 10);
  await closeModal();

  /* ---------- Calendar ---------- */
  await go('#calendar');
  await shot('07-calendar-clash', [
    { sel: '.pagehead + .row .pill', n: 1 }, { sel: '.post.clash', n: 2 }, { sel: '[data-act="cal-stagger"]', n: 3 },
    { sel: '.pagehead [data-act="post-new"]', n: 4 }, { sel: '.pagehead .seg', n: 5 }
  ], [sel('.pagehead'), sel('.cal')]);
  await click('[data-act="cal-stagger"]');
  await shot('08-calendar-staggered', [
    { sel: '.pagehead + .row .pill', n: 1 }, { sel: '.post', text: 'OCTO launch', n: 2 }, { sel: '.post', text: 'OCTO video', n: 3 }, { sel: '.post', text: 'OCTO post', n: 4 }
  ], [sel('.pagehead'), sel('.cal')]);
  await size(1250);
  await click('.pagehead [data-act="post-new"]');
  await p.fill('#np-title', 'OCTO Card promo');
  await p.selectOption('#np-prod', 'OCTO Card');
  await p.selectOption('#np-paid', '1');
  await p.fill('#np-cap', 'OCTO Card cicilan 0% sampai 24 bulan, paling untung dibanding bank lain!');
  await wait(200);
  await shot('09-new-post-blocked', [
    { sel: '.modal .checks', n: 1 }, { sel: '#np-cap', n: 2 }, { sel: '[data-act="np-ai"]', n: 3 },
    { sel: '[data-act="np-fix"]', n: 4 }, { sel: '#np-chk', n: 5 }, { sel: '[data-act="np-save"]', n: 6 }
  ], [sel('.modal')], 10);
  await click('[data-act="np-fix"]');
  await shot('10-new-post-fixed', [{ sel: '#np-cap', n: 1 }, { sel: '#np-chk .verdict', n: 2 }], [sel('.modal')], 10);
  await closeModal();
  await p.selectOption('#rolesel', 'km'); await wait(250);
  await click('.pagehead [data-act="post-new"]');
  await shot('11-role-locks', [{ sel: '#rolesel', n: 1 }, { sel: '.modal .chk:not(.lock)', n: 2 }, { sel: '.chk.lock', n: 3 }], [sel('.modal .mh'), sel('.modal .checks'), sel('#rolesel')], 12);
  await closeModal();
  await p.selectOption('#rolesel', 'brand'); await wait(250);
  await size(900);

  /* ---------- Mass tasks ---------- */
  await go('#tasks');
  await shot('12-tasks-list', [
    { sel: '.pagehead [data-act="task-new"]', n: 1 }, { sel: '.page .seg', n: 2 }, { sel: 'tr.click', n: 3 },
    { sel: '.ring', n: 4, pos: 'l' }, { sel: '[data-act="task-ops"]', n: 5 }
  ]);
  await shot('13-playbooks', [{ sel: '[data-act="pb-start"]', n: 1 }], [sel('.page h3', 'Six playbooks'), sel('.page > .grid.g3')]);
  await size(1300);
  await click('.pagehead [data-act="task-new"]');
  await p.fill('#w-name', 'Payday money tips');
  await p.fill('#w-goal', 'Staff share payday money tips with their own OCTO link');
  await p.check('.w-reg[value="Jakarta"]'); await p.check('.w-reg[value="West Java"]'); await wait(150);
  await ev(() => { const a = [...document.querySelectorAll('.modal .ph-assets .a')]; a[16].click(); a[9].click(); });
  await p.fill('#w-tpl', 'Gajian tanggal tua? {cerita} Atur dana darurat lebih gampang di OCTO. {link} {topik}');
  await wait(200);
  await shot('14-task-wizard-who', [
    { sel: '#w-name', n: 1 }, { sel: '.modal .checks', nth: 0, n: 2 }, { sel: '.modal .checks', nth: 1, n: 3 },
    { sel: '#w-count', n: 4 }, { sel: '.modal .checks', nth: 2, n: 5 }, { sel: '.modal .ph-assets', n: 6 }
  ], [sel('.modal')], 10);
  await ev(() => { const mb = document.querySelector('.modal .mb'); mb.scrollTop = mb.scrollHeight; }); await wait(150);
  await shot('15-task-wizard-caption', [
    { sel: '.modal .grid.g4', n: 1 }, { sel: '#w-tpl', n: 2 }, { sel: '#w-chk', n: 3 },
    { sel: '[data-act="w-save"][data-pub="0"]', n: 4 }, { sel: '[data-act="w-save"][data-pub="1"]', n: 5 }
  ], [sel('.modal')], 10);
  await click('[data-act="w-save"][data-pub="1"]');
  await size(900);
  await go('#task-t1');
  await shot('16-task-detail', [
    { sel: '.page > .grid.g6', n: 1 }, { sel: '.card', text: 'Caption template with topic blocks', n: 2 }, { sel: '.card', text: 'Reach by region', n: 3 },
    { sel: '.card .hd .seg', n: 4 }, { sel: '[data-act="task-remind"]', n: 5 }, { sel: '[data-act="task-copy"]', n: 6 }
  ], [sel('.pagehead'), sel('.card', 'Task execution')]);

  /* ---------- Library ---------- */
  await go('#library');
  await shot('17-library', [
    { sel: '.tabs', n: 1 }, { sel: '.page > .grid.g4', n: 2 }, { sel: '.page .search', n: 3 },
    { sel: '.asset', n: 4 }, { sel: '[data-act="asset-upload"]', n: 5 }
  ]);
  await click('.asset');
  await shot('18-asset-detail', [{ sel: '.modal .kv', n: 1 }, { sel: '[data-act="asset-task"]', n: 2 }], [sel('.modal')], 10);
  await closeModal();
  await click('[data-act="asset-upload"]');
  await p.fill('#up-title', 'RM tip: dana pendidikan anak');
  await p.selectOption('#up-type', 'SGC'); await p.selectOption('#up-prod', 'Tabungan');
  await shot('19-upload', [
    { sel: '#up-type', n: 1 }, { sel: '#up-prod', n: 2 }, { sel: '#up-file', n: 3 }, { sel: 'label:has(#up-perm)', n: 4 }, { sel: '[data-act="up-save"]', n: 5 }
  ], [sel('.modal')], 10);
  await closeModal();
  await click('.tabs button', 'Replies');
  await shot('20-replies-kb', [{ sel: '.card', text: 'Approved replies', n: 1 }, { sel: '.card', text: 'Knowledge base answers', n: 2 }]);
  await state(() => { S.ui.libTab = 'assets'; });

  /* ---------- Accounts ---------- */
  await go('#accounts');
  await shot('21-accounts-matrix', [
    { sel: '.tabs', n: 1 }, { sel: '.card', text: 'Instagram engagement rate', n: 2 }, { sel: '.card:has(.tbl) thead', n: 3 },
    { sel: '.card:has(.tbl) .pill', n: 4 }, { sel: '[data-act="acc-add"]', n: 5 }
  ], [sel('.pagehead'), sel('.card:has(.tbl)')]);
  await click('.tabs button', 'Family scorecard');
  await shot('22-family-scorecard', [{ sel: '.page > .grid.g4', n: 1 }, { sel: '.card', text: 'One scorecard per account', n: 2 }, { sel: '.dark-panel', text: 'Guardrails', n: 3 }], [sel('.tabs'), sel('.page > .grid', null, 1)]);
  await click('.tabs button', 'Verified family register');
  await shot('23-register', [{ sel: '.callout.info', n: 1 }, { sel: '[data-act="verify-acc"]', n: 2 }], [sel('.tabs'), sel('.page > .grid.g3')]);
  await click('.tabs button', 'Fake-account watch');
  await shot('24-fake-watch', [{ sel: '[data-act="watch-scan"]', n: 1 }, { sel: '[data-act="watch-report"]', n: 2 }, { sel: '[data-act="watch-warn"]', n: 3 }], [sel('.tabs'), sel('.card:has(.tbl)')]);
  await state(() => { S.ui.accTab = 'matrix'; });

  /* ---------- Voice network ---------- */
  await go('#network');
  await shot('25-network', [{ sel: '.rings-wrap svg', n: 1 }, { sel: '.circle-card', nth: 1, n: 2 }, { sel: '[data-act="invite"]', n: 3 }], [sel('.pagehead'), sel('.rings-wrap')]);
  await shot('26-advocates', [
    { sel: '.card:has([data-act="adv-opt"]) .seg', n: 1 }, { sel: '[data-change="net-r"]', n: 2 }, { sel: '[data-input="net-q"]', n: 3 },
    { sel: '[data-act="adv-opt"]', n: 4, pos: 'l' }
  ], [sel('.card:has([data-act="adv-opt"])')]);

  /* ---------- Advocate app ---------- */
  await size(1000);
  await go('#task-t1');
  await click('#topbar [data-act="drawer"]');
  await shot('27-phone-tasks', [
    { sel: '#drawer .dh select', n: 1 }, { sel: '[data-act="ph-open"][data-id="t1"]', n: 2 }, { sel: '.ph-top .pill.violet', n: 3 }, { sel: '.ph-tabs', n: 4 }
  ], [sel('#drawer')], 0);
  await click('[data-act="ph-open"][data-id="t1"]');
  await click('[data-act="ph-band"]');
  await click('[data-act="ph-ai"]'); await wait(300);
  await shot('28-phone-task', [
    { sel: '.ph-assets', n: 1 }, { sel: 'label:has([data-act="ph-band"])', n: 2 }, { sel: '#ph-cap', n: 3 }, { sel: '[data-act="ph-ai"]', n: 4 }
  ], [sel('#drawer')], 0);
  await ev(() => { const b = document.querySelector('.ph-body'); b.scrollTop = b.scrollHeight; }); await wait(150);
  await shot('29-phone-share', [{ sel: '#ph-chk', n: 1 }, { sel: '.ph-card', text: '3. Pilih akun', n: 2 }, { sel: '[data-act="ph-post"]', n: 3 }, { sel: '[data-act="ph-ignore"]', n: 4 }], [sel('#drawer')], 0);
  await click('[data-act="ph-post"]'); await wait(1900);
  await shot('30-phone-done', [{ sel: '.ph-success', n: 1 }, { sel: '.page > .grid.g6', n: 2 }]);
  await click('[data-act="ph-tab"][data-v="points"]');
  await shot('31-phone-points', [{ sel: '.ph-card', nth: 0, n: 1 }, { sel: '.ph-card', nth: 1, n: 2 }], [sel('#drawer')], 0);
  await click('[data-act="ph-tab"][data-v="profile"]');
  await shot('32-phone-profile', [{ sel: '.ph-card', text: 'Akun terhubung', n: 1 }, { sel: '[data-act="ph-opt"]', n: 2, pos: 'l' }], [sel('#drawer')], 0);
  await click('#drawer [data-act="drawer"]');
  await size(900);

  /* ---------- Insights & points ---------- */
  await go('#insights');
  await shot('33-insights', [
    { sel: '.pagehead .toolbar', n: 1 }, { sel: '.page > .grid.g6', n: 2 }, { sel: '.card', text: 'Post to OCTO', n: 3 },
    { sel: '.card .tabs', n: 4 }, { sel: '.card', text: 'Points rules', n: 5 }, { sel: '[data-act="award"]', n: 6 }
  ], [sel('.pagehead'), sel('.page > .grid.mt12', null, 1)]);

  /* ---------- Care desk ---------- */
  await go('#care');
  await shot('34-care-queue', [
    { sel: '.care .seg', n: 1 }, { sel: '[data-change="care-t"]', n: 2 }, { sel: '.qi', n: 3 },
    { sel: '.side .grid.g2', n: 4 }, { sel: '.pagehead [data-act="sim-open"]', n: 5 }
  ]);
  await state(() => { S.ui.careSel = S.inbox.find(m => m.handle === '@bu***45').id; S.ui.draft = null; });
  await click('[data-act="care-draft"]'); await wait(200);
  await shot('35-care-complaint', [
    { sel: '.care > div:nth-child(2) .callout.violet', n: 1 }, { sel: '[data-change="care-retype"]', n: 2 }, { sel: '#care-reply', n: 3 },
    { sel: '#care-chk', n: 4 }, { sel: '[data-act="care-ticket"]', n: 5 }, { sel: '[data-act="care-post"]', n: 6 }
  ], [sel('.care > div:nth-child(2)')]);
  await click('[data-act="care-post"]');
  await state(() => { S.ui.careSel = S.inbox.find(m => m.handle === '@bu***45').id; S.ui.careF = 'all'; });
  await shot('36-care-ticketed', [{ sel: '.msg.brand', n: 1 }, { sel: '.care > div:nth-child(2) .callout.info', n: 2 }], [sel('.care > div:nth-child(2)')]);
  await state(() => { S.ui.careF = 'open'; S.ui.careSel = S.inbox.find(m => m.handle === '@ag***19').id; });
  await shot('37-care-fraud', [{ sel: '.callout.crit', n: 1 }, { sel: '[data-act="care-fraud"]', n: 2 }, { sel: '.card [data-act="wave-push"]', n: 3 }], [sel('.callout.crit'), sel('.care > div:nth-child(2)')]);
  await state(() => { S.ui.careSel = S.inbox.find(m => m.handle === '@li***ni').id; });
  await shot('38-care-praise', [{ sel: '[data-act="care-reshare"]', n: 1 }, { sel: '[data-act="care-recog"]', n: 2 }], [sel('.care > div:nth-child(2)')]);
  await state(() => { S.ui.careSel = S.inbox.find(m => m.handle === '@so***wi').id; });
  await shot('39-care-crisis', [{ sel: '.care > div:nth-child(2) .callout.violet', n: 1 }, { sel: '[data-act="care-escalate"]', n: 2 }], [sel('.care > div:nth-child(2)')]);
  await state(() => { S.ui.careSel = S.inbox.find(m => m.handle === '@cimbniaga.cs').id; });
  await shot('40-care-spam', [{ sel: '.care > div:nth-child(2) .callout.violet', n: 1 }, { sel: '[data-act="care-hide"]', n: 2 }], [sel('.care > div:nth-child(2)')]);
  await size(1100);
  await click('.pagehead [data-act="sim-open"]');
  await p.fill('#sim-txt', 'Kartu kredit saya 4111 1111 1111 1111 diblokir sejak kemarin, tolong dicek dong'); await wait(200);
  await shot('41-simulate', [{ sel: '#sim-txt', n: 1 }, { sel: '#sim-prev', n: 2 }, { sel: '[data-act="sim-pick"]', n: 3 }, { sel: '[data-act="sim-add"]', n: 4 }], [sel('.modal')], 10);
  await closeModal();
  await size(900);

  /* ---------- Social tickets ---------- */
  await go('#tickets');
  await shot('42-tickets', [
    { sel: '.page > .grid.g6', n: 1 }, { sel: '.callout.info', n: 2 }, { sel: '.page .seg', n: 3 }, { sel: 'tr.click td:last-child', n: 4 }
  ]);
  await go('#ticket-SM-24817');
  await shot('43-ticket-detail', [
    { sel: '.steps', n: 1 }, { sel: '.card', text: 'OJK resolution deadline', n: 2 }, { sel: '.pagehead .toolbar', n: 3 }, { sel: '.card', text: 'Timeline', n: 4 }
  ], [sel('.pagehead'), sel('.card', 'Timeline')]);
  const wid = await ev(() => S.tickets.find(t => t.status === 'waiting').id);
  await go('#ticket-' + wid);
  await shot('44-ticket-docs', [{ sel: '[data-act="tk-docs"]', n: 1 }, { sel: '.callout.warn', n: 2 }], [sel('.pagehead'), sel('.page > .grid.g2')]);
  await click('[data-act="tk-docs"]'); await click('[data-act="tk-resolve"]'); await click('[data-act="tk-close"]');
  await shot('45-ticket-close', [{ sel: '#fu-txt', n: 1 }, { sel: '#fu-csat', n: 2 }, { sel: '[data-act="tk-close-yes"]', n: 3 }], [sel('.modal')], 10);
  await click('[data-act="tk-close-yes"]');

  /* ---------- Compliance ---------- */
  await go('#compliance');
  await click('[data-act="c-preset"][data-i="0"]');
  await shot('46-compliance-try', [
    { sel: '.card .row.wrap', n: 1 }, { sel: '#c-txt', n: 2 }, { sel: '.card .grid.g3', n: 3 },
    { sel: '#c-out .card', n: 4 }, { sel: '[data-act="c-fix"]', n: 5 }, { sel: '[data-act="c-log"]', n: 6 }
  ], [sel('.tabs'), sel('.card:has(#c-txt)'), sel('#c-out')]);
  await click('[data-act="c-fix"]');
  await shot('47-compliance-fixed', [{ sel: '#c-txt', n: 1 }, { sel: '#c-out .verdict', n: 2 }], [sel('.card:has(#c-txt)'), sel('#c-out')]);
  await p.selectOption('#rolesel', 'compliance'); await wait(250);
  await state(() => { S.ui.cTab = 'queue'; });
  await shot('48-compliance-queue', [{ sel: '.tabs', n: 1 }, { sel: '[data-act="cq-ok"]', n: 2 }, { sel: '[data-act="cq-no"]', n: 3 }], [sel('.pagehead'), sel('.card:has([data-act="cq-ok"])')]);
  await state(() => { S.ui.cTab = 'rules'; });
  await shot('49-compliance-rules', [
    { sel: '[data-act="rule-on"]', n: 1, pos: 'r' }, { sel: '[data-change="rule-sev"]', n: 2 }, { sel: '[data-change="rule-words"]', n: 3 },
    { sel: '.card', text: 'Required risk wording', n: 4 }, { sel: '.card', text: 'What OJK requires', n: 5 }
  ]);
  await state(() => { S.ui.cTab = 'kol'; });
  await shot('50-kol-register', [{ sel: '.callout.warn', n: 1 }, { sel: '[data-act="kol-align"]', n: 2 }], [sel('.tabs'), sel('.card:has(.tbl)')]);
  await state(() => { S.ui.cTab = 'audit'; });
  await shot('51-audit-log', [{ sel: '.tbl tbody tr', n: 1 }]);
  await state(() => { S.ui.cTab = 'try'; });
  await p.selectOption('#rolesel', 'brand'); await wait(250);

  /* ---------- Reports & scorecard ---------- */
  await go('#reports');
  await shot('52-reports', [
    { sel: '.pagehead .seg', n: 1 }, { sel: '.pagehead [data-act="copy"]', n: 2 }, { sel: '.page > .grid.g4', n: 3 },
    { sel: '.card', text: 'Top 10 complaint causes', n: 4 }, { sel: '.card', text: 'Negative coverage log', n: 5 }
  ], [sel('.pagehead'), sel('.card', 'Negative coverage log')]);
  await go('#scorecard');
  await shot('53-scorecard', [
    { sel: '.page > .grid.g6', n: 1 }, { sel: '.gantt', n: 2 }, { sel: '.card', text: 'How we’ll know it worked', n: 3 }, { sel: '.dark-panel', text: 'Decision', n: 4 }
  ], [sel('.pagehead'), sel('.card', 'How we’ll know it worked')]);
  await shot('54-owners', [{ sel: '.card', text: 'Clear owners', n: 1 }, { sel: '.dark-panel', text: 'Privacy by design', n: 2 }], [sel('.card', 'Clear owners'), sel('.dark-panel', 'Privacy by design')]);

  console.log(errors.length ? 'PAGE ERRORS:\n' + errors.join('\n') : 'no page errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
