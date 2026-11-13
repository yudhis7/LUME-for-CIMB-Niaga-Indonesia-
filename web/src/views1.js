/* ================= Views: Command centre, Accounts, Calendar ================= */
const head = (crumb, title, desc, tools = '') => `<div class="pagehead"><div><div class="crumb">${crumb ? esc(crumb) + ' /' : ''} <b>${title}</b></div>${desc ? `<p>${desc}</p>` : ''}</div><div class="toolbar">${tools}</div></div>`;
const SENT_COL = { pos: '#2a78d6', neu: '#a9a8a0', neg: '#e34948' };
const capDot = c => c === 'main' ? `<span data-tip="Main job on this account" style="display:inline-block;width:12px;height:12px;border-radius:50%;background:var(--primary)"></span>` : c === 'also' ? `<span data-tip="Also used" style="display:inline-block;width:12px;height:12px;border-radius:50%;border:2px solid var(--primary)"></span>` : '<span class="muted">–</span>';

function ccStats() {
  const L = S.listen;
  const mentions = Object.values(L.byAcc).reduce((a, b) => a + b, 0);
  const sTot = L.sent.pos + L.sent.neu + L.sent.neg;
  const fr = Object.values(L.firstReply).sort((a, b) => a[0] - b[0]); const tot = fr.reduce((a, b) => a + b[1], 0); let c = 0, med = 0;
  for (const [m, n] of fr) { c += n; if (c >= tot / 2) { med = m; break; } }
  const open = S.tickets.filter(t => !t.closedAt);
  const ontime = S.tickets.filter(t => { const k = clockOf(t).state; return k !== 'overdue' && k !== 'missed'; }).length / S.tickets.length;
  const queue = S.inbox.filter(m => m.status === 'new');
  const over = queue.filter(m => m.due < Date.now());
  const fraud60 = S.inbox.filter(m => m.ai.type === 'Fraud risk' && Date.now() - m.at < 3600000);
  return { mentions, pos: L.sent.pos / sTot, neu: L.sent.neu / sTot, neg: L.sent.neg / sTot, med, open: open.length, ontime, queue, over, fraud60, risk: open.filter(t => ['risk', 'overdue'].includes(clockOf(t).state)) };
}
function scamWaveBanner() {
  const st = ccStats();
  if (st.fraud60.length < 3 || S.ui.waveHandled === dKey(Date.now())) return '';
  return `<div class="callout crit" style="margin-bottom:14px">${icon('alert', 20)}<div class="grow"><b>Scam wave? ${st.fraud60.length} fraud mentions in the last 60 minutes</b> (fake CS asking for OTP, fake prize links).<br>Lume can push the official #WaspadaSelalu warning to every official account and 300 employee advocates, and alert the fraud team.</div><button class="btn danger" data-act="wave-push">Push #WaspadaSelalu now</button></div>`;
}
ACT['wave-push'] = () => {
  const now = Date.now();
  ['ig_main', 'tt_main', 'fb_main', 'x_main', 'th_main'].forEach((acc, i) => S.posts.push({ id: uid('p'), acc, at: now + (10 + i * 2) * 60000, title: '#WaspadaSelalu · OTP scam', camp: 'waspada', format: 'Post', status: 'scheduled', caption: 'Hati-hati modus CS palsu! CIMB Niaga tidak pernah meminta OTP, PIN, atau password. Akun resmi hanya yang bercentang biru. #WaspadaSelalu' }));
  const kos = S.advocates.filter(a => a.circle === 'KOS' && a.optIn).slice(0, 300);
  const t = { id: 't' + (S.tasks.length + 1) + 'w', name: '#WaspadaSelalu · modus CS palsu minta OTP (rapid)', playbook: '#WaspadaSelalu fraud alerts', goal: 'Share the official warning within hours', circles: ['KOS', 'KOC'], assignees: kos.map(a => a.id), channels: ['instagram', 'facebook', 'x'], start: now, deadline: now + 6 * 3600000, product: 'Fraud awareness', camp: 'waspada', link: 'cimb.id/waspada', topics: ['#WaspadaSelalu'], assets: ['as4', 'as20'], template: 'Hati-hati! CIMB Niaga tidak pernah minta OTP, PIN, atau password. Akun resmi hanya yang bercentang biru. {link} {topik}', status: 'progress', points: 30, paid: false, disclosure: false, creator: ROLES[S.role].user, owner: 'brand', exec: kos.map(a => ({ adv: a.id, st: 'pending' })) };
  S.tasks.unshift(t);
  S.ui.waveHandled = dKey(now);
  notify('Fraud team alerted; #WaspadaSelalu scheduled on 5 official accounts and sent to 300 advocates', 'shield', '#task-' + t.id);
  toast('#WaspadaSelalu scheduled on 5 official accounts, task sent to 300 advocates, fraud team alerted', 'shield');
  render();
};

