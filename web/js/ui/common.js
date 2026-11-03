// Общие UI-компоненты: экраны, тосты, модалки
export function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
}

export function clearScreens() {
  document.querySelectorAll('.screen').forEach((s) => {
    if (s.id !== 'loading') s.remove();
  });
}

export function makeScreen(id, html) {
  let el = document.getElementById(id);
  if (el) el.remove();
  el = document.createElement('div');
  el.id = id;
  el.className = 'screen';
  el.innerHTML = html;
  document.getElementById('app').appendChild(el);
  return el;
}

export function toast(msg) {
  let t = document.querySelector('.app-toast:not(.mini)');
  if (t) t.remove();
  t = document.createElement('div');
  t.className = 'app-toast';
  t.textContent = msg;
  Object.assign(t.style, {
    position: 'fixed', bottom: '18%', left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,.85)', color: '#fff', padding: '10px 22px',
    borderRadius: '12px', zIndex: '120', fontWeight: '700', maxWidth: '80%'
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2400);
}

export function modal({ title, body, buttons = [] }) {
  let m = document.getElementById('appModal');
  if (m) m.remove();
  m = document.createElement('div');
  m.id = 'appModal';
  Object.assign(m.style, {
    position: 'fixed', inset: '0', background: 'rgba(5,3,20,.7)', zIndex: '110',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  });
  m.innerHTML = `
    <div style="background:var(--panel);border-radius:18px;padding:24px;max-width:340px;width:92%;max-height:80vh;overflow-y:auto;">
      <div style="font-size:20px;font-weight:900;margin-bottom:10px;">${title}</div>
      <div style="color:var(--text-dim);margin-bottom:20px;font-size:14px;line-height:1.5;">${body}</div>
      <div id="amBtns" style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;"></div>
    </div>`;
  document.body.appendChild(m);
  m.addEventListener('click', (e) => { if (e.target === m) m.remove(); });
  for (const b of buttons) {
    const btn = document.createElement('button');
    btn.textContent = b.text;
    Object.assign(btn.style, {
      flex: '1', padding: '11px 16px', border: 'none', borderRadius: '12px',
      fontWeight: '800', fontSize: '14px', cursor: 'pointer', minWidth: '100px'
    });
    if (b.style === 'danger') { btn.style.background = 'var(--danger)'; btn.style.color = '#fff'; }
    else if (b.style === 'cancel') { btn.style.background = 'var(--panel2)'; btn.style.color = '#fff'; }
    else { btn.style.background = 'var(--gold)'; btn.style.color = '#1a1233'; }
    btn.addEventListener('click', () => { m.remove(); if (b.onClick) b.onClick(); });
    m.querySelector('#amBtns').appendChild(btn);
  }
  return m;
}

export function fmtNum(n) {
  return n >= 10000 ? (n / 1000).toFixed(1).replace('.0', '') + 'к' : String(n);
}

export function timeAgo(t) {
  const d = Date.now() - t;
  const m = Math.floor(d / 60000);
  if (m < 1) return 'только что';
  if (m < 60) return m + ' мин назад';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' ч назад';
  return Math.floor(h / 24) + ' дн назад';
}

export function hhmmss(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
