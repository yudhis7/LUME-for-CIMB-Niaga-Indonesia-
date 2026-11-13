/* ================= Views: Care desk, Social tickets ================= */
const TYPE_ORDER = ['Praise', 'Question', 'Complaint', 'Fraud risk', 'Crisis or viral', 'Spam'];
const aiChip = ai => `<span class="pill ${TYPE_META[ai.type].color}">AI: ${ai.type} · ${ai.sentiment}${ai.type === 'Complaint' ? ' · ticket' : ai.urgency === 'urgent' ? ' · urgent' : ''}</span>`;
const SIM_POOL = [
  ['x_main', 'Mention', '@ok***la', 'Kenapa transfer BI-FAST saya pending dari tadi pagi? Saldo udah kepotong'],
  ['ig_main', 'Comment', '@si***ti', 'OCTO makin keren, fitur barunya gampang dipakai!'],
  ['tt_main', 'Comment', '@ga***ng', 'Ada yang DM ngaku CS CIMB minta PIN kartu, hati-hati guys'],
  ['fb_main', 'Comment', '@ma***di', 'Kartu debit saya ketelan di ATM cabang Darmo, gimana ini? tolong dicek'],
  ['x_main', 'Mention', '@ne***ws', 'Wartawan di sini, ada konfirmasi soal gangguan OCTO hari ini? Banyak nasabah mengeluh'],
  ['ig_km', 'Comment', '@da***ni', 'Kejar Mimpi bikin aku berani mulai usaha, makasih!'],
  ['ig_main', 'Comment', '@pr***mo', 'Menang undian? klik bit.ly/cimb-undian sekarang juga'],
  ['fb_main', 'Comment', '@ri***wa', 'Berapa minimal setoran awal deposito di OCTO?']
];
function careQueue() {
  const f = S.ui.careF || 'open', ty = S.ui.careT || 'all', ac = S.ui.careA || 'all';
  const urgRank = { urgent: 0, high: 1, medium: 2, normal: 3, low: 4 };
  return S.inbox.filter(m => (f === 'all' || (f === 'open' ? m.status === 'new' : m.status !== 'new')) && (ty === 'all' || m.ai.type === ty) && (ac === 'all' || m.acc === ac))
    .sort((a, b) => f === 'open' ? (a.due - b.due) || (urgRank[a.ai.urgency] - urgRank[b.ai.urgency]) : b.at - a.at);
}
VIEWS.care = () => {
  const q = careQueue();
  if (!S.ui.careSel || !S.inbox.find(m => m.id === S.ui.careSel)) S.ui.careSel = q[0] ? q[0].id : null;
  const m = S.inbox.find(x => x.id === S.ui.careSel);
  const open = S.inbox.filter(x => x.status === 'new');
  const counts = Object.fromEntries(TYPE_ORDER.map(t => [t, open.filter(x => x.ai.type === t).length]));
  return head('Listen & resolve', 'Care desk', 'Every comment, mention and DM across all accounts, sorted by AI for intent, sentiment, product and urgency. Personal data is masked before anyone sees it.',
    `<button class="btn" data-act="sim-open">${icon('plus', 14)}Simulate incoming message</button>`) + scamWaveBanner() +
    `<div class="care">
    <div class="card"><div class="hd" style="padding-bottom:10px;border-bottom:1px solid var(--line)"><h3>Incoming · all accounts</h3><div class="seg">${[['open', 'Open ' + open.length], ['done', 'Handled'], ['all', 'All']].map(([k, l]) => `<button class="${(S.ui.careF || 'open') === k ? 'on' : ''}" data-act="tab" data-k="careF" data-v="${k}">${l}</button>`).join('')}</div></div>
      <div class="row wrap" style="padding:8px 12px;border-bottom:1px solid var(--line);gap:6px"><select class="input" style="width:auto;padding:4px 8px" data-change="care-t" aria-label="Filter by type"><option value="all">All types</option>${TYPE_ORDER.map(t => `<option ${S.ui.careT === t ? 'selected' : ''}>${t}</option>`).join('')}</select><select class="input" style="width:auto;padding:4px 8px" data-change="care-a" aria-label="Filter by account"><option value="all">All accounts</option>${S.accounts.filter(a => a.platform !== 'whatsapp').map(a => `<option value="${a.id}" ${S.ui.careA === a.id ? 'selected' : ''}>${PLAT[a.platform].name} ${esc(a.handle)}</option>`).join('')}</select></div>
      <div class="queue">${q.map(x => `<div class="qi ${x.id === S.ui.careSel ? 'on' : ''} ${x.status !== 'new' ? 'done' : ''}" data-act="care-sel" data-id="${x.id}">
        <div class="row between"><span class="row" style="gap:6px">${plat(accById(x.acc).platform, 16)}<b class="small">${esc(x.handle)}</b><span class="tiny muted">· ${esc(accById(x.acc).handle)} · ${x.kind}</span></span><span class="tiny muted">${rel(x.at)}</span></div>
        <div class="txt">${piiMark(x.text)}</div>
        <div class="row between">${aiChip(x.ai)}${x.status === 'new' ? `<span class="pill" data-due="${x.due}"></span>` : `<span class="pill good">${x.status}</span>`}</div></div>`).join('') || '<div class="empty">Queue is clear.</div>'}</div></div>
    <div>${m ? careDetail(m) : '<div class="card"><div class="empty">Select a message</div></div>'}</div>
    <div class="side stack">
      <div class="grid g2">${TYPE_ORDER.map(t => `<div class="card typecard" style="border-top-color:var(--${{ good: 'good', blue: 'primary', coral: 'coral', crit: 'crit', dark: 'ink-2' }[TYPE_META[t].color]});cursor:pointer" data-act="tab" data-k="careT" data-v="${S.ui.careT === t ? 'all' : t}"><div class="row between"><span class="small b">${t}</span><span class="n num">${counts[t]}</span></div><div class="tiny muted">first reply ${TYPE_META[t].label}</div></div>`).join('')}</div>
      <div class="card"><div class="hd"><h3>Routing rules</h3></div><div class="bd small stack">${TYPE_ORDER.map(t => `<div><b>${t}</b> → ${TYPE_META[t].act}</div>`).join('')}<div class="note">First-reply targets are proposals for service hours, agreed with CIMB Niaga in week 0.</div></div></div>
    </div></div>`;
};
const piiMark = t => esc(t).replace(/\[(?:nomor|kartu|NIK\/kartu|rekening|no\. HP|email|••••••)[^\]]*\]/g, s => `<mark class="pii" title="Masked personal data">${s}</mark>`);
ONCHANGE['care-t'] = el => { S.ui.careT = el.value; render(); };
ONCHANGE['care-a'] = el => { S.ui.careA = el.value; render(); };
ACT['care-sel'] = el => { S.ui.careSel = el.dataset.id; S.ui.draft = null; render(); };
function careDetail(m) {
  const a = accById(m.acc); const ai = m.ai;
  const tk = m.ticketId ? S.tickets.find(t => t.id === m.ticketId) : null;
  const draft = S.ui.draft && S.ui.draft.id === m.id ? S.ui.draft.text : '';
  const typeActs = {
    Praise: `<button class="btn sm" data-act="care-reshare" data-id="${m.id}">${icon('share', 13)}Ask to reshare</button>${m.permission ? `<button class="btn sm primary" data-act="care-ugc" data-id="${m.id}">${icon('lib', 13)}Add to library & reshare via advocates</button>` : ''}${/mbak|mas |pak |bu |cabang/i.test(m.raw) ? `<button class="btn sm" data-act="care-recog" data-id="${m.id}">${icon('trophy', 13)}Recognise staff internally</button>` : ''}`,
    Question: '',
    Complaint: tk ? `<a class="btn sm" href="#ticket-${tk.id}">${icon('ticket', 13)}${tk.id}</a>` : `<button class="btn sm primary" data-act="care-ticket" data-id="${m.id}">${icon('ticket', 13)}Open ticket</button>`,
    'Fraud risk': `<button class="btn sm danger" data-act="care-fraud" data-id="${m.id}">${icon('shield', 13)}Alert fraud team</button><button class="btn sm" data-act="wave-push">${icon('megaphone', 13)}Push #WaspadaSelalu</button>`,
    'Crisis or viral': `<button class="btn sm danger" data-act="care-escalate" data-id="${m.id}">${icon('alert', 13)}Escalate to Corporate Comms</button>`,
    Spam: `<button class="btn sm danger" data-act="care-hide" data-id="${m.id}">${icon('hide', 13)}Hide & report${/cimb|octo/i.test(m.handle) ? ' impersonator' : ''}</button>`
  };
  return `<div class="card"><div class="hd" style="padding-bottom:10px;border-bottom:1px solid var(--line)"><div class="row">${plat(a.platform, 22)}<div><b>${esc(m.handle)}</b> <span class="small muted">${m.kind} on ${esc(a.handle)} · ${fmtT(m.at)}</span></div></div>${m.status === 'new' ? `<span class="pill" data-due="${m.due}"></span>` : `<span class="pill good">${m.status}</span>`}</div>
    <div class="bd">
      <div class="callout violet small" style="margin-bottom:12px">${icon('spark', 16)}<div class="grow"><b>Alivia AI:</b> ${ai.type} · ${ai.sentiment} · ${ai.product} · urgency ${ai.urgency}${ai.theme ? ' · theme “' + ai.theme + '”' : ''} <span class="muted">(${Math.round(ai.conf * 100)}% · ${esc(ai.why.join('; '))})</span><br><b>Action:</b> ${TYPE_META[ai.type].act} · first reply ${TYPE_META[ai.type].label}${m.pii.length ? `<br><b>Masked:</b> ${m.pii.join(', ')}. ${ai.type === 'Complaint' ? 'Never ask for PIN, OTP or card numbers in public.' : ''}` : ''}</div>
      <select class="input" style="width:auto;padding:3px 6px" data-change="care-retype" data-id="${m.id}" aria-label="Correct the AI type"><option value="">Correct type…</option>${TYPE_ORDER.map(t => `<option>${t}</option>`).join('')}</select></div>
      <div class="thread"><div class="msg">${av(m.handle, 28)}<div class="bub">${piiMark(m.text)}${m.shares ? `<div class="tiny muted mt8">${fmtN(m.shares)} reposts</div>` : ''}</div></div>
        ${m.thread.map((r, ri) => `<div class="msg ${r.from === 'brand' ? 'brand' : ''}">${r.from === 'brand' ? av('CN', 28, '#c8102e') : av(m.handle, 28)}<div class="bub">${esc(r.text)}<div class="tiny muted mt8">${r.from === 'brand' ? esc(a.handle) + ' · approved by ' + esc(r.by) : esc(m.handle)} · ${fmtT(r.at)}${r.from === 'brand' ? deliveryTag(m, ri) : ''}</div></div></div>`).join('')}</div>
      ${m.status !== 'hidden' ? `<div class="hr"></div>
      <label class="fl" for="care-reply">Public reply as ${esc(a.handle)}</label>
      <textarea class="input mt8" id="care-reply" data-input="care-chk" rows="3" placeholder="Draft a reply or let Alivia draft from the approved library">${esc(draft)}</textarea>
      <div id="care-chk" class="mt8"></div>
      <div class="row wrap mt8"><button class="btn ai sm" data-act="care-draft" data-id="${m.id}">${icon('spark', 13)}AI draft from library</button>${typeActs[ai.type]}<span style="flex:1"></span>${m.status === 'new' ? `<button class="btn sm ghost" data-act="care-done" data-id="${m.id}">Close without reply</button>` : ''}<button class="btn sm primary" data-act="care-post" data-id="${m.id}">${icon('send', 13)}Approve & post</button></div>` : '<div class="callout info mt12">Hidden on the platform and reported. No public reply needed.</div>'}
      ${tk ? `<div class="callout info mt12 small">${icon('ticket', 14)}<div><b><a href="#ticket-${tk.id}">${tk.id}</a></b> · ${esc(tk.owner)} · ${esc(clockOf(tk).label)} · ${esc(tk.contact)}</div></div>` : ''}
    </div></div>`;
}
VIEWS.care_after = () => { if (S.ui.careSel) ONINPUT['care-chk'](); };
ONINPUT['care-chk'] = () => { const ta = $('#care-reply'); const out = $('#care-chk'); if (!ta || !out) return; const m = S.inbox.find(x => x.id === S.ui.careSel); S.ui.draft = { id: m.id, text: ta.value }; out.innerHTML = ta.value.trim() ? checkPanel(ta.value, { kind: 'reply' }) : ''; };
ONCHANGE['care-retype'] = el => { if (!el.value) return; const m = S.inbox.find(x => x.id === el.dataset.id); m.ai.type = el.value; m.ai.why = ['corrected by ' + ROLES[S.role].user]; m.due = slaDue(m); toast('Type corrected; Alivia learns from corrections'); render(); };
function replyFallback(m) {
  let t = REPLY_LIB[m.ai.type] || '';
  t = t.replace('{answer}', KB_ANSWERS[m.ai.product] || KB_ANSWERS.default).replace('{ticket}', m.ticketId || '[dibuat saat dikirim]');
  return t;
}
ACT['care-draft'] = async el => {
  const m = S.inbox.find(x => x.id === el.dataset.id);
  if (m.ai.type === 'Spam') { toast('Spam gets no public reply: hide and report it', 'hide'); return; }
  const ta = $('#care-reply'); ta.value = AI.live ? 'Menulis…' : '';
  const base = replyFallback(m);
  const txt = await AI.write(`You are the social care desk of PT Bank CIMB Niaga Tbk replying publicly as ${accById(m.acc).handle} on ${PLAT[accById(m.acc).platform].name}. Customer message (personal data already masked): "${m.text}". AI triage: ${m.ai.type}, ${m.ai.sentiment}, product ${m.ai.product}.
Start from this approved library reply and adapt it lightly to the message; keep its meaning and any ticket number placeholder exactly: "${base}".
Rules: casual-polite Indonesian ("Kak"), max 45 words, never ask for PIN, OTP, password, card or account numbers in public, no promises of outcomes or timelines, no other numbers or facts. Output only the reply text.`, () => base, t => { ta.value = t; });
  ta.value = txt; ONINPUT['care-chk']();
};
function postReply(m, text, by) {
  m.thread.push({ from: 'brand', at: Date.now(), text, by: by || ROLES[S.role].user.split(' ')[0] + ' ' + ROLES[S.role].user.split(' ')[1][0] + '.' });
  if (!m.firstReplyAt) {
    m.firstReplyAt = Date.now();
    const p = accById(m.acc).platform; const fr = S.listen.firstReply[p];
    if (fr) { const mins = (m.firstReplyAt - m.at) / 60000; fr[0] = (fr[0] * fr[1] + mins) / (fr[1] + 1); fr[1]++; }
  }
}
ACT['care-post'] = el => {
  const m = S.inbox.find(x => x.id === el.dataset.id); const ta = $('#care-reply'); let text = ta.value.trim();
  if (S.role === 'compliance' || S.role === 'km' || S.role === 'hr' || S.role === 'syariah') { if (!(S.role === 'km' && m.acc === 'ig_km') && !(S.role === 'hr' && m.acc === 'ig_hy') && !(S.role === 'syariah' && m.acc === 'ig_sy')) { lockMsg('reply on ' + accById(m.acc).handle); return; } }
  if (!text) { toast('Write or draft a reply first', 'alert'); return; }
  if (m.ai.type === 'Complaint' && !m.ticketId) { const t = createTicket(m); text = text.replace(/\[dibuat saat dikirim\]/g, t.id); }
  const chk = checkCompliance(text, { kind: 'reply' }); logAudit('Care reply · ' + accById(m.acc).handle, text, chk);
  if (chk.verdict === 'blocked') { ONINPUT['care-chk'](); toast('Blocked by the AI check; fix the flagged words first', 'x'); return; }
  postReply(m, text);
  if (m.status === 'new') m.status = m.ticketId ? 'ticketed' : m.ai.type === 'Crisis or viral' ? 'escalated' : 'replied';
  S.ui.draft = null;
  toast(`Reply posted on ${accById(m.acc).handle} · ${(m.firstReplyAt - m.at) / 60000 <= (TYPE_META[m.ai.type].sla === 'same' ? 1440 : TYPE_META[m.ai.type].sla) ? 'within target' : 'after target'}`, 'send');
  const next = careQueue().find(x => x.status === 'new'); if (next && (S.ui.careF || 'open') === 'open') S.ui.careSel = next.id;
  render();
};
function createTicket(m, when) {
  when = when || Date.now();
  const prod = m.ai.product === 'General' ? 'OCTO' : m.ai.product;
  const owner = m.ai.product === 'Branch' ? 'Branch operations' : (OWNERS[prod] || 'Digital banking care');
  const t = { id: 'SM-' + (++S.ticketSeq), createdAt: when, src: { acc: m.acc, kind: m.kind, handle: m.handle }, issue: m.text.length > 70 ? m.text.slice(0, 68) + '…' : m.text, product: prod === 'Branch' ? 'Tabungan' : prod, theme: m.ai.theme || detectTheme(m.raw), sentiment: 'Negative', priority: m.ai.urgency === 'high' || m.ai.urgency === 'urgent' ? 'High' : 'Medium', owner, contact: 'Moved to Ask OCTO WhatsApp', status: 'waiting', docsAt: null, extended: false, cms: 'CMS-2026-' + (118400 + S.ticketSeq % 1000), step: 5, log: [] };
  t.log = [{ at: m.at, text: `Captured from ${m.kind} on ${accById(m.acc).handle}`, by: 'Lume' }, { at: m.at + 30000, text: `Classified: Complaint · ${m.ai.sentiment} · ${t.priority} · ${t.product} / ${t.theme}${m.pii.length ? '. Personal data masked (' + m.pii.join(', ') + ')' : ''}`, by: 'Alivia AI' }, { at: when, text: 'Ticket created in CIMB Niaga complaint system: ' + t.cms, by: 'Lume API' }, { at: when, text: 'Routed to ' + owner + '; customer invited to Ask OCTO WhatsApp', by: 'Alivia AI' }];
  S.tickets.unshift(t); S.tickets.sort((a, b) => b.createdAt - a.createdAt); m.ticketId = t.id; m.status = 'ticketed';
  S.listen.themes[t.theme] = (S.listen.themes[t.theme] || 0) + 1;
  return t;
}
ACT['care-ticket'] = el => { const m = S.inbox.find(x => x.id === el.dataset.id); if (S.role === 'compliance') { lockMsg('open tickets'); return; } const t = createTicket(m); toast(`${t.id} created in the complaint system and routed to ${t.owner}`, 'ticket'); S.ui.draft = { id: m.id, text: replyFallback(m) }; render(); };
ACT['care-reshare'] = el => { const m = S.inbox.find(x => x.id === el.dataset.id); S.ui.draft = { id: m.id, text: 'Boleh ceritanya kami bagikan di akun CIMB Niaga?' }; render(); toast('Permission request drafted; approve & post to send'); setTimeout(() => { const mm = S.inbox.find(x => x.id === m.id); if (mm && mm.thread.some(r => r.text.includes('Boleh ceritanya')) && !mm.permission) { mm.thread.push({ from: 'customer', at: Date.now(), text: 'Boleh banget!' }); mm.permission = true; toast(m.handle + ' gave permission to reshare', 'check'); if (parseHash().r === 'care') render(); } }, 9000); };
ACT['care-ugc'] = el => {
  const m = S.inbox.find(x => x.id === el.dataset.id);
  if (S.assets.some(a => a.fromMsg === m.id)) { toast('Already in the library'); return; }
  const a = { id: uid('as'), type: 'UGC', title: 'Customer praise · ' + m.text.slice(0, 34), format: 'image', product: m.ai.product === 'General' ? 'OCTO' : m.ai.product, camp: 'octo', status: 'Cleared', uses: 0, added: Date.now(), tags: ['permission granted', 'praise'], source: m.handle + ' · ' + PLAT[accById(m.acc).platform].name, fromMsg: m.id };
  S.assets.unshift(a);
  openTaskWizard({ name: 'Reshare: happy customer story', playbook: 'OCTO campaigns', goal: 'Reshare a customer story (permission on file) across the account family and advocates', circles: ['KOS'], assets: [a.id], product: a.product, template: 'Cerita nasabah yang bikin semangat: {cerita} {link} {topik}' });
  toast('Added to the library as UGC (permission on file)', 'lib');
};
ACT['care-recog'] = el => { notify('Praise for a named branch employee shared with the branch head and HR', 'trophy'); toast('Shared internally with the branch head and HR; staff recognised', 'trophy'); };
ACT['care-fraud'] = el => { const m = S.inbox.find(x => x.id === el.dataset.id); S.ui.draft = { id: m.id, text: REPLY_LIB['Fraud risk'] }; notify('Fraud team alerted: ' + m.text.slice(0, 60), 'shield', '#care'); toast('Fraud team alerted; warning reply drafted', 'shield'); render(); };
ACT['care-escalate'] = el => { const m = S.inbox.find(x => x.id === el.dataset.id); S.ui.draft = { id: m.id, text: REPLY_LIB['Crisis or viral'] }; m.escalated = Date.now(); (S.negLog = S.negLog || []).unshift({ at: Date.now(), src: accById(m.acc).handle, text: m.text, reach: m.shares || 0, action: 'Escalated to Corporate Comms; holding reply' }); notify('Escalated to Corporate Comms: ' + m.text.slice(0, 60), 'alert', '#care'); toast('Corporate Comms paged; holding reply drafted; logged for the OJK negative-coverage report', 'alert'); render(); };
ACT['care-hide'] = el => { const m = S.inbox.find(x => x.id === el.dataset.id); m.status = 'hidden'; if (/cimb|octo/i.test(m.handle) && !S.watch.some(w => w.handle === m.handle)) S.watch.unshift({ id: uid('w'), platform: accById(m.acc).platform, handle: m.handle, seen: Date.now(), reason: 'Impersonates CIMB Niaga in comments: ' + m.text.slice(0, 50), reach: 500, status: 'Reported' }); toast('Hidden and reported to the platform', 'hide'); render(); };
ACT['care-done'] = el => { const m = S.inbox.find(x => x.id === el.dataset.id); m.status = 'closed'; render(); };
ACT['sim-open'] = () => openModal('Simulate an incoming message', `<p class="ink2 small">Type any message the way a customer would, in Bahasa or English. Alivia classifies it, masks personal data and puts it in the queue.</p>
  <div class="grid g2"><label class="fl">Account<select class="input" id="sim-acc">${S.accounts.filter(a => a.platform !== 'whatsapp').map(a => `<option value="${a.id}">${PLAT[a.platform].name} ${esc(a.handle)}</option>`).join('')}</select></label><label class="fl">From handle<input class="input" id="sim-h" value="@pe***an"></label></div>
  <label class="fl mt12">Message<textarea class="input" id="sim-txt" data-input="sim-prev" rows="3" placeholder="e.g. Saldo saya terpotong tapi transfer gagal, no rek 7060123456"></textarea></label>
  <div id="sim-prev" class="mt8"></div>
  <div class="small b ink2 mt12">Or pick a sample</div><div class="stack mt8">${SIM_POOL.map((s, i) => `<button class="btn sm" style="justify-content:flex-start;white-space:normal;text-align:left" data-act="sim-pick" data-i="${i}">${plat(accById(s[0]).platform, 14)}${esc(s[3])}</button>`).join('')}</div>`,
  `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="sim-add">${icon('plus', 14)}Add to queue</button>`);
