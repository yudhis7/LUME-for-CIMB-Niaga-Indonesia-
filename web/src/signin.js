/* ================= Sign-in (CIMB Niaga desktop edition) =================
   Active only when the build sets EDITION.signin. The pilot sign-in decides which team
   view a person gets; it is checked on this device and is not connected to CIMB Niaga's
   directory. Production sign-in uses CIMB Niaga's single sign-on (set up with IT & InfoSec). */
const PILOT_PASSWORD = 'lume2026';
const PILOT_ACCOUNTS = [
  { uid: 'dewi.anggraini', role: 'brand' },
  { uid: 'agus.firmansyah', role: 'care' },
  { uid: 'maria.tambunan', role: 'compliance' },
  { uid: 'fikri.ramadhan', role: 'km' },
  { uid: 'sinta.maharani', role: 'hr' },
  { uid: 'hasan.lubis', role: 'syariah' },
  { uid: 'whale.admin', role: 'brand', admin: true, name: 'Whale pilot admin', title: 'All roles (demo)' }
].map(a => ({ ...a, name: a.name || ROLES[a.role].user, title: a.title || ROLES[a.role].name }));
const SESSION_KEY = 'lume-cimb-session-v1';
const SESSION_DAYS = 7;
let SESSION = null;
const signinState = { fails: 0, lockUntil: 0, timer: null };

function readSession() {
  const parse = raw => { try { const s = JSON.parse(raw); return s && s.uid && (!s.exp || s.exp > Date.now()) ? s : null; } catch (e) { return null; } };
  let s = null;
  try { s = parse(sessionStorage.getItem(SESSION_KEY)); } catch (e) { }
  if (!s) { try { s = parse(localStorage.getItem(SESSION_KEY)); } catch (e) { } }
  return s && PILOT_ACCOUNTS.some(a => a.uid === s.uid) ? s : null;
}
function writeSession(uid, remember) {
  const s = { uid, at: Date.now(), exp: remember ? Date.now() + SESSION_DAYS * DAY : 0 };
  try { (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) { }
  return s;
}
function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { }
  try { localStorage.removeItem(SESSION_KEY); } catch (e) { }
}
const sessionAccount = () => SESSION ? PILOT_ACCOUNTS.find(a => a.uid === SESSION.uid) : null;
const isAdmin = () => !EDITION.signin || !!(sessionAccount() || {}).admin;
function applySessionRole() {
  const a = sessionAccount();
  if (a && !a.admin) S.role = a.role;
  else if (a && a.admin && !ROLES[S.role]) S.role = 'brand';
}

