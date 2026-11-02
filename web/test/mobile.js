const { chromium } = require('playwright');
const SHOTS = require('path').resolve(__dirname, '../shots'); require('fs').mkdirSync(SHOTS, { recursive: true });
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + require('path').resolve(__dirname, '../dist/lume-cimb-niaga.html') + '#command'); await p.waitForTimeout(500);
  for (const r of ['command','care','tasks','calendar']) { await p.evaluate(h => location.hash = h, '#'+r); await p.waitForTimeout(250);
    console.log(r, 'docW', await p.evaluate(() => document.documentElement.scrollWidth), 'mainW', await p.evaluate(() => document.querySelector('.page').scrollWidth)); }
  await p.evaluate(() => location.hash = '#command'); await p.waitForTimeout(250);
  await p.screenshot({ path: SHOTS + '/m_command.png' });
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none'); await b.close();
})();
