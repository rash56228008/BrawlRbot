# Brawl Mini App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Telegram Mini App «Brawl» (@BrawlRbot): полноценная фан-игра в стиле Brawl Stars — бои, бравлеры, трофеи, магазин, бравл-пасс, квесты, клубы, лидерборды, редактор карт — с прогрессом в Telegram CloudStorage.

**Architecture:** Single-page canvas-игра (Vanilla JS, без фреймворков и билд-степа — быстрый запуск в WebView Telegram). Весь код в `web/`, бот-скрипт в `bot/`. Данные (бравлеры, режимы, баланс, карты) — в JSON-модулях. Сервера нет: прогресс хранится в `tg.CloudStorage` (+ localStorage fallback). Мультиплеер — Фаза 2; сейчас матчи против сильных ботов, онлайн-слои (клубы, друзья, лидерборды, лента игроков) — детерминированная симуляция активности на клиенте.

**Tech Stack:** Vanilla JS (ES-модули), Canvas 2D, Telegram WebApp SDK (`telegram-web-app.js`), Node.js-скрипт бота (pure HTTPS API, без библиотек), Vercel hosting, GitHub repo.

**Spec:** Согласование в чате 2026-11-03: «всё как в Brawl Stars»: режимы (трофейные, ранговые, особые, дружеские, сообщество), бравлеры, гемы/монеты, магазин, бравл-пасс, квесты, Баффи, друзья, клубы, лидерборды, данные боя, редактор карт, бот-оппоненты сильнее игроков, прогресс сохраняется, максимально похоже на оригинал. Нейтральное имя внутри игры («BRAWL») — Supercell IP. Бот @BrawlRbot, токен 9153148826:AAE3raM45eo8-DBcmqWCTL1TvVpSjoDel5A.

## Global Constraints

- Название внутри игры: «BRAWL» (нейтральное), бот отображается как «Brawl Stars» — решено в чате.
- Без билд-степа и npm-зависимостей для веб-части: только vanilla ES-модули, CDN только `telegram-web-app.js`.
- Игра обязана работать вне Telegram (в обычном браузере) для отладки: `window.Telegram?.WebApp` опционален, fallback на localStorage.
- Все русские тексты в UI; орфографическая корректность.
- Прогресс: единый `GameState`, сериализация версионирована (`v: 1`), сохранение debounced (1 c) в CloudStorage.
- Токен бота не попадает в публичный репозиторий: `bot/token.txt` в `.gitignore`, локальный файл + переменная окружения `BOT_TOKEN` при деплое.
- Canvas: фиксированный игровой мир 1200×720, масштабирование под DPR и размер вьюпорта.
- Боты: уровень сложности выше среднего игрока (aim-опережение, приоритет целей, сбор кубов), но растут по трофеям игрока.

## Review Focus

- Слабое устройство/WebView: долгий кадр не должен ронять луп — `requestAnimationFrame` с catch и dt-clamp (макс 50 мс).
- Выход из боя до конца (кнопка «назад»): должен сохранять прогресс матча и не подвешивать UI.
- Покупка при нехватке валюты: кнопки неактивны/тост «недостаточно гемов», отрицательный баланс невозможен (инвариант в экономике).
- Сохранение при сворачивании мини-аппа: `visibilitychange` + Telegram `viewportChanged`/`backButton` — сохранение до ухода.
- Пустой CloudStorage/первый запуск: дефолтный `GameState` без краша, онбординг-туториал.

---

### Task 1: Скелет проекта, bot-скрипт, привязка Mini App

**Files:**
- Create: `web/index.html`, `web/css/base.css`, `web/js/main.js`, `web/js/telegram.js`
- Create: `bot/bot.mjs`, `bot/README.md`, `.gitignore`
- Test: `node bot/bot.mjs --check` (self-check: getMe валиден, setMenuButton проходит)

