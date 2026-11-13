/* ================= Engine connection (server mode) =================
   When this page is served by the Lume engine (it answers /api/v1/health), the console signs in
   against the engine, loads the shared workspace from it, sends every change back as field-level
   patches, and receives everyone else's changes live. The engine re-checks permissions and the
   compliance rules, publishes and replies through the platform connectors, and keeps the audit
   trail. Opened as a file or in the desktop apps, the console keeps working on its own as before. */
const SERVER = {
  on: false, health: null, user: null, clientId: Math.random().toString(36).slice(2, 12),
  base: {}, ver: {}, order: {}, metaBase: {}, pushing: false, again: false, timer: null,
  lastAct: null, lastArgs: null, es: null, pendingRender: false, renderTimer: null
};
const SYNC_COLS = ['accounts', 'rules', 'pointRules', 'watch', 'advocates', 'assets', 'tasks', 'posts', 'inbox', 'tickets', 'notifs', 'audit', 'ledger', 'negLog'];
const SYNC_META = ['listen', 'brandReach'];
const APPEND_ONLY = new Set(['audit', 'ledger']);
// actions that reach people outside the console even when they change nothing on screen
const SERVER_ACTIONS = new Set(['care-fraud', 'care-recog', 'task-remind', 'brief-send', 'wave-push', 'care-escalate']);

async function serverDetect() {
  if (!/^https?:$/.test(location.protocol)) return false;
  try {
    const r = await fetch('/api/v1/health', { cache: 'no-store' });
    if (!r.ok) return false;
    const h = await r.json();
    if (!h || h.engine !== 'lume') return false;
    SERVER.on = true; SERVER.health = h;
    return true;
  } catch (e) { return false; }
}

async function api(method, path, body) {
  const headers = { 'x-lume-csrf': '1', 'x-lume-client': SERVER.clientId };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (S && S.role) headers['x-lume-role'] = S.role;
  const r = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'same-origin', cache: 'no-store' });
  let data = null; try { data = await r.json(); } catch (e) { }
  if (r.status === 401 && SERVER.user && !path.includes('/auth/')) serverSignedOut('Your session ended. Sign in again.');
  return { ok: r.ok, status: r.status, data: data || {} };
}

/* ---------- sign-in ---------- */
async function serverBoot() {
  const me = await api('GET', '/api/v1/auth/me');
  if (!me.ok) { S = blankState(); showSignin(); return; }
  setServerUser(me.data.user, me.data.session);
  if (!(await serverLoad())) return;
  enterApp(false);
}
function blankState() { const s = { v: 3, role: 'brand', ui: {}, ticketSeq: 0 }; SYNC_COLS.forEach(c => s[c] = []); s.listen = { themes: {}, byAcc: {}, sent: { pos: 0, neg: 0, neu: 0 }, hourly: [], firstReply: {} }; s.brandReach = {}; s.phone = phoneInit(); return s; }
function setServerUser(u, sess) {
  SERVER.user = { uid: u.uid, name: u.name, title: u.title, role: u.role, admin: !!u.admin };
  SESSION = { uid: u.uid, at: (sess && sess.at) || Date.now(), exp: (sess && sess.exp) || 0 };
}
async function serverSignin(uid, pw, remember) {
  const r = await api('POST', '/api/v1/auth/login', { uid, password: pw, remember: !!remember });
  if (!r.ok) return r;
  setServerUser(r.data.user, r.data.session);
  if (!(await serverLoad())) return { ok: false, status: 500, data: { error: 'Signed in, but the workspace did not load. Try again.' } };
  return r;
}
async function serverSignOut() {
  await api('POST', '/api/v1/auth/logout').catch(() => null);
  serverSignedOut('You have signed out.');
}
function serverSignedOut(msg) {
  if (SERVER.es) { SERVER.es.close(); SERVER.es = null; }
  SERVER.user = null; SESSION = null; closePops(); closeModal();
  document.body.classList.remove('has-drawer');
  showSignin(msg);
}

/* ---------- load ---------- */
async function serverLoad() {
  const r = await api('GET', '/api/v1/workspace');
  if (!r.ok) { toast(r.data.error || 'Could not load the workspace', 'alert'); return false; }
  const st = r.data.state;
  let phone = null, role = null;
  try { phone = JSON.parse(sessionStorage.getItem('lume-phone') || 'null'); role = sessionStorage.getItem('lume-role'); } catch (e) { }
  S = { ...st, v: 3, ui: {}, ticketSeq: st.ticketSeq || 0, seededAt: st.seededAt || Date.now(), phone: phone || phoneInit() };
  S.role = SERVER.user.admin ? (ROLES[role] ? role : 'brand') : SERVER.user.role;
  SERVER.base = {}; SERVER.ver = {}; SERVER.order = {};
  SYNC_COLS.forEach(c => {
    S[c] = S[c] || [];
    SERVER.base[c] = new Map(S[c].map(d => [d.id, JSON.stringify(d)]));
    SERVER.ver[c] = new Map(Object.entries((r.data.versions || {})[c] || {}));
    SERVER.order[c] = S[c].map(d => d.id).join('\n');
  });
  SYNC_META.forEach(k => { SERVER.metaBase[k] = JSON.stringify(S[k]); });
  SERVER.health = { ...(SERVER.health || {}), ...(r.data.server || {}) };
  S.inbox.forEach(m => { if (!m.ai) prepInbox(m); });
  serverListen();
  AI.init();
  return true;
}

