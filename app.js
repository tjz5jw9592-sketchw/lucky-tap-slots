const tg = window.Telegram?.WebApp;
try { tg?.ready(); tg?.expand(); tg?.setHeaderColor('#120626'); tg?.setBackgroundColor('#090313'); } catch {}

const state = { user: null, tab: 'home', leaders: [], error: '', pending: 0, batchStart: Date.now(), sending: false, spinning: false, result: '', winLines: [] };
const $ = s => document.querySelector(s);
const fmt = n => new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1, notation: n > 99999 ? 'compact' : 'standard' }).format(n || 0);
const cost = l => Math.floor(250 * Math.pow(1.75, l - 1));
const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));

async function api(path, options = {}) {
  const res = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': tg?.initData || '', ...(options.headers || {}) } });
  const data = await res.json().catch(() => ({ error: 'Brak odpowiedzi serwera' }));
  if (!res.ok) throw new Error(data.error || 'Błąd');
  return data;
}

function render() {
  const u = state.user;
  if (!u) {
    $('#app').innerHTML = `<div class="loading"><div class="loader">7️⃣</div><h2>Lucky Tap Slots</h2><p>${state.error || 'Rozgrzewamy bębny…'}</p></div>`;
    return;
  }
  const level = Math.floor(Math.sqrt(u.coins / 800)) + 1;
  $('#app').innerHTML = `<header><div class="profile"><div class="avatar">${esc((u.firstName || 'G')[0])}</div><div><small>VIP PLAYER</small><strong>${esc(u.firstName)}</strong></div></div><div class="level">LVL ${level}</div></header>${state.error ? `<button class="toast" data-action="close-error">${esc(state.error)}</button>` : ''}<section>${page(u)}</section><nav>${[['home','🎰','Graj'],['mine','💰','Dochód'],['shop','💎','Sklep'],['rank','🏆','Ranking']].map(([k,i,l]) => `<button data-tab="${k}" class="${state.tab === k ? 'active' : ''}"><i>${i}</i><span>${l}</span></button>`).join('')}</nav>`;
  bind();
}

function page(u) {
  if (state.tab === 'home') return home(u);
  if (state.tab === 'mine') return panel('Pasywny dochód', 'Zarabiaj monety także poza grą', `<div class="mine-card"><div class="big-icon">💰</div><h2>${fmt(u.miningRate)} / sek.</h2><p>Gotowe do odebrania</p><strong>${fmt(u.availableMining)} monet</strong><button class="primary" data-action="claim" ${u.availableMining < 1 ? 'disabled' : ''}>ODBIERZ</button></div>${info('Limit offline', '8 godzin')}${info('Poziom automatu', u.minerLevel)}${history(u)}`);
  if (state.tab === 'shop') {
    const en = Math.round((u.maxEnergy - 500) / 250) + 1;
    const charge = Math.max(1, Math.round((60 - u.spinGoal) / 5) + 1);
    return panel('Kasyno ulepszeń', 'Rozwijaj automat i przyspieszaj progres', upgrade('👆','Moc tapnięcia',u.tapPower,`+${u.tapPower} monet / tap`,cost(u.tapPower),'tap') + upgrade('⚡','Magazyn energii',en,`${u.maxEnergy} energii`,cost(en),'energy') + upgrade('🍀','Poziom szczęścia',u.luckLevel,'Lepsze symbole i nagrody',cost(u.luckLevel),'luck') + upgrade('🎰','Szybszy Lucky Spin',charge,`${u.spinGoal} tapnięć / spin`,cost(charge),'charge') + upgrade('💰','Automat pasywny',u.minerLevel + 1,`${fmt(u.miningRate)} monet / sek.`,cost(u.minerLevel + 1),'miner'));
  }
  return panel('Ranking VIP', 'Najbogatsi gracze i największe wygrane', `<div class="leaderboard">${state.leaders.map(l => `<div class="leader"><span class="place p${l.rank}">${l.rank}</span><b>@${esc(l.username)}</b><strong>${fmt(l.coins)} 🪙</strong></div>`).join('') || '<p class="muted">Ładowanie rankingu…</p>'}</div>`);
}

