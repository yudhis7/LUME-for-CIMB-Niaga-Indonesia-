/* ================= App shell ================= */
const STORE = 'lume-cimb-niaga-v3';
let saveT;
function save() {
  if (SERVER.on) { if (!SERVER.user) return; try { sessionStorage.setItem('lume-phone', JSON.stringify(S.phone)); sessionStorage.setItem('lume-role', S.role); } catch (e) { } serverQueue(); return; }
  clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { } }, 250);
}
function load() {
  try { const raw = localStorage.getItem(STORE); if (raw) { const st = JSON.parse(raw); if (st && st.v === 3) return st; } } catch (e) { }
  return null;
}
function freshState() { S = seed(); S.inbox.forEach(prepInbox); S.inbox.forEach(m => { if (m.pre != null) { const t = m.at + m.pre * 60000; let text = replyFallback(m); if (m.ai.type === 'Complaint') { const tk = createTicket(m, t); text = text.replace('[dibuat saat dikirim]', tk.id); } m.thread.push({ from: 'brand', at: t, text, by: 'Agus F.' }); m.firstReplyAt = t; m.status = m.ai.type === 'Complaint' ? 'ticketed' : m.ai.type === 'Crisis or viral' ? 'escalated' : 'replied'; delete m.pre; } }); S.phone = phoneInit(); }
async function resetDemo() {
  if (SERVER.on) {
    if (!isAdmin()) { toast('Only the pilot admin can reset the shared workspace', 'lock'); return; }
    const r = await api('POST', '/api/v1/admin/reset');
    if (!r.ok) { toast(r.data.error || 'Reset failed', 'x'); return; }
    await serverLoad(); location.hash = '#command'; render(); toast('Demo data reset for everyone'); return;
  }
  try { localStorage.removeItem(STORE); } catch (e) { } freshState(); if (EDITION.signin) applySessionRole(); document.body.classList.toggle('has-drawer', !!S.ui.drawer); save(); location.hash = '#command'; render(); toast('Demo data reset'); }

/* ---------- AI (Claude via the page's sample capability; templates as fallback) ---------- */
const AI = {
  sample: null,
  async init() {
    if (SERVER.on) {
      AI.sample = SERVER.health && SERVER.health.ai ? async (prompt) => { const r = await api('POST', '/api/v1/ai/write', { prompt, purpose: 'draft' }); if (!r.ok) throw Object.assign(new Error(r.data.error || 'AI error'), { code: r.status === 429 ? 'rate_limited' : 'error' }); return { text: r.data.text }; } : null;
      renderTop(); return;
    }
    for (let i = 0; i < 6 && !(window.claude && window.claude.use); i++) await new Promise(r => setTimeout(r, 500));
    if (!(window.claude && window.claude.use)) return;
    try { const s = await window.claude.use('sample'); if (s) { AI.sample = s; renderTop(); } } catch (e) { }
  },
  get live() { return !!AI.sample; },
  async write(prompt, fallback, onText) {
    if (!AI.sample) return fallback();
    try {
      const r = await AI.sample(prompt, { modelTier: 'quick', onText: onText ? (u => onText(u.text)) : undefined });
      const txt = (r && r.text || '').trim();
      return txt || fallback();
    } catch (e) {
      if (e && e.code === 'not_granted') { AI.sample = null; renderTop(); }
      toast(e && e.code === 'rate_limited' ? 'AI is busy; used the approved template instead' : 'AI unavailable; used the approved template instead', 'alert');
      return fallback();
    }
  }
};

/* ---------- routes ---------- */
const ROUTES = [
  { id: 'command', t: 'Command centre', ic: 'dash', g: 'Overview' },
  { id: 'calendar', t: 'Calendar', ic: 'cal', g: 'Publish' },
  { id: 'tasks', t: 'Mass tasks', ic: 'task', g: 'Publish' },
  { id: 'library', t: 'Library (Harbor)', ic: 'lib', g: 'Publish' },
  { id: 'accounts', t: 'Accounts', ic: 'accounts', g: 'Publish' },
  { id: 'network', t: 'Voice network', ic: 'net', g: 'Network' },
  { id: 'insights', t: 'Insights & points', ic: 'chart', g: 'Network' },
  { id: 'care', t: 'Care desk', ic: 'care', g: 'Listen & resolve' },
  { id: 'tickets', t: 'Social tickets', ic: 'ticket', g: 'Listen & resolve' },
  { id: 'compliance', t: 'Compliance', ic: 'shield', g: 'Govern' },
  { id: 'reports', t: 'OJK reports', ic: 'report', g: 'Govern' },
  { id: 'scorecard', t: 'Pilot scorecard', ic: 'flag', g: 'Govern' }
];
function parseHash() {
  const h = (location.hash || '#command').slice(1);
  if (h.startsWith('task-')) return { r: 'tasks', id: h.slice(5) };
  if (h.startsWith('ticket-')) return { r: 'tickets', id: h.slice(7) };
  if (ROUTES.some(x => x.id === h)) return { r: h };
  return { r: 'command' };
}

