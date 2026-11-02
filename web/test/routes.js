const { chromium } = require('playwright');
const SHOTS = require('path').resolve(__dirname, '../shots'); require('fs').mkdirSync(SHOTS, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|net::/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await p.goto('file://' + require('path').resolve(__dirname, '../dist/lume-cimb-niaga.html') + '#command');
  await p.waitForTimeout(800);
  const routes = ['command','calendar','tasks','task-t1','library','accounts','network','insights','care','tickets','ticket-SM-24817','compliance','reports','scorecard'];
  for (const r of routes) {
    await p.evaluate(h => location.hash = h, '#' + r);
    await p.waitForTimeout(350);
    const txt = await p.evaluate(() => document.querySelector('#main').innerText.slice(0, 120).replace(/\n/g,' | '));
    console.log(r.padEnd(18), txt);
    await p.screenshot({ path: `${SHOTS}/${r}.png` });
  }
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none');
  await b.close();
})();