**Interfaces:**
- Produces: `tgInit(): { webApp, isTelegram, initDataUnsafe, cloudGet(key), cloudSet(key, value) }` в `web/js/telegram.js` — используют все модули.
- Produces: `web/index.html` грузит `main.js` как модуль; точка входа `main.js` рендерит экран «Загрузка…».

- [ ] **Step 1: Каркас `web/`** — index.html с meta viewport, `telegram-web-app.js` (CDN), тёмная тема, экран загрузки; `main.js` вызывает `tgInit()` и пишет в консоль статус платформы.
- [ ] **Step 2: Bot-скрипт `bot/bot.mjs`** — pure fetch к Bot API: `getMe`, установка команды `/start`, `setChatMenuButton` (web_app с URL из `MINIAPP_URL` env или аргумента), обработка `update` (ответ на /start — кнопка WebApp). Ключ читается из env `BOT_TOKEN` или `bot/token.txt`. `--check`-режим: выполняет getMe и печатает JSON, код 0.
- [ ] **Step 3: Проверка** — `node bot/bot.mjs --check` выводит `{"ok":true,... "username":"BrawlRbot"}`; в браузере `web/index.html` открывается без ошибок консоли (проверить через `python -m http.server`).
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: project skeleton, telegram init, bot script"`.

### Task 2: Данные игры — бравлеры, режимы, баланс, карты

**Files:**
- Create: `web/js/data/brawlers.js`, `web/js/data/modes.js`, `web/js/data/maps.js`, `web/js/data/economy.js`, `web/js/data/quests.js`
- Test: `web/js/data/__selftest.mjs` (запуск `node web/js/data/__selftest.mjs`)

**Interfaces:**
- Produces: `BRAWLERS: Brawler[]` — `{ id, name, rarity, class, hp, speed, attack: { name, type, damage, range, reload, count, spread }, super: { name, desc, type, value, charge } }`.
- Produces: `MODES: Mode[]` — `{ id, name, icon, teamSize, trophyWin, trophyLose, goal, desc }`, `ECONOMY` — цены/награды, `MAPS` — сетки карт (строки, `#` стена, `.` куст, `B` ящик, `S` спавн).
- 16 бравлеров: Shelly, Colt, Bull, Nita, El Primo, Poco, Dynamike, 8 стартовый+8 открываемых, 3 редкости.

- [ ] **Step 1: Selftest-скрипт** — `node web/js/data/__selftest.mjs` проверяет: уникальность id, HP в [3000..9000], все карты содержат `S`-спавны по числу игроков режима, у каждого режима есть ≥3 карт. Сначала падает (файлов нет).
- [ ] **Step 2: Наполнить данные** — 16 бравлеров с разными классами (танк/стрелок/снайпер/поддержка/метатель), 8 режимов (Столкновение, Награда за поимку, Броулбол, Ограбление, Осада ос, Дуэль, Изи... «Столкновение», «Дуэль», «Броулбол», «Награда за поимку», «Ограбление», «Осада», «Крутящийся бублик», «Битва в волейболе»), 24+ карт.
- [ ] **Step 3: Прогнать selftest** — PASS.
- [ ] **Step 4: Commit.**

### Task 3: GameState, экономика и сохранение

**Files:**
- Create: `web/js/state/gamestate.js`, `web/js/state/economy.js`
- Test: `web/js/state/__selftest.mjs`

**Interfaces:**
- Produces: `newGameState(): GameState`, `serialize(gs)`, `deserialize(raw): GameState` (валидация/дефолты), `grantBattleRewards(gs, matchResult)`.
- `GameState: { v, player: { id, name, avatar, trophies, coins, gems, xp, level }, brawlers: { [id]: { unlocked, trophies, power, tokens } }, quests, brawlPass, club, friends, settings, stats, mapEdits }`.
- Инварианты экономики: монеты/гемы ≥ 0, трофеи бравлера ≥ 0, power ∈ [1..11] — `deserialize` чинит нарушения.

