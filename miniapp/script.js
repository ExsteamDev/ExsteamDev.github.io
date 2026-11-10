const MENU = [
  { id: 'cappuccino', cat: 'coffee', name: 'Капучино', price: 220, drink: true, desc: 'Двойной эспрессо и плотная бархатная молочная пена.' },
  { id: 'latte', cat: 'coffee', name: 'Латте', price: 230, drink: true, desc: 'Больше молока, мягкий сливочный вкус.' },
  { id: 'flatwhite', cat: 'coffee', name: 'Флэт уайт', price: 240, drink: true, desc: 'Двойной ристретто и тонкий слой молока — вкус кофе ярче.' },
  { id: 'raf', cat: 'coffee', name: 'Раф ванильный', price: 270, drink: true, desc: 'Эспрессо, сливки и ванильный сахар, взбитые вместе.' },
  { id: 'icelatte', cat: 'coffee', name: 'Айс латте', price: 260, drink: true, desc: 'Эспрессо, холодное молоко и много льда.' },
  { id: 'matcha', cat: 'nocoffee', name: 'Матча латте', price: 290, drink: true, desc: 'Японский зелёный чай матча, взбитый на молоке.' },
  { id: 'cocoa', cat: 'nocoffee', name: 'Какао', price: 210, drink: true, desc: 'Настоящий какао-порошок и горячее молоко, без смесей.' },
  { id: 'croissant', cat: 'bakery', name: 'Круассан', price: 160, weight: '70 г', desc: 'Сливочное масло и 27 слоёв теста. Печём каждое утро.' },
  { id: 'cinnabon', cat: 'bakery', name: 'Синнабон', price: 190, weight: '120 г', desc: 'Булочка с корицей и сливочным кремом.' },
  { id: 'cheesecake', cat: 'bakery', name: 'Баскский чизкейк', price: 280, weight: '130 г', desc: 'Карамельная корочка и кремовая середина.' },
  { id: 'sandwich', cat: 'food', name: 'Сэндвич с ветчиной', price: 340, weight: '210 г', desc: 'Чиабатта, ветчина, сыр, томаты и соус песто.' },
];
const CATS = { all: 'Все', coffee: 'Кофе', nocoffee: 'Не кофе', bakery: 'Выпечка', food: 'Еда' };
const SIZES = [{ v: 'S', label: '250 мл', add: 0 }, { v: 'M', label: '350 мл', add: 40 }, { v: 'L', label: '450 мл', add: 80 }];
const MILKS = [{ v: 'cow', label: 'Обычное', add: 0 }, { v: 'oat', label: 'Овсяное', add: 60 }, { v: 'coconut', label: 'Кокосовое', add: 60 }];

// --- Telegram: внутри Mini App используем родные MainButton/BackButton, тему и вибрацию ---
const tg = window.Telegram?.WebApp;
const inTg = Boolean(tg?.initData);
if (inTg) {
  tg.ready();
  tg.expand();
  document.body.classList.add('in-tg');
  tg.MainButton.setParams({ color: '#ff9f43', text_color: '#1d1206' });
  tg.MainButton.onClick(onMain);
  tg.BackButton.onClick(goMenu);
}
const haptic = (type = 'light') => inTg && tg.HapticFeedback.impactOccurred(type);

const $ = id => document.getElementById(id);
const rub = n => n.toLocaleString('ru-RU') + ' ₽';
const item = id => MENU.find(m => m.id === id);
const opt = (list, v) => list.find(o => o.v === v);

// --- Корзина: ключ = товар + объём + молоко, чтобы разные варианты шли отдельными строками ---
const cart = new Map();
const unitPrice = (id, size, milk) => item(id).price + (item(id).drink ? opt(SIZES, size).add + opt(MILKS, milk).add : 0);
const count = () => [...cart.values()].reduce((s, l) => s + l.qty, 0);
const sum = () => [...cart.values()].reduce((s, l) => s + l.qty * unitPrice(l.id, l.size, l.milk), 0);

