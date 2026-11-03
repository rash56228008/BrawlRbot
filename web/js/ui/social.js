// Социальные экраны: клубы, друзья, лидерборды
import { getOnline } from '../sim/online.js';
import { BRAWLERS } from '../data/brawlers.js';
import { makeScreen, showScreen, toast, modal, fmtNum, timeAgo } from './common.js';

// ==== Клубы ====
export function showClubs({ tg, gs, saver, onBack }) {
  const online = getOnline(gs.player.id, gs.player.trophies);

  if (gs.club) {
    showMyClub({ tg, gs, saver, onBack, online });
    return;
  }

  const el = makeScreen('clubsScreen', `
    <button class="back-btn" id="bkC">←</button>
    <div class="screen-content">
      <div class="page">
        <div class="page-title">👥 Клубы</div>
        <div class="page-sub">Найди команду для каток или создай свой клуб</div>
        <div style="display:flex;gap:8px;margin-bottom:14px;">
          <input id="clubSearch" placeholder="Поиск клуба…" style="flex:1;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:12px;padding:10px 14px;">
          <button class="btn" id="btnCreateClub" style="background:var(--panel2);">Создать</button>
        </div>
        <div class="club-list" id="clubList"></div>
      </div>
    </div>
  `);

  function render(filter) {
    const list = el.querySelector('#clubList');
    list.innerHTML = '';
    const filtered = online.clubs.filter((c) => !filter || c.name.toLowerCase().includes(filter.toLowerCase()));
    for (const c of filtered) {
      const row = document.createElement('div');
      row.className = 'club-row';
      const canJoin = gs.player.trophies >= c.requirement;
      row.innerHTML = `
        <div class="c-badge" style="background:linear-gradient(160deg,#3b2d73,#2e2358);color:var(--gold);">${c.tag}</div>
        <div class="c-info">
          <div class="c-name">${c.name}</div>
          <div class="c-meta">🏆 ${fmtNum(c.trophies)} · ${c.members}/30 ${c.requirement > 0 ? '· нужно 🏆' + c.requirement : ''}</div>
        </div>
        <button class="btn" style="background:${canJoin ? 'linear-gradient(180deg,#4dd97a,#2ea35c)' : 'var(--panel2)'};padding:8px 14px;font-size:12px;">${canJoin ? 'Вступить' : '🔒'}</button>
      `;
      row.addEventListener('click', () => {
        if (!canJoin) { toast(`Нужно ${c.requirement} трофеев`); return; }
        gs.club = { id: c.id, name: c.name, tag: c.tag, joinedAt: Date.now() };
        saver.schedule();
        toast('Ты вступил в «' + c.name + '»!');
        showMyClub({ tg, gs, saver, onBack, online });
      });
      list.appendChild(row);
    }
  }

  el.querySelector('#clubSearch').addEventListener('input', (e) => render(e.target.value));
  el.querySelector('#btnCreateClub').addEventListener('click', () => {
    modal({
      title: 'Создать клуб',
      body: `<input id="newClubName" placeholder="Название клуба" style="width:100%;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:12px;padding:10px 14px;margin-bottom:10px;">`,
      buttons: [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Создать · 💎 50',
          onClick: () => {
            const name = document.getElementById('newClubName').value.trim() || 'Мой клуб';
            gs.club = { id: 'own', name, tag: name.slice(0, 3).toUpperCase(), joinedAt: Date.now(), own: true };
            gs.skins = gs.skins; // no-op
            saver.schedule();
            toast('Клуб «' + name + '» создан!');
            showMyClub({ tg, gs, saver, onBack, online });
          }
        }
      ]
    });
  });

  el.querySelector('#bkC').addEventListener('click', onBack);
  render();
  showScreen('clubsScreen');
}

