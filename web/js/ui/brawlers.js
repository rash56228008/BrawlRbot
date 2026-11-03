// Экран бравлеров: коллекция, апгрейд, покупка
import { BRAWLERS, BRAWLERS_BY_ID, RARITY_LABEL, RARITY_COLOR, RARITY_ORDER, POWER_COST } from '../data/brawlers.js';
import { ECONOMY } from '../data/economy.js';
import { unlockBrawler, upgradePower } from '../state/gamestate.js';
import { makeScreen, showScreen, toast, modal, fmtNum } from './common.js';

export function showBrawlers({ gs, saver, onBack }) {
  const el = makeScreen('brawlersScreen', `
    <button class="back-btn" id="bkB">←</button>
    <div class="screen-content">
      <div class="topbar">
        <div class="currency coins">🪙 <span id="tbCoins"></span></div>
        <div class="currency gems">💎 <span id="tbGems"></span></div>
      </div>
      <div class="page">
        <div class="page-title">🥊 Бравлеры</div>
        <div class="card-grid" id="bGrid"></div>
      </div>
    </div>
  `);

  function render() {
    el.querySelector('#tbCoins').textContent = fmtNum(gs.player.coins);
    el.querySelector('#tbGems').textContent = fmtNum(gs.player.gems);
    const grid = el.querySelector('#bGrid');
    grid.innerHTML = '';
    for (const rar of RARITY_ORDER) {
      const list = BRAWLERS.filter((b) => b.rarity === rar);
      if (!list.length) continue;
      for (const b of list) {
        const st = gs.brawlers[b.id];
        const card = document.createElement('div');
        card.className = 'brawler-card' + (st ? '' : ' locked') + (gs.selected === b.id ? ' selected' : '');
        card.style.borderColor = RARITY_COLOR[rar];
        const price = ECONOMY.brawlerPrice[b.rarity];
        card.innerHTML = `
          ${!st && price ? `<div class="bc-price">💎 ${price}</div>` : ''}
          <div class="bc-rarity" style="color:${RARITY_COLOR[rar]}">${RARITY_LABEL[rar]}</div>
          <div class="bc-circle" style="background:${b.color}"></div>
          <div class="bc-name">${b.name}</div>
          ${st ? `
            <div class="bc-trophies">🏆 ${st.trophies}</div>
            <div class="bc-power">Сила ${st.power}</div>
          ` : `<div class="bc-power">${b.class}</div>`}
        `;
        card.addEventListener('click', () => onTap(b, st));
        grid.appendChild(card);
      }
    }
  }

  function onTap(b, st) {
    if (!st) {
      // купить
      const price = ECONOMY.brawlerPrice[b.rarity] || 0;
      modal({
        title: b.name,
        body: `<div style="text-align:center">
          <div style="width:70px;height:70px;border-radius:50%;background:${b.color};margin:0 auto 10px;border:4px solid ${RARITY_COLOR[b.rarity]}"></div>
          <b>${RARITY_LABEL[b.rarity]}</b> · ${b.class}<br><br>
          ${b.desc}<br><br>
          ❤️ ${b.hp} · 🎯 ${b.attack.damage}${b.attack.count ? '×' + b.attack.count : ''} · 📏 ${b.attack.range}
        </div>`,
        buttons: [
          { text: 'Позже', style: 'cancel' },
          {
            text: `Открыть за 💎${price}`,
            onClick: () => {
              const ok = unlockBrawler(gs, b.id);
              if (ok) {
                toast(`${b.name} присоединился!`);
                gs.tutorials.firstBrawler = true;
                saver.schedule();
              } else {
                toast('Недостаточно гемов');
              }
              render();
            }
          }
        ]
      });
      return;
    }
    // выбрать / апгрейд
    modal({
      title: b.name + (gs.selected === b.id ? ' (выбран)' : ''),
      body: `<div style="text-align:center">
        <div style="width:70px;height:70px;border-radius:50%;background:${b.color};margin:0 auto 10px;border:4px solid ${RARITY_COLOR[b.rarity]}"></div>
        🏆 ${st.trophies} · Сила ${st.power}/11<br><br>
        <b>${b.attack.name}</b>: ${b.attack.damage}${b.attack.count ? '×' + b.attack.count : ''} урона, дальность ${b.attack.range}<br>
        <b>Супер «${b.super.name}»</b><br>${b.super.desc || ''}<br><br>${b.desc}
      </div>`,
      buttons: [
        ...(gs.selected === b.id ? [] : [{
          text: 'Выбрать', onClick: () => { gs.selected = b.id; saver.schedule(); render(); toast('Выбран ' + b.name); }
        }]),
        ...(st.power < 11 ? [{
          text: `Сила ${st.power + 1} · 🪙${POWER_COST[st.power - 1]}`,
          onClick: () => {
            const ok = upgradePower(gs, b.id);
            toast(ok ? `Сила ${gs.brawlers[b.id].power}!` : 'Недостаточно монет');
            render();
          }
        }] : [{ text: 'Макс. сила', style: 'cancel' }]),
        { text: 'Закрыть', style: 'cancel' }
      ]
    });
  }

  el.querySelector('#bkB').addEventListener('click', onBack);
  render();
  showScreen('brawlersScreen');
}