/* ---------- push local changes ---------- */
function serverQueue() {
  clearTimeout(SERVER.timer);
  SERVER.timer = setTimeout(serverPush, 120);
}
function serverDiff() {
  const mutations = [], order = {}, meta = {}, sent = {};
  SYNC_COLS.forEach(col => {
    const list = S[col] || (S[col] = []);
    const base = SERVER.base[col] || (SERVER.base[col] = new Map());
    const seen = new Set();
    list.forEach(d => {
      if (!d.id) d.id = uid(col.slice(0, 2));
      seen.add(d.id);
      const j = JSON.stringify(d); const b = base.get(d.id);
      if (b === j) return;
      if (b === undefined) mutations.push({ col, id: d.id, op: 'put', set: JSON.parse(j), baseVer: 0 });
      else {
        const prev = JSON.parse(b); const set = {}; const unset = [];
        Object.keys(d).forEach(k => { if (JSON.stringify(d[k]) !== JSON.stringify(prev[k])) set[k] = d[k]; });
        Object.keys(prev).forEach(k => { if (!(k in d)) unset.push(k); });
        if (!Object.keys(set).length && !unset.length) { base.set(d.id, j); return; }
        mutations.push({ col, id: d.id, op: 'put', set: JSON.parse(JSON.stringify(set)), unset, baseVer: +(SERVER.ver[col].get(d.id) || 0) });
      }
      base.set(d.id, j); sent[col + '\u0001' + d.id] = j;
    });
    [...base.keys()].forEach(id => { if (!seen.has(id)) { if (!APPEND_ONLY.has(col)) mutations.push({ col, id, op: 'del' }); base.delete(id); } });
    const ids = list.map(d => d.id).join('\n');
    if (ids !== SERVER.order[col]) { order[col] = list.map(d => d.id); SERVER.order[col] = ids; }
  });
  SYNC_META.forEach(k => { const j = JSON.stringify(S[k]); if (j !== SERVER.metaBase[k]) { meta[k] = S[k]; SERVER.metaBase[k] = j; } });
  const action = SERVER.lastAct; const args = SERVER.lastArgs || {};
  const sendAction = action && (mutations.length || SERVER_ACTIONS.has(action));
  if (!mutations.length && !Object.keys(order).length && !Object.keys(meta).length && !sendAction) return null;
  SERVER.lastAct = null; SERVER.lastArgs = null;
  return { body: { action: sendAction ? action : undefined, args: sendAction ? args : undefined, mutations, order, meta }, sent };
}
async function serverPush() {
  if (!SERVER.on || !SERVER.user || !S) return;
  if (SERVER.pushing) { SERVER.again = true; return; }
  const d = serverDiff(); if (!d) return;
  SERVER.pushing = true;
  try {
    const r = await api('POST', '/api/v1/sync', d.body);
    if (!r.ok) { toast(r.data.error || 'Changes were not saved; reloading', 'alert'); await serverLoad(); render(); return; }
    let redraw = false;
    Object.entries(r.data.remap || {}).forEach(([from, to]) => {
      S.tickets = S.tickets.filter(t => t.id !== from); SERVER.base.tickets.delete(from);
      toast(`Ticket number ${from} was taken; this complaint is ${to}`, 'ticket'); redraw = true;
      if (location.hash === '#ticket-' + from) location.hash = '#ticket-' + to;
    });
    (r.data.applied || []).forEach(c => { if (serverApply(c, d.sent)) redraw = true; });
    (r.data.rejected || []).forEach((x, i) => {
      if (i === 0) toast(x.reason, x.code === 'forbidden' ? 'lock' : 'x');
      serverApply({ col: x.col, id: x.id, op: x.current ? 'put' : 'del', data: x.current, ver: x.ver }, null, true);
      redraw = true;
    });
    if (redraw) scheduleRender(true);
  } catch (e) {
    toast('Connection problem: your last change may not be saved', 'alert');
  } finally {
    SERVER.pushing = false;
    if (SERVER.again) { SERVER.again = false; serverQueue(); }
  }
}

