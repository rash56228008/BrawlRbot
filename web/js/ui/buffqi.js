// Баффи — помощник в меню
import { toast } from './common.js';

const LINES = {
  intro: [
    'Привет! Я Баффи — твой проводник на арене! 🐝',
    'Победы дают трофеи, трофеи открывают новых бравлеров. Вперёд!'
  ],
  firstBattle: [
    'Первый бой?! Держи совет: стой за стенами и бей из укрытий!',
    'Супер заряжается от нанесённого урона — не забывай его тратить!'
  ],
  lowTrophies: [
    'Не сдавайся! Ящики с кубами силы дают преимущество в Столкновении!',
    'Апгрейдь силу бравлера в разделе «Бравлеры» — так победы легче!'
  ],
  midTrophies: [
    'Ты на ходу! Попробуй ранговые бои за серьёзные награды!',
    'Совет: держи дистанцию снайпером и пускай кубы силы в кусты!'
  ],
  highTrophies: [
    'Ты машина! Может, клуб создашь? В клубах кататься веселее!',
    'Тыкни квесты — там бесплатные награды за то, что ты и так делаешь!'
  ],
  questsReady: [
    'У тебя незабранные квесты! Забери награды, пока не сбросились!'
  ],
  noCoins: [
    'Монеты кончились? Гемы можно обменять в магазине! 💎→🪙'
  ],
  jokes: [
    'Знаешь, почему я жёлтый? Потому что я — победа в чистом виде!',
    'Мортис однажды выкопал мой куб силы. Мы больше не общаемся.',
    'Бравл Пас — это как конфеты, только полезные!',
    'Шелли + куст = сюрприз для врага. Проверено мной!',
    'Клубы — это сила! Я тоже хочу в клуб, но я бужу',
    'Если проиграл — это просто разведка боем!'
  ]
};

let lastLine = -1;

export function buffqiMessage(gs, context) {
  const t = gs.player.trophies;
  let pool;
  if (context === 'questsReady') pool = LINES.questsReady;
  else if (context === 'noCoins') pool = LINES.noCoins;
  else if (!gs.tutorials.firstBattle) pool = LINES.firstBattle;
  else if (t < 100) pool = LINES.lowTrophies;
  else if (t < 500) pool = LINES.midTrophies;
  else if (t >= 500) pool = LINES.highTrophies;
  else pool = LINES.jokes;
  // смешиваем с шутками
  if (Math.random() < 0.3) pool = LINES.jokes;
  let i = Math.floor(Math.random() * pool.length);
  if (i === lastLine && pool.length > 1) i = (i + 1) % pool.length;
  lastLine = i;
  return pool[i];
}

export function attachBuffqi({ gs, onChange }) {
  let btn = document.querySelector('.buffqi-btn');
  if (btn) btn.remove();
  btn = document.createElement('button');
  btn.className = 'buffqi-btn';
  btn.textContent = '🐝';
  btn.title = 'Баффи';
  let bubble = null;
  let bubbleTimer = null;

  function showBubble(msg) {
    if (bubble) bubble.remove();
    bubble = document.createElement('div');
    bubble.className = 'buffqi-bubble';
    bubble.textContent = msg;
    document.getElementById('app').appendChild(bubble);
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => { if (bubble) bubble.remove(); }, 6000);
  }

  btn.addEventListener('click', () => {
    const unclaimed = [...gs.quests.daily, ...gs.quests.weekly].filter((q) => q.done && !q.claimed).length;
    let ctx = null;
    if (unclaimed > 0) ctx = 'questsReady';
    else if (gs.player.coins < 20) ctx = 'noCoins';
    showBubble(buffqiMessage(gs, ctx));
    onChange && onChange();
  });

  document.getElementById('app').appendChild(btn);
  // первое знакомство
  setTimeout(() => {
    if (!gs.seenNews) {
      showBubble(buffqiMessage(gs, 'intro'));
      gs.seenNews = true;
      onChange && onChange();
    }
  }, 1200);

  return { destroy() { btn.remove(); if (bubble) bubble.remove(); } };
}
