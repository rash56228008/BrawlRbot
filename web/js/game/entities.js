// Сущности боя: бравлер, пуля, куб силы, ящик, питомец, сейф, мяч
import { TILE } from '../data/maps.js';

let NEXT_ID = 1;
export function nextId() { return NEXT_ID++; }

const SQ = TILE;

export class BrawlerEntity {
  constructor({ def, team, isPlayer, x, y, power = 1, skin = null, name, trophies = 0 }) {
    this.id = nextId();
    this.kind = 'brawler';
    this.def = def;
    this.team = team;               // 0 = игрок/союзники, 1 = враги
    this.isPlayer = !!isPlayer;
    this.name = name || def.name;
    this.trophies = trophies;

    const mult = 1 + (power - 1) * 0.1;
    this.maxHp = Math.round(def.hp * mult);
    this.hp = this.maxHp;
    this.speed = def.speed;         // px/сек
    this.power = power;
    this.color = skin ? skin.color : def.color;
    this.color2 = skin ? skin.color2 : def.color2;

    this.x = x; this.y = y;
    this.r = 18;                    // радиус коллизии
    this.aim = 0;                   // угол прицела (рад)
    this.moveX = 0; this.moveY = 0; // вектор движения

    this.ammo = 3; this.maxAmmo = 3;
    this.reloadTimer = 0;          // перезарядка патрона
    this.superCharge = 0;          // урон, необходимый для супера
    this.attackCooldown = 0;

    this.cubes = 0;                 // кубы силы (столкновение)
    this.alive = true;
    this.respawnTimer = 0;
    this.inBush = false;
    this.dashTime = 0; this.dashDir = null; // рывок
    this.dot = null;                // { dps, until }
    this.slowTimer = 0;
    this.hasBall = false;

    // AI state
    this.ai = null;
  }

  get atk() { return this.def.attack; }
  get sup() { return this.def.super; }

  cubeMult() { return 1 + this.cubes * 0.1; }
  damageValue() { return Math.round(this.atk.damage * (1 + (this.power - 1) * 0.1) * this.cubeMult()); }
  maxHpNow() { return Math.round(this.maxHp * this.cubeMult()); }

  tick(dt) {
    if (!this.alive) {
      if (this.respawnTimer > 0) {
        this.respawnTimer -= dt;
        if (this.respawnTimer <= 0) this.respawnNow();
      }
      return;
    }
    // перезарядка патронов
    if (this.ammo < this.maxAmmo) {
      this.reloadTimer += dt;
      const per = this.atk.reload / 1;
      if (this.reloadTimer >= per) { this.ammo++; this.reloadTimer = 0; }
    } else this.reloadTimer = 0;

    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.slowTimer > 0) this.slowTimer -= dt;

    // рывок
    if (this.dashTime > 0) {
      this.dashTime -= dt;
      const sp = this.dashSpeed * this.cubeMult();
      this.x += Math.cos(this.dashDir) * sp * dt;
      this.y += Math.sin(this.dashDir) * sp * dt;
      this.clampToWorld();
      return;
    }

    // движение
    if (this.moveX || this.moveY) {
      const len = Math.hypot(this.moveX, this.moveY);
      const sp = this.speed * (this.slowTimer > 0 ? 0.6 : 1) * this.cubeMult() * 0.9;
      this.x += (this.moveX / len) * sp * dt;
      this.y += (this.moveY / len) * sp * dt;
      this.clampToWorld();
      if (!this.isPlayer) this.aim = Math.atan2(this.moveY, this.moveX);
    }