function navBadges() {
  const q = S.inbox.filter(m => m.status === 'new').length;
  const risk = S.tickets.filter(t => !t.closedAt && ['risk', 'overdue'].includes(clockOf(t).state)).length;
  const rev = S.tasks.filter(t => t.status === 'review').length + S.assets.filter(a => a.status === 'Pending review').length;
  return { care: q ? `<span class="badge">${q}</span>` : '', tickets: risk ? `<span class="badge" title="At risk of missing the OJK deadline">${risk}</span>` : '', compliance: rev ? `<span class="badge blue">${rev}</span>` : '' };
}
function renderNav() {
  const cur = parseHash().r; const b = navBadges(); let g = ''; let html = '';
  ROUTES.forEach(r => { if (r.g !== g) { html += `<h6>${r.g}</h6>`; g = r.g; } html += `<a href="#${r.id}" class="${cur === r.id ? 'on' : ''}">${icon(r.ic, 17)}<span>${r.t}</span>${b[r.id] || ''}</a>`; });
  html += `<div class="foot">Pilot workspace · PT Bank CIMB Niaga Tbk<br>${SERVER.on ? (SERVER.health && SERVER.health.demo ? `Shared pilot workspace · ${SERVER.health.connectors === 'live' ? 'live accounts' : 'sandbox connectors'}. ${isAdmin() ? '<button class="btn sm ghost" style="padding:0;color:var(--primary)" data-act="reset">Reset demo data</button>' : ''}` : 'Connected to the Lume engine.') : 'Sample data for the 8-week pilot. <button class="btn sm ghost" style="padding:0;color:var(--primary)" data-act="reset">Reset demo data</button>'}</div>`;
  $('#nav').innerHTML = html;
}
function renderTop() {
  const un = S.notifs.filter(n => n.unread).length;
  $('#topbar').innerHTML = `
    ${EDITION.logo ? `<div class="brand"><img class="client-logo" src="${EDITION.logo}" alt="CIMB Niaga"><span class="brand-div"></span><span class="lume">Lume</span><small>by Whale</small></div>` : `<div class="brand"><span class="whale">whale</span><span class="lume">Lume</span><small>Harbor 5.6 · Alivia</small></div>
    <div class="ws"><span class="mark">CN</span><span class="wsn">PT Bank CIMB Niaga Tbk</span></div>`}
    <span class="env">Pilot</span>
    <div class="grow"></div>
    <div class="search" style="position:relative">${icon('search', 14)}<input id="gsearch" placeholder="Search tasks, tickets, assets, people" autocomplete="off" aria-label="Search"></div>
    <span class="ai-badge ${AI.live ? 'live' : ''}" data-tip="${AI.live ? 'Captions, replies and briefs are written live by Claude, then checked by the compliance rules.' : SERVER.on ? 'Captions and replies come from the approved template library. Live AI writing switches on when the engine has a Claude API key.' : 'Captions and replies come from the approved template library. Live AI writing switches on when this page is opened on claude.ai and you allow it.'}"><i></i>Alivia AI · ${AI.live ? 'live' : 'templates'}</span>
    <button class="iconbtn" data-act="notifs" aria-label="Notifications">${icon('bell', 18)}${un ? `<span class="dot-count">${un}</span>` : ''}</button>
    <button class="btn ${S.ui.drawer ? 'primary' : ''}" data-act="drawer" aria-label="Advocate app">${icon('phone', 15)}<span class="lbl">Advocate app</span></button>
    ${isAdmin() ? `<label class="row small" style="gap:6px"><span class="muted">Role</span><select class="role-sel" id="rolesel" aria-label="Switch role">${Object.entries(ROLES).map(([k, r]) => `<option value="${k}" ${S.role === k ? 'selected' : ''}>${r.name}</option>`).join('')}</select></label>` : ''}
    ${EDITION.signin ? userMenuHTML() : av(ROLES[S.role].user, 28)}`;
}
let lastRoute = null;
function render() {
  const p = parseHash();
  document.title = EDITION.signin ? 'Lume · CIMB Niaga' : 'Lume for CIMB Niaga';
  renderTop(); renderNav();
  const main = $('#main');
  const keep = lastRoute === location.hash ? main.scrollTop : 0;
  const view = VIEWS[p.r];
  try { main.innerHTML = `<div class="page">${view ? view(p) : ''}</div>`; }
  catch (e) { console.error(e); main.innerHTML = `<div class="page"><div class="callout crit">${icon('alert')}<div>Something went wrong drawing this screen: ${esc(e.message)}. Try <button class="btn sm" data-act="reset">Reset demo data</button>.</div></div></div>`; }
  main.scrollTop = keep; lastRoute = location.hash;
  if (VIEWS[p.r + '_after']) VIEWS[p.r + '_after'](p);
  renderDrawer();
  updateLive();
  save();
}
function rerender() { render(); }
function go(h) { if (location.hash === h) render(); else location.hash = h; }

