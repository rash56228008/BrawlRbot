// Детерминированная симуляция онлайн-слоя: игроки, клубы, лидерборды, чат
// Выглядит и обновляется как настоящий онлайн, но генерируется из seed (дата + id игрока).

const FIRST = ['Алекс', 'Мия', 'Дэн', 'Кира', 'Влад', 'Юля', 'Макс', 'Ника', 'Олег', 'Лиза', 'Тимур', 'Соня', 'Дима', 'Рита', 'Кирилл', 'Вика', 'Артём', 'Полина', 'Егор', 'Алиса', 'Глеб', 'Даша', 'Марк', 'Вера'];
const SECOND = ['Pro', 'XD', '228', 'TTV', 'Top', 'King', 'Master', '2010', 'GOD', '_bs', 'Play', 'Win'];
const CLUB_WORDS = ['Титаны', 'Викинги', 'Легенда', 'Драконы', 'Феникс', 'Бравл Пуля', 'Кибер Волки', 'Ночные Совы', 'Красные Бароны', 'Золотая Орда', 'Северный Ветер', 'Стальная Гвардия'];
const CLUB_TAGS = ['TIT', 'VIK', 'LEG', 'DRG', 'PHX', 'BUL', 'WLF', 'OWL', 'RBN', 'GOLD', 'NRD', 'SGD'];
const CHAT_LINES = [
  'го дружеский',
  'кто в клубный?',
  'кто на стакане?',
  'срульный кайф',
  'имба режим сегодня',
  'го 3н3, нужен ещё один',
  'кто бравл пас купил?',
  'я на 700+ трофеях, качаюсь',
  'топ-1 в клубе, кто догонит?',
  'го пушить в дуэли',
  'у кого сколько кубков?',
  'новый скин — огонь',
  'кикните его, он афк',
  'вечером катка, все к 20:00',
  'го катку на 5 побед подряд'
];

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 5-минутные "тики" активности
function slotKey() {
  return Math.floor(Date.now() / (5 * 60000));
}

function makePlayer(rng, i, trophyCap) {
  const name = FIRST[Math.floor(rng() * FIRST.length)] + (rng() < 0.5 ? SECOND[Math.floor(rng() * SECOND.length)] : '');
  const trophies = Math.floor(20 + rng() * trophyCap);
  return {
    id: 'p' + i,
    name,
    trophies,
    online: rng() < 0.45,
    level: 1 + Math.floor(Math.sqrt(trophies / 4)),
    brawlers: 4 + Math.floor(rng() * 12)
  };
}

export function getOnline(playerId, playerTrophies) {
  const slot = slotKey();
  const seedBase = hashStr(playerId + '|' + slot);

  // лидерборд: 100 игроков, топы от ~playerTrophies * 2.5
  const rngLb = mulberry32(seedBase);
  const cap = Math.max(1200, playerTrophies * 2.6);
  const leaderboard = [];
  for (let i = 0; i < 100; i++) {
    const p = makePlayer(rngLb, i, cap);
    p.trophies = Math.floor(cap * (1 - i * 0.009) - rngLb() * 40);
    leaderboard.push(p);
  }
  leaderboard.sort((a, b) => b.trophies - a.trophies);

  // клубы: 12 клубов
  const rngC = mulberry32(seedBase + 7);
  const clubs = [];
  for (let i = 0; i < CLUB_WORDS.length; i++) {
    const members = 5 + Math.floor(rngC() * 25);
    const rngM = mulberry32(seedBase + 31 + i);
    const memberList = [];
    for (let j = 0; j < Math.min(8, members); j++) memberList.push(makePlayer(rngM, i * 50 + j, Math.max(300, playerTrophies * 1.8)));
    clubs.push({
      id: 'c' + i,
      name: CLUB_WORDS[i],
      tag: CLUB_TAGS[i],
      trophies: Math.floor(8000 + rngC() * 42000),
      members,
      memberList,
      requirement: Math.floor(rngC() * Math.max(100, playerTrophies))
    });
  }

  // друзья: 8-12 «добавленных» по activity-среде
  const rngF = mulberry32(seedBase + 99);
  const friends = [];
  for (let i = 0; i < 10; i++) {
    friends.push(makePlayer(rngF, 500 + i, Math.max(200, playerTrophies * 1.4)));
  }

  // чат клуба: 12 последних сообщений
  const rngCh = mulberry32(seedBase + 123);
  const chat = [];
  const now = Date.now();
  for (let i = 0; i < 12; i++) {
    const author = makePlayer(rngCh, 900 + i, 800);
    chat.unshift({
      author: author.name,
      text: CHAT_LINES[Math.floor(rngCh() * CHAT_LINES.length)],
      t: now - Math.floor(rngCh() * 3 * 3600000)
    });
  }
  chat.sort((a, b) => b.t - a.t);

  return { leaderboard, clubs, friends, chat, slot };
}
