// Квесты: дневные и недельные. Генерация детерминированная по дате + id игрока.
import { BRAWLERS } from './brawlers.js';
import { MODES as M } from './modes.js';

// Шаблоны квестов: id, текст (подстановка n, target), событие-счётчик, диапазон n, режим-фильтр (опц.)
const DAILY_TEMPLATES = [
  { key: 'wins', text: 'Победи в {n} боях', event: 'win', n: [2, 3] },
  { key: 'kills', text: 'Победи {n} врагов', event: 'kill', n: [4, 6, 8] },
  { key: 'play', text: 'Сыграй {n} боёв', event: 'match', n: [3, 4] },
  { key: 'boxes', text: 'Разбей {n} ящиков', event: 'box', n: [3, 5] },
  { key: 'mode', text: 'Победи в {n} боях в режиме «{target}»', event: 'winMode', n: [1, 2], pickMode: true },
  { key: 'brawler', text: 'Победи {n} боёв бравлером {target}', event: 'winBrawler', n: [1, 2], pickBrawler: true }
];

const WEEKLY_TEMPLATES = [
  { key: 'wins', text: 'Победи в {n} боях', event: 'win', n: [8, 10, 12] },
  { key: 'kills', text: 'Победи {n} врагов', event: 'kill', n: [20, 30] },
  { key: 'play', text: 'Сыграй {n} боёв', event: 'match', n: [10, 15] },
  { key: 'trophies', text: 'Заработай {n} трофеев', event: 'trophy', n: [30, 50] },
  { key: 'boxes', text: 'Разбей {n} ящиков', event: 'box', n: [10, 15] }
];

// xorshift — детерминированный PRNG
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

export function generateQuests(playerKey, dateStr, isWeekly) {
  const rng = mulberry32(hashStr(playerKey + '|' + dateStr + (isWeekly ? '|w' : '')));
  const templates = isWeekly ? WEEKLY_TEMPLATES : DAILY_TEMPLATES;
  const count = isWeekly ? 5 : 3;
  const shuffled = [...templates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const chosen = shuffled.slice(0, count);
  return chosen.map((t, i) => {
    const n = pick(rng, t.n);
    let target = null;
    if (t.pickMode) target = pick(rng, M.filter((m) => !m.solo)).name;
    if (t.pickBrawler) target = pick(rng, BRAWLERS).name;
    return {
      id: `${dateStr}-${isWeekly ? 'w' : 'd'}-${i}`,
      text: t.text.replace('{n}', n).replace('{target}', target || ''),
      event: t.event,
      target: target || null,
      n, progress: 0, done: false, claimed: false, weekly: !!isWeekly
    };
  });
}

// Уведеличение прогресса квестов по событию боя
export function progressQuests(quests, events, ctx = {}) {
  let changed = false;
  for (const q of quests) {
    if (q.done || !events[q.event]) continue;
    // фильтры по режиму/бравлеру
    if (q.event === 'winMode' && ctx.modeName !== q.target) continue;
    if (q.event === 'winBrawler' && ctx.brawlerName !== q.target) continue;
    if (q.event === 'trophy') {
      q.progress += Math.max(0, events.trophy || 0);
    } else {
      q.progress += events[q.event] || 0;
    }
    if (q.progress >= q.n) { q.progress = q.n; q.done = true; }
    changed = true;
  }
  return changed;
}
