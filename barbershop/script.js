const form = document.getElementById('booking-form');
const { service, master, date } = form.elements;
const slotsBox = document.getElementById('slots');
const dialog = document.getElementById('done');

const KEY = 'blade-bookings';
const HOURS = Array.from({ length: 11 }, (_, i) => `${10 + i}:00`); // 10:00–20:00, последний сеанс в 20:00
const localDate = d => d.toLocaleDateString('sv'); // YYYY-MM-DD в часовом поясе пользователя

// ponytail: записи хранятся в localStorage (демо). Для реального бизнеса — отправка на сервер / в Telegram-бот.
const bookings = () => JSON.parse(localStorage.getItem(KEY) || '[]');

// Варианты в форме собираются из карточек на странице: цены и мастера правятся в одном месте.
for (const el of document.querySelectorAll('[data-service]')) {
  service.add(new Option(`${el.dataset.service} — ${el.dataset.price} ₽`, el.dataset.service));
}
for (const el of document.querySelectorAll('[data-master]')) master.add(new Option(el.dataset.master));

// После закрытия (20:00) запись на сегодня уже невозможна — по умолчанию предлагаем завтра.
function defaultDate() {
  const d = new Date();
  if (d.getHours() >= 20) d.setDate(d.getDate() + 1);
  return localDate(d);
}

function renderSlots() {
  const today = localDate(new Date());
  const nowHour = new Date().getHours();
  const taken = new Set(bookings()
    .filter(b => b.date === date.value && b.master === master.value)
    .map(b => b.time));

  const slots = HOURS.map(time => {
    const off = taken.has(time) || date.value < today || (date.value === today && parseInt(time) <= nowHour);
    return { time, off };
  });

  slotsBox.innerHTML = slots.every(s => s.off)
    ? '<p class="slots-empty">На этот день свободного времени нет — выберите другую дату.</p>'
    : slots.map(({ time, off }) =>
        `<label class="slot"><input type="radio" name="time" value="${time}" required ${off ? 'disabled' : ''}><span>${time}</span></label>`
      ).join('');
}

date.min = localDate(new Date());
date.value = defaultDate();
renderSlots();
date.addEventListener('change', renderSlots);
master.addEventListener('change', renderSlots);

// «Записаться» на карточке услуги или мастера подставляет выбор в форму.
document.addEventListener('click', e => {
  const card = e.target.closest('.pick')?.closest('[data-service], [data-master]');
  if (!card) return;
  if (card.dataset.service) service.value = card.dataset.service;
  else { master.value = card.dataset.master; renderSlots(); }
});

form.addEventListener('submit', e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  if (!data.time) return; // свободных окон нет — сообщение уже показано в блоке времени

  localStorage.setItem(KEY, JSON.stringify([...bookings(), data]));

  const day = new Date(`${data.date}T00:00`).toLocaleDateString('ru', { weekday: 'long', day: 'numeric', month: 'long' });
  dialog.querySelector('p').textContent = `${data.name}, ждём вас ${day} в ${data.time}. Мастер — ${data.master}, услуга — ${data.service}.`;
  dialog.showModal();

  form.reset();
  date.value = defaultDate();
  renderSlots();
});

// Плавное появление блоков при прокрутке.
const io = new IntersectionObserver(entries => {
  for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));
