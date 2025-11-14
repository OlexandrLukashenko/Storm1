// Modified script.js for orders and fake payment
let games = [];
let state = { query: '', sort: 'popular', cart: {}, token: localStorage.getItem('token') || null };

const storeEl = document.getElementById('store');
const cartList = document.getElementById('cartList');
const cartTotal = document.getElementById('cartTotal');
const cartCount = document.getElementById('cartCount');

async function loadGames() {
  try {
    const res = await fetch("http://localhost:3000/games");
    games = await res.json();
  } catch(e) { console.error(e); games = []; }
  render();
}

function render() {
  renderStore();
  renderCart();
}

function renderStore() {
  storeEl.innerHTML = '';
  let list = [...games];
  const q = document.getElementById('search').value.trim().toLowerCase();
  if (q) list = list.filter(g => (g.title + ' ' + (g.description||'')).toLowerCase().includes(q));
  if (state.sort === 'price-asc') list.sort((a,b)=>a.price-b.price);
  if (state.sort === 'price-desc') list.sort((a,b)=>b.price-a.price);
  if (state.sort === 'name') list.sort((a,b)=>a.title.localeCompare(b.title));
  list.forEach(g => {
    const card = document.createElement('div'); card.className='card';
    const thumb = document.createElement('div'); thumb.className='thumb'; thumb.style.backgroundImage = `url(${g.thumb})`;
    const body = document.createElement('div'); body.className='item-body';
    body.innerHTML = `<div class="title">${g.title}</div><div class="meta">${(g.description||'')}</div>`;
    const pr = document.createElement('div'); pr.className='price-row';
    pr.innerHTML = `<div class="price">${g.price} грн</div><div><button class="btn" data-id="${g.id}">Деталі</button></div>`;
    body.appendChild(pr);
    card.appendChild(thumb); card.appendChild(body);
    storeEl.appendChild(card);
  });
}

function renderCart() {
  cartList.innerHTML = '';
  let total=0; let count=0;
  Object.entries(state.cart).forEach(([id,qty])=>{
    const g = games.find(x=>x.id==id);
    if(!g) return;
    total += g.price * qty;
    count += qty;
    const row = document.createElement('div'); row.className='cart-row';
    row.innerHTML = `<div>${g.title} × ${qty}</div><div>${g.price*qty} грн</div>`;
    cartList.appendChild(row);
  });
  cartTotal.textContent = total + ' грн';
  cartCount.textContent = count;
}

document.getElementById('search').addEventListener('input', ()=>renderStore());
document.getElementById('sort').addEventListener('change', e=>{ state.sort = e.target.value; renderStore(); });

storeEl.addEventListener('click', (e)=>{
  if (e.target.matches('button[data-id]')) {
    const id = e.target.dataset.id;
    openModal(id);
  }
});

function openModal(id) {
  const g = games.find(x=>x.id==id);
  if(!g) return;
  document.getElementById('modalImg').src = g.thumb;
  document.getElementById('modalTitle').textContent = g.title;
  document.getElementById('modalDesc').textContent = g.description || '';
  document.getElementById('modalPrice').textContent = g.price + ' грн';
  document.getElementById('modalAdd').onclick = ()=>{
    state.cart[g.id] = (state.cart[g.id]||0) + 1;
    renderCart();
    closeModal();
  };
  document.getElementById('modalBackdrop').classList.remove('hidden');
}
function closeModal(){ document.getElementById('modalBackdrop').classList.add('hidden'); }
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalBackdrop').addEventListener('click', (e)=>{ if(e.target.id==='modalBackdrop') closeModal(); });

document.getElementById('checkout').addEventListener('click', async ()=>{
  if (!Object.keys(state.cart).length) return alert('Кошик порожній!');
  if (!state.token) return alert('Спочатку увійдіть чи зареєструйтесь.');

  // prepare order items
  const items = Object.entries(state.cart).map(([id,qty])=>{
    const g = games.find(x=>x.id==id);
    return { id: g.id, title: g.title, qty, price: g.price, total: g.price*qty };
  });
  const total = items.reduce((s,i)=>s+i.total,0);

  // create order
  const res = await fetch("http://localhost:3000/orders", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + state.token },
    body: JSON.stringify({ items, total })
  });
  const data = await res.json();
  if (!data.orderId) return alert('Помилка при створенні замовлення');

  // show fake payment prompt
  if (confirm('Перейти до оплати (фейкова оплата)?')) {
    const pay = await fetch("http://localhost:3000/orders/" + data.orderId + "/pay", { method: "POST", headers: { Authorization: "Bearer " + state.token } });
    const payRes = await pay.json();
    if (payRes.success) {
      alert('Оплата успішна!');
      state.cart = {}; renderCart();
    } else alert('Оплата не вдалася');
  }
});

// Auth: login/register via backend
document.getElementById('loginBtn').addEventListener('click', async ()=>{
  const email = prompt('Email');
  const password = prompt('Пароль');
  if(!email || !password) return;
  const res = await fetch("http://localhost:3000/login", {
    method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem('token', data.token);
    state.token = data.token;
    alert('Вхід виконано!');
  } else alert('Помилка: ' + (data.error||''));
});

document.getElementById('registerBtn').addEventListener('click', async ()=>{
  const username = prompt('Нік');
  const email = prompt('Email');
  const password = prompt('Пароль');
  if(!username || !email || !password) return;
  const res = await fetch("http://localhost:3000/register", {
    method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ username, email, password })
  });
  const data = await res.json();
  if (data.success) alert('Зареєстровано! Тепер увійдіть.');
  else alert('Помилка: ' + (data.error||''));
});

loadGames();
