// Редактор карт + «сообщество»: создание, валидация, запуск, шаринг кодом
import { MAP_W, MAP_H, validateMap, mapsForMode } from '../data/maps.js';
import { MODES } from '../data/modes.js';
import { makeScreen, showScreen, toast, modal } from './common.js';

const PALETTE = [
  { ch: ' ', label: '⬜', title: 'Пусто', color: '#2c8f4e' },
  { ch: '#', label: '🧱', title: 'Стена', color: '#7a4a2b' },
  { ch: '.', label: '🌿', title: 'Куст', color: '#1e6b3a' },
  { ch: 'B', label: '📦', title: 'Ящик', color: '#8a5a2b' },
  { ch: 'S', label: '🔵', title: 'Спавн команды', color: '#2a8749' },
  { ch: 's', label: '⚫', title: 'Спавн соло', color: '#2a8749' },
  { ch: 'G', label: '💎', title: 'Точка гемов', color: '#2a8749' },
  { ch: 'F', label: '⚽', title: 'Мяч', color: '#2a8749' },
  { ch: 'X', label: '💰', title: 'Сейф', color: '#2a8749' },
  { ch: 'Z', label: '🔥', title: 'Зона', color: '#2a8749' }
];

const MAX_EDITS = 10;

export function showEditor({ gs, saver, onBack, onPlayMap }) {
  // стартовая карта: пустое поле с границей
  const empty = () => {
    const rows = [];
    for (let y = 0; y < MAP_H; y++) {
      let r = '';
      for (let x = 0; x < MAP_W; x++) {
        r += (x === 0 || x === MAP_W - 1 || y === 0 || y === MAP_H - 1) ? '#' : ' ';
      }
      rows.push(r);
    }
    return rows;
  };

  let mode = MODES[0];
  let rows = empty();
  let brush = 'S';
  let editing = null; // индекс редактируемой карты в gs.mapEdits

  const el = makeScreen('editorScreen', `
    <button class="back-btn" id="bkE">←</button>
    <div class="screen-content">
      <div class="page">
        <div class="page-title">🗺️ Редактор карт</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;" id="modePick"></div>
        <div class="editor-palette" id="palette"></div>
        <div class="editor-grid" id="eGrid"></div>
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button class="btn" id="eClear" style="background:var(--panel2);flex:1;">Очистить</button>
          <button class="btn" id="eTest" style="background:var(--panel2);flex:1;">▶ Тест</button>
          <button class="btn" id="eSave" style="background:linear-gradient(180deg,#ffd23f,#f5a623);color:#1a1233;flex:1;">Сохранить</button>
        </div>
        ${gs.mapEdits.length ? '<div class="panel-title" style="margin-top:16px;">Мои карты</div>' : ''}
        <div id="myMaps"></div>
      </div>
    </div>
  `);

  function renderModePick() {
    const cont = el.querySelector('#modePick');
    cont.innerHTML = '';
    for (const m of MODES) {
      const chip = document.createElement('button');
      chip.className = 'map-chip' + (m === mode ? ' selected' : '');
      chip.textContent = m.icon + ' ' + m.name;
      chip.addEventListener('click', () => { mode = m; renderModePick(); });
      cont.appendChild(chip);
    }
  }

  function renderPalette() {
    const cont = el.querySelector('#palette');
    cont.innerHTML = '';
    for (const p of PALETTE) {
      const b = document.createElement('div');
      b.className = 'pal-item' + (brush === p.ch ? ' selected' : '');
      b.style.background = p.color;
      b.textContent = p.label;
      b.title = p.title;
      b.addEventListener('click', () => { brush = p.ch; renderPalette(); });
      cont.appendChild(b);
    }
  }

  function renderGrid() {
    const grid = el.querySelector('#eGrid');
    grid.innerHTML = '';
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const cell = document.createElement('div');
        cell.className = 'editor-cell';
        cell.dataset.x = x; cell.dataset.y = y;
        paintCell(cell, rows[y][x]);
        grid.appendChild(cell);
      }
    }
  }

  function paintCell(cell, ch) {
    const p = PALETTE.find((p) => p.ch === ch) || PALETTE[0];
    cell.style.background = p.color;
    cell.textContent = p.label === '⬜' ? '' : p.label;
    cell.style.fontSize = '8px';
    cell.style.display = 'flex';
    cell.style.alignItems = 'center';
    cell.style.justifyContent = 'center';
  }

  // рисование
  let painting = false;
  function applyAt(e) {
    const cell = e.target.closest('.editor-cell');
    if (!cell) return;
    const x = Number(cell.dataset.x), y = Number(cell.dataset.y);
    const r = rows[y];
    rows[y] = r.slice(0, x) + brush + r.slice(x + 1);
    paintCell(cell, brush);
  }
  const grid = el.querySelector('#eGrid');
  grid.addEventListener('pointerdown', (e) => { painting = true; applyAt(e); });
  grid.addEventListener('pointermove', (e) => { if (painting) applyAt(e); });
  window.addEventListener('pointerup', () => { painting = false; });

  el.querySelector('#eClear').addEventListener('click', () => { rows = empty(); renderGrid(); });
  el.querySelector('#eTest').addEventListener('click', () => {
    const v = validateMap(rows);
    if (!v.ok) { toast('Карта неверна: ' + v.error); return; }
    onPlayMap({ mode, map: { id: 'custom', mode: mode.id, name: 'Своя карта', rows } });
  });
  el.querySelector('#eSave').addEventListener('click', () => {
    const v = validateMap(rows);
    if (!v.ok) { toast('Карта неверна: ' + v.error); return; }
    // спавны: минимум
    const spawns = rows.join('').split('').filter((c) => c === 'S' || c === 's').length;
    const need = mode.solo ? 6 : mode.teamSize * 2;
    if (spawns < need) { toast(`Нужно минимум ${need} спавнов`); return; }
    if (gs.mapEdits.length >= MAX_EDITS && editing == null) { toast('Максимум ' + MAX_EDITS + ' карт'); return; }
    modal({
      title: 'Название карты',
      body: `<input id="mapName" placeholder="Например: Моя арена" style="width:100%;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:12px;padding:10px 14px;">`,
      buttons: [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Сохранить',
          onClick: () => {
            const name = document.getElementById('mapName').value.trim() || 'Своя карта';
            const entry = { id: 'me' + Date.now(), name, mode: mode.id, rows };
            if (editing != null) gs.mapEdits[editing] = entry;
            else gs.mapEdits.unshift(entry);
            saver.schedule();
            toast('Карта сохранена');
            renderMyMaps();
          }
        }
      ]
    });
  });

  function renderMyMaps() {
    const cont = el.querySelector('#myMaps');
    if (!cont) return;
    cont.innerHTML = '';
    for (let i = 0; i < gs.mapEdits.length; i++) {
      const m = gs.mapEdits[i];
      const modeDef = MODES.find((x) => x.id === m.mode) || MODES[0];
      const row = document.createElement('div');
      row.className = 'panel';
      row.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="font-size:24px;">${modeDef.icon}</div>
          <div style="flex:1;">
            <div style="font-weight:800;">${escapeHtml(m.name)}</div>
            <div style="font-size:11px;color:var(--text-dim);">${modeDef.name} · код: ${mapCode(m)}</div>
          </div>
          <button class="btn" data-play="${i}" style="padding:6px 12px;font-size:12px;background:var(--panel2);">▶</button>
          <button class="btn" data-edit="${i}" style="padding:6px 12px;font-size:12px;background:var(--panel2);">✎</button>
          <button class="btn" data-share="${i}" style="padding:6px 12px;font-size:12px;background:var(--panel2);">📤</button>
          <button class="btn" data-del="${i}" style="padding:6px 12px;font-size:12px;background:var(--danger);">🗑</button>
        </div>`;
      cont.appendChild(row);
    }
  }

  el.querySelector('#myMaps') && el.querySelector('#myMaps').addEventListener('click', (e) => {
    const play = e.target.closest('[data-play]');
    const edit = e.target.closest('[data-edit]');
    const share = e.target.closest('[data-share]');
    const del = e.target.closest('[data-del]');
    if (play) {
      const m = gs.mapEdits[Number(play.dataset.play)];
      onPlayMap({ mode: MODES.find((x) => x.id === m.mode) || MODES[0], map: m });
    } else if (edit) {
      const i = Number(edit.dataset.edit);
      editing = i;
      const m = gs.mapEdits[i];
      mode = MODES.find((x) => x.id === m.mode) || MODES[0];
      rows = [...m.rows];
      renderModePick(); renderGrid(); renderMyMaps();
      toast('Редактирование: ' + m.name);
    } else if (share) {
      const m = gs.mapEdits[Number(share.dataset.share)];
      const code = mapCode(m);
      navigator.clipboard && navigator.clipboard.writeText(code).catch(() => {});
      modal({
        title: '📤 Поделиться картой',
        body: `Отправь этот код другу — он вставит его в редакторе «Сообщество»:<br><br><b style="user-select:all;color:var(--gold);">${code}</b><br><br>(код скопирован)`,
        buttons: [{ text: 'Ок' }]
      });
    } else if (del) {
      gs.mapEdits.splice(Number(del.dataset.del), 1);
      saver.schedule();
      renderMyMaps();
    }
  });

  el.querySelector('#bkE').addEventListener('click', onBack);
  renderModePick();
  renderPalette();
  renderGrid();
  renderMyMaps();
  showScreen('editorScreen');
}

// ==== Карты сообщества: импорт по коду ====
export function importMapCode(code) {
  try {
    // формат: BRAWLMAP.<modeId>.<name36>.<rows36>
    const parts = code.split('.');
    if (parts[0] !== 'BRAWLMAP' || parts.length < 4) return null;
    const modeId = parts[1];
    const name = decode36(parts[2]);
    const rows = decode36(parts.slice(3).join('.')).split('\n');
    if (!rows.length || rows.length > MAP_H) return null;
    while (rows.length < MAP_H) rows.push('#'.repeat(MAP_W));
    rows = rows.map((r) => r.padEnd(MAP_W, '#').slice(0, MAP_W));
    const v = validateMap(rows);
    if (!v.ok) return null;
    return { id: 'imp' + Date.now(), name, mode: modeId, rows };
  } catch (e) {
    return null;
  }
}

export function mapCode(map) {
  return 'BRAWLMAP.' + map.mode + '.' + encode36(map.name) + '.' + encode36(map.rows.join('\n'));
}

const B36 = 'abcdefghijklmnopqrstuvwxyz0123456789_';
function encode36(str) {
  // текст -> безопасные символы -> компактный код
  let out = '';
  for (const ch of str) {
    const idx = B36.indexOf(ch.toLowerCase());
    if (idx >= 0) out += ch.toLowerCase();
    else if (ch === ' ') out += '_';
    else if (ch === '\n') out += '|';
    else out += '?';
  }
  return btoa(out).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function decode36(code) {
  try {
    const b = code.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b);
    return raw.replace(/\|/g, '\n');
  } catch (e) {
    return '';
  }
}
function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
