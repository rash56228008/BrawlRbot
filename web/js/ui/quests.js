// Квесты: дневные, недельные, забор наград
import { ECONOMY } from '../data/economy.js';
import { generateQuests } from '../data/quests.js';
import { weekKey } from '../state/gamestate.js';
import { makeScreen, showScreen, toast, fmtNum, hhmmss } from './common.js';

export function refreshQuests(gs) {
  const dateStr = new Date().toISOString().slice(0, 10);
  const wk = weekKey(new Date());
  if (gs.quests.day !== dateStr) {
    gs.quests.day = dateStr;
    gs.quests.daily = generateQuests(gs.player.id, dateStr, false);
  }
  if (gs.quests.week !== wk) {
    gs.quests.week = wk;
    gs.quests.weekly = generateQuests(gs.player.id, wk, true);
  }
}

export function questsDoneUnclaimed(gs) {
  return [...gs.quests.daily, ...gs.quests.weekly].filter((q) => q.done && !q.claimed).length;
}

export function showQuests({ gs, saver, onBack }) {
  refreshQuests(gs);
  const el = makeScreen('questsScreen', `
    <button class="back-btn" id="bkQ">←</button>
    <div class="screen-content">
      <div class="topbar">
        <div class="currency coins">🪙 <span id="tbCoins"></span></div>
        <div class="currency gems">💎 <span id="tbGems"></span></div>
      </div>
      <div class="page">
        <div class="page-title">📋 Квесты</div>
        <div class="panel-title">☀️ Дневные <span style="font-size:11px;color:var(--text-dim);font-weight:400;">(сброс в полночь)</span></div>
        <div id="qDaily"></div>
        <div class="panel-title" style="margin-top:16px;">📅 Недельные</div>
        <div id="qWeekly"></div>
      </div>
    </div>
  `);

  function render() {
    el.querySelector('#tbCoins').textContent = fmtNum(gs.player.coins);
    el.querySelector('#tbGems').textContent = fmtNum(gs.player.gems);
    for (const [contId, list, isW] of [['qDaily', gs.quests.daily, false], ['qWeekly', gs.quests.weekly, true]]) {
      const cont = el.querySelector('#' + contId);
      cont.innerHTML = '';
      const rew = isW ? ECONOMY.questRewardWeekly : ECONOMY.questRewardDaily;
      for (const q of list) {
        const div = document.createElement('div');
        div.className = 'quest-item' + (q.done ? ' done' : '');
        div.innerHTML = `
          <div class="q-info">
            <div class="q-text">${q.text}</div>
            <div class="q-bar"><div class="q-fill" style="width:${Math.min(100, (q.progress / q.n) * 100)}%"></div></div>
          </div>
          ${q.claimed
            ? '<div class="q-reward" style="color:var(--ok);">✓</div>'
            : q.done
              ? `<button class="btn" data-qid="${q.id}" style="background:linear-gradient(180deg,#4dd97a,#2ea35c);">Забрать</button>`
              : `<div class="q-reward">${rew.xp}⭐ ${rew.coins}🪙${rew.gems ? ' ' + rew.gems + '💎' : ''}</div>`}
        `;
        cont.appendChild(div);
      }
    }
  }

  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-qid]');
    if (!btn) return;
    const q = [...gs.quests.daily, ...gs.quests.weekly].find((x) => x.id === btn.dataset.qid);
    if (!q || !q.done || q.claimed) return;
    q.claimed = true;
    const rew = q.weekly ? ECONOMY.questRewardWeekly : ECONOMY.questRewardDaily;
    gs.player.coins += rew.coins;
    gs.player.gems += rew.gems || 0;
    gs.quests.passXp += rew.xp;
    toast(`Награда: ${rew.xp}⭐ ${rew.coins}🪙`);
    saver.schedule();
    render();
  });

  el.querySelector('#bkQ').addEventListener('click', onBack);
  render();
  showScreen('questsScreen');
}
