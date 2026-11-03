// GameState: создание, сериализация, валидация, награды за бой
import { BRAWLERS, BRAWLERS_BY_ID, POWER_COST } from '../data/brawlers.js';
import { ECONOMY } from '../data/economy.js';
import { generateQuests, progressQuests } from '../data/quests.js';

export const SAVE_KEY = 'brawl_save';

export function newGameState(playerName = 'Боец', playerKey = 'local') {
  const now = Date.now();
  const dateStr = new Date().toISOString().slice(0, 10);
  const week = weekKey(new Date());
  return {
    v: 1,
    createdAt: now,
    player: {
      id: playerKey,
      name: playerName,
      avatar: null,          // индекс аватарки
      trophies: 0,
      coins: 100,
      gems: 30,
      xp: 0,
      level: 1,
      tokens: ECONOMY.tokensMax,
      tokensAt: now,
      rank: 0,               // очки ранговых боёв
      rankTier: 1
    },
    // открытые бравлеры: Шелли сразу
    brawlers: { shelly: { unlocked: true, trophies: 0, power: 1, skins: [] } },
    selected: 'shelly',
    quests: {
      day: dateStr,
      daily: generateQuests(playerKey, dateStr, false),
      week,
      weekly: generateQuests(playerKey, week, true),
      passXp: 0,
      passPremium: false,
      passClaims: [],        // [{ tier, premium }]
      season: ECONOMY.pass.season
    },
    club: null,              // { id, name, joinedAt }
    friends: [],
    settings: { sound: true, joystickSize: 100, joystickFixed: true, colorBlind: false },
    stats: { matches: 0, wins: 0, kills: 0, bestTrophies: 0, boxes: 0, timePlayed: 0 },
    battleLog: [],           // [{ t, mode, brawler, score, trophies, result }]
    mapEdits: [],            // [{ id, name, rows }]
    skins: [],               // купленные скины (id из ECONOMY.skins)
    tutorials: { firstBattle: false, firstBrawler: false },
    seenNews: false
  };
}

function weekKey(d) {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() - day + 1);
  return dt.toISOString().slice(0, 10);
}
export { weekKey };

// ---- Валидация/десериализация: чинит мусор и нарушения инвариантов ----
export function deserialize(raw) {
  if (!raw || (typeof raw !== 'object' && typeof raw !== 'string')) return null;
  try {
    const gs = JSON.parse(typeof raw === 'string' ? raw : JSON.stringify(raw));
    if (!gs || typeof gs !== 'object' || !gs.player) return null;

    // v1 — текущая версия, апгрейды здесь в будущем
    gs.v = 1;
    const p = gs.player;
    p.trophies = clampInt(p.trophies, 0, 200000);
    p.coins = clampInt(p.coins, 0, 5000000);
    p.gems = clampInt(p.gems, 0, 100000);
    p.xp = clampInt(p.xp, 0, 99999999);
    p.level = clampInt(p.level, 1, 300);
    p.tokens = clampInt(p.tokens, 0, ECONOMY.tokensMax);
    p.rank = clampInt(p.rank, 0, 9999);

    if (!gs.brawlers || typeof gs.brawlers !== 'object') gs.brawlers = {};
    if (!gs.brawlers.shelly) gs.brawlers.shelly = { unlocked: true, trophies: 0, power: 1, skins: [] };
    for (const [id, b] of Object.entries(gs.brawlers)) {
      if (!BRAWLERS_BY_ID[id]) { delete gs.brawlers[id]; continue; }
      b.trophies = clampInt(b.trophies, 0, 200000);
      b.power = clampInt(b.power, 1, 11);
      b.skins = Array.isArray(b.skins) ? b.skins : [];
      if (!b.unlocked && id !== 'shelly') delete gs.brawlers[id];
    }
    if (!gs.brawlers[gs.selected] || !gs.brawlers[gs.selected].unlocked) gs.selected = 'shelly';

    if (!Array.isArray(gs.friends)) gs.friends = [];
    if (!Array.isArray(gs.battleLog)) gs.battleLog = [];
    if (!Array.isArray(gs.mapEdits)) gs.mapEdits = [];
    if (!Array.isArray(gs.skins)) gs.skins = [];
    if (!Array.isArray(gs.quests?.passClaims)) gs.quests = gs.quests || {};
    if (!gs.quests.passClaims) gs.quests.passClaims = [];
    gs.settings = Object.assign({ sound: true, joystickSize: 100, joystickFixed: true, colorBlind: false }, gs.settings || {});
    gs.stats = Object.assign({ matches: 0, wins: 0, kills: 0, bestTrophies: 0, boxes: 0, timePlayed: 0 }, gs.stats || {});
    gs.tutorials = Object.assign({ firstBattle: false, firstBrawler: false }, gs.tutorials || {});
    return gs;
  } catch (e) {
    return null;
  }
}

