// Настройки + данные боя (лог матчей)
import { makeScreen, showScreen, modal, fmtNum, timeAgo } from './common.js';
import { MODES_BY_ID } from '../data/modes.js';
import { BRAWLERS_BY_ID } from '../data/brawlers.js';

export function showSettings({ tg, gs, saver, onBack }) {
  const el = makeScreen('settingsScreen', `
    <button class="back-btn" id="bkSet">←</button>
    <div class="screen-content">
      <div class="page">
        <div class="page-title">⚙️ Настройки</div>
        <div class="settings-row">
          <div>🔊 Звук</div>
          <div class="toggle ${gs.settings.sound ? 'on' : ''}" id="tglSound"></div>
        </div>
        <div class="settings-row">
          <div>🕹 Джойстик (размер)</div>
          <input type="range" min="80" max="140" value="${gs.settings.joystickSize}" id="rngJoy" style="width:120px;">
        </div>
        <div class="settings-row">
          <div>📌 Фиксированный джойстик</div>
          <div class="toggle ${gs.settings.joystickFixed ? 'on' : ''}" id="tglJoy"></div>
        </div>
        <div class="panel-title" style="margin-top:18px;">📊 Профиль</div>
        <div class="panel">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Игрок</span><b>${gs.player.name}</b></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Трофеи</span><b>🏆 ${fmtNum(gs.player.trophies)}</b></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Матчей</span><b>${gs.stats.matches}</b></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Побед</span><b>${gs.stats.wins} (${gs.stats.matches ? Math.round(gs.stats.wins / gs.stats.matches * 100) : 0}%)</b></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Убийств</span><b>${gs.stats.kills}</b></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Ящиков разбито</span><b>${gs.stats.boxes}</b></div>
          <div style="display:flex;justify-content:space-between;"><span>В игре</span><b>${Math.round(gs.stats.timePlayed / 60)} мин</b></div>
        </div>
        <div class="settings-row" style="background:rgba(255,77,109,.15);">
          <div>🗑 Сбросить прогресс</div>
          <button class="btn" id="btnReset" style="background:var(--danger);padding:8px 14px;font-size:13px;">Сброс</button>
        </div>
        <div style="text-align:center;color:var(--text-dim);font-size:11px;margin-top:20px;">
          BRAWL · фан-игра в мини-приложении Telegram<br>
          Не связана с Supercell
        </div>
      </div>
    </div>
  `);

  el.querySelector('#tglSound').addEventListener('click', (e) => {
    gs.settings.sound = !gs.settings.sound;
    e.target.classList.toggle('on', gs.settings.sound);
    saver.schedule();
  });
  el.querySelector('#tglJoy').addEventListener('click', (e) => {
    gs.settings.joystickFixed = !gs.settings.joystickFixed;
    e.target.classList.toggle('on', gs.settings.joystickFixed);
    saver.schedule();
  });
  el.querySelector('#rngJoy').addEventListener('input', (e) => {
    gs.settings.joystickSize = Number(e.target.value);
    saver.schedule();
  });
  el.querySelector('#btnReset').addEventListener('click', () => {
    modal({
      title: 'Сбросить всё?',
      body: 'Прогресс, бравлеры, трофеи и покупки будут удалены безвозвратно.',
      buttons: [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Сбросить', style: 'danger',
          onClick: () => {
            localStorage.removeItem('brawl_save');
            location.reload();
          }
        }
      ]
    });
  });

  el.querySelector('#bkSet').addEventListener('click', onBack);
  showScreen('settingsScreen');
}

// ==== Данные боя (лог) ====
export function showBattleLog({ gs, onBack }) {
  const el = makeScreen('logScreen', `
    <button class="back-btn" id="bkLog">←</button>
    <div class="screen-content">
      <div class="page">
        <div class="page-title">📜 Данные боя</div>
        ${gs.battleLog.length === 0 ? '<div class="page-sub">Ещё нет боёв — самое время начать!</div>' : ''}
        <div id="logList"></div>
      </div>
    </div>
  `);

  const list = el.querySelector('#logList');
  for (const log of gs.battleLog) {
    const mode = MODES_BY_ID[log.mode];
    const brawler = BRAWLERS_BY_ID[log.brawler];
    const row = document.createElement('div');
    row.className = 'log-row';
    row.innerHTML = `
      <div class="l-result">${log.result === 'win' ? '🏆' : '💀'}</div>
      <div class="l-info">
        <div class="l-mode">${mode ? mode.icon + ' ' + mode.name : log.modeName} · ${brawler ? brawler.name : '—'}</div>
        <div class="l-sub">${log.map || ''} · счёт ${log.score}:${log.enemyScore} · ${timeAgo(log.t)}</div>
      </div>
      <div class="l-trophy" style="color:${log.trophies >= 0 ? 'var(--ok)' : 'var(--danger)'}">${log.trophies >= 0 ? '+' : ''}${log.trophies}</div>
    `;
    list.appendChild(row);
  }

  el.querySelector('#bkLog').addEventListener('click', onBack);
  showScreen('logScreen');
}
