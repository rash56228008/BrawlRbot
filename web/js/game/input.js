// Управление: джойстик слева, кнопки атаки/супера справа (тач + мышь)
export function createInput({ onMove, onAim, onAttack, onSuper, onDragSuper, joystickFixed, joystickSize }) {
  const state = {
    joyActive: false,
    joyId: null,
    joyBaseX: 0, joyBaseY: 0,     // центр джойстика
    joyX: 0, joyY: 0,             // текущий стик
    joyDX: 0, joyDY: 0,           // нормированный вектор (-1..1)
    aimActive: false,
    aimId: null,
    aimX: 0, aimY: 0,
    superAim: false,              // режим прицеливания супера (тап по супер-кнопке → показ прицела)
    el: null
  };

  function createElements() {
    const wrap = document.createElement('div');
    wrap.className = 'battle-controls';
    wrap.innerHTML = `
      <div class="joystick" id="joy">
        <div class="joy-base"><div class="joy-stick"></div></div>
      </div>
      <div class="attack-zone" id="attackZone">
        <button class="btn-attack" id="btnAttack"><span class="ammo-dots"></span></button>
        <button class="btn-super" id="btnSuper" hidden></button>
      </div>
      <div class="aim-line" id="aimLine" hidden></div>
    `;
    document.body.appendChild(wrap);
    state.el = wrap;

    const joy = wrap.querySelector('#joy');
    const joyBase = wrap.querySelector('.joy-base');
    const stick = wrap.querySelector('.joy-stick');
    const attackZone = wrap.querySelector('#attackZone');
    const btnAttack = wrap.querySelector('#btnAttack');
    const btnSuper = wrap.querySelector('#btnSuper');
    const aimLine = wrap.querySelector('#aimLine');

    const size = joystickSize || 110;
    joyBase.style.width = joyBase.style.height = size + 'px';

    // ===== Джойстик =====
    function joyStart(x, y) {
      state.joyActive = true;
      if (!joystickFixed) {
        state.joyBaseX = x; state.joyBaseY = y;
        joyBase.style.left = (x - size / 2) + 'px';
        joyBase.style.top = (y - size / 2) + 'px';
        joyBase.classList.add('floating');
      }
      joyMove(x, y);
    }
    function joyMove(x, y) {
      let dx = x - state.joyBaseX, dy = y - state.joyBaseY;
      const max = size / 2 - 10;
      const len = Math.hypot(dx, dy);
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      state.joyDX = dx / max; state.joyDY = dy / max;
      stick.style.transform = `translate(${dx}px, ${dy}px)`;
      if (len > 12) onMove(state.joyDX, state.joyDY);
      else onMove(0, 0);
    }
    function joyEnd() {
      state.joyActive = false;
      state.joyDX = state.joyDY = 0;
      stick.style.transform = 'translate(0,0)';
      onMove(0, 0);
      if (!joystickFixed) {
        joyBase.classList.remove('floating');
        joyBase.style.left = ''; joyBase.style.top = '';
      }
    }

    // позиции фиксированного джойстика
    function getFixedBase() {
      const r = joyBase.getBoundingClientRect();
      if (joyBase.classList.contains('floating')) {
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    // ===== Тачи =====
    function isJoyArea(x, y) {
      // левая треть экрана — джойстик
      return x < window.innerWidth * 0.45;
    }

    wrap.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const x = e.clientX, y = e.clientY;
      if (e.target === btnAttack || e.target === btnSuper || btnAttack.contains(e.target) || btnSuper.contains(e.target)) return;
      if (isJoyArea(x, y) && !state.joyActive) {
        state.joyId = e.pointerId;
        const base = getFixedBase();
        state.joyBaseX = base.x; state.joyBaseY = base.y;
        joyStart(x, y);
      }
      wrap.setPointerCapture && e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId);
    });

    wrap.addEventListener('pointermove', (e) => {
      if (e.pointerId === state.joyId) {
        joyMove(e.clientX, e.clientY);
      }
    });

    function pointerUp(e) {
      if (e.pointerId === state.joyId) {
        state.joyId = null;
        joyEnd();
      }
    }
    wrap.addEventListener('pointerup', pointerUp);
    wrap.addEventListener('pointercancel', pointerUp);

    // ===== Кнопка атаки: тап = автоаим, зажатие = прицел =====
    let attackHold = null;
    let attackMoved = false;
    let attackStartX = 0, attackStartY = 0;

    btnAttack.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      attackHold = { t: Date.now() };
      attackMoved = false;
      attackStartX = e.clientX; attackStartY = e.clientY;
      state.aimId = e.pointerId;
      state.aimActive = true;
      btnAttack.setPointerCapture(e.pointerId);
    });

    btnAttack.addEventListener('pointermove', (e) => {
      if (!state.aimActive || e.pointerId !== state.aimId) return;
      const dx = e.clientX - attackStartX, dy = e.clientY - attackStartY;
      if (Math.hypot(dx, dy) > 14) attackMoved = true;
      if (attackMoved) {
        // прицеливание из кнопки: вектор от кнопки
        const r = btnAttack.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const ang = Math.atan2(e.clientY - cy, e.clientX - cx);
        state.aimX = e.clientX; state.aimY = e.clientY;
        state.aimAngle = ang;
        onAim(ang, true);
        showAimLine(cx, cy, ang);
      }
    });

    btnAttack.addEventListener('pointerup', (e) => {
      if (e.pointerId !== state.aimId) return;
      state.aimActive = false;
      state.aimId = null;
      hideAimLine();
      if (!attackMoved) {
        // тап: автоаим — атака по последнему прицелу
        onAttack(null);
      } else if (state.aimAngle != null) {
        onAttack(state.aimAngle);
      }
      state.aimAngle = null;
    });

    // ===== Супер-кнопка =====
    let superHold = false, superMoved = false, superStart = { x: 0, y: 0 };
    btnSuper.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      superHold = true; superMoved = false;
      superStart = { x: e.clientX, y: e.clientY };
      btnSuper.setPointerCapture(e.pointerId);
    });
    btnSuper.addEventListener('pointermove', (e) => {
      if (!superHold) return;
      if (Math.hypot(e.clientX - superStart.x, e.clientY - superStart.y) > 14) superMoved = true;
      if (superMoved) {
        const r = btnSuper.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const ang = Math.atan2(e.clientY - cy, e.clientX - cx);
        state.aimX = e.clientX; state.aimY = e.clientY;
        onAim(ang, false);
        onDragSuper(ang, { x: e.clientX, y: e.clientY });
        showAimLine(cx, cy, ang, true);
      }
    });
    btnSuper.addEventListener('pointerup', (e) => {
      if (!superHold) return;
      superHold = false;
      hideAimLine();
      const r = btnSuper.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const ang = superMoved ? Math.atan2(e.clientY - cy, e.clientX - cx) : null;
      onSuper(ang, superMoved ? { x: e.clientX, y: e.clientY } : null);
    });

    function showAimLine(x, y, ang, isSuper) {
      aimLine.hidden = false;
      aimLine.className = 'aim-line' + (isSuper ? ' super' : '');
      const len = 160;
      aimLine.style.left = x + 'px';
      aimLine.style.top = y + 'px';
      aimLine.style.width = len + 'px';
      aimLine.style.transform = `rotate(${ang}rad)`;
    }
    function hideAimLine() { aimLine.hidden = true; }

    return { wrap, joy, btnAttack, btnSuper, aimLine, setAmmo, setSuperReady };

    function setAmmo(ammo, max) {
      const dots = btnAttack.querySelector('.ammo-dots');
      dots.innerHTML = '';
      for (let i = 0; i < max; i++) {
        const d = document.createElement('span');
        d.className = 'dot' + (i < ammo ? ' full' : '');
        dots.appendChild(d);
      }
      btnAttack.classList.toggle('empty', ammo === 0);
    }
    function setSuperReady(ready) {
      btnSuper.hidden = !ready;
    }
  }

  const els = createElements();

  return {
    state,
    destroy() { if (state.el && state.el.parentNode) state.el.parentNode.removeChild(state.el); },
    setAmmo: els.setAmmo,
    setSuperReady: els.setSuperReady,
    getAimAngle() { return state.aimAngle; }
  };
}