function clampInt(v, min, max) {
  v = Math.floor(Number(v) || 0);
  return Math.max(min, Math.min(max, v));
}

// ---- Жетоны: регенерация по времени ----
export function regenTokens(gs) {
  const p = gs.player;
  if (p.tokens >= ECONOMY.tokensMax) { p.tokensAt = Date.now(); return; }
  const elapsedMin = (Date.now() - (p.tokensAt || Date.now())) / 60000;
  const add = Math.floor(elapsedMin / (ECONOMY.tokensRegenMin / ECONOMY.tokensPerWin) * ECONOMY.tokensPerWin / 1);
  // проще: 1 жетон каждые tokensRegenMin/… — см. формулу ниже
  const perTokenMs = (ECONOMY.tokensRegenMin * 60000) / 1; // 26 мин на жетон
  const add2 = Math.floor((Date.now() - p.tokensAt) / perTokenMs);
  if (add2 > 0) {
    p.tokens = Math.min(ECONOMY.tokensMax, p.tokens + add2);
    p.tokensAt = Math.min(Date.now(), p.tokensAt + add2 * perTokenMs);
    if (p.tokens >= ECONOMY.tokensMax) p.tokensAt = Date.now();
  }
}

// ---- Трофейная лестница: награда/штраф по числу трофеев бравлера ----
export function trophyDelta(mode, brawlerTrophies, win, place = 0) {
  const idx = Math.min(mode.trophyWin.length - 1, Math.floor(brawlerTrophies / 100));
  if (mode.solo) {
    // соло: место 1..N
    if (place === 1) return mode.trophyWin[Math.min(mode.trophyWin.length - 1, 0)];
    return mode.trophyLose[Math.min(mode.trophyLose.length - 1, place - 1)] || mode.trophyLose[mode.trophyLose.length - 1];
  }
  return win ? mode.trophyWin[idx] : mode.trophyLose[idx];
}