VIEWS.command = () => {
  const st = ccStats();
  const L = S.listen;
  const themes = Object.entries(L.themes).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const fr = Object.entries(L.firstReply).sort((a, b) => a[1][0] - b[1][0]);
  const weekStart = startOfWeek(Date.now()).getTime();
  const wk = allExec().filter(x => x.e.st === 'done' && x.e.at >= weekStart);
  const wkViews = wk.reduce((a, x) => a + x.e.views, 0), wkClicks = wk.reduce((a, x) => a + x.e.clicks, 0), wkPosts = wk.reduce((a, x) => a + x.e.plats.length, 0);
  const todayPosts = S.posts.filter(p => dKey(p.at) === dKey(Date.now()));
  const clashes = calClashes(weekStart).count;
  const pend = S.tasks.filter(t => t.status === 'review').length + S.assets.filter(a => a.status === 'Pending review').length;
  const hours = L.hourly.map((v, i) => pad(i) + ':00');
  const day = [
    ['08:00', 'Plan', `${S.posts.filter(p => p.at >= weekStart && p.at < weekStart + 7 * DAY).length} posts this week · ${clashes ? `<b style="color:var(--crit-ink)">${clashes} clash${clashes > 1 ? 'es' : ''}</b>` : '0 clashes'}`, '#calendar'],
    ['09:00', 'Approve', `${pend} item${pend === 1 ? '' : 's'} waiting for Compliance`, '#compliance'],
    ['10:00', 'Publish', `${todayPosts.length} post${todayPosts.length === 1 ? '' : 's'} today on official accounts`, '#calendar'],
    ['All day', 'Listen & sort', `${st.queue.length} in the queue · ${st.queue.filter(m => m.ai.urgency === 'urgent').length} urgent`, '#care'],
    ['Within SLA', 'Reply / ticket', `${st.over.length} over first-reply target`, '#care'],
    ['17:00', 'Report', 'Daily brief to Marketing, Care and branch heads', null]
  ];
  return head('', 'Command centre', `One screen for brand, care and compliance across every CIMB Niaga account · ${fmtD(Date.now())}, ${fmtT(Date.now())} WIB`,
    `<button class="btn" data-act="sim-open">${icon('plus', 14)}Simulate incoming message</button><button class="btn ai" data-act="brief">${icon('spark', 14)}Daily brief</button>`) +
    scamWaveBanner() +
    `<div class="grid g6">
      <div class="card kpi"><div class="v num">${fmtN(st.mentions)}</div><div class="l">mentions today</div><div class="d">All official and affiliated accounts</div></div>
      <div class="card kpi"><div class="v num" style="color:${SENT_COL.pos}">${pct(st.pos, 0)}</div><div class="l">positive sentiment</div><div class="d">Baseline ${pct(L.baselinePos, 0)} (2-week)</div></div>
      <div class="card kpi"><div class="v num" style="color:#c23b3a">${pct(st.neg, 0)}</div><div class="l">negative</div><div class="d">${fmtN(L.sent.neg)} mentions</div></div>
      <div class="card kpi ${st.med > 60 ? 'warn' : ''}"><div class="v num">${Math.round(st.med)} min</div><div class="l">median first reply</div><div class="d">Target ≤ 1 h for complaints</div></div>
      <div class="card kpi ${st.risk.length ? 'warn' : ''}"><div class="v num">${st.open}</div><div class="l">open social tickets</div><div class="d">${st.risk.length} near or past OJK deadline</div></div>
      <div class="card kpi ${st.ontime < 0.95 ? 'warn' : 'ok'}"><div class="v num">${pct(st.ontime, 0)}</div><div class="l">on time vs OJK deadline</div><div class="d">POJK 22/2023 · 10 working days</div></div>
    </div>
    <div class="grid mt12" style="grid-template-columns:0.9fr 1.1fr 1fr">
      <div class="card"><div class="hd"><h3>Sentiment today</h3></div><div class="bd row" style="gap:16px">
        ${donut([{ label: 'Positive', value: L.sent.pos, color: SENT_COL.pos }, { label: 'Neutral', value: L.sent.neu, color: SENT_COL.neu }, { label: 'Negative', value: L.sent.neg, color: SENT_COL.neg }], { center: pct(st.pos, 0), sub: 'positive', size: 140, label: 'Sentiment share today' })}
        <div class="stack small">${[['Positive', 'pos'], ['Neutral', 'neu'], ['Negative', 'neg']].map(([l, k]) => `<div><span class="legend"><span><i style="background:${SENT_COL[k]}"></i>${l}</span></span><div class="b num" style="margin-left:15px">${pct(st[k], 0)}</div></div>`).join('')}</div>
      </div></div>
      <div class="card"><div class="hd"><h3>Top complaint themes</h3><span class="sub">today</span></div><div class="bd" style="--lw:130px">${hbars(themes.map(([k, v]) => ({ label: k, value: v })), { color: '#e34948' })}</div></div>
      <div class="card"><div class="hd"><h3>First reply by account</h3><span class="sub">median, minutes</span></div><div class="bd" style="--lw:100px">${hbars(fr.map(([k, v]) => ({ label: PLAT[k].name, html: `<span class="row" style="gap:6px">${plat(k, 16)}${PLAT[k].name}</span>`, value: Math.round(v[0]), tip: v[1] + ' replies today' })), { fmt: v => v + ' min' })}</div></div>
    </div>
    <div class="grid mt12" style="grid-template-columns:3fr 1fr">
      <div class="card"><div class="hd"><h3>How today runs across all accounts</h3><span class="sub">Lume publishes and runs advocate tasks · Alivia listens, sorts and drafts · Harbor holds approved assets and replies</span></div>
        <div class="bd"><div class="grid g6" style="gap:10px">${day.map(([t, n, d, h]) => `<div class="card" style="padding:10px 12px;cursor:pointer;border-top:3px solid var(--primary)" ${h ? `data-act="go" data-href="${h}"` : 'data-act="brief"'}><div class="tiny muted b">${t}</div><div class="b">${n}</div><div class="small ink2 mt8">${d}</div></div>`).join('')}</div></div></div>
      <div class="dark-panel"><h4>Automatic outputs</h4><div class="stack small">
        <button class="btn sm" data-act="brief" style="justify-content:flex-start;white-space:normal;text-align:left">${icon('spark', 13)}Daily brief to Marketing, Care and branch heads</button>
        <button class="btn sm" data-act="go" data-href="#care" style="justify-content:flex-start;white-space:normal;text-align:left">${icon('alert', 13)}Alerts on sentiment spikes and fraud keywords</button>
        <button class="btn sm" data-act="weekly-themes" style="justify-content:flex-start;white-space:normal;text-align:left">${icon('report', 13)}Weekly themes to product owners</button>
        <button class="btn sm" data-act="go" data-href="#reports" style="justify-content:flex-start;white-space:normal;text-align:left">${icon('shield', 13)}Half-year complaint and negative-coverage log for OJK</button>
      </div></div>
    </div>
    <div class="grid mt12" style="grid-template-columns:1.4fr 1fr 1fr">
      <div class="card"><div class="hd"><h3>Mentions per hour</h3><span class="sub">today, all accounts</span></div><div class="bd">${lineChart([{ name: 'Mentions', color: '#2a78d6', values: L.hourly }], { labels: hours, area: true, h: 170, label: 'Mentions per hour today' })}</div></div>
      <div class="card"><div class="hd"><h3>Voice network this week</h3><a href="#insights" class="small">Insights</a></div><div class="bd grid g2">
        <div><div class="kpi" style="padding:0"><div class="v num">${fmtN(wkPosts)}</div><div class="l">advocate posts</div></div></div>
        <div><div class="kpi" style="padding:0"><div class="v num">${fmtK(wkViews)}</div><div class="l">reach</div></div></div>
        <div><div class="kpi" style="padding:0"><div class="v num">${fmtN(wkClicks)}</div><div class="l">clicks to OCTO</div></div></div>
        <div><div class="kpi" style="padding:0"><div class="v num">${S.tasks.filter(t => t.status === 'progress').length}</div><div class="l">live tasks</div></div></div>
      </div></div>
      <div class="card"><div class="hd"><h3>What customers ask in branches</h3><span class="pill violet">Echo · sample</span></div><div class="bd stack small">
        ${ECHO_Q.map((q, i) => `<div class="row between"><span>${esc(q[0])}<br><span class="muted tiny">asked ${q[1]}× in branches this week</span></span><button class="btn sm" data-act="echo-task" data-i="${i}">Make content</button></div>`).join('')}
      </div></div>
    </div>
    <p class="note">Listening volumes, sentiment and first-reply figures are sample data in the format of the live dashboard. Ticket and queue figures update as you work in the care desk.</p>`;
};
const ECHO_Q = [['Cara blokir kartu lewat OCTO', 312, 'OCTO Card'], ['Cara ganti nomor HP di OCTO', 214, 'OCTO'], ['Syarat KPR untuk karyawan kontrak', 156, 'KPR'], ['Bedanya Tabungan iB dan tabungan biasa', 98, 'Syariah iB']];
ACT['echo-task'] = el => { const q = ECHO_Q[+el.dataset.i]; openTaskWizard({ name: 'Q&A: ' + q[0], playbook: 'Local branch content', goal: `Answer a question customers ask in branches (${q[1]}× this week)`, product: q[2], circles: ['KOS'], channels: ['instagram', 'tiktok'], template: `Sering ditanya di cabang: ${q[0].toLowerCase()}? {cerita} {link} {topik}` }); };
ACT['weekly-themes'] = () => {
  const by = {}; S.tickets.filter(t => Date.now() - t.createdAt < 7 * DAY).forEach(t => { by[t.theme] = by[t.theme] || { n: 0, owner: t.owner }; by[t.theme].n++; });
  const rows = Object.entries(by).sort((a, b) => b[1].n - a[1].n);
  const txt = 'Weekly complaint themes (last 7 days)\n' + rows.map(([k, v]) => `- ${k}: ${v.n} tickets → ${v.owner}`).join('\n');
  openModal('Weekly themes to product owners', `<p class="ink2">Sent every Monday to each owner team. Built from social tickets in the last 7 days.</p><table class="tbl"><thead><tr><th>Theme</th><th class="n">Tickets</th><th>Owner team</th></tr></thead><tbody>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="n">${v.n}</td><td>${esc(v.owner)}</td></tr>`).join('')}</tbody></table><textarea class="input mt12" id="wt-txt" rows="6">${esc(txt)}</textarea>`, `<button class="btn" data-act="copy" data-from="#wt-txt">${icon('copy', 14)}Copy</button><button class="btn primary" data-act="close-modal">Done</button>`);
};
function briefData() {
  const st = ccStats(); const L = S.listen;
  const wkStart = startOfWeek(Date.now()).getTime();
  const wk = allExec().filter(x => x.e.st === 'done' && x.e.at >= wkStart);
  return {
    date: fmtDY(Date.now()), mentions: st.mentions, positive: pct(st.pos, 0), negative: pct(st.neg, 0), baselinePositive: pct(L.baselinePos, 0),
    topThemes: Object.entries(L.themes).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (${v})`),
    queue: st.queue.length, urgent: st.queue.filter(m => m.ai.urgency === 'urgent').length, overTarget: st.over.length, medianFirstReplyMin: Math.round(st.med),
    openTickets: st.open, nearDeadline: st.risk.length, fraudMentionsLastHour: st.fraud60.length,
    advocatePostsThisWeek: wk.reduce((a, x) => a + x.e.plats.length, 0), clicksToOCTO: wk.reduce((a, x) => a + x.e.clicks, 0), signups: wk.reduce((a, x) => a + x.e.signups, 0),
    blockedToday: S.audit.filter(a => a.result === 'Blocked' && dKey(a.at) === dKey(Date.now())).length, waitingCompliance: S.tasks.filter(t => t.status === 'review').length + S.assets.filter(a => a.status === 'Pending review').length
  };
}
function briefTemplate(d) {
  return `Daily brief · ${d.date}

Listening: ${fmtN(d.mentions)} mentions across all accounts; ${d.positive} positive (baseline ${d.baselinePositive}), ${d.negative} negative.
Top complaint themes: ${d.topThemes.join('; ')}.
Care desk: ${d.queue} items in the queue (${d.urgent} urgent); median first reply ${d.medianFirstReplyMin} min; ${d.overTarget} over target.
Tickets: ${d.openTickets} open social tickets; ${d.nearDeadline} within 2 working days of the OJK deadline or past it.
Fraud: ${d.fraudMentionsLastHour} fraud mentions in the last hour.${d.fraudMentionsLastHour >= 3 ? ' Scam-wave rule triggered: push #WaspadaSelalu.' : ''}
Voice network this week: ${fmtN(d.advocatePostsThisWeek)} advocate posts, ${fmtN(d.clicksToOCTO)} clicks to OCTO, ${fmtN(d.signups)} sign-ups.
Compliance: ${d.blockedToday} posts blocked today by the AI check; ${d.waitingCompliance} items waiting for Compliance.`;
}
ACT.brief = async () => {
  const d = briefData();
  openModal('Daily brief', `<p class="ink2 small">Auto-sent at 17:00 to Marketing, Care and branch heads. ${AI.live ? 'Written by Claude from today’s numbers.' : 'Built from today’s numbers (template).'}</p><textarea class="input" id="brief-txt" rows="14">${AI.live ? 'Writing…' : esc(briefTemplate(d))}</textarea>`, `<button class="btn" data-act="copy" data-from="#brief-txt">${icon('copy', 14)}Copy</button><button class="btn primary" data-act="brief-send">${icon('send', 14)}Send now</button>`);
  if (AI.live) {
    const txt = await AI.write(`You write the daily social media brief for PT Bank CIMB Niaga Tbk's Marketing, Customer Care and branch heads. Use ONLY these numbers (JSON): ${JSON.stringify(d)}. Write in English, plain text, no markdown symbols, under 170 words: a one-line headline, then short labelled lines for Listening, Care desk, Tickets (mention OJK deadline under POJK 22/2023), Fraud, Voice network, Compliance, and end with 2 concrete actions for tomorrow. Do not invent numbers.`, () => briefTemplate(d), t => { const el = $('#brief-txt'); if (el) el.value = t; });
    const el = $('#brief-txt'); if (el) el.value = txt;
  }
};
ACT['brief-send'] = () => { closeModal(); notify('Daily brief sent to Marketing, Care and branch heads', 'send'); toast('Daily brief sent to Marketing, Care and branch heads (34 recipients)', 'send'); renderTop(); };

