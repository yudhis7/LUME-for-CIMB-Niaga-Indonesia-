/* ================= Views: Library (Harbor), Mass tasks ================= */
const TYPE_INFO = {
  BGC: { name: 'Brand content', col: '#1668e3', g2: '#4f8ff0', desc: 'Official copy, posters, product visuals', ex: 'OCTO campaigns, OCTO Card, Syariah, promos' },
  PGC: { name: 'Creator content', col: '#eb6834', g2: '#f39a6b', desc: 'High-quality content from KOLs and partners', ex: 'Family campaign film, concert artists, finance creators' },
  UGC: { name: 'Community content', col: '#6250d6', g2: '#9085e9', desc: 'The best posts from customers and community', ex: 'Kejar Mimpi FEST, OCTO Land Blok M, OCTO Arena padel' },
  SGC: { name: 'Staff content', col: '#0c8f5a', g2: '#3fb985', desc: 'Original content from frontline employees', ex: 'RM money tips, branch events, “a day at CIMB Niaga”' }
};
const CAMP_COL = { octo: '#1668e3', waspada: '#d03b3b', km: '#6250d6', life: '#0ca30c', syariah: '#0f8a6a', tip: '#fab219', card: '#1668e3' };
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = (n >> 8) & 255, b = n & 255; const m = v => Math.round(v + (255 - v) * k); return '#' + [m(r), m(g), m(b)].map(v => v.toString(16).padStart(2, '0')).join(''); }
function thumb(a, big, band) {
  if (a.img) return `<img src="${a.img}" alt="${esc(a.title)}">`;
  const T = TYPE_INFO[a.type]; const c1 = a.type === 'BGC' || a.type === 'SGC' ? (CAMP_COL[a.camp] || T.col) : T.col; const c2 = shade(c1, 0.35); const words = a.title.split(/\s+/); const lines = []; let cur = '';
  words.forEach(w => { if ((cur + ' ' + w).trim().length > 20) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; }); if (cur.trim()) lines.push(cur.trim());
  const fi = { image: 'img', video: 'play', carousel: 'layers', template: 'copy' }[a.format] || 'img';
  const h = hashStr(a.id);
  return `<svg viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(a.title)}"><defs><linearGradient id="g${a.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="200" height="150" fill="url(#g${a.id})"/><circle cx="${150 + h % 40}" cy="${20 + h % 30}" r="${40 + h % 20}" fill="#fff" opacity=".10"/><circle cx="${20 + h % 50}" cy="${130 - h % 20}" r="30" fill="#fff" opacity=".08"/>
  <g transform="translate(14,16)" stroke="#fff" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity=".95"><svg width="22" height="22" viewBox="0 0 24 24">${IP[fi]}</svg></g>
  <text x="14" y="${150 - (band ? 34 : 18) - (lines.slice(0, 3).length - 1) * 15}" fill="#fff" font-size="13" font-weight="700">${lines.slice(0, 3).map((l, i) => `<tspan x="14" dy="${i ? 15 : 0}">${esc(l)}</tspan>`).join('')}</text>
  <text x="186" y="28" fill="#fff" font-size="9" font-weight="700" text-anchor="end" opacity=".85">CIMB NIAGA</text>${band ? `<rect y="128" width="200" height="22" fill="#c8102e"/><text x="100" y="143" fill="#fff" font-size="10" font-weight="700" text-anchor="middle">${esc(band)}</text>` : ''}</svg>`;
}
VIEWS.library = () => {
  const tab = S.ui.libTab || 'assets';
  const f = S.ui.libType || 'all'; const q = (S.ui.libQ || '').toLowerCase();
  let body;
  if (tab === 'assets') {
    const list = S.assets.filter(a => (f === 'all' || a.type === f) && (!q || (a.title + ' ' + a.product + ' ' + (a.tags || []).join(' ')).toLowerCase().includes(q)));
    body = `<div class="grid g4" style="margin-bottom:14px">${Object.entries(TYPE_INFO).map(([k, T]) => `<div class="card" style="padding:12px 14px;cursor:pointer;border-top:3px solid ${T.col};${f === k ? 'box-shadow:0 0 0 2px ' + T.col : ''}" data-act="tab" data-k="libType" data-v="${f === k ? 'all' : k}"><div class="row between"><span class="pill" style="background:${T.col};color:#fff;border-color:${T.col}">${k}</span><b class="num">${S.assets.filter(a => a.type === k).length}</b></div><div class="b mt8">${T.name}</div><div class="small ink2">${T.desc}</div><div class="tiny muted mt8"><b style="color:${T.col}">FOR CIMB NIAGA</b> · ${esc(T.ex)}</div></div>`).join('')}</div>
    <div class="row between wrap" style="margin-bottom:12px"><div class="row"><div class="search" style="width:280px">${icon('search', 14)}<input placeholder="Search title, product or tag" value="${esc(S.ui.libQ || '')}" data-input="lib-q" aria-label="Search library"></div>${f !== 'all' ? `<button class="btn sm" data-act="tab" data-k="libType" data-v="all">${icon('x', 12)}${f}</button>` : ''}</div><span class="small muted">${list.length} assets · ${S.assets.filter(a => a.status === 'Pending review').length} waiting for Compliance</span></div>
    <div class="assets">${list.map(a => `<div class="asset" data-act="asset-open" data-id="${a.id}"><div class="th">${thumb(a)}<span class="tag pill" style="background:${TYPE_INFO[a.type].col};color:#fff;border-color:transparent">${a.type}</span></div><div class="meta"><div class="t">${esc(a.title)}</div><div class="row between"><span class="small muted">${esc(a.product)} · ${a.format}</span>${a.status === 'Cleared' ? '<span class="pill good">Cleared</span>' : a.status === 'Pending review' ? '<span class="pill warn">With Compliance</span>' : '<span class="pill crit">' + esc(a.status) + '</span>'}</div><div class="tiny muted">${fmtN(a.uses)} uses${a.source ? ' · ' + esc(a.source) : ''}</div></div></div>`).join('') || '<div class="empty">No assets match.</div>'}</div>`;
  } else {
    body = `<div class="grid g2"><div class="card"><div class="hd"><h3>Approved replies</h3><span class="sub">Alivia drafts from these; the care desk approves before posting</span></div><div class="bd stack">${Object.entries(REPLY_LIB).filter(([, v]) => v).map(([k, v]) => `<div><div class="row between"><span class="pill ${TYPE_META[k].color}">${k}</span><span class="tiny muted">first reply ${TYPE_META[k].label}</span></div><div class="preview-text mt8 small">${esc(v)}</div></div>`).join('')}</div></div>
    <div class="card"><div class="hd"><h3>Knowledge base answers</h3><span class="sub">sample · owned by Customer Care</span></div><div class="bd"><table class="tbl"><thead><tr><th>Topic</th><th>Approved answer</th></tr></thead><tbody>${Object.entries(KB_ANSWERS).map(([k, v]) => `<tr><td class="b">${esc(k)}</td><td class="small">${esc(v)}</td></tr>`).join('')}</tbody></table>
    <div class="hd" style="padding:14px 0 0"><h3>Product sheets</h3><span class="sub">sample values · used by the product-facts check</span></div><table class="tbl mt8"><tbody>${Object.entries(PRODUCTS).map(([k, p]) => `<tr><td class="b">${esc(k)}${p.risk ? ` <span class="pill warn">${RISK_WORDING[p.risk].label} risk</span>` : ''}</td><td class="small">${esc(p.sheet)}</td></tr>`).join('')}</tbody></table></div></div></div>`;
  }
  return head('Publish', 'Library (Harbor)', 'Every voice draws from one approved library: brand, creator, community and staff content, cleared by the AI check and Compliance.', `<button class="btn primary" data-act="asset-upload">${icon('upload', 14)}Upload</button>`) +
    `<div class="tabs"><button class="${tab === 'assets' ? 'on' : ''}" data-act="tab" data-k="libTab" data-v="assets">Content assets</button><button class="${tab === 'replies' ? 'on' : ''}" data-act="tab" data-k="libTab" data-v="replies">Replies, knowledge base & product sheets</button></div>` + body;
};
ONINPUT['lib-q'] = el => { S.ui.libQ = el.value; const pos = el.selectionStart; render(); const n = $('[data-input="lib-q"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } };
VIEWS.library_after = () => { if (S.ui.libOpen) { const id = S.ui.libOpen; S.ui.libOpen = null; ACT['asset-open']({ dataset: { id } }); } };
ACT['asset-open'] = el => {
  const a = assetById(el.dataset.id);
  const usedIn = S.tasks.filter(t => t.assets.includes(a.id));
  const canApprove = S.role === 'compliance' && a.status === 'Pending review';
  openModal(esc(a.title), `<div class="grid" style="grid-template-columns:1.1fr 1fr;gap:16px"><div class="asset" style="cursor:default"><div class="th">${thumb(a, true)}</div></div>
    <div><dl class="kv" style="grid-template-columns:110px 1fr"><dt>Source</dt><dd><span class="pill" style="background:${TYPE_INFO[a.type].col};color:#fff;border-color:transparent">${a.type}</span> ${TYPE_INFO[a.type].name}</dd>${a.source ? `<dt>From</dt><dd>${esc(a.source)}</dd>` : ''}<dt>Format</dt><dd>${a.format}</dd><dt>Product</dt><dd>${esc(a.product)}</dd><dt>Campaign</dt><dd>${esc(CAMPAIGNS[a.camp] ? CAMPAIGNS[a.camp].name : '—')}</dd><dt>Status</dt><dd>${a.status}</dd><dt>Used</dt><dd>${fmtN(a.uses)} times · ${usedIn.length} task${usedIn.length === 1 ? '' : 's'}</dd><dt>Added</dt><dd>${fmtDY(a.added)}</dd></dl>
    <div class="checks mt12">${(a.tags || []).map(t => `<span class="pill">${esc(t)}</span>`).join('')}</div>
    ${a.type === 'UGC' ? `<div class="callout info mt12 small">${icon('check', 14)}<div>Customer permission to reshare is on file. Reshared only with permission; never fake, buy or script reviews.</div></div>` : ''}
    ${PRODUCTS[a.product] && PRODUCTS[a.product].risk ? `<div class="callout warn mt12 small">${icon('shield', 14)}<div>${RISK_WORDING[PRODUCTS[a.product].risk].label} product: required risk wording is inserted automatically in every caption that uses this asset.</div></div>` : ''}</div></div>`,
    `${canApprove ? `<button class="btn danger" data-act="asset-rej" data-id="${a.id}">Reject</button><button class="btn primary" data-act="asset-ok" data-id="${a.id}">${icon('check', 14)}Approve for use</button>` : a.status === 'Pending review' ? '<span class="small muted">Waiting for Compliance. Switch role to Compliance & Legal to approve.</span>' : ''}<span style="flex:1"></span><button class="btn" data-act="close-modal">Close</button>${a.status === 'Cleared' ? `<button class="btn primary" data-act="asset-task" data-id="${a.id}">${icon('task', 14)}Use in a task</button>` : ''}`, 'wide');
};
ACT['asset-ok'] = el => { const a = assetById(el.dataset.id); a.status = 'Cleared'; logAudit('Library · Compliance approval', a.title, { verdict: 'ready', res: [] }); closeModal(); toast('Approved: now available to every team and advocate'); render(); };
ACT['asset-rej'] = el => { const a = assetById(el.dataset.id); a.status = 'Rejected'; closeModal(); toast('Rejected and returned to the uploader', 'x'); render(); };
ACT['asset-task'] = el => { const a = assetById(el.dataset.id); closeModal(); openTaskWizard({ name: a.title.split('·')[0].trim(), product: a.product, camp: a.camp, assets: [a.id] }); };
ACT['asset-upload'] = () => {
  if (['care', 'compliance'].includes(S.role)) { lockMsg('upload content'); return; }
  openModal('Upload to the library', `<div class="grid g2">
    <label class="fl">Title<input class="input" id="up-title" placeholder="e.g. RM money tip: dana darurat"></label>
    <label class="fl">Content source<select class="input" id="up-type">${Object.entries(TYPE_INFO).map(([k, T]) => `<option value="${k}">${k} · ${T.name}</option>`).join('')}</select></label>
    <label class="fl">Product<select class="input" id="up-prod">${Object.keys(PRODUCTS).map(k => `<option>${k}</option>`).join('')}</select></label>
    <label class="fl">Format<select class="input" id="up-fmt"><option>image</option><option>video</option><option>carousel</option><option>template</option></select></label>
  </div>
  <label class="fl mt12">Caption or on-image text<textarea class="input" id="up-text" rows="3" placeholder="Text that appears on the asset or goes with it"></textarea></label>
  <label class="fl mt12">File (image preview; videos are stored the same way)<input class="input" type="file" id="up-file" accept="image/*,video/*"></label>
  <label class="chk mt12"><input type="checkbox" id="up-perm"> Customer or creator permission to reshare is on file (required for UGC and PGC)</label>
  <div id="up-res" class="mt12"></div>`, `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="up-save">${icon('shield', 14)}Run AI check & upload</button>`, 'wide');
};
ACT['up-save'] = () => {
  const title = $('#up-title').value.trim(); if (!title) { toast('Add a title', 'alert'); return; }
  const type = $('#up-type').value, product = $('#up-prod').value, text = $('#up-text').value, file = $('#up-file').files[0];
  if ((type === 'UGC' || type === 'PGC') && !$('#up-perm').checked) { toast('UGC and PGC need permission on file before upload', 'alert'); return; }
  const imageFlags = file && /ktp|kartu|card|nik|rekening/i.test(file.name) ? ['possible ID or card in image'] : [];
  const chk = checkCompliance(title + '\n' + text, { product, imageFlags, kind: 'asset' });
  logAudit('Library upload · ' + type, title, chk);
  if (chk.verdict === 'blocked') { $('#up-res').innerHTML = checkPanel(title + '\n' + text, { product, imageFlags, kind: 'asset' }); toast('Blocked by the AI check; fix the flagged items', 'x'); return; }
  const finish = img => {
    const a = { id: uid('as'), type, title, format: $('#up-fmt').value, product, camp: product === 'Kejar Mimpi' ? 'km' : product === 'Fraud awareness' ? 'waspada' : 'octo', status: chk.verdict === 'route' ? 'Pending review' : 'Cleared', uses: 0, added: Date.now(), tags: ['new'], img, source: ROLES[S.role].user };
    S.assets.unshift(a); closeModal();
    if (a.status === 'Pending review') { notify(`“${title}” waits for Compliance approval`, 'shield', '#library'); toast('Passed the AI check; high-risk product, sent to Compliance', 'shield'); } else toast('Uploaded and cleared: “Lolos cek kepatuhan AI”');
    render();
  };
  if (file && file.type.startsWith('image/') && file.size < 2.5e6) { const r = new FileReader(); r.onload = () => finish(r.result); r.readAsDataURL(file); } else finish(null);
};

/* ---------- Mass tasks ---------- */
const STATUS_TXT = { draft: ['Draft', ''], review: ['With Compliance', 'warn'], progress: ['In progress', 'blue'], completed: ['Completed', 'good'], terminated: ['Terminated', 'crit'] };
const PLAYBOOKS = [
  { n: 'OCTO campaigns', d: 'Push ‘OCTO untuk Pejuang Mimpi’ and ‘OCTO untuk Keluarga’ through staff and community, not ads alone.', who: 'Circles 1–4', ic: 'phone', circles: ['KOS', 'KOC'], product: 'OCTO', camp: 'octo' },
  { n: 'Local branch content', d: '383 branches post city-specific promos, events and openings from local templates.', who: 'Employees', ic: 'mapPin', circles: ['KOS'], product: 'KPR', camp: 'octo' },
  { n: 'Events to stories', d: 'Kejar Mimpi FEST, OCTO Land Blok M and OCTO Arena padel: capture the best visitor posts.', who: 'Community', ic: 'img', circles: ['KOC'], product: 'Kejar Mimpi', camp: 'km' },
  { n: '#WaspadaSelalu fraud alerts', d: 'When a scam spreads, trusted voices share the official warning within hours.', who: 'Circles 1–3', ic: 'alert', circles: ['KOS', 'KOC'], product: 'Fraud awareness', camp: 'waspada' },
  { n: 'Product launches', d: 'OCTO Card, Syariah and wealth launches with approved facts and required risk warnings.', who: 'Creators & partners', ic: 'megaphone', circles: ['KOL'], product: 'OCTO Card', camp: 'card', paid: true },
  { n: 'Employer brand', d: 'Grow ‘Life at CIMB Niaga’ with real staff stories to support hiring.', who: 'Employees', ic: 'users', circles: ['KOS'], product: 'Employer brand', camp: 'life' }
];
function statusCell(t) { const [l, c] = STATUS_TXT[t.status]; return `<span class="sdot ${c === 'blue' ? 'blue' : c === 'good' ? 'good' : c === 'warn' ? 'warn' : c === 'crit' ? 'crit' : ''}"></span>${l}`; }
VIEWS.tasks = p => {
  if (p.id) return taskDetail(taskById(p.id));
  const f = S.ui.taskF || 'all';
  const list = S.tasks.filter(t => f === 'all' || t.status === f);
  return `<div class="pagehead"><div><div class="crumb">Mass Tasks / <b>Delivery</b></div><p>Headquarters plans, people publish, data comes back. Each task lands on advocates’ phones with approved assets, an AI caption in Bahasa and the compliance check built in.</p></div><div class="toolbar"><button class="btn primary" data-act="task-new">${icon('plus', 14)}Create</button></div></div>
  <div class="row between wrap" style="margin-bottom:10px"><div class="row"><b>${list.length}</b> tasks <span class="muted">·</span> <div class="seg">${[['all', 'All'], ['progress', 'In progress'], ['review', 'With Compliance'], ['draft', 'Draft'], ['completed', 'Completed']].map(([k, l]) => `<button class="${f === k ? 'on' : ''}" data-act="tab" data-k="taskF" data-v="${k}">${l}</button>`).join('')}</div></div><span class="small muted">${icon('filter', 12)} Default view</span></div>
  <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>Creator</th><th>Who posts</th><th>Channels</th><th>Start time</th><th>Deadline</th><th>Status</th><th class="n">Posted</th><th>Completion</th><th></th></tr></thead><tbody>
  ${list.map(t => { const s = taskStats(t); return `<tr class="click" data-act="go" data-href="#task-${t.id}"><td><b>${esc(t.name)}</b><div class="tiny muted">${esc(t.playbook)}${t.paid ? ' · <span style="color:var(--coral)">paid · #iklan</span>' : ''}</div></td><td><span class="who">${av(t.creator, 22)}<span class="small">${esc(t.creator.split(' ')[0])}</span></span></td><td>${t.circles.map(c => `<span class="pill" style="border-color:${CIRCLES[c].color};color:${CIRCLES[c].color}">${c}</span>`).join(' ')}</td><td><span class="row" style="gap:3px">${t.channels.map(c => plat(c, 16)).join('')}</span></td><td class="small num">${fmtDT(t.start)}</td><td class="small num">${fmtDT(t.deadline)}</td><td class="small">${statusCell(t)}</td><td class="n">${fmtN(s.done)}/${fmtN(s.invited)}</td><td class="small num"><span class="ring" style="--p:${(s.completion * 100).toFixed(0)}"></span>${pct(s.completion, 1)}</td><td><button class="iconbtn" data-act="task-ops" data-id="${t.id}" aria-label="Task options">${icon('dots', 16)}</button></td></tr>`; }).join('')}
  </tbody></table></div></div>
  <h3 class="mt16" style="font-size:14px">Six playbooks for CIMB Niaga</h3><p class="small ink2" style="margin:4px 0 10px">Start a task from a playbook: who posts, product tag and caption pattern are filled in for you.</p>
  <div class="grid g3">${PLAYBOOKS.map((b, i) => `<div class="card" style="padding:12px 14px"><div class="row">${icon(b.ic, 18)}<b>${b.n}</b></div><div class="small ink2 mt8">${b.d}</div><div class="row between mt8"><span class="pill">${b.who}</span><button class="btn sm" data-act="pb-start" data-i="${i}">Start task</button></div></div>`).join('')}</div>`;
};
ACT['task-new'] = () => openTaskWizard({});
ACT['pb-start'] = el => { const b = PLAYBOOKS[+el.dataset.i]; openTaskWizard({ playbook: b.n, circles: b.circles, product: b.product, camp: b.camp, paid: !!b.paid, name: b.n === 'Employer brand' ? 'A day at CIMB Niaga' : '' }); };
ACT['task-ops'] = (el, e) => { e.stopPropagation(); const t = taskById(el.dataset.id); openModal(esc(t.name), `<div class="stack">${[['task-copy', 'copy', 'Quick copy (new draft with the same brief)'], ['task-remind', 'bell', 'Remind advocates who haven’t posted'], ['task-term', 'x', 'Terminate task'], ...(t.status === 'draft' ? [['task-del', 'x', 'Delete draft']] : [])].map(([a, ic, l]) => `<button class="btn" style="justify-content:flex-start" data-act="${a}" data-id="${t.id}">${icon(ic, 14)}${l}</button>`).join('')}</div>`); };
ACT['task-copy'] = el => { const t = taskById(el.dataset.id); const c = JSON.parse(JSON.stringify(t)); c.id = 't' + Date.now().toString(36); c.name = t.name + ' (copy)'; c.status = 'draft'; c.exec = c.assignees.map(a => ({ adv: a, st: 'pending' })); c.creator = ROLES[S.role].user; S.tasks.unshift(c); closeModal(); toast('Copied as a draft'); go('#task-' + c.id); };
ACT['task-remind'] = el => { const t = taskById(el.dataset.id); const n = t.exec.filter(e => e.st === 'pending').length; closeModal(); toast(`Reminder pushed to ${n} advocate${n === 1 ? '' : 's'}’ phones`, 'bell'); };
ACT['task-term'] = el => { const t = taskById(el.dataset.id); if (!canEditTask(t)) { lockMsg('change this task'); return; } t.status = 'terminated'; closeModal(); toast('Task terminated; advocates no longer see it'); render(); };
ACT['task-del'] = el => { const t = taskById(el.dataset.id); if (!canEditTask(t)) { lockMsg('delete this task'); return; } S.tasks = S.tasks.filter(x => x.id !== t.id); closeModal(); toast('Draft deleted'); go('#tasks'); };
function canEditTask(t) { return S.role === t.owner || S.role === 'brand'; }
function taskDetail(t) {
  if (!t) return '<div class="empty">Task not found. <a href="#tasks">Back to tasks</a></div>';
  const s = taskStats(t); const f = S.ui.execF || 'all'; const pg = S.ui.execPg || 0;
  const rows = t.exec.map(e => ({ e, a: advById(e.adv) })).filter(x => f === 'all' || x.e.st === f).sort((x, y) => (y.e.views || 0) - (x.e.views || 0));
  const per = 15, pages = Math.ceil(rows.length / per);
  const byRegion = {}; t.exec.filter(e => e.st === 'done').forEach(e => { const a = advById(e.adv); byRegion[a.region] = (byRegion[a.region] || 0) + e.views; });
  const byCircle = t.circles.map(c => { const ex = t.exec.filter(e => advById(e.adv).circle === c); return { label: CIRCLES[c].name.split(' (')[0], value: ex.length ? ex.filter(e => e.st === 'done').length / ex.length : 0, color: CIRCLES[c].color }; });
  const stTxt = { done: '<span class="pill good">Posted</span>', pending: '<span class="pill">Pending</span>', late: '<span class="pill warn">Late</span>', ignored: '<span class="pill">Ignored</span>', optout: '<span class="pill">Opted out</span>' };
  const tpl = t.template.replace('{link}', t.link).replace('{topik}', t.topics.join(' ')).replace('{cerita}', '[cerita advokat]').replace('{kota}', '[kota]').replace('{cabang}', '[cabang]');
  const chk = checkCompliance(tpl, { product: t.product, paid: t.paid, disclosure: t.disclosure });
  const actions = t.status === 'draft' ? `<button class="btn primary" data-act="task-publish" data-id="${t.id}">${icon('send', 14)}Publish task to phones</button>` :
    t.status === 'review' ? (S.role === 'compliance' ? `<button class="btn danger" data-act="task-reject" data-id="${t.id}">Return with comments</button><button class="btn primary" data-act="task-approve" data-id="${t.id}">${icon('check', 14)}Approve & publish</button>` : '<span class="pill warn">Waiting for Compliance</span>') :
      t.status === 'progress' ? `<button class="btn" data-act="task-remind" data-id="${t.id}">${icon('bell', 14)}Remind pending</button>` : '';
  return `<div class="pagehead"><div><div class="crumb"><a href="#tasks">Mass Tasks</a> / Delivery / <b>${esc(t.name)}</b></div><p class="row wrap" style="gap:8px">${statusCell(t)} · ${esc(t.playbook)} · created by ${esc(t.creator)} · due ${fmtD(t.deadline)} ${fmtT(t.deadline)}</p></div><div class="toolbar">${actions}<button class="btn" data-act="task-copy" data-id="${t.id}">${icon('copy', 14)}Quick copy</button></div></div>
  <div class="grid g6">${[[fmtN(s.invited), 'advocates invited'], [pct(s.completion, 0), 'posted at least once'], [fmtN(s.posts), 'posts'], [fmtK(s.views), 'reach'], [pct(s.er, 1), 'engagement on posts'], [fmtN(s.clicks) + ' · ' + fmtN(s.signups), 'clicks · sign-ups']].map(([v, l]) => `<div class="card kpi"><div class="v num">${v}</div><div class="l">${l}</div></div>`).join('')}</div>
  <div class="grid mt12" style="grid-template-columns:1.2fr 1fr 1fr">
    <div class="card"><div class="hd"><h3>Brief</h3>${t.paid ? '<span class="pill coral">Paid · POJK 6/2026 disclosure</span>' : t.disclosure ? '<span class="pill violet">Rewarded · #iklan required</span>' : ''}</div><div class="bd">
      <dl class="kv"><dt>Goal</dt><dd>${esc(t.goal)}</dd><dt>Who posts</dt><dd>${t.circles.map(c => CIRCLES[c].name).join(', ')}</dd><dt>Channels</dt><dd><span class="row" style="gap:4px">${t.channels.map(c => plat(c, 16) + ' ' + PLAT[c].name).join(' ')}</span></dd><dt>Product tag</dt><dd>${esc(t.product)}</dd><dt>Tracked link</dt><dd><span class="pill blue">${icon('link', 11)}${esc(t.link)}</span> + advocate ref</dd><dt>Points</dt><dd>${t.points ? '+' + t.points + ' per completed task' : 'Paid task · no points'}</dd></dl>
      <div class="fl mt12">Caption template with topic blocks</div><div class="preview-text small mt8">${highlight(tpl, chk.marks)}</div><div class="mt8">${verdictPill(chk.verdict)}</div>
      <div class="ph-assets mt12" style="grid-template-columns:repeat(4,1fr)">${t.assets.map(id => assetById(id)).filter(Boolean).map(a => `<div class="a" data-act="asset-open" data-id="${a.id}" title="${esc(a.title)}">${thumb(a)}</div>`).join('')}</div>
    </div></div>
    <div class="card"><div class="hd"><h3>Reach by region</h3></div><div class="bd" style="--lw:100px">${Object.keys(byRegion).length ? hbars(Object.entries(byRegion).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, value: v })), { fmt: fmtK }) : '<div class="empty">No posts yet</div>'}</div></div>
    <div class="card"><div class="hd"><h3>Posted at least once</h3><span class="sub">by circle</span></div><div class="bd" style="--lw:150px">${hbars(byCircle, { max: 1, fmt: v => pct(v, 0) })}<div class="note">Pilot pass mark: ≥ 60% of invited advocates post at least once.</div></div></div>
  </div>
  <div class="card mt12"><div class="hd"><h3>Task execution</h3><div class="seg">${[['all', 'All'], ['done', 'Posted'], ['pending', 'Pending'], ['late', 'Late'], ['ignored', 'Ignored']].map(([k, l]) => `<button class="${f === k ? 'on' : ''}" data-act="exec-f" data-v="${k}">${l} ${k === 'all' ? t.exec.length : t.exec.filter(e => e.st === k).length}</button>`).join('')}</div></div>
  <div class="bd" style="padding-top:8px"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Advocate</th><th>Circle</th><th>Branch / unit</th><th>Status</th><th>Posted on</th><th>Submitted link</th><th class="n">Views</th><th class="n">Engagement</th><th class="n">Clicks</th><th class="n">Sign-ups</th></tr></thead><tbody>
  ${rows.slice(pg * per, pg * per + per).map(({ e, a }) => `<tr><td><span class="who">${av(a.name, 22)}${esc(a.name)}</span></td><td><span class="pill" style="color:${CIRCLES[a.circle].color}">${a.circle}</span></td><td class="small">${esc(a.unit)}</td><td>${stTxt[e.st]}</td><td>${e.plats ? `<span class="row" style="gap:3px">${e.plats.map(p => plat(p, 16)).join('')}</span> <span class="tiny muted">${fmtDT(e.at)}</span>` : '<span class="muted">—</span>'}</td><td class="small">${e.url ? `<span class="pill blue">${icon('link', 11)}${esc(e.url[0].slice(0, 24))}</span>` : '—'}</td><td class="n">${e.views ? fmtN(e.views) : '—'}</td><td class="n">${e.views ? pct((e.likes + e.comments + e.shares) / e.views, 1) : '—'}</td><td class="n">${e.clicks ?? '—'}</td><td class="n">${e.signups ?? '—'}</td></tr>`).join('') || '<tr><td colspan="10" class="empty">Nobody in this status</td></tr>'}
  </tbody></table></div>
  ${pages > 1 ? `<div class="row mt12" style="justify-content:flex-end">${[...Array(Math.min(pages, 12))].map((_, i) => `<button class="btn sm ${i === pg ? 'primary' : ''}" data-act="exec-pg" data-v="${i}">${i + 1}</button>`).join('')}${pages > 12 ? '<span class="muted small">…</span>' : ''}<span class="small muted">${per} / page</span></div>` : ''}</div></div>`;
}
ACT['exec-f'] = el => { S.ui.execF = el.dataset.v; S.ui.execPg = 0; render(); };
ACT['exec-pg'] = el => { S.ui.execPg = +el.dataset.v; render(); };
ACT['task-publish'] = el => {
  const t = taskById(el.dataset.id); if (!canEditTask(t)) { lockMsg('publish this task'); return; }
  const tpl = t.template.replace('{link}', t.link).replace('{topik}', t.topics.join(' ')).replace('{cerita}', '').replace('{kota}', 'Jakarta').replace('{cabang}', 'Sudirman');
  const chk = checkCompliance(tpl, { product: t.product, paid: t.paid, disclosure: t.disclosure }); logAudit('Task brief · ' + t.name, tpl, chk);
  if (chk.verdict === 'blocked') { toast('The caption template is blocked by the AI check; fix it before publishing', 'x'); return; }
  t.start = Math.max(t.start, Date.now());
  if (chk.verdict === 'route') { t.status = 'review'; notify(`Task “${t.name}” waits for Compliance`, 'shield', '#task-' + t.id); toast('High-risk product: sent to Compliance before it reaches phones', 'shield'); }
  else { t.status = 'progress'; t.exec.forEach(e => { if (e.st !== 'optout') e.st = 'pending'; }); toast(`Task pushed to ${t.exec.filter(e => e.st === 'pending').length} phones`, 'send'); }
  render();
};
ACT['task-approve'] = el => { const t = taskById(el.dataset.id); t.status = 'progress'; t.start = Math.max(t.start, Date.now()); logAudit('Compliance approval · ' + t.name, t.template, { verdict: 'ready', res: [] }); toast(`Approved; task pushed to ${t.exec.filter(e => e.st === 'pending').length} phones`, 'send'); render(); };
ACT['task-reject'] = el => { const t = taskById(el.dataset.id); t.status = 'draft'; toast('Returned to the brand team as a draft', 'x'); render(); };

/* ---------- create task wizard ---------- */
function openTaskWizard(pre = {}) {
  if (['care', 'compliance'].includes(S.role)) { lockMsg('create advocate tasks'); return; }
  const W = { name: '', playbook: 'OCTO campaigns', goal: '', circles: ['KOS'], regions: [], channels: ['instagram', 'tiktok'], assets: [], product: 'OCTO', camp: 'octo', paid: false, disclosure: true, points: 20, cont: false, template: 'Buat kamu yang lagi kejar mimpi: {cerita} {link} {topik}', topics: '#CIMBNiaga #OCTO', ...pre };
  if (W.paid) { W.disclosure = true; W.points = 0; W.circles = ['KOL']; }
  if (W.disclosure && !/#iklan/i.test(W.template)) W.template = W.template.trim() + ' #iklan';
  S.ui.wiz = W;
  const st = new Date(Date.now() + 3600000), dl = new Date(Date.now() + 5 * DAY); dl.setHours(21, 0, 0, 0);
  openModal('Create mass task', `<div class="grid g2">
    <label class="fl">Task name<input class="input" id="w-name" value="${esc(W.name)}" placeholder="e.g. Kejar Mimpi FEST highlights"></label>
    <label class="fl">Playbook<select class="input" id="w-pb">${PLAYBOOKS.map(b => `<option ${b.n === W.playbook ? 'selected' : ''}>${b.n}</option>`).join('')}</select></label>
    <label class="fl" style="grid-column:1/-1">Goal<input class="input" id="w-goal" value="${esc(W.goal)}" placeholder="What should this task achieve?"></label>
  </div>
  <div class="fl mt12">Who posts</div><div class="checks mt8">${Object.entries(CIRCLES).filter(([k]) => k !== 'OFF').map(([k, c]) => `<label class="chk ${W.circles.includes(k) ? 'on' : ''}"><input type="checkbox" class="w-circ" value="${k}" data-change="w-upd" ${W.circles.includes(k) ? 'checked' : ''}><b style="color:${c.color}">${k}</b> ${c.name.split(' (')[0]}</label>`).join('')}</div>
  <div class="checks mt8">${REGIONS.map(r => `<label class="chk"><input type="checkbox" class="w-reg" value="${r}" data-change="w-upd">${r}</label>`).join('')}<span class="small muted" style="align-self:center">No region ticked = all regions</span></div>
  <div class="small mt8" id="w-count"></div>
  <div class="fl mt12">Channels</div><div class="checks mt8">${['instagram', 'tiktok', 'facebook', 'x', 'threads', 'youtube', 'whatsapp'].map(c => `<label class="chk"><input type="checkbox" class="w-ch" value="${c}" ${W.channels.includes(c) ? 'checked' : ''}>${plat(c, 16)}${PLAT[c].name}</label>`).join('')}</div>
  <div class="fl mt12">Approved assets from Harbor</div><div class="ph-assets mt8" style="grid-template-columns:repeat(8,1fr)">${S.assets.filter(a => a.status === 'Cleared').map(a => `<div class="a ${W.assets.includes(a.id) ? 'on' : ''}" data-act="w-asset" data-id="${a.id}" data-tip="${esc(a.title)}">${thumb(a)}${W.assets.includes(a.id) ? `<span class="ck">${icon('check', 12, 3)}</span>` : ''}</div>`).join('')}</div>
  <div class="grid g4 mt12">
    <label class="fl">Product tag<select class="input" id="w-prod" data-change="w-upd">${Object.keys(PRODUCTS).map(k => `<option ${k === W.product ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
    <label class="fl">Paid partnership<select class="input" id="w-paid" data-change="w-upd"><option value="0" ${W.paid ? '' : 'selected'}>No</option><option value="1" ${W.paid ? 'selected' : ''}>Yes (KOL)</option></select></label>
    <label class="fl">Disclosure (#iklan)<select class="input" id="w-disc" data-change="w-upd"><option value="1" ${W.disclosure ? 'selected' : ''}>Required</option><option value="0" ${W.disclosure ? '' : 'selected'}>Not required</option></select></label>
    <label class="fl">Points<input class="input" type="number" id="w-pts" value="${W.points}" min="0" max="200"></label>
    <label class="fl">Start<input class="input" type="datetime-local" id="w-start" value="${dKey(st)}T${fmtT(st)}"></label>
    <label class="fl">Deadline<input class="input" type="datetime-local" id="w-dl" value="${dKey(dl)}T${fmtT(dl)}"></label>
    <label class="fl">Tracked link<input class="input" id="w-link" value="cimb.id/${(W.name || 'tugas').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 14).replace(/-$/, '')}"></label>
    <label class="fl">After the deadline<select class="input" id="w-cont"><option value="0">Close the task</option><option value="1">Keep it open</option></select></label>
  </div>
  <label class="fl mt12">Caption template · topic blocks: {cerita} {link} {topik} {kota} {cabang}<textarea class="input" id="w-tpl" data-input="w-upd" rows="3">${esc(W.template)}</textarea></label>
  <label class="fl mt8">Topic tags<input class="input" id="w-top" data-input="w-upd" value="${esc(W.topics)}"></label>
  <div id="w-chk" class="mt12"></div>`,
    `<button class="btn" data-act="close-modal">Cancel</button><button class="btn" data-act="w-save" data-pub="0">Save draft</button><button class="btn primary" data-act="w-save" data-pub="1">${icon('send', 14)}Publish to phones</button>`, 'wide');
  ONCHANGE['w-upd']();
}
function wizAssignees() {
  const circ = $$('.w-circ:checked').map(x => x.value); const reg = $$('.w-reg:checked').map(x => x.value);
  return S.advocates.filter(a => circ.includes(a.circle) && (!reg.length || reg.includes(a.region)));
}
ONCHANGE['w-upd'] = ONINPUT['w-upd'] = () => {
  if (!$('#w-count')) return;
  $$('.w-circ').forEach(x => x.closest('.chk').classList.toggle('on', x.checked));
  const as = wizAssignees(); const opt = as.filter(a => a.optIn).length;
  $('#w-count').innerHTML = `<b>${fmtN(as.length)}</b> advocates match · <b>${fmtN(opt)}</b> opted in and will get the task on their phone`;
  if ($('#w-paid').value === '1' && $('#w-disc').value !== '1') $('#w-disc').value = '1';
  const tpl = $('#w-tpl').value.replace('{link}', $('#w-link').value).replace('{topik}', $('#w-top').value).replace('{cerita}', '').replace('{kota}', 'Bandung').replace('{cabang}', 'Dago');
  $('#w-chk').innerHTML = checkPanel(tpl, { product: $('#w-prod').value, paid: $('#w-paid').value === '1', disclosure: $('#w-disc').value === '1' }, 'Caption template preview (with sample values)');
};
ACT['w-asset'] = el => { const W = S.ui.wiz; const id = el.dataset.id; W.assets = W.assets.includes(id) ? W.assets.filter(x => x !== id) : [...W.assets, id]; el.classList.toggle('on'); el.querySelector('.ck') ? el.querySelector('.ck').remove() : el.insertAdjacentHTML('beforeend', `<span class="ck">${icon('check', 12, 3)}</span>`); };
ACT['w-save'] = el => {
  const W = S.ui.wiz; const pub = el.dataset.pub === '1';
  const name = $('#w-name').value.trim(); if (!name) { toast('Give the task a name', 'alert'); return; }
  const as = wizAssignees(); if (!as.length) { toast('Choose who posts', 'alert'); return; }
  const ch = $$('.w-ch:checked').map(x => x.value); if (!ch.length) { toast('Choose at least one channel', 'alert'); return; }
  const owner = S.role === 'km' ? 'km' : S.role === 'hr' ? 'hr' : S.role === 'syariah' ? 'syariah' : 'brand';
  const t = { id: 't' + Date.now().toString(36), name, playbook: $('#w-pb').value, goal: $('#w-goal').value, circles: $$('.w-circ:checked').map(x => x.value), assignees: as.map(a => a.id), channels: ch, start: new Date($('#w-start').value).getTime(), deadline: new Date($('#w-dl').value).getTime(), product: $('#w-prod').value, camp: W.camp || 'octo', link: $('#w-link').value, paid: $('#w-paid').value === '1', disclosure: $('#w-disc').value === '1', topics: $('#w-top').value.split(/\s+/).filter(Boolean), assets: W.assets, template: $('#w-tpl').value, status: 'draft', points: +$('#w-pts').value || 0, creator: ROLES[S.role].user, owner, keepOpen: $('#w-cont').value === '1', exec: as.map(a => ({ adv: a.id, st: a.optIn ? 'pending' : 'optout' })) };
  if (!(t.deadline > t.start)) { toast('The deadline must be after the start', 'alert'); return; }
  S.tasks.unshift(t); closeModal();
  if (pub) { ACT['task-publish']({ dataset: { id: t.id } }); go('#task-' + t.id); }
  else { toast('Saved as draft'); go('#task-' + t.id); }
};

/* ---------- shared: compliance panel + caption helpers ---------- */
function checkPanel(text, ctx, title) {
  const c = checkCompliance(text, ctx);
  return `<div class="card" style="padding:12px 14px">${title ? `<div class="small b ink2" style="margin-bottom:6px">${title}</div>` : ''}<div class="preview-text small">${highlight(text, c.marks)}</div>
  <div class="mt8">${c.res.map(r => `<div class="checkrow"><span class="${r.ok ? 'ok-i' : 'bad-i'}">${icon(r.ok ? 'check' : 'x', 15, 2.4)}</span><b style="min-width:170px">${esc(r.name)}</b><span class="small ink2">${esc(r.detail)}</span></div>`).join('')}</div>
  <div class="verdict ${c.verdict === 'ready' ? 'ok' : c.verdict === 'route' ? 'route' : 'bad'}">${icon(c.verdict === 'ready' ? 'check' : c.verdict === 'route' ? 'shield' : 'x', 16, 2.2)}${c.verdict === 'ready' ? 'Ready to publish · Lolos cek kepatuhan AI' : c.verdict === 'route' ? 'Passed the AI check · goes to Compliance (high-risk product)' : `Blocked: fix ${c.blocking.length} issue${c.blocking.length > 1 ? 's' : ''} before posting`}</div></div>`;
}
function captionTemplate(o) {
  const lines = {
    'Kejar Mimpi': 'Seru banget di Kejar Mimpi FEST! Atur dana impian lebih gampang pakai OCTO.',
    'OCTO': 'Buka rekening di OCTO cuma beberapa menit, langsung bisa atur dana impian.',
    'OCTO Card': 'OCTO Card bikin belanja lebih fleksibel: cicilan 0% tenor 3, 6 atau 12 bulan.',
    'KPR': 'Rumah impian makin dekat dengan KPR CIMB Niaga, bunga fixed 3,88% p.a. tahun pertama. Syarat dan ketentuan berlaku.',
    'Reksa dana': 'Mulai investasi reksa dana langsung dari OCTO, mulai dari nominal kecil.',
    'Fraud awareness': 'Hati-hati! CIMB Niaga tidak pernah meminta OTP, PIN, atau password. Akun resmi hanya yang bercentang biru.',
    'Employer brand': 'Sehari di cabang CIMB Niaga: ketemu nasabah, bantu wujudkan mimpi mereka.',
    'Syariah iB': 'Tabungan iB dari CIMB Niaga Syariah, sekarang bisa sekalian wakaf.'
  };
  let t = (lines[o.product] || `${o.name}: cerita kami bersama CIMB Niaga.`);
  if (o.link) t += ' ' + o.link;
  if (o.topics) t += ' ' + o.topics;
  const pr = PRODUCTS[o.product]; if (pr && pr.risk) t += '\n\n' + RISK_WORDING[pr.risk].text;
  if (o.paid || o.disclosure) t += ' #iklan';
  return t.trim();
}
function captionPrompt(o) {
  const pr = PRODUCTS[o.product] || {};
  return `Write ONE short social media caption in casual Indonesian (Bahasa Indonesia) for ${o.account || 'a CIMB Niaga employee or community advocate posting on their own account'}.
Task: ${o.name}. Campaign: ${o.campaign || ''}. Product: ${o.product}. ${o.goal ? 'Goal: ' + o.goal + '.' : ''} ${o.who ? 'Advocate: ' + o.who + '.' : ''}
Approved product facts (use only these, no other numbers): ${pr.sheet || 'none'}.
Rules (OJK POJK 6/2026 and bank compliance): no guaranteed returns or words like "pasti untung", "dijamin"; no comparisons with other banks; no superlatives like "terbaik"; no personal data; no politics.
${o.link ? 'Include the tracked link ' + o.link + '.' : ''} ${o.topics ? 'Include these hashtags: ' + o.topics + '.' : ''} ${o.paid || o.disclosure ? 'End with #iklan.' : ''} ${pr.risk ? 'Add this risk wording verbatim on a new line: "' + RISK_WORDING[pr.risk].text + '"' : ''}
Max 45 words before hashtags. Output only the caption text, nothing else.`;
}
