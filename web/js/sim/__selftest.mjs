// Selftest онлайн-симуляции — node web/js/sim/__selftest.mjs
import { getOnline } from './online.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ✓', name);
  else { failures++; console.error('  ✗', name, detail !== undefined ? detail : ''); }
}

console.log('== детерминированность ==');
const a = getOnline('p1', 500);
const b = getOnline('p1', 500);
check('одинаковый слот -> одинаковый лидерборд', JSON.stringify(a.leaderboard.map((p) => p.name)) === JSON.stringify(b.leaderboard.map((p) => p.name)));
check('клубы стабильны', JSON.stringify(a.clubs.map((c) => c.name)) === JSON.stringify(b.clubs.map((c) => c.name)));

console.log('== структура ==');
check('лидерборд: 100 игроков', a.leaderboard.length === 100);
check('лидерборд отсортирован', a.leaderboard.every((p, i) => i === 0 || a.leaderboard[i - 1].trophies >= p.trophies));
check('у топа трофеев больше нуля', a.leaderboard[0].trophies > 0);
check('клубов 12', a.clubs.length === 12);
check('у клубов есть члены', a.clubs.every((c) => c.memberList.length > 0));
check('друзья: 10', a.friends.length === 10);
check('чат: 12 сообщений', a.chat.length === 12);
check('чат отсортирован по времени', a.chat.every((m, i) => i === 0 || a.chat[i - 1].t >= m.t));

console.log('== зависимость от игрока ==');
const c = getOnline('p2', 500);
check('другой id -> другие друзья', JSON.stringify(a.friends.map((f) => f.name)) !== JSON.stringify(c.friends.map((f) => f.name)));
const d = getOnline('p1', 200);
check('меньше трофеев -> ниже топ-1', d.leaderboard[0].trophies < a.leaderboard[0].trophies);

console.log(failures === 0 ? '\nALL SIM TESTS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