/* ---------- live timers ---------- */
function updateLive() {
  $$('[data-due]').forEach(el => {
    const due = +el.getAttribute('data-due'); const m = (due - Date.now()) / 60000;
    el.textContent = m >= 0 ? `${durMin(m)} left` : `${durMin(-m)} over`;
    el.className = 'pill ' + (m < 0 ? 'crit' : m < 10 ? 'warn' : '');
  });
}

/* ---------- notifications & search ---------- */
function notify(text, ic, goTo) { S.notifs.unshift({ id: uid('n'), at: Date.now(), ic: ic || 'bell', text, go: goTo || '', unread: true }); if (S.notifs.length > 40) S.notifs.length = 40; }
function closePops() { $$('.popover').forEach(p => p.remove()); }
function showNotifs() {
  closePops();
  const p = document.createElement('div'); p.className = 'popover';
  p.innerHTML = `<div class="row between" style="padding:10px 14px;border-bottom:1px solid var(--line)"><b>Notifications</b><button class="btn sm ghost" data-act="read-all">Mark all read</button></div>` +
    (S.notifs.length ? S.notifs.map(n => `<div class="it" data-act="open-notif" data-id="${n.id}"><span style="color:${n.unread ? 'var(--crit)' : 'var(--muted)'}">${icon(n.ic || 'bell', 16)}</span><div><div style="font-weight:${n.unread ? 650 : 500}">${esc(n.text)}</div><div class="tiny muted">${rel(n.at)}</div></div></div>`).join('') : '<div class="empty">No notifications</div>');
  $('#topbar').appendChild(p);
}
function doSearch(q) {
  closePops(); q = q.trim().toLowerCase(); if (q.length < 2) return;
  const res = [];
  S.tasks.forEach(t => { if (t.name.toLowerCase().includes(q)) res.push({ ic: 'task', t: t.name, s: 'Mass task', go: '#task-' + t.id }); });
  S.tickets.forEach(t => { if ((t.id + ' ' + t.issue + ' ' + t.theme).toLowerCase().includes(q)) res.push({ ic: 'ticket', t: t.id + ' · ' + t.issue, s: 'Social ticket', go: '#ticket-' + t.id }); });
  S.assets.forEach(a => { if ((a.title + ' ' + a.type + ' ' + (a.tags || []).join(' ')).toLowerCase().includes(q)) res.push({ ic: 'lib', t: a.title, s: a.type + ' asset', go: '#library', ui: ['libOpen', a.id] }); });
  S.advocates.forEach(a => { if ((a.name + ' ' + a.unit).toLowerCase().includes(q)) res.push({ ic: 'user', t: a.name, s: a.circle + ' · ' + a.unit, go: '#network', ui: ['netQ', a.name] }); });
  S.inbox.forEach(m => { if (m.text.toLowerCase().includes(q)) res.push({ ic: 'care', t: m.text.slice(0, 70), s: 'Care desk · ' + m.ai.type, go: '#care', ui: ['careSel', m.id] }); });
  const p = document.createElement('div'); p.className = 'popover'; p.style.right = '420px';
  p.innerHTML = res.length ? res.slice(0, 14).map((r, i) => `<div class="it" data-act="search-go" data-i="${i}">${icon(r.ic, 16)}<div><div>${esc(r.t)}</div><div class="tiny muted">${esc(r.s)}</div></div></div>`).join('') : '<div class="empty">No matches</div>';
  p._res = res;
  $('#topbar').appendChild(p);
}