/* ---------- apply a change from the engine ---------- */
function serverApply(c, sent, force) {
  if (c.col === 'meta') {
    if (c.id === 'ticketSeq') S.ticketSeq = Math.max(S.ticketSeq || 0, +c.data || 0);
    else if (SYNC_META.includes(c.id)) { S[c.id] = c.data; SERVER.metaBase[c.id] = JSON.stringify(c.data); }
    return false;
  }
  if (!SYNC_COLS.includes(c.col)) return false;
  const list = S[c.col] || (S[c.col] = []);
  const base = SERVER.base[c.col]; const idx = list.findIndex(d => d.id === c.id);
  if (c.op === 'del') {
    if (idx >= 0) list.splice(idx, 1);
    base.delete(c.id); SERVER.ver[c.col].delete(c.id);
    SERVER.order[c.col] = list.map(d => d.id).join('\n');
    return idx >= 0;
  }
  const j = JSON.stringify(c.data);
  if (c.ver != null) SERVER.ver[c.col].set(c.id, c.ver);
  if (idx >= 0) {
    const local = list[idx]; const localJ = JSON.stringify(local);
    const key = c.col + '\u0001' + c.id;
    // our own change came back: keep any newer local edits; they go out in the next push
    if (!force && sent && sent[key] !== undefined && sent[key] !== localJ) { base.set(c.id, j); serverQueue(); return false; }
    base.set(c.id, j);
    if (localJ === j) return false;
    Object.keys(local).forEach(k => delete local[k]);
    Object.assign(local, JSON.parse(j));
    return true;
  }
  const doc = JSON.parse(j);
  // new item from someone else: place it the way the console lists it
  const FRONT = ['inbox', 'notifs', 'audit', 'tickets', 'watch', 'assets', 'tasks', 'negLog'];
  if (FRONT.includes(c.col)) list.unshift(doc); else list.push(doc);
  if (c.col === 'tickets') list.sort((a, b) => b.createdAt - a.createdAt);
  if (c.col === 'notifs' && list.length > 40) list.length = 40;
  base.set(c.id, j);
  SERVER.order[c.col] = list.map(d => d.id).join('\n');
  return true;
}

/* ---------- live updates ---------- */
function serverListen() {
  if (SERVER.es) SERVER.es.close();
  const es = new EventSource('/api/v1/events?client=' + encodeURIComponent(SERVER.clientId));
  SERVER.es = es;
  es.onmessage = ev => {
    let msg; try { msg = JSON.parse(ev.data); } catch (e) { return; }
    if (msg.type === 'reload') { toast(msg.text || 'The workspace was updated', 'bell'); serverLoad().then(ok => { if (ok) render(); }); return; }
    if (msg.type !== 'changes') return;
    let changed = false;
    (msg.changes || []).forEach(c => { if (serverApply(c, null, true)) changed = true; });
    if (changed) scheduleRender(false);
  };
  es.onerror = () => { /* the browser reconnects by itself */ };
}
// Don't redraw under someone's fingers: wait while they type or a dialog is open.
function isEditing() {
  if ($('#modal')) return true;
  const a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.id !== 'gsearch') return true;
  return $$('#main textarea, #drawer textarea').some(t => t.value !== t.defaultValue);
}
function scheduleRender(now) {
  SERVER.pendingRender = true;
  clearTimeout(SERVER.renderTimer);
  SERVER.renderTimer = setTimeout(() => {
    if (!SERVER.pendingRender) return;
    if (isEditing()) { renderTop(); renderNav(); return; }
    SERVER.pendingRender = false; render();
  }, now ? 0 : 250);
}
setInterval(() => { if (SERVER.on && SERVER.pendingRender && !isEditing()) { SERVER.pendingRender = false; render(); } }, 2000);

/* ---------- small helpers used by the views ---------- */
function deliveryTag(m, i) {
  if (!SERVER.on || !m.deliveries || !m.deliveries[i]) return '';
  const d = m.deliveries[i];
  if (d.status === 'sent') return ' · <span title="Delivered to the platform">✓ sent</span>';
  if (d.status === 'queued') return ' · sending…';
  if (d.status === 'manual') return ` · <span style="color:var(--warn)" title="${esc(d.error || '')}">post it in the platform</span>`;
  return ` · <span style="color:var(--crit)" title="${esc(d.error || '')}">not delivered</span>`;
}
function pubLine(p) {
  if (!p.pub) return '';
  if (p.pub.status === 'sent') return `<a href="${esc(p.pub.url)}" target="_blank" rel="noopener">${esc(p.pub.url.replace(/^https:\/\//, ''))}</a>`;
  if (p.pub.status === 'queued') return 'Publishing…';
  return `<span style="color:var(--crit)">${esc(p.pub.error || 'Not published')}</span>`;
}
