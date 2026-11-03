// Матч: сборка мира из GameState, управление петлёй, выдача результата
import { World } from './engine.js';
import { BrawlerEntity } from './entities.js';
import { makeAI } from './ai.js';
import { BRAWLERS, BRAWLERS_BY_ID } from '../data/brawlers.js';
import { mapsForMode } from '../data/maps.js';
import { grantBattleRewards, trophyDelta } from '../state/gamestate.js';

// Матчи: 3v3 = 6 бравлеров, соло = 8
const SOLO_PLAYERS = 8;

export function startMatch({ mode, map, brawlerId, gs, playerName, skinId = null, onEvent, onEnd }) {
  const def = BRAWLERS_BY_ID[brawlerId] || BRAWLERS[0];
  const bEntry = (gs && gs.brawlers[brawlerId]) || { power: 1 };
  const skin = skinId ? findSkin(skinId, brawlerId) : null;

  const rows = map ? map.rows : mapsForMode(mode.id)[0].rows;
  const world = new World(rows, mode, Math.random);

  const playerTrophies = (bEntry && bEntry.trophies) || 0;
  // скилл ботов: базово 0.65 (выше среднего игрока), растёт с трофеями
  const botSkill = Math.min(0.95, 0.6 + playerTrophies / 1400);

  // ===== расстановка =====
  let playerEnt = null;
  const botNames = ['Виктор', 'Кира', 'Макс', 'Луна', 'Артём', 'Зоя', 'Дэн', 'Рина', 'Олег', 'Соня'];

  if (mode.solo || mode.teamSize === 1) {
    // соло: игрок + 7 ботов
    const spawns = world.spawns.solo.length >= SOLO_PLAYERS ? world.spawns.solo : world.spawns.team;
    const chosen = pickDistinctBots(SOLO_PLAYERS - 1, playerTrophies);
    playerEnt = world.addBrawler(new BrawlerEntity({
      def, team: 0, isPlayer: true, name: playerName || 'Ты', power: bEntry.power,
      x: spawns[0].x, y: spawns[0].y, skin
    }));
    playerEnt.spawnPoint = spawns[0];
    chosen.forEach((d, i) => {
      const sp = spawns[(i + 1) % spawns.length];
      const ent = world.addBrawler(new BrawlerEntity({
        def: d, team: i + 1, isPlayer: false, name: botNames[i % botNames.length],
        power: 1 + Math.min(10, Math.floor(playerTrophies / 150)), trophies: playerTrophies,
        x: sp.x, y: sp.y
      }));
      ent.spawnPoint = sp;
      ent.ai = makeAI(world, ent, botSkill);
      // в соло каждый сам за себя: team = уникальный
    });
  } else {
    // командный: игрок + 2 союзника (боты послабее), 3 врага (сильные)
    const spawns = world.spawns.team;
    const allySpawns = [spawns[0], spawns[2] || spawns[0], spawns[4] || spawns[0]];
    const enemySpawns = [spawns[1], spawns[3] || spawns[1], spawns[5] || spawns[1]];
    // если спавнов мало — сдвигаем
    while (enemySpawns.length < 3) enemySpawns.push(spawns[enemySpawns.length % spawns.length]);

    playerEnt = world.addBrawler(new BrawlerEntity({
      def, team: 0, isPlayer: true, name: playerName || 'Ты', power: bEntry.power,
      x: allySpawns[0].x, y: allySpawns[0].y, skin
    }));
    playerEnt.spawnPoint = allySpawns[0];

    const allies = pickDistinctBots(2, playerTrophies * 0.8);
    allies.forEach((d, i) => {
      const sp = allySpawns[i + 1];
      const ent = world.addBrawler(new BrawlerEntity({
        def: d, team: 0, isPlayer: false, name: botNames[(i + 3) % botNames.length],
        power: 1 + Math.min(9, Math.floor(playerTrophies / 180)),
        x: sp.x, y: sp.y
      }));
      ent.spawnPoint = sp;
      ent.ai = makeAI(world, ent, botSkill * 0.85); // союзники чуть слабее врагов
    });

    const enemies = pickDistinctBots(3, playerTrophies);
    enemies.forEach((d, i) => {
      const sp = enemySpawns[i];
      const ent = world.addBrawler(new BrawlerEntity({
        def: d, team: 1, isPlayer: false, name: botNames[(i + 6) % botNames.length],
        power: 1 + Math.min(10, Math.floor(playerTrophies / 130)), trophies: playerTrophies,
        x: sp.x, y: sp.y
      }));
      ent.spawnPoint = sp;
      ent.ai = makeAI(world, ent, Math.min(0.98, botSkill * 1.15)); // враги сильнее игрока
    });
  }

  const player = playerEnt;
  const kills = new Set();
  let boxesBroken = 0;
  let lastEventsLen = 0;

  // ===== API матча =====
  const match = {
    world, player, mode, map,
    running: true,
    paused: false,
    onEvent: onEvent || (() => {}),

    // ввод игрока (вызывает рендер/инпут)
    setMove(x, y) { if (player.alive) { player.moveX = x; player.moveY = y; } },
    aimAt(angle) { player.aim = angle; },
    attack(aimAngle) { return world.attack(player, aimAngle != null ? aimAngle : player.aim); },
    useSuper(aimAngle, targetPoint) { return world.useSuper(player, aimAngle != null ? aimAngle : player.aim, targetPoint); },

    // главный шаг (dt в секундах, клампим)
    step(dt) {
      if (!this.running || this.paused || world.result) {
        if (world.result && this.running) this.end();
        return;
      }
      const d = Math.max(0, Math.min(0.05, dt));
      try {
        for (const b of world.brawlers) if (b.ai) b.ai.tick(d);
        world.tick(d);
        // счётчики игрока
        trackPlayerEvents();
        if (world.result) this.end();
      } catch (e) {
        console.error('[match] tick error:', e);
        world.finish(false, 'ошибка: ' + e.message);
        this.end();
      }
    },

    end() {
      if (!this.running) return;
      this.running = false;
      const r = world.result || { win: false, reason: 'неизвестно', place: null };
      const res = {
        win: !!r.win,
        place: r.place,
        reason: r.reason,
        mode, mapName: map ? map.name : mapsForMode(mode.id)[0].name,
        brawlerId, kills: kills.size, boxes: boxesBroken,
        score: world.score[0], enemyScore: world.score[1],
        timeSec: Math.round(world.time),
        trophyDelta: gs ? trophyDelta(mode, playerTrophies, !!r.win, r.place) : 0
      };
      if (gs) {
        const rewards = grantBattleRewards(gs, res);
        res.rewards = rewards;
      }
      if (onEnd) onEnd(res);
      return res;
    }
  };

  function trackPlayerEvents() {
    // убийства игрока: враги, умершие от его пуль — упрощённо: считаем смерти врагов, произошедшие при его уроне
    for (const e of world.events) {
      if (e.type === 'death') {
        const dead = world.brawlers.find((b) => b.id === e.by);
        if (dead && dead.team !== 0 && !kills.has(dead.id)) kills.add(dead.id);
        if (dead && dead.team !== 0) match.onEvent({ type: 'kill', name: dead.name });
      }
      if (e.type === 'boxBreak') boxesBroken++;
    }
  }

  function findSkin(skinId, brawlerId) {
    return null; // скины подключаются в UI-слое через ECONOMY.skins
  }

  return match;
}

function pickDistinctBots(n, trophies) {
  // боты подбираются из пула с весом по трофеям
  const pool = BRAWLERS.filter((b) => b.rarity !== 'start' || ['colt', 'bull', 'nita', 'shelly'].includes(b.id));
  const picked = [];
  const used = new Set();
  let guard = 0;
  while (picked.length < n && guard++ < 100) {
    const i = Math.floor(Math.random() * pool.length);
    if (used.has(pool[i].id) && used.size < pool.length) continue;
    used.add(pool[i].id);
    picked.push(pool[i]);
  }
  return picked;
}
