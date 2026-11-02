/* ================= Advocate app (Bahasa), shown in the right drawer ================= */
function phoneInit() { return { adv: 'a0', scr: 'tasks', task: null, sel: [], cap: '', plats: [], done: null }; }
const PH_DEMO = () => {
  const kos = S.advocates.find(a => a.id === 'a0');
  const koc = S.advocates.find(a => a.circle === 'KOC' && a.optIn && a.region === 'Jakarta');
  const kol = S.advocates.find(a => a.circle === 'KOL');
  return [kos, koc, kol].filter(Boolean);
};
function phTasks(adv) { return S.tasks.filter(t => ['progress'].includes(t.status) && t.exec.some(e => e.adv === adv.id)).map(t => ({ t, e: t.exec.find(e => e.adv === adv.id) })); }
function renderDrawer() {
  let d = $('#drawer');
  if (!S.ui.drawer) { if (d) d.remove(); return; }
  if (!d) { d = document.createElement('aside'); d.id = 'drawer'; d.className = 'drawer'; d.setAttribute('aria-label', 'Advocate app'); document.body.appendChild(d); }
  const P = S.phone; const adv = advById(P.adv);
  d.innerHTML = `<div class="dh"><div class="row between"><b>Advocate app</b><button class="iconbtn" data-act="drawer" aria-label="Close">${icon('x', 16)}</button></div>
    <label class="row small" style="gap:6px"><span class="muted">View as</span><select class="input" style="padding:4px 8px" data-change="ph-adv" aria-label="Advocate">${PH_DEMO().map(a => `<option value="${a.id}" ${a.id === P.adv ? 'selected' : ''}>${esc(a.name)} · ${a.circle} · ${esc(a.unit)}</option>`).join('')}</select></label>
    <div class="tiny muted">What advocates see on their phone, in Bahasa. Posting here updates the console live.</div></div>
    <div class="db"><div class="phone"><div class="screen"><div class="sbar"><span>${fmtT(Date.now())}</span><span class="row" style="gap:4px"><svg width="16" height="10" viewBox="0 0 16 10"><rect x="0" y="6" width="3" height="4" rx="1" fill="#131a27"/><rect x="4.5" y="4" width="3" height="6" rx="1" fill="#131a27"/><rect x="9" y="2" width="3" height="8" rx="1" fill="#131a27"/><rect x="13" y="0" width="3" height="10" rx="1" fill="#131a27"/></svg><svg width="22" height="11" viewBox="0 0 22 11"><rect x=".5" y=".5" width="19" height="10" rx="2.5" fill="none" stroke="#131a27"/><rect x="2" y="2" width="14" height="7" rx="1.5" fill="#131a27"/></svg></span></div>${phScreen(adv)}</div></div></div>`;
}
function phScreen(adv) {
  const P = S.phone;
  const tabs = `<nav class="ph-tabs">${[['tasks', 'task', 'Tugas'], ['lib', 'lib', 'Pustaka'], ['points', 'trophy', 'Poin'], ['profile', 'user', 'Profil']].map(([k, ic, l]) => `<button class="${P.scr === k || (k === 'tasks' && ['task', 'posting', 'done'].includes(P.scr)) ? 'on' : ''}" data-act="ph-tab" data-v="${k}">${icon(ic, 20)}${l}</button>`).join('')}</nav>`;
  if (!adv.optIn && P.scr !== 'profile') return `<div class="ph-top"><div class="t">Lume</div></div><div class="ph-body"><div class="ph-card" style="text-align:center"><b>Kamu sedang tidak ikut program advokat</b><p class="small ink2">Tidak ada tugas yang dikirim. Kamu bisa ikut lagi kapan saja dari Profil.</p><button class="ph-btn sec" data-act="ph-tab" data-v="profile">Buka Profil</button></div></div>` + tabs;
  if (P.scr === 'tasks') {
    const list = phTasks(adv); const pend = list.filter(x => x.e.st === 'pending'); const done = list.filter(x => x.e.st === 'done');
    return `<div class="ph-top"><div class="row between"><div><div class="tiny muted">Halo,</div><div class="t">${esc(adv.name.split(' ')[0])}</div></div><span class="pill violet">${icon('trophy', 12)}${fmtN(adv.points)} poin</span></div></div>
    <div class="ph-body">${pend.length ? `<div class="small b ink2">Tugas baru (${pend.length})</div>` : `<div class="ph-card small ink2" style="text-align:center">Tidak ada tugas baru. Mantap!</div>`}
    ${pend.map(({ t }) => `<div class="ph-card task" data-act="ph-open" data-id="${t.id}"><div class="row between"><span class="pill blue">Tugas baru · Lume</span>${t.paid ? '<span class="pill coral">Berbayar</span>' : `<span class="pill violet">+${t.points} poin</span>`}</div><div class="b mt8" style="font-size:14px">${esc(t.name)}</div><div class="small ink2">Batas: ${DOW_ID[new Date(t.deadline).getDay()]} ${fmtT(t.deadline)} · ${t.channels.map(c => PLAT[c].name).join(', ')}</div><div class="row mt8" style="gap:4px">${t.assets.slice(0, 3).map(id => assetById(id)).filter(Boolean).map(a => `<div style="width:54px;height:40px;border-radius:6px;overflow:hidden">${thumb(a)}</div>`).join('')}</div></div>`).join('')}
    ${done.length ? `<div class="small b ink2 mt8">Selesai (${done.length})</div>` + done.map(({ t, e }) => `<div class="ph-card"><div class="row between"><b class="small">${esc(t.name)}</b><span class="okchip">${icon('check', 12)}Terposting</span></div><div class="tiny muted mt8">${e.plats.map(p => PLAT[p].name).join(' & ')} · ${fmtN(e.views)} views · ${fmtN(e.clicks)} klik</div></div>`).join('') : ''}</div>` + tabs;
  }
  if (P.scr === 'task') {
    const t = taskById(P.task); if (!t) { P.scr = 'tasks'; return phScreen(adv); }
    const ctx = { product: t.product, paid: t.paid, disclosure: t.disclosure, kind: 'caption' };
    const chk = P.cap ? checkCompliance(P.cap, ctx) : null;
    const ready = chk && chk.verdict !== 'blocked' && P.sel.length && P.plats.length;
    return `<div class="ph-top"><div class="row"><button class="iconbtn" data-act="ph-tab" data-v="tasks" aria-label="Kembali">${icon('back', 18)}</button><div><div class="tiny muted">Tugas baru · Lume</div><div class="t" style="font-size:14px">${esc(t.name)}</div></div></div></div>
    <div class="ph-body">
      <div class="ph-card small"><div class="ink2">${esc(t.goal)}</div><div class="mt8"><b>Batas:</b> ${DOW_ID[new Date(t.deadline).getDay()]}, ${new Date(t.deadline).getDate()} ${MON[new Date(t.deadline).getMonth()]} ${fmtT(t.deadline)} · ${t.channels.map(c => PLAT[c].name).join(', ')}</div>${t.paid || t.disclosure ? `<div class="mt8 tiny" style="color:#a8441a"><b>Wajib #iklan:</b> ${t.paid ? 'tugas berbayar (POJK 6/2026)' : 'tugas berhadiah poin'}</div>` : ''}</div>
      <div class="ph-card"><div class="small b">1. Pilih materi resmi</div><div class="tiny muted">Sudah lolos cek, siap dipakai</div><div class="ph-assets mt8">${t.assets.map(id => assetById(id)).filter(Boolean).map(a => `<div class="a ${P.sel.includes(a.id) ? 'on' : ''}" data-act="ph-asset" data-id="${a.id}">${thumb(a, false, P.band ? phBand(adv) : '')}${P.sel.includes(a.id) ? `<span class="ck">${icon('check', 11, 3)}</span>` : ''}</div>`).join('')}</div>
        <label class="row between small mt8"><span>Tambahkan ${adv.circle === 'KOS' ? 'nama cabang' : 'nama kota'} di poster<br><span class="tiny muted">Template poster dari Harbor, teks lain terkunci</span></span><button class="switch ${P.band ? 'on' : ''}" data-act="ph-band" aria-label="Personalisasi poster"></button></label></div>
      <div class="ph-card"><div class="small b">2. Caption dalam Bahasa</div>
        <textarea class="input mt8 small" id="ph-cap" data-input="ph-cap" rows="5" placeholder="Tulis sendiri atau buat dengan AI">${esc(P.cap)}</textarea>
        <button class="ph-btn ai mt8" data-act="ph-ai">${icon('spark', 14)} Buat caption dengan AI</button>
        <div id="ph-chk" class="mt8">${phChk(chk)}</div></div>
      <div class="ph-card"><div class="small b">3. Pilih akun</div><div class="stack mt8">${t.channels.map(c => adv.acc[c] ? `<label class="row between small"><span class="row" style="gap:6px">${plat(c, 18)}${esc(adv.acc[c])}</span><button class="switch ${P.plats.includes(c) ? 'on' : ''}" data-act="ph-plat" data-v="${c}" aria-label="${PLAT[c].name}"></button></label>` : `<div class="row between small muted"><span class="row" style="gap:6px">${plat(c, 18)}${PLAT[c].name} belum terhubung</span><button class="btn sm" data-act="ph-connect" data-v="${c}">Hubungkan</button></div>`).join('')}</div></div>
      <button class="ph-btn" data-act="ph-post" ${ready ? '' : 'disabled'}>${icon('send', 14)} Bagikan sekarang</button>
      <button class="btn ghost sm" data-act="ph-ignore" style="justify-self:center">Abaikan tugas ini</button>
    </div>` + tabs;
  }
  if (P.scr === 'posting') return `<div class="ph-top"><div class="t">Memposting…</div></div><div class="ph-body"><div class="ph-success"><div class="spinner"></div><div class="small ink2">Mengirim ke ${P.plats.map(p => PLAT[p].name).join(' & ')} dan menyimpan link ke Lume</div></div></div>` + tabs;
  if (P.scr === 'done') {
    const t = taskById(P.done.task);
    return `<div class="ph-top"><div class="t">Berhasil</div></div><div class="ph-body"><div class="ph-success"><div class="big">${icon('check', 34, 2.6)}</div><b style="font-size:16px">Terposting!</b><div class="small ink2">${esc(t.name)}<br>di ${P.done.plats.map(p => PLAT[p].name).join(' & ')}</div>${t.points ? `<span class="pill violet" style="font-size:13px">${icon('trophy', 13)}+${t.points} poin</span>` : ''}<div class="ph-card small" style="text-align:left;width:100%">${icon('link', 12)} Link sudah terkirim ke Lume<br>${P.done.urls.map(u => `<span class="tiny muted">${esc(u)}</span>`).join('<br>')}</div><div class="tiny muted">Views, likes, komentar dan klik ke OCTO akan masuk otomatis.</div><button class="ph-btn sec" data-act="ph-tab" data-v="tasks">Kembali ke tugas</button></div></div>` + tabs;
  }
  if (P.scr === 'lib') return `<div class="ph-top"><div class="t">Pustaka</div><div class="tiny muted">Materi resmi yang sudah lolos cek kepatuhan</div></div><div class="ph-body"><div class="ph-assets">${S.assets.filter(a => a.status === 'Cleared').slice(0, 18).map(a => `<div class="a" data-tip="${esc(a.title)}">${thumb(a)}</div>`).join('')}</div></div>` + tabs;
  if (P.scr === 'points') {
    const led = S.ledger.filter(l => l.adv === adv.id).sort((a, b) => b.at - a.at).slice(0, 12);
    const peers = S.advocates.filter(a => a.circle === adv.circle).sort((a, b) => b.points - a.points); const rank = peers.findIndex(a => a.id === adv.id) + 1;
    return `<div class="ph-top" style="background:linear-gradient(180deg,#eaf1fe,#fff)"><div class="t">Poin saya</div></div><div class="ph-body"><div class="ph-card" style="text-align:center">${av(adv.name, 48)}<div class="b mt8">${esc(adv.name)}</div><div class="tiny muted">${esc(adv.unit)}</div><div style="font-size:30px;font-weight:800;margin-top:6px" class="num">${fmtN(adv.points)}</div><div class="tiny muted">poin saat ini · peringkat ${rank} dari ${peers.length} (${adv.circle})</div></div>
      <div class="ph-card">${led.length ? led.map(l => `<div class="row between small" style="padding:6px 0;border-bottom:1px dashed var(--line)"><span>${esc(l.reason)}<br><span class="tiny muted">${dKey(l.at).split('-').reverse().join('.')}</span></span><b style="color:${l.pts >= 0 ? 'var(--primary)' : 'var(--crit-ink)'}">${l.pts >= 0 ? '+' : ''}${l.pts}</b></div>`).join('') : '<div class="small muted">Belum ada riwayat poin.</div>'}</div>
      <div class="tiny muted" style="text-align:center">Poin dihitung dari kualitas dan klik, bukan jumlah posting. Like atau engagement palsu membatalkan poin.</div></div>` + tabs;
  }
  return `<div class="ph-top"><div class="t">Profil</div></div><div class="ph-body"><div class="ph-card"><div class="row">${av(adv.name, 40)}<div><b>${esc(adv.name)}</b><div class="tiny muted">${esc(adv.title)} · ${esc(adv.unit)}</div></div></div></div>
    <div class="ph-card"><div class="small b">Akun terhubung</div><div class="stack mt8">${['instagram', 'tiktok', 'facebook'].map(c => `<div class="row between small"><span class="row" style="gap:6px">${plat(c, 18)}${adv.acc[c] ? esc(adv.acc[c]) : PLAT[c].name + ' belum terhubung'}</span>${adv.acc[c] ? '<span class="okchip" style="padding:2px 8px">Terhubung</span>' : `<button class="btn sm" data-act="ph-connect" data-v="${c}">Hubungkan</button>`}</div>`).join('')}</div></div>
    <div class="ph-card"><div class="row between"><div><div class="small b">Ikut program advokat</div><div class="tiny muted">Sukarela. Bisa berhenti kapan saja.</div></div><button class="switch ${adv.optIn ? 'on' : ''}" data-act="ph-opt" aria-label="Ikut program advokat"></button></div></div>
    <div class="ph-card tiny ink2">Akun pribadimu tetap pribadi. Lume hanya membaca hasil postingan tugas (views, likes, komentar, klik) dengan persetujuanmu. Jangan pernah posting data nasabah, KTP, nomor kartu atau rekening.</div></div>` + tabs;
}
function phChk(chk) {
  if (!chk) return '<div class="tiny muted">Cek kepatuhan AI berjalan otomatis saat caption diisi.</div>';
  if (chk.verdict === 'blocked') return `<span class="badchip">${icon('x', 12, 2.6)}Perlu diperbaiki (${chk.blocking.length})</span><div class="stack mt8">${chk.blocking.map(r => `<div class="tiny"><b style="color:var(--crit-ink)">${esc(r.name)}:</b> ${esc(r.detail)}</div>`).join('')}</div><button class="btn sm mt8" data-act="ph-fix">${icon('wand', 12)}Perbaiki otomatis</button>`;
  if (chk.verdict === 'route') return `<span class="pill warn">${icon('shield', 12)}Lolos cek AI · menunggu Compliance</span>`;
  return `<span class="okchip">${icon('check', 12, 2.6)}Lolos cek kepatuhan AI</span>`;
}
ONCHANGE['ph-adv'] = el => { S.phone = { ...phoneInit(), adv: el.value }; renderDrawer(); };
ACT['ph-tab'] = el => { S.phone.scr = el.dataset.v; S.phone.task = null; renderDrawer(); save(); };
ACT['ph-open'] = el => { const t = taskById(el.dataset.id); const adv = advById(S.phone.adv); S.phone = { ...S.phone, scr: 'task', task: t.id, sel: t.assets.slice(0, 1), cap: '', plats: t.channels.filter(c => adv.acc[c]) }; renderDrawer(); };
const phBand = adv => adv.circle === 'KOS' ? 'CIMB Niaga ' + adv.unit : adv.circle === 'KOC' ? adv.unit : 'CIMB Niaga × ' + adv.name;
ACT['ph-band'] = () => { S.phone.band = !S.phone.band; renderDrawer(); };
ACT['ph-asset'] = el => { const P = S.phone; const id = el.dataset.id; P.sel = P.sel.includes(id) ? P.sel.filter(x => x !== id) : [...P.sel, id]; renderDrawer(); };
ACT['ph-plat'] = el => { const P = S.phone; const c = el.dataset.v; P.plats = P.plats.includes(c) ? P.plats.filter(x => x !== c) : [...P.plats, c]; renderDrawer(); };
ACT['ph-connect'] = el => { const adv = advById(S.phone.adv); const c = el.dataset.v; adv.acc[c] = c === 'facebook' ? adv.name : '@' + adv.name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, ''); if (S.phone.scr === 'task' && !S.phone.plats.includes(c)) S.phone.plats.push(c); toast(`${PLAT[c].name} terhubung (izin baca hasil postingan tugas saja)`); renderDrawer(); };
ACT['ph-opt'] = () => { const adv = advById(S.phone.adv); adv.optIn = !adv.optIn; toast(adv.optIn ? 'Kamu ikut lagi program advokat' : 'Kamu berhenti dari program advokat; tidak ada tugas baru'); render(); };
ONINPUT['ph-cap'] = el => { const P = S.phone; P.cap = el.value; const t = taskById(P.task); const chk = P.cap ? checkCompliance(P.cap, { product: t.product, paid: t.paid, disclosure: t.disclosure }) : null; $('#ph-chk').innerHTML = phChk(chk); const b = $('[data-act="ph-post"]'); if (b) b.disabled = !(chk && chk.verdict !== 'blocked' && P.sel.length && P.plats.length); };
function phFallbackCaption(t, adv) {
  const story = adv.circle === 'KOS' ? `Hari ini tim ${adv.unit.split('–').pop().trim()} ikut seru-seruan!` : adv.circle === 'KOC' ? 'Ketemu banyak teman baru yang lagi kejar mimpi juga.' : 'Aku cobain sendiri dan prosesnya gampang banget.';
  return t.template.replace('{cerita}', story).replace('{link}', `${t.link}?ref=${adv.id}`).replace('{topik}', t.topics.join(' ')).replace('{kota}', adv.region === 'West Java' ? 'Bandung' : 'Jakarta').replace('{cabang}', adv.unit).replace(/\s{2,}/g, ' ').trim();
}
ACT['ph-ai'] = async () => {
  const P = S.phone; const t = taskById(P.task); const adv = advById(P.adv);
  const ta = $('#ph-cap'); ta.value = AI.live ? 'Menulis…' : '';
  const txt = await AI.write(captionPrompt({ name: t.name, goal: t.goal, campaign: CAMPAIGNS[t.camp] ? CAMPAIGNS[t.camp].name : '', product: t.product, paid: t.paid, disclosure: t.disclosure, link: `${t.link}?ref=${adv.id}`, topics: t.topics.join(' '), who: `${adv.name}, ${adv.title}, ${adv.unit}` }), () => phFallbackCaption(t, adv), x => { ta.value = x; });
  P.cap = txt; renderDrawer();
};
ACT['ph-fix'] = () => { const P = S.phone; const t = taskById(P.task); P.cap = autoFix(P.cap, { product: t.product, paid: t.paid, disclosure: t.disclosure }); renderDrawer(); toast('Caption diperbaiki otomatis'); };
ACT['ph-ignore'] = () => { const P = S.phone; const t = taskById(P.task); const e = t.exec.find(x => x.adv === P.adv); e.st = 'ignored'; P.scr = 'tasks'; toast('Tugas diabaikan'); render(); };
ACT['ph-post'] = () => {
  const P = S.phone; const t = taskById(P.task); const adv = advById(P.adv);
  const chk = checkCompliance(P.cap, { product: t.product, paid: t.paid, disclosure: t.disclosure });
  logAudit('Task ' + t.id + ' · advocate caption', P.cap, chk, adv.name);
  if (chk.verdict === 'blocked') { renderDrawer(); return; }
  P.scr = 'posting'; renderDrawer();
  setTimeout(() => {
    const e = t.exec.find(x => x.adv === adv.id) || (t.exec.push({ adv: adv.id }), t.exec[t.exec.length - 1]);
    const urls = P.plats.map(p => `${PLAT[p].name.toLowerCase()}.com/${p === 'tiktok' ? '@' + (adv.acc.tiktok || '').replace('@', '') + '/video/' : 'p/'}${Date.now().toString(36)}`);
    Object.assign(e, { st: 'done', at: Date.now(), plats: [...P.plats], url: urls, views: 0, likes: 0, comments: 0, shares: 0, clicks: 0, signups: 0, onTime: Date.now() <= t.deadline, caption: P.cap });
    if (t.points) { adv.points += t.points; S.ledger.push({ adv: adv.id, at: Date.now(), pts: t.points, reason: 'Menyelesaikan tugas: ' + t.name }); }
    if (t.paid && adv.kol) { adv.kol.briefs++; adv.kol.paidTotal += adv.kol.fee; }
    P.done = { task: t.id, plats: [...P.plats], urls }; P.scr = 'done';
    notify(`${adv.name} posted “${t.name}” to ${P.plats.map(p => PLAT[p].name).join(' & ')}; link received`, 'send', '#task-' + t.id);
    toast(`${adv.name} posted to ${P.plats.map(p => PLAT[p].name).join(' & ')} · link received by Lume`, 'send');
    render();
    // results flow back over the next minute
    let k = 0; const base = adv.circle === 'KOL' ? adv.followers * 0.25 : 1400;
    const iv = setInterval(() => {
      k++; e.views = Math.round(base * k / 4 * P.done.plats.length); e.likes = Math.round(e.views * 0.024); e.comments = Math.round(e.views * 0.004); e.shares = Math.round(e.views * 0.003); e.clicks = Math.round(e.views * 0.0028); e.signups = Math.round(e.clicks * 0.12);
      if (k >= 4) clearInterval(iv);
      const r = parseHash(); if (!$('#modal') && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) && (r.r === 'tasks' || r.r === 'insights' || r.r === 'command')) render(); else save();
    }, 6000);
  }, 1400);
};
