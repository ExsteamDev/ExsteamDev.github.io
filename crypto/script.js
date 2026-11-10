// Демо-данные. hold — сколько монет в кошельке; баланс и изменения считаются из них.
const COINS = [
  { sym: 'BTC', name: 'Bitcoin', glyph: '₿', color: '#f7931a', price: 98420.15, chg: 2.84, chg7: 6.1, cap: '1,94 трлн', hold: 0.2841 },
  { sym: 'ETH', name: 'Ethereum', glyph: 'Ξ', color: '#8c8cff', price: 3484.62, chg: 4.12, chg7: 9.4, cap: '419 млрд', hold: 3.12 },
  { sym: 'SOL', name: 'Solana', glyph: 'S', color: '#14f195', price: 214.37, chg: -1.85, chg7: -4.2, cap: '101 млрд', hold: 22.5 },
  { sym: 'TON', name: 'Toncoin', glyph: 'T', color: '#0098ea', price: 6.92, chg: 7.31, chg7: 15.8, cap: '17,4 млрд', hold: 640 },
  { sym: 'BNB', name: 'BNB', glyph: 'B', color: '#f3ba2f', price: 712.4, chg: 0.94, chg7: 2.3, cap: '104 млрд', hold: 0 },
  { sym: 'XRP', name: 'XRP', glyph: 'X', color: '#a7b1c2', price: 2.41, chg: -3.12, chg7: -7.5, cap: '138 млрд', hold: 0 },
  { sym: 'DOGE', name: 'Dogecoin', glyph: 'Ð', color: '#d4b13f', price: 0.3912, chg: 11.6, chg7: 21.4, cap: '57,6 млрд', hold: 0 },
  { sym: 'USDT', name: 'Tether', glyph: '₮', color: '#26a17b', price: 1, chg: 0, chg7: 0, cap: '142 млрд', hold: 0, stable: true },
];
const FEE = 0.001; // 0,1% за обмен

const PERIODS = {
  '1d': { label: 'за 24ч', n: 48, seed: 11 },
  '1w': { label: 'за неделю', n: 56, seed: 7, pct: 12.8 },
  '1m': { label: 'за месяц', n: 60, seed: 29, pct: 24.1 },
  '1y': { label: 'за год', n: 72, seed: 41, pct: 148.3 },
};

const $ = id => document.getElementById(id);
const num = (n, d = 2) => n.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });
const usd = (n, d = 2) => '$' + num(n, d);
const amt = (n, c) => n.toLocaleString('ru-RU', { maximumFractionDigits: c.price >= 100 ? 6 : 2 }); // количество монет
const sign = n => (n >= 0 ? '+' : '−');
const pct = n => sign(n) + num(Math.abs(n)) + '%';
const cls = n => (n >= 0 ? 'up' : 'down');
const icon = c => `<i class="coin" style="--c:${c.color}">${c.glyph}</i>`;
const coin = sym => COINS.find(c => c.sym === sym);

// Детерминированное «случайное блуждание»: график похож на живой, но всегда одинаковый
// и заканчивается ровно на заданном изменении change (%).
function series(seed, n, change, vol = 0.03) {
  let s = seed, x = 1;
  const out = [];
  for (let i = 0; i < n; i++) {
    s = s * 16807 % 2147483647;
    x *= 1 + (s / 2147483647 - 0.5) * vol;
    out.push(x);
  }
  const fix = (1 + change / 100) / (out[n - 1] / out[0]);
  return out.map((v, i) => v * fix ** (i / (n - 1)));
}

// Значения → SVG-путь в прямоугольнике w×h с отступом pad сверху и снизу.
function line(vals, w, h, pad) {
  const min = Math.min(...vals), max = Math.max(...vals);
  return 'M' + vals.map((v, i) =>
    `${(i / (vals.length - 1) * w).toFixed(1)},${(pad + (1 - (v - min) / (max - min || 1)) * (h - 2 * pad)).toFixed(1)}`
  ).join('L');
}

const spark = (c, i) =>
  `<svg class="spark" viewBox="0 0 120 40" preserveAspectRatio="none" aria-hidden="true"><path d="${line(series(i * 7919 + 3, 32, c.chg7), 120, 40, 4)}" style="stroke:var(--${cls(c.chg7)})"/></svg>`;

const today = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
$('today').textContent = today[0].toUpperCase() + today.slice(1);

// --- Кошелёк: баланс, график, карточки активов ---
let total = 0;
let period = '1d';

function renderChart() {
  const p = PERIODS[period];
  const d = line(series(p.seed, p.n, p.pct, 0.035), 800, 260, 16);
  $('chart').innerHTML = `
    <defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-opacity=".3"/><stop offset="1" stop-opacity="0"/></linearGradient></defs>
    ${[65, 130, 195].map(y => `<line class="grid" x1="0" x2="800" y1="${y}" y2="${y}"/>`).join('')}
    <path class="area" d="${d}L800,260L0,260Z"/>
    <path class="line" d="${d}" pathLength="1"/>`;
  const diff = total - total / (1 + p.pct / 100);
  $('change').className = 'chg ' + cls(p.pct);
  $('change').innerHTML = `${sign(diff)}${usd(Math.abs(diff))} · ${pct(p.pct)} <span class="muted">${p.label}</span>`;
}

