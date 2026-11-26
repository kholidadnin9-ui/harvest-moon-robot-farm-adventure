/* Web Audio synthesizer: sound effects, cheerful background music and countryside ambience (no audio files). */

let ctx: AudioContext | null = null;
let enabled = true;

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.18, slideTo?: number) {
  const c = ac();
  if (!c || !enabled) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  const t0 = c.currentTime + start;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(start: number, dur: number, vol = 0.12, freq = 1200, q = 0.8) {
  const c = ac();
  if (!c || !enabled) return;
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(c.destination);
  src.start(c.currentTime + start);
}

/** voiced sound with vibrato + low-pass (animal calls) */
function voice(f0: number, f1: number, dur: number, type: OscillatorType, vol: number, vibHz = 0, vibAmt = 0, start = 0, cutoff = 1400) {
  const c = ac();
  if (!c || !enabled) return;
  const t0 = c.currentTime + start;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.linearRampToValueAtTime(f1, t0 + dur);
  if (vibHz) {
    const l = c.createOscillator();
    const lg = c.createGain();
    l.frequency.value = vibHz;
    lg.gain.value = vibAmt;
    l.connect(lg).connect(o.frequency);
    l.start(t0);
    l.stop(t0 + dur + 0.05);
  }
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = cutoff;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.06);
  g.gain.setValueAtTime(vol, t0 + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(f).connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export const sfx = {
  click() {
    tone(660, 0, 0.06, "square", 0.05);
  },
  plant() {
    tone(300, 0, 0.1, "triangle", 0.15, 180);
    noise(0.02, 0.12, 0.06, 500);
  },
  water() {
    noise(0, 0.35, 0.1, 2200);
    tone(900, 0.05, 0.25, "sine", 0.05, 1400);
  },
  harvest() {
    tone(520, 0, 0.08, "triangle", 0.16, 780);
    tone(780, 0.08, 0.12, "triangle", 0.16, 1040);
    tone(1040, 0.18, 0.18, "sine", 0.12);
  },
  feed() {
    tone(420, 0, 0.08, "square", 0.06);
    tone(520, 0.09, 0.08, "square", 0.06);
  },
  coin() {
    tone(1318, 0, 0.09, "square", 0.08);
    tone(1760, 0.08, 0.2, "square", 0.08);
  },
  pickup() {
    tone(988, 0, 0.07, "triangle", 0.12);
    tone(1319, 0.07, 0.16, "triangle", 0.12);
  },
  jump() {
    tone(300, 0, 0.18, "sine", 0.12, 720);
  },
  land() {
    noise(0, 0.09, 0.09, 260, 0.6);
    tone(120, 0, 0.08, "sine", 0.1, 70);
  },
  step(surface: number) {
    // 0 grass, 1 dirt path, 2 wood, 3 water
    if (surface === 2) tone(170 + Math.random() * 30, 0, 0.06, "triangle", 0.07, 110);
    else if (surface === 3) noise(0, 0.12, 0.06, 1500, 0.7);
    else noise(0, 0.05, surface === 1 ? 0.045 : 0.03, surface === 1 ? 700 : 420 + Math.random() * 120, 1.2);
  },
  search() {
    noise(0, 0.2, 0.08, 800);
    noise(0.25, 0.2, 0.08, 900);
    noise(0.5, 0.2, 0.08, 1000);
    tone(500, 0.75, 0.12, "triangle", 0.1, 900);
  },
  card() {
    noise(0, 0.35, 0.08, 1600);
    tone(600, 0.3, 0.25, "sine", 0.12, 1200);
  },
  rare() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.3, "triangle", 0.14));
    tone(1568, 0.4, 0.5, "sine", 0.08);
  },
  epic() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.35, "triangle", 0.15));
    tone(2093, 0.45, 0.7, "sine", 0.08);
    noise(0.4, 0.5, 0.05, 3000);
  },
  legendary() {
    [392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, i * 0.1, 0.45, "triangle", 0.16));
    [784, 1047, 1319].forEach((f, i) => tone(f, 0.8 + i * 0.05, 1.1, "sine", 0.1));
    noise(0.7, 0.9, 0.06, 4000);
  },
  mission() {
    [659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.25, "square", 0.07));
    tone(1319, 0.32, 0.5, "triangle", 0.14);
  },
  levelUp() {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.11, 0.3, "triangle", 0.15));
    tone(1568, 0.8, 0.9, "sine", 0.12);
  },
  splash() {
    noise(0, 0.4, 0.14, 900);
    tone(200, 0, 0.3, "sine", 0.1, 90);
  },
  bite() {
    tone(880, 0, 0.08, "square", 0.1);
    tone(880, 0.12, 0.08, "square", 0.1);
  },
  error() {
    tone(220, 0, 0.15, "sawtooth", 0.06, 160);
  },
  travel() {
    tone(440, 0, 0.12, "triangle", 0.1, 660);
    tone(660, 0.12, 0.2, "triangle", 0.1, 880);
  },
  push() {
    noise(0, 0.45, 0.12, 180, 0.5);
    tone(90, 0, 0.4, "sawtooth", 0.05, 70);
  },
  thud() {
    tone(110, 0, 0.25, "sine", 0.22, 45);
    noise(0, 0.2, 0.14, 200, 0.5);
  },
  fall() {
    tone(620, 0, 0.3, "square", 0.08, 160);
    noise(0.28, 0.16, 0.14, 300, 0.6);
    tone(100, 0.28, 0.15, "sine", 0.16, 60);
  },
  key() {
    [1319, 1568, 2093].forEach((f, i) => tone(f, i * 0.07, 0.2, "triangle", 0.12));
  },
  gate() {
    tone(180, 0, 0.5, "sawtooth", 0.06, 320);
    noise(0.1, 0.4, 0.07, 500, 2);
    tone(784, 0.45, 0.25, "triangle", 0.1);
  },
  chest() {
    noise(0, 0.15, 0.1, 400, 1.5);
    [523, 784, 1047].forEach((f, i) => tone(f, 0.12 + i * 0.08, 0.25, "triangle", 0.12));
  },
  button() {
    tone(200, 0, 0.08, "square", 0.1, 120);
    tone(90, 0.15, 0.7, "sawtooth", 0.07, 60);
    noise(0.15, 0.7, 0.1, 160, 0.5);
  },
  cut() {
    noise(0, 0.12, 0.14, 2600, 1.2);
    noise(0.1, 0.18, 0.1, 900, 0.8);
  },
  swing() {
    noise(0, 0.14, 0.07, 1800, 0.9);
  },
  moo() {
    voice(150, 118, 0.85, "sawtooth", 0.13, 5, 4, 0, 700);
  },
  baa() {
    voice(330, 300, 0.55, "sawtooth", 0.09, 13, 28, 0, 1500);
  },
  bleat() {
    voice(420, 380, 0.42, "square", 0.06, 17, 34, 0, 1800);
  },
  cluck() {
    [0, 0.11, 0.2, 0.36].forEach((t, i) => voice(i === 3 ? 760 : 560, i === 3 ? 520 : 640, 0.07, "square", 0.06, 0, 0, t, 2400));
  },
};

