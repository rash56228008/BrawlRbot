// Экономика: валюты, цены, награды, магазин, бравл-пасс
export const ECONOMY = {
  // Награды за матч (базовые)
  coinsWin: 22, coinsLose: 8,
  xpWin: 12, xpLose: 5,
  tokenCost: 20,          // вход в трофейный бой стоит 20 жетонов... нет — жетоны на победы
  tokensPerWin: 20, tokensMax: 200, tokensRegenMin: 26, // 26 минут на жетон, максимум 200

  // Бравлеры в магазине (гемы) по редкости
  brawlerPrice: { rare: 30, super: 80, epic: 160, legend: 380 },

  // Скины: перекраски, продаются за гемы
  skins: [
    { id: 'shelly_star', brawler: 'shelly', name: 'Звёздная Шелли', price: 29, color: '#ffd23f', color2: '#fff0a0' },
    { id: 'colt_gold', brawler: 'colt', name: 'Золотой Кольт', price: 49, color: '#ffd23f', color2: '#fff0a0' },
    { id: 'bull_bandit', brawler: 'bull', name: 'Бандит Булл', price: 79, color: '#2f2f45', color2: '#7d7da8' },
    { id: 'nita_panda', brawler: 'nita', name: 'Панда Нита', price: 49, color: '#f5f5f5', color2: '#c8c8c8' },
    { id: 'primo_luchador', brawler: 'primo', name: 'Лучадор Примо', price: 29, color: '#e0a63f', color2: '#f7d492' },
    { id: 'poco_disco', brawler: 'poco', name: 'Диско Поко', price: 79, color: '#4dd2ff', color2: '#a9e6ff' },
    { id: 'dynamike_pro', brawler: 'dynamike', name: 'Про-майнер', price: 29, color: '#f29ec4', color2: '#fbd8e8' },
    { id: 'jessie_cowgirl', brawler: 'jessie', name: 'Ковбойша Джесси', price: 49, color: '#c2571f', color2: '#f0a56a' },
    { id: 'brock_pirate', brawler: 'brock', name: 'Пират Брок', price: 49, color: '#8a5a2b', color2: '#d1a56a' },
    { id: 'barley_bartender', brawler: 'barley', name: 'Бармен Барли', price: 29, color: '#f29ec4', color2: '#fbd8e8' }
  ],

  // Обмен гемов на монеты
  gemPacks: [
    { gems: 5, coins: 150 },
    { gems: 10, coins: 350 },
    { gems: 25, coins: 1000 }
  ],

  // Бравл-пасс
  pass: {
    season: 'Сезон 1: «Золотая жила»',
    premiumPrice: 169,         // гемы
    tiers: 30,
    xpPerTier: 150,
    freeReward: (tier) => (tier % 5 === 0 ? { gems: 10, label: '10 💎' } : { coins: 60 + tier * 6, label: `${60 + tier * 6} 🪙` }),
    premiumReward: (tier) => {
      if (tier === 30) return { gems: 80, label: '80 💎' };
      if (tier % 10 === 0) return { gems: 30, label: '30 💎' };
      if (tier % 3 === 0) return { gems: 15, label: '15 💎' };
      return { coins: 140 + tier * 8, label: `${140 + tier * 8} 🪙` };
    }
  },

  // Квесты (генерация в quests.js), награды здесь
  questRewardDaily: { xp: 40, coins: 70 },
  questRewardWeekly: { xp: 120, coins: 250, gems: 5 }
};
