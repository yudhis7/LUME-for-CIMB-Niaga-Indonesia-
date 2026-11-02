/* ================= Constants: CIMB Niaga configuration ================= */
const ROLES = {
  brand: { name: 'Brand & Content (HQ)', short: 'Brand team', user: 'Dewi Anggraini', publish: ['ig_main', 'tt_main', 'fb_main', 'x_main', 'th_main'], all: false },
  care: { name: 'Social Care Desk', short: 'Care desk', user: 'Agus Firmansyah', publish: [], all: false },
  compliance: { name: 'Compliance & Legal', short: 'Compliance', user: 'Maria Tambunan', publish: [], all: true },
  km: { name: 'KejarMimpi team', short: 'KejarMimpi', user: 'Fikri Ramadhan', publish: ['ig_km'], all: false },
  hr: { name: 'HR · Life at CIMB Niaga', short: 'HR', user: 'Sinta Maharani', publish: ['ig_hy'], all: false },
  syariah: { name: 'CIMB Niaga Syariah team', short: 'Syariah', user: 'Hasan Lubis', publish: ['ig_sy'], all: false }
};
const ACCOUNTS0 = [
  { id: 'ig_main', platform: 'instagram', handle: '@cimb_niaga', name: 'CIMB Niaga', group: 'official', job: 'Brand showcase: campaigns, promos, OCTO', role: 'Brand showcase', followers: 390032, posts: 8422, er: 0.0003, status: 'Big but quiet', note: '~89 likes, ~16 comments a post', verified: 'yes', owner: 'brand', caps: ['main', 'main', 'main', 'also', 'main'] },
  { id: 'tt_main', platform: 'tiktok', handle: '@cimb.niaga', name: 'CIMB Niaga', group: 'official', job: 'Saving and money tips for younger customers', role: 'Growth, youth', followers: 420100, posts: 497, er: null, status: 'Growing', note: '2.2M likes · +1,700 followers in 14 days', verified: 'yes', owner: 'brand', caps: ['main', 'main', 'main', 'also', 'main'] },
  { id: 'fb_main', platform: 'facebook', handle: '@CIMBIndonesia', name: 'CIMB Niaga', group: 'official', job: 'Legacy audience; campaign reposts', role: 'Largest audience', followers: 1524698, posts: null, er: null, status: 'Slipping', note: '−1,087 likes 8–22 Oct · 4,849 talking about', verified: 'yes', owner: 'brand', caps: ['main', 'main', 'main', 'also', 'also'] },
  { id: 'x_main', platform: 'x', handle: '@CIMBNiaga', name: 'CIMB Niaga', group: 'official', job: 'Customer care desk and fraud warnings', role: 'Public care desk', followers: null, posts: null, er: null, status: 'Service', note: 'Public replies signed by agents', verified: 'yes', owner: 'brand', caps: ['also', 'main', 'main', 'main', 'none'] },
  { id: 'th_main', platform: 'threads', handle: '@cimb_niaga', name: 'CIMB Niaga', group: 'official', job: 'Mirrors Instagram content', role: 'Conversation', followers: null, posts: null, er: null, status: 'Mirror', note: 'Same handle as Instagram', verified: 'yes', owner: 'brand', caps: ['main', 'also', 'also', 'also', 'none'] },
  { id: 'ig_km', platform: 'instagram', handle: '@kejarmimpi.id', name: 'KejarMimpi', group: 'affiliated', job: 'Youth stories, events, volunteering', role: 'Community, 35 cities', followers: 265972, posts: 4477, er: 0.0009, status: 'Community', note: '800+ members in 35 cities', verified: 'yes', owner: 'km', caps: ['main', 'main', 'also', 'none', 'main'] },
  { id: 'ig_hy', platform: 'instagram', handle: '@hycimbniaga', name: 'Life at CIMB Niaga', group: 'affiliated', job: 'Staff life, careers, culture', role: 'Employer brand', followers: 42638, posts: 746, er: 0.0052, status: 'People-led', note: '17× the brand account’s engagement', verified: 'yes', owner: 'hr', caps: ['main', 'also', 'also', 'none', 'main'] },
  { id: 'ig_sy', platform: 'instagram', handle: '@cimbniaga_syariah', name: 'CIMB Niaga Syariah', group: 'affiliated', job: 'Syariah products, Ramadan, waqf', role: 'Islamic banking', followers: 473, posts: 19, er: null, status: 'To check', note: 'Only 473 followers: confirm the blue tick', verified: 'check', owner: 'syariah', caps: ['main', 'main', 'main', 'also', 'also'] },
  { id: 'wa_octo', platform: 'whatsapp', handle: 'Ask OCTO', name: 'Ask OCTO', group: 'affiliated', job: 'Private follow-up; 14041 routed here from 1 Jul 2026', role: 'Private follow-up', followers: null, posts: null, er: null, status: 'Care channel', note: 'WhatsApp +62 811-9781-4041', verified: 'yes', owner: 'care', caps: ['none', 'none', 'main', 'main', 'none'] }
];
const CAP_NAMES = ['Publish & schedule', 'Listen: comments, mentions', 'Reply & DM', 'Complaint to ticket', 'Advocate amplification'];
const ADDABLE = [
  { platform: 'youtube', handle: '@CIMBNiagaID', name: 'CIMB Niaga YouTube', note: 'YouTube is the exception to the blue-tick rule' },
  { platform: 'instagram', handle: '@cimbniagafinance', name: 'CIMB Niaga Finance', note: 'Group company' },
  { platform: 'instagram', handle: '@cimbniagasekuritas', name: 'CIMB Niaga Sekuritas', note: 'Group company' },
  { platform: 'instagram', handle: '@octoland.id', name: 'OCTO Land', note: 'Venue' },
  { platform: 'instagram', handle: '@octoarena', name: 'OCTO Arena', note: 'Venue' }
];
const BRANCHES = [
  ['Jakarta – Sudirman', 'Jakarta'], ['Jakarta – Thamrin', 'Jakarta'], ['Jakarta – Kelapa Gading', 'Jakarta'], ['Jakarta – Pondok Indah', 'Jakarta'], ['Jakarta – Blok M', 'Jakarta'], ['Jakarta – Kebon Jeruk', 'Jakarta'], ['Jakarta – Mangga Dua', 'Jakarta'],
  ['Bandung – Asia Afrika', 'West Java'], ['Bandung – Dago', 'West Java'], ['Bekasi – Summarecon', 'West Java'], ['Bogor – Pajajaran', 'West Java'],
  ['Surabaya – Basuki Rahmat', 'East Java'], ['Surabaya – Darmo', 'East Java'], ['Malang – Ijen', 'East Java'],
  ['Semarang – Pandanaran', 'Central Java'],
  ['Denpasar – Gatot Subroto', 'Bali'], ['Bali – Kuta', 'Bali'],
  ['Medan – Diponegoro', 'Sumatra'], ['Palembang – Sudirman', 'Sumatra'], ['Pekanbaru – Riau', 'Sumatra']
].map(([name, region]) => ({ name, region }));
const REGIONS = ['Jakarta', 'West Java', 'East Java', 'Central Java', 'Bali', 'Sumatra'];
const KOC_CITIES = [['Jakarta', 'Jakarta'], ['Bandung', 'West Java'], ['Bekasi', 'West Java'], ['Surabaya', 'East Java'], ['Malang', 'East Java'], ['Semarang', 'Central Java'], ['Yogyakarta', 'Central Java'], ['Solo', 'Central Java'], ['Denpasar', 'Bali'], ['Medan', 'Sumatra'], ['Palembang', 'Sumatra'], ['Padang', 'Sumatra'], ['OCTO Land Blok M', 'Jakarta'], ['OCTO Arena', 'Jakarta']];
const FIRST = ['Rina', 'Dimas', 'Ayu', 'Bagus', 'Sari', 'Fajar', 'Nadia', 'Yoga', 'Putri', 'Rizky', 'Dewi', 'Arif', 'Intan', 'Hendra', 'Maya', 'Galih', 'Tasya', 'Bayu', 'Citra', 'Eko', 'Fitri', 'Gilang', 'Hana', 'Irfan', 'Jessica', 'Kevin', 'Laras', 'Made', 'Nanda', 'Oki', 'Puspita', 'Raka', 'Salsa', 'Teguh', 'Utami', 'Vino', 'Wulan', 'Yusuf', 'Zahra', 'Adit', 'Bella', 'Cahya', 'Danu', 'Elsa', 'Ferry', 'Gita', 'Hadi', 'Indah', 'Joko', 'Kartika', 'Lukman', 'Mega', 'Niko', 'Okta', 'Prita', 'Reza', 'Sinta', 'Tomi', 'Vania', 'Wahyu', 'Yuni', 'Ketut', 'Wayan', 'Butet', 'Ucok'];
const LAST = ['Kusuma', 'Pratama', 'Wijaya', 'Santoso', 'Saputra', 'Lestari', 'Hidayat', 'Nugroho', 'Siregar', 'Simanjuntak', 'Wibowo', 'Halim', 'Gunawan', 'Setiawan', 'Rahman', 'Harahap', 'Purnomo', 'Ananda', 'Sitompul', 'Tanjung', 'Permana', 'Susanto', 'Utomo', 'Nasution', 'Pangestu', 'Suryadi', 'Kurniawan', 'Hakim', 'Maharani', 'Putra'];
const KOS_ROLES = ['Relationship Manager', 'Preferred RM', 'Branch Manager', 'Customer Service', 'Teller', 'Sales Officer', 'Mortgage Officer'];
const KOLS = [
  ['@duitpintar.id', 'Finance creator', 182000, 'Jakarta'], ['@ngaturduit.yuk', 'Finance creator', 96000, 'Bandung'], ['@cuanpelan', 'Finance creator', 64000, 'Surabaya'],
  ['@mamahemat.id', 'Family finance', 128000, 'Jakarta'], ['@padel.jkt', 'Sport · OCTO Arena', 41000, 'Jakarta'], ['@kulinerkantor', 'Lifestyle', 210000, 'Jakarta'],
  ['@teknologi.santai', 'Tech', 77000, 'Yogyakarta'], ['@jalanhemat.id', 'Travel', 145000, 'Denpasar']
];
const CIRCLES = {
  OFF: { n: 1, name: 'Official accounts', color: '#1d2433', desc: 'Instagram, TikTok, Facebook, X, Threads, YouTube, plus @kejarmimpi.id, @hycimbniaga and Syariah', act: 'Publishes from one calendar' },
  KOS: { n: 2, name: 'Employee advocates (KOS)', color: '#2a78d6', desc: 'RMs, branch and Preferred staff; start with volunteers, 14,600 possible', act: 'Share approved tasks on their own accounts' },
  KOC: { n: 3, name: 'Community ambassadors (KOC)', color: '#6250d6', desc: 'KejarMimpi members (800+, 35 cities), OCTO Land and OCTO Arena regulars', act: 'Share events and real stories' },
  KOL: { n: 4, name: 'Creators & partners (KOL)', color: '#eb6834', desc: 'Ambassadors, finance creators, merchant and group partners', act: 'Paid, briefed, disclosed under POJK 6/2026' }
};
const CAMPAIGNS = {
  octo: { name: 'OCTO untuk Pejuang Mimpi', cls: 'camp-octo', clash: true },
  waspada: { name: '#WaspadaSelalu', cls: 'camp-waspada', clash: false },
  km: { name: 'Kejar Mimpi FEST', cls: 'camp-km', clash: true },
  life: { name: 'Life at CIMB Niaga', cls: 'camp-life', clash: false },
  syariah: { name: 'Syariah', cls: 'camp-syariah', clash: false },
  tip: { name: 'Money tips', cls: 'camp-tip', clash: false },
  card: { name: 'OCTO Card launch', cls: 'camp-octo', clash: true }
};
const PRODUCTS = {
  'OCTO': { risk: null, sheet: 'Digital banking app. Open an account online; no rate claims.', facts: {} },
  'OCTO Card': { risk: null, sheet: 'Cicilan 0% tenor 3, 6 or 12 bulan; iuran tahunan Rp0 tahun pertama.', facts: { rates: [0], tenors: [3, 6, 12], fees: [0] } },
  'KPR': { risk: null, sheet: 'Bunga fixed 3,88% p.a. tahun pertama; tenor hingga 240 bulan.', facts: { rates: [3.88], tenors: [12, 24, 36, 60, 120, 180, 240] } },
  'Tabungan': { risk: null, sheet: 'Bunga hingga 2,5% p.a., dihitung harian.', facts: { rates: [2.5] } },
  'Deposito': { risk: null, sheet: 'Bunga 4,25% p.a. tenor 1, 3, 6, 12 bulan.', facts: { rates: [4.25], tenors: [1, 3, 6, 12] } },
  'Syariah iB': { risk: null, sheet: 'Akad wadiah / mudharabah; bagi hasil sesuai nisbah, no fixed rate.', facts: { rates: [] } },
  'Reksa dana': { risk: 'investment', sheet: 'Mutual funds via OCTO. Returns are not guaranteed; NAV can go up or down.', facts: { rates: [] } },
  'Bancassurance': { risk: 'insurance', sheet: 'Insurance from partner insurers; not a bank product; not covered by LPS.', facts: {} },
  'PayLater': { risk: 'paylater', sheet: 'Pay-later facility; late payment fees apply.', facts: {} },
  'Kejar Mimpi': { risk: null, sheet: 'Community programme and events.', facts: {} },
  'Fraud awareness': { risk: null, sheet: 'Official #WaspadaSelalu warnings.', facts: {} },
  'Employer brand': { risk: null, sheet: 'Life at CIMB Niaga content.', facts: {} }
};
const RISK_WORDING = {
  investment: { label: 'Investment', text: 'Investasi reksa dana mengandung risiko. Calon investor wajib membaca dan memahami prospektus sebelum berinvestasi. Kinerja masa lalu tidak mencerminkan kinerja masa datang.', detect: ['mengandung risiko', 'prospektus', 'kinerja masa lalu'] },
  insurance: { label: 'Insurance', text: 'Produk asuransi bukan produk bank dan tidak dijamin LPS. Baca ringkasan informasi produk sebelum membeli.', detect: ['bukan produk bank', 'tidak dijamin lps', 'ringkasan informasi produk'] },
  paylater: { label: 'Pay-later', text: 'Gunakan sesuai kemampuan bayar. Keterlambatan pembayaran dikenakan denda.', detect: ['kemampuan bayar', 'dikenakan denda'] }
};
const RULES0 = [
  { id: 'guarantee', name: 'Guaranteed returns', desc: 'Promises such as “pasti untung” or “dijamin” that don’t fit the product', on: true, sev: 'block', words: ['pasti untung', 'dijamin aman', 'dijamin untung', 'dijamin', 'bunga pasti', 'tanpa risiko', 'bebas risiko', 'anti rugi', 'pasti cuan', 'auto cuan', '100% aman', 'untung terus', 'return pasti', 'pasti kaya'] },
  { id: 'disclosure', name: 'Disclosure tag', desc: 'Paid or rewarded task without #iklan or a paid-partnership label', on: true, sev: 'block', words: ['#iklan', '#ad', '#paidpartnership', 'paid partnership', 'kemitraan berbayar', '#kerjasama'] },
  { id: 'risk', name: 'Risk warning', desc: 'Investment, insurance or pay-later post with no risk wording', on: true, sev: 'block' },
  { id: 'facts', name: 'Product facts', desc: 'Rate, fee or tenor different from the product sheet', on: true, sev: 'block' },
  { id: 'pii', name: 'Personal & security data', desc: 'KTP, card or account numbers, OTP/PIN requests, customer faces without consent', on: true, sev: 'block' },
  { id: 'compare', name: 'Unsupported comparison', desc: 'Superlatives or comparisons with other banks without an approved source', on: true, sev: 'block', words: ['terbaik', 'nomor 1', 'no. 1', 'paling murah', 'termurah', 'paling untung', 'lebih untung dari', 'dibanding bank lain', 'daripada bank lain', 'bca', 'mandiri', 'bri', 'bni', 'jenius', 'bank jago', 'seabank'] },
  { id: 'tone', name: 'Off-brand or risky tone', desc: 'Attacks on competitors, politics, SARA topics, profanity', on: true, sev: 'block', words: ['pemilu', 'pilkada', 'capres', 'partai', 'politik', 'sara', 'goblok', 'bodoh', 'anjing', 'payah banget'] },
  { id: 'route', name: 'High-risk goes to Compliance', desc: 'Posts tagged with a high-risk product go to Compliance after passing the AI check', on: true, sev: 'route' }
];
const REPLY_LIB = {
  Praise: 'Terima kasih banyak, Kak! Senang OCTO bisa bantu. Boleh ceritanya kami bagikan di akun CIMB Niaga?',
  Question: 'Halo Kak, terima kasih sudah bertanya. {answer} Kalau masih ada pertanyaan, Kakak bisa chat Ask OCTO di WhatsApp 0811-9781-4041 ya.',
  Complaint: 'Mohon maaf atas kendalanya, Kak. Demi keamanan, jangan bagikan data rekening di sini ya. Tim kami hubungi via DM. No. tiket: {ticket}.',
  'Fraud risk': 'Terima kasih sudah waspada, Kak. CIMB Niaga tidak pernah meminta OTP, PIN, atau password. Jangan berikan ke siapa pun. Akun resmi kami hanya yang bercentang biru. #WaspadaSelalu',
  'Crisis or viral': 'Kami mohon maaf atas ketidaknyamanannya. Tim kami sedang menangani kendala ini dan akan memberi kabar terbaru di akun resmi CIMB Niaga. Terima kasih atas kesabarannya.',
  Spam: ''
};
const KB_ANSWERS = {
  'KPR': 'Promo KPR bulan ini bisa dicek di menu Promo di aplikasi OCTO atau di cabang terdekat.',
  'OCTO Card': 'Kartu bisa diaktifkan langsung di OCTO: menu Kartu, pilih Aktivasi Kartu, lalu ikuti petunjuknya.',
  'Kejar Mimpi': 'Jadwal Kejar Mimpi berikutnya diumumkan lebih dulu di @kejarmimpi.id, pantau terus ya.',
  'Employer brand': 'Lowongan terbaru ada di halaman karier CIMB Niaga dan di @hycimbniaga.',
  'Syariah iB': 'Info Tabungan iB dan fitur wakaf bisa ditanyakan ke Ask OCTO atau cabang Syariah terdekat.',
  'OCTO': 'Panduan lengkapnya ada di menu Bantuan di aplikasi OCTO.',
  default: 'Tim kami siap bantu jawab detailnya.'
};
const TYPE_META = {
  Praise: { sla: 'same', label: 'Same day', color: 'good', act: 'Thank, ask to reshare, add to library' },
  Question: { sla: 60, label: '≤ 1 h', color: 'blue', act: 'Answer from the approved knowledge base' },
  Complaint: { sla: 60, label: '≤ 1 h', color: 'coral', act: 'Public acknowledgement, move to DM, open a ticket' },
  'Fraud risk': { sla: 15, label: '≤ 15 min', color: 'crit', act: 'Warn, alert the fraud team, share #WaspadaSelalu' },
  'Crisis or viral': { sla: 15, label: '≤ 15 min', color: 'crit', act: 'Escalate to Corporate Comms with a holding reply' },
  Spam: { sla: 'same', label: 'Same day', color: 'dark', act: 'Hide, report to the platform, warn followers' }
};
const OWNERS = { 'OCTO': 'Digital banking care', 'OCTO Card': 'Cards', 'KPR': 'Mortgage', 'Tabungan': 'Digital banking care', 'Syariah iB': 'Syariah care', 'Branch': 'Branch operations', 'Fraud': 'Fraud team' };
const THEMES = ['OCTO login / OTP', 'Transfer delayed', 'Card blocked', 'Fees and charges', 'Branch queue', 'App error', 'Card limit', 'KPR process', 'Account opening', 'Other'];
const HOLIDAYS = ['2026-12-25', '2027-01-01'];
const POINT_RULES0 = [
  { id: 'task', name: 'Complete a mass task', target: 'Task executor', pts: 20, on: true, type: 'Task execution' },
  { id: 'late', name: 'Mass task overdue, not completed', target: 'Task executor', pts: -5, on: true, type: 'Task execution' },
  { id: 'month1', name: 'Monthly #1 by tasks completed', target: 'Top advocate', pts: 100, on: true, type: 'Productivity' },
  { id: 'week1', name: 'Weekly #1 by tasks completed', target: 'Top advocate', pts: 50, on: true, type: 'Productivity' },
  { id: 'clicks', name: 'Every 10 tracked clicks to OCTO', target: 'Post author', pts: 2, on: true, type: 'Content conversion' },
  { id: 'hv', name: 'Post saved to the library as high-value content', target: 'Post author', pts: 30, on: true, type: 'High-value content' },
  { id: 'quality', name: 'Engagement rate ≥ 3% on a task post', target: 'Post author', pts: 10, on: true, type: 'Content engagement' }
];
const PILOT_START = new Date(2026, 10, 16); // week of 16 Nov 2026 (example start in the proposal)