function renderWallet() {
  total = COINS.reduce((s, c) => s + c.hold * c.price, 0);
  const dayUsd = COINS.reduce((s, c) => s + c.hold * c.price * (1 - 1 / (1 + c.chg / 100)), 0);
  PERIODS['1d'].pct = dayUsd / (total - dayUsd) * 100;

  const [whole, cents] = usd(total).split(',');
  $('total').innerHTML = `${whole}<span>,${cents}</span>`;
  renderChart();

  $('assets').innerHTML = COINS.slice(0, 4).map((c, i) => `
    <article class="panel asset">
      <div class="asset-head">${icon(c)}<div><b>${c.name}</b><small>${c.sym}</small></div><span class="pct ${cls(c.chg)}">${pct(c.chg)}</span></div>
      <div><div class="asset-value">${usd(c.hold * c.price)}</div><div class="asset-amt">${amt(c.hold, c)} ${c.sym}</div></div>
      ${spark(c, i)}
    </article>`).join('');
}

document.querySelector('.tabs').addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  document.querySelector('.tabs .active').classList.remove('active');
  btn.classList.add('active');
  period = btn.dataset.period;
  renderChart();
});

$('market').innerHTML = COINS.filter(c => !c.stable).map((c, i) => `
  <tr>
    <td><div class="coin-cell">${icon(c)}<div><b>${c.name}</b><small>${c.sym}</small></div></div></td>
    <td>${usd(c.price, c.price < 1 ? 4 : 2)}</td>
    <td><span class="pct ${cls(c.chg)}">${pct(c.chg)}</span></td>
    <td>$${c.cap}</td>
    <td>${spark(c, i)}</td>
  </tr>`).join('');

// --- Обмен ---
const form = $('swap'), input = $('amount'), fromSel = $('from'), toSel = $('to'), submit = $('submit');
for (const sel of [fromSel, toSel]) sel.innerHTML = COINS.map(c => `<option>${c.sym}</option>`).join('');
fromSel.value = 'ETH';
toSel.value = 'USDT';

const amount = () => parseFloat(input.value.replace(/\s/g, '').replace(',', '.'));

function quote() {
  const from = coin(fromSel.value), to = coin(toSel.value), a = amount();
  const out = a > 0 ? a * from.price / to.price * (1 - FEE) : 0;
  const error = from === to ? 'Выберите разные монеты'
    : !(a > 0) ? 'Введите сумму'
    : a > from.hold + 1e-9 ? `Недостаточно ${from.sym}` : '';
  return { from, to, a, out, error };
}

function update() {
  const { from, to, a, out, error } = quote();
  for (const [el, c] of [[$('from-icon'), from], [$('to-icon'), to]]) {
    el.style.setProperty('--c', c.color);
    el.textContent = c.glyph;
  }
  $('out').textContent = amt(out, to);
  $('from-usd').textContent = '≈ ' + usd(a > 0 ? a * from.price : 0);
  $('max').textContent = `Доступно: ${amt(from.hold, from)} ${from.sym}`;
  $('rate').textContent = `1 ${from.sym} = ${amt(from.price / to.price, to)} ${to.sym}`;
  $('fee').textContent = `0,1% · ${usd(a > 0 ? a * from.price * FEE : 0)}`;
  if (submit.classList.contains('done')) return; // пока показываем «Готово», текст кнопки не трогаем
  submit.disabled = !!error;
  submit.textContent = error || 'Обменять';
}

input.addEventListener('input', update);
fromSel.addEventListener('change', update);
toSel.addEventListener('change', update);

$('max').addEventListener('click', () => {
  input.value = coin(fromSel.value).hold.toLocaleString('ru-RU', { maximumFractionDigits: 8, useGrouping: false });
  update();
});

$('flip').addEventListener('click', () => {
  [fromSel.value, toSel.value] = [toSel.value, fromSel.value];
  update();
});

const SWAP_ICON = '<svg class="i" viewBox="0 0 24 24"><path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 23-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>';

form.addEventListener('submit', e => {
  e.preventDefault();
  const { from, to, a, out, error } = quote();
  if (error) return;

  from.hold = Math.max(0, from.hold - a);
  to.hold += out;
  renderWallet();

  const list = $('tx-list');
  list.insertAdjacentHTML('afterbegin', `
    <li>
      <span class="tx-ico acc">${SWAP_ICON}</span>
      <div class="tx-main"><b>Обмен ${from.sym} → ${to.sym}</b><small>Только что</small></div>
      <div class="tx-amt up">+${amt(out, to)} ${to.sym}<small>−${amt(a, from)} ${from.sym}</small></div>
    </li>`);
  list.lastElementChild.remove(); // в списке всегда 5 последних операций

  input.value = '';
  submit.classList.add('done');
  submit.disabled = true;
  submit.textContent = 'Готово ✓';
  setTimeout(() => { submit.classList.remove('done'); update(); }, 1600);
  update();
});

renderWallet();
update();