ONINPUT['sim-prev'] = () => { const t = $('#sim-txt').value; if (!t.trim()) { $('#sim-prev').innerHTML = ''; return; } const ai = classify(t, { handle: $('#sim-h').value }); const mk = maskPII(t); $('#sim-prev').innerHTML = `<div class="callout violet small">${icon('spark', 14)}<div>${aiChip(ai)} · ${ai.product} · urgency ${ai.urgency} · first reply ${TYPE_META[ai.type].label}${mk.found.length ? `<br>Masked: ${piiMark(mk.text)}` : ''}</div></div>`; };
ACT['sim-pick'] = el => { const s = SIM_POOL[+el.dataset.i]; $('#sim-acc').value = s[0]; $('#sim-h').value = s[2]; $('#sim-txt').value = s[3]; ONINPUT['sim-prev'](); };
ACT['sim-add'] = () => {
  const raw = $('#sim-txt').value.trim(); if (!raw) { toast('Type a message', 'alert'); return; }
  const m = prepInbox({ id: uid('m'), at: Date.now(), acc: $('#sim-acc').value, kind: 'Comment', handle: maskHandle($('#sim-h').value || '@pe***an'), raw, status: 'new', thread: [] });
  S.inbox.unshift(m);
  S.listen.byAcc[m.acc] = (S.listen.byAcc[m.acc] || 0) + 1;
  S.listen.sent[m.ai.sentiment === 'positive' ? 'pos' : m.ai.sentiment === 'negative' ? 'neg' : 'neu']++;
  const h = new Date().getHours(); if (S.listen.hourly[h] != null) S.listen.hourly[h]++;
  if (m.ai.urgency === 'urgent') notify(`${m.ai.type}: ${m.text.slice(0, 60)}`, 'alert', '#care');
  closeModal(); S.ui.careSel = m.id; S.ui.careF = 'open'; S.ui.careT = 'all';
  toast(`New ${m.ai.type.toLowerCase()} from ${accById(m.acc).handle} · first reply ${TYPE_META[m.ai.type].label}`, 'care');
  go('#care');
};