- [ ] **Step 1: Selftest** — тесты: grantBattleRewards(победа) повышает трофеи/монеты; deserialize мусора → дефолт; deserialize с отрицательными гемами → кламп к 0; unlock бравлера списывает цену.
- [ ] **Step 2: Реализация + автосохранение** (debounce 1 c, `cloudSet('brawl_save', ...)` + localStorage).
- [ ] **Step 3: PASS selftest, Commit.**

### Task 4: Игровой движок боя (Canvas)

**Files:**
- Create: `web/js/game/engine.js`, `web/js/game/entities.js`, `web/js/game/ai.js`, `web/js/game/render.js`, `web/js/game/input.js`, `web/js/game/match.js`
- Test: `web/js/game/__selftest.mjs` (headless-симуляция боя с ботовскими командами с обеих сторон)

**Interfaces:**
- Consumes: `BRAWLERS`, `MODES`, `MAPS`, `newGameState`, `grantBattleRewards`.
- Produces: `startMatch({ mode, map, brawlerId, gs, onEnd(result) })`; внутри: `World { tick(dt), entities, bullets, boxes, bushes, walls }`, `Entity { x, y, hp, speed, attack() }`.
- AI: состояния преследование/отступление/сбор кубов/атака с упреждением; агрессия масштабируется от трофеев игрока.

- [ ] **Step 1: Headless selftest** — симуляция 3v3 без рендера: матч завершается ≤ 60 игровых секунд, есть победитель, кубы из ящиков поднимают HP/урон, супер заряжается. Падает — файлов нет.
- [ ] **Step 2: engine/entities/match** — коллизии круг-с-сеткой, пули, ящики (3000 HP, дроп 1 куб), кусты (невидимость для AI и миникарта-туман), супер-заряд от нанесённого урона, респавн по режиму, счёт режима.
- [ ] **Step 3: ai.js** — 3 уровня: фарм ящиков → дуэль → hold точку; упреждение прицела `lead = dist / bulletSpeed`; бот лечится отступлением при HP < 35%.
- [ ] **Step 4: PASS selftest, Commit.**
- [ ] **Step 5: render.js + input.js** — Canvas-рендер: тайлы, спрайты бравлеров (процедурные, цвет+класс), HP-бары, джойстик слева, кнопка атаки/супера справа, автоаим при тапе. Проверка: матч играбелен в браузере.
- [ ] **Step 6: Commit.**

### Task 5: Мета-UI: главное меню, выбор бравлера, магазин, пас, квесты

**Files:**
- Create: `web/css/ui.css`, `web/js/ui/menu.js`, `web/js/ui/shop.js`, `web/js/ui/brawlers.js`, `web/js/ui/pass.js`, `web/js/ui/quests.js`, `web/js/ui/common.js`
- Test: ручной прогон в браузере + консольная проверка инвариантов (`__uiSelftest()` в console)

**Interfaces:**
- Consumes: GameState API, `BRAWLERS`, `ECONOMY`.
- Produces: `showScreen(name)` — роутер экранов; тосты `toast(msg)`; модалки `modal({ title, body, buttons })`.

- [ ] **Step 1: роутер и общие компоненты** — экраны: Меню (карточки режимов, валюта сверху, навбар: Магазин/Бравлеры/Квесты/Клуб/Лидеры/Друзья/Пас/Карты/Настройки).
- [ ] **Step 2: Магазин** — ежедневные офферы (детерминированные от даты), скины (перекраски), бравлеры в ротации, обмен гемов на монеты. Инвариант: покупка невозможна при нехватке валюты.
- [ ] **Step 3: Бравлеры** — сетка карточек с редкостью, трофеями, апгрейдом power за монеты (9 уровней), выбор в бой.
- [ ] **Step 4: Бравл-пасс** — трек 30 ячеек, XP-награды за квесты, премиум-ряд за гемы, сезонный сброс.
- [ ] **Step 5: Квесты** — дневные (сброс 24 ч) + недельные, прогресс по событиям боя, кнопка «забрать».
- [ ] **Step 6: `__uiSelftest()`** — программно: попытка купить без денег → тост, баланс не изменился; апгрейд → power+1. Commit.

