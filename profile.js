(async function () {
  const usernameEl = document.getElementById('username');
  const emailEl = document.getElementById('email');
  const passwordEl = document.getElementById('password');
  const avatarImg = document.getElementById('avatarImg');
  const avatarInput = document.getElementById('avatarInput');
  const ordersList = document.getElementById('ordersList');

  const token = localStorage.getItem('token');
  if (!token) {
    alert('Ви не авторизовані. Переходимо на головну.');
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('logoutBtn').onclick = () => {
    localStorage.removeItem('token');
    alert('Вихід виконано');
    window.location.href = 'index.html';
  };

  async function loadProfile() {
    const res = await fetch("http://localhost:3000/profile", { headers: { Authorization: "Bearer " + token } });
    const p = await res.json();
    if (!p) { alert('Не вдалось завантажити профіль'); window.location.href='index.html'; return; }
    usernameEl.value = p.username;
    emailEl.value = p.email;
  }

  async function renderOrders() {
    const res = await fetch("http://localhost:3000/orders", { headers: { Authorization: "Bearer " + token } });
    const orders = await res.json();
    ordersList.innerHTML = '';
    (orders||[]).forEach(o => {
      const div = document.createElement('div'); div.className = 'order';
      const items = o.items ? JSON.parse(o.items) : [];
      div.innerHTML = `
        <div class="meta">Замовлення #${o.id} • ${o.created_at} • ${o.total} грн • Статус: ${o.status}</div>
        ${ items.map(it=>`<div class="item-row"><div>${it.title} × ${it.qty}</div><div>${it.total} грн</div></div>`).join('') }
      `;
      ordersList.appendChild(div);
    });
  }

  avatarInput.addEventListener('change', e=>{
    const f = e.target.files[0];
    if(!f) return;
    const fr = new FileReader();
    fr.onload = ()=> avatarImg.src = fr.result;
    fr.readAsDataURL(f);
  });

  document.getElementById('profileForm').addEventListener('submit', e=>{
    e.preventDefault();
    alert('Профіль збережено! (локально, серверна реалізація не додана)');
  });

  document.getElementById('cancelBtn').onclick = loadProfile;

  await loadProfile();
  await renderOrders();
})();
