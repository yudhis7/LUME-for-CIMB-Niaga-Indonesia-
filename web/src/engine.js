/* ================= Engine: triage, masking, compliance, OJK clock ================= */

/* ---------- PII masking ---------- */
const OFFICIAL_NUMS = ['081197814041', '6281197814041', '14041'];
const isOfficialNum = m => OFFICIAL_NUMS.includes(String(m).replace(/\D/g, ''));
function maskPII(text) {
  let found = [];
  let t = String(text || '');
  // card numbers (13-19 digits, spaces/dashes allowed)
  t = t.replace(/\b\d(?:[ -]?\d){12,18}\b/g, m => { const d = m.replace(/\D/g, ''); if (d.length >= 13 && d.length <= 19) { const kind = d.length === 16 && /^(3|4|5|6)/.test(d) && /[ -]/.test(m) ? 'card' : d.length === 16 ? 'NIK/card' : 'number'; found.push(kind); return `[${kind === 'number' ? 'nomor' : kind === 'card' ? 'kartu' : 'NIK/kartu'} ••••${d.slice(-4)}]`; } return m; });
  // phone numbers
  t = t.replace(/(\+62|62|0)8\d{1,3}[ -]?\d{3,4}[ -]?\d{3,5}/g, m => { if (isOfficialNum(m)) return m; found.push('phone'); return `[no. HP ••••${m.replace(/\D/g, '').slice(-3)}]`; });
  // account numbers 8-12 digits
  t = t.replace(/\b\d{8,12}\b/g, m => { found.push('account'); return `[rekening ••••${m.slice(-4)}]`; });
  // emails
  t = t.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, m => { found.push('email'); return '[email ••••]'; });
  // OTP-like codes after the word OTP/kode
  t = t.replace(/((?:otp|kode)\s*(?:saya|nya)?\s*:?\s*)(\d{4,6})\b/gi, (m, a, b) => { found.push('OTP'); return a + '[••••••]'; });
  return { text: t, found: [...new Set(found)] };
}
const maskHandle = h => { const s = String(h || ''); if (s.includes('***')) return s; const b = s.replace('@', ''); return '@' + b.slice(0, 2) + '***' + b.slice(-2); };

