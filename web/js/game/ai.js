// AI ботов: агрессивнее и точнее среднего игрока.
// Уровень силы растёт с трофеями игрока (skill 0..1).
export function makeAI(world, b, skill) {
  return {
    b, world, skill,
    state: 'farm',        // farm | fight | retreat | objective
    stateTimer: 0,
    target: null,
    wanderAngle: Math.random() * Math.PI * 2,
    aimJitter: (1 - skill) * 0.35,   // разброс прицела
    reactTimer: 0,
    tick(dt) {
      const w = this.world, self = this.b;
      if (!self.alive) { self.moveX = self.moveY = 0; return; }

      this.stateTimer -= dt;
      this.reactTimer -= dt;
      if (this.stateTimer <= 0) {
        this.stateTimer = 0.4 + Math.random() * 0.4;
        this.think();
      }
      this.act(dt);
    },

    think() {
      const w = this.world, self = this.b;
      // выбор цели: ближайший видимый враг
      const enemies = w.brawlers.filter((e) => e.alive && e.team !== self.team && this.canSee(e));
      let target = null, bd = 1e9;
      for (const e of enemies) {
        const d = Math.hypot(e.x - self.x, e.y - self.y);
        // приоритет: слабые по HP и близкие
        const score = d - (1 - e.hp / e.maxHpNow()) * 300;
        if (score < bd) { bd = score; target = e; }
      }
      // + питомцы врага
      for (const p of w.pets) {
        if (p.team !== self.team && !p.dead) {
          const d = Math.hypot(p.x - self.x, p.y - self.y) - 200;
          if (d < bd) { bd = d; target = p; }
        }
      }
      this.target = target;

      const hpFrac = self.hp / self.maxHpNow();
      // режимы без респавна/соло — играем агрессивнее: при численном преимуществе давим
      const noRespawn = !this.world.mode.respawn;
      const alliesAlive = this.world.brawlers.filter((b) => b.alive && b.team === self.team).length;
      const enemiesAlive = this.world.brawlers.filter((b) => b.alive && b.team !== self.team).length;
      if (hpFrac < (noRespawn ? 0.25 : 0.35) && target) this.state = 'retreat';
      else if (target) this.state = 'fight';
      else if (noRespawn && enemiesAlive > 0 && alliesAlive >= enemiesAlive) this.state = 'hunt';
      else if (w.mode.id === 'gem' && w.gems.length) this.state = 'objective';
      else if (w.mode.id === 'hotzone') this.state = 'objective';
      else if (w.mode.id === 'heist') this.state = w.safes.find((s) => s.team !== self.team) ? 'objective' : 'farm';
      else if (w.boxes.length) this.state = 'farm';
      else this.state = 'objective';
    },

    canSee(e) {
      // враг в кусте невидим дальше 180px
      const d = Math.hypot(e.x - this.b.x, e.y - this.b.y);
      if (this.world.isBushAt(e.x, e.y) && d > 180) return false;
      return true;
    },

    act(dt) {
      const w = this.world, self = this.b;
      self.moveX = 0; self.moveY = 0;

      const range = self.atk.range;

      if (this.state === 'fight' && this.target) {
        const t = this.target;
        const dx = t.x - self.x, dy = t.y - self.y;
        const d = Math.hypot(dx, dy);

        // держим дистанцию: стрелки — 0.7 range, танки — вплотную
        // добиваем раненых и давим в режимах без респавна
        const isTank = self.def.class === 'Танк' || self.atk.type === 'melee';
        const noRespawn = !w.mode.respawn;
        const enemyHurt = t.hp / (t.maxHpNow ? t.maxHpNow() : t.maxHp) < 0.4;
        const want = isTank ? 120 : range * (0.55 + this.skill * 0.2) * (noRespawn || enemyHurt ? 0.75 : 1);

        if (d > want + 40) { self.moveX = dx; self.moveY = dy; }
        else if (d < want - 60) { self.moveX = -dx; self.moveY = -dy; }
        else {
          // стрейф
          const perp = Math.atan2(dy, dx) + Math.PI / 2 * (this.strafeDir || 1);
          self.moveX = Math.cos(perp); self.moveY = Math.sin(perp);
          if (!this.strafeDir || Math.random() < 0.01) this.strafeDir = Math.random() < 0.5 ? 1 : -1;
        }

        // прицел с упреждением
        if (d < range * 0.95) {
          const bulletSpeed = self.atk.type === 'throw' ? 520 : 660;
          const lead = this.skill * (d / bulletSpeed);
          const px = t.x + (t.moveX || 0) * t.speed * lead * 0.8;
          const py = t.y + (t.moveY || 0) * t.speed * lead * 0.8;
          const jitter = (Math.random() - 0.5) * this.aimJitter;
          const aim = Math.atan2(py - self.y, px - self.x) + jitter;
          self.aim = aim;

          if (this.reactTimer <= 0) {
            const fired = w.attack(self, aim);
            if (fired) this.reactTimer = (1 - this.skill) * 0.5 + 0.1;
          }
        }
        // супер
        if (self.superCharge >= self.sup.charge && Math.random() < 0.3) {
          w.useSuper(self, self.aim, { x: t.x, y: t.y });
        }
        return;
      }

      if (this.state === 'retreat' && this.target) {
        const t = this.target;
        self.moveX = self.x - t.x; self.moveY = self.y - t.y;
        // отстрел на бегу для скилловых ботов
        if (this.skill > 0.5 && self.ammo > 1) {
          const d = Math.hypot(t.x - self.x, t.y - self.y);
          if (d < range * 0.9) w.attack(self, Math.atan2(t.y - self.y, t.x - self.x));
        }
        return;
      }

      if (this.state === 'hunt') {
        // ищем любого врага (даже в кустах) и идём к нему
        let goal = null, bd = 1e9;
        for (const e of w.brawlers) {
          if (!e.alive || e.team === self.team) continue;
          const d = Math.hypot(e.x - self.x, e.y - self.y);
          if (d < bd) { bd = d; goal = e; }
        }
        if (goal) {
          self.moveX = goal.x - self.x; self.moveY = goal.y - self.y;
          if (bd < self.atk.range * 0.8 && this.canSee(goal)) {
            self.aim = Math.atan2(goal.y - self.y, goal.x - self.x);
            if (this.reactTimer <= 0) { w.attack(self, self.aim); this.reactTimer = 0.3; }
          }
        } else this.wander(dt);
        return;
      }

      if (this.state === 'farm') {
        // к ближайшему ящику или кубу
        let goal = null, bd = 1e9;
        for (const bx of w.boxes) {
          const d = Math.hypot(bx.x - self.x, bx.y - self.y);
          if (d < bd) { bd = d; goal = bx; }
        }
        for (const c of w.cubes) {
          const d = Math.hypot(c.x - self.x, c.y - self.y);
          if (d < bd) { bd = d; goal = c; }
        }
        if (goal) {
          self.moveX = goal.x - self.x; self.moveY = goal.y - self.y;
          const d = bd;
          if (d < self.atk.range * 0.8 && self.ammo > 0) {
            self.aim = Math.atan2(goal.y - self.y, goal.x - self.x);
            w.attack(self, self.aim);
          }
        } else {
          this.wander(dt);
        }
        return;
      }

      if (this.state === 'objective') {
        let goal = null;
        if (w.mode.id === 'gem') {
          // к гему или в центр
          const g = w.gems[0];
          goal = g ? { x: g.x, y: g.y } : (w.gemSpawn || { x: w.w / 2, y: w.h / 2 });
          // держатель 10+ гемов отходит к краю
          if ((self.gems || 0) >= 4) {
            goal = { x: self.team === 0 ? 120 : w.w - 120, y: w.h / 2 };
          }
        } else if (w.mode.id === 'hotzone') {
          goal = w.zones[0];
        } else if (w.mode.id === 'heist') {
          const s = w.safes.find((s2) => s2.team !== self.team);
          if (s) {
            const d = Math.hypot(s.x - self.x, s.y - self.y);
            self.moveX = s.x - self.x; self.moveY = s.y - self.y;
            if (d < self.atk.range * 0.85 && self.ammo > 0) {
              self.aim = Math.atan2(s.y - self.y, s.x - self.x);
              w.attack(self, self.aim);
            }
            if (self.superCharge >= self.sup.charge) w.useSuper(self, self.aim, { x: s.x, y: s.y });
            return;
          }
        } else if (w.mode.id === 'brawlball' && w.ball) {
          const b = w.ball;
          if (b.holder === self) {
            // к чужим воротам
            const goal2 = self.team === 0 ? w.goals[0] : w.goals[1];
            self.moveX = goal2.x - self.x; self.moveY = goal2.y - self.y;
            self.aim = Math.atan2(self.moveY, self.moveX);
            // пас/удар: если враг близко и есть союзник лучше — упростим: удар у ворот
            const dg = Math.hypot(goal2.x - self.x, goal2.y - self.y);
            if (dg < 300 && self.ammo >= 0) {
              // удар: атака выбивает мяч
              w.attack(self, self.aim);
            }
            return;
          }
          goal = b;
        } else if (w.mode.id === 'showdown') {
          // центр карты, ящики
          goal = { x: w.w / 2, y: w.h / 2 };
        } else {
          goal = { x: w.w / 2, y: w.h / 2 };
        }
        if (goal) {
          self.moveX = goal.x - self.x; self.moveY = goal.y - self.y;
          // не бежать в стену: лёгкий обход
          const ax = self.x + Math.sign(self.moveX) * 40, ay = self.y + Math.sign(self.moveY) * 40;
          if (w.isWallAt(self.x + Math.sign(self.moveX) * 40, self.y)) { self.moveX = 0; self.moveY = self.y < w.h / 2 ? 1 : -1; }
          if (w.isWallAt(self.x, self.y + Math.sign(self.moveY) * 40)) { self.moveY = 0; self.moveX = self.x < w.w / 2 ? 1 : -1; }
        }
        return;
      }

      this.wander(dt);
    },

    wander(dt) {
      const self = this.b;
      if (Math.random() < 0.02) this.wanderAngle = Math.random() * Math.PI * 2;
      self.moveX = Math.cos(this.wanderAngle);
      self.moveY = Math.sin(this.wanderAngle);
    }
  };
}
