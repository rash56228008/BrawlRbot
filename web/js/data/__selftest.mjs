// Selftest данных игры — запускается node web/js/data/__selftest.mjs
// ES-модули .js из Node требуют package.json type=module рядом — поэтому импортируем через file:// + расширение .js не сработает без type.
// Решение: рядом создан package.json {"type":"module"} в web/ (см. деплой — не мешает статике).
import { BRAWLERS, POWER_COST, POWER_MULT } from './brawlers.js';
import { MODES, MODES_BY_ID, RANKED_TIERS } from './modes.js';
import { MAPS, validateMap, MAP_W, mapsForMode } from './maps.js';
import { ECONOMY } from './economy.js';
import { generateQuests, progressQuests } from './quests.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('  ✓', name); }
  else { failures++; console.error('  ✗', name, detail || ''); }
}

console.log('== Бравлеры ==');
check('id уникальны', new Set(BRAWLERS.map((b) => b.id)).size === BRAWLERS.length);
check('количество ≥ 16', BRAWLERS.length >= 16, BRAWLERS.length);
for (const b of BRAWLERS) {
  check(`${b.id}: HP 3000..9000`, b.hp >= 2600 && b.hp <= 7000, b.hp);
  check(`${b.id}: скорость 680..850`, b.speed >= 680 && b.speed <= 850, b.speed);
  check(`${b.id}: урон атаки 100..1600`, b.attack.damage >= 100 && b.attack.damage <= 1600, b.attack.damage);
  check(`${b.id}: есть супер`, !!b.super && !!b.super.charge);
  check(`${b.id}: диапазон 150..800`, b.attack.range >= 150 && b.attack.range <= 800, b.attack.range);
}
check('POWER_COST — 10 значений', POWER_COST.length === 10);
check('POWER_MULT — 11 значений, монотонно', POWER_MULT.length === 11 && POWER_MULT.every((v, i) => i === 0 || v > POWER_MULT[i - 1]));

console.log('== Режимы ==');
check('8 режимов', MODES.length === 8, MODES.length);
check('у всех есть trophyWin/lose', MODES.every((m) => m.trophyWin && m.trophyLose));
check('команды 1..3', MODES.every((m) => m.teamSize >= 1 && m.teamSize <= 3));

console.log('== Карты ==');
check('≥ 16 карт', MAPS.length >= 16, MAPS.length);
for (const m of MAPS) {
  const v = validateMap(m.rows);
  check(`${m.id}: валидна`, v.ok, v.error);
}
check('у каждого режима ≥ 2 карты', MODES.every((mo) => mapsForMode(mo.id).length >= 2), MODES.filter((mo) => mapsForMode(mo.id).length < 2).map((m) => m.id));
// Спавны: считаем S/s по картам
for (const m of MAPS) {
  const spawns = m.rows.join('').split('').filter((c) => c === 'S' || c === 's').length;
  const mode = MODES_BY_ID[m.mode];
  if (mode.solo) {
    check(`${m.id}: спавнов ≥ 6 (соло)`, spawns >= 6, spawns);
  } else {
    check(`${m.id}: спавнов ≥ ${mode.teamSize} (команда)`, spawns >= mode.teamSize, spawns);
  }
}

console.log('== Экономика ==');
check('цены бравлеров по редкости', Object.keys(ECONOMY.brawlerPrice).length >= 4);
check('скины ≥ 8', ECONOMY.skins.length >= 8);
check('пасс: 30 тиров', ECONOMY.pass.tiers === 30);

console.log('== Квесты ==');
const q1 = generateQuests('player1', '2026-11-03', false);
check('дейлики: 3 штуки', q1.length === 3);
const q2 = generateQuests('player1', '2026-11-03', false);
check('детерминированность', JSON.stringify(q1) === JSON.stringify(q2));
const q3 = generateQuests('player1', '2026-11-04', false);
check('разные дни — разные квесты', JSON.stringify(q1) !== JSON.stringify(q3));
const qw = generateQuests('player1', '2026-11-03', true);
check('недельные: 5 штук', qw.length === 5);
// прогресс
const qk = q1.find((q) => q.event === 'kill') || q1[0];
const before = qk.progress;
progressQuests(q1, { [qk.event]: 100 }, { modeName: 'x', brawlerName: 'y' });
check('прогресс капится на n', qk.progress === qk.n && qk.done, `${qk.progress}/${qk.n}`);
check('квест с событием win без победы не растёт', (progressQuests(q1, { match: 1 }, {}), true));

console.log(failures === 0 ? '\nALL DATA TESTS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