/* ---------------- background music (scheduled loop) ---------------- */
const N: Record<string, number> = { A2: 110, C3: 130.8, E3: 164.8, F3: 174.6, G3: 196, C5: 523.3, D5: 587.3, E5: 659.3, F5: 698.5, G5: 784, A5: 880, C6: 1046.5, D6: 1174.7, E6: 1318.5 };
const MEL = "E5 G5 C6 G5 E5 G5 A5 G5 F5 A5 C6 A5 F5 A5 G5 E5 E5 G5 C6 E6 D6 C6 A5 G5 F5 E5 D5 G5 C5 - E5 G5".split(" ");
const BASS = "C3 G3 C3 G3 F3 C3 F3 C3 C3 G3 A2 E3 F3 G3 C3 G3".split(" ");
const STEP = 0.21;
let musicTimer: number | null = null;
let nextT = 0;
let stepI = 0;
let birdT = 0;
let forestMood = false;

function schedule() {
  const c = ac();
  if (!c || !enabled) return;
  if (nextT < c.currentTime) nextT = c.currentTime + 0.05;
  while (nextT < c.currentTime + 0.35) {
    const s = nextT - c.currentTime;
    const m = MEL[stepI % MEL.length];
    if (m !== "-") tone(N[m] * (forestMood ? 0.75 : 1), s, 0.19, "triangle", 0.03);
    if (stepI % 2 === 0) tone(N[BASS[(stepI / 2) % BASS.length]], s, 0.3, "sine", 0.05);
    if (stepI % 2 === 1) noise(s, 0.03, 0.008, 6000, 1);
    if (stepI % 8 === 4) tone(N[BASS[Math.floor(stepI / 2) % BASS.length]] * 2, s, 0.16, "triangle", 0.02);
    stepI++;
    nextT += STEP;
  }
  // countryside birds
  birdT -= 0.1;
  if (birdT <= 0) {
    birdT = 4 + Math.random() * 6;
    const f = 2200 + Math.random() * 1400;
    for (let i = 0; i < 3; i++) tone(f + i * 180, i * 0.09 + Math.random() * 0.02, 0.07, "sine", 0.018, f * 1.25);
  }
}

export const music = {
  start() {
    if (musicTimer !== null || !enabled) return;
    if (!ac()) return;
    nextT = 0;
    musicTimer = window.setInterval(schedule, 100);
  },
  stop() {
    if (musicTimer !== null) window.clearInterval(musicTimer);
    musicTimer = null;
    ambient.setWater(0);
  },
  setForest(v: boolean) {
    forestMood = v;
  },
};

/* ---------------- ambience: flowing water ---------------- */
let waterGain: GainNode | null = null;
export const ambient = {
  setWater(level: number) {
    const c = ctx;
    if (!c) return;
    if (!waterGain) {
      if (level <= 0 || !enabled) return;
      const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < d.length; i++) {
        last = last * 0.86 + (Math.random() * 2 - 1) * 0.14;
        d[i] = last * 3;
      }
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 900;
      f.Q.value = 0.4;
      waterGain = c.createGain();
      waterGain.gain.value = 0;
      src.connect(f).connect(waterGain).connect(c.destination);
      src.start();
    }
    waterGain.gain.setTargetAtTime(enabled ? Math.max(0, Math.min(1, level)) * 0.07 : 0, c.currentTime, 0.4);
  },
};

export function setSoundEnabled(v: boolean) {
  enabled = v;
  if (!v) {
    music.stop();
    ambient.setWater(0);
  }
}
