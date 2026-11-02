/* ================= UI helpers ================= */
let S;
const VIEWS = {};
const ACT = {};
const ONCHANGE = {};
const ONINPUT = {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtN = n => (n == null || isNaN(n)) ? '—' : Math.round(n).toLocaleString('en-US');
const fmtK = n => {
  if (n == null) return '—';
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.?0+$/, '') + 'M';
  if (a >= 1e3) return (n / 1e3).toFixed(a >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'K';
  return String(Math.round(n));
};
const pct = (v, d = 1) => (v == null || isNaN(v)) ? '—' : (v * 100).toFixed(d) + '%';
const rp = n => 'Rp' + Math.round(n).toLocaleString('id-ID');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9);
const DAY = 86400000;
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = n => String(n).padStart(2, '0');
const dKey = d => { d = new Date(d); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const fmtD = d => { d = new Date(d); return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; };
const fmtDY = d => { d = new Date(d); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
const fmtT = d => { d = new Date(d); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtDT = d => { d = new Date(d); return `${dKey(d)} ${fmtT(d)}`; };
const startOfDay = d => { d = new Date(d); d.setHours(0, 0, 0, 0); return d; };
const startOfWeek = d => { d = startOfDay(d); const k = (d.getDay() + 6) % 7; return new Date(d.getTime() - k * DAY); };
const rel = t => {
  const m = Math.round((Date.now() - new Date(t).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' h ago';
  return Math.floor(h / 24) + ' d ago';
};
const durMin = m => m < 60 ? `${Math.round(m)} min` : m < 1440 ? `${Math.floor(m / 60)} h ${Math.round(m % 60)} min` : `${Math.floor(m / 1440)} d`;

/* seeded PRNG */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/* ---------- icons (24px stroke) ---------- */
const IP = {
  dash: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  accounts: '<circle cx="12" cy="12" r="3"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 7l3 3M17 7l-3 3M7 17l3-3M17 17l-3-3"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  lib: '<path d="M4 5a2 2 0 0 1 2-2h4l2 3h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>',
  task: '<path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>',
  net: '<circle cx="12" cy="12" r="2.5"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="9.5"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
  care: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  ticket: '<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M13 6v12" stroke-dasharray="2 2"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  report: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21h4"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  heart: '<path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-3 4.5 4.5 0 0 1 8 3c0 6-8 11-8 11z"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><path d="M16 4a3.5 3.5 0 0 1 0 7M22 20a7 7 0 0 0-4-6.3"/>',
  img: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  video: '<rect x="3" y="5" width="13" height="14" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  megaphone: '<path d="M3 11v3a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8S10 3 7.5 4.5 9 8 12 8zM12 8s2-5 4.5-3.5S15 8 12 8z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  dots: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  hide: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6A17 17 0 0 0 2 12s4 7 10 7a9.6 9.6 0 0 0 5.4-1.6"/>',
  wand: '<path d="M15 4V2M15 10V8M11 6h2M17 6h2M4 20L14 10"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  mapPin: '<path d="M12 21s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  play: '<path d="M7 4l13 8-13 8z"/>'
};
const icon = (n, s = 16, sw = 1.8) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IP[n] || ''}</svg>`;

/* ---------- platform badges (simple glyphs) ---------- */
const PLAT = {
  instagram: { name: 'Instagram', bg: 'linear-gradient(135deg,#f9a03f,#e1306c 55%,#833ab4)', g: '<rect x="5" y="5" width="14" height="14" rx="4" fill="none" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="3.2" fill="none" stroke="#fff" stroke-width="2"/><circle cx="16.3" cy="7.7" r="1" fill="#fff"/>' },
  tiktok: { name: 'TikTok', bg: '#111', g: '<path d="M13 5v9.5a2.8 2.8 0 1 1-2.8-2.8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M13 5c.4 2.2 1.8 3.5 4 3.7" fill="none" stroke="#25f4ee" stroke-width="2" stroke-linecap="round"/>' },
  facebook: { name: 'Facebook', bg: '#1877f2', g: '<path d="M13.5 20v-6.5h2.3l.4-2.7h-2.7V9.2c0-.8.3-1.3 1.4-1.3h1.4V5.5c-.3 0-1.1-.1-2-.1-2 0-3.4 1.2-3.4 3.4v2h-2.3v2.7h2.3V20z" fill="#fff"/>' },
  x: { name: 'X', bg: '#000', g: '<path d="M6 6l12 12M18 6L6 18" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>' },
  threads: { name: 'Threads', bg: '#000', g: '<path d="M15.5 10.5c-.5-2-2-3-3.8-3-2.6 0-4.2 2-4.2 4.6s1.6 4.6 4.3 4.6c2.3 0 3.8-1.3 3.8-3.1 0-1.6-1.3-2.5-3.1-2.5-1.5 0-2.4.7-2.4 1.7 0 .9.7 1.5 1.8 1.5 1.6 0 2.4-1.2 2.4-3.6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>' },
  youtube: { name: 'YouTube', bg: '#ff0000', g: '<path d="M10 8.5v7l6-3.5z" fill="#fff"/>' },
  whatsapp: { name: 'WhatsApp', bg: '#25d366', g: '<path d="M6 18l1-3.3A6.5 6.5 0 1 1 9.4 17z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>' }
};
const plat = (p, s = 20) => { const P = PLAT[p] || { bg: '#999', g: '' }; return `<span class="plat" title="${esc(P.name || p)}" style="width:${s}px;height:${s}px;background:${P.bg};border-radius:${Math.round(s * .28)}px"><svg width="${s}" height="${s}" viewBox="0 0 24 24">${P.g}</svg></span>`; };

/* avatar */
const AV_COL = ['#2a78d6', '#6250d6', '#eb6834', '#1baf7a', '#c8102e', '#0f8a6a', '#8a5a00', '#d55181'];
const initials = n => String(n || '?').replace(/[@_.*]/g, ' ').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
const av = (name, s = 26, col) => `<span class="av" style="width:${s}px;height:${s}px;font-size:${Math.round(s * .4)}px;background:${col || AV_COL[hashStr(String(name)) % AV_COL.length]}">${esc(initials(name))}</span>`;

/* ---------- tooltip ---------- */
let tipEl;
function initTip() {
  tipEl = document.createElement('div'); tipEl.className = 'chart-tip'; document.body.appendChild(tipEl);
  document.addEventListener('mousemove', e => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t) { tipEl.style.display = 'none'; return; }
    tipEl.innerHTML = t.getAttribute('data-tip');
    tipEl.style.display = 'block';
    const r = tipEl.getBoundingClientRect();
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
    if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
    tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
  });
}

/* ---------- charts ---------- */
function hbars(rows, o = {}) {
  const max = o.max || Math.max(1, ...rows.map(r => r.value));
  const fmt = o.fmt || fmtN;
  return `<div class="hbars">${rows.map(r => `<div class="hbar" data-tip="${esc(r.label)}: <b>${esc(fmt(r.value))}</b>${r.tip ? '<br>' + esc(r.tip) : ''}"><span class="lab">${r.html || esc(r.label)}</span><span class="trk"><i style="width:${(r.value / max * 100).toFixed(1)}%;${r.color ? 'background:' + r.color : (o.color ? 'background:' + o.color : '')}"></i></span><span class="val">${esc(fmt(r.value))}</span></div>`).join('')}</div>`;
}
function donut(segs, o = {}) {
  const size = o.size || 150, r = size / 2 - 12, c = size / 2, sw = o.sw || 22;
  const tot = segs.reduce((a, s) => a + s.value, 0) || 1;
  let a0 = -Math.PI / 2; const gap = 0.025;
  const arcs = segs.map(s => {
    const frac = s.value / tot; const a1 = a0 + frac * Math.PI * 2;
    const st = a0 + (frac > 0.03 ? gap : 0), en = a1 - (frac > 0.03 ? gap : 0);
    const large = en - st > Math.PI ? 1 : 0;
    const p = frac <= 0 ? '' : frac >= 0.999 ? `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${sw}"/>` :
      `<path d="M${c + r * Math.cos(st)},${c + r * Math.sin(st)} A${r},${r} 0 ${large} 1 ${c + r * Math.cos(en)},${c + r * Math.sin(en)}" fill="none" stroke="${s.color}" stroke-width="${sw}" data-tip="${esc(s.label)}: <b>${(frac * 100).toFixed(1)}%</b> (${fmtN(s.value)})"/>`;
    a0 = a1; return p;
  }).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(o.label || 'donut chart')}">${arcs}<text x="${c}" y="${c - 2}" text-anchor="middle" font-size="22" font-weight="750" fill="var(--ink)">${esc(o.center || '')}</text><text x="${c}" y="${c + 16}" text-anchor="middle" font-size="11" fill="var(--muted)">${esc(o.sub || '')}</text></svg>`;
}
function lineChart(series, o = {}) {
  // series: [{name,color,values:[..]}], labels: o.labels
  const W = o.w || 560, H = o.h || 180, pl = 40, pr = 12, pt = 10, pb = 24;
  const all = series.flatMap(s => s.values); const max = (o.max || Math.max(...all, 1)) * 1.12;
  const n = o.labels.length; const x = i => pl + (W - pl - pr) * (n === 1 ? 0.5 : i / (n - 1)); const y = v => pt + (H - pt - pb) * (1 - v / max);
  const ticks = 4; let grid = '';
  for (let i = 0; i <= ticks; i++) { const v = max / 1.12 * i / ticks; grid += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="#e1e0d9" stroke-width="1"/><text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="var(--muted)">${esc((o.fmt || fmtK)(v))}</text>`; }
  const step = Math.ceil(n / 7);
  const xl = o.labels.map((l, i) => i % step === 0 || i === n - 1 ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" font-size="10" fill="var(--muted)">${esc(l)}</text>` : '').join('');
  const paths = series.map(s => {
    const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
    const area = o.area ? `<path d="${d}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z" fill="${s.color}" opacity=".10"/>` : '';
    const last = s.values.length - 1;
    return `${area}<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"/><circle cx="${x(last)}" cy="${y(s.values[last])}" r="4" fill="${s.color}" stroke="#fff" stroke-width="2"/>`;
  }).join('');
  const hits = o.labels.map((l, i) => `<rect x="${x(i) - (W - pl - pr) / n / 2}" y="${pt}" width="${(W - pl - pr) / n}" height="${H - pt - pb}" fill="transparent" data-tip="<b>${esc(l)}</b><br>${series.map(s => esc(s.name) + ': ' + esc((o.fmt || fmtN)(s.values[i]))).join('<br>')}"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(o.label || 'line chart')}" style="max-height:${H + 20}px">${grid}<line x1="${pl}" x2="${W - pr}" y1="${y(0)}" y2="${y(0)}" stroke="#c3c2b7"/>${xl}${paths}${hits}</svg>`;
}
function funnel(stages) {
  const ramp = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'];
  const max = stages[0].value || 1;
  return `<div class="stack">${stages.map((s, i) => `<div data-tip="${esc(s.label)}: <b>${fmtN(s.value)}</b>${i ? '<br>' + pct(s.value / stages[i - 1].value) + ' of previous stage' : ''}"><div class="row between small"><span class="ink2">${esc(s.label)}</span><b class="num">${fmtK(s.value)}</b></div><div style="height:16px;margin-top:3px;border-radius:0 4px 4px 0;width:${Math.max(2, Math.sqrt(s.value / max) * 100).toFixed(1)}%;background:${ramp[i % ramp.length]}"></div></div>`).join('')}</div><div class="note">Bar length uses a square-root scale so small stages stay visible; exact values are labelled.</div>`;
}

/* ---------- modal & toast ---------- */
function openModal(title, body, foot = '', cls = '') {
  closeModal();
  const o = document.createElement('div'); o.className = 'overlay'; o.id = 'modal';
  o.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="mh"><h3>${title}</h3><button class="iconbtn" data-act="close-modal" aria-label="Close">${icon('x')}</button></div><div class="mb">${body}</div>${foot ? `<div class="mf">${foot}</div>` : ''}</div>`;
  o.addEventListener('mousedown', e => { if (e.target === o) closeModal(); });
  document.body.appendChild(o);
  const f = o.querySelector('input,textarea,select'); if (f) setTimeout(() => f.focus(), 30);
}
function closeModal() { const m = $('#modal'); if (m) m.remove(); }
function toast(msg, ic = 'check') {
  let w = $('.toasts'); if (!w) { w = document.createElement('div'); w.className = 'toasts'; document.body.appendChild(w); }
  while (w.children.length >= 3) w.firstChild.remove();
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = `${icon(ic, 15)}<span>${msg}</span>`; w.appendChild(t);
  setTimeout(() => t.remove(), 4200);
}
async function copyText(txt) {
  try { await navigator.clipboard.writeText(txt); toast('Copied to clipboard'); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('Copied to clipboard'); } catch (e2) { toast('Copy was blocked by the browser. Select the text and copy it manually.', 'alert'); }
    ta.remove();
  }
}