/* ---------- Social tickets ---------- */
const STEPS = ['Capture', 'Classify', 'Reply', 'Ticket', 'Route', 'Resolve', 'Close', 'Report'];
const T_STATUS = { open: ['Open', ''], waiting: ['Waiting for documents', 'warn'], progress: ['In progress', 'blue'], resolved: ['Resolved', 'good'], closed: ['Closed', 'good'] };
function clockMini(t) { const c = clockOf(t); if (c.state === 'nodocs') return '<span class="small muted">Not started · documents pending</span>'; const col = { ok: 'good', risk: 'warn', overdue: 'crit', met: 'good', missed: 'crit' }[c.state]; return `<div style="min-width:150px"><div class="progress ${col}"><i style="width:${Math.min(100, c.used / c.total * 100)}%"></i></div><div class="tiny ${c.state === 'overdue' || c.state === 'missed' ? '' : 'muted'}" style="${c.state === 'overdue' || c.state === 'missed' ? 'color:var(--crit-ink);font-weight:700' : c.state === 'risk' ? 'color:var(--warn-ink);font-weight:700' : ''}">${c.label}${t.extended ? ' · extended' : ''}</div></div>`; }
VIEWS.tickets = p => {
  if (p.id) return ticketDetail(S.tickets.find(t => t.id === p.id));
  const f = S.ui.tkF || 'open';
  const isOpen = t => !t.closedAt;
  const fl = { open: t => isOpen(t), risk: t => isOpen(t) && ['risk', 'overdue'].includes(clockOf(t).state), waiting: t => t.status === 'waiting', closed: t => !isOpen(t), all: () => true };
  const list = S.tickets.filter(fl[f]);
  const open = S.tickets.filter(isOpen); const closedM = S.tickets.filter(t => t.closedAt && Date.now() - t.closedAt < 30 * DAY);
  return head('Listen & resolve', 'Social tickets', 'From social complaint to closed ticket. Lume and Alivia feed CIMB Niaga’s existing complaint system and Ask OCTO through an API; they do not replace them.') +
    `<div class="grid g6">
      <div class="card kpi"><div class="v num">${open.length}</div><div class="l">open social tickets</div></div>
      <div class="card kpi"><div class="v num">${open.filter(t => t.status === 'waiting').length}</div><div class="l">waiting for documents</div><div class="d">clock not started</div></div>
      <div class="card kpi ${open.some(t => clockOf(t).state === 'risk') ? 'warn' : ''}"><div class="v num">${open.filter(t => clockOf(t).state === 'risk').length}</div><div class="l">≤ 2 working days left</div><div class="d">alerts fire before the deadline</div></div>
      <div class="card kpi ${open.some(t => clockOf(t).state === 'overdue') ? 'alert' : ''}"><div class="v num">${open.filter(t => clockOf(t).state === 'overdue').length}</div><div class="l">overdue</div></div>
      <div class="card kpi"><div class="v num">${pct(closedM.filter(t => clockOf(t).state === 'met').length / Math.max(1, closedM.length), 0)}</div><div class="l">closed on time, 30 days</div><div class="d">${closedM.length} closed</div></div>
      <div class="card kpi"><div class="v num">${(closedM.reduce((a, t) => a + (t.csat || 0), 0) / Math.max(1, closedM.filter(t => t.csat).length)).toFixed(1)}</div><div class="l">satisfaction check (1–5)</div></div>
    </div>
    <div class="callout info mt12 small">${icon('clock', 16)}<div><b>OJK resolution deadline (POJK 22/2023):</b> 10 working days from complete documents, +10 with written notice. Lume shows every social ticket’s clock and alerts before the deadline. Working days skip weekends and national holidays (calendar configured with CIMB Niaga).</div></div>
    <div class="row between mt12" style="margin-bottom:10px"><div class="seg">${[['open', 'Open'], ['risk', 'At risk'], ['waiting', 'Waiting docs'], ['closed', 'Closed'], ['all', 'All']].map(([k, l]) => `<button class="${f === k ? 'on' : ''}" data-act="tab" data-k="tkF" data-v="${k}">${l}</button>`).join('')}</div><span class="small muted">${list.length} tickets</span></div>
    <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ticket</th><th>Source</th><th>Issue</th><th>Theme</th><th>Priority</th><th>Owner</th><th>Status</th><th>OJK clock</th></tr></thead><tbody>
    ${list.slice(0, 80).map(t => `<tr class="click" data-act="go" data-href="#ticket-${t.id}"><td><b>${t.id}</b><div class="tiny muted">${t.cms}</div></td><td><span class="row" style="gap:6px">${plat(accById(t.src.acc).platform, 16)}<span class="small">${t.src.kind}<br><span class="tiny muted">${fmtDT(t.createdAt)}</span></span></span></td><td class="small">${esc(t.issue)}</td><td class="small">${esc(t.theme)}</td><td><span class="pill ${t.priority === 'High' ? 'crit' : t.priority === 'Medium' ? 'warn' : ''}">${t.priority}</span></td><td class="small">${esc(t.owner)}</td><td class="small"><span class="sdot ${T_STATUS[t.status][1] === 'blue' ? 'blue' : T_STATUS[t.status][1]}"></span>${T_STATUS[t.status][0]}</td><td>${clockMini(t)}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">No tickets here</td></tr>'}
    </tbody></table></div></div>`;
};
function ticketDetail(t) {
  if (!t) return '<div class="empty">Ticket not found. <a href="#tickets">Back to tickets</a></div>';
  const c = clockOf(t); const src = accById(t.src.acc);
  const cells = [...Array(20)].map((_, i) => { const ext = i >= 10; const used = i < c.used; const cls = (ext ? 'ext ' : '') + (used ? 'used ' + (c.state === 'overdue' || c.state === 'missed' ? 'crit' : c.state === 'risk' ? 'warn' : '') : ''); return `<i class="${cls}" data-tip="Working day ${i + 1}${ext ? ' (extension, with written notice)' : ''}"></i>`; }).join('');
  const msg = S.inbox.find(m => m.ticketId === t.id);
  const isCare = S.role === 'care' || S.role === 'brand';
  return `<div class="pagehead"><div><div class="crumb"><a href="#tickets">Social tickets</a> / <b>Ticket ${t.id}</b></div><p>${esc(t.issue)} · ${T_STATUS[t.status][0]}</p></div><div class="toolbar">${!t.closedAt ? `${!t.docsAt ? `<button class="btn" data-act="tk-docs" data-id="${t.id}">${icon('check', 14)}Documents complete</button>` : ''}${t.docsAt && !t.extended ? `<button class="btn" data-act="tk-extend" data-id="${t.id}">${icon('clock', 14)}Extend +10 (written notice)</button>` : ''}<button class="btn" data-act="tk-route" data-id="${t.id}">Re-route</button>${t.status !== 'resolved' ? `<button class="btn primary" data-act="tk-resolve" data-id="${t.id}">${icon('check', 14)}Mark resolved</button>` : `<button class="btn primary" data-act="tk-close" data-id="${t.id}">${icon('send', 14)}Close & public follow-up</button>`}` : '<span class="pill good">Closed</span>'}</div></div>
  <div class="steps">${STEPS.map((s, i) => `<div class="step ${i + 1 < t.step || (t.closedAt && i < 8) ? 'done' : i + 1 === t.step ? 'cur' : ''}"><div class="k">${i + 1}</div><b>${s}</b></div>`).join('')}</div>
  <div class="grid g2 mt12">
    <div class="card"><div class="hd"><h3>Ticket ${t.id}</h3><span class="pill">${t.cms}</span></div><div class="bd"><dl class="kv">
      <dt>Source</dt><dd><span class="row" style="gap:6px">${plat(src.platform, 16)}${t.src.kind} of ${esc(src.handle)} by ${esc(t.src.handle)}, ${fmtT(t.createdAt)} ${fmtD(t.createdAt)}</span></dd>
      <dt>Issue</dt><dd>${esc(t.issue)}</dd><dt>Product · theme</dt><dd>${esc(t.product)} · ${esc(t.theme)}</dd>
      <dt>Sentiment · priority</dt><dd>${t.sentiment} · <span class="pill ${t.priority === 'High' ? 'crit' : 'warn'}">${t.priority}</span></dd>
      <dt>Owner</dt><dd>${esc(t.owner)}</dd><dt>Customer contact</dt><dd>${esc(t.contact)}</dd>
      <dt>Status</dt><dd>${T_STATUS[t.status][0]}${t.docsAt ? ' · ' + c.label : ''}</dd>${t.csat ? `<dt>Satisfaction</dt><dd>${'★'.repeat(t.csat)}${'☆'.repeat(5 - t.csat)}</dd>` : ''}</dl>
      ${msg ? `<div class="hr"></div><div class="small b ink2">Original message (masked)</div><div class="preview-text small mt8">${piiMark(msg.text)}</div>` : ''}</div></div>
    <div class="card"><div class="hd"><h3>OJK resolution deadline</h3><span class="sub">POJK 22/2023</span></div><div class="bd">
      <div class="clock">${cells}</div><div class="row between tiny muted mt8"><span>10 working days from complete documents</span><span>+10 with written notice</span></div>
      <div class="mt12">${c.state === 'nodocs' ? `<div class="callout warn small">${icon('clock', 14)}<div>The clock starts when the customer’s documents are complete. Record it once Ask OCTO has them.</div></div>` : `<div class="callout ${c.state === 'overdue' || c.state === 'missed' ? 'crit' : c.state === 'risk' ? 'warn' : 'info'} small">${icon('clock', 14)}<div><b>${c.label}</b> · deadline ${fmtD(c.dl)} ${new Date(c.dl).getFullYear()}${c.state === 'risk' ? '. Alert sent to ' + esc(t.owner) + ' and the care desk lead.' : ''}</div></div>`}</div>
      <div class="dark-panel mt12 small"><b>Ready for SEOJK 20/2025.</b> From January 2027 banks report every half-year on complaint causes (top 10) and negative media coverage from their own monitoring. This ticket feeds that report directly. <a href="#reports" style="color:#9cc2ff">Open the report</a></div>
    </div></div>
  </div>
  <div class="card mt12"><div class="hd"><h3>Timeline</h3><span class="sub">full audit trail</span></div><div class="bd"><div class="timeline">${[...t.log].sort((a, b) => a.at - b.at).map(l => `<div class="tl"><span class="d"></span><div><div class="small"><b>${esc(l.text)}</b></div><div class="tiny muted">${fmtDT(l.at)} · ${esc(l.by)}</div></div></div>`).join('')}</div></div></div>`;
}
const tkById = id => S.tickets.find(t => t.id === id);
ACT['tk-docs'] = el => { const t = tkById(el.dataset.id); t.docsAt = Date.now(); t.status = 'progress'; t.step = 6; t.log.push({ at: Date.now(), text: 'Documents complete; OJK clock started (10 working days)', by: ROLES[S.role].user }); toast('Clock started · deadline ' + fmtD(deadlineOf(t))); render(); };
ACT['tk-extend'] = el => openModal('Extend by 10 working days', `<p>POJK 22/2023 allows one extension of 10 working days with written notice to the customer. Record the notice:</p><textarea class="input" id="ext-note" rows="3">Kami memerlukan waktu tambahan untuk menyelesaikan pengaduan Bapak/Ibu karena memerlukan konfirmasi pihak ketiga. Penyelesaian paling lambat ${fmtDY(addWorkdays(tkById(el.dataset.id).docsAt, 20))}.</textarea>`, `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="tk-extend-yes" data-id="${el.dataset.id}">Send notice & extend</button>`);
ACT['tk-extend-yes'] = el => { const t = tkById(el.dataset.id); t.extended = true; t.log.push({ at: Date.now(), text: 'Written notice sent via Ask OCTO; deadline extended by 10 working days', by: ROLES[S.role].user }); closeModal(); toast('Extended · new deadline ' + fmtD(deadlineOf(t))); render(); };
ACT['tk-route'] = el => openModal('Re-route ticket', `<label class="fl">Owner team<select class="input" id="rt-owner">${['Digital banking care', 'Cards', 'Mortgage', 'Branch operations', 'Fraud team', 'Syariah care', 'Other'].map(o => `<option>${o}</option>`).join('')}</select></label>`, `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="tk-route-yes" data-id="${el.dataset.id}">Re-route</button>`);
ACT['tk-route-yes'] = el => { const t = tkById(el.dataset.id); t.owner = $('#rt-owner').value; t.log.push({ at: Date.now(), text: 'Re-routed to ' + t.owner, by: ROLES[S.role].user }); closeModal(); toast('Re-routed to ' + t.owner); render(); };
ACT['tk-resolve'] = el => { const t = tkById(el.dataset.id); if (!t.docsAt) t.docsAt = Date.now(); t.status = 'resolved'; t.step = 7; t.log.push({ at: Date.now(), text: 'Resolved by ' + t.owner + '; customer informed via Ask OCTO', by: t.owner }); toast('Resolved. Close it to post the public follow-up.'); render(); };
ACT['tk-close'] = el => {
  const t = tkById(el.dataset.id);
  openModal('Close ticket ' + t.id, `<label class="fl">Public follow-up on ${esc(accById(t.src.acc).handle)}<textarea class="input" id="fu-txt" rows="3">Update: kendala Kakak sudah selesai ditangani. Terima kasih atas kesabarannya, Kak.</textarea></label><label class="fl mt12">Satisfaction check result (1–5)<select class="input" id="fu-csat"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></label>`, `<button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="tk-close-yes" data-id="${t.id}">Post follow-up & close</button>`);
};
ACT['tk-close-yes'] = el => {
  const t = tkById(el.dataset.id); const txt = $('#fu-txt').value; const chk = checkCompliance(txt, { kind: 'reply' }); logAudit('Ticket follow-up · ' + t.id, txt, chk);
  if (chk.verdict === 'blocked') { toast('Follow-up blocked by the AI check', 'x'); return; }
  t.closedAt = Date.now(); t.status = 'closed'; t.step = 8; t.csat = +$('#fu-csat').value; t.publicFollowUp = true;
  t.log.push({ at: Date.now(), text: 'Closed; public follow-up posted; satisfaction ' + t.csat + '/5', by: ROLES[S.role].user }, { at: Date.now(), text: 'Added to the half-year complaint report (theme: ' + t.theme + ')', by: 'Lume' });
  const m = S.inbox.find(x => x.ticketId === t.id); if (m) { m.thread.push({ from: 'brand', at: Date.now(), text: txt, by: 'care desk' }); m.status = 'closed'; }
  closeModal(); toast(t.id + ' closed ' + (clockOf(t).state === 'met' ? 'within' : 'after') + ' the OJK deadline'); render();
};
