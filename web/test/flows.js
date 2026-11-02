const { chromium } = require('playwright');
const SHOTS = require('path').resolve(__dirname, '../shots'); require('fs').mkdirSync(SHOTS, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|net::/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const log = (...a) => console.log(...a);
  const ev = (f, a) => p.evaluate(f, a);
  await p.goto('file://' + require('path').resolve(__dirname, '../dist/lume-cimb-niaga.html') + '#command');
  await p.waitForTimeout(600);
  log('KPIs:', await ev(() => [...document.querySelectorAll('.kpi .v')].slice(0,6).map(x=>x.textContent).join(' | ')));
  await p.screenshot({ path: '' + SHOTS + '/f_command.png' });

  // 1. care: complaint -> draft -> post -> ticket
  await p.evaluate(() => location.hash = '#care'); await p.waitForTimeout(300);
  log('open queue:', await ev(() => S.inbox.filter(m=>m.status==='new').length), 'over:', await ev(() => S.inbox.filter(m=>m.status==='new' && m.due<Date.now()).length));
  const bu = await ev(() => S.inbox.find(m => m.handle === '@bu***45').id);
  await p.click(`.qi[data-id="${bu}"]`); await p.waitForTimeout(200);
  await p.click('[data-act="care-draft"]'); await p.waitForTimeout(200);
  log('draft:', await ev(() => document.querySelector('#care-reply').value));
  await p.click('[data-act="care-post"]'); await p.waitForTimeout(300);
  log('after post:', await ev(() => { const m = S.inbox.find(x => x.handle === '@bu***45'); return m.status + ' ' + m.ticketId + ' | ' + m.thread[m.thread.length-1].text; }));
  // PII complaint
  log('PII masked:', await ev(() => S.inbox.find(m => m.handle === '@ti***na').text));
  // fraud check of reply that asks for OTP
  await p.evaluate(() => { S.ui.careSel = S.inbox.find(m => m.handle === '@ag***19').id; render(); });
  await p.fill('#care-reply', 'Kak, kirimkan OTP kamu via DM ya biar kami cek');
  await p.waitForTimeout(150);
  log('bad reply verdict:', await ev(() => document.querySelector('#care-chk .verdict').textContent));
  await p.screenshot({ path: '' + SHOTS + '/f_care.png' });

  // 2. simulate incoming
  await p.click('[data-act="sim-open"]'); await p.waitForTimeout(150);
  await p.fill('#sim-txt', 'Kartu kredit saya 4111 1111 1111 1111 diblokir, tolong dicek dong');
  await p.waitForTimeout(100);
  log('sim preview:', await ev(() => document.querySelector('#sim-prev').innerText.replace(/\n/g,' ')));
  await p.click('[data-act="sim-add"]'); await p.waitForTimeout(300);
  log('sim added:', await ev(() => { const m = S.inbox[0]; return m.ai.type + ' / ' + m.ai.product + ' / ' + m.text; }));

  // 3. calendar stagger
  await p.evaluate(() => location.hash = '#calendar'); await p.waitForTimeout(300);
  log('clash before:', await ev(() => document.querySelector('.pill.crit, .pill.good').textContent));
  await p.click('[data-act="cal-stagger"]'); await p.waitForTimeout(300);
  log('clash after:', await ev(() => document.querySelector('.pagehead + .row .pill').textContent));
  await p.screenshot({ path: '' + SHOTS + '/f_calendar.png' });

  // 4. new post blocked
  await p.click('.toolbar [data-act="post-new"]'); await p.waitForTimeout(200);
  await p.fill('#np-title', 'Test');
  await p.fill('#np-cap', 'KPR CIMB Niaga terbaik, bunga 2% pasti untung!');
  await p.waitForTimeout(100);
  log('new post verdict:', await ev(() => document.querySelector('#np-chk .verdict').textContent));
  await p.click('[data-act="np-fix"]'); await p.waitForTimeout(100);
  log('after fix:', await ev(() => document.querySelector('#np-cap').value), '=>', await ev(() => document.querySelector('#np-chk .verdict').textContent));
  await p.click('[data-act="np-save"]'); await p.waitForTimeout(200);
  log('posts:', await ev(() => S.posts.length));

  // 5. task wizard
  await p.evaluate(() => location.hash = '#tasks'); await p.waitForTimeout(300);
  await p.click('[data-act="task-new"]').catch(()=>{});
  await p.waitForTimeout(150);
  log('wizard open?', await ev(() => !!document.querySelector('#w-name')));
  await ev(() => { if (!document.querySelector('#w-name')) ACT['pb-start']({dataset:{i:0}}); });
  await p.waitForTimeout(150);
  await p.fill('#w-name', 'OCTO payday tips');
  await p.waitForTimeout(100);
  log('wizard count:', await ev(() => document.querySelector('#w-count').innerText));
  await p.click('[data-act="w-save"][data-pub="1"]'); await p.waitForTimeout(300);
  log('task created:', await ev(() => location.hash + ' ' + S.tasks[0].name + ' ' + S.tasks[0].status));

  // 6. phone
  await p.click('[data-act="drawer"]'); await p.waitForTimeout(300);
  const t1 = await ev(() => document.querySelector('[data-act="ph-open"]') ? document.querySelector('[data-act="ph-open"]').dataset.id : null);
  log('phone first task:', t1);
  await p.click(`[data-act="ph-open"][data-id="t1"]`); await p.waitForTimeout(200);
  await p.click('[data-act="ph-ai"]'); await p.waitForTimeout(200);
  log('phone caption:', await ev(() => S.phone.cap), '|', await ev(() => document.querySelector('#ph-chk').innerText));
  await p.screenshot({ path: '' + SHOTS + '/f_phone.png' });
  const before = await ev(() => advById('a0').points);
  await p.click('[data-act="ph-post"]'); await p.waitForTimeout(1800);
  log('posted:', await ev(() => taskById('t1').exec.find(e=>e.adv==='a0').st), 'points', before, '->', await ev(() => advById('a0').points));
  await p.screenshot({ path: '' + SHOTS + '/f_phone_done.png' });
  await p.click('#drawer [data-act="drawer"]'); await p.waitForTimeout(200);

  // 7. compliance
  await p.evaluate(() => location.hash = '#compliance'); await p.waitForTimeout(300);
  await p.click('[data-act="c-preset"][data-i="1"]'); await p.waitForTimeout(100);
  log('caption2:', await ev(() => document.querySelector('#c-out .verdict').textContent));
  await p.click('[data-act="c-preset"][data-i="0"]'); await p.click('[data-act="c-fix"]'); await p.waitForTimeout(100);
  log('caption1 fixed:', await ev(() => document.querySelector('#c-txt').value.replace(/\n/g,' ')), '=>', await ev(() => document.querySelector('#c-out .verdict').textContent));
  for (const i of [2,3,4,5]) { await p.click(`[data-act="c-preset"][data-i="${i}"]`); await p.waitForTimeout(80); log('preset', i, await ev(() => document.querySelector('#c-out .verdict').textContent), '|', await ev(() => [...document.querySelectorAll('#c-out .checkrow')].filter(r=>r.querySelector('.bad-i')).map(r=>r.innerText.replace(/\n/g,' ')).join(' ; '))); }

  // 8. roles
  await p.selectOption('#rolesel', 'compliance'); await p.waitForTimeout(200);
  await p.evaluate(() => { S.ui.cTab = 'queue'; render(); }); await p.waitForTimeout(200);
  log('review queue rows:', await ev(() => document.querySelectorAll('[data-act="cq-ok"]').length));
  await p.click('[data-act="cq-ok"]'); await p.waitForTimeout(200);
  log('after approve, queue:', await ev(() => document.querySelectorAll('[data-act="cq-ok"]').length));
  await p.selectOption('#rolesel', 'km'); await p.waitForTimeout(200);
  log('km publish accs:', await ev(() => ROLES[S.role].publish.join(',')));
  await p.selectOption('#rolesel', 'care'); await p.waitForTimeout(200);

  // 9. ticket lifecycle on a waiting ticket
  const tid = await ev(() => S.tickets.find(t => t.status === 'waiting').id);
  await p.evaluate(h => location.hash = h, '#ticket-' + tid); await p.waitForTimeout(300);
  await p.click('[data-act="tk-docs"]'); await p.waitForTimeout(200);
  await p.click('[data-act="tk-resolve"]'); await p.waitForTimeout(200);
  await p.click('[data-act="tk-close"]'); await p.waitForTimeout(200);
  await p.click('[data-act="tk-close-yes"]'); await p.waitForTimeout(200);
  log('ticket', tid, await ev(id => { const t = S.tickets.find(x=>x.id===id); return t.status + ' ' + clockOf(t).label; }, tid));
  await p.screenshot({ path: '' + SHOTS + '/f_ticket.png' });

  // 10. wave push + library upload + scorecard
  await p.selectOption('#rolesel', 'brand'); await p.waitForTimeout(150);
  await p.evaluate(() => location.hash = '#command'); await p.waitForTimeout(300);
  const hasWave = await ev(() => !!document.querySelector('[data-act="wave-push"]'));
  if (hasWave) { await p.click('[data-act="wave-push"]'); await p.waitForTimeout(200); }
  log('wave pushed:', hasWave, await ev(() => S.tasks[0].name));
  await p.evaluate(() => location.hash = '#library'); await p.waitForTimeout(300);
  await p.click('[data-act="asset-upload"]'); await p.waitForTimeout(150);
  await p.fill('#up-title', 'RM tip: dana pendidikan anak'); await p.click('[data-act="up-save"]'); await p.waitForTimeout(200);
  log('asset:', await ev(() => S.assets[0].title + ' ' + S.assets[0].status));
  await p.evaluate(() => location.hash = '#scorecard'); await p.waitForTimeout(300);
  log('scorecard:', await ev(() => [...document.querySelector('.tbl').querySelectorAll('tbody tr')].map(r => r.cells[0].innerText + '=' + r.cells[3].innerText + (r.cells[4].innerText.includes('On')?' ✓':' ✗')).join(' | ')));
  await p.screenshot({ path: '' + SHOTS + '/f_scorecard.png' });
  await p.evaluate(() => location.hash = '#reports'); await p.waitForTimeout(300);
  await p.screenshot({ path: '' + SHOTS + '/f_reports.png' });
  // reload persistence
  await p.reload(); await p.waitForTimeout(500);
  log('persisted tasks:', await ev(() => S.tasks.length), 'role', await ev(() => S.role));
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none');
  await b.close();
})();
