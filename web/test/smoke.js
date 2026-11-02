const { chromium } = require('playwright');
const SHOTS = require('path').resolve(__dirname, '../shots'); require('fs').mkdirSync(SHOTS, { recursive: true });
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + require('path').resolve(__dirname, '../dist/lume-cimb-niaga.html') + '#calendar'); await p.waitForTimeout(500);
  await p.evaluate(() => { localStorage.clear(); }); await p.reload(); await p.waitForTimeout(500);
  await p.click('[data-act="cal-stagger"]'); await p.waitForTimeout(200);
  console.log('stagger:', await p.evaluate(() => S.posts.filter(x => x.camp === 'octo').sort((a,b)=>a.at-b.at).map(x => accById(x.acc).handle + '@' + fmtD(x.at)).join(', ')));
  console.log('pill:', await p.evaluate(() => document.querySelector('.pagehead + .row .pill').textContent));
  await p.screenshot({ path: SHOTS + '/s_cal.png' });
  // drag and drop a scheduled post
  const id = await p.evaluate(() => S.posts.find(x => x.acc === 'tt_main' && x.title === 'Money tip').id);
  const target = await p.evaluate(() => { const c = [...document.querySelectorAll('.cal .cell')].filter(c => c.dataset.drop.startsWith('tt_main|')); return c[6].dataset.drop; });
  await p.dragAndDrop(`.post[data-post="${id}"]`, `.cell[data-drop="${target}"]`); await p.waitForTimeout(200);
  console.log('dnd moved to:', await p.evaluate(i => fmtD(S.posts.find(x => x.id === i).at), id));
  const acts = [['#command','brief'],['#command','weekly-themes'],['#accounts','acc-add'],['#tasks','task-ops'],['#network','invite'],['#tickets','']];
  for (const [h, a] of acts) { await p.evaluate(x => location.hash = x, h); await p.waitForTimeout(250); if (a) { await p.click(`[data-act="${a}"]`); await p.waitForTimeout(200); await p.keyboard.press('Escape'); } }
  await p.evaluate(() => { S.ui.accTab = 'register'; location.hash = '#accounts'; render(); }); await p.waitForTimeout(200);
  await p.click('[data-act="verify-acc"]'); await p.waitForTimeout(150); await p.check('#vt1'); await p.check('#vt2'); await p.click('[data-act="verify-yes"]');
  await p.evaluate(() => { S.ui.accTab = 'watch'; render(); }); await p.click('[data-act="watch-scan"]'); await p.click('[data-act="watch-report"]');
  await p.evaluate(() => location.hash = '#library'); await p.waitForTimeout(200); await p.click('.asset'); await p.waitForTimeout(150); await p.screenshot({ path: SHOTS + '/s_asset.png' }); await p.keyboard.press('Escape');
  await p.evaluate(() => { S.ui.libTab = 'replies'; render(); }); await p.waitForTimeout(150);
  await p.evaluate(() => { S.ui.cTab = 'rules'; location.hash = '#compliance'; render(); }); await p.waitForTimeout(150);
  await p.evaluate(() => { S.ui.cTab = 'kol'; render(); }); await p.evaluate(() => { S.ui.cTab = 'audit'; render(); });
  await p.evaluate(() => { location.hash = '#insights'; }); await p.waitForTimeout(200);
  for (const k of ['conv','chan','eng','hv','prod']) { await p.evaluate(v => { S.ui.lb = v; render(); }, k); }
  await p.click('[data-act="award"]');
  await p.evaluate(() => { location.hash = '#care'; }); await p.waitForTimeout(200);
  for (const h of ['@li***ni','@cimbniaga.cs','@so***wi','@ag***19']) {
    await p.evaluate(x => { S.ui.careSel = S.inbox.find(m => m.handle === x).id; render(); }, h); await p.waitForTimeout(100);
    const btns = await p.evaluate(() => [...document.querySelectorAll('.card .row.wrap.mt8 button')].map(b => b.dataset.act).join(','));
    console.log(h, '->', btns);
  }
  await p.click('[data-act="care-hide"]').catch(() => {});
  await p.evaluate(() => { S.ui.careSel = S.inbox.find(m => m.handle === '@so***wi').id; render(); });
  await p.click('[data-act="care-escalate"]'); await p.waitForTimeout(100); await p.click('[data-act="care-post"]'); await p.waitForTimeout(100);
  await p.evaluate(() => { S.ui.careSel = S.inbox.find(m => m.handle === '@li***ni').id; render(); });
  await p.click('[data-act="care-reshare"]'); await p.waitForTimeout(100); await p.click('[data-act="care-post"]'); await p.waitForTimeout(9500);
  console.log('permission:', await p.evaluate(() => S.inbox.find(m => m.handle === '@li***ni').permission));
  await p.evaluate(() => { S.ui.careSel = S.inbox.find(m => m.handle === '@li***ni').id; render(); });
  await p.click('[data-act="care-ugc"]'); await p.waitForTimeout(200);
  console.log('ugc wizard:', await p.evaluate(() => !!document.querySelector('#w-name') && document.querySelector('#w-name').value));
  await p.keyboard.press('Escape');
  await p.evaluate(() => { location.hash = '#reports'; S.ui.rpPer = 'h1-2027'; render(); });
  console.log('negLog:', await p.evaluate(() => (S.negLog||[]).length));
  // narrow viewport
  await p.setViewportSize({ width: 390, height: 844 }); await p.evaluate(() => location.hash = '#command'); await p.waitForTimeout(300);
  await p.screenshot({ path: SHOTS + '/s_mobile.png' });
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none');
  await b.close();
})();
