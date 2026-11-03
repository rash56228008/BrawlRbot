// Бравлеры — данные и баланс (16 персонажей, 3 класса редкости на старте)
export const RARITY_ORDER = ['start', 'rare', 'super', 'epic', 'legend'];
export const RARITY_LABEL = {
  start: 'Стартовый',
  rare: 'Редкий',
  super: 'Супер',
  epic: 'Эпический',
  legend: 'Легендарный'
};
export const RARITY_COLOR = {
  start: '#b8c3cf',
  rare: '#4dd2ff',
  super: '#b44dff',
  epic: '#ff4d6d',
  legend: '#ffd23f'
};

// Классы поведения атаки: shotgun (веер), burst (очередь), single, throw (дугой через стены), heal (поддержка)
export const BRAWLERS = [
  {
    id: 'shelly', name: 'Шелли', rarity: 'start', class: 'Боец',
    color: '#e8534a', color2: '#ffb3ab',
    hp: 3800, speed: 720,
    attack: { name: 'Дробовик', type: 'shotgun', damage: 300, count: 5, spread: 0.55, range: 466, reload: 1.5 },
    super: { name: 'Супер-дробовик', type: 'shotgun', damage: 480, count: 9, spread: 0.7, range: 520, charge: 3800, effect: 'knockback', desc: 'Отбрасывает врагов и ломает стены.' },
    desc: 'Классика дробовика: шквал пуль вблизи.'
  },
  {
    id: 'colt', name: 'Кольт', rarity: 'start', class: 'Стрелок',
    color: '#3f8cff', color2: '#a9ccff',
    hp: 2800, speed: 720,
    attack: { name: 'Шестизарядник', type: 'burst', damage: 420, count: 6, spread: 0.06, range: 560, reload: 1.6 },
    super: { name: 'Шквал пуль', type: 'burst', damage: 480, count: 12, spread: 0.05, range: 640, charge: 3600, effect: 'breakWalls', desc: 'Длинная очередь, ломает укрытия.' },
    desc: 'Дальняя очередь пуль — держ дистанцию.'
  },
  {
    id: 'bull', name: 'Булл', rarity: 'start', class: 'Танк',
    color: '#8a5a2b', color2: '#d1a56a',
    hp: 6300, speed: 800,
    attack: { name: 'Двустволка', type: 'shotgun', damage: 400, count: 5, spread: 0.5, range: 360, reload: 1.4 },
    super: { name: 'Рывок', type: 'dash', damage: 0, charge: 3200, effect: 'dash', range: 450, desc: 'Рывок, сносящий стены и врагов.' },
    desc: 'Танк-бык: врывается и ломает стены.'
  },
  {
    id: 'nita', name: 'Нита', rarity: 'start', class: 'Боец',
    color: '#57b26b', color2: '#a8e6b3',
    hp: 3800, speed: 720,
    attack: { name: 'Ударная волна', type: 'wave', damage: 880, range: 520, reload: 1.35, width: 90 },
    super: { name: 'Медведь!', type: 'summon', damage: 640, charge: 3400, effect: 'bear', summonHp: 3600, summonDamage: 640, desc: 'Вызывает медведя-союзника.' },
    desc: 'Волна пробивает ряды, супер зовёт медведя.'
  },
  {
    id: 'primo', name: 'Эль Примо', rarity: 'start', class: 'Танк',
    color: '#4d3b8f', color2: '#9c8ae0',
    hp: 6800, speed: 780,
    attack: { name: 'Серия ударов', type: 'melee', damage: 360, count: 4, range: 190, reload: 0.9, spread: 0.25 },
    super: { name: 'Прыжок с небес', type: 'jump', damage: 1000, charge: 3000, effect: 'jump', range: 420, desc: 'Прыжок с уроном по площади.' },
    desc: 'Кулаки и прыжок на голову врагам.'
  },
  {
    id: 'poco', name: 'Поко', rarity: 'start', class: 'Поддержка',
    color: '#d94f9e', color2: '#f2a2cf',
    hp: 3600, speed: 720,
    attack: { name: 'Звуковая волна', type: 'wave', damage: 700, range: 560, reload: 1.5, width: 130 },
    super: { name: 'Исцеляющая песнь', type: 'heal', value: 1400, charge: 3000, effect: 'healTeam', range: 600, desc: 'Лечит всю команду рядом.' },
    desc: 'Волны бьют врагов, супер лечит команду.'
  },
  {
    id: 'dynamike', name: 'Динамайк', rarity: 'start', class: 'Метатель',
    color: '#e0a63f', color2: '#f7d492',
    hp: 2800, speed: 720,
    attack: { name: 'Динамит', type: 'throw', damage: 900, count: 2, range: 480, reload: 1.25, spread: 0.35, fuse: 0.9 },
    super: { name: 'Большая шашка', type: 'throw', damage: 2000, range: 520, charge: 2600, effect: 'breakWalls', fuse: 1.0, desc: 'Огромный взрыв, рушит стены.' },
    desc: 'Динамит через стены, супер рушит укрытия.'
  },
  {
    id: 'jessie', name: 'Джесси', rarity: 'start', class: 'Стрелок',
    color: '#59c1e8', color2: '#aee1f2',
    hp: 3200, speed: 720,
    attack: { name: 'Шок-разряд', type: 'bounce', damage: 640, range: 500, reload: 1.4, bounces: 2, bounceFall: 0.7 },
    super: { name: 'Турель Скрэппи', type: 'summon', damage: 520, charge: 3200, effect: 'turret', summonHp: 2600, summonDamage: 520, desc: 'Ставит стреляющую турель.' },
    desc: 'Разряд скачет между врагами, турель держит точку.'
  },

  {
    id: 'brock', name: 'Брок', rarity: 'rare', class: 'Снайпер',
    color: '#c2571f', color2: '#f0a56a',
    hp: 2800, speed: 720,
    attack: { name: 'Ракета', type: 'single', damage: 1500, range: 700, reload: 1.7 },
    super: { name: 'Ракетный дождь', type: 'barrage', damage: 800, count: 9, range: 620, charge: 2800, effect: 'breakWalls', desc: 'Залп ракет по площади.' },
    desc: 'Одна ракета — один большой бум.'
  },
  {
    id: 'barley', name: 'Барли', rarity: 'rare', class: 'Метатель',
    color: '#7ac74f', color2: '#c4e89a',
    hp: 2600, speed: 720,
    attack: { name: 'Бутылка', type: 'throw', damage: 620, range: 480, reload: 1.1, fuse: 0.7, aoe: 90, dot: 400 },
    super: { name: 'Последний заказ', type: 'throw', damage: 600, count: 5, range: 520, charge: 2400, effect: 'aoe', aoe: 90, fuse: 0.8, desc: 'Пять бутылок по области.' },
    desc: 'Лужи кислоты от бутылок, супер — зал половины карты.'
  },
  {
    id: 'rico', name: 'Рико', rarity: 'super', class: 'Стрелок',
    color: '#4dd2ff', color2: '#a9e6ff',
    hp: 2800, speed: 720,
    attack: { name: 'Отскок', type: 'burst', damage: 380, count: 5, spread: 0.05, range: 560, reload: 1.5, ricochet: true },
    super: { name: 'Трассирующие', type: 'burst', damage: 460, count: 12, spread: 0.05, range: 640, charge: 3400, ricochet: true, effect: 'breakWalls', desc: 'Очередь, пробивающая стены.' },
    desc: 'Пули отскакивают от стен и бьют из-за укрытий.'
  },
  {
    id: 'spike', name: 'Спайк', rarity: 'legend', class: 'Стрелок',
    color: '#8ee04a', color2: '#d6f5a8',
    hp: 2800, speed: 720,
    attack: { name: 'Кактусовая граната', type: 'burst', damage: 420, count: 6, spread: 0.5, range: 520, reload: 1.4, spikeBurst: true },
    super: { name: 'Шипастое поле', type: 'field', damage: 800, range: 500, charge: 2600, effect: 'slowField', desc: 'Поле, замедляющее врагов.' },
    desc: 'Граната разлетается шипами во все стороны.'
  },
  {
    id: 'crow', name: 'Кроу', rarity: 'legend', class: 'Ассасин',
    color: '#7a4dd2', color2: '#b89ef5',
    hp: 3200, speed: 820,
    attack: { name: 'Отравленные клинки', type: 'shotgun', damage: 320, count: 3, spread: 0.35, range: 480, reload: 1.3, dot: 320 },
    super: { name: 'Пикирование', type: 'dash', damage: 640, charge: 3000, effect: 'dash', range: 500, desc: 'Рывок с ядом.' },
    desc: 'Яд не даёт врагам лечиться, рывок — вход и выход.'
  },
  {
    id: 'piper', name: 'Пайпер', rarity: 'epic', class: 'Снайпер',
    color: '#f29ec4', color2: '#fbd8e8',
    hp: 2600, speed: 720,
    attack: { name: 'Дальний выстрел', type: 'single', damage: 300, range: 760, reload: 1.6, scaling: 2.6 },
    super: { name: 'Отскок-бомба', type: 'jump', damage: 900, charge: 3000, effect: 'jump', range: 460, desc: 'Отпрыгивает, оставляя бомбу.' },
    desc: 'Чем дальше — тем больнее. Снайпер королевских кровей.'
  },
  {
    id: 'pam', name: 'Пэм', rarity: 'epic', class: 'Поддержка',
    color: '#e8954a', color2: '#f7cba0',
    hp: 4800, speed: 720,
    attack: { name: 'Веер гаек', type: 'shotgun', damage: 260, count: 9, spread: 0.7, range: 500, reload: 1.5 },
    super: { name: 'Лечебная башня', type: 'summon', damage: 0, charge: 3200, effect: 'healTower', summonHp: 2400, healArea: 220, healRate: 300, desc: 'Башня, лечащая союзников.' },
    desc: 'Облако гаек и станция лечения для команды.'
  },
  {
    id: 'mortis', name: 'Мортис', rarity: 'epic', class: 'Ассасин',
    color: '#2f2f45', color2: '#7d7da8',
    hp: 3800, speed: 820,
    attack: { name: 'Лопата', type: 'dash', damage: 1000, range: 260, reload: 1.6, effect: 'dash' },
    super: { name: 'Летучие мыши', type: 'wave', damage: 1000, range: 480, charge: 2800, width: 100, effect: 'healOnHit', value: 400, desc: 'Стая мышей, лечит при попадании.' },
    desc: 'Каждая атака — рывок лопатой вперёд.'
  }
];

export const BRAWLERS_BY_ID = Object.fromEntries(BRAWLERS.map((b) => [b.id, b]));

// Множители HP/урона по уровню силы 1..11 (индекс = power-1)
export const POWER_MULT = [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0];

// Цена апгрейда силы в монетах по текущему уровню (1..10 -> 2..11)
export const POWER_COST = [20, 35, 75, 140, 290, 480, 800, 1250, 1875, 2800];
