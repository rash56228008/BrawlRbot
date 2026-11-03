// Боевой экран: HUD, петля, результат
import { createRenderer } from '../game/render.js';
import { createInput } from '../game/input.js';
import { startMatch } from '../game/match.js';
import { ECONOMY } from '../data/economy.js';

let activeMatch = null;

export function showBattle({ tg, gs, mode, map, onExit, onSave }) {
  // Разметка экрана
  let screen = document.getElementById('battle');
  if (screen) screen.remove();
  screen = document.createElement('div');
  screen.id = 'battle';
  screen.className = 'screen active';
  screen.innerHTML = `
    <div class="battle-canvas-wrap">
      <canvas id="gameCanvas"></canvas>
      <canvas id="miniCanvas" width="130" height="80"></canvas>
    </div>
    <div class="battle-hud">
      <div class="hud-left">
        <div class="hud-timer" id="hudTimer">0:00</div>
        <button class="hud-btn" id="btnQuit">✕</button>
      </div>
      <div class="hud-score">
        <div class="score-pill us" id="scoreUs">0</div>
        <div class="score-pill them" id="scoreThem">0</div>
      </div>
    </div>
  `;
  document.getElementById('app').appendChild(screen);
  document.querySelectorAll('.screen').forEach((s) => { if (s !== screen) s.classList.remove('active'); });

  const skinId = (gs.brawlers[gs.selected] && gs.brawlers[gs.selected].skins && gs.brawlers[gs.selected].skins[0]) || null;
  const match = startMatch({
    mode, map, brawlerId: gs.selected, gs,
    playerName: (tg.user && tg.user.first_name) || 'Ты',
    skinId,
    onEvent: handleEvent,
    onEnd: (res) => {
      match.lastResult = res;
      match.lastRewards = res.rewards;
    }
  });
  activeMatch = match;

  const canvas = document.getElementById('gameCanvas');
  const mini = document.getElementById('miniCanvas');
  const renderer = createRenderer(canvas, match.world, match.player);

  const input = createInput({
    joystickFixed: gs.settings.joystickFixed,
    joystickSize: gs.settings.joystickSize,
    onMove: (x, y) => match.setMove(x, y),
    onAim: (ang) => match.aimAt(ang),
    onAttack: (ang) => {
      // тап без прицела — автоаим в ближайшего врага
      const target = findNearestEnemy(match);
      const aim = ang != null ? ang : (target != null ? target : match.player.aim);
      match.attack(aim);
      tg.haptic('light');
    },
    onSuper: (ang, point) => {
      const target = findNearestEnemy(match);
      const aim = ang != null ? ang : (target != null ? target : match.player.aim);
      match.useSuper(aim, point || (ang == null && target != null ? targetPoint(match) : null));
      tg.haptic('medium');
    },
    onDragSuper: () => {}
  });

  // HUD-элементы
  const hudTimer = document.getElementById('hudTimer');
  const scoreUs = document.getElementById('scoreUs');
  const scoreThem = document.getElementById('scoreThem');

  document.getElementById('btnQuit').addEventListener('click', () => {
    confirmQuit();
  });

  function confirmQuit() {
    // выход из боя = поражение (прогресс матча сохраняется)
    showModal({
      title: 'Покинуть бой?',
      body: 'Бой будет засчитан как поражение. Награды за матч начислятся.',
      buttons: [
        { text: 'Остаться', style: 'cancel' },
        { text: 'Выйти', style: 'danger', onClick: () => { match.world.finish(false, 'покинул бой'); match.end(); } }
      ]
    });
  }

  // ==== Игровая петля ====
  let last = performance.now();
  let raf = 0;
  let running = true;

  function loop(now) {
    if (!running) return;
    const dt = Math.min(50, now - last) / 1000;
    last = now;
    try {
      match.step(dt);
      renderer.draw(dt);
      if ((match.world.tickCount & 15) === 0) renderer.drawMinimap(mini);
      updateHud();
    } catch (e) {
      console.error('[battle] loop error:', e);
      stopLoop();
      toast('Ошибка боя: ' + e.message);
      match.world.finish(false, 'ошибка');
      match.end();
    }
    if (match.world.result && !resultShown) showResult();
    raf = requestAnimationFrame(loop);
  }

  let resultShown = false;
  function showResult() {
    if (resultShown) return;
    resultShown = true;
    stopLoop();
    input.destroy();
    const r = match.lastResult || { win: false, place: null, reason: '—', rewards: { trophies: 0, coins: 0, xp: 0 } };
    renderResult(r);
    onSave && onSave();
  }

  function updateHud() {
    const t = Math.floor(match.world.time);
    hudTimer.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    scoreUs.textContent = match.world.score[0];
    scoreThem.textContent = match.world.score[1];
    input.setAmmo(match.player.ammo, match.player.maxAmmo);
    input.setSuperReady(match.player.superCharge >= match.player.sup.charge);
    // респавн-оверлей
    let ov = document.querySelector('.respawn-overlay');
    if (!match.player.alive && match.player.respawnTimer > 0) {
      if (!ov) {
        ov = document.createElement('div');
        ov.className = 'respawn-overlay';
        screen.appendChild(ov);
      }
      ov.innerHTML = `☠️ Возрождение<br><span style="font-size:40px">${Math.ceil(match.player.respawnTimer)}</span>`;
    } else if (ov) ov.remove();
  }

  function handleEvent(ev) {
    if (ev.type === 'kill') {
      const t = document.createElement('div');
      t.className = 'battle-toast';
      t.textContent = '💥 ' + ev.name + ' повержен!';
      screen.appendChild(t);
      setTimeout(() => t.remove(), 1700);
    }
  }

  function stopLoop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  // ==== Экран результатов ====
  function renderResult(r) {
    const win = r.win;
    const rew = r.rewards || {};
    let rs = document.getElementById('resultScreen');
    if (rs) rs.remove();
    rs = document.createElement('div');
    rs.id = 'resultScreen';
    rs.className = 'screen active';
    const placeText = r.place && !win && mode.solo ? ` — ${r.place} место` : '';
    rs.innerHTML = `
      <div class="result-title ${win ? 'win' : 'lose'}">${win ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ'}</div>
      <div class="result-sub">${r.reason || ''}${placeText}</div>
      <div class="result-rewards">
        <div class="reward-card"><div class="rv ${rew.trophies >= 0 ? 'up' : 'down'}">${rew.trophies >= 0 ? '+' : ''}${rew.trophies || 0}</div><div class="rl">🏆 трофеи</div></div>
        <div class="reward-card"><div class="rv up">+${rew.coins || 0}</div><div class="rl">🪙 монеты</div></div>
        <div class="reward-card"><div class="rv up">+${rew.xp || 0}</div><div class="rl">⭐ XP</div></div>
      </div>
      <button class="btn btn-primary" id="btnBackToMenu">В меню</button>
    `;
    document.getElementById('app').appendChild(rs);
    screen.classList.remove('active');
    document.getElementById('btnBackToMenu').addEventListener('click', () => {
      rs.remove();
      onExit();
    });
  }

  // кнопка назад Telegram
  tg.onBackPressed(() => {
    if (!resultShown) confirmQuit();
    else { rsRemoveAndExit(); }
  });

  function rsRemoveAndExit() {
    const rs = document.getElementById('resultScreen');
    if (rs) rs.remove();
    onExit();
  }

  raf = requestAnimationFrame(loop);

  return match;
}