function add(id, size = 'S', milk = 'cow', qty = 1) {
  if (!item(id).drink) size = milk = '';
  const key = [id, size, milk].join('|');
  const line = cart.get(key) ?? { id, size, milk, qty: 0 };
  line.qty += qty;
  line.qty > 0 ? cart.set(key, line) : cart.delete(key);
  haptic();
  render();
}

// --- Экраны ---
let view = 'menu';

function show(next) {
  view = next;
  for (const v of ['menu', 'cart', 'done']) $(`${v}-view`).hidden = v !== next;
  if (inTg) next === 'menu' ? tg.BackButton.hide() : tg.BackButton.show();
  scrollTo(0, 0);
  render();
}

function goMenu() { show('menu'); }

function setMain(text) {
  if (inTg) return text ? tg.MainButton.setText(text).show() : tg.MainButton.hide();
  $('main-btn').textContent = text;
  $('bottom').hidden = !text;
}

function onMain() {
  if (view === 'menu') show('cart');
  else if (view === 'cart') checkout();
  else show('menu');
}

function render() {
  for (const card of document.querySelectorAll('.card')) {
    const n = [...cart.values()].filter(l => l.id === card.dataset.id).reduce((s, l) => s + l.qty, 0);
    const badge = card.querySelector('.badge');
    badge.hidden = !n;
    badge.textContent = n;
  }
  if (view === 'cart') {
    if (!cart.size) return show('menu');
    renderCart();
  }
  setMain(view === 'menu' ? (count() ? `Корзина · ${count()} шт · ${rub(sum())}` : '')
    : view === 'cart' ? `Оформить заказ · ${rub(sum())}`
    : 'Вернуться в меню');
}

// --- Меню ---
let cat = 'all';
$('cats').innerHTML = Object.entries(CATS).map(([k, v]) => `<button data-cat="${k}" class="${k === cat ? 'active' : ''}">${v}</button>`).join('');
$('cats').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  cat = b.dataset.cat;
  $('cats').querySelector('.active').classList.remove('active');
  b.classList.add('active');
  renderGrid();
  haptic('soft');
});

function renderGrid() {
  $('grid').innerHTML = MENU.filter(m => cat === 'all' || m.cat === cat).map((m, i) => `
    <article class="card" data-id="${m.id}" tabindex="0" style="animation-delay:${i * 30}ms">
      <img src="img/${m.id}.jpg" alt="${m.name}" loading="lazy">
      <span class="badge" hidden></span>
      <div class="card-body">
        <b>${m.name}</b>
        <small>${m.drink ? 'от 250 мл' : m.weight}</small>
        <div class="card-foot"><span class="price">${m.drink ? 'от ' : ''}${rub(m.price)}</span><button class="add" aria-label="Добавить: ${m.name}">+</button></div>
      </div>
    </article>`).join('');
  render();
}

$('grid').addEventListener('click', e => {
  const card = e.target.closest('.card');
  if (!card) return;
  if (!e.target.closest('.add')) return openSheet(card.dataset.id);
  add(card.dataset.id);
  const badge = card.querySelector('.badge');
  badge.classList.remove('pop');
  void badge.offsetWidth; // перезапуск анимации
  badge.classList.add('pop');
});
$('grid').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.classList.contains('card')) openSheet(e.target.dataset.id);
});

// --- Карточка товара ---
const sheet = $('sheet'), sheetForm = $('sheet-form');
let sheetId, sheetQty;

const seg = (name, title, list) => `
  <div class="opt"><h3>${title}</h3><div class="seg">${list.map((o, i) => `
    <label><input type="radio" name="${name}" value="${o.v}" ${i ? '' : 'checked'}><span>${o.label}<small>${o.add ? '+' + rub(o.add) : '&nbsp;'}</small></span></label>`).join('')}
  </div></div>`;

function sheetChoice() {
  return { size: sheetForm.elements.size?.value ?? '', milk: sheetForm.elements.milk?.value ?? '' };
}

function updateSheet() {
  const { size, milk } = sheetChoice();
  $('s-qty').textContent = sheetQty;
  $('s-add').textContent = `Добавить · ${rub(unitPrice(sheetId, size, milk) * sheetQty)}`;
}

