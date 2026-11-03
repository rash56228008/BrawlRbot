// Точка входа BRAWL
import { tgInit } from './telegram.js';

const tg = tgInit();
console.log('[BRAWL] platform:', tg.isTelegram ? (tg.webApp.platform || 'telegram') : 'browser');
if (tg.user) console.log('[BRAWL] user:', tg.user.first_name, tg.user.id);

// Прогресс загрузки — до прихода реальных модулей
const fill = document.getElementById('loadingFill');
let p = 0;
const t = setInterval(() => {
  p = Math.min(90, p + 12);
  fill.style.width = p + '%';
}, 120);

import('./bootstrap.js').then((boot) => {
  clearInterval(t);
  fill.style.width = '100%';
  boot.start(tg).catch((e) => {
    console.error('[BRAWL] bootstrap failed:', e);
    document.getElementById('loadingHint').textContent = 'Ошибка загрузки: ' + e.message;
  });
}, (e) => {
  clearInterval(t);
  console.error('[BRAWW] module load failed:', e);
  document.getElementById('loadingHint').textContent = 'Не удалось загрузить игру';
});
