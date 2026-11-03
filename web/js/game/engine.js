// Ядро боя: мир, коллизии, тик, режимные механики
import { TILE, MAP_W, MAP_H } from '../data/maps.js';
import { Bullet, Box, Cube, Pet, Gem, Safe, Ball, nextId } from './entities.js';

export const WALL = 1, BUSH = 2, EMPTY = 0, WATER = 3;

export class World {
  constructor(mapRows, mode, rng = Math.random) {
    this.mode = mode;
    this.rng = rng;
    this.w = MAP_W * TILE;
    this.h = MAP_H * TILE;
    this.grid = new Uint8Array(MAP_W * MAP_H);

    this.brawlers = [];
    this.bullets = [];
    this.boxes = [];
    this.cubes = [];
    this.pets = [];
    this.gems = [];
    this.safes = [];
    this.ball = null;
    this.spawns = { team: [], solo: [] };
    this.time = 0;
    this.events = [];               // для звука/UI
    this.zones = [];                // горячие зоны { x, y, r, progress }
    this.slowFields = [];           // { x, y, r, until }
    this.gemTimer = 0;
    this.score = [0, 0];            // счёт по режиму
    this.result = null;             // финал { win, place, reason }
    this.tickCount = 0;

    this.parse(mapRows);
  }

  parse(rows) {
    this.mapRows = rows;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const ch = rows[y] ? rows[y][x] : ' ';
        let v = EMPTY;
        if (ch === '#') v = WALL;
        else if (ch === '.') v = BUSH;
        else if (ch === 'W') v = WATER;
        this.grid[y * MAP_W + x] = v;
      }
    }
    // объекты по символам
    this.objCells = [];
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const ch = rows[y] ? rows[y][x] : ' ';
        const px = x * TILE + TILE / 2, py = y * TILE + TILE / 2;
        if (ch === 'B') this.boxes.push(new Box(px, py));
        else if (ch === 'S') this.spawns.team.push({ x: px, y: py });
        else if (ch === 's') this.spawns.solo.push({ x: px, y: py });
        else if (ch === 'X') this.safes.push(new Safe(px, py, x < MAP_W / 2 ? 0 : 1));
        else if (ch === 'F') this.objCells.push({ type: 'F', x: px, y: py });
        else if (ch === 'G') this.objCells.push({ type: 'G', x: px, y: py });
        else if (ch === 'Z') this.objCells.push({ type: 'Z', x: px, y: py });
      }
    }
    if (this.mode.id === 'brawlball') {
      const f = this.objCells.find((c) => c.type === 'F');
      if (f) this.ball = new Ball(f.x, f.y);
      this.goals = [
        { x: 1.5 * TILE, y: this.h / 2, team: 1 },   // ворота слева (защищает команда 1)
        { x: this.w - 1.5 * TILE, y: this.h / 2, team: 0 }
      ];
    }
    if (this.mode.id === 'hotzone') {
      const zs = this.objCells.filter((c) => c.type === 'Z');
      // группируем смежные в зоны
      this.zones = groupZones(zs, TILE);
    }
    if (this.mode.id === 'gem') {
      const gs = this.objCells.filter((c) => c.type === 'G');
      if (gs.length) {
        this.gemSpawn = { x: avg(gs.map((g) => g.x)), y: avg(gs.map((g) => g.y)) };
      }
    }
  }

  cellAt(px, py) {
    const x = Math.floor(px / TILE), y = Math.floor(py / TILE);
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return WALL;
    return this.grid[y * MAP_W + x];
  }

  isWallAt(px, py) { const c = this.cellAt(px, py); return c === WALL; }
  isBushAt(px, py) { return this.cellAt(px, py) === BUSH; }

  // Если центр сущности оказался внутри стены (прыжок/рывок/выталкивание) — выносим к ближайшей свободной клетке
  unstick(e) {
    if (!this.isWallAt(e.x, e.y)) return false;
    const cx = Math.floor(e.x / TILE), cy = Math.floor(e.y / TILE);
    for (let rad = 1; rad <= 6; rad++) {
      for (let dy = -rad; dy <= rad; dy++) {
        for (let dx = -rad; dx <= rad; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
          if (this.grid[ny * MAP_W + nx] !== WALL) {
            e.x = nx * TILE + TILE / 2;
            e.y = ny * TILE + TILE / 2;
            return true;
          }
        }
      }
    }
    e.x = this.w / 2; e.y = this.h / 2;
    return true;
  }

  // Коллизия круга со стенами: выталкивание по осям
  collideWalls(e) {
    const r = e.r || 14;
    // проверяем клетки вокруг
    const minX = Math.floor((e.x - r) / TILE), maxX = Math.floor((e.x + r) / TILE);
    const minY = Math.floor((e.y - r) / TILE), maxY = Math.floor((e.y + r) / TILE);
    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        if (cx < 0 || cy < 0 || cx >= MAP_W || cy >= MAP_H) continue;
        if (this.grid[cy * MAP_W + cx] !== WALL) continue;
        // AABB круга
        const bx = cx * TILE, by = cy * TILE;
        const nx = Math.max(bx, Math.min(e.x, bx + TILE));
        const ny = Math.max(by, Math.min(e.y, by + TILE));
        const dx = e.x - nx, dy = e.y - ny;
        const dist = Math.hypot(dx, dy);
        if (dist < r && dist > 0.0001) {
          e.x += (dx / dist) * (r - dist);
          e.y += (dy / dist) * (r - dist);
        }
      }
    }
    // границы мира
    e.x = Math.max(r, Math.min(this.w - r, e.x));
    e.y = Math.max(r, Math.min(this.h - r, e.y));
  }

  breakWallAt(px, py) {
    const x = Math.floor(px / TILE), y = Math.floor(py / TILE);
    if (x <= 0 || y <= 0 || x >= MAP_W - 1 || y >= MAP_H - 1) return false;
    if (this.grid[y * MAP_W + x] === WALL) {
      this.grid[y * MAP_W + x] = EMPTY;
      this.events.push({ type: 'wallBreak', x, y });
      return true;
    }
    return false;
  }

  addBrawler(ent) {
    this.brawlers.push(ent);
    ent.worldBounds = { w: this.w, h: this.h };
    ent.onRespawn = (b) => this.placeRespawn(b);
    return ent;
  }

  placeRespawn(b) {
    const spawn = b.spawnPoint;
    if (spawn) { b.x = spawn.x; b.y = spawn.y; }
  }

  // Атака бравлера: порождает пули по типу атаки
  attack(b, aimAngle) {
    if (!b.alive || b.ammo <= 0 || b.attackCooldown > 0 || b.dashTime > 0) return false;
    const a = b.atk;
    const dmg = b.damageValue();
    const x0 = b.x + Math.cos(aimAngle) * 22;
    const y0 = b.y + Math.sin(aimAngle) * 22;
    b.ammo--;
    b.attackCooldown = 0.25;

    const mk = (extra) => this.bullets.push(new Bullet(Object.assign({
      owner: b, x: x0, y: y0, angle: aimAngle, damage: dmg, range: a.range
    }, extra)));

    switch (a.type) {
      case 'shotgun': case 'burst': {
        const n = a.count || 3;
        const spread = a.spread || 0.4;
        for (let i = 0; i < n; i++) {
          const off = n === 1 ? 0 : (i / (n - 1) - 0.5) * spread;
          mk({ angle: aimAngle + off, ricochet: !!a.ricochet, dot: a.dot || 0, speed: a.type === 'shotgun' ? 640 : 700 });
        }
        break;
      }
      case 'single': {
        mk({ speed: 620, ricochet: false, scaling: a.scaling });
        break;
      }
      case 'wave': {
        mk({ type: 'wave', speed: 480, width: a.width || 100, dot: a.dot || 0, ricochet: false });
        break;
      }
      case 'throw': {
        const n = a.count || 1;
        const spread = a.spread || 0;
        for (let i = 0; i < n; i++) {
          const off = n === 1 ? 0 : (i / (n - 1) - 0.5) * spread;
          const ang = aimAngle + off;
          // бросок: летит до 90% дальности и взрывается
          const dist = a.range * (0.9 + this.rng() * 0.15);
          mk({ type: 'throw', angle: ang, speed: dist / (a.fuse || 0.8), range: dist, aoe: a.aoe || 70, dot: a.dot || 0 });
        }
        break;
      }
      case 'melee': {
        // ближняя серия — быстрые короткие пули
        const n = a.count || 4;
        for (let i = 0; i < n; i++) {
          const off = (i / Math.max(1, n - 1) - 0.5) * (a.spread || 0.2);
          mk({ angle: aimAngle + off, speed: 900, range: a.range, dot: a.dot || 0 });
        }
        break;
      }
      case 'bounce': {
        mk({ speed: 660, bouncesLeft: a.bounces || 2, dot: a.dot || 0 });
        break;
      }
      case 'dash': {
        // атака Мортиса — рывок с уроном по пути
        b.dashTime = a.range / b.speed;
        b.dashSpeed = b.speed * 1.6;
        b.dashDir = aimAngle;
        mk({ type: 'wave', speed: b.speed * 1.6, width: 40, damage: dmg, range: a.range, dot: a.dot || 0 });
        break;
      }
      case 'heal': {
        // Поко: атака — волна урона врагам
        mk({ type: 'wave', speed: 460, width: a.width || 130 });
        break;
      }
      default: mk({});
    }
    this.events.push({ type: 'attack', by: b.id, attackType: a.type });
    return true;
  }

  // Супер
  useSuper(b, aimAngle, targetPoint = null) {
    if (!b.alive || b.superCharge < b.sup.charge) return false;
    b.superCharge = 0;
    const s = b.sup;
    const dmgMult = (1 + (b.power - 1) * 0.1) * b.cubeMult();
    const x0 = b.x, y0 = b.y;
    this.events.push({ type: 'super', by: b.id, super: s.name });

    switch (s.type) {
      case 'shotgun': case 'burst': {
        const n = s.count || 6;
        for (let i = 0; i < n; i++) {
          const off = n === 1 ? 0 : (i / (n - 1) - 0.5) * (s.spread || 0.5);
          this.bullets.push(new Bullet({
            owner: b, x: x0, y: y0, angle: aimAngle + off, speed: 700,
            damage: Math.round(s.damage * dmgMult), range: s.range, breakWalls: true, ricochet: !!s.ricochet, knockback: s.effect === 'knockback' ? 120 : 0
          }));
        }
        break;
      }
      case 'dash': {
        b.dashTime = s.range / (b.speed * 1.8);
        b.dashSpeed = b.speed * 1.8;
        b.dashDir = aimAngle;
        if (s.damage > 0) {
          this.bullets.push(new Bullet({ owner: b, x: x0, y: y0, angle: aimAngle, speed: b.speed * 1.8, type: 'wave', width: 44, damage: Math.round(s.damage * dmgMult), range: s.range }));
        }
        break;
      }
      case 'jump': {
        // прыжок в targetPoint
        const tx = targetPoint ? targetPoint.x : x0 + Math.cos(aimAngle) * s.range;
        const ty = targetPoint ? targetPoint.y : y0 + Math.sin(aimAngle) * s.range;
        b.x = tx; b.y = ty;
        this.collideWalls(b);
        // урон вокруг приземления
        this.areaDamage(b, tx, ty, 110, Math.round(s.damage * dmgMult));
        break;
      }
      case 'healTeam': {
        for (const ally of this.brawlers) {
          if (ally.team === b.team && ally.alive && Math.hypot(ally.x - x0, ally.y - y0) < s.range) {
            ally.hp = Math.min(ally.maxHpNow(), ally.hp + s.value);
          }
        }
        for (const pet of this.pets) {
          if (pet.team === b.team && Math.hypot(pet.x - x0, pet.y - y0) < s.range) {
            pet.hp = Math.min(pet.maxHp, pet.hp + s.value);
          }
        }
        break;
      }
      case 'summon': {
        this.pets.push(new Pet({
          owner: b, x: x0 + Math.cos(aimAngle) * 40, y: y0 + Math.sin(aimAngle) * 40,
          hp: Math.round((s.summonHp || 3000) * dmgMult),
          damage: Math.round((s.summonDamage || 500) * dmgMult),
          isHealTower: s.effect === 'healTower', healArea: s.healArea || 0, healRate: s.healRate || 300,
          life: 25
        }));
        break;
      }
      case 'field': {
        this.slowFields.push({ x: targetPoint ? targetPoint.x : x0 + Math.cos(aimAngle) * 250, y: targetPoint ? targetPoint.y : y0 + Math.sin(aimAngle) * 250, r: 130, until: 4.5, team: b.team, damage: s.damage * dmgMult / 4.5, tickAcc: 0 });
        break;
      }
      case 'throw': {
        const n = s.count || 1;
        for (let i = 0; i < n; i++) {
          const ang = aimAngle + (i - (n - 1) / 2) * 0.35;
          const dist = s.range * 0.95;
          this.bullets.push(new Bullet({
            owner: b, x: x0, y: y0, angle: ang, type: 'throw',
            speed: dist / (s.fuse || 0.9), range: dist,
            damage: Math.round(s.damage * dmgMult), aoe: s.aoe || 80, breakWalls: !!s.effect.includes('breakWalls'), dot: s.dot || 0
          }));
        }
        break;
      }
      case 'barrage': {
        const tx = targetPoint ? targetPoint.x : x0 + Math.cos(aimAngle) * s.range * 0.8;
        const ty = targetPoint ? targetPoint.y : y0 + Math.sin(aimAngle) * s.range * 0.8;
        for (let i = 0; i < (s.count || 9); i++) {
          const ang = this.rng() * Math.PI * 2;
          const rad = this.rng() * 90;
          this.bullets.push(new Bullet({
            owner: b, x: tx + Math.cos(ang) * rad * 0.4, y: ty + Math.sin(ang) * rad * 0.4,
            angle: ang, type: 'throw', speed: 300, range: 60, fuse: 0.5 + this.rng() * 0.4,
            damage: Math.round(s.damage * dmgMult), aoe: 70, breakWalls: true
          }));
        }
        break;
      }
      case 'wave': {
        this.bullets.push(new Bullet({
          owner: b, x: x0, y: y0, angle: aimAngle, type: 'wave', speed: 500,
          width: s.width || 100, damage: Math.round(s.damage * dmgMult), range: s.range
        }));
        break;
      }
      default: break;
    }
    return true;
  }

  areaDamage(owner, x, y, r, dmg) {
    for (const e of [...this.brawlers, ...this.pets]) {
      if (!e.alive || e.team === owner.team || e === owner) continue;
      if (Math.hypot(e.x - x, e.y - y) < r + (e.r || 14)) {
        e.takeDamage(dmg, owner);
      }
    }
    for (const b of this.boxes) if (!b.dead && Math.hypot(b.x - x, b.y - y) < r + b.r) b.hp -= dmg;
    for (const s of this.safes) if (Math.hypot(s.x - x, s.y - y) < r + s.r) s.hp -= dmg;
    this.events.push({ type: 'explosion', x, y });
  }

  // Главный тик
  tick(dt) {
    this.time += dt;
    this.tickCount++;
    const ev = this.events;
    ev.length = 0;

    // бравлеры
    for (const b of this.brawlers) {
      b.tick(dt);
      this.unstick(b);
      this.collideWalls(b);
    }

    // пули
    for (const bl of this.bullets) {
      if (bl.dead) continue;
      bl.tick(dt);
      if (bl.type === 'throw') {
        if (bl.travelled >= bl.range || bl.fuse <= 0) {
          // взрыв
          this.areaDamage(bl.owner, bl.x, bl.y, bl.aoe || 70, bl.damage);
          if (bl.breakWalls) this.breakWallAt(bl.x, bl.y);
          if (bl.dot) {
            // лужа: поле урона
            this.slowFields.push({ x: bl.x, y: bl.y, r: (bl.aoe || 70), until: 3, team: bl.owner.team, damage: bl.dot / 3, tickAcc: 0, dot: true });
          }
          bl.dead = true;
        }
        continue;
      }
      // стены
      if (this.isWallAt(bl.x, bl.y)) {
        if (bl.breakWalls) { this.breakWallAt(bl.x, bl.y); }
        else if (bl.ricochet || bl.type === 'wave' || bl.bouncesLeft > 0) {
          // отражение по нормали клетки
          const gx = Math.floor(bl.x / TILE), gy = Math.floor(bl.y / TILE);
          // простая проверка: какая сторона
          const prevX = bl.x - bl.vx * dt, prevY = bl.y - bl.vy * dt;
          if (this.isWallAt(prevX, bl.y)) { bl.vy = -bl.vy; }
          if (this.isWallAt(bl.x, prevY)) { bl.vx = -bl.vx; }
          bl.angle = Math.atan2(bl.vy, bl.vx);
          if (bl.bouncesLeft > 0) bl.bouncesLeft--;
          else if (bl.type === 'wave' && !bl.ricochet) bl.dead = true;
        } else {
          bl.dead = true;
          ev.push({ type: 'hitWall', x: bl.x, y: bl.y });
          continue;
        }
      }
      // попадания
      this.bulletHits(bl);
      if (bl.travelled >= bl.range && bl.type !== 'throw') bl.dead = true;
    }
    this.bullets = this.bullets.filter((b) => !b.dead);

    // питомцы
    for (const p of this.pets) {
      p.life -= dt;
      if (p.isHealTower) {
        for (const a of this.brawlers) {
          if (a.team === p.team && a.alive && Math.hypot(a.x - p.x, a.y - p.y) < p.healArea) {
            a.hp = Math.min(a.maxHpNow(), a.hp + p.healRate * dt);
          }
        }
      }
      if (p.life <= 0 || p.hp <= 0) { p.dead = true; continue; }
    }
    this.pets = this.pets.filter((p) => !p.dead);

    // поля (супер Спайка/лужи Барли)
    for (const f of this.slowFields) {
      f.until -= dt;
      f.tickAcc = (f.tickAcc || 0) + dt;
      if (f.tickAcc >= 0.5) {
        f.tickAcc = 0;
        for (const b of this.brawlers) {
          if (b.alive && b.team !== f.team && Math.hypot(b.x - f.x, b.y - f.y) < f.r) {
            b.takeDamage(f.damage * 0.5, null);
            if (!f.dot) b.slowTimer = 1;
          }
        }
      }
    }
    this.slowFields = this.slowFields.filter((f) => f.until > 0);

    // ящики
    for (const bx of this.boxes) {
      if (bx.dead) continue;
      if (bx.hp <= 0) {
        bx.dead = true;
        this.cubes.push(new Cube(bx.x, bx.y));
        this.events.push({ type: 'boxBreak', x: bx.x, y: bx.y });
      }
    }
    this.boxes = this.boxes.filter((b) => !b.dead);

    // кубы — подбор
    for (const c of this.cubes) {
      if (c.dead) continue;
      for (const b of this.brawlers) {
        if (b.alive && Math.hypot(b.x - c.x, b.y - c.y) < b.r + c.r + 6) {
          c.dead = true;
          b.cubes++;
          b.hp = Math.min(b.maxHpNow() + 400, b.hp + 400);
          break;
        }
      }
    }
    this.cubes = this.cubes.filter((c) => !c.dead);

    // гемы (режим gem)
    if (this.mode.id === 'gem') {
      this.gemTimer -= dt;
      if (this.gemTimer <= 0 && this.gems.length < 10) {
        this.gemTimer = 7;
        if (this.gemSpawn) this.gems.push(new Gem(this.gemSpawn.x + (this.rng() - 0.5) * 40, this.gemSpawn.y + (this.rng() - 0.5) * 40));
      }
      for (const g of this.gems) {
        if (g.dead) continue;
        for (const b of this.brawlers) {
          if (b.alive && Math.hypot(b.x - g.x, b.y - g.y) < b.r + g.r + 6) {
            g.dead = true;
            b.gems = (b.gems || 0) + 1;
            break;
          }
        }
      }
      this.gems = this.gems.filter((g) => !g.dead);
      // счёт: команда держит ≥10 гемов 15 сек
      const teamGems = [0, 0];
      for (const b of this.brawlers) if (b.alive) teamGems[b.team] += b.gems || 0;
      this.score = teamGems;
      for (const t of [0, 1]) {
        if (teamGems[t] >= 10) {
          this.gemHoldTimer = (this.gemHoldTimer || [0, 0]);
          this.gemHoldTimer[t] = (this.gemHoldTimer[t] || 0) + dt;
          if (this.gemHoldTimer[t] >= 15) this.finish(t === 0, 'гемы удержаны');
        } else if (this.gemHoldTimer) this.gemHoldTimer[t] = 0;
      }
    }

    // броулбол
    if (this.mode.id === 'brawlball' && this.ball) {
      const ball = this.ball;
      if (ball.holder) {
        if (!ball.holder.alive) { ball.holder = null; }
        else { ball.x = ball.holder.x + Math.cos(ball.holder.aim) * 20; ball.y = ball.holder.aim !== undefined ? ball.holder.y + Math.sin(ball.holder.aim) * 20 : ball.holder.y; }
      } else {
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        ball.vx *= 0.98; ball.vy *= 0.98;
        if (this.isWallAt(ball.x, ball.y)) { ball.vx = -ball.vx * 0.7; ball.vy = -ball.vy * 0.7; }
        for (const b of this.brawlers) {
          if (b.alive && Math.hypot(b.x - ball.x, b.y - ball.y) < b.r + ball.r) { ball.holder = b; break; }
        }
      }
      // гол
      for (const goal of this.goals) {
        if (Math.hypot(ball.x - goal.x, ball.y - goal.y) < 50) {
          // гол в ворота team=1 значит счёт команде 0
          const scoring = goal.team === 1 ? 0 : 1;
          this.score[scoring]++;
          this.events.push({ type: 'goal', team: scoring });
          ball.holder = null;
          ball.x = this.w / 2; ball.y = this.h / 2; ball.vx = ball.vy = 0;
          // респавн всех
          for (const b of this.brawlers) { b.alive = true; b.hp = b.maxHpNow(); this.placeRespawn(b); }
          if (this.score[scoring] >= 2) this.finish(scoring === 0, 'голов: 2');
          break;
        }
      }
    }

    // награда за поимку: звёзды за убийства (score копится при смерти)
    if (this.mode.id === 'hotzone') {
      for (const z of this.zones) {
        const counts = [0, 0];
        for (const b of this.brawlers) {
          if (b.alive && Math.hypot(b.x - z.x, b.y - z.y) < z.r) counts[b.team]++;
        }
        if (counts[0] > counts[1]) z.progress += dt * (12 * counts[0]);
        else if (counts[1] > counts[0]) z.progress -= dt * (12 * counts[1]);
        z.progress = Math.max(0, Math.min(100, z.progress));
      }
      const avgP = this.zones.reduce((s, z) => s + z.progress, 0) / Math.max(1, this.zones.length);
      this.score = [Math.round(avgP), Math.round(100 - avgP)];
      if (avgP >= 100) this.finish(true, 'зона захвачена');
      else if (this.time > 150 && avgP <= 0) this.finish(false, 'время вышло');
      else if (this.time > 150) this.finish(avgP > 50, 'время вышло');
    }

    // ограбление: победа при разрушении сейфа
    if (this.mode.id === 'heist') {
      for (const s of this.safes) {
        if (s.hp <= 0) {
          const winner = s.team === 1 ? 0 : 1; // снесли сейф команды 1 -> победа 0
          if (!this.result) this.finish(winner === 0, 'сейф разрушен');
        }
      }
    }

    // выбивание/дуэль/столкновение: смерть = вне игры (respawn=0)
    for (const b of this.brawlers) {
      if (b.alive && b.hp <= 0) this.onBrawlerDeath(b);
    }

    // время: лимит матча (у bounty и gem — 120 с, у остальных 240)
    const limit = (this.mode.id === 'bounty' || this.mode.id === 'gem') ? 120 : 240;
    if (!this.result && this.time > limit) {
      this.finish(this.score[0] > this.score[1], 'время вышло');
    }
  }

  bulletHits(bl) {
    const owner = bl.owner;
    // по бравлерам
    for (const b of this.brawlers) {
      if (bl.dead) break;
      if (!b.alive || b === owner) continue;
      if (b.team === owner.team) continue;
      if (bl.hitIds.has(b.id)) continue;
      // урон зависит от дистанции для Пайпер
      let dmg = bl.damage;
      if (bl.scaling && bl.travelled > bl.range * 0.7) dmg = Math.round(dmg * bl.scaling);
      const dx = b.x - bl.x, dy = b.y - bl.y;
      const dist = Math.hypot(dx, dy);
      const hitR = (bl.type === 'wave' ? bl.width / 2 + b.r : bl.width / 2 + b.r);
      if (dist < hitR) {
        if (bl.type === 'wave' || bl.aoe) {
          bl.hitIds.add(b.id);
        } else {
          bl.dead = true;
        }
        let final = dmg;
        // куст: урон из куста (амбуш) +?
        b.takeDamage(final, owner);
        if (bl.dot) b.dot = { dps: bl.dot, until: 3 };
        if (bl.knockback) {
          const kb = bl.knockback;
          b.x += Math.cos(bl.angle) * kb;
          b.y += Math.sin(bl.angle) * kb;
          b.clampToWorld();
          this.collideWalls(b);
        }
        this.events.push({ type: 'hit', x: b.x, y: b.y });
        // мяч: отбор при попадании?
        if (this.ball && this.ball.holder === b) { this.ball.holder = null; this.ball.vx = Math.cos(bl.angle) * 200; this.ball.vy = Math.sin(bl.angle) * 200; }
      }
    }
    // по питомцам
    for (const p of this.pets) {
      if (bl.dead) break;
      if (p.team === owner.team || p.dead) continue;
      if (bl.hitIds.has(p.id)) continue;
      if (Math.hypot(p.x - bl.x, p.y - bl.y) < bl.width / 2 + p.r) {
        p.hp -= bl.damage;
        if (bl.type !== 'wave' && !bl.aoe) bl.dead = true;
        else bl.hitIds.add(p.id);
        this.events.push({ type: 'hit', x: p.x, y: p.y });
      }
    }
    // по ящикам
    for (const bx of this.boxes) {
      if (bl.dead) break;
      if (bx.dead) continue;
      if (Math.hypot(bx.x - bl.x, bx.y - bl.y) < bl.width / 2 + bx.r) {
        bx.hp -= bl.damage;
        if (bl.type !== 'wave' && !bl.aoe) bl.dead = true;
        else bl.hitIds.add(bx.id);
      }
    }
    // по сейфам
    for (const s of this.safes) {
      if (bl.dead) break;
      if (s.team === owner.team) continue;
      if (Math.hypot(s.x - bl.x, s.y - bl.y) < bl.width / 2 + s.r) {
        s.hp -= bl.damage;
        if (bl.type !== 'wave' && !bl.aoe) bl.dead = true;
        else bl.hitIds.add(s.id);
      }
    }
  }

  onBrawlerDeath(b) {
    b.alive = false;
    b.hp = 0;
    // сброс гемов
    if (this.mode.id === 'gem' && b.gems) {
      for (let i = 0; i < Math.min(10, b.gems); i++) {
        const ang = this.rng() * Math.PI * 2;
        this.gems.push(new Gem(b.x + Math.cos(ang) * 30, b.y + Math.sin(ang) * 30));
      }
      b.gems = 0;
    }
    // кубы выпадают
    const drop = Math.floor(b.cubes / 2);
    for (let i = 0; i < drop; i++) {
      const ang = this.rng() * Math.PI * 2;
      this.cubes.push(new Cube(b.x + Math.cos(ang) * 30, b.y + Math.sin(ang) * 30));
    }
    b.cubes = 0;
    // мяч
    if (this.ball && this.ball.holder === b) {
      this.ball.holder = null;
      const ang = this.rng() * Math.PI * 2;
      this.ball.vx = Math.cos(ang) * 250;
      this.ball.vy = Math.sin(ang) * 250;
    }
    // звёзды в bounty
    if (this.mode.id === 'bounty') {
      const killer = this.lastKillerOf(b);
      if (killer) this.score[killer.team]++;
    }
    this.events.push({ type: 'death', x: b.x, y: b.y, by: b.id, team: b.team });
    // респавн по режиму
    const resp = this.mode.respawn;
    if (resp > 0) b.respawnTimer = resp;
    this.checkKnockout();
  }

  lastKillerOf(b) {
    // ищем в bullets рядом последнего атакующего — упрощённо: ближайший враг
    let best = null, bd = 1e9;
    for (const o of this.brawlers) {
      if (o.team !== b.team && o.alive) {
        const d = Math.hypot(o.x - b.x, o.y - b.y);
        if (d < bd) { bd = d; best = o; }
      }
    }
    return best;
  }

  checkKnockout() {
    if (['knockout', 'duel'].includes(this.mode.id)) {
      const aliveT = this.brawlers.filter((b) => b.team === 0 && b.alive).length;
      const aliveE = this.brawlers.filter((b) => b.team === 1 && b.alive).length;
      if (aliveE === 0) this.finish(true, 'команда врага выбита');
      else if (aliveT === 0) this.finish(false, 'твоя команда выбита');
    }
    if (this.mode.id === 'showdown') {
      const alive = this.brawlers.filter((b) => b.alive);
      if (alive.length <= 1 && !this.result) {
        const place = alive[0] && alive[0].isPlayer ? 1 : this.computePlace();
        this.finish(alive.length === 1 && alive[0].isPlayer, 'последний выживший', place);
      }
    }
  }

  computePlace() {
    // место игрока: число выживших на момент смерти + 1
    const player = this.brawlers.find((b) => b.isPlayer);
    if (!player) return this.brawlers.length;
    const aliveOthers = this.brawlers.filter((b) => b.alive).length;
    return aliveOthers + 1;
  }

  finish(win, reason, place = null) {
    if (this.result) return;
    let finalPlace = place;
    if (this.mode.id === 'showdown' && finalPlace == null) finalPlace = this.computePlace();
    this.result = { win, reason, place: finalPlace, time: this.time };
  }
}

function groupZones(cells, tile) {
  // кластеризация смежных Z-клеток
  const used = new Set();
  const zones = [];
  for (const c of cells) {
    const key = `${c.x},${c.y}`;
    if (used.has(key)) continue;
    // BFS
    const q = [c]; used.add(key);
    const group = [c];
    while (q.length) {
      const cur = q.pop();
      for (const d of [[tile, 0], [-tile, 0], [0, tile], [0, -tile]]) {
        const nk = `${cur.x + d[0]},${cur.y + d[1]}`;
        if (used.has(nk)) continue;
        const nc = cells.find((z) => z.x === cur.x + d[0] && z.y === cur.y + d[1]);
        if (nc) { used.add(nk); q.push(nc); group.push(nc); }
      }
    }
    zones.push({
      x: avg(group.map((g) => g.x)), y: avg(group.map((g) => g.y)),
      r: Math.max(70, group.length * tile * 0.55), progress: 50
    });
  }
  return zones.length ? zones : [{ x: cells.length ? cells[0].x : 0, y: cells.length ? cells[0].y : 0, r: 90, progress: 50 }];
}

function avg(arr) { return arr.reduce((s, v) => s + v, 0) / arr.length; }