/* ---------- screen ---------- */
function signinArt() {
  // official accounts at the centre, rings of employees, community and creators (decorative)
  const ring = (r, n, col, rot, rad) => [...Array(n)].map((_, i) => { const a = i / n * Math.PI * 2 + rot; return `<circle cx="${(180 + r * Math.cos(a)).toFixed(1)}" cy="${(120 + r * Math.sin(a) * 0.55).toFixed(1)}" r="${rad}" fill="${col}"/>`; }).join('');
  return `<svg class="si-art" viewBox="0 0 360 240" aria-hidden="true">
    ${[60, 95, 130].map(r => `<ellipse cx="180" cy="120" rx="${r}" ry="${(r * 0.55).toFixed(1)}" fill="none" stroke="#e8d6d7" stroke-dasharray="3 5"/>`).join('')}
    ${ring(60, 10, '#790007', 0.2, 3.5)}${ring(95, 14, '#ed1c24', 0.5, 3.5)}${ring(130, 8, '#b9a3a4', 0.1, 5)}
    <image href="${EDITION.symbol}" x="155" y="95" width="50" height="50"/>
  </svg>`;
}
function showSignin(message) {
  document.querySelector('.app').style.display = 'none';
  const old = $('#signin'); if (old) old.remove();
  const root = document.createElement('div');
  root.id = 'signin'; root.className = 'si';
  const lastUid = (() => { try { return localStorage.getItem(SESSION_KEY + '-last') || ''; } catch (e) { return ''; } })();
  root.innerHTML = `
  <div class="si-card" role="main">
    <section class="si-brand">
      <img class="si-logo" src="${EDITION.logo}" alt="CIMB Niaga">
      <div class="si-co"><span>×</span><b class="lume">Lume</b><small>by Whale</small></div>
      <h1>Social media hub for CIMB Niaga</h1>
      <p>Plan, publish, listen and resolve across every CIMB Niaga account, with compliance built in.</p>
      <ul class="si-points">
        <li>${icon('accounts', 16)}One console for official and affiliated accounts</li>
        <li>${icon('net', 16)}Employee, community and creator voice network</li>
        <li>${icon('ticket', 16)}AI care desk with the OJK ticket clock</li>
        <li>${icon('shield', 16)}POJK 6/2026 check on every post and reply</li>
      </ul>
      ${signinArt()}
      <div class="si-foot">Pilot workspace · PT Bank CIMB Niaga Tbk</div>
    </section>
    <section class="si-form-wrap">
      <form class="si-form" id="si-form" autocomplete="off" novalidate>
        <h2>Sign in</h2>
        <p class="muted small" style="margin:2px 0 16px">Use your pilot account.</p>
        <label class="fl" for="si-uid">User ID
          <input class="input" id="si-uid" name="uid" value="${esc(lastUid)}" placeholder="e.g. dewi.anggraini" autocapitalize="off" spellcheck="false" autocomplete="username">
        </label>
        <label class="fl mt12" for="si-pw">Password
          <span class="si-pw"><input class="input" id="si-pw" name="pw" type="password" placeholder="Password" autocomplete="current-password"><button type="button" class="iconbtn" id="si-eye" aria-label="Show password">${icon('eye', 16)}</button></span>
        </label>
        <div class="si-caps small" id="si-caps" hidden>${icon('alert', 13)}Caps Lock is on</div>
        <label class="si-remember small"><input type="checkbox" id="si-remember"> Keep me signed in on this device for ${SESSION_DAYS} days</label>
        <div class="si-msg small" id="si-msg" role="alert">${message ? esc(message) : ''}</div>
        <button class="si-submit" id="si-submit" type="submit">Sign in</button>
        <div class="si-sso small muted">${icon('lock', 13)}In production, Lume uses CIMB Niaga single sign-on, set up with IT &amp; InfoSec.</div>
      </form>
      <div class="si-pilot">
        <div class="row between"><b class="small">Pilot accounts</b><span class="tiny muted">password <code>${PILOT_PASSWORD}</code></span></div>
        <div class="si-accts">${PILOT_ACCOUNTS.map(a => `<button type="button" class="si-acct" data-uid="${a.uid}">${av(a.name, 26, a.admin ? '#1668e3' : '#790007')}<span><b>${esc(a.name)}</b><small>${esc(a.title)}</small></span></button>`).join('')}</div>
      </div>
      <p class="si-warn tiny">${icon('shield', 12)}Sign-in is checked on this device only. Never enter your OCTO, internet banking or email password here.</p>
    </section>
  </div>`;
  document.body.appendChild(root);
  document.title = 'Sign in · Lume · CIMB Niaga';
  const uid = $('#si-uid'), pw = $('#si-pw');
  (uid.value ? pw : uid).focus();
  $('#si-eye').addEventListener('click', () => { const show = pw.type === 'password'; pw.type = show ? 'text' : 'password'; $('#si-eye').setAttribute('aria-label', show ? 'Hide password' : 'Show password'); pw.focus(); });
  const caps = e => { if (e.getModifierState) $('#si-caps').hidden = !e.getModifierState('CapsLock'); };
  pw.addEventListener('keydown', caps); pw.addEventListener('keyup', caps);
  root.querySelectorAll('.si-acct').forEach(b => {
    b.addEventListener('click', () => { uid.value = b.dataset.uid; pw.value = PILOT_PASSWORD; $('#si-msg').textContent = ''; $('#si-submit').focus(); });
    b.addEventListener('dblclick', () => { uid.value = b.dataset.uid; pw.value = PILOT_PASSWORD; trySignin(); });
  });
  $('#si-form').addEventListener('submit', e => { e.preventDefault(); trySignin(); });
  updateLock();
}
function updateLock() {
  const btn = $('#si-submit'); if (!btn) return;
  const left = Math.ceil((signinState.lockUntil - Date.now()) / 1000);
  clearTimeout(signinState.timer);
  if (left > 0) {
    btn.disabled = true; btn.textContent = `Try again in ${left} s`;
    $('#si-msg').textContent = 'Too many wrong attempts. Sign-in is paused for a moment.';
    signinState.timer = setTimeout(updateLock, 1000);
  } else { btn.disabled = false; btn.textContent = 'Sign in'; }
}
function trySignin() {
  if (Date.now() < signinState.lockUntil) return;
  const raw = $('#si-uid').value.trim().toLowerCase();
  const uid = raw.split('@')[0];
  const pw = $('#si-pw').value;
  const msg = $('#si-msg');
  if (!uid || !pw) { msg.textContent = 'Enter your user ID and password.'; (uid ? $('#si-pw') : $('#si-uid')).focus(); return; }
  const acct = PILOT_ACCOUNTS.find(a => a.uid === uid);
  if (!acct || pw !== PILOT_PASSWORD) {
    signinState.fails++;
    if (signinState.fails >= 5) { signinState.lockUntil = Date.now() + 30000; signinState.fails = 0; updateLock(); }
    else msg.textContent = `User ID or password is not right. ${5 - signinState.fails} attempt${5 - signinState.fails === 1 ? '' : 's'} left before a short pause.`;
    $('#si-pw').select();
    return;
  }
  signinState.fails = 0;
  SESSION = writeSession(acct.uid, $('#si-remember').checked);
  try { localStorage.setItem(SESSION_KEY + '-last', acct.uid); } catch (e) { }
  enterApp(true);
}
function enterApp(fresh) {
  const a = sessionAccount();
  const si = $('#signin'); if (si) si.remove();
  document.querySelector('.app').style.display = '';
  if (fresh && a.admin) S.role = 'brand';
  applySessionRole();
  if (fresh) {
    S.ui.drawer = false; document.body.classList.remove('has-drawer');
    if (!location.hash || location.hash === '#') location.hash = '#command';
  }
  render();
  if (fresh) toast(`Signed in as ${a.name} · ${a.admin ? 'all roles' : ROLES[a.role].name}`, 'user');
}
function signOut() {
  clearSession(); SESSION = null; closePops();
  S.ui.drawer = false; document.body.classList.remove('has-drawer'); save();
  showSignin('You have signed out.');
}

