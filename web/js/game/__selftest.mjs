// Headless selftest боя — node web/js/game/__selftest.mjs
// Симулируем матчи без рендера: все участники — боты.
import { World } from './engine.js';
import { BrawlerEntity } from './entities.js';
import { makeAI } from './ai.js';
import { MODES_BY_ID } from '../data/modes.js';
import { mapsForMode } from '../data/maps.js';
import { BRAWLERS, BRAWLERS_BY_ID } from '../data/brawlers.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ✓', name);
  else { failures++; console.error('  ✗', name, detail !== undefined ? detail : ''); }
}

// Матч полностью на ботах с обеих сторон
function simulateMatch(modeId, opts = {}) {
  const mode = MODES_BY_ID[modeId];
  const map = mapsForMode(modeId)[0];
  const world = new World(map.rows, mode, Math.random);
  const spawns = world.spawns.solo.length ? world.spawns.solo : world.spawns.team;

  const n = mode.solo ? 6 : 6;
  for (let i = 0; i < n; i++) {
    const def = BRAWLERS[i % BRAWLERS.length];
    const team = mode.solo ? i : (i % 2);
    const sp = spawns[i % spawns.length];
    const ent = world.addBrawler(new BrawlerEntity({
      def, team, isPlayer: false, name: 'bot' + i, power: 5,
      x: sp.x, y: sp.y
    }));
    ent.spawnPoint = sp;
    ent.ai = makeAI(world, ent, 0.8);
  }

  const dt = 1 / 30;
  let steps = 0;
  while (!world.result && steps < 60 * 90) { // максимум 90 «секунд»
    for (const b of world.brawlers) if (b.ai) b.ai.tick(dt);
    world.tick(dt);
    steps++;
  }
  return { world, simSeconds: steps * dt };
}

// ====== основная симуляция по режимам ======
for (const modeId of ['gem', 'showdown', 'brawlball', 'bounty', 'heist', 'duel', 'hotzone', 'knockout']) {
  console.log(`== режим ${modeId} ==`);
  let done = false, win = null, secs = 0;
  try {
    const { world, simSeconds } = simulateMatch(modeId);
    done = !!world.result;
    win = world.result && world.result.win;
    secs = simSeconds;
    check('матч завершился', done, world.result ? '' : 'не завершился за 90 c');
    check('время ≤ 240 c', world.time <= 240.5, world.time.toFixed(1));
    if (modeId === 'showdown') {
      check('есть место игрока/победитель', world.result && world.result.place != null);
    }
    if (['knockout', 'duel'].includes(modeId)) {
      check('логика выбивания сработала', done && /выбита|время/.test(world.result.reason || ''), world.result && world.result.reason);
    }
  } catch (e) {
    check('нет исключения', false, e.message);
  }
}

// ====== механики ======
console.log('== механики ==');
{
  // ящики -> кубы -> усиление
  const mode = MODES_BY_ID.showdown;
  const map = mapsForMode('showdown')[0];
  const world = new World(map.rows, mode, Math.random);
  const b = world.addBrawler(new BrawlerEntity({ def: BRAWLERS_BY_ID.shelly, team: 0, isPlayer: true, name: 'p', x: 200, y: 200, power: 1 }));
  const box = world.boxes[0];
  const hpBefore = box.hp;
  const dmg = 3000;
  box.hp -= dmg;
  world.tick(1 / 30);
  check('ящик разрушен -> куб выпал', world.boxes.length === map.rows.join('').split('').filter(c => c === 'B').length - 1 || world.cubes.length >= 1, `cubes=${world.cubes.length}`);
  if (world.cubes.length) {
    const cube = world.cubes[0];
    cube.x = b.x; cube.y = b.y; // подсунули под игрока
    const cubesBefore = b.cubes;
    world.tick(1 / 30);
    check('куб подобран', b.cubes === cubesBefore + 1, `${b.cubes}`);
    check('куб усиливает', b.cubeMult() > 1);
  }
}

{
  // супер заряжается от урона
  const mode = MODES_BY_ID.gem;
  const map = mapsForMode('gem')[0];
  const world = new World(map.rows, mode, Math.random);
  const a = world.addBrawler(new BrawlerEntity({ def: BRAWLERS_BY_ID.shelly, team: 0, isPlayer: false, name: 'a', x: 200, y: 200, power: 1 }));
  const t = world.addBrawler(new BrawlerEntity({ def: BRAWLERS_BY_ID.bull, team: 1, isPlayer: false, name: 't', x: 300, y: 200, power: 1 }));
  t.takeDamage(1000, a);
  check('супер заряжается от урона', a.superCharge === 1000, a.superCharge);
  t.takeDamage(5000, a);
  check('супер не превышает заряд', a.superCharge <= a.sup.charge, a.superCharge);
  const ok = world.useSuper(a, 0, { x: t.x, y: t.y });
  check('супер срабатывает при полном заряде', ok === true || a.superCharge >= a.sup.charge);
  check('после супера заряд сброшен', a.superCharge === 0, a.superCharge);
}

{
  // кусты скрывают, стены блокируют
  const mode = MODES_BY_ID.showdown;
  const map = mapsForMode('showdown')[0];
  const world = new World(map.rows, mode, Math.random);
  const ent = world.brawlers; // пусто
  check('мир создан без бравлеров', world.brawlers.length === 0);
  const w2 = world.isWallAt(0, 0);
  check('угол = стена', w2 === true);
  // пуля в стену умирает
  const b = world.addBrawler(new BrawlerEntity({ def: BRAWLERS_BY_ID.colt, team: 0, isPlayer: false, name: 's', x: 200, y: 200, power: 1 }));
  world.attack(b, 0); // вправо — упрётся в стену или границу
  const before = world.bullets.length;
  for (let i = 0; i < 100; i++) world.tick(1 / 30);
  check('пули исчезают со временем', world.bullets.length < before, `${world.bullets.length}`);
}

{
  // респавн в командных режимах
  const mode = MODES_BY_ID.gem;
  const map = mapsForMode('gem')[0];
  const world = new World(map.rows, mode, Math.random);
  const b = world.addBrawler(new BrawlerEntity({ def: BRAWLERS_BY_ID.shelly, team: 0, isPlayer: true, name: 'p', x: world.spawns.team[0].x, y: world.spawns.team[0].y, power: 1 }));
  b.spawnPoint = world.spawns.team[0];
  b.hp = 0;
  world.tick(1 / 30);
  check('смерть обработана', b.alive === false);
  check('таймер респавна установлен', b.respawnTimer > 0, b.respawnTimer);
  for (let i = 0; i < 200; i++) world.tick(1 / 30);
  check('респавн через N секунд', b.alive === true);
}

console.log(failures === 0 ? '\nALL ENGINE TESTS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
