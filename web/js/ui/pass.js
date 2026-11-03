// Бравл-пасс: трек наград, XP, премиум
import { ECONOMY } from '../data/economy.js';
import { spend } from '../state/gamestate.js';
import { makeScreen, showScreen, toast, fmtNum } from './common.js';

export function showPass({ gs, saver, onBack }) {
  const el = makeScreen('passScreen', `
    <button class="back-btn" id="bkP">←</button>
    <div class="screen-content">
      <div class="topbar">
        <div class="currency coins">🪙 <span id="tbCoins"></span></div>
        <div class="currency gems">💎 <span id="tbGems"></span></div>
      </div>
      <div class="page">
        <div class="page-title">🎟️ ${ECONOMY.pass.season}</div>
        <div class="panel">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div><b>Уровень ${currentTier(gs)}/${ECONOMY.pass.tiers}</b></div>
            <div style="color:var(--text-dim);font-size:12px;">${xpToNext(gs)} XP до следующего</div>
          </div>
          <div style="height:12px;background:rgba(0,0,0,.5);border-radius:6px;overflow:hidden;">
            <div style="height:100%;width:${tierProgress(gs) * 100}%;background:linear-gradient(90deg,var(--gold),#ff9d3f);border-radius:6px;"></div>
          </div>
          ${gs.quests.passPremium
            ? '<div style="margin-top:10px;color:var(--gold);font-weight:800;">✓ Премиум активен</div>'
            : `<button class="btn" id="buyPrem" style="margin-top:10px;background:linear-gradient(180deg,#ffd23f,#f5a623);color:#1a1233;">Купить премиум · 💎 ${ECONOMY.pass.premiumPrice}</button>`}
        </div>
        <div class="pass-track" id="passTrack"></div>
      </div>
    </div>
  `);

  function render() {
    el.querySelector('#tbCoins').textContent = fmtNum(gs.player.coins);
    el.querySelector('#tbGems').textContent = fmtNum(gs.player.gems);
    const track = el.querySelector('#passTrack');
    track.innerHTML = '';
    const cur = currentTier(gs);
    for (let t = 1; t <= ECONOMY.pass.tiers; t++) {
      const fr = ECONOMY.pass.freeReward(t);
      const pr = ECONOMY.pass.premiumReward(t);
      const claimed = (type) => gs.quests.passClaims.some((c) => c.tier === t && c.premium === (type === 'prem'));
      const unlocked = t <= cur;
      const row = document.createElement('div');
      row.className = 'pass-tier';
      row.innerHTML = `
        <div class="t-num">${t}</div>
        <div class="t-cell free ${claimed('free') ? 'claimed' : ''} ${unlocked && !claimed('free') ? 'unlocked' : ''}" data-tier="${t}" data-type="free">
          ${fr.label}<div style="font-size:9px;color:var(--text-dim);">FREE</div>
        </div>
        <div class="t-cell prem ${!gs.quests.passPremium ? '' : (claimed('prem') ? 'claimed' : (unlocked && !claimed('prem') ? 'unlocked' : ''))}" data-tier="${t}" data-type="prem">
          ${pr.label}<div style="font-size:9px;color:var(--gold);">PREMIUM</div>
        </div>
      `;
      track.appendChild(row);
    }
  }

  el.querySelector('#passTrack').addEventListener('click', (e) => {
    const cell = e.target.closest('.t-cell.unlocked');
    if (!cell) return;
    const t = Number(cell.dataset.tier);
    const prem = cell.dataset.type === 'prem';
    if (prem && !gs.quests.passPremium) { toast('Нужен премиум'); return; }
    const rew = prem ? ECONOMY.pass.premiumReward(t) : ECONOMY.pass.freeReward(t);
    gs.player.coins += rew.coins || 0;
    gs.player.gems += rew.gems || 0;
    gs.quests.passClaims.push({ tier: t, premium: prem });
    toast('Получено: ' + rew.label);
    saver.schedule();
    render();
  });

  const buyBtn = el.querySelector('#buyPrem');
  if (buyBtn) {
    buyBtn.addEventListener('click', () => {
      if (spend(gs, { gems: ECONOMY.pass.premiumPrice })) {
        gs.quests.passPremium = true;
        toast('Премиум активирован!');
        saver.schedule();
        showPass({ gs, saver, onBack });
      } else toast('Недостаточно гемов');
    });
  }

  el.querySelector('#bkP').addEventListener('click', onBack);
  render();
  showScreen('passScreen');
}

export function currentTier(gs) {
  return Math.min(ECONOMY.pass.tiers, Math.floor(gs.quests.passXp / ECONOMY.pass.xpPerTier));
}
function tierProgress(gs) {
  const t = currentTier(gs);
  if (t >= ECONOMY.pass.tiers) return 1;
  return (gs.quests.passXp % ECONOMY.pass.xpPerTier) / ECONOMY.pass.xpPerTier;
}
function xpToNext(gs) {
  const t = currentTier(gs);
  if (t >= ECONOMY.pass.tiers) return 0;
  return ECONOMY.pass.xpPerTier - (gs.quests.passXp % ECONOMY.pass.xpPerTier);
}