/* ---------- events ---------- */
function bindEvents() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!e.target.closest('.popover') && !e.target.closest('[data-act="notifs"]') && !e.target.closest('[data-act="user-menu"]') && !e.target.closest('#gsearch')) closePops();
    if (!el) return;
    const a = el.getAttribute('data-act');
    if (ACT[a]) { e.preventDefault(); if (SERVER.on) { SERVER.lastAct = a; SERVER.lastArgs = { ...el.dataset }; } ACT[a](el, e); if (SERVER.on && SERVER_ACTIONS.has(a)) save(); }
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'rolesel') { if (!isAdmin()) return; S.role = e.target.value; toast(`Now working as ${ROLES[S.role].name} (${ROLES[S.role].user})`, 'user'); render(); return; }
    const k = e.target.getAttribute('data-change'); if (k && ONCHANGE[k]) { ONCHANGE[k](e.target, e); if (SERVER.on) save(); }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'gsearch') { doSearch(e.target.value); return; }
    const k = e.target.getAttribute('data-input'); if (k && ONINPUT[k]) ONINPUT[k](e.target, e);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closePops(); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); const s = $('#gsearch'); if (s) s.focus(); }
  });
  window.addEventListener('hashchange', () => { closeModal(); render(); });
}
ACT['close-modal'] = () => closeModal();
ACT.reset = () => openModal('Reset demo data?', SERVER.on ? '<p>This restores the original CIMB Niaga sample data in the <b>shared</b> pilot workspace: tasks, tickets, care queue, points and settings. Everyone signed in sees the reset.</p>' : '<p>This restores the original CIMB Niaga sample data: tasks, tickets, care queue, points and settings. Changes you made in this browser are cleared.</p>', '<button class="btn" data-act="close-modal">Cancel</button><button class="btn danger" data-act="reset-yes">Reset</button>');
ACT['reset-yes'] = () => { closeModal(); resetDemo(); };
ACT.notifs = () => { if ($('.popover')) { closePops(); return; } showNotifs(); };
ACT['read-all'] = () => { S.notifs.forEach(n => n.unread = false); closePops(); renderTop(); save(); };
ACT['open-notif'] = el => { const n = S.notifs.find(x => x.id === el.dataset.id); if (n) { n.unread = false; closePops(); if (n.go) go(n.go); else renderTop(); } };
ACT['search-go'] = el => { const p = el.closest('.popover'); const r = p._res[+el.dataset.i]; closePops(); $('#gsearch').value = ''; if (r.ui) S.ui[r.ui[0]] = r.ui[1]; go(r.go); };
ACT.drawer = () => { S.ui.drawer = !S.ui.drawer; document.body.classList.toggle('has-drawer', !!S.ui.drawer); render(); };
ACT.tab = el => { S.ui[el.dataset.k] = el.dataset.v; render(); };
ACT.go = el => go(el.dataset.href);
ACT.copy = el => copyText(el.dataset.text || ($(el.dataset.from) ? $(el.dataset.from).innerText || $(el.dataset.from).value : ''));

function lockMsg(what) { toast(`${ROLES[S.role].name} can’t ${what}. Each team publishes only to its own accounts.`, 'lock'); }

/* ---------- init ---------- */
async function init() {
  if (await serverDetect()) {
    initTip(); bindEvents();
    await serverBoot();
    setInterval(updateLive, 15000);
    return;
  }
  S = load();
  if (!S) freshState();
  S.inbox.forEach(m => { if (!m.ai) prepInbox(m); });
  if (!S.phone) S.phone = phoneInit();
  document.body.classList.toggle('has-drawer', !!S.ui.drawer);
  initTip(); bindEvents();
  if (EDITION.signin) {
    SESSION = readSession();
    if (!SESSION) showSignin(); else enterApp(false);
  } else render();
  setInterval(updateLive, 15000);
  AI.init();
}
document.addEventListener('DOMContentLoaded', init);
