// Экран «Ещё»: квесты, пас, друзья, лидеры, карты, настройки, лог
import { makeScreen, showScreen } from './common.js';
import { questsDoneUnclaimed } from './quests.js';

export function showMore({ tg, gs, saver, onBack, onNav }) {
  const unclaimed = questsDoneUnclaimed(gs);
  const items = [
    { id: 'quests', icon: '📋', name: 'Квесты', badge: unclaimed },
    { id: 'pass', icon: '🎟️', name: 'Бравл Пас' },
    { id: 'friends', icon: '🤝', name: 'Друзья' },
    { id: 'leaderboards', icon: '🏆', name: 'Лидеры' },
    { id: 'editor', icon: '🗺️', name: 'Редактор карт' },
    { id: 'log', icon: '📜', name: 'Данные боя' },
    { id: 'settings', icon: '⚙️', name: 'Настройки' }
  ];

  const el = makeScreen('moreScreen', `
    <button class="back-btn" id="bkM">←</button>
    <div class="screen-content">
      <div class="page">
        <div class="page-title">☰ Ещё</div>
        <div id="moreList"></div>
      </div>
    </div>
  `);

  const list = el.querySelector('#moreList');
  for (const it of items) {
    const row = document.createElement('div');
    row.className = 'panel';
    row.style.cursor = 'pointer';
    row.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="font-size:24px;">${it.icon}</div>
        <div style="flex:1;font-weight:800;">${it.name}</div>
        ${it.badge ? '<span style="background:var(--danger);border-radius:50%;width:10px;height:10px;"></span>' : ''}
        <div style="color:var(--text-dim);">›</div>
      </div>`;
    row.addEventListener('click', () => onNav(it.id));
    list.appendChild(row);
  }

  el.querySelector('#bkM').addEventListener('click', onBack);
  showScreen('moreScreen');
}
