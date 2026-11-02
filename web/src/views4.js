/* ================= Views: Compliance, Voice network, Insights, Scorecard, Reports ================= */
const PRESETS = [
  { l: 'Caption 1 · reksa dana', t: 'Investasi reksa dana di OCTO pasti untung 12% per tahun, dijamin aman!', product: 'Reksa dana', paid: true },
  { l: 'Caption 2 · Kejar Mimpi FEST', t: 'Seru banget di Kejar Mimpi FEST! Atur dana impian lebih gampang pakai OCTO. #KejarMimpi #iklan', product: 'Kejar Mimpi', paid: true },
  { l: 'Wrong product fact', t: 'OCTO Card bisa cicilan 0% sampai 24 bulan lho! #iklan', product: 'OCTO Card', paid: true },
  { l: 'Personal data', t: 'Mau dibantu? DM-in aja nomor kartu dan kirim OTP kamu, nanti aku bantu cek ke CS. Rek aku 706012345678', product: 'OCTO', paid: false },
  { l: 'Comparison & tone', t: 'KPR CIMB Niaga terbaik, lebih untung dari BCA dan Mandiri. Yang lain payah banget!', product: 'KPR', paid: false },
  { l: 'Insurance, compliant', t: 'Lindungi keluarga dengan asuransi jiwa lewat OCTO. Produk asuransi bukan produk bank dan tidak dijamin LPS. Baca ringkasan informasi produk sebelum membeli. #iklan', product: 'Bancassurance', paid: true }
];
VIEWS.compliance = () => {
  const tab = S.ui.cTab || 'try';
  const isC = S.role === 'compliance';
  const queue = [...S.tasks.filter(t => t.status === 'review').map(t => ({ k: 'Task', id: t.id, title: t.name, by: t.creator, product: t.product, text: t.template })), ...S.assets.filter(a => a.status === 'Pending review').map(a => ({ k: 'Library asset', id: a.id, title: a.title, by: a.source || 'Brand team', product: a.product, text: a.title })), ...S.posts.filter(p => p.status === 'draft').map(p => ({ k: 'Calendar post', id: p.id, title: p.title + ' · ' + accById(p.acc).handle, by: 'Brand team', product: p.product, text: p.caption }))];
  const blocked = S.audit.filter(a => a.result === 'Blocked').length;
  const tabs = [['try', 'Try the AI check'], ['queue', `Review queue ${queue.length ? `<span class="badge blue">${queue.length}</span>` : ''}`], ['rules', 'Check rules'], ['kol', 'POJK 6/2026 creator register'], ['audit', 'Audit log']];
  let body = '';
  if (tab === 'try') {
    const cur = S.ui.cTry || { t: PRESETS[0].t, product: PRESETS[0].product, paid: true };
    body = `<div class="grid" style="grid-template-columns:1fr 1.1fr;gap:14px"><div class="card"><div class="bd stack">
      <div class="row wrap">${PRESETS.map((p, i) => `<button class="btn sm" data-act="c-preset" data-i="${i}">${esc(p.l)}</button>`).join('')}</div>
      <label class="fl">Caption or reply<textarea class="input" id="c-txt" data-input="c-run" rows="6">${esc(cur.t)}</textarea></label>
      <div class="grid g3"><label class="fl">Product tag<select class="input" id="c-prod" data-change="c-run">${Object.keys(PRODUCTS).map(k => `<option ${k === cur.product ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
      <label class="fl">Paid / rewarded<select class="input" id="c-paid" data-change="c-run"><option value="1" ${cur.paid ? 'selected' : ''}>Yes · disclosure required</option><option value="0" ${cur.paid ? '' : 'selected'}>No</option></select></label>
      <label class="fl">Type<select class="input" id="c-kind" data-change="c-run"><option value="caption">Post caption</option><option value="reply">Care reply</option></select></label></div>
      <div class="row"><button class="btn" data-act="c-fix">${icon('wand', 14)}Auto-fix suggestions</button><button class="btn primary" data-act="c-log">${icon('shield', 14)}Run & log check</button></div>
      <div class="note">Highlighted words are flagged by the AI. Check rules are configured with CIMB Niaga Compliance in week 0; the same prohibited-promise rules can be shared with Echo’s branch conversation scoring.</div>
    </div></div><div id="c-out"></div></div>
    <div class="grid g3 mt12">${[['Guaranteed returns', '“pasti untung”, “dijamin aman”, “bunga pasti”'], ['Missing disclosure', 'Paid task without #iklan or partnership label'], ['Missing risk warning', 'Investment, insurance or pay-later post with no risk wording'], ['Wrong product facts', 'Rate, fee or tenor different from the product sheet'], ['Personal data in view', 'KTP, card or account numbers, customer faces without consent'], ['Off-brand or risky tone', 'Attacks on competitors, politics, SARA topics']].map(([a, b]) => `<div class="card" style="padding:12px 14px"><div class="row"><span class="bad-i">${icon('alert', 16)}</span><b>${a}</b></div><div class="small ink2 mt8">${b}</div></div>`).join('')}</div>`;
  } else if (tab === 'queue') {
    body = queue.length ? `<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Item</th><th>Type</th><th>Product</th><th>From</th><th>AI check</th><th></th></tr></thead><tbody>${queue.map(q => { const c = checkCompliance(q.text || q.title, { product: q.product, paid: true, disclosure: true }); return `<tr><td><b>${esc(q.title)}</b><div class="tiny muted">${esc((q.text || '').slice(0, 110))}</div></td><td>${q.k}</td><td>${esc(q.product || '—')}${PRODUCTS[q.product] && PRODUCTS[q.product].risk ? ` <span class="pill warn">${RISK_WORDING[PRODUCTS[q.product].risk].label}</span>` : ''}</td><td class="small">${esc(q.by)}</td><td>${verdictPill(c.verdict)}</td><td><div class="row">${isC ? `<button class="btn sm" data-act="cq-no" data-k="${q.k}" data-id="${q.id}">Return</button><button class="btn sm primary" data-act="cq-ok" data-k="${q.k}" data-id="${q.id}">Approve</button>` : '<span class="small muted">Compliance only</span>'}</div></td></tr>`; }).join('')}</tbody></table></div></div>` : '<div class="card"><div class="empty">Nothing waiting for Compliance.</div></div>';
  } else if (tab === 'rules') {
    body = `<div class="grid" style="grid-template-columns:1.3fr 1fr;gap:14px"><div class="card"><div class="hd"><h3>Check rules</h3><span class="sub">${isC ? 'You can edit these' : 'View only · Compliance & Legal edits rules'}</span></div><div class="bd stack">
      ${S.rules.map(r => `<div class="card" style="padding:10px 12px"><div class="row between"><div><b>${esc(r.name)}</b><div class="small ink2">${esc(r.desc)}</div></div><div class="row"><select class="input" style="width:auto;padding:3px 6px" data-change="rule-sev" data-id="${r.id}" ${isC ? '' : 'disabled'} aria-label="Severity"><option value="block" ${r.sev === 'block' ? 'selected' : ''}>Block</option><option value="warn" ${r.sev === 'warn' ? 'selected' : ''}>Warn only</option>${r.id === 'route' ? `<option value="route" selected>Route to Compliance</option>` : ''}</select><button class="switch ${r.on ? 'on' : ''}" data-act="rule-on" data-id="${r.id}" aria-label="Turn rule ${r.on ? 'off' : 'on'}" ${isC ? '' : 'disabled'}></button></div></div>
      ${r.words ? `<label class="fl mt8">Words and phrases<textarea class="input small" rows="2" data-change="rule-words" data-id="${r.id}" ${isC ? '' : 'disabled'}>${esc(r.words.join(', '))}</textarea></label>` : ''}</div>`).join('')}
    </div></div>
    <div class="stack"><div class="card"><div class="hd"><h3>Required risk wording</h3><span class="sub">inserted automatically</span></div><div class="bd stack">${Object.entries(RISK_WORDING).map(([k, w]) => `<div><span class="pill warn">${w.label}</span><div class="preview-text small mt8">${esc(w.text)}</div></div>`).join('')}</div></div>
    <div class="card"><div class="hd"><h3>What OJK requires (POJK 6/2026)</h3></div><div class="bd"><table class="tbl"><tbody>${[['Disclose any economic interest (fees, commissions, affiliate benefits)', 'Disclosure tag required in every paid task; AI blocks posts without it'], ['Information clear, accurate, honest, not misleading', 'Captions built from the approved library; facts checked against the product sheet'], ['No guaranteed profits that don’t fit the product', 'AI flags “pasti untung”, “dijamin” before posting'], ['Risk warnings for high-risk or complex products and pay-later', 'Risk wording inserted automatically for those product tags'], ['Only authorised products; no unsupported comparisons', 'Product list and comparison rules set by Compliance'], ['Existing influencer deals aligned within 6 months', 'One register of every creator, brief, post and payment']].map(([a, b]) => `<tr><td class="small">${a}</td><td class="small b">${b}</td></tr>`).join('')}</tbody></table><div class="note">Source: Bisnis.com, 24 June 2026, on POJK 6/2026. Summary only; CIMB Niaga Compliance and Legal confirm how the rule applies.</div></div></div></div></div>`;
  } else if (tab === 'kol') {
    const kols = S.advocates.filter(a => a.circle === 'KOL');
    body = `<div class="callout warn" style="margin-bottom:12px">${icon('clock', 18)}<div><b>Alignment window:</b> OJK reported POJK 6/2026 in June 2026; financial institutions must align existing influencer arrangements within six months (around December 2026, exact date confirmed by Legal). ${kols.filter(k => k.kol.contract !== 'Aligned').length} of ${kols.length} creator contracts still need updating.</div></div>
    <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Creator</th><th>Niche</th><th class="n">Followers</th><th>Contract</th><th class="n">Briefs posted</th><th>Disclosure on every post</th><th class="n">Paid to date</th><th class="n">Fee / post</th><th></th></tr></thead><tbody>
    ${kols.map(k => { const posts = S.tasks.filter(t => t.paid).flatMap(t => t.exec.filter(e => e.adv === k.id && e.st === 'done')); return `<tr><td><span class="who">${av(k.name, 24, '#eb6834')}<b>${esc(k.name)}</b></span></td><td class="small">${esc(k.unit)}</td><td class="n">${fmtK(k.followers)}</td><td>${k.kol.contract === 'Aligned' ? '<span class="pill good">Aligned with POJK 6/2026</span>' : '<span class="pill warn">Needs update</span>'}</td><td class="n">${posts.length}</td><td>${posts.length ? '<span class="pill good">' + icon('check', 11) + ' 100% #iklan</span>' : '<span class="muted small">no posts yet</span>'}</td><td class="n">${rp(k.kol.paidTotal)}</td><td class="n">${rp(k.kol.fee)}</td><td>${k.kol.contract !== 'Aligned' && isC ? `<button class="btn sm" data-act="kol-align" data-id="${k.id}">Mark aligned</button>` : ''}</td></tr>`; }).join('')}
    </tbody></table></div></div><p class="note">Sample creators. One register of every creator, brief, post and payment for audit; paid posts without disclosure are blocked before publishing.</p>`;
  } else {
    body = `<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Time</th><th>Source</th><th>Text checked</th><th>Result</th><th>Issues</th><th>By</th></tr></thead><tbody>${S.audit.slice(0, 120).map(a => `<tr><td class="small num">${fmtDT(a.at)}</td><td class="small">${esc(a.src)}</td><td class="small" style="max-width:380px">${esc(a.text)}</td><td>${a.result === 'Ready' ? '<span class="pill good">Ready</span>' : a.result === 'Blocked' ? '<span class="pill crit">Blocked</span>' : '<span class="pill warn">Sent to Compliance</span>'}</td><td class="small">${esc(a.issues.join(', ') || '—')}</td><td class="small">${esc(a.by)}</td></tr>`).join('')}</tbody></table></div></div><p class="note">Every post, reply and version is saved with its check result for audit. Blocked items never publish.</p>`;
  }
  return head('Govern', 'Compliance', 'Every post and reply is checked before it goes out, ready for OJK’s finfluencer rule (POJK 6/2026) and complaint rule (POJK 22/2023).', `<span class="pill good">${icon('check', 12)}Checked before posting: 100%</span><span class="pill">${blocked} blocked · 0 violations published</span>`) +
    `<div class="tabs">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="tab" data-k="cTab" data-v="${k}">${l}</button>`).join('')}</div>` + body;
};
VIEWS.compliance_after = () => { if ($('#c-out')) ONINPUT['c-run'](); };
function cCtx() { return { product: $('#c-prod').value, paid: $('#c-paid').value === '1', disclosure: $('#c-paid').value === '1', kind: $('#c-kind').value }; }
ONINPUT['c-run'] = ONCHANGE['c-run'] = () => { const t = $('#c-txt').value; const c = cCtx(); S.ui.cTry = { t, product: c.product, paid: c.paid }; $('#c-out').innerHTML = checkPanel(t, c, 'Result'); };
ACT['c-preset'] = el => { const p = PRESETS[+el.dataset.i]; $('#c-txt').value = p.t; $('#c-prod').value = p.product; $('#c-paid').value = p.paid ? '1' : '0'; ONINPUT['c-run'](); };
ACT['c-fix'] = () => { $('#c-txt').value = autoFix($('#c-txt').value, cCtx()); ONINPUT['c-run'](); toast('Auto-fix applied: review the wording, then run the check again', 'wand'); };
ACT['c-log'] = () => { const t = $('#c-txt').value; const chk = checkCompliance(t, cCtx()); logAudit('Compliance · manual check', t, chk); toast('Logged: ' + (chk.verdict === 'ready' ? 'Ready to publish' : chk.verdict === 'route' ? 'Sent to Compliance' : `Blocked (${chk.blocking.length} issues)`), 'shield'); };
ACT['rule-on'] = el => { if (S.role !== 'compliance') { toast('Only Compliance & Legal can change check rules', 'lock'); return; } const r = S.rules.find(x => x.id === el.dataset.id); r.on = !r.on; toast(`${r.name}: ${r.on ? 'on' : 'off'}`); render(); };
ONCHANGE['rule-sev'] = el => { const r = S.rules.find(x => x.id === el.dataset.id); r.sev = el.value; toast(`${r.name}: ${el.value}`); };
ONCHANGE['rule-words'] = el => { const r = S.rules.find(x => x.id === el.dataset.id); r.words = el.value.split(',').map(s => s.trim()).filter(Boolean); toast(`${r.name}: ${r.words.length} words saved`); };
ACT['cq-ok'] = el => { const { k, id } = el.dataset; if (k === 'Task') ACT['task-approve']({ dataset: { id } }); else if (k === 'Library asset') { assetById(id).status = 'Cleared'; toast('Asset approved'); render(); } else { const p = S.posts.find(x => x.id === id); p.status = 'scheduled'; logAudit('Compliance approval · post', p.caption, { verdict: 'ready', res: [] }); toast('Post approved and scheduled'); render(); } };
ACT['cq-no'] = el => { const { k, id } = el.dataset; if (k === 'Task') taskById(id).status = 'draft'; else if (k === 'Library asset') assetById(id).status = 'Rejected'; else S.posts = S.posts.filter(p => p.id !== id); toast('Returned with comments', 'x'); render(); };
ACT['kol-align'] = el => { const a = advById(el.dataset.id); a.kol.contract = 'Aligned'; toast(a.name + ' contract aligned with POJK 6/2026'); render(); };

/* ---------- Voice network ---------- */
function ringsSVG() {
  const c = { KOS: S.advocates.filter(a => a.circle === 'KOS'), KOC: S.advocates.filter(a => a.circle === 'KOC'), KOL: S.advocates.filter(a => a.circle === 'KOL') };
  const R = { KOS: 92, KOC: 132, KOL: 170 }; let dots = '';
  Object.entries(c).forEach(([k, arr]) => { const n = Math.min(arr.length, k === 'KOS' ? 60 : k === 'KOC' ? 40 : 8); for (let i = 0; i < n; i++) { const a = arr[Math.floor(i * arr.length / n)]; const ang = i / n * Math.PI * 2 + (k === 'KOC' ? .2 : k === 'KOL' ? .5 : 0); dots += `<circle cx="${190 + R[k] * Math.cos(ang)}" cy="${190 + R[k] * Math.sin(ang)}" r="${k === 'KOL' ? 6 : 4}" fill="${a.optIn ? CIRCLES[k].color : '#c9ced8'}" stroke="#fff" stroke-width="1.5" data-tip="${esc(a.name)} · ${k}<br>${esc(a.unit)}${a.optIn ? '' : '<br>opted out'}"/>`; } });
  return `<svg viewBox="0 0 380 380" width="100%" style="max-width:400px" role="img" aria-label="Voice network rings">${Object.entries(R).map(([k, r]) => `<circle cx="190" cy="190" r="${r}" fill="none" stroke="${CIRCLES[k].color}" stroke-opacity=".35" stroke-dasharray="3 4"/>`).join('')}${dots}<circle cx="190" cy="190" r="58" fill="#1d2433"/><text x="190" y="186" text-anchor="middle" fill="#fff" font-size="13" font-weight="700">Official accounts</text><text x="190" y="204" text-anchor="middle" fill="#9fb0cc" font-size="10">Lume console</text></svg>`;
}
VIEWS.network = () => {
  const cf = S.ui.netC || 'all', rf = S.ui.netR || 'all', q = (S.ui.netQ || '').toLowerCase(), pg = S.ui.netPg || 0;
  const done = {}; S.tasks.forEach(t => t.exec.forEach(e => { if (e.st === 'done') { const d = done[e.adv] = done[e.adv] || { tasks: 0, posts: 0, views: 0, clicks: 0 }; d.tasks++; d.posts += e.plats.length; d.views += e.views; d.clicks += e.clicks; } }));
  const list = S.advocates.filter(a => (cf === 'all' || a.circle === cf) && (rf === 'all' || a.region === rf) && (!q || (a.name + ' ' + a.unit).toLowerCase().includes(q)));
  const per = 20, pages = Math.ceil(list.length / per);
  const cnt = k => { const arr = S.advocates.filter(a => a.circle === k); return { n: arr.length, opt: arr.filter(a => a.optIn).length, act: arr.filter(a => done[a.id]).length }; };
  return head('Network', 'Voice network', 'Four circles of voices, one command centre. Real, named employees, members and creators, openly connected to CIMB Niaga. Participation is opt-in.', `<button class="btn primary" data-act="invite">${icon('users', 14)}Invite advocates</button>`) +
    `<div class="rings-wrap card" style="padding:16px">${ringsSVG()}<div class="stack">
      <div class="circle-card"><span class="k" style="background:#1d2433">1</span><div><b>${CIRCLES.OFF.name}</b><div class="small ink2">${CIRCLES.OFF.desc}</div><div class="small b" style="color:#1d2433">${CIRCLES.OFF.act}</div></div><b class="num">${S.accounts.length}</b></div>
      ${['KOS', 'KOC', 'KOL'].map(k => { const c = cnt(k); return `<div class="circle-card"><span class="k" style="background:${CIRCLES[k].color}">${CIRCLES[k].n}</span><div><b>${CIRCLES[k].name}</b><div class="small ink2">${CIRCLES[k].desc}</div><div class="small b" style="color:${CIRCLES[k].color}">${CIRCLES[k].act}</div></div><div style="text-align:right"><b class="num">${c.n}</b><div class="tiny muted">${c.opt} opted in · ${c.act} active</div></div></div>`; }).join('')}
      <div class="tiny muted">KOS: key opinion sales (employees) · KOC: key opinion consumers (community) · KOL: key opinion leaders (creators). Pilot: ~300 employee advocates in 20 branches, ~100 KejarMimpi ambassadors, 5–10 creators.</div>
    </div></div>
    <div class="grid mt12" style="grid-template-columns:1fr 1.6fr;gap:14px">
      <div class="card"><div class="hd"><h3>Transparent amplification, not buzzers</h3></div><div class="bd"><table class="tbl"><thead><tr><th></th><th style="color:var(--crit-ink)">✗ Buzzer model</th><th style="color:var(--good-ink)">✓ Lume voice network</th></tr></thead><tbody>${[['Who posts', 'Anonymous or fake accounts', 'Real, named employees, members and creators'], ['Payment', 'Hidden', 'Disclosed: #iklan, “paid partnership” labels'], ['What they say', 'Off-script, sometimes misleading', 'From the approved library, checked by AI before posting'], ['Measurement', 'Bought likes; no link to results', 'Every post tracked to clicks and OCTO sign-ups'], ['Risk', 'Takedowns, OJK sanctions, reputation', 'Aligned with POJK 6/2026 and POJK 22/2023']].map(r => `<tr><td class="b small">${r[0]}</td><td class="small muted">${r[1]}</td><td class="small">${r[2]}</td></tr>`).join('')}</tbody></table><p class="small b" style="color:var(--primary);margin:10px 0 0">For a bank, trust is the product.</p></div></div>
      <div class="card"><div class="hd"><h3>Advocates</h3><span class="sub">${list.length} people</span></div><div class="bd" style="padding-top:8px">
        <div class="row wrap" style="margin-bottom:8px"><div class="seg">${[['all', 'All'], ['KOS', 'KOS'], ['KOC', 'KOC'], ['KOL', 'KOL']].map(([k, l]) => `<button class="${cf === k ? 'on' : ''}" data-act="net-f" data-k="netC" data-v="${k}">${l}</button>`).join('')}</div><select class="input" style="width:auto;padding:4px 8px" data-change="net-r" aria-label="Region"><option value="all">All regions</option>${REGIONS.map(r => `<option ${rf === r ? 'selected' : ''}>${r}</option>`).join('')}</select><div class="search" style="width:200px">${icon('search', 13)}<input placeholder="Name or branch" value="${esc(S.ui.netQ || '')}" data-input="net-q" aria-label="Search advocates"></div></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Circle</th><th>Branch / unit</th><th>Accounts</th><th class="n">Tasks</th><th class="n">Reach</th><th class="n">Points</th><th>Opt-in</th></tr></thead><tbody>
        ${list.slice(pg * per, pg * per + per).map(a => { const d = done[a.id] || { tasks: 0, views: 0 }; return `<tr><td><span class="who">${av(a.name, 22)}<span><b class="small">${esc(a.name)}</b><br><span class="tiny muted">${esc(a.title)}</span></span></span></td><td><span class="pill" style="color:${CIRCLES[a.circle].color}">${a.circle}</span></td><td class="small">${esc(a.unit)}</td><td><span class="row" style="gap:3px">${Object.entries(a.acc).filter(([, v]) => v).map(([p]) => plat(p, 15)).join('')}</span></td><td class="n">${d.tasks}</td><td class="n">${fmtK(d.views)}</td><td class="n">${fmtN(a.points)}</td><td><button class="switch ${a.optIn ? 'on' : ''}" data-act="adv-opt" data-id="${a.id}" aria-label="Opt-in"></button></td></tr>`; }).join('')}
        </tbody></table></div>
        ${pages > 1 ? `<div class="row mt12" style="justify-content:flex-end;flex-wrap:wrap">${[...Array(Math.min(pages, 21))].map((_, i) => `<button class="btn sm ${i === pg ? 'primary' : ''}" data-act="net-pg" data-v="${i}">${i + 1}</button>`).join('')}</div>` : ''}
        <p class="note">Personal accounts stay personal: Lume reads post-level results of task posts only, with consent. Opt in or out at any time.</p>
      </div></div>
    </div>`;
};
ACT['net-f'] = el => { S.ui.netC = el.dataset.v; S.ui.netPg = 0; render(); };
ONCHANGE['net-r'] = el => { S.ui.netR = el.value; S.ui.netPg = 0; render(); };
ONINPUT['net-q'] = el => { S.ui.netQ = el.value; S.ui.netPg = 0; const pos = el.selectionStart; render(); const n = $('[data-input="net-q"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } };
ACT['net-pg'] = el => { S.ui.netPg = +el.dataset.v; render(); };
ACT['adv-opt'] = el => { const a = advById(el.dataset.id); a.optIn = !a.optIn; toast(`${a.name} ${a.optIn ? 'opted in' : 'opted out'}${a.optIn ? '' : '; no further tasks are sent'}`); render(); };
ACT.invite = () => openModal('Invite advocates', `<p class="ink2">Send this to volunteers. Each person connects their own accounts in the Lume app and can leave at any time.</p>
  <div class="grid g3">${['KOS', 'KOC', 'KOL'].map(k => `<div class="card" style="padding:10px 12px"><b style="color:${CIRCLES[k].color}">${k}</b><div class="small">${CIRCLES[k].name.split(' (')[0]}</div><div class="tiny muted mt8">lume.whale.im/join/cimbniaga-${k.toLowerCase()}</div></div>`).join('')}</div>
  <label class="fl mt12">Message (Bahasa)<textarea class="input" id="inv-txt" rows="6">Halo! CIMB Niaga mengajak kamu jadi advokat di program Lume. Kamu akan dapat tugas berbagi konten resmi (sudah dicek kepatuhan) ke akun pribadimu, caption dibantu AI, dan poin untuk setiap tugas. Ikut serta bersifat sukarela dan kamu bisa berhenti kapan saja. Akun pribadimu tetap pribadi: Lume hanya membaca hasil postingan tugas. Gabung di: lume.whale.im/join/cimbniaga-kos</textarea></label>`,
  `<button class="btn" data-act="copy" data-from="#inv-txt">${icon('copy', 14)}Copy message</button><button class="btn primary" data-act="close-modal">Done</button>`);

/* ---------- Insights & points ---------- */
VIEWS.insights = () => {
  const F = { task: S.ui.inT || 'all', circle: S.ui.inC || 'all', region: S.ui.inR || 'all' };
  const ex = allExec(F); const done = ex.filter(x => x.e.st === 'done'); const assigned = ex.filter(x => x.e.st !== 'optout');
  const views = done.reduce((a, x) => a + x.e.views, 0), inter = done.reduce((a, x) => a + x.e.likes + x.e.comments + x.e.shares, 0), clicks = done.reduce((a, x) => a + x.e.clicks, 0), signups = done.reduce((a, x) => a + x.e.signups, 0), posts = done.reduce((a, x) => a + x.e.plats.length, 0);
  const byReg = {}; done.forEach(x => byReg[x.a.region] = (byReg[x.a.region] || 0) + x.e.views);
  const byPlat = {}; done.forEach(x => x.e.plats.forEach(p => { const b = byPlat[p] = byPlat[p] || { v: 0, i: 0, c: 0, n: 0 }; b.v += x.e.views / x.e.plats.length; b.i += (x.e.likes + x.e.comments + x.e.shares) / x.e.plats.length; b.c += x.e.clicks / x.e.plats.length; b.n++; }));
  const days = [...Array(14)].map((_, i) => startOfDay(Date.now() - (13 - i) * DAY).getTime());
  const daily = days.map(d => done.filter(x => x.e.at >= d && x.e.at < d + DAY).reduce((a, x) => a + x.e.views, 0));
  const lb = S.ui.lb || 'exec';
  const per = {}; done.forEach(x => { const p = per[x.a.id] = per[x.a.id] || { a: x.a, tasks: 0, posts: 0, views: 0, clicks: 0, signups: 0, ontime: 0, inter: 0 }; p.tasks++; p.posts += x.e.plats.length; p.views += x.e.views; p.clicks += x.e.clicks; p.signups += x.e.signups; p.inter += x.e.likes + x.e.comments + x.e.shares; if (x.e.onTime) p.ontime++; });
  const P = Object.values(per);
  const lbs = {
    exec: { t: 'Task execution list', cols: ['Advocate', 'Circle', 'Tasks done', 'Posts', 'Points'], rows: P.sort((a, b) => b.tasks - a.tasks || b.a.points - a.a.points).slice(0, 12).map(p => [p.a.name, p.a.circle, p.tasks, p.posts, fmtN(p.a.points)]) },
    conv: { t: 'Content conversion leaderboard', cols: ['Post by', 'Task', 'Clicks to OCTO', 'Sign-ups', 'Conversion'], rows: done.sort((a, b) => b.e.signups - a.e.signups || b.e.clicks - a.e.clicks).slice(0, 12).map(x => [x.a.name, x.t.name, fmtN(x.e.clicks), fmtN(x.e.signups), pct(x.e.signups / Math.max(1, x.e.clicks), 0)]) },
    chan: { t: 'Channel performance ranking', cols: ['Channel', 'Posts', 'Reach', 'Engagement', 'Clicks'], rows: Object.entries(byPlat).sort((a, b) => b[1].v - a[1].v).map(([k, b]) => [PLAT[k].name, fmtN(b.n), fmtK(b.v), pct(b.i / Math.max(1, b.v), 1), fmtN(b.c)]) },
    eng: { t: 'Content engagement', cols: ['Post by', 'Task', 'Views', 'Interactions', 'Engagement'], rows: done.filter(x => x.e.views > 800).sort((a, b) => (b.e.likes + b.e.comments + b.e.shares) / b.e.views - (a.e.likes + a.e.comments + a.e.shares) / a.e.views).slice(0, 12).map(x => [x.a.name, x.t.name, fmtN(x.e.views), fmtN(x.e.likes + x.e.comments + x.e.shares), pct((x.e.likes + x.e.comments + x.e.shares) / x.e.views, 1)]) },
    hv: { t: 'High-value content list', cols: ['Asset', 'Source', 'Uses', 'Status'], rows: [...S.assets].sort((a, b) => b.uses - a.uses).slice(0, 12).map(a => [a.title, a.type, fmtN(a.uses), a.status]) },
    prod: { t: 'Productivity ranking', cols: ['Advocate', 'Branch / unit', 'Tasks done', 'On time', 'On-time rate'], rows: P.filter(p => p.tasks >= 2).sort((a, b) => b.ontime / b.tasks - a.ontime / a.tasks || b.tasks - a.tasks).slice(0, 12).map(p => [p.a.name, p.a.unit, p.tasks, p.ontime, pct(p.ontime / p.tasks, 0)]) }
  };
  const L = lbs[lb];
  return head('Network', 'Insights & points', 'Data you can act on: task completion, reach and engagement per circle, region and channel, traced to clicks and OCTO sign-ups. Points reward quality, not volume.',
    `<select class="input" style="width:auto" data-change="in-t" aria-label="Task"><option value="all">All tasks</option>${S.tasks.map(t => `<option value="${t.id}" ${F.task === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select><div class="seg">${['all', 'KOS', 'KOC', 'KOL'].map(k => `<button class="${F.circle === k ? 'on' : ''}" data-act="tab" data-k="inC" data-v="${k}">${k === 'all' ? 'All circles' : k}</button>`).join('')}</div><select class="input" style="width:auto" data-change="in-r" aria-label="Region"><option value="all">All regions</option>${REGIONS.map(r => `<option ${F.region === r ? 'selected' : ''}>${r}</option>`).join('')}</select>`) +
    `<div class="grid g6">${[[pct(assigned.length ? done.length / assigned.length : 0, 0), 'task completion'], [fmtN(posts), 'posts'], [fmtK(views), 'reach'], [pct(views ? inter / views : 0, 1), 'engagement on advocate posts'], [fmtN(clicks), 'clicks to OCTO'], [fmtN(signups), 'OCTO sign-ups']].map(([v, l]) => `<div class="card kpi"><div class="v num">${v}</div><div class="l">${l}</div></div>`).join('')}</div>
    <div class="grid mt12" style="grid-template-columns:1fr 1fr 1.3fr">
      <div class="card"><div class="hd"><h3>Reach by region</h3></div><div class="bd" style="--lw:100px">${hbars(REGIONS.filter(r => byReg[r]).map(r => ({ label: r, value: byReg[r] })).sort((a, b) => b.value - a.value), { fmt: fmtK })}</div></div>
      <div class="card"><div class="hd"><h3>Post to OCTO</h3><span class="sub">tracked links (cimb.id)</span></div><div class="bd">${funnel([{ label: 'Exposure', value: views }, { label: 'Clicks', value: clicks }, { label: 'Sign-ups', value: signups }])}</div></div>
      <div class="card"><div class="hd"><h3>Reach per day</h3><span class="sub">last 14 days</span></div><div class="bd">${lineChart([{ name: 'Reach', color: '#2a78d6', values: daily }], { labels: days.map(d => `${new Date(d).getDate()} ${MON[new Date(d).getMonth()]}`), area: true, h: 170, label: 'Advocate reach per day' })}</div></div>
    </div>
    <div class="grid mt12" style="grid-template-columns:1.6fr 1fr;gap:14px">
      <div class="card"><div class="hd"><h3>Points & leaderboards</h3></div><div class="bd" style="padding-top:6px"><div class="tabs" style="margin-bottom:8px">${Object.entries(lbs).map(([k, v]) => `<button class="${lb === k ? 'on' : ''}" data-act="tab" data-k="lb" data-v="${k}">${v.t}</button>`).join('')}</div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th>${L.cols.map((c, i) => `<th class="${i >= 2 ? 'n' : ''}">${c}</th>`).join('')}</tr></thead><tbody>${L.rows.map((r, i) => `<tr><td>${i < 3 ? `<span style="color:${['#d4a017', '#9aa3b2', '#b87333'][i]}">${icon('trophy', 15)}</span>` : i + 1}</td>${r.map((c, j) => `<td class="${j >= 2 ? 'n' : ''} small">${esc(c)}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="6" class="empty">No data for this filter</td></tr>'}</tbody></table></div>
        <div class="row mt12"><button class="btn sm primary" data-act="award">${icon('trophy', 13)}Award weekly #1 (+${S.pointRules.find(r => r.id === 'week1').pts})</button><span class="small muted">Top-ranked content creators receive points</span></div></div></div>
      <div class="stack"><div class="card"><div class="hd"><h3>Points rules</h3><span class="sub">${S.role === 'hr' || S.role === 'brand' ? 'editable' : 'view only'}</span></div><div class="bd"><table class="tbl"><thead><tr><th>Rule</th><th class="n">Points</th><th>On</th></tr></thead><tbody>${S.pointRules.map(r => `<tr><td class="small">${esc(r.name)}<div class="tiny muted">${esc(r.type)} · ${esc(r.target)}</div></td><td class="n"><input class="input num" style="width:64px;padding:3px 6px;text-align:right" type="number" value="${r.pts}" data-change="pr-pts" data-id="${r.id}" aria-label="Points" ${S.role === 'hr' || S.role === 'brand' ? '' : 'disabled'}></td><td><button class="switch ${r.on ? 'on' : ''}" data-act="pr-on" data-id="${r.id}" aria-label="Toggle rule"></button></td></tr>`).join('')}</tbody></table></div></div>
      <div class="dark-panel"><h4>Guardrails</h4><div class="stack small"><div>Points weighted by quality and clicks, not raw volume</div><div>Bought likes or bot engagement disqualify a post</div><div>Rewards set with HR: recognition, learning credits, events</div><div>Personal accounts stay personal; opt-in, opt-out any time</div></div></div></div>
    </div>
    <p class="note">Engagement on advocate posts = likes, comments and shares ÷ views. Brand-account baselines from Social Blade use followers as the base. Sign-up attribution uses tracked links (cimb.id) set up with CIMB Niaga’s digital team. Sample data.</p>`;
};
ONCHANGE['in-t'] = el => { S.ui.inT = el.value; render(); };
ONCHANGE['in-r'] = el => { S.ui.inR = el.value; render(); };
ONCHANGE['pr-pts'] = el => { const r = S.pointRules.find(x => x.id === el.dataset.id); r.pts = +el.value; toast(`${r.name}: ${r.pts > 0 ? '+' : ''}${r.pts} points`); };
ACT['pr-on'] = el => { if (!['hr', 'brand'].includes(S.role)) { toast('Points rules are set by HR and the Brand team', 'lock'); return; } const r = S.pointRules.find(x => x.id === el.dataset.id); r.on = !r.on; render(); };
ACT.award = () => {
  if (!['hr', 'brand'].includes(S.role)) { toast('Points are awarded by HR or the Brand team', 'lock'); return; }
  const ws = startOfWeek(Date.now()).getTime() - 7 * DAY; const cnt = {};
  allExec().filter(x => x.e.st === 'done' && x.e.at >= ws).forEach(x => { if (x.a.circle !== 'KOL') cnt[x.a.id] = (cnt[x.a.id] || 0) + (x.e.onTime ? 1.2 : 1) + x.e.clicks / 50; });
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]; if (!top) { toast('No eligible posts this week'); return; }
  const a = advById(top[0]); const pts = S.pointRules.find(r => r.id === 'week1').pts; a.points += pts; S.ledger.push({ adv: a.id, at: Date.now(), pts, reason: 'Peringkat 1 mingguan' });
  toast(`${a.name} awarded +${pts} as weekly #1 (quality-weighted)`, 'trophy'); render();
};

/* ---------- Pilot scorecard ---------- */
function scorecard() {
  const invited = S.advocates.filter(a => a.invited);
  const posted = new Set(); S.tasks.forEach(t => t.exec.forEach(e => { if (e.st === 'done') posted.add(e.adv); }));
  const part = invited.filter(a => posted.has(a.id)).length / invited.length;
  const due = S.tasks.filter(t => t.deadline < Date.now() && t.status !== 'draft');
  const dueEx = due.flatMap(t => t.exec.filter(e => e.st !== 'optout'));
  const exe = dueEx.filter(e => e.st === 'done' && e.onTime).length / Math.max(1, dueEx.length);
  const ex = allExec().filter(x => x.e.st === 'done'); const v = ex.reduce((a, x) => a + x.e.views, 0); const it = ex.reduce((a, x) => a + x.e.likes + x.e.comments + x.e.shares, 0);
  const er = it / Math.max(1, v); const mult = er / 0.0003;
  const brand = Object.values(S.brandReach).reduce((a, b) => a + b, 0); const extra = v / brand;
  const withLink = S.tasks.filter(t => t.link).length / S.tasks.length;
  const compl = S.inbox.filter(m => m.ai.type === 'Complaint' && m.firstReplyAt); const frs = compl.map(m => (m.firstReplyAt - m.at) / 60000).sort((a, b) => a - b);
  const fr = frs.length ? frs[Math.floor(frs.length / 2)] : ccStats().med;
  const handledC = S.inbox.filter(m => m.ai.type === 'Complaint' && m.status !== 'new'); const tick = handledC.length ? handledC.filter(m => m.ticketId).length / handledC.length : 1;
  const closed = S.tickets.filter(t => t.closedAt); const res = closed.filter(t => clockOf(t).state === 'met').length / Math.max(1, closed.length);
  const st = ccStats(); const sent = (st.pos - S.listen.baselinePos) * 100;
  const blockedPublished = 0;
  return [
    ['Participation', 'Invited advocates who post at least once', '≥ 60%', pct(part, 0), part >= 0.6],
    ['Execution', 'Tasks completed on time', '≥ 70%', pct(exe, 0), exe >= 0.7],
    ['Compliance', 'Posts and replies checked first / violations published', '100% / 0', `100% / ${blockedPublished}`, true],
    ['Engagement', 'Engagement on advocate posts vs the brand account’s baseline', '≥ 10×', `${Math.round(mult)}× (${pct(er, 1)})`, mult >= 10],
    ['Reach', 'Extra campaign reach from the network vs brand-only', '+30%', '+' + pct(extra, 0), extra >= 0.3],
    ['Results', 'Posts with tracked links to OCTO', '100%', pct(withLink, 0), withLink >= 1],
    ['First reply', 'Complaints answered publicly, service hours', '≤ 1 h', `${Math.round(fr)} min median`, fr <= 60],
    ['Ticketing', 'Social complaints logged as tickets', '100%', `${pct(tick, 0)} of handled`, tick >= 1],
    ['Resolution', 'Social tickets closed within the OJK deadline', '100%', pct(res, 0), res >= 1],
    ['Sentiment', 'Share of positive mentions vs baseline', '+5 pts', (sent >= 0 ? '+' : '') + sent.toFixed(0) + ' pts', Math.round(sent) >= 5]
  ];
}
VIEWS.scorecard = () => {
  const sc = scorecard(); const pass = sc.filter(r => r[4]).length;
  const w = Math.floor((Date.now() - PILOT_START.getTime()) / (7 * DAY));
  const daysTo = Math.ceil((PILOT_START.getTime() - Date.now()) / DAY);
  const rows = [['Setup', 'accounts, rules, library, connectors', 0, 0, '#1d2433'], ['Onboard & baseline', 'training, opt-in, 2-week baseline', 1, 2, '#6250d6'], ['Campaign 1 · OCTO', 'staff + community', 3, 4, '#1668e3'], ['Campaign 2 · Event', 'Kejar Mimpi / OCTO Land', 5, 6, '#1668e3'], ['Social care desk & ticketing', 'listen, reply, ticket to Ask OCTO', 1, 7, '#eb6834'], ['Always-on · #WaspadaSelalu', 'fraud alerts when needed', 1, 8, '#d03b3b'], ['Readout', 'results and scale-up plan', 8, 8, '#0ca30c']];
  return head('Govern', 'Pilot scorecard', 'Prove it in 8 weeks: publishing, care and advocates. Pass marks are proposals agreed in week 0.', `<span class="pill ${daysTo > 0 ? 'blue' : 'good'}">${daysTo > 0 ? `Pilot starts in ${daysTo} day${daysTo === 1 ? '' : 's'} · week of ${fmtDY(PILOT_START)}` : `Pilot week ${Math.min(8, w)}`}</span>`) +
    `<div class="grid g6">${[['All', 'official and affiliated accounts in one console'], ['1', 'social care desk on X, Instagram and Facebook'], ['~300', 'employee advocates in 20 branches (opt-in)'], ['~100', 'KejarMimpi ambassadors'], ['5–10', 'creators and partners'], ['3', 'campaigns incl. #WaspadaSelalu']].map(([v, l]) => `<div class="card kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('')}</div>
    <div class="tbl-wrap mt12"><div class="gantt"><div class="gh" style="text-align:left">Workstream</div>${[...Array(9)].map((_, i) => `<div class="gh">W${i}<div class="tiny muted" style="font-weight:500">${fmtD(PILOT_START.getTime() + (i - 1) * 7 * DAY).slice(4)}</div></div>`).join('')}
    ${rows.map(([n, s, a, b, c]) => `<div class="gl">${n}<small>${s}</small></div>${[...Array(9)].map((_, i) => `<div>${i >= a && i <= b ? `<div class="bar" style="background:${c};opacity:${i === a || i === b ? 1 : .85}"></div>` : ''}</div>`).join('')}`).join('')}</div></div>
    <p class="note">Week 0 starts one week before ${fmtDY(PILOT_START)} for setup. Pilot size and campaigns are proposals to agree with CIMB Niaga.</p>
    <div class="grid mt12" style="grid-template-columns:1.8fr 1fr;gap:14px">
      <div class="card"><div class="hd"><h3>How we’ll know it worked</h3><span class="sub">live from this workspace · sample data before launch</span></div><div class="bd"><table class="tbl"><thead><tr><th>Area</th><th>Measure</th><th>Pass mark</th><th>Now</th><th>Status</th></tr></thead><tbody>${sc.map(r => `<tr><td class="b">${r[0]}</td><td class="small">${r[1]}</td><td class="small b">${r[2]}</td><td class="small num">${r[3]}</td><td>${r[4] ? `<span class="pill good">${icon('check', 11)}On track</span>` : `<span class="pill warn">${icon('alert', 11)}Below mark</span>`}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="stack"><div class="card kpi ${pass === sc.length ? 'ok' : 'warn'}"><div class="v">${pass} of ${sc.length}</div><div class="l">measures at their pass mark</div></div>
      <div class="dark-panel"><h4>Decision</h4><div class="small">Scale up if participation, compliance, engagement and care targets reach their marks, then roll out region by region with a business case on CIMB Niaga’s own numbers.</div></div>
      <div class="card"><div class="bd small ink2">Baseline: @cimb_niaga Instagram engagement of 0.03% (Social Blade); 10× is about 0.3%. OJK deadline: POJK 22/2023. Sentiment baseline: 2-week listening before campaign 1.</div></div></div>
    </div>
    <div class="grid mt12" style="grid-template-columns:1.6fr 1fr;gap:14px">
      <div class="card"><div class="hd"><h3>Clear owners</h3><span class="sub">switch roles in the top bar to see each team’s permissions</span></div><div class="bd"><table class="tbl"><thead><tr><th>CIMB Niaga</th><th>Owns</th><th>Whale</th><th>Delivers</th></tr></thead><tbody>${[['Marketing, Brand & CX', 'Goals, campaigns, library', 'Project manager', 'Plan, weekly readouts'], ['Customer Care & complaints', 'Social care desk, tickets, Ask OCTO, SLA', 'Solution engineer', 'Connectors, complaint-system link, dashboards'], ['Compliance & Legal', 'Check rules, POJK 6/2026 and 22/2023', 'Content & AI lead', 'Templates, reply library, Bahasa models'], ['HR', 'Advocate policy, opt-in, rewards', 'Data analyst', 'Baseline, sentiment, attribution, readout'], ['Corporate Comms', 'Fraud alerts, crisis protocol', '', ''], ['KejarMimpi & affiliated teams', 'Community and affiliated accounts', '', ''], ['IT & InfoSec', 'Security, access, complaint-system API', '', '']].map(r => `<tr><td class="b small">${r[0]}</td><td class="small">${r[1]}</td><td class="b small">${r[2]}</td><td class="small">${r[3]}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="dark-panel"><h4>Privacy by design</h4><div class="stack small"><div>Opt-in only; advocates can leave at any time</div><div>Personal data in comments and DMs masked; tickets only in CIMB systems</div><div>Lume reads post-level results only, with consent</div><div>No customer data in posts; images checked for KTP, cards and faces</div><div>Data handled under UU PDP 27/2022; hosting agreed with InfoSec</div><div>Full audit trail of briefs, approvals and posts</div></div></div>
    </div>`;
};

/* ---------- OJK reports (SEOJK 20/2025) ---------- */
const NEG_SEED = [
  { at: Date.now() - 3 * DAY, src: 'Online media (sample)', text: 'Article quoting customer complaints about OCTO login after an update', reach: 85000, action: 'Statement from Corporate Comms; fix announced on official accounts' },
  { at: Date.now() - 9 * DAY, src: 'X thread (sample)', text: 'Thread about long branch queues on payday, 640 reposts', reach: 41000, action: 'Holding reply; branch ops staffing adjusted' }
];
VIEWS.reports = () => {
  const per = S.ui.rpPer || 'h2-2026';
  const range = per === 'h2-2026' ? [new Date(2026, 6, 1).getTime(), new Date(2027, 0, 1).getTime()] : [new Date(2027, 0, 1).getTime(), new Date(2027, 6, 1).getTime()];
  const tks = S.tickets.filter(t => t.createdAt >= range[0] && t.createdAt < range[1]);
  const th = {}; tks.forEach(t => th[t.theme] = (th[t.theme] || 0) + 1);
  const top = Object.entries(th).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const byCh = {}; tks.forEach(t => { const p = PLAT[accById(t.src.acc).platform].name; byCh[p] = (byCh[p] || 0) + 1; });
  const closed = tks.filter(t => t.closedAt); const ontime = closed.filter(t => clockOf(t).state === 'met').length;
  const neg = [...(S.negLog || []), ...NEG_SEED].filter(n => n.at >= range[0] && n.at < range[1]);
  const csv = 'Rank,Complaint cause,Social tickets,Share\n' + top.map(([k, v], i) => `${i + 1},${k},${v},${(v / Math.max(1, tks.length) * 100).toFixed(1)}%`).join('\n') + '\n\nNegative coverage,Source,Est. reach,Action\n' + neg.map(n => `${fmtDY(n.at)} ${n.text.replace(/,/g, ';')},${n.src},${n.reach},${n.action.replace(/,/g, ';')}`).join('\n');
  return head('Govern', 'OJK reports', 'Half-year complaint report under SEOJK 20/SEOJK.08/2025: top 10 complaint causes and negative media coverage from the bank’s own monitoring. Effective 1 January 2027.', `<div class="seg"><button class="${per === 'h2-2026' ? 'on' : ''}" data-act="tab" data-k="rpPer" data-v="h2-2026">H2 2026 · dry run</button><button class="${per === 'h1-2027' ? 'on' : ''}" data-act="tab" data-k="rpPer" data-v="h1-2027">H1 2027 · first report</button></div><button class="btn" data-act="copy" data-text="${esc(csv)}">${icon('copy', 14)}Copy as CSV</button>`) +
    (per === 'h1-2027' && Date.now() < range[0] ? `<div class="callout info" style="margin-bottom:12px">${icon('clock', 16)}<div>The first mandatory period starts on 1 January 2027. Lume fills this report automatically from social tickets and listening as the period runs. Switch to the H2 2026 dry run to see the format with this workspace’s data.</div></div>` : '') +
    `<div class="grid g4"><div class="card kpi"><div class="v num">${tks.length}</div><div class="l">social complaints logged as tickets</div></div><div class="card kpi"><div class="v num">${closed.length}</div><div class="l">resolved and closed</div></div><div class="card kpi"><div class="v num">${pct(ontime / Math.max(1, closed.length), 0)}</div><div class="l">closed within the OJK deadline</div></div><div class="card kpi"><div class="v num">${tks.filter(t => t.extended).length}</div><div class="l">extended with written notice</div></div></div>
    <div class="grid mt12" style="grid-template-columns:1.2fr 1fr;gap:14px">
      <div class="card"><div class="hd"><h3>Top 10 complaint causes</h3><span class="sub">social channels</span></div><div class="bd" style="--lw:140px">${top.length ? hbars(top.map(([k, v]) => ({ label: k, value: v, tip: pct(v / tks.length, 1) + ' of social tickets' })), { color: '#e34948' }) : '<div class="empty">No tickets in this period yet</div>'}</div></div>
      <div class="card"><div class="hd"><h3>By channel</h3></div><div class="bd"><table class="tbl"><thead><tr><th>Channel</th><th class="n">Tickets</th><th class="n">Share</th></tr></thead><tbody>${Object.entries(byCh).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="n">${v}</td><td class="n">${pct(v / Math.max(1, tks.length), 0)}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">—</td></tr>'}</tbody></table></div></div>
    </div>
    <div class="card mt12"><div class="hd"><h3>Negative coverage log</h3><span class="sub">from Lume monitoring · crisis escalations are added automatically</span></div><div class="bd"><table class="tbl"><thead><tr><th>Date</th><th>Source</th><th>What was said</th><th class="n">Est. reach</th><th>Action taken</th></tr></thead><tbody>${neg.map(n => `<tr><td class="small num">${fmtDY(n.at)}</td><td class="small">${esc(n.src)}</td><td class="small">${esc(n.text)}</td><td class="n">${fmtN(n.reach)}</td><td class="small">${esc(n.action)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Nothing logged in this period</td></tr>'}</tbody></table></div></div>
    <p class="note">Format to be aligned with CIMB Niaga Compliance before the first submission. Social data feeds the report; the bank’s complaint system remains the system of record.</p>`;
};