### Task 6: Социальные слои: клубы, друзья, лидерборды, онлайн-симуляция

**Files:**
- Create: `web/js/ui/social.js`, `web/js/sim/online.js`
- Test: `web/js/sim/__selftest.mjs`

**Interfaces:**
- Produces: `getOnline(): { players: SimPlayer[], clubs: SimClub[], leaderboard: SimPlayer[] }` — детерминированный генератор от даты+id игрока (seed), активность меняется каждые 5 минут.

- [ ] **Step 1: Selftest** — одинаковый seed → одинаковые лидерборды; разные дни → разные топы; клуб генерирует чат-ленту событий.
- [ ] **Step 2: Реализация + UI** — список клубов с поиском, «вступить», чат клуба (симулированные сообщения + свои), друзья (онлайн-статусы,邀请 кнопка «Пригласить в матч» → глубокая ссылка на бота), лидерборды (глобальный/по бравлерам) с честной позицией игрока из его трофеев.
- [ ] **Step 3: PASS, Commit.**

### Task 7: Редактор карт и «сообщество»

**Files:**
- Create: `web/js/ui/editor.js`
- Test: ручной + `__editorSelftest()`

**Interfaces:**
- Consumes: `MAPS`-формат строк.
- Produces: сохранение пользовательских карт в `gs.mapEdits` (лимит 10), шаринг: карта кодируется в строку base36 и вставляется в чат клуба.

- [ ] **Step 1: Сетка-редактор** — палитра (стена/куст/ящик/пусто/спавн), валидация (спавны ≥ players), превью мини-карты, сохранение.
- [ ] **Step 2: Selftest** — создание карты через API редактора → валидна → можно запустить матч. Commit.

### Task 8: Баффи, настройки, данные боя, финальная полировка

**Files:**
- Create: `web/js/ui/buffqi.js`, `web/js/ui/settings.js`, `web/js/ui/battlelog.js`
- Modify: `web/js/main.js`

**Interfaces:**
- Consumes: все UI-модули.

- [ ] **Step 1: Баффи** — помощник с подсказками и мемными репликами, контекстные советы новичку (первый бой, первый бравлер и т. д.).
- [ ] **Step 2: Настройки** — звук (WebAudio, вкл/выкл), джойстик (размер/статик-динамик), язык-заглушка, сброс прогресса (с подтверждением через модалку).
- [ ] **Step 3: Данные боя** — лог последних 20 матчей: режим, бравлер, счёт, трофеи ± .
- [ ] **Step 4: Звук** — WebAudio: выстрелы/попадания/победа; процедурные (осцилляторы), без файлов. Commit.

### Task 9: Деплой: Vercel, привязка Mini App, финальная проверка

**Files:**
- Create: `vercel.json`, `README.md`, `bot/deploy.md`
- Modify: `bot/bot.mjs` (финальный URL)

**Interfaces:**
- Consumes: всё.

- [ ] **Step 1: `vercel.json`** — статика `web/` + заголовки CSP для CDN Telegram.
- [ ] **Step 2: Деплой** — `vercel` CLI (auth через `gh`-токен flow, иначе токен в env), URL вида `*.vercel.app`; в `vercel.json` — clean URLs.
- [ ] **Step 3: Привязка** — `node bot/bot.mjs https://<url>` — setChatMenuButton + сообщение /start с кнопкой. Проверить кнопкой бота: мини-апп открывается на проде.
- [ ] **Step 4: Дым-тест на проде** — полный путь: /start → открытие → бой с ботами → трофеи начислены → перезаход сохранил прогресс. Commit + push на GitHub (без токена).

## Notes

- Токен бота: в `bot/token.txt` (gitignored) уже сейчас, в прод-переменных при деплое.
- Vercel требует своей авторизации — использую device-code flow CLI; если не выйдет — запасной вариант: GitHub Pages (push через `gh`, он уже авторизован).
- Все selftest-скрипты запускаются `node <path>` без зависимостей.