function openSheet(id) {
  const m = item(id);
  sheetId = id;
  sheetQty = 1;
  $('s-img').src = `img/${id}.jpg`;
  $('s-name').textContent = m.name;
  $('s-desc').textContent = m.drink ? m.desc : `${m.desc} ${m.weight}.`;
  $('s-opts').innerHTML = m.drink ? seg('size', 'Объём', SIZES) + seg('milk', 'Молоко', MILKS) : '';
  sheet.returnValue = '';
  updateSheet();
  sheet.showModal();
  haptic('soft');
}

sheetForm.addEventListener('change', updateSheet);
sheetForm.querySelector('.stepper').addEventListener('click', e => {
  const step = Number(e.target.closest('button')?.dataset.step);
  if (!step) return;
  sheetQty = Math.min(20, Math.max(1, sheetQty + step));
  updateSheet();
});
sheet.addEventListener('click', e => { if (e.target === sheet) sheet.close(); }); // клик по затемнению
sheet.addEventListener('close', () => {
  if (sheet.returnValue !== 'add') return;
  const { size, milk } = sheetChoice();
  add(sheetId, size, milk, sheetQty);
});

// --- Корзина ---
const lineOpts = l => item(l.id).drink
  ? `${opt(SIZES, l.size).label} · ${opt(MILKS, l.milk).label.toLowerCase()} молоко`
  : item(l.id).weight;

function renderCart() {
  $('cart-list').innerHTML = [...cart].map(([key, l]) => `
    <li class="line" data-key="${key}">
      <img src="img/${l.id}.jpg" alt="">
      <div class="line-main"><b>${item(l.id).name}</b><small>${lineOpts(l)}</small><b class="p">${rub(unitPrice(l.id, l.size, l.milk) * l.qty)}</b></div>
      <div class="stepper sm"><button data-step="-1" aria-label="Меньше">−</button><span>${l.qty}</span><button data-step="1" aria-label="Больше">+</button></div>
    </li>`).join('');
  $('sub').textContent = rub(sum());
  $('total').textContent = rub(sum());
}

$('cart-list').addEventListener('click', e => {
  const step = Number(e.target.closest('button')?.dataset.step);
  if (!step) return;
  const l = cart.get(e.target.closest('.line').dataset.key);
  add(l.id, l.size, l.milk, step);
});
$('clear').addEventListener('click', () => { cart.clear(); haptic('medium'); show('menu'); });
document.querySelector('[data-back]').addEventListener('click', goMenu);
$('main-btn').addEventListener('click', onMain);

// --- Оформление ---
function checkout() {
  const minutes = Number(document.querySelector('[name=when]:checked').value);
  const ready = new Date(Date.now() + minutes * 60000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const name = inTg ? tg.initDataUnsafe.user?.first_name : '';

  $('done-title').textContent = name ? `Спасибо, ${name}! Заказ принят` : 'Заказ принят!';
  $('done-time').textContent = `Будет готов к ${ready}. Заберите на Покровке, 12 — назовите код на кассе.`;
  $('done-code').textContent = String(Math.floor(100 + Math.random() * 900));

  const receipt = $('receipt');
  receipt.innerHTML = [...cart.values()].map(l =>
    `<div><span>${item(l.id).name} × ${l.qty}</span><span>${rub(unitPrice(l.id, l.size, l.milk) * l.qty)}</span></div>`).join('');
  const comment = $('comment').value.trim();
  if (comment) {
    const row = document.createElement('div');
    row.append(Object.assign(document.createElement('span'), { textContent: `Комментарий: ${comment}` }));
    receipt.append(row);
  }
  receipt.insertAdjacentHTML('beforeend', `<div class="tot"><span>Итого</span><span>${rub(sum())}</span></div>`);

  if (inTg) tg.HapticFeedback.notificationOccurred('success');
  cart.clear();
  $('comment').value = '';
  document.querySelector('[name=when]').checked = true;
  show('done');
}

renderGrid();
show('menu');