function findNearestEnemy(match) {
  const p = match.player;
  let best = null, bd = 1e9;
  for (const e of match.world.brawlers) {
    if (!e.alive || e.team === p.team) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < bd && d < p.atk.range) { bd = d; best = e; }
  }
  if (best) return Math.atan2(best.y - p.y, best.x - p.x);
  return null;
}

function targetPoint(match) {
  const ang = findNearestEnemy(match);
  if (ang == null) return null;
  const p = match.player;
  return { x: p.x + Math.cos(ang) * 300, y: p.y + Math.sin(ang) * 300 };
}

// ==== Мини-модалка и тост (общие, без импорта common чтобы избежать цикла) ====
function showModal({ title, body, buttons }) {
  let m = document.getElementById('miniModal');
  if (m) m.remove();
  m = document.createElement('div');
  m.id = 'miniModal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100;display:flex;align-items:center;justify-content:center;';
  m.innerHTML = `
    <div style="background:var(--panel);border-radius:18px;padding:24px;max-width:320px;width:90%;text-align:center;">
      <div style="font-size:20px;font-weight:800;margin-bottom:10px;">${title}</div>
      <div style="color:var(--text-dim);margin-bottom:20px;font-size:14px;">${body}</div>
      <div id="mmBtns" style="display:flex;gap:10px;justify-content:center;"></div>
    </div>`;
  document.body.appendChild(m);
  for (const b of buttons) {
    const btn = document.createElement('button');
    btn.textContent = b.text;
    btn.style.cssText = `flex:1;padding:10px;border:none;border-radius:12px;font-weight:800;font-size:14px;cursor:pointer;${
      b.style === 'danger' ? 'background:var(--danger);color:#fff;' :
      b.style === 'cancel' ? 'background:var(--panel2);color:var(--text);' :
      'background:var(--gold);color:#1a1233;'}`;
    btn.addEventListener('click', () => {
      m.remove();
      if (b.onClick) b.onClick();
    });
    m.querySelector('#mmBtns').appendChild(btn);
  }
}

function toast(msg) {
  let t = document.querySelector('.app-toast');
  if (t) t.remove();
  t = document.createElement('div');
  t.className = 'app-toast';
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:20%;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.8);color:#fff;padding:10px 22px;border-radius:12px;z-index:120;font-weight:700;';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}