/* ---------- user menu (top bar) ---------- */
function userMenuHTML() {
  const a = sessionAccount(); if (!a) return '';
  return `<button class="si-user" data-act="user-menu" aria-label="Account">${av(a.admin ? ROLES[S.role].user : a.name, 28, a.admin ? '#1668e3' : '#790007')}<span><b>${esc(a.admin ? ROLES[S.role].user : a.name)}</b><small>${esc(ROLES[S.role].short)}${a.admin ? ' · admin' : ''}</small></span></button>`;
}
ACT['user-menu'] = () => {
  if ($('.popover')) { closePops(); return; }
  const a = sessionAccount();
  const p = document.createElement('div'); p.className = 'popover'; p.style.width = '300px';
  p.innerHTML = `<div style="padding:14px;display:grid;gap:4px;border-bottom:1px solid var(--line)"><div class="row">${av(a.name, 36, a.admin ? '#1668e3' : '#790007')}<div><b>${esc(a.name)}</b><div class="tiny muted">${esc(a.uid)}</div></div></div>
    <div class="small mt8"><span class="muted">Team</span> ${esc(a.admin ? 'All roles (Whale pilot admin)' : ROLES[a.role].name)}</div>
    <div class="small"><span class="muted">Signed in</span> ${fmtDT(SESSION.at)}${SESSION.exp ? ' · remembered on this device' : ''}</div></div>
    ${a.admin ? '<div class="small muted" style="padding:10px 14px;border-bottom:1px solid var(--line)">Admin: use the Role switcher to view each team.</div>' : ''}
    <div class="it" data-act="sign-out">${icon('back', 16)}<b>Sign out</b></div>`;
  $('#topbar').appendChild(p);
};
ACT['sign-out'] = () => signOut();
