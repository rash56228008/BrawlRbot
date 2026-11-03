// Рендер боя на Canvas 2D
import { TILE, MAP_W, MAP_H } from '../data/maps.js';

export function createRenderer(canvas, world, player) {
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  let W = 0, H = 0;
  let camX = world.w / 2, camY = world.h / 2;
  const VIEW_W = 900, VIEW_H = 520; // видимая область мира

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // Камера: игрок в центре
  function updateCamera() {
    const scale = viewScale();
    const halfW = W / (2 * scale), halfH = H / (2 * scale);
    if (player) {
      camX = player.x;
      camY = player.y;
    }
    camX = Math.max(halfW, Math.min(world.w - halfW, camX));
    camY = Math.max(halfH, Math.min(world.h - halfH, camY));
  }

  function viewScale() {
    return Math.max(W / VIEW_W, H / VIEW_H);
  }

  // ==== отрисовка ====
  function draw(dt) {
    updateCamera();
    const scale = viewScale();
    ctx.save();
    // фон
    ctx.fillStyle = '#2c8f4e';
    ctx.fillRect(0, 0, W, H);
    ctx.translate(W / 2, H / 2);
    ctx.scale(scale, scale);
    ctx.translate(-camX, -camY);

    drawGround();
    drawWallsAndBushes();
    drawZones();
    drawSafes();
    drawGemsAndCubes();
    drawBoxes();
    drawBall();
    drawPets();
    drawBullets();
    drawBrawlers();
    drawFields();

    ctx.restore();
  }

  function drawGround() {
    // шахматка
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const c = world.grid[y * MAP_W + x];
        let color = (x + y) % 2 === 0 ? '#2c8f4e' : '#2a8749';
        if (c === 3) color = '#3f7fc9';
        ctx.fillStyle = color;
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
  }

  function drawWallsAndBushes() {
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const c = world.grid[y * MAP_W + x];
        const px = x * TILE, py = y * TILE;
        if (c === 1) {
          ctx.fillStyle = '#7a4a2b';
          ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
          ctx.fillStyle = '#9c6438';
          ctx.fillRect(px + 4, py + 4, TILE - 12, TILE - 12);
        } else if (c === 2) {
          ctx.fillStyle = '#1e6b3a';
          ctx.beginPath();
          ctx.ellipse(px + TILE / 2, py + TILE / 2, TILE / 2 - 2, TILE / 2 - 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#278248';
          ctx.beginPath();
          ctx.ellipse(px + TILE / 2 - 4, py + TILE / 2 - 4, TILE / 4, TILE / 5, 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawZones() {
    for (const z of world.zones) {
      ctx.strokeStyle = 'rgba(255,210,63,.9)';
      ctx.lineWidth = 4;
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // прогресс
      if (z.progress > 0) {
        ctx.fillStyle = 'rgba(77,217,122,.18)';
        ctx.beginPath();
        ctx.moveTo(z.x, z.y);
        ctx.arc(z.x, z.y, z.r, -Math.PI / 2, -Math.PI / 2 + (z.progress / 100) * Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 26px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText(Math.round(z.progress) + '%', z.x, z.y + 8);
    }
    // ворота
    if (world.goals) {
      for (const g of world.goals) {
        ctx.fillStyle = g.team === 1 ? 'rgba(255,77,109,.4)' : 'rgba(77,146,255,.4)';
        ctx.fillRect(g.x - 30, g.y - 85, 60, 170);
        ctx.strokeStyle = g.team === 1 ? '#ff4d6d' : '#4d92ff';
        ctx.lineWidth = 4;
        ctx.strokeRect(g.x - 30, g.y - 85, 60, 170);
      }
    }
    // точка спавна гемов
    if (world.gemSpawn) {
      ctx.fillStyle = 'rgba(77,210,255,.25)';
      ctx.beginPath();
      ctx.arc(world.gemSpawn.x, world.gemSpawn.y, 46, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSafes() {
    for (const s of world.safes) {
      ctx.fillStyle = s.team === 0 ? '#4d92ff' : '#ff4d6d';
      roundRect(s.x - 26, s.y - 22, 52, 44, 8);
      ctx.fill();
      ctx.fillStyle = '#222';
      roundRect(s.x - 14, s.y - 10, 28, 20, 4);
      ctx.fill();
      hpBar(s.x, s.y - 34, 60, s.hp / s.maxHp, s.team === 0 ? '#4d92ff' : '#ff4d6d');
    }
  }

  function drawGemsAndCubes() {
    const t = performance.now() / 1000;
    for (const g of world.gems) {
      const bob = Math.sin(t * 3 + g.bob) * 5;
      ctx.save();
      ctx.translate(g.x, g.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#4dd2ff';
      ctx.fillRect(-8, -8, 16, 16);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-8, -8, 16, 16);
      ctx.restore();
    }
    for (const c of world.cubes) {
      const bob = Math.sin(t * 4 + c.bob) * 4;
      ctx.save();
      ctx.translate(c.x, c.y + bob);
      ctx.rotate(t + c.bob);
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(-9, -9, 18, 18);
      ctx.strokeStyle = '#a67c00';
      ctx.lineWidth = 2;
      ctx.strokeRect(-9, -9, 18, 18);
      ctx.restore();
    }
  }

  function drawBoxes() {
    for (const b of world.boxes) {
      if (b.dead) continue;
      ctx.fillStyle = '#8a5a2b';
      roundRect(b.x - 18, b.y - 16, 36, 32, 5);
      ctx.fill();
      ctx.fillStyle = '#5c3a1a';
      ctx.fillRect(b.x - 18, b.y - 4, 36, 4);
      hpBar(b.x, b.y - 28, 40, b.hp / b.maxHp, '#ffd23f');
    }
  }

  function drawBall() {
    if (!world.ball) return;
    const b = world.ball;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPets() {
    for (const p of world.pets) {
      if (p.dead) continue;
      const color = p.team === 0 ? '#4d92ff' : '#ff4d6d';
      ctx.fillStyle = p.isHealTower ? '#4dd97a' : color;
      if (p.isHealTower) {
        ctx.fillRect(p.x - 14, p.y - 22, 28, 44);
        ctx.strokeStyle = 'rgba(77,217,122,.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.healArea, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      hpBar(p.x, p.y - 26, 40, p.hp / p.maxHp, color);
    }
  }

  function drawBullets() {
    for (const bl of world.bullets) {
      if (bl.dead) continue;
      if (bl.type === 'throw') {
        // динамит: тень + предмет по дуге
        const frac = Math.min(1, bl.travelled / bl.range);
        const arcH = Math.sin(frac * Math.PI) * 60;
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        ctx.beginPath();
        ctx.ellipse(bl.x, bl.y, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = bl.owner.color2 || '#ffd23f';
        ctx.save();
        ctx.translate(bl.x, bl.y - arcH);
        ctx.rotate(bl.travelled / 30);
        ctx.fillRect(-7, -7, 14, 14);
        ctx.restore();
      } else if (bl.type === 'wave') {
        // волна: веер
        ctx.strokeStyle = bl.owner.color2 || '#fff';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(bl.x - Math.cos(bl.angle) * bl.width / 2, bl.y - Math.sin(bl.angle) * bl.width / 2);
        ctx.lineTo(bl.x, bl.y);
        ctx.lineTo(bl.x + Math.cos(bl.angle) * 30, bl.y + Math.sin(bl.angle) * 30);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bl.x, bl.y, bl.width / 2, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
      } else {
        // пуля
        ctx.save();
        ctx.translate(bl.x, bl.y);
        ctx.rotate(bl.angle);
        const owner = bl.owner;
        ctx.fillStyle = owner.isPlayer ? '#fff' : (owner.team === 0 ? '#a9ccff' : '#ffb3ab');
        roundRect(-10, -4, 20, 8, 4);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawFields() {
    for (const f of world.slowFields) {
      ctx.fillStyle = f.dot ? 'rgba(122,199,79,.3)' : 'rgba(142,224,74,.25)';
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = f.dot ? 'rgba(122,199,79,.6)' : 'rgba(142,224,74,.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawBrawlers() {
    // сортировка по Y
    const list = [...world.brawlers].sort((a, b) => a.y - b.y);
    for (const b of list) {
      if (!b.alive) {
        // призрак на месте смерти
        continue;
      }
      const isEnemy = b.team !== (player ? player.team : 0);
      // невидимость в кустах
      const inBush = world.isBushAt(b.x, b.y);
      const dist = player ? Math.hypot(b.x - player.x, b.y - player.y) : 0;
      const hidden = inBush && isEnemy && dist > 180 && !b.isPlayer;

      ctx.save();
      ctx.globalAlpha = hidden ? 0 : (inBush ? 0.55 : 1);

      // тень
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.beginPath();
      ctx.ellipse(b.x, b.y + 16, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // тело: круг с обводкой команды
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = b.isPlayer ? '#ffd23f' : (isEnemy ? '#ff4d6d' : '#4d92ff');
      ctx.stroke();

      // глаза смотрят по прицелу
      const ex = Math.cos(b.aim) * 6, ey = Math.sin(b.aim) * 6;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(b.x - 6 + ex * 0.5, b.y - 5, 5, 0, Math.PI * 2);
      ctx.arc(b.x + 6 + ex * 0.5, b.y - 5, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(b.x - 6 + ex, b.y - 5, 2.4, 0, Math.PI * 2);
      ctx.arc(b.x + 6 + ex, b.y - 5, 2.4, 0, Math.PI * 2);
      ctx.fill();

      // ствол по прицелу
      ctx.strokeStyle = b.color2;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(b.x + Math.cos(b.aim) * 10, b.y + Math.sin(b.aim) * 10);
      ctx.lineTo(b.x + Math.cos(b.aim) * 24, b.y + Math.sin(b.aim) * 24);
      ctx.stroke();

      // кубы силы: жёлтые пипки
      if (b.cubes > 0) {
        ctx.fillStyle = '#ffd23f';
        for (let i = 0; i < Math.min(6, b.cubes); i++) {
          const ang = -Math.PI / 2 + (i - Math.min(6, b.cubes) / 2) * 0.3;
          ctx.save();
          ctx.translate(b.x + Math.cos(ang) * 30, b.y + Math.sin(ang) * 30);
          ctx.rotate(ang);
          ctx.fillRect(-5, -5, 10, 10);
          ctx.restore();
        }
      }

      // HP-бар
      const color = b.isPlayer ? '#ffd23f' : (isEnemy ? '#ff4d6d' : '#4dd97a');
      hpBar(b.x, b.y - 30, 46, b.hp / b.maxHpNow(), color);

      // гемы над головой
      if (b.gems > 0) {
        ctx.fillStyle = '#4dd2ff';
        ctx.font = 'bold 14px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText('💎' + b.gems, b.x, b.y - 40);
      }

      // имя (не у игрока)
      if (!b.isPlayer) {
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.font = '12px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText(b.name, b.x, b.y + 32);
      }

      // заряд супера (игрок)
      if (b.isPlayer && b.superCharge >= b.sup.charge) {
        ctx.strokeStyle = '#ffd23f';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }
  }

  function hpBar(x, y, w, frac, color) {
    frac = Math.max(0, Math.min(1, frac));
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    roundRect(x - w / 2 - 2, y - 2, w + 4, 10, 5);
    ctx.fill();
    ctx.fillStyle = color;
    if (frac > 0) {
      roundRect(x - w / 2, y, Math.max(6, w * frac), 6, 3);
      ctx.fill();
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // миникарта
  function drawMinimap(miniCanvas) {
    const mctx = miniCanvas.getContext('2d');
    const mw = miniCanvas.width, mh = miniCanvas.height;
    mctx.fillStyle = 'rgba(0,0,0,.4)';
    mctx.fillRect(0, 0, mw, mh);
    const sx = mw / world.w, sy = mh / world.h;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const c = world.grid[y * MAP_W + x];
        if (c === 1) { mctx.fillStyle = '#7a4a2b'; mctx.fillRect(x * TILE * sx, y * TILE * sy, TILE * sx + 1, TILE * sy + 1); }
      }
    }
    for (const b of world.brawlers) {
      if (!b.alive) continue;
      const isEnemy = b.team !== (player ? player.team : 0);
      if (b.isPlayer) mctx.fillStyle = '#ffd23f';
      else mctx.fillStyle = isEnemy ? '#ff4d6d' : '#4d92ff';
      mctx.fillRect(b.x * sx - 2, b.y * sy - 2, 4, 4);
    }
  }

  return { draw, drawMinimap, resize, canvas };
}