function home(u) {
  const symbols = state.lastSymbols || ['🍒','⭐','7️⃣','🍋','💎','🍒','⭐','👑','🍋'];
  const winning = new Set(state.winLines.flat());
  const spinPct = Math.min(100, u.spinProgress / u.spinGoal * 100);
  const combo = Date.now() < u.comboExpiresAt ? u.combo : 1;
  return `<div class="jackpot"><span>PROGRESYWNY JACKPOT</span><strong>${fmt(u.jackpot)} 🪙</strong></div><div class="machine ${state.spinning ? 'spinning' : ''}"><div class="machine-top">★ LUCKY TAP ★</div><div class="reels">${symbols.map((s,i) => `<div class="symbol ${winning.has(i) ? 'win' : ''}">${s}</div>`).join('')}</div><div class="spin-row"><button class="spin-btn" data-action="spin" ${u.freeSpins < 1 || state.spinning ? 'disabled' : ''}>${state.spinning ? 'KRĘCĘ…' : 'DARMOWY SPIN'}</button><div class="free-spins"><small>SPINY</small><b>${u.freeSpins}</b></div></div><div class="result">${esc(state.result || 'Każdy spin daje nagrodę')}</div></div><div class="tap-card"><div class="stats"><div><span>SALDO</span><strong>${fmt(u.coins)} 🪙</strong></div><div><span>COMBO</span><strong>x${combo}</strong></div></div><button class="tap-btn" data-action="tap">TAP<br><small>+${u.tapPower * combo}</small></button><div class="progress-label"><span>ŁADOWANIE LUCKY SPIN</span><b>${u.spinProgress}/${u.spinGoal}</b></div><div class="bar spin-bar"><i style="width:${spinPct}%"></i></div><div class="energy"><span>⚡ <b>${Math.floor(u.energy)}</b> / ${u.maxEnergy}</span><span>+1 co 2 sek.</span></div><div class="bar energy-bar"><i style="width:${u.energy/u.maxEnergy*100}%"></i></div></div><button class="daily" data-action="daily"><i>🎁</i><span><b>Dzienna nagroda</b><small>500 monet + 1 darmowy spin</small></span><b>›</b></button>${history(u)}`;
}

const panel = (t,s,c) => `<div class="page-title"><h1>${t}</h1><p>${s}</p></div>${c}`;
const info = (l,v) => `<div class="info"><span>${l}</span><b>${v}</b></div>`;
const upgrade = (ic,t,l,d,p,type) => `<article class="upgrade"><div class="upgrade-icon">${ic}</div><div class="upgrade-copy"><small>POZIOM ${l}</small><b>${t}</b><span>${d}</span></div><button data-upgrade="${type}">${fmt(p)} 🪙</button></article>`;
function history(u) { return `<div class="history"><h3>Ostatnie wygrane</h3>${(u.recentSpins || []).slice(0,5).map(s => `<div class="history-item"><span>@${esc(s.username)}</span><span class="mini-symbols">${s.symbols.slice(0,3).join('')}</span><b>+${fmt(s.reward)}</b></div>`).join('') || '<p class="muted">Pierwszy spin czeka na Ciebie.</p>'}</div>`; }

function bind() {
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = async () => { state.tab = b.dataset.tab; if (state.tab === 'rank') try { state.leaders = await api('/api/leaderboard'); } catch {} render(); });
  $('[data-action="close-error"]')?.addEventListener('click', () => { state.error = ''; render(); });
  $('[data-action="tap"]')?.addEventListener('pointerdown', tap);
  $('[data-action="spin"]')?.addEventListener('click', spin);
  $('[data-action="daily"]')?.addEventListener('click', () => run(() => api('/api/daily', { method: 'POST' })));
  $('[data-action="claim"]')?.addEventListener('click', () => run(() => api('/api/claim', { method: 'POST' })));
  document.querySelectorAll('[data-upgrade]').forEach(b => b.onclick = () => run(() => api('/api/upgrade', { method: 'POST', body: JSON.stringify({ type: b.dataset.upgrade }) })));
}