/* ---------- triage classifier (Alivia rules; Bahasa + English) ---------- */
const LEX = {
  spam: [/bit\.ly|s\.id\/|tinyurl|wa\.me|t\.me\//i, /pinjaman (cepat|kilat|online)|tanpa bi checking|giveaway|hadiah gratis|follow akun ini|dm nomor kartu|bantuan .*24 jam/i],
  fraud: /\botp\b|\bpin\b|kode verifikasi|minta kode|ngaku(?:-ngaku)? dari|mengaku dari|akun cs|cs palsu|penipu|penipuan|scam|phising|phishing|hadiah undian|link palsu|apk palsu|minta password/i,
  crisis: /viral|down dari|semua nasabah|banyak nasabah|wartawan|media|boikot|lapor (?:polisi|ojk)|ombudsman|thread:|rt \d|retweet/i,
  complaint: /gagal|terpotong|kepotong|terdebet|belum (?:masuk|kembali|cair)|tidak bisa|gak bisa|nggak bisa|ga bisa|gak masuk|error|kecewa|lambat|lama banget|diblokir|terblokir|tolong dicek|mohon dibantu|komplain|antri|antrian|biaya admin|naik ya|susah dihubungi|crash|kendala/i,
  question: /\?|gimana|bagaimana|cara |apakah|ada promo|berapa|kapan|bisa ga|bisa gak|boleh tanya|ada lowongan|info dong/i,
  praise: /makasih|terima kasih|thanks|keren|mantap|cepat banget|seru|suka banget|the best|membantu|puas|ramah|relate|bagus|top banget|love/i
};
const POS_W = /makasih|terima kasih|keren|mantap|cepat|seru|suka|the best|membantu|puas|ramah|sabar|relate|bagus|top|love|boleh banget|senang/gi;
const NEG_W = /gagal|terpotong|kepotong|terdebet|belum|tidak bisa|gak bisa|error|kecewa|lambat|lama|diblokir|susah|penipu|down|parah banget|kesal|marah|naik|crash|kendala/gi;
function detectProduct(t) {
  t = t.toLowerCase();
  if (/kpr|rumah/.test(t)) return 'KPR';
  if (/syariah|\bib\b|wakaf|tabungan ib/.test(t)) return 'Syariah iB';
  if (/kartu kredit|kartu|limit|tagihan|octo card/.test(t)) return 'OCTO Card';
  if (/reksa ?dana|investasi/.test(t)) return 'Reksa dana';
  if (/kejar mimpi|fest|octo land|octo arena|padel/.test(t)) return 'Kejar Mimpi';
  if (/lowongan|kerja di|karier|karir|rm\?/.test(t)) return 'Employer brand';
  if (/cabang|antri|teller/.test(t)) return 'Branch';
  if (/biaya admin|admin bulanan|saldo|tabungan/.test(t) && !/transfer/.test(t)) return 'Tabungan';
  if (/octo|transfer|login|aplikasi|app|rekening/.test(t)) return 'OCTO';
  return 'General';
}
function detectTheme(t) {
  t = t.toLowerCase();
  if (/login|otp.*(masuk|terus)|sms/.test(t)) return 'OCTO login / OTP';
  if (/transfer|terdebet|belum masuk|terpotong/.test(t)) return 'Transfer delayed';
  if (/diblokir|terblokir|blokir/.test(t)) return 'Card blocked';
  if (/biaya|admin|potongan|kepotong/.test(t)) return 'Fees and charges';
  if (/antri|antrian|cabang/.test(t)) return 'Branch queue';
  if (/error|crash|down/.test(t)) return 'App error';
  if (/limit/.test(t)) return 'Card limit';
  if (/kpr/.test(t)) return 'KPR process';
  return 'Other';
}
function classify(raw, meta = {}) {
  const t = String(raw || '');
  const why = [];
  let type;
  const impersonation = meta.handle && /cimb|octo/i.test(meta.handle) && !/^@?(cimb_niaga|cimb\.niaga|CIMBNiaga|CIMBIndonesia|kejarmimpi\.id|hycimbniaga|cimbniaga_syariah)$/i.test(meta.handle.replace('@', ''));
  if (impersonation || (LEX.spam[0].test(t) && /pinjaman|hadiah gratis|giveaway|cair/i.test(t)) || LEX.spam[1].test(t)) { type = 'Spam'; why.push(impersonation ? 'handle imitates CIMB Niaga' : 'promo link / loan bait'); }
  else if (LEX.fraud.test(t)) { type = 'Fraud risk'; why.push('security keywords (OTP / PIN / impersonation)'); }
  else if (LEX.crisis.test(t) || (meta.shares || 0) >= 500) { type = 'Crisis or viral'; why.push(meta.shares ? `${fmtN(meta.shares)} reposts` : 'spread / media keywords'); }
  else if (LEX.complaint.test(t)) { type = 'Complaint'; why.push('problem keywords'); }
  else if (LEX.praise.test(t) && !/\?/.test(t)) { type = 'Praise'; why.push('praise keywords'); }
  else if (LEX.question.test(t)) { type = 'Question'; why.push('question pattern'); }
  else if (LEX.praise.test(t)) { type = 'Praise'; why.push('praise keywords'); }
  else { type = 'Question'; why.push('no strong signal; treated as a question'); }
  const pos = (t.match(POS_W) || []).length, neg = (t.match(NEG_W) || []).length;
  let sentiment = pos > neg ? 'positive' : neg > pos ? 'negative' : 'neutral';
  if (type === 'Complaint' || type === 'Crisis or viral') sentiment = 'negative';
  if (type === 'Praise') sentiment = 'positive';
  if (type === 'Fraud risk' || type === 'Spam') sentiment = neg ? 'negative' : 'neutral';
  const product = detectProduct(t);
  const money = /saldo|transfer|terpotong|terdebet|rp ?\d|dana/i.test(t);
  const urgency = (type === 'Fraud risk' || type === 'Crisis or viral') ? 'urgent' : type === 'Complaint' ? (money || /hari|blokir/i.test(t) ? 'high' : 'medium') : type === 'Question' ? 'normal' : 'low';
  const theme = type === 'Complaint' || type === 'Crisis or viral' ? detectTheme(t) : null;
  const conf = Math.min(0.98, 0.72 + why.length * 0.08 + (pos + neg) * 0.03);
  return { type, sentiment, product, urgency, theme, conf, why };
}
function slaDue(item) {
  const m = TYPE_META[item.ai.type];
  if (m.sla === 'same') { const d = new Date(item.at); d.setHours(23, 59, 0, 0); return d.getTime(); }
  return item.at + m.sla * 60000;
}
function prepInbox(item) {
  const mk = maskPII(item.raw);
  item.text = mk.text; item.pii = mk.found;
  item.ai = classify(item.raw, item);
  item.due = slaDue(item);
  return item;
}

/* ---------- compliance check ---------- */
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function wordRe(w) { return /^[#\w]/.test(w) && /\w$/.test(w) ? new RegExp('(^|[^\\w#])(' + reEsc(w) + ')(?=$|[^\\w])', 'gi') : new RegExp('()(' + reEsc(w) + ')', 'gi'); }
function findWords(text, words) {
  const hits = [];
  (words || []).forEach(w => { const re = wordRe(w); let m; while ((m = re.exec(text))) { hits.push({ i: m.index + m[1].length, len: m[2].length, w: m[2] }); if (re.lastIndex === m.index) re.lastIndex++; } });
  return hits;
}
/* ctx: {paid, disclosure, product, kind:'caption'|'reply'|'asset', imageFlags:[]} */
function checkCompliance(text, ctx = {}) {
  const t = String(text || '');
  const R = Object.fromEntries(S.rules.map(r => [r.id, r]));
  const prod = PRODUCTS[ctx.product] || null;
  const res = []; const marks = [];
  const add = (id, ok, detail, hits = [], fix = null) => { const r = R[id]; if (!r || !r.on) return; res.push({ id, name: r.name, ok, detail, fix, sev: r.sev }); hits.forEach(h => marks.push({ ...h, rule: r.name })); };
  // guaranteed returns
  { const h = findWords(t, R.guarantee.words).filter(x => !/(tidak|bukan|tak|tanpa)\s+$/i.test(t.slice(Math.max(0, x.i - 9), x.i))).filter((x, i, arr) => !arr.some((y, j) => j !== i && y.i <= x.i && y.i + y.len >= x.i + x.len && y.len > x.len));
    const pctClaim = prod && prod.risk === 'investment' ? [...t.matchAll(/\d+(?:[.,]\d+)?\s?%\s?(?:per tahun|p\.?a\.?|setahun)?/gi)].map(m => ({ i: m.index, len: m[0].length, w: m[0] })) : [];
    const hits = [...h, ...pctClaim];
    add('guarantee', !hits.length, hits.length ? `Flagged: ${[...new Set(hits.map(x => '“' + x.w + '”'))].join(', ')}` : 'No guaranteed-return language', hits, hits.length ? 'remove-guarantee' : null); }
  // disclosure
  if (ctx.paid || ctx.disclosure) {
    const has = findWords(t, R.disclosure.words).length > 0;
    add('disclosure', has, has ? 'Disclosure tag present' : (ctx.paid ? 'Paid task without #iklan or partnership label' : 'Rewarded task needs #iklan'), [], has ? null : 'add-iklan');
  } else add('disclosure', true, 'Not a paid task · tag not required');
  // risk warning
  if (prod && prod.risk) {
    const rw = RISK_WORDING[prod.risk];
    const has = rw.detect.some(d => t.toLowerCase().includes(d));
    add('risk', has, has ? `${rw.label} risk wording present` : `${rw.label} post with no risk wording`, [], has ? null : 'add-risk');
  } else add('risk', true, 'Risk warning · not needed');
  // product facts
  if (prod && prod.facts) {
    const f = prod.facts; const issues = []; const hits = [];
    if (f.rates) [...t.matchAll(/(\d+(?:[.,]\d+)?)\s?%/g)].forEach(m => { const v = parseFloat(m[1].replace(',', '.')); if (prod.risk === 'investment') return; if (!f.rates.includes(v)) { issues.push(`${m[0]} not on the product sheet`); hits.push({ i: m.index, len: m[0].length, w: m[0] }); } });
    if (f.tenors) [...t.matchAll(/(\d+)\s?bulan/gi)].forEach(m => { const v = +m[1]; if (!f.tenors.includes(v)) { issues.push(`tenor ${m[0]} not offered`); hits.push({ i: m.index, len: m[0].length, w: m[0] }); } });
    [...t.matchAll(/(?:sampai|hingga|s\.?d\.?)\s(\d+)\s?bulan/gi)].forEach(m => { if (f.tenors && !f.tenors.includes(+m[1])) { /* already flagged */ } });
    add('facts', !issues.length, issues.length ? issues.join('; ') + ` (sheet: ${prod.sheet})` : (Object.keys(f).length ? 'Matches the product sheet' : 'No product facts to check'), hits);
  } else add('facts', true, 'No product tag · nothing to compare');
  // personal & security data
  { const mk = maskPII(t); const hits = [];
    const ask = [...t.matchAll(/(kirim(?:kan)?|sebutkan|berikan|bagikan|dm(?:kan)?|minta)\s+(?:kode\s+)?(otp|pin|password|nomor kartu|no\.? kartu|cvv|nomor rekening)/gi)].filter(m => !/jangan\s+$/i.test(t.slice(Math.max(0, m.index - 8), m.index)) && !/tidak pernah\s+$/i.test(t.slice(Math.max(0, m.index - 14), m.index)));
    ask.forEach(m => hits.push({ i: m.index, len: m[0].length, w: m[0] }));
    [...t.matchAll(/\b\d(?:[ -]?\d){7,18}\b/g)].filter(m => !isOfficialNum(m[0])).forEach(m => hits.push({ i: m.index, len: m[0].length, w: m[0] }));
    const img = (ctx.imageFlags || []);
    const bad = mk.found.length || ask.length || img.length;
    add('pii', !bad, bad ? [mk.found.length ? 'Personal data in text: ' + mk.found.join(', ') : '', ask.length ? 'Asks for security data' : '', img.length ? 'Image: ' + img.join(', ') : ''].filter(Boolean).join(' · ') : 'No personal or security data', hits, mk.found.length ? 'mask-pii' : null); }
  // comparison
  { const hits = findWords(t, R.compare.words); add('compare', !hits.length, hits.length ? `Flagged: ${[...new Set(hits.map(x => '“' + x.w + '”'))].join(', ')}` : 'No unsupported comparison', hits, hits.length ? 'remove-compare' : null); }
  // tone
  { const hits = findWords(t, R.tone.words); add('tone', !hits.length, hits.length ? `Flagged: ${[...new Set(hits.map(x => '“' + x.w + '”'))].join(', ')}` : 'On-brand tone', hits); }
  const blocking = res.filter(r => !r.ok && r.sev === 'block');
  const warn = res.filter(r => !r.ok && r.sev !== 'block');
  let verdict = 'ready';
  if (blocking.length) verdict = 'blocked';
  else if (R.route.on && prod && prod.risk && ctx.kind !== 'reply') verdict = 'route';
  return { res, marks, verdict, blocking, warn, fixable: res.some(r => !r.ok && r.fix) };
}
function highlight(text, marks) {
  const t = String(text || '');
  if (!marks.length) return esc(t);
  const ms = [...marks].sort((a, b) => a.i - b.i);
  let out = '', p = 0;
  ms.forEach(m => { if (m.i < p) return; out += esc(t.slice(p, m.i)) + `<mark class="flag" title="${esc(m.rule)}">${esc(t.slice(m.i, m.i + m.len))}</mark>`; p = m.i + m.len; });
  return out + esc(t.slice(p));
}
function autoFix(text, ctx = {}) {
  let t = String(text || '');
  const R = Object.fromEntries(S.rules.map(r => [r.id, r]));
  const prod = PRODUCTS[ctx.product];
  const swaps = { 'pasti untung': 'berpotensi memberi imbal hasil', 'dijamin aman': 'dikelola secara hati-hati', 'dijamin untung': 'berpotensi memberi imbal hasil', 'bunga pasti': 'bunga kompetitif', 'tanpa risiko': '', 'bebas risiko': '', 'anti rugi': '', 'pasti cuan': 'berpotensi', 'auto cuan': '', '100% aman': 'aman', 'untung terus': '', 'return pasti': 'potensi imbal hasil', 'pasti kaya': '', 'dijamin': '' };
  R.guarantee.words.forEach(w => { t = t.replace(wordRe(w), (m, a) => a + (swaps[w.toLowerCase()] ?? '')); });
  if (prod && prod.risk === 'investment') t = t.replace(/\s?\d+(?:[.,]\d+)?\s?%\s?(?:per tahun|p\.?a\.?|setahun)?/gi, '');
  R.compare.words.forEach(w => { t = t.replace(wordRe(w), (m, a) => a + ''); });
  t = maskPII(t).text;
  t = t.replace(/[ \t]{2,}/g, ' ').replace(/\s+([,.!])/g, '$1').replace(/,\s*,/g, ',').trim();
  if (prod && prod.facts && prod.facts.tenors) t = t.replace(/(\d+)\s?bulan/gi, (m, v) => prod.facts.tenors.includes(+v) ? m : Math.max(...prod.facts.tenors.filter(x => x <= +v).concat([prod.facts.tenors[0]])) + ' bulan');
  if (prod && prod.facts && prod.facts.rates && prod.facts.rates.length && prod.risk !== 'investment') t = t.replace(/(\d+(?:[.,]\d+)?)\s?%/g, (m, v) => prod.facts.rates.includes(parseFloat(v.replace(',', '.'))) ? m : String(prod.facts.rates[0]).replace('.', ',') + '%');
  if (prod && prod.risk && !RISK_WORDING[prod.risk].detect.some(d => t.toLowerCase().includes(d))) t += '\n\n' + RISK_WORDING[prod.risk].text;
  if ((ctx.paid || ctx.disclosure) && !findWords(t, R.disclosure.words).length) t += ' #iklan';
  return t;
}
function logAudit(src, text, chk, by) {
  S.audit.unshift({ id: uid('au'), at: Date.now(), src, text: String(text).slice(0, 220), result: chk.verdict === 'ready' ? 'Ready' : chk.verdict === 'route' ? 'Sent to Compliance' : 'Blocked', issues: chk.res.filter(r => !r.ok).map(r => r.name), by: by || ROLES[S.role].user, ver: 1 });
  if (S.audit.length > 400) S.audit.length = 400;
}

/* ---------- OJK working-day clock (POJK 22/2023) ---------- */
function isWorkday(d) { d = new Date(d); const w = d.getDay(); return w !== 0 && w !== 6 && !HOLIDAYS.includes(dKey(d)); }
function addWorkdays(ts, n) { let d = startOfDay(ts); let c = 0; while (c < n) { d = new Date(d.getTime() + DAY); if (isWorkday(d)) c++; } d.setHours(23, 59, 0, 0); return d.getTime(); }
function workdaysBetween(a, b) { let d = startOfDay(a), end = startOfDay(b), c = 0; while (d < end) { d = new Date(d.getTime() + DAY); if (isWorkday(d)) c++; } return c; }
function deadlineOf(t) { return t.docsAt ? addWorkdays(t.docsAt, t.extended ? 20 : 10) : null; }
function clockOf(t) {
  if (!t.docsAt) return { state: 'nodocs', used: 0, total: 10, label: 'Clock starts when documents are complete', left: null };
  const total = t.extended ? 20 : 10;
  const endTs = t.closedAt || Date.now();
  const used = Math.min(total + 5, workdaysBetween(t.docsAt, endTs));
  const dl = deadlineOf(t);
  const left = total - used;
  const done = !!t.closedAt;
  let state = 'ok';
  if (done) state = t.closedAt <= dl ? 'met' : 'missed';
  else if (Date.now() > dl) state = 'overdue';
  else if (left <= 2) state = 'risk';
  const label = done ? (state === 'met' ? `Closed in ${used} of ${total} working days` : `Closed late (${used} working days)`) : state === 'overdue' ? `Overdue by ${used - total} working day${used - total === 1 ? '' : 's'}` : `Day ${Math.max(1, used)} of ${total} working days`;
  return { state, used, total, left, dl, label };
}

/* ---------- metrics ---------- */
function taskStats(t) {
  const ex = t.exec; const inv = ex.length; const done = ex.filter(e => e.st === 'done');
  const views = done.reduce((a, e) => a + e.views, 0), inter = done.reduce((a, e) => a + e.likes + e.comments + e.shares, 0);
  return { invited: inv, done: done.length, completion: inv ? done.length / inv : 0, posts: done.reduce((a, e) => a + e.plats.length, 0), views, inter, er: views ? inter / views : 0, clicks: done.reduce((a, e) => a + e.clicks, 0), signups: done.reduce((a, e) => a + e.signups, 0), onTime: done.filter(e => e.onTime).length, late: ex.filter(e => e.st === 'late').length };
}
function allExec(filter = {}) {
  const out = [];
  S.tasks.forEach(t => { if (filter.task && filter.task !== 'all' && t.id !== filter.task) return; t.exec.forEach(e => out.push({ t, e, a: advById(e.adv) })); });
  return out.filter(x => (!filter.circle || filter.circle === 'all' || x.a.circle === filter.circle) && (!filter.region || filter.region === 'all' || x.a.region === filter.region));
}
function advById(id) { return S.advocates.find(a => a.id === id); }
function taskById(id) { return S.tasks.find(t => t.id === id); }
function assetById(id) { return S.assets.find(a => a.id === id); }
function canPublish(accId) { return ROLES[S.role].publish.includes(accId); }
