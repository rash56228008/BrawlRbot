// Selftest GameState — node web/js/state/__selftest.mjs
import { newGameState, deserialize, grantBattleRewards, trophyDelta, unlockBrawler, upgradePower, canAfford, spend, weekKey } from './gamestate.js';
import { MODES_BY_ID, MODES } from '../data/modes.js';
import { ECONOMY } from '../data/economy.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ✓', name);
  else { failures++; console.error('  ✗', name, detail !== undefined ? detail : ''); }
}

const gem = MODES_BY_ID.gem;
const sd = MODES_BY_ID.showdown;

console.log('== newGameState ==');
const gs = newGameState('Тест', 'p1');
check('стартовые значения', gs.player.trophies === 0 && gs.player.coins === 100 && gs.player.gems === 30);
check('Шелли открыта', gs.brawlers.shelly.unlocked === true);
check('выбран shelly', gs.selected === 'shelly');
check('дейлики сгенерированы', Array.isArray(gs.quests.daily) && gs.quests.daily.length === 3);
check('недельные сгенерированы', Array.isArray(gs.quests.weekly) && gs.quests.weekly.length === 5);

console.log('== deserialize: мусор и инварианты ==');
check('null -> null', deserialize(null) === null);
check('строка-мусор -> null', deserialize('abc{') === null);
check('{} -> null', deserialize({}) === null);
const bad = deserialize({ v: 1, player: { trophies: -50, coins: -100, gems: 999999999, level: 0, tokens: 100000 } });
check('отрицательные трофеи -> 0', bad && bad.player.trophies === 0);
check('отрицательные монеты -> 0', bad && bad.player.coins === 0);
check('гемы клампятся', bad && bad.player.gems <= 100000);
check('level минимум 1', bad && bad.player.level === 1);
check('жетоны клампятся к max', bad && bad.player.tokens === ECONOMY.tokensMax);
const bad2 = deserialize({ v: 1, player: {}, brawlers: { shelly: { unlocked: true, trophies: -10, power: 99 } } });
check('трофеи бравлера ≥ 0', bad2 && bad2.brawlers.shelly.trophies === 0);
check('power ≤ 11', bad2 && bad2.brawlers.shelly.power === 11);
const bad3 = deserialize({ v: 1, player: {}, brawlers: {}, selected: 'nonexistent' });
check('выбор сбрасывается на shelly', bad3 && bad3.selected === 'shelly' && bad3.brawlers.shelly.unlocked);
const bad4 = deserialize({ v: 1, player: {}, brawlers: { fakedude: { unlocked: true, trophies: 100 } } });
check('неизвестный бравлер удаляется', bad4 && !bad4.brawlers.fakedude);
// roundtrip
const rt = deserialize(JSON.stringify(gs));
check('roundtrip сохраняет данные', rt && rt.player.coins === gs.player.coins && rt.selected === gs.selected);

console.log('== trophyDelta ==');
check('победа при 0 трофеев = максимум', trophyDelta(gem, 0, true) === gem.trophyWin[0]);
check('поражение при 700 трофеев ниже', trophyDelta(gem, 700, false) < 0);
check('победа при 700 трофеев = trophyWin[7]', trophyDelta(gem, 700, true) === gem.trophyWin[7]);
check('соло 1 место = победа', trophyDelta(sd, 0, true, 1) === sd.trophyWin[0]);
check('соло 8 место = минус', trophyDelta(sd, 0, false, 8) === sd.trophyLose[7]);

console.log('== grantBattleRewards ==');
const gs2 = newGameState('Т', 'p1');
const r = grantBattleRewards(gs2, {
  mode: gem, mapName: 'Тест', brawlerId: 'shelly', win: true,
  kills: 5, boxes: 2, score: 2, enemyScore: 1, timeSec: 120
});
check('трофеи начислены', r.trophies > 0, r.trophies);
check('монеты за победу', r.coins === ECONOMY.coinsWin);
check('xp за победу', r.xp === ECONOMY.xpWin);
check('игрок получил трофеи', gs2.player.trophies === r.trophies);
check('stats.matches = 1', gs2.stats.matches === 1);
check('stats.wins = 1', gs2.stats.wins === 1);
check('stats.kills = 5', gs2.stats.kills === 5);
check('лог боя записан', gs2.battleLog.length === 1 && gs2.battleLog[0].result === 'win');
check('квесты тронуты (win/match события)', typeof r.quests === 'boolean');
check('первый бой отмечен', gs2.tutorials.firstBattle === true);

// проигрыш не уводит в минус
const gs3 = newGameState('Т', 'p1');
for (let i = 0; i < 5; i++) {
  grantBattleRewards(gs3, { mode: gem, mapName: 'x', brawlerId: 'shelly', win: false, kills: 0, boxes: 0, score: 0, enemyScore: 2, timeSec: 60 });
}
check('после 5 поражений трофеи = 0', gs3.player.trophies === 0 && gs3.brawlers.shelly.trophies === 0);

console.log('== экономика ==');
const gs4 = newGameState('Т', 'p1');
gs4.player.gems = 1000; gs4.player.coins = 5000;
check('canAfford при достатке', canAfford(gs4, { coins: 100, gems: 50 }));
check('canAfford при нехватке монет', !canAfford(gs4, { coins: 99999 }));
check('spend списывает', spend(gs4, { coins: 100, gems: 50 }) && gs4.player.coins === 4900 && gs4.player.gems === 950);
check('spend отказ при нехватке', !spend(gs4, { gems: 99999 }) && gs4.player.gems === 950);
check('unlockBrawler: rare за 30 гемов', unlockBrawler(gs4, 'brock') === true && gs4.player.gems === 920 && gs4.brawlers.brock.unlocked);
check('unlockBrawler: повторно нельзя', unlockBrawler(gs4, 'brock') === false);
check('unlockBrawler: стартового нельзя', unlockBrawler(gs4, 'colt') === false);
check('upgradePower: 1->2 за 20 монет', upgradePower(gs4, 'brock') === true && gs4.brawlers.brock.power === 2 && gs4.player.coins === 4880);
gs4.player.coins = 0;
check('upgradePower без монет отказ', upgradePower(gs4, 'brock') === false && gs4.brawlers.brock.power === 2);

console.log('== weekKey ==');
check('понедельник одной недели совпадает', weekKey(new Date('2026-11-02')) === weekKey(new Date('2026-11-05')));
check('разные недели различаются', weekKey(new Date('2026-11-02')) !== weekKey(new Date('2026-11-09')));

console.log(failures === 0 ? '\nALL STATE TESTS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
