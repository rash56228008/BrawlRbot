// Главное меню: режимы, выбор карты, ранговые, особые события, дружеские
import { MODES, MODES_BY_ID, RANKED_TIERS } from '../data/modes.js';
import { mapsForMode, MAPS } from '../data/maps.js';
import { BRAWLERS_BY_ID } from '../data/brawlers.js';
import { makeScreen, showScreen, toast, modal, fmtNum } from './common.js';
import { questsDoneUnclaimed, refreshQuests } from './quests.js';

// ротация режимов по дню недели (как события в оригинале)
function dayIndex() { return Math.floor(Date.now() / 86400000); }

export function showMenu({ tg, gs, saver, onPlay, onNav }) {
  refreshQuests(gs);

  const el = makeScreen('menu', `
    <div class="screen-content">
      <div class="topbar">
        <div class="currency trophies">🏆 <span id="tbTrophy"></span></div>
        <div class="currency coins">🪙 <span id="tbCoins"></span></div>
        <div class="currency gems">💎 <span id="tbGems"></span></div>
        <div class="player-badge">
          <span class="lvl">ур. ${gs.player.level}</span>
        </div>
      </div>
      <div class="page">
        <div id="eventBanner"></div>
        <div class="page-title" style="font-size:18px;">Выбери режим</div>
        <div class="mode-cards" id="modeCards"></div>
        <div class="map-choice" id="mapChoice"></div>
        <div class="panel" style="margin-top:14px;">
          <div class="panel-title">🎯 Ранговые бои</div>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="flex:1;">
              <div style="font-weight:800;">${rankName(gs)}</div>
              <div style="font-size:11px;color:var(--text-dim);">Очки: ${gs.player.rank} · победы дают +8, поражения -3</div>
            </div>
            <button class="btn" id="btnRanked" style="background:linear-gradient(180deg,#b44dff,#7a2fc9);">Играть</button>
          </div>
        </div>
      </div>
      <div class="play-bar">
        <div class="selected-brawler" id="selBrawler" title="Сменить бравлера"></div>
        <button class="btn btn-primary" id="btnPlay">⚔️ В БОЙ!</button>
      </div>
    </div>
    <div class="navbar">
      <button class="nav-item" data-nav="shop"><span class="ni">🛒</span>Магазин</button>
      <button class="nav-item" data-nav="brawlers"><span class="ni">🥊</span>Бравлеры</button>
      <button class="nav-item" data-nav="menu" id="navMenu"><span class="ni">⚔️</span>Играть</button>
      <button class="nav-item" data-nav="social"><span class="ni">👥</span>Клуб</button>
      <button class="nav-item" data-nav="more"><span class="ni">☰</span>Ещё</button>
    </div>
  `);

  // выбор режима: первый из ротации по умолчанию
  const rotation = pickRotation();
  let selectedMode = rotation[0];
  let selectedMap = mapsForMode(selectedMode.id)[0];

  function pickRotation() {
    // 4 режима в ротации + всегда Столкновение и Дуэль
    const base = MODES.filter((m) => !['showdown', 'duel'].includes(m.id));
    const d = dayIndex();
    const rot = [];
    for (let i = 0; i < 4; i++) rot.push(base[(d + i) % base.length]);
    rot.push(MODES_BY_ID.showdown, MODES_BY_ID.duel);
    return rot;
  }

  function render() {
    el.querySelector('#tbTrophy').textContent = fmtNum(gs.player.trophies);
    el.querySelector('#tbCoins').textContent = fmtNum(gs.player.coins);
    el.querySelector('#tbGems').textContent = fmtNum(gs.player.gems);

    // бравлер
    const bDef = BRAWLERS_BY_ID[gs.selected];
    const sb = el.querySelector('#selBrawler');
    sb.style.background = bDef.color;
    sb.style.color = '#fff';
    sb.textContent = bDef.name[0];

    // событие дня
    const banner = el.querySelector('#eventBanner');
    const eventMode = rotation[0];
    banner.innerHTML = `
      <div class="panel" style="background:linear-gradient(120deg,#7a2f8f,#4d1f5c);border:1px solid rgba(255,255,255,.15);">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="font-size:32px;">${eventMode.icon}</div>
          <div>
            <div style="font-weight:900;">Событие дня: ${eventMode.name}</div>
            <div style="font-size:11px;color:var(--text-dim);">${eventMode.desc}</div>
          </div>
        </div>
      </div>
    `;

    // карточки режимов
    const cards = el.querySelector('#modeCards');
    cards.innerHTML = '';
    for (const m of rotation) {
      const card = document.createElement('div');
      card.className = 'mode-card' + (m === selectedMode ? ' selected' : '') + (m === eventMode ? ' event' : '');
      card.innerHTML = `
        <div class="mi">${m.icon}</div>
        <div class="mn">${m.name}</div>
        <div class="md">${m.goal}</div>
      `;
      card.addEventListener('click', () => {
        selectedMode = m;
        selectedMap = mapsForMode(m.id)[0];
        render();
      });
      cards.appendChild(card);
    }

    // выбор карты
    const mc = el.querySelector('#mapChoice');
    mc.innerHTML = '';
    for (const map of [...mapsForMode(selectedMode.id), ...gs.mapEdits.filter((e) => e.mode === selectedMode.id)]) {
      const chip = document.createElement('button');
      chip.className = 'map-chip' + (map === selectedMap ? ' selected' : '');
      chip.textContent = map.name;
      chip.addEventListener('click', () => { selectedMap = map; render(); });
      mc.appendChild(chip);
    }

    // бейдж квестов в «Ещё»
    const unclaimed = questsDoneUnclaimed(gs);
    const more = el.querySelector('[data-nav="more"]');
    more.innerHTML = `<span class="ni">☰</span>Ещё${unclaimed ? '<span class="badge"></span>' : ''}`;
  }

  el.querySelector('#btnPlay').addEventListener('click', () => {
    tg.haptic('medium');
    onPlay({ mode: selectedMode, map: selectedMap, ranked: false });
  });
  el.querySelector('#btnRanked').addEventListener('click', () => {
    tg.haptic('medium');
    onPlay({ mode: selectedMode, map: selectedMap, ranked: true });
    toast('Ранговый бой: ' + rankName(gs));
  });
  el.querySelector('#selBrawler').addEventListener('click', () => onNav('brawlers'));
  el.querySelector('.navbar').addEventListener('click', (e) => {
    const item = e.target.closest('.nav-item');
    if (!item) return;
    onNav(item.dataset.nav);
  });

  el.querySelector('#navMenu').classList.add('active');

  render();
  showScreen('menu');
  return { rerender: render };
}

function rankName(gs) {
  const t = RANKED_TIERS.find((x) => gs.player.rank >= x.from && gs.player.rank <= x.to);
  return t ? t.name : 'Бронза I';
}