function tap(e) {
  const u = state.user;
  if (!u || u.energy < 1) return;
  try { tg?.HapticFeedback?.impactOccurred('light'); } catch {}
  const combo = Date.now() < u.comboExpiresAt ? u.combo : 1;
  state.pending++;
  u.coins += u.tapPower * combo;
  u.energy = Math.max(0, u.energy - 1);
  u.spinProgress++;
  if (u.spinProgress >= u.spinGoal) { u.spinProgress -= u.spinGoal; u.freeSpins++; try { tg?.HapticFeedback?.notificationOccurred('success'); } catch {} }
  const r = e.currentTarget.getBoundingClientRect();
  const f = document.createElement('b'); f.className = 'floater'; f.textContent = `+${u.tapPower * combo}`; f.style.left = `${e.clientX-r.left}px`; f.style.top = `${e.clientY-r.top}px`; e.currentTarget.append(f); setTimeout(() => f.remove(), 700);
  renderValues();
}

async function spin() {
  if (state.spinning) return;
  state.spinning = true; state.result = ''; state.winLines = []; render();
  try {
    const dataPromise = api('/api/spin', { method: 'POST' });
    const flicker = setInterval(() => { state.lastSymbols = Array.from({length:9}, () => ['🍒','🍋','⭐','7️⃣','💎','👑','🔥'][Math.floor(Math.random()*7)]); renderSymbolsOnly(); }, 110);
    const data = await dataPromise;
    await new Promise(r => setTimeout(r, 900)); clearInterval(flicker);
    state.user = data; state.lastSymbols = data.spin.symbols; state.winLines = data.spin.wins.map(w => w.line); state.result = data.spin.jackpot ? `JACKPOT! +${fmt(data.spin.reward)} monet` : `Wygrana: +${fmt(data.spin.reward)} monet`;
    try { tg?.HapticFeedback?.notificationOccurred(data.spin.wins.length ? 'success' : 'warning'); } catch {}
  } catch (e) { state.error = e.message; }
  finally { state.spinning = false; render(); }
}

function renderSymbolsOnly() { document.querySelectorAll('.symbol').forEach((el,i) => el.textContent = state.lastSymbols[i]); }
function renderValues() {
  const u = state.user; if (!u) return;
  const stat = $('.stats strong'); if (stat) stat.textContent = `${fmt(u.coins)} 🪙`;
  const e = $('.energy b'); if (e) e.textContent = Math.floor(u.energy);
  const eb = $('.energy-bar i'); if (eb) eb.style.width = `${u.energy/u.maxEnergy*100}%`;
  const sb = $('.spin-bar i'); if (sb) sb.style.width = `${u.spinProgress/u.spinGoal*100}%`;
  const label = $('.progress-label b'); if (label) label.textContent = `${u.spinProgress}/${u.spinGoal}`;
  const spins = $('.free-spins b'); if (spins) spins.textContent = u.freeSpins;
}
async function run(fn) { try { state.error = ''; state.user = await fn(); } catch (e) { state.error = e.message; } render(); }

setInterval(async () => {
  if (!state.user || state.sending || !state.pending) return;
  state.sending = true;
  const clicks = state.pending; state.pending = 0;
  const duration = Math.max(100, Date.now() - state.batchStart); state.batchStart = Date.now();
  try { state.user = await api('/api/tap', { method: 'POST', body: JSON.stringify({ clicks, durationMs: duration }) }); }
  catch (e) { state.error = e.message; render(); }
  finally { state.sending = false; }
}, 650);

setInterval(() => { if (state.user) { state.user.energy = Math.min(state.user.maxEnergy, state.user.energy + .5); state.user.availableMining += state.user.miningRate; renderValues(); } }, 1000);
api('/api/me').then(u => { state.user = u; render(); }).catch(e => { state.error = e.message; render(); });