/* ---------- Accounts ---------- */
VIEWS.accounts = () => {
  const tab = S.ui.accTab || 'matrix';
  const tabs = [['matrix', 'Account matrix'], ['score', 'Family scorecard'], ['register', 'Verified family register'], ['watch', `Fake-account watch <span class="badge">${S.watch.filter(w => w.status === 'Detected').length}</span>`]];
  let body = '';
  if (tab === 'matrix') {
    const rows = g => S.accounts.filter(a => a.group === g).map(a => `<tr><td><span class="row">${plat(a.platform, 22)}<span><b>${esc(a.name)}</b><br><span class="muted small">${esc(a.handle)}${a.platform === 'whatsapp' ? ' · ' + esc(a.note) : ''}</span></span></span></td><td class="small">${esc(a.role)}</td>${a.caps.map(c => `<td style="text-align:center">${capDot(c)}</td>`).join('')}<td class="n">${a.followers ? fmtK(a.followers) : '<span class="muted">n/a</span>'}</td><td class="n">${a.er != null ? pct(a.er, 2) : '<span class="muted">—</span>'}</td><td>${statusPill(a.status)}</td><td class="small">${ROLES[a.owner] ? ROLES[a.owner].short : 'Care desk'}</td><td><span class="sdot ${a.connected.includes('pending') ? 'warn' : 'good'}"></span><span class="small">${esc(a.connected)}</span></td></tr>`).join('');
    body = `<div class="grid" style="grid-template-columns:1fr 1.4fr;margin-bottom:14px"><div class="card"><div class="hd"><h3>Instagram engagement rate</h3><span class="sub">likes and comments as a share of followers</span></div><div class="bd" style="--lw:130px">${hbars([{ label: '@cimb_niaga', value: 0.0003, color: '#a9a8a0', tip: 'brand account' }, { label: '@kejarmimpi.id', value: 0.0009, color: '#6250d6', tip: 'community' }, { label: '@hycimbniaga', value: 0.0052, color: '#0c8f5a', tip: 'people-led' }], { fmt: v => pct(v, 2) })}<p class="small b" style="color:var(--good-ink);margin:10px 0 0">Same bank, same audience. The account run by and about people engages 17× more.</p></div></div>
      <div class="grid g3">${[['alert', 'The brand speaks alone', '14,600 staff, 800+ community members and campaign artists post without a shared plan, library or tracking.'], ['link', 'No line from post to result', 'Campaign posts can’t be traced to OCTO downloads, sign-ups or branch visits. Lume adds tracked cimb.id links to every task.'], ['shield', 'A new rule for influencers', 'OJK’s POJK 6/2026 now governs anyone paid to promote financial products, including affiliates.']].map(([ic, t, d]) => `<div class="card" style="padding:12px 14px">${icon(ic, 18)}<div class="b mt8">${t}</div><div class="small ink2 mt8">${d}</div></div>`).join('')}</div></div>
    <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Account</th><th>Main job</th>${CAP_NAMES.map(c => `<th style="text-align:center;white-space:normal;min-width:84px">${c}</th>`).join('')}<th class="n">Followers</th><th class="n">Engagement</th><th>Status</th><th>Publishes</th><th>Connector</th></tr></thead>
      <tbody><tr><td colspan="13" class="tiny b" style="color:var(--primary);letter-spacing:.08em;background:#fafbfe">OFFICIAL</td></tr>${rows('official')}<tr><td colspan="13" class="tiny b" style="color:var(--primary);letter-spacing:.08em;background:#fafbfe">AFFILIATED</td></tr>${rows('affiliated')}${rows('group')}</tbody></table></div>
      <div class="bd small muted row wrap" style="gap:16px"><span>${capDot('main')} main job on this account</span><span>${capDot('also')} also used</span><span>Audience figures: Social Blade public data, about 22 Oct 2026 (Instagram may be partial). X follower count not available.</span></div></div>
      <p class="note">API access for comments, mentions and DMs per platform is confirmed in week 0. Group companies (CIMB Niaga Finance, Sekuritas) and YouTube can be added the same way.</p>`;
  } else if (tab === 'score') {
    const rows = S.accounts.filter(a => S.listen.byAcc[a.id]).map(a => { const h = hashStr(a.id); const m = S.listen.byAcc[a.id]; const pos = a.id === 'x_main' ? 0.44 : a.id === 'fb_main' ? 0.55 : 0.58 + (h % 22) / 100; const praise = S.inbox.filter(x => x.acc === a.id && x.ai.type === 'Praise'); return { a, m, pos, praise: praise.length, reshared: praise.filter(x => x.permission).length + (a.group === 'official' ? S.assets.filter(x => x.type === 'UGC' && !x.fromMsg && x.source && x.source.includes(PLAT[a.platform].name)).length : 0), thanked: praise.length ? praise.filter(x => x.firstReplyAt && dKey(x.firstReplyAt) === dKey(x.at)).length / praise.length : null, growth: a.id === 'fb_main' ? -1087 : a.id === 'tt_main' ? 1700 : a.followers ? Math.round(a.followers * (0.001 + (h % 9) / 1000)) : null }; });
    const fam = rows.reduce((o, r) => ({ m: o.m + r.m, p: o.p + r.m * r.pos }), { m: 0, p: 0 });
    body = `<div class="grid g4" style="margin-bottom:14px"><div class="card kpi"><div class="v num">${pct(fam.p / fam.m, 0)}</div><div class="l">positive sentiment · whole family</div></div><div class="card kpi"><div class="v num">${fmtN(fam.m)}</div><div class="l">mentions today</div></div><div class="card kpi"><div class="v num">${rows.reduce((a, r) => a + r.reshared, 0)}</div><div class="l">positive reviews reshared with permission</div></div><div class="card kpi"><div class="v num">+${fmtN(rows.reduce((a, r) => a + Math.max(0, r.growth || 0), 0))}</div><div class="l">new followers, 14 days</div></div></div>
    <div class="grid" style="grid-template-columns:1.7fr 1fr"><div class="card"><div class="hd"><h3>One scorecard per account</h3><span class="sub">awareness, sentiment and positive reviews</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Account</th><th class="n">Mentions today</th><th>Positive share</th><th class="n">Praise in queue</th><th class="n">Reshared</th><th class="n">Praise thanked same day</th><th class="n">Followers, 14 d</th></tr></thead><tbody>${rows.map(r => `<tr><td><span class="row">${plat(r.a.platform, 18)}<span class="small"><b>${esc(r.a.name === 'CIMB Niaga' ? PLAT[r.a.platform].name : r.a.name)}</b> <span class="muted">${esc(r.a.handle)}</span></span></span></td><td class="n">${fmtN(r.m)}</td><td><div class="row" style="gap:8px"><div class="progress" style="width:80px"><i style="width:${r.pos * 100}%;background:#2a78d6"></i></div><span class="small num">${pct(r.pos, 0)}</span></div></td><td class="n">${r.praise}</td><td class="n">${r.reshared}</td><td class="n">${r.thanked == null ? '—' : pct(r.thanked, 0)}</td><td class="n" style="color:${(r.growth || 0) < 0 ? 'var(--crit-ink)' : 'inherit'}">${r.growth == null ? '—' : (r.growth > 0 ? '+' : '') + fmtN(r.growth)}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="stack"><div class="card"><div class="hd"><h3>The flywheel</h3></div><div class="bd small ink2 stack"><div><b>Serve well:</b> branches and OCTO deliver; Echo flags great service.</div><div><b>Invite:</b> happy customers are asked to share after a resolved case or event.</div><div><b>Listen:</b> sentiment and themes tracked per account, every day.</div><div><b>Amplify:</b> best posts reshared with permission across the family and advocates.</div><div><b>Improve:</b> themes go back to products and branches; fixes announced.</div></div></div>
    <div class="dark-panel"><h4>Guardrails</h4><div class="stack small"><div>Never fake, buy or script customer reviews</div><div>Ask, don’t pay: no rewards for a positive rating</div><div>Reshare customer posts only with their permission</div><div>Staff and creators always disclose their link to CIMB Niaga</div></div></div></div></div>
    <p class="note">Per-account sentiment and follower growth are sample figures; TikTok and Facebook growth from Social Blade (8–22 Oct 2026).</p>`;
  } else if (tab === 'register') {
    body = `<div class="callout info" style="margin-bottom:12px">${icon('shield', 18)}<div><b>Rule for spotting fakes:</b> only blue-tick accounts are official (except YouTube). Lume keeps the list of official and affiliated accounts, owners and blue-tick status; the same list powers fake-account watch.</div></div>
    <div class="grid g3">${S.accounts.map(a => `<div class="card"><div class="bd stack">
      <div class="row">${plat(a.platform, 28)}<div><b>${esc(a.name)}</b><div class="small muted">${esc(a.handle)}</div></div><span style="margin-left:auto">${a.verified === 'yes' ? '<span class="pill blue">' + icon('check', 12) + 'Blue tick</span>' : '<span class="pill warn">' + icon('alert', 12) + 'Confirm blue tick</span>'}</span></div>
      <div class="small ink2">${esc(a.job)}</div>
      <dl class="kv" style="grid-template-columns:110px 1fr"><dt>Owner team</dt><dd>${ROLES[a.owner] ? ROLES[a.owner].name : 'Customer Care'}</dd><dt>Can publish</dt><dd>${Object.values(ROLES).filter(r => r.publish.includes(a.id)).map(r => r.short).join(', ') || 'Reply only'}</dd><dt>Compliance</dt><dd>Sees all posts</dd><dt>Audience</dt><dd>${a.followers ? fmtN(a.followers) + ' followers' : esc(a.note)}</dd></dl>
      ${a.verified !== 'yes' ? `<button class="btn sm" data-act="verify-acc" data-id="${a.id}">${icon('check', 13)}Record blue-tick check</button>` : ''}
    </div></div>`).join('')}</div>`;
  } else {
    body = `<div class="row between" style="margin-bottom:10px"><p class="ink2" style="margin:0">Accounts that imitate CIMB Niaga, found by matching names, logos and handles against the verified family register.</p><button class="btn" data-act="watch-scan">${icon('refresh', 14)}Scan now</button></div>
    <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Suspected account</th><th>Why flagged</th><th class="n">Est. reach</th><th>Seen</th><th>Status</th><th></th></tr></thead><tbody>
    ${S.watch.map(w => `<tr><td><span class="row">${plat(w.platform, 18)}<b>${esc(w.handle)}</b></span></td><td class="small">${esc(w.reason)}</td><td class="n">${fmtN(w.reach)}</td><td class="small">${rel(w.seen)}</td><td>${w.status === 'Detected' ? '<span class="pill crit">Detected</span>' : w.status === 'Reported' ? '<span class="pill warn">Reported to platform</span>' : '<span class="pill good">Taken down</span>'}</td>
    <td><div class="row">${w.status === 'Detected' ? `<button class="btn sm" data-act="watch-report" data-id="${w.id}">Report</button>` : ''}${w.status !== 'Taken down' ? `<button class="btn sm" data-act="watch-warn" data-id="${w.id}">Warn followers</button><button class="btn sm ghost" data-act="watch-down" data-id="${w.id}">Mark taken down</button>` : ''}</div></td></tr>`).join('')}</tbody></table></div></div>`;
  }
  return head('Publish', 'Accounts', 'One console for every official and affiliated account: publishing, listening, replies, tickets and advocate amplification.', `<button class="btn primary" data-act="acc-add">${icon('plus', 14)}Connect account</button>`) +
    `<div class="tabs">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="tab" data-k="accTab" data-v="${k}">${l}</button>`).join('')}</div>` + body;
};
function statusPill(s) { const m = { 'Big but quiet': 'warn', 'Growing': 'good', 'Slipping': 'crit', 'Service': 'blue', 'Mirror': '', 'Community': 'violet', 'People-led': 'good', 'To check': 'warn', 'Care channel': 'blue', 'Pending connector': 'warn' }; return `<span class="pill ${m[s] || ''}">${esc(s)}</span>`; }
ACT['verify-acc'] = el => { const a = S.accounts.find(x => x.id === el.dataset.id); if (!['compliance', 'brand'].includes(S.role)) { toast('Only Brand or Compliance can record the blue-tick check', 'lock'); return; } openModal('Record blue-tick check · ' + esc(a.handle), `<p>${esc(a.handle)} has ${fmtN(a.followers)} followers and ${fmtN(a.posts)} posts. Confirm the platform shows a verified badge and that the account is owned by CIMB Niaga.</p><div class="stack"><label class="chk"><input type="checkbox" id="vt1"> Verified badge visible on the platform</label><label class="chk"><input type="checkbox" id="vt2"> Ownership confirmed with the Syariah business team</label></div>`, `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="verify-yes" data-id="${a.id}">Save check</button>`); };
ACT['verify-yes'] = el => { if (!$('#vt1').checked || !$('#vt2').checked) { toast('Tick both checks to confirm', 'alert'); return; } const a = S.accounts.find(x => x.id === el.dataset.id); a.verified = 'yes'; a.status = 'Community'; a.note = 'Blue tick confirmed ' + fmtDY(Date.now()); closeModal(); toast(a.handle + ' recorded as verified'); render(); };
ACT['acc-add'] = () => openModal('Connect an account', `<p class="ink2">Add group companies, venues or YouTube to the family. Connector access is confirmed with IT & InfoSec in week 0.</p><div class="stack">${ADDABLE.filter(x => !S.accounts.some(a => a.handle === x.handle)).map((x, i) => `<div class="row between card" style="padding:10px 12px"><span class="row">${plat(x.platform, 22)}<span><b>${esc(x.name)}</b><br><span class="small muted">${esc(x.handle)} · ${esc(x.note)}</span></span></span><button class="btn sm" data-act="acc-add-one" data-h="${esc(x.handle)}">Connect</button></div>`).join('') || '<div class="empty">All suggested accounts are connected.</div>'}</div>`);
ACT['acc-add-one'] = el => { const x = ADDABLE.find(a => a.handle === el.dataset.h); S.accounts.push({ id: 'g_' + uid(''), platform: x.platform, handle: x.handle, name: x.name, group: 'group', job: x.note, role: x.note, followers: null, posts: null, er: null, status: 'Pending connector', note: x.note, verified: x.platform === 'youtube' ? 'yes' : 'check', owner: 'brand', caps: ['main', 'main', 'also', 'also', 'also'], connected: 'Connector pending (week 0)' }); closeModal(); toast(x.name + ' added; connector pending'); render(); };
ACT['watch-report'] = el => { const w = S.watch.find(x => x.id === el.dataset.id); w.status = 'Reported'; toast(`${w.handle} reported to ${PLAT[w.platform].name}`, 'flag'); render(); };
ACT['watch-down'] = el => { const w = S.watch.find(x => x.id === el.dataset.id); w.status = 'Taken down'; render(); };
ACT['watch-warn'] = el => { const w = S.watch.find(x => x.id === el.dataset.id); const acc = w.platform === 'tiktok' ? 'tt_main' : w.platform === 'facebook' ? 'fb_main' : w.platform === 'x' ? 'x_main' : 'ig_main'; S.posts.push({ id: uid('p'), acc, at: Date.now() + 30 * 60000, title: '#WaspadaSelalu · akun palsu', camp: 'waspada', format: 'Post', status: 'scheduled', caption: `Waspada akun palsu ${w.handle}! Akun resmi CIMB Niaga hanya yang bercentang biru. Jangan bagikan data pribadi. #WaspadaSelalu` }); toast('Warning post scheduled on ' + accById(acc).handle + ' in 30 minutes', 'megaphone'); render(); };
ACT['watch-scan'] = () => { const c = [['instagram', '@cimbniaga.promo.id', 'Copies campaign visuals; links to a fake form'], ['x', '@octo_helpdesk', 'Replies to complaints asking customers to DM card numbers'], ['tiktok', '@cimb.niaga.giveaway', 'Fake giveaway asking for OTP']]; const n = c.find(x => !S.watch.some(w => w.handle === x[1])); if (!n) { toast('No new suspicious accounts found'); return; } S.watch.unshift({ id: uid('w'), platform: n[0], handle: n[1], seen: Date.now(), reason: n[2], reach: Math.round(200 + Math.random() * 3000), status: 'Detected' }); notify('New impersonator detected: ' + n[1], 'alert', '#accounts'); toast('1 new suspected account found', 'alert'); render(); };

/* ---------- Calendar ---------- */
const CAL_ROWS = ['ig_main', 'tt_main', 'fb_main', 'x_main', 'th_main', 'ig_km', 'ig_hy', 'ig_sy'];
function calClashes(ws) {
  const ids = new Set(); let days = {};
  const wk = S.posts.filter(p => p.at >= ws && p.at < ws + 7 * DAY && CAMPAIGNS[p.camp] && CAMPAIGNS[p.camp].clash);
  const groups = {}; wk.forEach(p => { const k = p.camp + '|' + dKey(p.at); (groups[k] = groups[k] || []).push(p); });
  Object.entries(groups).forEach(([k, ps]) => { const accs = new Set(ps.map(p => p.acc)); if (accs.size > 1) { ps.forEach(p => ids.add(p.id)); days[k] = accs.size; } });
  const worst = Object.entries(days).sort((a, b) => b[1] - a[1])[0];
  return { ids, count: Object.keys(days).length, worst: worst ? { day: worst[0].split('|')[1], n: worst[1], camp: worst[0].split('|')[0] } : null };
}
function calWeek() {
  if (S.ui.calWeek) return S.ui.calWeek;
  const tmr = Date.now() + DAY; return startOfWeek(tmr).getTime();
}
VIEWS.calendar = () => {
  const ws = calWeek();
  const days = [...Array(7)].map((_, i) => ws + i * DAY);
  const cl = calClashes(ws);
  const summary = cl.count ? `<span class="pill crit">${icon('alert', 12)}${cl.worst.n} accounts clash on ${DOW[new Date(cl.worst.day).getDay()]} (${CAMPAIGNS[cl.worst.camp].name})${cl.count > 1 ? ` · ${cl.count} clash days` : ''}</span>` : `<span class="pill good">${icon('check', 12)}0 clashes${S.ui.arc ? ' · ' + S.ui.arc + '-day story arc' : ''}</span>`;
  let grid = `<div class="ch">Account</div>` + days.map(d => `<div class="ch ${dKey(d) === dKey(Date.now()) ? 'today' : ''}">${fmtD(d)}</div>`).join('');
  CAL_ROWS.forEach(acc => {
    const a = accById(acc);
    grid += `<div class="rh">${plat(a.platform, 18)}<span>${esc(a.name === 'CIMB Niaga' ? PLAT[a.platform].name : a.name)}<br><span class="tiny muted">${esc(a.handle)}</span></span></div>`;
    days.forEach(d => {
      const ps = S.posts.filter(p => p.acc === acc && dKey(p.at) === dKey(d)).sort((x, y) => x.at - y.at);
      grid += `<div class="cell" data-drop="${acc}|${d}">${ps.map(p => { const can = canPublish(acc) && p.status !== 'published'; return `<div class="post ${CAMPAIGNS[p.camp] ? CAMPAIGNS[p.camp].cls : ''} ${cl.ids.has(p.id) ? 'clash' : ''} ${can ? '' : 'locked'} ${p.status === 'published' ? 'published' : ''}" draggable="${can}" data-post="${p.id}" data-act="post-open" data-id="${p.id}" data-tip="${esc(p.title)} · ${esc(CAMPAIGNS[p.camp] ? CAMPAIGNS[p.camp].name : '')}<br>${fmtT(p.at)} · ${esc(p.format)} · ${p.status}${cl.ids.has(p.id) ? '<br><b>Clash: same campaign on another account today</b>' : ''}"><div class="t">${esc(p.title)}</div><div class="m">${fmtT(p.at)} · ${esc(p.format)}${p.status === 'published' ? ' · published' : ''}</div></div>`; }).join('')}</div>`;
    });
  });
  const canAny = ROLES[S.role].publish.length > 0;
  return head('Publish', 'Calendar', 'All official and affiliated accounts on one calendar. Stagger launches so accounts lift each other instead of competing for the same audience.',
    `<div class="seg"><button data-act="cal-nav" data-d="-1">‹</button><button data-act="cal-nav" data-d="0">This week</button><button data-act="cal-nav" data-d="1">›</button></div>
     <button class="btn" data-act="cal-stagger" ${cl.count ? '' : 'disabled'}>${icon('wand', 14)}Auto-stagger with Lume</button>
     <button class="btn primary ${canAny ? '' : 'locked'}" data-act="post-new">${icon('plus', 14)}New post</button>`) +
    `<div class="row wrap between" style="margin-bottom:10px">${summary}<div class="legend">${Object.entries(CAMPAIGNS).filter(([k]) => k !== 'card').map(([k, c]) => `<span><i style="background:${CAMP_COL[k]}"></i>${c.name}</span>`).join('')}<span><i style="background:#fff;outline:2px solid var(--crit)"></i>Clash</span></div></div>
    <div class="tbl-wrap"><div class="cal">${grid}</div></div>
    <p class="note">Drag a scheduled post to another day to move it. You can move posts only on accounts your team owns (${ROLES[S.role].publish.map(id => accById(id).handle).join(', ') || 'none for ' + ROLES[S.role].short}). Compliance sees every account. A clash is the same launch campaign on more than one account on the same day; #WaspadaSelalu alerts are meant to go out together and never count as clashes.</p>
    <div class="grid g2 mt16">
      <div class="card"><div class="hd"><h3>Topic suggestions</h3><span class="pill violet">Alivia · trends + Echo</span></div><div class="bd stack small">
        ${[['“Gajian tanggal tua” money tips', 'Trending on TikTok in Jakarta', 0, 'tip'], ['Cara blokir kartu lewat OCTO', 'Asked 312× in branches this week', 0, 'waspada'], ['Kejar Mimpi FEST countdown', 'FEST this weekend · 3 approved visuals', 0, 'km'], ['Hari Pahlawan: pejuang mimpi di sekitar kita', '10 November · employer brand angle', 0, 'life']].map((s, i) => `<div class="row between"><span><b>${esc(s[0])}</b><br><span class="muted tiny">${esc(s[1])}</span></span><button class="btn sm" data-act="post-new" data-title="${esc(s[0])}" data-camp="${s[3]}">Plan post</button></div>`).join('')}
      </div></div>
      <div class="card"><div class="hd"><h3>Cross-promotion by design</h3></div><div class="bd small ink2 stack">
        <div>Each campaign gets a role per account: <b>the main account announces</b>, KejarMimpi shows real stories, Syariah adapts for its customers, Life at CIMB Niaga shows the people behind it.</div>
        <div>Auto-stagger keeps the main Instagram account first, then gives every other account its own day, so the week reads as one story instead of five accounts competing on the same day.</div>
      </div></div>
    </div>`;
};
VIEWS.calendar_after = () => {
  $$('.post[draggable="true"]').forEach(el => el.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', el.dataset.post); e.dataTransfer.effectAllowed = 'move'; }));
  $$('.cal .cell').forEach(c => {
    c.addEventListener('dragover', e => { const id = e.dataTransfer.types.includes('text/plain'); if (id) { e.preventDefault(); c.classList.add('over'); } });
    c.addEventListener('dragleave', () => c.classList.remove('over'));
    c.addEventListener('drop', e => {
      e.preventDefault(); c.classList.remove('over');
      const p = S.posts.find(x => x.id === e.dataTransfer.getData('text/plain')); if (!p) return;
      const [acc, d] = c.dataset.drop.split('|');
      if (acc !== p.acc) { toast('A post stays on its own account. Create a new post for another account.', 'alert'); return; }
      const t = new Date(p.at); const nd = new Date(+d); nd.setHours(t.getHours(), t.getMinutes(), 0, 0);
      if (nd.getTime() < Date.now()) { toast('That time has already passed', 'alert'); return; }
      p.at = nd.getTime(); S.ui.arc = null; toast(`Moved “${p.title}” to ${fmtD(p.at)}`); render();
    });
  });
};
ACT['cal-nav'] = el => { const d = +el.dataset.d; S.ui.calWeek = d === 0 ? null : calWeek() + d * 7 * DAY; render(); };
ACT['cal-stagger'] = () => {
  const ws = calWeek(); const order = ['ig_main', 'tt_main', 'fb_main', 'x_main', 'th_main', 'ig_km', 'ig_sy', 'ig_hy'];
  let moved = 0, span = 0;
  Object.keys(CAMPAIGNS).filter(k => CAMPAIGNS[k].clash).forEach(camp => {
    const ps = S.posts.filter(p => p.camp === camp && p.at >= ws && p.at < ws + 7 * DAY);
    if (ps.length < 2) return;
    const planner = S.role === 'brand' || S.role === 'compliance';
    const fixed = ps.filter(p => p.status === 'published' || (!planner && !canPublish(p.acc)));
    const movable = ps.filter(p => !fixed.includes(p)).sort((a, b) => order.indexOf(a.acc) - order.indexOf(b.acc));
    if (!movable.length) return;
    const taken = new Set(fixed.map(p => dKey(p.at)));
    const startDay = Math.max(startOfDay(Math.min(...movable.map(p => p.at))).getTime(), startOfDay(Date.now() + DAY).getTime());
    let d = startDay; const used = [];
    movable.forEach(p => {
      let guard = 0; while (taken.has(dKey(d)) && guard++ < 14) d += DAY;
      const t = new Date(p.at); const nd = new Date(d); nd.setHours(t.getHours(), t.getMinutes(), 0, 0);
      if (nd.getTime() < Date.now()) nd.setTime(Date.now() + 3600000);
      if (nd.getTime() !== p.at) moved++;
      p.at = nd.getTime(); taken.add(dKey(d)); used.push(dKey(d)); d += DAY;
    });
    span = Math.max(span, new Set([...used, ...fixed.map(p => dKey(p.at))]).size);
  });
  S.ui.arc = span || null;
  if (S.role !== 'brand' && S.role !== 'compliance') toast('Only posts on accounts your team owns were moved; the Brand team plans the shared calendar', 'lock');
  else if (moved) notify('Shared calendar re-slotted; KejarMimpi, HR and Syariah teams notified of their new slots', 'cal', '#calendar');
  toast(moved ? `Staggered ${moved} posts: main account announces first, every account gets its own day` : 'Nothing to move', 'wand');
  render();
};
ACT['post-open'] = el => {
  const p = S.posts.find(x => x.id === el.dataset.id); const a = accById(p.acc); const can = canPublish(p.acc) && !['published', 'publishing'].includes(p.status);
  const chk = p.caption ? checkCompliance(p.caption, { product: p.product }) : null;
  openModal(esc(p.title), `<div class="row" style="margin-bottom:10px">${plat(a.platform, 22)}<b>${esc(a.handle)}</b><span class="pill">${esc(p.format)}</span><span class="pill ${p.status === 'published' ? 'good' : p.status === 'failed' ? 'crit' : 'blue'}">${p.status}</span></div>
    <dl class="kv"><dt>Campaign</dt><dd>${esc(CAMPAIGNS[p.camp] ? CAMPAIGNS[p.camp].name : p.camp)}</dd><dt>When</dt><dd>${fmtD(p.at)}, ${fmtT(p.at)} WIB</dd><dt>AI compliance</dt><dd>${chk ? verdictPill(chk.verdict) : '<span class="pill good">Approved asset from the library</span>'}</dd><dt>Owner</dt><dd>${ROLES[a.owner] ? ROLES[a.owner].name : '—'}</dd>${p.pub ? `<dt>On the platform</dt><dd>${pubLine(p)}</dd>` : ''}${p.approvedBy ? `<dt>Approved by</dt><dd>${esc(p.approvedBy)} (Compliance)</dd>` : ''}</dl>
    ${p.caption ? `<div class="preview-text mt12">${chk ? highlight(p.caption, chk.marks) : esc(p.caption)}</div>` : ''}
    ${p.status === 'published' ? `<div class="grid g4 mt12">${['Views', 'Likes', 'Comments', 'Clicks'].map((k, i) => `<div class="card kpi"><div class="v num">${fmtK([24800, 610, 88, 142][i] * (1 + (hashStr(p.id) % 5) / 10))}</div><div class="l">${k}</div></div>`).join('')}</div>` : ''}
    ${!can && p.status !== 'published' ? `<div class="callout warn mt12">${icon('lock', 16)}<div>${ROLES[S.role].name} can view this post but can’t change it. Each team publishes only to its own accounts.</div></div>` : ''}`,
    can ? `<button class="btn danger" data-act="post-del" data-id="${p.id}">Delete</button><span style="flex:1"></span><button class="btn" data-act="close-modal">Close</button><button class="btn primary" data-act="post-now" data-id="${p.id}">${icon('send', 14)}Publish now</button>` : `<button class="btn" data-act="close-modal">Close</button>`);
};
ACT['post-del'] = el => { S.posts = S.posts.filter(p => p.id !== el.dataset.id); closeModal(); toast('Post deleted'); render(); };
ACT['post-now'] = el => { const p = S.posts.find(x => x.id === el.dataset.id); p.at = Date.now(); p.status = 'published'; closeModal(); toast(`Published to ${accById(p.acc).handle}; link saved for audit`, 'send'); render(); };
function verdictPill(v) { return v === 'ready' ? `<span class="pill good">${icon('check', 12)}Lolos cek kepatuhan AI</span>` : v === 'route' ? `<span class="pill warn">${icon('shield', 12)}Passed AI check · with Compliance</span>` : `<span class="pill crit">${icon('x', 12)}Blocked by AI check</span>`; }
ACT['post-new'] = el => {
  const mine = ROLES[S.role].publish;
  if (!mine.length) { lockMsg('publish to any account'); return; }
  const title = el.dataset.title || ''; const camp = el.dataset.camp || 'octo';
  const tomorrow = new Date(Date.now() + DAY); tomorrow.setHours(10, 0, 0, 0);
  openModal('New post', `<div class="grid g2">
    <label class="fl">Title<input class="input" id="np-title" value="${esc(title)}" placeholder="e.g. OCTO launch"></label>
    <label class="fl">Campaign<select class="input" id="np-camp">${Object.entries(CAMPAIGNS).map(([k, c]) => `<option value="${k}" ${k === camp ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label>
    <label class="fl">Date<input class="input" type="date" id="np-date" value="${dKey(tomorrow)}"></label>
    <label class="fl">Time (WIB)<input class="input" type="time" id="np-time" value="10:00"></label>
    <label class="fl">Product tag<select class="input" id="np-prod" data-change="np-check">${Object.keys(PRODUCTS).map(k => `<option ${k === 'OCTO' ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
    <label class="fl">Paid partnership?<select class="input" id="np-paid" data-change="np-check"><option value="0">No</option><option value="1">Yes · disclosure required</option></select></label>
  </div>
  <div class="fl mt12">Accounts <span class="muted" style="font-weight:500">· formats adapt per platform: carousel, short video, thread</span></div>
  <div class="checks mt8">${CAL_ROWS.map(id => { const a = accById(id); const ok = mine.includes(id); return `<label class="chk ${ok ? '' : 'lock'}" ${ok ? '' : `data-tip="Owned by ${ROLES[a.owner] ? ROLES[a.owner].short : ''}"`}><input type="checkbox" class="np-acc" value="${id}" ${ok ? '' : 'disabled'} ${ok && id === mine[0] ? 'checked' : ''}>${plat(a.platform, 16)}${esc(a.handle)}${ok ? '' : ' ' + icon('lock', 12)}</label>`; }).join('')}</div>
  <label class="fl mt12">Caption (Bahasa)<textarea class="input" id="np-cap" data-input="np-check" rows="4" placeholder="Tulis caption, atau minta Alivia membuatkan…"></textarea></label>
  <div class="row mt8"><button class="btn ai sm" data-act="np-ai">${icon('spark', 13)}Draft caption with AI</button><button class="btn sm" data-act="np-fix">${icon('wand', 13)}Auto-fix</button></div>
  <div id="np-chk" class="mt12"></div>`, `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="np-save">${icon('cal', 14)}Check & schedule</button>`, 'wide');
  ONCHANGE['np-check']();
};
function npCtx() { return { product: $('#np-prod').value, paid: $('#np-paid').value === '1', disclosure: $('#np-paid').value === '1', kind: 'caption' }; }
ONCHANGE['np-check'] = ONINPUT['np-check'] = () => { const el = $('#np-chk'); if (!el) return; const txt = $('#np-cap').value; el.innerHTML = txt.trim() ? checkPanel(txt, npCtx()) : '<p class="muted small">The AI compliance check runs as you type.</p>'; };
ACT['np-ai'] = async () => {
  const c = npCtx(); const title = $('#np-title').value || 'OCTO'; const camp = CAMPAIGNS[$('#np-camp').value].name;
  const fb = () => captionTemplate({ name: title, product: c.product, camp, paid: c.paid });
  $('#np-cap').value = AI.live ? 'Menulis…' : '';
  const txt = await AI.write(captionPrompt({ name: title, campaign: camp, product: c.product, paid: c.paid, account: 'official CIMB Niaga account' }), fb, t => { $('#np-cap').value = t; });
  $('#np-cap').value = txt; ONCHANGE['np-check']();
};
ACT['np-fix'] = () => { const c = npCtx(); $('#np-cap').value = autoFix($('#np-cap').value, c); ONCHANGE['np-check'](); toast('Auto-fix applied; check the wording before scheduling', 'wand'); };
ACT['np-save'] = () => {
  const accs = $$('.np-acc:checked').map(x => x.value); const title = $('#np-title').value.trim(); const cap = $('#np-cap').value.trim();
  if (!title) { toast('Add a title', 'alert'); return; } if (!accs.length) { toast('Choose at least one account', 'alert'); return; }
  const [y, mo, d] = $('#np-date').value.split('-').map(Number); const [h, mi] = $('#np-time').value.split(':').map(Number);
  const when = new Date(y, mo - 1, d, h, mi).getTime();
  if (when < Date.now()) { toast('Pick a time in the future', 'alert'); return; }
  const c = npCtx(); const chk = checkCompliance(cap || title, c); logAudit('Calendar post · ' + accs.map(a => accById(a).handle).join(', '), cap || title, chk);
  if (chk.verdict === 'blocked') { ONCHANGE['np-check'](); toast(`Blocked: fix ${chk.blocking.length} issue${chk.blocking.length > 1 ? 's' : ''} before scheduling`, 'x'); return; }
  const fmt = { instagram: 'Carousel', tiktok: 'Short video', facebook: 'Post', x: 'Thread', threads: 'Post' };
  accs.forEach(acc => S.posts.push({ id: uid('p'), acc, at: when, title, camp: $('#np-camp').value, format: fmt[accById(acc).platform] || 'Post', status: chk.verdict === 'route' ? 'draft' : 'scheduled', caption: cap, product: c.product }));
  closeModal();
  if (chk.verdict === 'route') { notify(`“${title}” passed the AI check and waits for Compliance`, 'shield', '#compliance'); toast('Passed the AI check; high-risk product, so it goes to Compliance before it can publish', 'shield'); }
  else toast(`Scheduled on ${accs.length} account${accs.length > 1 ? 's' : ''} for ${fmtD(when)} ${fmtT(when)}`, 'cal');
  S.ui.calWeek = startOfWeek(when).getTime(); render();
};