// ---- Награды за бой ----
// matchResult: { mode, mapName, brawlerId, win, place, kills, boxes, score, enemyScore, timeSec, trophyDelta }
export function grantBattleRewards(gs, result) {
  const p = gs.player;
  const b = gs.brawlers[result.brawlerId] || (gs.brawlers[result.brawlerId] = { unlocked: false, trophies: 0, power: 1, skins: [] });
  const changed = { trophies: 0, coins: 0, xp: 0, quests: false, levelUp: false };

  // трофеи
  const d = result.trophyDelta != null ? result.trophyDelta : trophyDelta(result.mode, b.trophies, result.win, result.place);
  b.trophies = Math.max(0, b.trophies + d);
  p.trophies = Math.max(0, Object.values(gs.brawlers).reduce((s, x) => s + x.trophies, 0));
  p.bestTrophies = Math.max(p.bestTrophies || 0, p.trophies);
  gs.stats.bestTrophies = p.bestTrophies;
  changed.trophies = d;

  // валюта
  changed.coins = result.win ? ECONOMY.coinsWin : ECONOMY.coinsLose;
  p.coins += changed.coins;

  // XP и уровень (уровень = 1 + floor(sqrt(xp/50)))
  changed.xp = result.win ? ECONOMY.xpWin : ECONOMY.xpLose;
  p.xp += changed.xp;
  const newLevel = 1 + Math.floor(Math.sqrt(p.xp / 50));
  if (newLevel > p.level) { p.level = newLevel; changed.levelUp = true; }

  // статистика
  gs.stats.matches++;
  if (result.win) gs.stats.wins++;
  gs.stats.kills += result.kills || 0;
  gs.stats.boxes += result.boxes || 0;
  gs.stats.timePlayed += result.timeSec || 0;

  // лог боя (последние 20)
  gs.battleLog.unshift({
    t: Date.now(), mode: result.mode.id, modeName: result.mode.name,
    brawler: result.brawlerId, map: result.mapName,
    score: result.score, enemyScore: result.enemyScore,
    result: result.win ? 'win' : 'lose', trophies: d
  });
  gs.battleLog = gs.battleLog.slice(0, 20);

  // квесты
  const dateStr = new Date().toISOString().slice(0, 10);
  const wk = weekKey(new Date());
  if (gs.quests.day !== dateStr) {
    gs.quests.day = dateStr;
    gs.quests.daily = generateQuests(p.id, dateStr, false);
  }
  if (gs.quests.week !== wk) {
    gs.quests.week = wk;
    gs.quests.weekly = generateQuests(p.id, wk, true);
  }
  const brawlerName = (BRAWLERS_BY_ID[result.brawlerId] || {}).name;
  changed.quests = progressQuests(
    [...gs.quests.daily, ...gs.quests.weekly],
    { win: result.win ? 1 : 0, kill: result.kills || 0, match: 1, box: result.boxes || 0, trophy: d, winMode: result.win ? 1 : 0, winBrawler: result.win ? 1 : 0 },
    { modeName: result.mode.name, brawlerName }
  );

  gs.tutorials.firstBattle = true;
  return changed;
}

// ---- Покупки (инварианты: нехватка валюты невозможна — вызовы должны проверять canAfford) ----
export function canAfford(gs, { coins = 0, gems = 0 }) {
  return gs.player.coins >= coins && gs.player.gems >= gems;
}
export function spend(gs, { coins = 0, gems = 0 }) {
  if (!canAfford(gs, { coins, gems })) return false;
  gs.player.coins -= coins;
  gs.player.gems -= gems;
  return true;
}

export function unlockBrawler(gs, id) {
  const def = BRAWLERS_BY_ID[id];
  if (!def || gs.brawlers[id]) return false;
  const price = ECONOMY.brawlerPrice[def.rarity];
  if (!price || def.rarity === 'start') return false;
  if (!spend(gs, { gems: price })) return false;
  gs.brawlers[id] = { unlocked: true, trophies: 0, power: 1, skins: [] };
  return true;
}

export function upgradePower(gs, id) {
  const b = gs.brawlers[id];
  if (!b || !b.unlocked || b.power >= 11) return false;
  const cost = POWER_COST[b.power - 1];
  if (!spend(gs, { coins: cost })) return false;
  b.power++;
  return true;
}

// ---- Автосохранение (debounce) ----
export function makeSaver(tg, gs) {
  let timer = null;
  const doSave = () => {
    const raw = JSON.stringify(gs);
    try { localStorage.setItem(SAVE_KEY, raw); } catch (e) {}
    tg.cloudSet(SAVE_KEY, raw);
  };
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(doSave, 1000);
  };
  const saveNow = () => { if (timer) clearTimeout(timer); doSave(); };
  // сохранение при уходе со страницы/сворачивании
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
  window.addEventListener('pagehide', saveNow);
  return { schedule, saveNow };
}