function showMyClub({ tg, gs, saver, onBack, online }) {
  const el = makeScreen('myClubScreen', `
    <button class="back-btn" id="bkMC">←</button>
    <div class="screen-content">
      <div class="page">
        <div class="page-title" style="display:flex;align-items:center;gap:10px;">
          <span style="background:var(--panel2);padding:4px 10px;border-radius:8px;color:var(--gold);font-size:14px;">${gs.club.tag}</span>
          ${gs.club.name}
        </div>
        <div class="panel">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <div>🏆 <b>${fmtNum(gs.player.trophies)}</b> — твой вклад</div>
            <button class="btn" id="btnLeave" style="padding:6px 12px;font-size:12px;background:var(--danger);">Выйти</button>
          </div>
          <div style="color:var(--text-dim);font-size:12px;">Вступил ${timeAgo(gs.club.joinedAt)}</div>
        </div>
        <div class="panel-title">💬 Чат клуба</div>
        <div class="club-chat" id="clubChat"></div>
        <div class="chat-input-row">
          <input id="chatInput" placeholder="Написать…" style="flex:1;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:12px;padding:10px 14px;">
          <button class="btn" id="chatSend" style="background:var(--panel2);">➤</button>
        </div>
        <div class="panel-title" style="margin-top:16px;">🥇 Топ клуба</div>
        <div id="clubTop"></div>
      </div>
    </div>
  `);

  // чат: симулированные + свои (сохраняем в gs)
  if (!gs.clubChat) gs.clubChat = [];

  function renderChat() {
    const cont = el.querySelector('#clubChat');
    cont.innerHTML = '';
    const msgs = [...online.chat, ...gs.clubChat].sort((a, b) => b.t - a.t).slice(0, 20);
    for (const m of msgs) {
      const div = document.createElement('div');
      div.className = 'chat-msg';
      const mine = m.mine;
      div.innerHTML = `<div class="cm-author" style="${mine ? 'color:var(--gold)' : ''}">${mine ? 'Ты' : m.author} · ${timeAgo(m.t)}</div>${escapeHtml(m.text)}`;
      cont.appendChild(div);
    }
  }

  function renderTop() {
    const top = el.querySelector('#clubTop');
    top.innerHTML = '';
    const members = [...(online.clubs.find((c) => c.id === gs.club.id)?.memberList || [{ name: 'Ты', trophies: gs.player.trophies, online: true }])];
    members.push({ name: 'Ты', trophies: gs.player.trophies, online: true, me: true });
    members.sort((a, b) => b.trophies - a.trophies);
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      const row = document.createElement('div');
      row.className = 'lb-row' + (m.me ? ' me' : '');
      row.innerHTML = `
        <div class="lb-place">${i + 1}</div>
        <div class="lb-name">${m.name}</div>
        <div class="lb-trophies">🏆 ${fmtNum(m.trophies)}</div>
      `;
      top.appendChild(row);
    }
  }

  el.querySelector('#chatSend').addEventListener('click', send);
  el.querySelector('#chatInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
  function send() {
    const inp = el.querySelector('#chatInput');
    const text = inp.value.trim();
    if (!text) return;
    gs.clubChat.unshift({ author: 'Ты', text, t: Date.now(), mine: true });
    gs.clubChat = gs.clubChat.slice(0, 20);
    inp.value = '';
    saver.schedule();
    renderChat();
  }

  el.querySelector('#btnLeave').addEventListener('click', () => {
    modal({
      title: 'Выйти из клуба?',
      body: 'Ты потеряешь место в топе клуба. Вступить снова можно в любой момент.',
      buttons: [
        { text: 'Остаться', style: 'cancel' },
        { text: 'Выйти', style: 'danger', onClick: () => { gs.club = null; gs.clubChat = []; saver.schedule(); showClubs({ tg, gs, saver, onBack }); } }
      ]
    });
  });

  el.querySelector('#bkMC').addEventListener('click', onBack);
  renderChat();
  renderTop();
  showScreen('myClubScreen');
}

// ==== Друзья ====
export function showFriends({ tg, gs, saver, onBack }) {
  const online = getOnline(gs.player.id, gs.player.trophies);
  const el = makeScreen('friendsScreen', `
    <button class="back-btn" id="bkF">←</button>
    <div class="screen-content">
      <div class="page">
        <div class="page-title">🤝 Друзья</div>
        <div class="page-sub">Играйте вместе — приглашай в матч одним тапом</div>
        <div id="frList"></div>
      </div>
    </div>
  `);

  function render() {
    const list = el.querySelector('#frList');
    list.innerHTML = '';
    for (const f of online.friends) {
      const row = document.createElement('div');
      row.className = 'friend-row';
      row.innerHTML = `
        <div class="f-dot ${f.online ? 'online' : 'offline'}"></div>
        <div style="width:42px;height:42px;border-radius:50%;background:var(--panel2);display:flex;align-items:center;justify-content:center;font-weight:900;">${f.name[0]}</div>
        <div style="flex:1;">
          <div style="font-weight:800;">${f.name}</div>
          <div style="font-size:11px;color:var(--text-dim);">🏆 ${fmtNum(f.trophies)} · ${f.online ? 'в игре' : 'не в сети'}</div>
        </div>
        <button class="btn" style="background:var(--panel2);padding:8px 12px;font-size:12px;">${f.online ? 'Пригласить' : '💬'}</button>
      `;
      row.querySelector('.btn').addEventListener('click', () => {
        if (f.online) {
          if (tg.webApp && tg.webApp.openTelegramLink) {
            tg.webApp.openTelegramLink('https://t.me/BrawlRbot');
            toast('Ссылка на игру отправлена: ' + f.name);
          } else toast('Приглашение отправлено: ' + f.name);
        } else toast(f.name + ' не в сети');
      });
      list.appendChild(row);
    }
  }

  el.querySelector('#bkF').addEventListener('click', onBack);
  render();
  showScreen('friendsScreen');
}

