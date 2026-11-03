// Режимы игры
export const MODES = [
  {
    id: 'gem', name: 'Захват гемов', icon: '💎',
    teamSize: 3, respawn: 3,
    goal: 'Собери 10 гемов и продержись 15 секунд',
    trophyWin: [8, 7, 6, 5, 4, 3, 2, 1], trophyLose: [-2, -3, -4, -5, -6, -7, -8, -9],
    desc: 'Гемы появляются в центре. Держи 10 — и не умирай.'
  },
  {
    id: 'showdown', name: 'Столкновение', icon: '💀',
    teamSize: 1, respawn: 0, solo: true,
    goal: 'Останься последним',
    trophyWin: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1], trophyLose: [-3, -4, -5, -6, -7, -8, -9, -10, -11, -12],
    desc: 'Каждый сам за себя. Ящики с кубами силы решают.'
  },
  {
    id: 'brawlball', name: 'Броулбол', icon: '⚽',
    teamSize: 3, respawn: 3,
    goal: 'Забей 2 гола',
    trophyWin: [8, 7, 6, 5, 4, 3, 2, 1], trophyLose: [-2, -3, -4, -5, -6, -7, -8, -9],
    desc: 'Мяч в центре. Два гола — победа.'
  },
  {
    id: 'bounty', name: 'Награда за поимку', icon: '⭐',
    teamSize: 3, respawn: 4,
    goal: 'Собери больше звёзд',
    trophyWin: [8, 7, 6, 5, 4, 3, 2, 1], trophyLose: [-2, -3, -4, -5, -6, -7, -8, -9],
    desc: 'Звёзды за убийства. Смерть дорогого стоит.'
  },
  {
    id: 'heist', name: 'Ограбление', icon: '💰',
    teamSize: 3, respawn: 5,
    goal: 'Разрушь сейф врага',
    trophyWin: [8, 7, 6, 5, 4, 3, 2, 1], trophyLose: [-2, -3, -4, -5, -6, -7, -8, -9],
    desc: 'Сейфы с двух сторон. Ломай чужой, защити свой.'
  },
  {
    id: 'duel', name: 'Дуэль', icon: '⚔️',
    teamSize: 1, respawn: 0, solo: true,
    goal: 'Победи 3 бравлеров врага по очереди',
    trophyWin: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1], trophyLose: [-3, -4, -5, -6, -7, -8, -9, -10, -11, -12],
    desc: 'Один на один, до последнего бравлера.'
  },
  {
    id: 'hotzone', name: 'Горячая зона', icon: '🔥',
    teamSize: 3, respawn: 4,
    goal: 'Захвати зону 100%',
    trophyWin: [8, 7, 6, 5, 4, 3, 2, 1], trophyLose: [-2, -3, -4, -5, -6, -7, -8, -9],
    desc: 'Стой в зоне дольше врагов. 100% — победа.'
  },
  {
    id: 'knockout', name: 'Выбивание', icon: '🎯',
    teamSize: 3, respawn: 0,
    goal: 'Выбей всю команду врага',
    trophyWin: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1], trophyLose: [-2, -3, -4, -5, -6, -7, -8, -9],
    desc: 'Без респавна. Каждый выстрел на счету.'
  }
];

export const MODES_BY_ID = Object.fromEntries(MODES.map((m) => [m.id, m]));

// Вне трофейной лестницы: ранговые, особые и дружеские бои (для UI-слоёв)
export const RANKED_TIERS = [
  { id: 1, name: 'Бронза I', from: 0, to: 49 },
  { id: 2, name: 'Бронза II', from: 50, to: 99 },
  { id: 3, name: 'Бронза III', from: 100, to: 199 },
  { id: 4, name: 'Серебро I', from: 200, to: 299 },
  { id: 5, name: 'Серебро II', from: 300, to: 399 },
  { id: 6, name: 'Серебро III', from: 400, to: 599 },
  { id: 7, name: 'Золото I', from: 600, to: 799 },
  { id: 8, name: 'Золото II', from: 800, to: 999 },
  { id: 9, name: 'Золото III', from: 1000, to: 1299 },
  { id: 10, name: 'Миф', from: 1300, to: 1699 },
  { id: 11, name: 'Мастер', from: 1700, to: 2199 },
  { id: 12, name: 'Чемпион', from: 2200, to: 99999 }
];
