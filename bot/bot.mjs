#!/usr/bin/env node
// Бот @BrawlRbot — pure Telegram Bot API, без зависимостей.
// Токен: env BOT_TOKEN или файл bot/token.txt (рядом со скриптом).
// Режимы:
//   node bot.mjs --check                 — проверить токен (getMe)
//   node bot.mjs https://<miniapp-url>   — привязать Mini App (setChatMenuButton) и запустить polling
//   node bot.mjs                         — запустить polling (URL берётся из env MINIAPP_URL)

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function getToken() {
  if (process.env.BOT_TOKEN) return process.env.BOT_TOKEN;
  const p = join(SCRIPT_DIR, 'token.txt');
  if (existsSync(p)) return readFileSync(p, 'utf8').trim();
  throw new Error('Токен не найден: задай BOT_TOKEN или создай bot/token.txt');
}

function getMiniappUrl() {
  const arg = process.argv.find((a) => a.startsWith('http'));
  if (arg) return arg;
  if (process.env.MINIAPP_URL) return process.env.MINIAPP_URL;
  return null;
}

async function api(token, method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method} -> ${res.status}: ${JSON.stringify(json.description || json)}`);
  return json.result;
}

const MENU_TEXT =
  '⚔️ <b>BRAWL</b> — арена прямо в Telegram!\n\n' +
  '🥊 Бои 3 на 3 и соло-столкновение\n' +
  '🏆 Трофеи, ранговые бои и бравл-пасс\n' +
  '🛒 Магазин, скины, новые бравлеры\n' +
  '👥 Клубы, друзья и списки лидеров\n\n' +
  'Жми кнопку ниже и в бой!';

async function main() {
  const token = getToken();
  const checkOnly = process.argv.includes('--check');

  const me = await api(token, 'getMe');
  console.log('[bot] getMe ok:', JSON.stringify({ username: me.username, name: me.first_name }));

  if (checkOnly) {
    console.log('[bot] --check пройден');
    return;
  }

  const url = getMiniappUrl();
  if (url) {
    await api(token, 'setChatMenuButton', {
      menu_button: { type: 'web_app', text: '⚔️ ИГРАТЬ', web_app: { url } }
    });
    console.log('[bot] menu button ->', url);
  }

  await api(token, 'setMyCommands', {
    commands: [{ command: 'start', description: 'Открыть игру' }]
  });

  // Long polling
  let offset = 0;
  console.log('[bot] polling запущен…');
  for (;;) {
    try {
      const updates = await api(token, 'getUpdates', { offset, timeout: 25, allowed_updates: ['message'] });
      for (const u of updates) {
        offset = u.update_id + 1;
        if (u.message && u.message.text && u.message.text.startsWith('/start')) {
          const btn = url
            ? { text: '⚔️ ИГРАТЬ', web_app: { url } }
            : { text: '⚔️ ИГРАТЬ', login_url: { url: 'https://t.me/' + me.username } };
          await api(token, 'sendMessage', {
            chat_id: u.message.chat.id,
            text: MENU_TEXT,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [[btn]] }
          });
          console.log('[bot] /start ->', u.message.chat.id);
        }
      }
    } catch (e) {
      console.error('[bot] polling error:', e.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

main().catch((e) => { console.error('[bot] fatal:', e); process.exit(1); });
