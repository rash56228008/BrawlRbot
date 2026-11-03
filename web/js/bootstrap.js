// Bootstrap: загрузка сохранения, навигация, склейка всех экранов
import { newGameState, deserialize, regenTokens, makeSaver } from './state/gamestate.js';
import { MODES, MODES_BY_ID } from './data/modes.js';
import { mapsForMode } from './data/maps.js';
import { showScreen, clearScreens, toast } from './ui/common.js';
import { showMenu } from './ui/menu.js';
import { showBattle } from './ui/battle.js';
import { showBrawlers } from './ui/brawlers.js';
import { showShop } from './ui/shop.js';
import { showPass } from './ui/pass.js';
import { showQuests, refreshQuests } from './ui/quests.js';
import { showClubs, showFriends, showLeaderboards } from './ui/social.js';
import { showEditor } from './ui/editor.js';
import { showSettings, showBattleLog } from './ui/settings.js';
import { showMore } from './ui/more.js';
import { attachBuffqi } from './ui/buffqi.js';
import { setSoundEnabled, SFX } from './sound.js';

export async function start(tg) {
  // ==== Загрузка сохранения ====
  let raw = await tg.cloudGet('brawl_save');
  let localRaw = null;
  try { localRaw = localStorage.getItem('brawl_save'); } catch (e) {}
  // приоритет: более «богатое» сохранение
  let gs = null;
  for (const candidate of [raw, localRaw]) {
    const parsed = deserialize(candidate);
    if (parsed && (!gs || score(parsed) > score(gs))) gs = parsed;
  }
  if (!gs) {
    const name = (tg.user && (tg.user.first_name || tg.user.username)) || 'Боец';
    const key = tg.user ? 'tg' + tg.user.id : 'local';
    gs = newGameState(name, key);
  }
  gs.player.name = (tg.user && tg.user.first_name) || gs.player.name;
  regenTokens(gs);
  refreshQuests(gs);

  const saver = makeSaver(tg, gs);
  saver.schedule();
  setSoundEnabled(gs.settings.sound);

  // ==== Навигация ====
  let menuHandle = null;
  let buffqi = null;

  function goMenu() {
    clearScreens();
    tg.hideBack();
    menuHandle = showMenu({ tg, gs, saver, onPlay, onNav });
    if (!buffqi) buffqi = attachBuffqi({ gs, onChange: () => saver.schedule() });
  }

  function onNav(target) {
    if (target === 'menu') { goMenu(); return; }
    if (target === 'social') { showClubs({ tg, gs, saver, onBack: goMenu }); return; }
    if (target === 'more') { showMore({ tg, gs, saver, onBack: goMenu, onNav }); return; }
    if (target === 'shop') { showShop({ gs, saver, onBack: goMenu }); return; }
    if (target === 'brawlers') { showBrawlers({ gs, saver, onBack: goMenu }); return; }
    // из «Ещё»
    if (target === 'quests') { showQuests({ gs, saver, onBack: goMenu }); return; }
    if (target === 'pass') { showPass({ gs, saver, onBack: goMenu }); return; }
    if (target === 'friends') { showFriends({ tg, gs, saver, onBack: goMenu }); return; }
    if (target === 'leaderboards') { showLeaderboards({ gs, onBack: goMenu }); return; }
    if (target === 'editor') {
      showEditor({ gs, saver, onBack: goMenu, onPlayMap: (opts) => playCustom(opts) });
      return;
    }
    if (target === 'log') { showBattleLog({ gs, onBack: goMenu }); return; }
    if (target === 'settings') { showSettings({ tg, gs, saver, onBack: goMenu }); return; }
  }

  function onPlay({ mode, map, ranked }) {
    playMatch({ mode, map, ranked });
  }

  function playCustom({ mode, map }) {
    playMatch({ mode, map, ranked: false, custom: true });
  }

  function playMatch({ mode, map, ranked, custom }) {
    if (buffqi) { buffqi.destroy(); buffqi = null; }
    tg.hideBack();
    const before = { trophies: gs.player.trophies, rank: gs.player.rank, coins: gs.player.coins, passXp: gs.quests.passXp };
    showBattle({
      tg, gs, mode, map,
      onExit: () => {
        // после боя: начислить ранг/XP, показать меню
        const after = gs.player;
        if (ranked) {
          // дельта уже начислена через grantBattleRewards? Нет — ранг отдельно:
        }
        saver.saveNow();
        goMenu();
        // звук победы/поражения уже в бою
      },
      onSave: () => saver.saveNow()
    });
  }

  // ==== Первый вход: онбординг ====
  goMenu();

  // Загрузка завершена
  const loading = document.getElementById('loading');
  if (loading) loading.classList.remove('active');
  console.log('[BRAWL] готов. Игрок:', gs.player.name, 'трофеи:', gs.player.trophies);
}

function score(gs) {
  return (gs.player.trophies || 0) * 10 + (gs.stats?.matches || 0) + Object.keys(gs.brawlers || {}).length;
}
