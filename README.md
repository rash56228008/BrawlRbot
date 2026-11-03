# BRAWL — Telegram Mini App (@BrawlRbot)

Фан-игра в стиле Brawl Stars внутри Telegram Mini App.

## Структура

- `web/` — мини-приложение (vanilla JS, Canvas 2D, ES-модули, без сборки)
  - `js/data/` — бравлеры, режимы, карты, экономика, квесты
  - `js/state/` — GameState, сохранение (Telegram CloudStorage + localStorage)
  - `js/game/` — движок боя: сущности, мир, AI, матч, рендер, управление
  - `js/ui/` — экраны: меню, магазин, бравлеры, пас, квесты, клубы, лидерборды, редактор карт
  - `js/sim/` — детерминированная симуляция онлайн-слоя (клубы, друзья, топы)
- `bot/bot.mjs` — скрипт бота (pure Telegram Bot API, без зависимостей)
- `docs/superpowers/plans/` — план реализации

## Разработка

```bash
cd web && python -m http.server 8901   # локальный запуск
node web/js/data/__selftest.mjs        # тесты данных
node web/js/state/__selftest.mjs       # тесты состояния
node web/js/game/__selftest.mjs        # headless-тесты боёв
node web/js/sim/__selftest.mjs         # тесты онлайн-симуляции
node bot/bot.mjs --check               # проверка токена бота
node bot/bot.mjs https://<url>         # привязать Mini App и запустить бота
```

## Деплой

- Vercel: статика из `web/` (см. `vercel.json`)
- Токен бота хранится в `bot/token.txt` (gitignored) или env `BOT_TOKEN`

## Приписка

Фан-проект, не связан с Supercell. «Brawl Stars» — торговая марка Supercell.
