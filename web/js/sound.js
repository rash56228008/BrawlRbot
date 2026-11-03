// Процедурный звук через WebAudio — без файлов
let ctx = null;
let enabled = true;

export function setSoundEnabled(v) { enabled = v; }

function ac() {
  if (!enabled) return null;
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq = 440, dur = 0.1, type = 'square', vol = 0.15, slide = 0, delay = 0 }) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise({ dur = 0.15, vol = 0.2, delay = 0 }) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const gain = a.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(gain).connect(a.destination);
  src.start(t0);
}

export const SFX = {
  shoot() { tone({ freq: 700, dur: 0.07, type: 'square', vol: 0.08, slide: -300 }); },
  hit() { tone({ freq: 220, dur: 0.08, type: 'sawtooth', vol: 0.12, slide: -80 }); },
  death() { tone({ freq: 300, dur: 0.3, type: 'sawtooth', vol: 0.15, slide: -250 }); },
  boxBreak() { noise({ dur: 0.12, vol: 0.18 }); tone({ freq: 500, dur: 0.1, slide: -200, vol: 0.1 }); },
  super() { tone({ freq: 200, dur: 0.25, type: 'sawtooth', vol: 0.18, slide: 400 }); },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.18, type: 'triangle', vol: 0.16, delay: i * 0.12 }));
  },
  lose() {
    [392, 330, 262].forEach((f, i) => tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.14, delay: i * 0.15 }));
  },
  coin() { tone({ freq: 880, dur: 0.06, type: 'triangle', vol: 0.12 }); tone({ freq: 1320, dur: 0.08, delay: 0.06, type: 'triangle', vol: 0.1 }); },
  goal() { [659, 784, 988].forEach((f, i) => tone({ freq: f, dur: 0.15, type: 'square', vol: 0.15, delay: i * 0.1 })); }
};

// Проигрывание событий боя
export function playBattleEvents(events, sfx) {
  for (const e of events) {
    if (e.type === 'hit' || e.type === 'explosion') sfx.hit();
    else if (e.type === 'death') sfx.death();
    else if (e.type === 'boxBreak') sfx.boxBreak();
    else if (e.type === 'super') sfx.super();
    else if (e.type === 'goal') sfx.goal();
  }
}