/* ================= Seed ================= */
function seed() {
  const now = new Date();
  const W0 = startOfWeek(now);
  const at = (dayOff, h, m = 0) => { const d = new Date(W0.getTime() + dayOff * DAY); d.setHours(h, m, 0, 0); return d.getTime(); };
  const ago = min => now.getTime() - min * 60000;
  const rnd = mulberry32(20261102);
  const pick = a => a[Math.floor(rnd() * a.length)];
  const S = { v: 3, role: 'brand', seededAt: now.getTime(), ticketSeq: 24860, ui: {}, audit: [], notifs: [], ledger: [] };
  S.accounts = JSON.parse(JSON.stringify(ACCOUNTS0)).map(a => ({ ...a, connected: a.platform === 'whatsapp' ? 'API (Ask OCTO)' : 'Connected' }));
  S.rules = JSON.parse(JSON.stringify(RULES0));
  S.pointRules = JSON.parse(JSON.stringify(POINT_RULES0));
  S.watch = [
    { id: 'w1', platform: 'x', handle: '@cimbniaga_cs24', seen: ago(95), reason: 'Uses logo; replies to customers asking to DM account details', reach: 1200, status: 'Detected' },
    { id: 'w2', platform: 'instagram', handle: '@cs.cimbniaga.official', seen: ago(60 * 26), reason: 'No blue tick; offers “unblock card” service via WhatsApp', reach: 3400, status: 'Reported' },
    { id: 'w3', platform: 'tiktok', handle: '@octo.bantuan', seen: ago(60 * 50), reason: 'Promotes fake OCTO giveaway link', reach: 8900, status: 'Taken down' },
    { id: 'w4', platform: 'facebook', handle: 'CIMB Niaga Pinjaman Cepat', seen: ago(60 * 7), reason: 'Fake loan page with scam link', reach: 640, status: 'Detected' }
  ];

  /* advocates */
  const advs = [];
  let n = 0;
  const mk = (o) => { advs.push(o); n++; };
  const nameUsed = new Set();
  const newName = () => { let nm; do { nm = pick(FIRST) + ' ' + pick(LAST); } while (nameUsed.has(nm)); nameUsed.add(nm); return nm; };
  nameUsed.add('Rina Kusuma');
  BRANCHES.forEach((b, bi) => {
    for (let k = 0; k < 15; k++) {
      const nm = (bi === 0 && k === 0) ? 'Rina Kusuma' : newName();
      const h = nm.toLowerCase().replace(' ', '.');
      mk({ id: 'a' + n, name: nm, circle: 'KOS', unit: b.name, region: b.region, title: (bi === 0 && k === 0) ? 'Relationship Manager' : pick(KOS_ROLES), invited: true, optIn: (bi === 0 && k === 0) || rnd() < 0.94, acc: { instagram: '@' + h, tiktok: rnd() < 0.55 ? '@' + h.replace('.', '') : null, facebook: rnd() < 0.3 ? nm : null }, followers: Math.round(300 + rnd() * rnd() * 4000), points: Math.round(rnd() * 120), joined: at(-14 - Math.floor(rnd() * 10), 9) });
    }
  });
  for (let k = 0; k < 100; k++) {
    const [city, region] = KOC_CITIES[k % KOC_CITIES.length];
    const nm = newName(); const h = nm.toLowerCase().replace(' ', '_');
    mk({ id: 'a' + n, name: nm, circle: 'KOC', unit: city.startsWith('OCTO') ? city + ' regular' : 'KejarMimpi ' + city, region, title: city.startsWith('OCTO') ? 'Venue regular' : 'KejarMimpi member', invited: true, optIn: rnd() < 0.9, acc: { instagram: '@' + h, tiktok: rnd() < 0.7 ? '@' + h.replace('_', '') : null, facebook: null }, followers: Math.round(500 + rnd() * rnd() * 9000), points: Math.round(rnd() * 160), joined: at(-14 - Math.floor(rnd() * 10), 10) });
  }
  KOLS.forEach(([h, niche, f, city], i) => {
    mk({ id: 'a' + n, name: h, circle: 'KOL', unit: niche, region: city === 'Denpasar' ? 'Bali' : city === 'Bandung' ? 'West Java' : city === 'Surabaya' ? 'East Java' : city === 'Yogyakarta' ? 'Central Java' : 'Jakarta', title: niche, invited: true, optIn: true, acc: { instagram: h, tiktok: h.replace('@', '@tt.'), facebook: null }, followers: f, points: 0, joined: at(-30, 10),
      kol: { fee: [7500000, 5000000, 3500000, 6000000, 2500000, 9000000, 4000000, 6500000][i], contract: i < 6 ? 'Aligned' : 'Needs update', briefs: 0, paidTotal: 0 } });
  });
  S.advocates = advs;
  const byCircle = c => advs.filter(a => a.circle === c);
  const kos = byCircle('KOS'), koc = byCircle('KOC'), kol = byCircle('KOL');

  /* library assets */
  const A = (id, type, title, format, product, camp, status, extra = {}) => ({ id, type, title, format, product, camp, status, uses: Math.round(rnd() * 400), added: at(-Math.floor(rnd() * 20) - 1, 10), tags: [], ...extra });
  S.assets = [
    A('as1', 'BGC', 'OCTO untuk Pejuang Mimpi · key visual', 'image', 'OCTO', 'octo', 'Cleared', { tags: ['OCTO', 'campaign'] }),
    A('as2', 'BGC', 'OCTO untuk Pejuang Mimpi · 15s video', 'video', 'OCTO', 'octo', 'Cleared', { tags: ['OCTO', 'short video'] }),
    A('as3', 'BGC', 'OCTO Card launch · carousel (5 slides)', 'carousel', 'OCTO Card', 'card', 'Cleared', { tags: ['OCTO Card', 'launch'] }),
    A('as4', 'BGC', '#WaspadaSelalu · CS palsu minta OTP', 'image', 'Fraud awareness', 'waspada', 'Cleared', { tags: ['fraud', 'always-on'] }),
    A('as5', 'BGC', '#WaspadaSelalu · link hadiah palsu', 'image', 'Fraud awareness', 'waspada', 'Cleared', { tags: ['fraud'] }),
    A('as6', 'BGC', 'Tabungan iB · fitur wakaf', 'image', 'Syariah iB', 'syariah', 'Cleared', { tags: ['Syariah', 'waqf'] }),
    A('as7', 'BGC', 'Promo KPR · branch template (city field)', 'template', 'KPR', 'octo', 'Cleared', { tags: ['branch', 'template'] }),
    A('as8', 'BGC', 'Reksa dana di OCTO · explainer', 'carousel', 'Reksa dana', 'tip', 'Pending review', { tags: ['investment', 'risk wording'] }),
    A('as9', 'PGC', 'OCTO untuk Keluarga · ambassador film (30s cut)', 'video', 'OCTO', 'octo', 'Cleared', { tags: ['ambassador', 'family'] }),
    A('as10', 'PGC', '3 cara atur dana impian · finance creator', 'video', 'Tabungan', 'tip', 'Cleared', { tags: ['money tips'] }),
    A('as11', 'PGC', 'Padel tips at OCTO Arena · creator', 'video', 'Kejar Mimpi', 'km', 'Cleared', { tags: ['OCTO Arena'] }),
    A('as12', 'PGC', 'Kejar Mimpi concert teaser · artists', 'video', 'Kejar Mimpi', 'km', 'Cleared', { tags: ['concert', 'teaser'] }),
    A('as13', 'UGC', 'Kejar Mimpi FEST crowd · @yo***88', 'image', 'Kejar Mimpi', 'km', 'Cleared', { tags: ['permission granted'], source: '@yo***88 · TikTok' }),
    A('as14', 'UGC', 'OCTO Land Blok M · visitor photo', 'image', 'Kejar Mimpi', 'km', 'Cleared', { tags: ['permission granted'], source: '@ni***ta · Instagram' }),
    A('as15', 'UGC', 'OCTO Arena padel match', 'image', 'Kejar Mimpi', 'km', 'Cleared', { tags: ['permission granted'], source: '@pa***di · Instagram' }),
    A('as16', 'UGC', 'Buka rekening 5 menit · customer story', 'image', 'OCTO', 'octo', 'Cleared', { tags: ['permission granted', 'praise'], source: '@ra***na · Instagram' }),
    A('as17', 'SGC', 'RM money tip: dana darurat 3–6× pengeluaran', 'video', 'Tabungan', 'tip', 'Cleared', { tags: ['RM', 'money tips'], source: 'Rina Kusuma · Jakarta – Sudirman' }),
    A('as18', 'SGC', 'A day at CIMB Niaga · Bandung – Dago', 'video', 'Employer brand', 'life', 'Cleared', { tags: ['employer brand'], source: 'Branch team · Bandung – Dago' }),
    A('as19', 'SGC', 'Literasi keuangan UMKM · Medan branch event', 'image', 'Tabungan', 'tip', 'Cleared', { tags: ['branch event'], source: 'Medan – Diponegoro' }),
    A('as20', 'SGC', 'Teller tips: jangan pernah bagikan OTP', 'video', 'Fraud awareness', 'waspada', 'Cleared', { tags: ['fraud'], source: 'Surabaya – Darmo' }),
    A('as21', 'BGC', 'Kejar Mimpi FEST · highlights pack (3 visuals)', 'carousel', 'Kejar Mimpi', 'km', 'Cleared', { tags: ['FEST', 'event'] }),
    A('as22', 'BGC', 'Kejar Mimpi FEST · poster', 'image', 'Kejar Mimpi', 'km', 'Cleared', { tags: ['FEST', 'poster'] }),
    A('as23', 'BGC', 'Kejar Mimpi FEST · 10s reel', 'video', 'Kejar Mimpi', 'km', 'Cleared', { tags: ['FEST', 'reel'] })
  ];

  /* tasks */
  const T = (o) => ({ status: 'progress', paid: false, disclosure: false, points: 20, creator: 'Dewi Anggraini', owner: 'brand', exec: [], topics: [], assets: [], ...o });
  const jkt = kos.filter(a => a.region === 'Jakarta');
  const wj = kos.filter(a => a.region === 'West Java');
  S.tasks = [
    T({ id: 't1', name: 'Kejar Mimpi FEST highlights', playbook: 'Events to stories', goal: 'Share FEST highlights from the venue; drive OCTO sign-ups with the tracked link', circles: ['KOS', 'KOC'], assignees: [...jkt, ...koc.slice(0, 60)].map(a => a.id), channels: ['instagram', 'tiktok'], start: at(0, 8), deadline: at(6, 21), product: 'Kejar Mimpi', camp: 'km', link: 'cimb.id/kmfest', disclosure: true, topics: ['#KejarMimpi', '#KejarMimpiFEST', '#OCTO'], assets: ['as21', 'as22', 'as23'], template: 'Seru banget di Kejar Mimpi FEST! {cerita} Atur dana impian lebih gampang pakai OCTO. {link} {topik} #iklan', creator: 'Fikri Ramadhan', owner: 'km', rate: 0.22 }),
    T({ id: 't2', name: 'OCTO untuk Pejuang Mimpi · staff share', playbook: 'OCTO campaigns', goal: 'Staff share the campaign film with their own story', circles: ['KOS'], assignees: kos.map(a => a.id), channels: ['instagram', 'tiktok', 'facebook'], start: at(-7, 8), deadline: at(-1, 21), product: 'OCTO', camp: 'octo', link: 'cimb.id/pejuangmimpi', disclosure: true, topics: ['#OCTOuntukPejuangMimpi', '#CIMBNiaga'], assets: ['as1', 'as2'], template: 'Buat kamu yang lagi kejar mimpi, mulai dari atur dana di OCTO. {cerita} {link} {topik} #iklan', status: 'completed', rate: 0.72 }),
    T({ id: 't3', name: '#WaspadaSelalu · modus CS palsu minta OTP', playbook: '#WaspadaSelalu fraud alerts', goal: 'Spread the official warning within hours of a scam wave', circles: ['KOS', 'KOC'], assignees: [...kos, ...koc].map(a => a.id), channels: ['instagram', 'facebook', 'x', 'tiktok'], start: at(-10, 9), deadline: at(-9, 21), product: 'Fraud awareness', camp: 'waspada', link: 'cimb.id/waspada', topics: ['#WaspadaSelalu'], assets: ['as4', 'as20'], template: 'Hati-hati! CIMB Niaga tidak pernah minta OTP, PIN, atau password. Akun resmi hanya yang bercentang biru. {link} {topik}', status: 'completed', points: 30, rate: 0.91 }),
    T({ id: 't4', name: 'OCTO Card launch · creator brief', playbook: 'Product launches', goal: 'Creators explain OCTO Card benefits with approved facts', circles: ['KOL'], assignees: kol.map(a => a.id), channels: ['instagram', 'tiktok'], start: at(-3, 10), deadline: at(4, 21), product: 'OCTO Card', camp: 'card', link: 'cimb.id/octocard', paid: true, disclosure: true, topics: ['#OCTOCard', '#iklan'], assets: ['as3'], template: 'Baru coba OCTO Card: cicilan 0% tenor 3, 6 atau 12 bulan. {cerita} {link} {topik}', points: 0, rate: 0.5 }),
    T({ id: 't5', name: 'Reksa dana di OCTO · finance creator explainer', playbook: 'Product launches', goal: 'Explain how to start investing in OCTO with the required risk wording', circles: ['KOL'], assignees: kol.slice(0, 3).map(a => a.id), channels: ['instagram', 'tiktok'], start: at(1, 10), deadline: at(12, 21), product: 'Reksa dana', camp: 'tip', link: 'cimb.id/reksadana', paid: true, disclosure: true, topics: ['#OCTO', '#iklan'], assets: ['as8'], template: 'Mulai investasi reksa dana dari OCTO. {cerita} ' + RISK_WORDING.investment.text + ' {link} {topik}', status: 'review', points: 0, rate: 0 }),
    T({ id: 't6', name: 'A day at CIMB Niaga · branch stories', playbook: 'Employer brand', goal: 'Real staff stories for hiring; tag @hycimbniaga', circles: ['KOS'], assignees: kos.filter((a, i) => i % 3 === 0).map(a => a.id), channels: ['instagram'], start: at(-5, 9), deadline: at(9, 21), product: 'Employer brand', camp: 'life', link: 'cimb.id/karier', topics: ['#LifeatCIMBNiaga'], assets: ['as18'], template: 'Sehari di cabang {cabang}: {cerita} Mau gabung? {link} {topik}', creator: 'Sinta Maharani', owner: 'hr', rate: 0.35 }),
    T({ id: 't7', name: 'OCTO Land Blok M weekend', playbook: 'Events to stories', goal: 'Community posts from OCTO Land with permission-cleared photos', circles: ['KOC'], assignees: koc.filter(a => a.region === 'Jakarta').map(a => a.id), channels: ['instagram', 'tiktok'], start: at(-14, 9), deadline: at(-8, 21), product: 'Kejar Mimpi', camp: 'km', link: 'cimb.id/octoland', topics: ['#OCTOLand', '#KejarMimpi'], assets: ['as14'], template: 'Weekend seru di OCTO Land Blok M! {cerita} {link} {topik}', status: 'completed', creator: 'Fikri Ramadhan', owner: 'km', rate: 0.64 }),
    T({ id: 't8', name: 'Promo KPR · West Java branches', playbook: 'Local branch content', goal: 'City-specific KPR promo from the branch template', circles: ['KOS'], assignees: wj.map(a => a.id), channels: ['facebook', 'instagram'], start: at(-2, 9), deadline: at(5, 21), product: 'KPR', camp: 'octo', link: 'cimb.id/kpr-jabar', disclosure: true, topics: ['#KPRCIMBNiaga'], assets: ['as7'], template: 'Mau punya rumah di {kota}? KPR CIMB Niaga bunga fixed 3,88% p.a. tahun pertama. Syarat dan ketentuan berlaku. {link} {topik} #iklan', rate: 0.45 }),
    T({ id: 't9', name: 'OCTO untuk Keluarga · ambassador film reshare', playbook: 'OCTO campaigns', goal: 'Reshare the family film with a personal line', circles: ['KOS', 'KOC'], assignees: [...kos, ...koc].map(a => a.id), channels: ['instagram', 'facebook'], start: at(7, 9), deadline: at(13, 21), product: 'OCTO', camp: 'octo', link: 'cimb.id/keluarga', disclosure: true, topics: ['#OCTOuntukKeluarga'], assets: ['as9'], template: 'Atur keuangan keluarga lebih tenang pakai OCTO. {cerita} {link} {topik} #iklan', status: 'draft', rate: 0 }),
    T({ id: 't10', name: 'Kejar Mimpi FEST · invite your friends', playbook: 'Events to stories', goal: 'Members invite friends before the FEST (D−5)', circles: ['KOC'], assignees: koc.map(a => a.id), channels: ['instagram'], start: at(-6, 9), deadline: at(-1, 21), product: 'Kejar Mimpi', camp: 'km', link: 'cimb.id/kmfest-invite', topics: ['#KejarMimpi'], assets: ['as22'], template: 'Yuk datang ke Kejar Mimpi FEST minggu ini! {link} {topik}', status: 'completed', creator: 'Fikri Ramadhan', owner: 'km', rate: 0.7 })
  ];
  // executions
  S.tasks.forEach(t => {
    const r2 = mulberry32(hashStr(t.id));
    t.exec = t.assignees.map(aid => {
      const a = advs.find(x => x.id === aid);
      if (!a.optIn) return { adv: aid, st: 'optout' };
      if (t.status === 'draft' || t.status === 'review') return { adv: aid, st: 'pending' };
      if (t.id === 't1' && aid === kos[0].id) return { adv: aid, st: 'pending' };
      const done = r2() < t.rate;
      if (!done) return { adv: aid, st: t.status === 'completed' ? (r2() < 0.25 ? 'ignored' : 'late') : 'pending' };
      const plats = t.channels.filter((c, i) => (i === 0 || r2() < 0.5) && a.acc[c]);
      if (!plats.length) plats.push(t.channels.find(c => a.acc[c]) || 'instagram');
      const base = a.circle === 'KOL' ? a.followers * (0.18 + r2() * 0.2) : a.circle === 'KOC' ? 900 + r2() * r2() * 5200 : 600 + r2() * r2() * 3600;
      const views = Math.round(base * plats.length);
      const er = (a.circle === 'KOL' ? 0.028 : 0.02) + r2() * 0.012;
      const inter = Math.round(views * er);
      const likes = Math.round(inter * 0.8), comments = Math.round(inter * 0.12), shares = inter - likes - comments;
      const clicks = Math.round(views * (0.0015 + r2() * 0.0018));
      const span = Math.max(1, (Math.min(t.deadline, now.getTime()) - t.start));
      const atT = t.start + r2() * span;
      const hv = r2() < 0.03;
      return { adv: aid, st: 'done', at: atT, plats, url: plats.map(p => `${PLAT[p].name.toLowerCase()}.com/p/${(hashStr(aid + t.id + p) % 1e8).toString(36)}`), views, likes, comments, shares, clicks, signups: Math.round(clicks * (0.08 + r2() * 0.06)), onTime: atT <= t.deadline, hv };
    });
    if (t.paid) { t.exec.filter(e => e.st === 'done').forEach(e => { const a = advs.find(x => x.id === e.adv); a.kol.briefs++; a.kol.paidTotal += a.kol.fee; }); }
  });
  // points ledger from executions
  S.tasks.forEach(t => t.exec.forEach(e => {
    if (e.st === 'done' && t.points > 0) {
      const a = advs.find(x => x.id === e.adv);
      const add = (pts, reason, time) => { S.ledger.push({ adv: a.id, at: time, pts, reason }); a.points += pts; };
      add(t.points, 'Menyelesaikan tugas: ' + t.name, e.at);
      if (e.clicks >= 10) add(Math.floor(e.clicks / 10) * 2, `${e.clicks} klik ke OCTO`, e.at + 3600000);
      if ((e.likes + e.comments + e.shares) / e.views >= 0.03) add(10, 'Engagement ≥ 3%', e.at + 7200000);
      if (e.hv) add(30, 'Konten masuk pustaka (high-value)', e.at + DAY);
    } else if (e.st === 'late' && t.points > 0) {
      const a = advs.find(x => x.id === e.adv); S.ledger.push({ adv: a.id, at: t.deadline + 60000, pts: -5, reason: 'Tugas lewat batas: ' + t.name }); a.points -= 5;
      if (a.points < 0) a.points = 0;
    }
  }));
  // Rina's history for the phone demo
  const rina = kos[0];
  [[-20, 5, 'Bonus bergabung sebagai advokat'], [-12, 100, 'Peringkat 1 bulanan: tugas selesai (Oktober)']].forEach(([d, p, r]) => { S.ledger.push({ adv: rina.id, at: at(d, 10), pts: p, reason: r }); rina.points += p; });

  /* calendar posts (current week) */
  const T0 = startOfDay(now).getTime();
  const atD = (day, h) => T0 + day * DAY + h * 3600000;
  const P = (acc, day, h, title, camp, format, status) => ({ id: uid('p'), acc, at: atD(day, h), title, camp, format, status: status || (atD(day, h) < now.getTime() ? 'published' : 'scheduled'), caption: '' });
  S.posts = [
    P('ig_hy', 0, 19, 'Staff story', 'octo', 'Reel'),
    P('ig_main', 1, 10, 'OCTO launch', 'octo', 'Carousel'),
    P('tt_main', 1, 12, 'OCTO video', 'octo', 'Short video'),
    P('fb_main', 1, 11, 'OCTO post', 'octo', 'Video post'),
    P('x_main', 1, 13, 'OCTO thread', 'octo', 'Thread'),
    P('ig_km', 1, 16, 'Member story', 'octo', 'Story'),
    P('ig_sy', 2, 10, 'Syariah offer', 'octo', 'Carousel'),
    P('ig_main', 3, 12, 'Fraud tips', 'waspada', 'Carousel'),
    P('x_main', 3, 12, '#Waspada', 'waspada', 'Post'),
    P('th_main', 3, 12, 'Fraud tips (mirror)', 'waspada', 'Post'),
    P('tt_main', 4, 18, 'Money tip', 'tip', 'Short video'),
    P('ig_km', 4, 17, 'FEST recap', 'km', 'Reel'),
    P('ig_main', 5, 19, 'Kejar Mimpi FEST live', 'km', 'Story'),
    P('ig_main', -3, 10, 'Weekend money tip', 'tip', 'Carousel', 'published'),
    P('fb_main', -2, 11, 'OCTO Land weekend', 'km', 'Album', 'published')
  ];

  /* inbox */
  const M = (min, acc, kind, handle, text, extra = {}) => ({ id: uid('m'), at: ago(min), acc, kind, handle, raw: text, status: 'new', thread: [], ...extra });
  S.inbox = [
    M(8, 'x_main', 'Mention', '@ag***19', '@CIMBNiaga ada yang telp ngaku dari CIMB, minta kode OTP buat "verifikasi data". Ini beneran?'),
    M(12, 'ig_main', 'Comment', '@fa***31', 'Pinjaman cepat cair tanpa BI checking, klik bit.ly/dana-kilat'),
    M(19, 'x_main', 'Mention', '@bu***45', 'Saldo terpotong tapi transfer gagal, tolong dicek. Sudah 2 hari belum kembali!'),
    M(25, 'x_main', 'Mention', '@an***12', 'Ada akun CS CIMB minta OTP saya, ini resmi?', { pre: 9 }),
    M(31, 'ig_main', 'Comment', '@ra***na', 'Makasih OCTO, transfer cepat banget!'),
    M(38, 'fb_main', 'Comment', '@de***07', 'Ada promo KPR bulan ini?'),
    M(40, 'x_main', 'Mention', '@yu***dh', 'Dapet SMS hadiah undian CIMB Niaga suruh klik s.id/cimb-hadiah, ini penipuan kan?', { pre: 11 }),
    M(47, 'tt_main', 'Comment', '@yo***88', 'Kejar Mimpi FEST seru parah!'),
    M(55, 'x_main', 'Mention', '@ri***an', 'Udah 3 hari kartu kredit saya diblokir tanpa pemberitahuan, CS susah dihubungi'),
    M(63, 'ig_main', 'DM', '@me***ka', 'Min, kok login OCTO minta OTP terus tapi SMS-nya gak masuk-masuk?'),
    M(6, 'x_main', 'Reply', '@so***wi', 'Thread: aplikasi OCTO down dari pagi, banyak nasabah gak bisa transfer gaji. Udah viral, RT 1,2rb', { shares: 1200 }),
    M(78, 'fb_main', 'Comment', '@su***no', 'Biaya admin bulanan naik ya? Kok saldo saya kepotong Rp15.000', { pre: 12 }),
    M(86, 'th_main', 'Reply', '@ka***ra', 'OCTO untuk Pejuang Mimpi relate banget sama hidup gue'),
    M(94, 'tt_main', 'Comment', '@ze***ys', 'Cara aktifkan kartu di OCTO gimana?', { pre: 20 }),
    M(103, 'ig_km', 'Comment', '@mu***af', 'Kapan Kejar Mimpi FEST ada di Makassar?', { pre: 25 }),
    M(112, 'ig_hy', 'Comment', '@ad***ya', 'Pengen banget kerja di CIMB Niaga, ada lowongan RM?', { pre: 31 }),
    M(125, 'x_main', 'Mention', '@ha***to', 'Antrian di cabang Kelapa Gading lama banget, 2 jam belum dipanggil', { pre: 14 }),
    M(140, 'fb_main', 'Comment', '@li***ni', 'Terima kasih Mbak Sari di cabang Bandung Dago, ramah dan sabar banget bantu urus KPR saya'),
    M(158, 'ig_sy', 'Comment', '@ab***ah', 'Apakah tabungan iB ada fitur wakaf otomatis?', { pre: 22 }),
    M(170, 'tt_main', 'Comment', '@cimbniaga.cs', 'Follow akun ini untuk bantuan CIMB 24 jam, DM nomor kartu kamu'),
    M(33, 'x_main', 'Mention', '@ti***na', 'Transfer ke rekening 706012345678 belum masuk dari kemarin, no HP saya 081234567890 tolong hubungi'),
    M(203, 'ig_main', 'Comment', '@pa***di', 'Padel di OCTO Arena mantap, lapangannya bagus', { pre: 40 }),
    M(221, 'fb_main', 'Comment', '@we***ng', 'Gimana cara tutup kartu kredit lewat OCTO?', { pre: 18 }),
    M(60 * 26, 'x_main', 'Mention', '@bu***77', 'OCTO transfer gagal, saldo terdebet. Mohon dibantu', { status: 'ticketed' })
  ];
  // two handled examples
  const praise = S.inbox[4];
  praise.status = 'replied'; praise.firstReplyAt = praise.at + 14 * 60000;
  praise.thread.push({ from: 'brand', at: praise.firstReplyAt, text: 'Terima kasih banyak, Kak! Senang OCTO bisa bantu kejar mimpimu.', by: 'Agus F.' });
  praise.thread.push({ from: 'brand', at: praise.firstReplyAt + 60000, text: 'Boleh ceritanya kami bagikan di akun CIMB Niaga?', by: 'Agus F.' });
  praise.thread.push({ from: 'customer', at: praise.firstReplyAt + 9 * 60000, text: 'Boleh banget!' });
  praise.permission = true;

  /* tickets */
  const tickets = [];
  const workAgo = k => { let d = startOfDay(now); let c = 0; while (c < k) { d = new Date(d.getTime() - DAY); if (isWorkday(d)) c++; } return d.getTime(); };
  const main = { id: 'SM-24817', createdAt: workAgo(2) + (9 * 60 + 42) * 60000, src: { acc: 'x_main', kind: 'Mention', handle: '@bu***77' }, issue: 'OCTO transfer failed, balance debited', product: 'OCTO', theme: 'Transfer delayed', sentiment: 'Negative', priority: 'High', owner: 'Digital banking care', contact: 'Moved to Ask OCTO WhatsApp', status: 'progress', docsAt: workAgo(2) + 11 * 3600000, extended: false, cms: 'CMS-2026-118342', step: 6, log: [] };
  main.log = [
    { at: main.createdAt, text: 'Captured from X mention of @CIMBNiaga', by: 'Lume' },
    { at: main.createdAt + 60000, text: 'Classified: Complaint · Negative · High · OCTO / transfer. Account number masked.', by: 'Alivia AI' },
    { at: main.createdAt + 16 * 60000, text: 'Public acknowledgement posted; customer moved to Ask OCTO WhatsApp', by: 'Agus F. (care desk)' },
    { at: main.createdAt + 17 * 60000, text: 'Ticket created in CIMB Niaga complaint system: CMS-2026-118342', by: 'Lume API' },
    { at: main.createdAt + 18 * 60000, text: 'Routed to Digital banking care', by: 'Alivia AI' },
    { at: main.docsAt, text: 'Documents complete; OJK clock started (10 working days)', by: 'Digital banking care' }
  ];
  S.inbox[S.inbox.length - 1].ticketId = 'SM-24817';
  S.inbox[S.inbox.length - 1].firstReplyAt = main.createdAt + 16 * 60000;
  S.inbox[S.inbox.length - 1].at = main.createdAt;
  S.inbox[S.inbox.length - 1].thread.push({ from: 'brand', at: main.createdAt + 16 * 60000, text: 'Mohon maaf atas kendalanya, Kak. Demi keamanan, jangan bagikan data rekening di sini ya. Tim kami hubungi via DM. No. tiket: SM-24817.', by: 'Agus F.' });
  tickets.push(main);
  const issues = [
    ['OCTO login / OTP', 'OCTO', 'OTP SMS not received at login'], ['Transfer delayed', 'OCTO', 'Interbank transfer pending > 1 day'], ['Card blocked', 'OCTO Card', 'Credit card blocked without notice'],
    ['Fees and charges', 'Tabungan', 'Unexpected monthly admin fee'], ['Branch queue', 'Branch', 'Long queue at branch'], ['App error', 'OCTO', 'App crashes on QRIS payment'],
    ['Card limit', 'OCTO Card', 'Limit increase request not processed'], ['KPR process', 'KPR', 'KPR approval status unclear'], ['Account opening', 'OCTO', 'e-KYC video call failed'], ['Transfer delayed', 'OCTO', 'BI-FAST transfer debited, not received']
  ];
  const srcAcc = ['x_main', 'x_main', 'ig_main', 'fb_main', 'tt_main', 'x_main', 'ig_main'];
  for (let i = 0; i < 70; i++) {
    const [theme, product, issue] = issues[Math.floor(rnd() * issues.length)];
    const closed = i >= 41;
    const age = closed ? 3 + Math.floor(rnd() * 22) : Math.floor(rnd() * 8); // working days ago
    const created = workAgo(age) + Math.floor(8 + rnd() * 10) * 3600000;
    const docsAt = (age === 0 && rnd() < 0.5) ? null : created + 3 * 3600000;
    const t = {
      id: 'SM-' + (24770 + i + (i >= 47 ? 1 : 0)), createdAt: created, src: { acc: srcAcc[Math.floor(rnd() * srcAcc.length)], kind: pick(['Mention', 'Comment', 'DM']), handle: '@' + pick('abcdefghijklmnoprstuwyz'.split('')) + pick('aeiou'.split('')) + '***' + Math.floor(10 + rnd() * 89) },
      issue, product: product === 'Branch' ? 'Tabungan' : product, theme, sentiment: 'Negative', priority: theme === 'Transfer delayed' || theme === 'Card blocked' ? 'High' : rnd() < 0.5 ? 'Medium' : 'Low',
      owner: product === 'Branch' ? 'Branch operations' : (OWNERS[product] || 'Digital banking care'), contact: rnd() < 0.8 ? 'Moved to Ask OCTO WhatsApp' : 'Direct message', status: closed ? (rnd() < 0.7 ? 'closed' : 'resolved') : docsAt ? (rnd() < 0.7 ? 'progress' : 'open') : 'waiting',
      docsAt, extended: false, cms: 'CMS-2026-' + (117900 + i * 7), step: closed ? 8 : docsAt ? 6 : 4, log: []
    };
    if (closed) {
      if (!t.docsAt) t.docsAt = created + 3 * 3600000;
      const late = i === 44 || i === 59;
      const dl = deadlineOf(t);
      t.closedAt = late ? dl + 2 * DAY : Math.min(now.getTime() - 3600000, t.docsAt + (1 + rnd() * 6) * DAY);
      if (t.closedAt < t.createdAt) t.closedAt = t.createdAt + 6 * 3600000;
      t.csat = 3 + Math.floor(rnd() * 3); t.publicFollowUp = true;
      if (t.status === 'resolved') t.step = 7;
    }
    if (i === 3) { t.docsAt = workAgo(9) + 10 * 3600000; t.status = 'progress'; t.priority = 'High'; t.step = 6; t.extended = false; }
    if (i === 7) { t.createdAt = workAgo(11) + 9 * 3600000; t.docsAt = workAgo(11) + 10 * 3600000; t.status = 'progress'; t.extended = false; t.step = 6; t.theme = 'Card blocked'; t.issue = 'Card blocked; customer abroad'; t.product = 'OCTO Card'; t.owner = 'Cards'; t.priority = 'High'; }
    if (i === 3) t.createdAt = workAgo(9) + 9 * 3600000;
    if (i === 5 || i === 12) { t.createdAt = workAgo(13) + 9 * 3600000; t.docsAt = t.createdAt + 3 * 3600000; t.extended = true; t.status = 'progress'; t.step = 6; }
    t.log = [{ at: t.createdAt, text: 'Captured from ' + accById(t.src.acc, S).handle, by: 'Lume' }, { at: t.createdAt + 120000, text: `Classified: Complaint · ${t.theme}`, by: 'Alivia AI' }];
    if (t.docsAt) t.log.push({ at: t.docsAt, text: 'Documents complete; OJK clock started', by: t.owner });
    if (t.closedAt) t.log.push({ at: t.closedAt, text: 'Resolved; customer informed and public follow-up posted', by: t.owner });
    tickets.push(t);
  }
  S.tickets = tickets.sort((a, b) => b.createdAt - a.createdAt);

  /* listening aggregates (today) */
  S.listen = {
    day: dKey(now),
    byAcc: { x_main: 760, ig_main: 620, fb_main: 410, tt_main: 380, th_main: 70, ig_km: 60, ig_hy: 25, ig_sy: 15 },
    sent: { pos: 1357, neu: 702, neg: 281 },
    themes: { 'OCTO login / OTP': 31, 'Transfer delayed': 24, 'Card blocked': 17, 'Fees and charges': 13, 'Branch queue': 9 },
    firstReply: { x: [18, 120], instagram: [26, 64], facebook: [34, 40], tiktok: [41, 30], threads: [55, 8] },
    baselinePos: 0.53,
    hourly: [22, 14, 9, 6, 5, 9, 31, 78, 140, 176, 188, 172, 165, 160, 151, 149, 143, 138, 120, 110, 96, 84, 70, 52].slice(0, now.getHours() + 1)
  };
  const hs = S.listen.hourly.reduce((a, b) => a + b, 0);
  S.listen.hourly = S.listen.hourly.map(v => Math.round(v * 2340 / Math.max(hs, 1)));
  S.brandReach = { octo: 1200000, km: 640000, waspada: 900000, card: 420000, life: 90000, tip: 300000 };
  // compliance audit seed
  const au = (min, src, text, result, issues, by) => S.audit.push({ id: uid('au'), at: ago(min), src, text, result, issues, by, ver: 1 });
  au(35, 'Task t1 · advocate caption', 'Seru banget di Kejar Mimpi FEST! Atur dana impian lebih gampang pakai OCTO. #KejarMimpi #iklan', 'Ready', [], 'Rizky Pratama');
  au(52, 'Calendar post · @cimb_niaga', 'Investasi reksa dana di OCTO pasti untung 12% per tahun, dijamin aman!', 'Blocked', ['Guaranteed returns', 'Risk warning', 'Disclosure tag'], 'Dewi Anggraini');
  au(80, 'Care reply · X', 'Terima kasih sudah waspada, Kak. CIMB Niaga tidak pernah meminta OTP…', 'Ready', [], 'Agus Firmansyah');
  au(130, 'Task t4 · creator caption', 'OCTO Card cicilan 0% sampai 24 bulan!', 'Blocked', ['Product facts', 'Disclosure tag'], '@kulinerkantor');
  au(190, 'Library upload · PGC', 'Reksa dana di OCTO · explainer', 'Sent to Compliance', [], 'Dewi Anggraini');
  S.notifs = [
    { id: uid('n'), at: ago(8), ic: 'alert', text: 'Scam wave: 3 fraud mentions in the last 60 minutes', go: '#care', unread: true },
    { id: uid('n'), at: ago(70), ic: 'alert', text: 'Crisis or viral: OCTO outage thread on X (1.2K reposts)', go: '#care', unread: true },
    { id: uid('n'), at: ago(190), ic: 'shield', text: 'Reksa dana explainer is waiting for Compliance approval', go: '#compliance', unread: true },
    { id: uid('n'), at: ago(300), ic: 'clock', text: '2 social tickets are within 2 working days of the OJK deadline', go: '#tickets', unread: false }
  ];
  return S;
}
function accById(id, st) { return ((st || S).accounts.find(a => a.id === id)) || { handle: id, platform: 'x', name: id }; }
