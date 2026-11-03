// Магазин: ежедневные офферы, скины, бравлеры, обмен гемов
import { BRAWLERS, BRAWLERS_BY_ID, RARITY_COLOR, RARITY_LABEL } from '../data/brawlers.js';
import { ECONOMY } from '../data/economy.js';
import { canAfford, spend, unlockBrawler } from '../state/gamestate.js';
import { makeScreen, showScreen, toast, fmtNum } from './common.js';

// Детерминированные дневные офферы
function dayKey() { return new Date().toISOString().slice(0, 10); }
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function showShop({ gs, saver, onBack }) {
  const el = makeScreen('shopScreen', `
    <button class="back-btn" id="bkS">←</button>
    <div class="screen-content">
      <div class="topbar">
        <div class="currency coins">🪙 <span id="tbCoins"></span></div>
        <div class="currency gems">💎 <span id="tbGems"></span></div>
      </div>
      <div class="page">
        <div class="page-title">🛒 Магазин</div>
        <div id="shopBody"></div>
      </div>
    </div>
  `);

  function dailyOffers() {
    const rng = mulberry32(hashStr(dayKey() + '|' + gs.player.id));
    const locked = BRAWLERS.filter((b) => !gs.brawlers[b.id] && ECONOMY.brawlerPrice[b.rarity]);
    // 2 бравлера дня со скидкой
    const picks = [];
    const pool = [...locked];
    for (let i = 0; i < 2 && pool.length; i++) {
      picks.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    }
    return picks.map((b) => ({
      type: 'brawler', b,
      price: Math.round(ECONOMY.brawlerPrice[b.rarity] * (0.8 + rng() * 0.2)),
      label: 'Предложение дня'
    }));
  }

  function render() {
    el.querySelector('#tbCoins').textContent = fmtNum(gs.player.coins);
    el.querySelector('#tbGems').textContent = fmtNum(gs.player.gems);
    const body = el.querySelector('#shopBody');
    body.innerHTML = '';

    // ==== офферы дня ====
    const offers = dailyOffers();
    if (offers.length) {
      const h = document.createElement('div');
      h.className = 'panel-title';
      h.textContent = '⭐ Предложения дня';
      body.appendChild(h);
      const grid = document.createElement('div');
      grid.className = 'shop-grid';
      for (const o of offers) {
        const item = document.createElement('div');
        item.className = 'shop-item';
        item.innerHTML = `
          <div class="si-icon"><div style="width:54px;height:54px;border-radius:50%;background:${o.b.color};border:4px solid ${RARITY_COLOR[o.b.rarity]};margin:0 auto;"></div></div>
          <div class="si-name">${o.b.name}</div>
          <div class="si-desc">${RARITY_LABEL[o.b.rarity]} · ${o.b.class}</div>
          <button class="btn buy" data-act="brawler" data-id="${o.b.id}" data-price="${o.price}">💎 ${o.price}</button>
          <div class="si-timer">обновится в полночь</div>
        `;
        grid.appendChild(item);
      }
      body.appendChild(grid);
    }

    // ==== скины ====
    const h2 = document.createElement('div');
    h2.className = 'panel-title';
    h2.textContent = '🎨 Скины';
    body.appendChild(h2);
    const grid2 = document.createElement('div');
    grid2.className = 'shop-grid';
    for (const sk of ECONOMY.skins) {
      const owned = gs.skins.includes(sk.id);
      const b = BRAWLERS_BY_ID[sk.brawler];
      const unlocked = !!(gs.brawlers[sk.brawler] && gs.brawlers[sk.brawler].unlocked);
      const item = document.createElement('div');
      item.className = 'shop-item';
      item.innerHTML = `
        <div class="si-icon"><div style="width:54px;height:54px;border-radius:50%;background:${sk.color};border:4px solid ${sk.color2};margin:0 auto;"></div></div>
        <div class="si-name">${sk.name}</div>
        <div class="si-desc">для ${b ? b.name : '—'}${unlocked ? '' : ' (нужен бравлер)'}</div>
        ${owned ? '<button class="btn cant">Куплено ✓</button>'
          : `<button class="btn ${unlocked && canAfford(gs, { gems: sk.price }) ? 'buy' : 'cant'}" data-act="skin" data-id="${sk.id}" data-price="${sk.price}">💎 ${sk.price}</button>`}
      `;
      grid2.appendChild(item);
    }
    body.appendChild(grid2);

    // ==== обмен гемов на монеты ====
    const h3 = document.createElement('div');
    h3.className = 'panel-title';
    h3.textContent = '💵 Обмен';
    body.appendChild(h3);
    const grid3 = document.createElement('div');
    grid3.className = 'shop-grid';
    for (const p of ECONOMY.gemPacks) {
      const item = document.createElement('div');
      item.className = 'shop-item';
      item.innerHTML = `
        <div class="si-icon">🪙</div>
        <div class="si-name">${fmtNum(p.coins)} монет</div>
        <button class="btn ${canAfford(gs, { gems: p.gems }) ? 'buy' : 'cant'}" data-act="coins" data-gems="${p.gems}" data-coins="${p.coins}">💎 ${p.gems}</button>
      `;
      grid3.appendChild(item);
    }
    body.appendChild(grid3);

    // ==== бравл-пасс премиум ====
    const h4 = document.createElement('div');
    h4.className = 'panel-title';
    h4.textContent = '🎟️ Бравл Пас';
    body.appendChild(h4);
    const passItem = document.createElement('div');
    passItem.className = 'shop-item';
    passItem.style.gridColumn = '1 / -1';
    passItem.innerHTML = gs.quests.passPremium
      ? '<div class="si-name">Премиум активен ✓</div>'
      : `<div class="si-icon">🎟️</div><div class="si-name">${ECONOMY.pass.season}</div>
         <div class="si-desc">Премиум-награды всех 30 уровней</div>
         <button class="btn ${canAfford(gs, { gems: ECONOMY.pass.premiumPrice }) ? 'buy' : 'cant'}" data-act="pass" data-price="${ECONOMY.pass.premiumPrice}">💎 ${ECONOMY.pass.premiumPrice}</button>`;
    body.appendChild(passItem);
  }

  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'brawler') {
      const ok = spend(gs, { gems: Number(btn.dataset.price) });
      if (ok) {
        unlockBrawlerFree(gs, btn.dataset.id);
        toast('Новый бравлер!');
        saver.schedule();
      } else toast('Недостаточно гемов');
    } else if (act === 'skin') {
      const sk = ECONOMY.skins.find((s) => s.id === btn.dataset.id);
      if (spend(gs, { gems: Number(btn.dataset.price) })) {
        gs.skins.push(sk.id);
        if (gs.brawlers[sk.brawler] && gs.brawlers[sk.brawler].unlocked) {
          gs.brawlers[sk.brawler].skins = [sk.id];
        }
        toast('Скин куплен: ' + sk.name);
        saver.schedule();
      } else toast('Недостаточно гемов');
    } else if (act === 'coins') {
      if (spend(gs, { gems: Number(btn.dataset.gems) })) {
        gs.player.coins += Number(btn.dataset.coins);
        toast('+' + fmtNum(btn.dataset.coins) + ' монет');
        saver.schedule();
      } else toast('Недостаточно гемов');
    } else if (act === 'pass') {
      if (spend(gs, { gems: ECONOMY.pass.premiumPrice })) {
        gs.quests.passPremium = true;
        toast('Премиум активирован!');
        saver.schedule();
      } else toast('Недостаточно гемов');
    }
    render();
  });

  el.querySelector('#bkS').addEventListener('click', onBack);
  render();
  showScreen('shopScreen');
}

function unlockBrawlerFree(gs, id) {
  const def = BRAWLERS_BY_ID[id];
  if (def && !gs.brawlers[id]) {
    gs.brawlers[id] = { unlocked: true, trophies: 0, power: 1, skins: [] };
  }
}