// ==== Лидерборды ====
export function showLeaderboards({ gs, onBack }) {
  const online = getOnline(gs.player.id, gs.player.trophies);
  let tab = 'global';
  const el = makeScreen('lbScreen', `
    <button class="back-btn" id="bkL">←</button>
    <div class="screen-content">
      <div class="page">
        <div class="page-title">🏆 Лидеры</div>
        <div style="display:flex;gap:6px;margin-bottom:14px;">
          <button class="map-chip selected" data-tab="global">Глобальный</button>
          <button class="map-chip" data-tab="brawlers">По бравлерам</button>
          <button class="map-chip" data-tab="club">Клубы</button>
        </div>
        <div id="lbBody"></div>
      </div>
    </div>
  `);

  function render() {
    const body = el.querySelector('#lbBody');
    body.innerHTML = '';
    if (tab === 'global') {
      const list = [...online.leaderboard.slice(0, 50)];
      // позиция игрока
      const myT = gs.player.trophies;
      let myPos = list.findIndex((p) => p.trophies < myT);
      if (myPos < 0) myPos = list.length;
      const rows = list.slice(0, 20);
      for (let i = 0; i < rows.length; i++) {
        body.appendChild(lbRow(i + 1, rows[i].name, rows[i].trophies, false));
      }
      if (myPos >= 20) {
        const dots = document.createElement('div');
        dots.textContent = '· · ·';
        dots.style.cssText = 'text-align:center;color:var(--text-dim);margin:6px 0;';
        body.appendChild(dots);
        body.appendChild(lbRow(myPos + 1, (tgName(gs)) + ' (ты)', myT, true));
      }
    } else if (tab === 'brawlers') {
      const unlocked = BRAWLERS.filter((b) => gs.brawlers[b.id]);
      for (const b of unlocked) {
        const st = gs.brawlers[b.id];
        // место среди симулированных
        const rng = (n) => Math.abs(Math.sin(n * 12.9898 + b.id.length * 78.233) * 43758.5453) % 1;
        const top = Math.floor(300 + rng(1) * 2000);
        const row = document.createElement('div');
        row.className = 'panel';
        row.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:40px;height:40px;border-radius:50%;background:${b.color};border:3px solid ${b.color2};"></div>
            <div style="flex:1;">
              <div style="font-weight:800;">${b.name}</div>
              <div style="font-size:11px;color:var(--text-dim);">🏆 ${st.trophies} · место #${Math.max(1, top - st.trophies * 2)}</div>
            </div>
          </div>
        `;
        body.appendChild(row);
      }
    } else {
      const clubs = [...online.clubs].sort((a, b) => b.trophies - a.trophies);
      for (let i = 0; i < clubs.length; i++) {
        const c = clubs[i];
        body.appendChild(lbRow(i + 1, c.tag + ' ' + c.name, c.trophies, false, 'клуб'));
      }
    }
  }

  function lbRow(place, name, trophies, me, suffix) {
    const row = document.createElement('div');
    row.className = 'lb-row' + (me ? ' me' : '');
    row.innerHTML = `
      <div class="lb-place">${place <= 3 ? ['🥇', '🥈', '🥉'][place - 1] : place}</div>
      <div class="lb-name">${name}${suffix ? ` <span style="font-size:10px;color:var(--text-dim);">(${suffix})</span>` : ''}</div>
      <div class="lb-trophies">🏆 ${fmtNum(trophies)}</div>
    `;
    return row;
  }

  el.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-tab]');
    if (!chip) return;
    tab = chip.dataset.tab;
    el.querySelectorAll('.map-chip').forEach((c) => c.classList.toggle('selected', c === chip));
    render();
  });

  el.querySelector('#bkL').addEventListener('click', onBack);
  render();
  showScreen('lbScreen');
}

function tgName(gs) { return gs.player.name || 'Ты'; }
function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