    // яд
    if (this.dot && this.dot.until > 0) {
      this.hp -= this.dot.dps * dt;
      this.dot.until -= dt;
      if (this.hp <= 0) this.hp = 0;
    }
  }

  // Жёсткий кламп: сущность не может покинуть мир (мир задаётся при добавлении в World)
  clampToWorld() {
    if (this.worldBounds) {
      const { w, h } = this.worldBounds;
      const r = this.r || 14;
      if (!isFinite(this.x)) this.x = w / 2;
      if (!isFinite(this.y)) this.y = h / 2;
      this.x = Math.max(r, Math.min(w - r, this.x));
      this.y = Math.max(r, Math.min(h - r, this.y));
    }
  }

  respawnNow() {
    this.alive = true;
    this.hp = this.maxHpNow();
    this.ammo = this.maxAmmo;
    this.dot = null;
    this.slowTimer = 0;
    if (this.onRespawn) this.onRespawn(this);
  }

  takeDamage(dmg, attacker) {
    if (!this.alive || dmg <= 0) return 0;
    this.hp -= dmg;
    if (attacker && attacker.kind === 'brawler') {
      attacker.superCharge = Math.min(attacker.sup.charge, (attacker.superCharge || 0) + dmg);
    }
    if (this.hp <= 0) { this.hp = 0; return dmg; }
    return dmg;
  }
}

export class Bullet {
  constructor({ owner, x, y, angle, speed = 560, damage, range, type = 'bullet', aoe = 0, dot = 0, ricochet = false, width = 14, fuse = 0, breakWalls = false, slowField = false, knockback = 0 }) {
    this.id = nextId();
    this.kind = 'bullet';
    this.owner = owner;
    this.x = x; this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.angle = angle;
    this.damage = damage;
    this.range = range;
    this.travelled = 0;
    this.type = type;               // bullet | throw | wave
    this.aoe = aoe;
    this.dot = dot;
    this.ricochet = ricochet;
    this.width = width;
    this.fuse = fuse;               // для throw: взрыв по таймеру после достижения цели
    this.breakWalls = breakWalls;
    this.slowField = slowField;
    this.knockback = knockback;
    this.bouncesLeft = 0;
    this.hitIds = new Set();        // кого уже задел (для wave/aoe)
    this.dead = false;
  }

  tick(dt) {
    if (this.dead) return;
    const nx = this.x + this.vx * dt;
    const ny = this.y + this.vy * dt;
    this.travelled += Math.hypot(nx - this.x, ny - this.y);
    this.x = nx; this.y = ny;
    if (this.fuse > 0) {
      this.fuse -= dt;
    }
    if (this.travelled >= this.range && this.type !== 'throw') this.dead = true;
  }
}

export class Box {
  constructor(x, y) {
    this.id = nextId();
    this.kind = 'box';
    this.x = x; this.y = y;
    this.hp = 3000; this.maxHp = 3000;
    this.r = 16;
    this.dead = false;
  }
}

export class Cube {
  constructor(x, y) {
    this.id = nextId();
    this.kind = 'cube';
    this.x = x; this.y = y;
    this.r = 10;
    this.dead = false;
    this.bob = Math.random() * Math.PI * 2;
  }
}

export class Pet { // медведь Ниты, турель Джесси, башня Пэм
  constructor({ owner, x, y, hp, damage, isHealTower = false, healArea = 0, healRate = 0, life = 20 }) {
    this.id = nextId();
    this.kind = 'pet';
    this.owner = owner;             // BrawlerEntity
    this.team = owner.team;
    this.x = x; this.y = y;
    this.maxHp = hp; this.hp = hp;
    this.damage = damage;
    this.isHealTower = isHealTower;
    this.healArea = healArea;
    this.healRate = healRate;
    this.attackCd = 0;
    this.life = life;               // сек до исчезновения
    this.r = 16;
    this.rng = Math.random() * Math.PI * 2;
  }
}

export class Gem {
  constructor(x, y) {
    this.id = nextId();
    this.kind = 'gem';
    this.x = x; this.y = y;
    this.r = 9;
    this.dead = false;
    this.bob = Math.random() * Math.PI * 2;
  }
}

export class Safe {
  constructor(x, y, team) {
    this.id = nextId();
    this.kind = 'safe';
    this.team = team;               // чей сейф (0 — игрока)
    this.x = x; this.y = y;
    this.hp = 26000; this.maxHp = 26000;
    this.r = 26;
  }
}

export class Ball {
  constructor(x, y) {
    this.id = nextId();
    this.kind = 'ball';
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.r = 12;
    this.holder = null;             // BrawlerEntity
  }
}
