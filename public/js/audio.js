// Tiny synthesised sound effects (Web Audio) — no audio files needed.

const STORAGE_KEY = 'derby-muted';

export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.lastPlayed = new Map();
    try {
      this.muted = localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      this.muted = false;
    }
  }

  /** Must be called from a click/key handler: browsers block audio until then. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    try {
      localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
    } catch {
      /* private mode: just don't remember it */
    }
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  tone(freq, duration, { type = 'square', gain = 0.12, slide = 0, delay = 0 } = {}) {
    const ctx = this.ctx;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), start + duration);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(amp).connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  noise(duration, { gain = 0.2, cutoff = 900, delay = 0 } = {}) {
    const ctx = this.ctx;
    const start = ctx.currentTime + delay;
    const frames = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const amp = ctx.createGain();
    amp.gain.value = gain;
    source.connect(filter).connect(amp).connect(this.master);
    source.start(start);
  }

  /** Plays a named effect. The same effect is not repeated within `gap` seconds. */
  play(name, gap = 0.09, arg = 0) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    if (now - (this.lastPlayed.get(name) ?? -1) < gap) return;
    this.lastPlayed.set(name, now);

    switch (name) {
      case 'tick':
        this.tone(680, 0.04, { type: 'sine', gain: 0.05, slide: 140 });
        break;
      case 'switch':
        this.tone(520, 0.07, { type: 'triangle', gain: 0.07 });
        this.tone(780, 0.09, { type: 'triangle', gain: 0.07, delay: 0.055 });
        break;
      case 'count':
        this.tone(440, 0.18, { gain: 0.16 });
        break;
      case 'go':
        this.tone(880, 0.5, { gain: 0.18 });
        this.tone(1320, 0.5, { gain: 0.08, type: 'triangle' });
        break;
      case 'pickup':
        this.tone(660, 0.07, { type: 'triangle', gain: 0.1 });
        this.tone(990, 0.09, { type: 'triangle', gain: 0.1, delay: 0.06 });
        break;
      case 'boost':
        this.tone(220, 0.35, { type: 'sawtooth', gain: 0.07, slide: 500 });
        break;
      case 'shield':
        this.tone(520, 0.25, { type: 'sine', gain: 0.12, slide: 400 });
        break;
      case 'block':
        this.tone(900, 0.12, { type: 'triangle', gain: 0.12, slide: -300 });
        break;
      case 'throw':
        this.tone(700, 0.22, { type: 'sawtooth', gain: 0.06, slide: -450 });
        break;
      case 'hit':
        this.tone(170, 0.2, { type: 'square', gain: 0.1, slide: -90 });
        break;
      case 'fall':
        this.tone(500, 0.5, { type: 'sine', gain: 0.12, slide: -420 });
        break;
      case 'loop':
        for (let i = 0; i < 4; i++) this.tone(400 + (i % 2) * 150, 0.1, { type: 'triangle', gain: 0.08, delay: i * 0.1 });
        break;
      case 'null':
        this.tone(1200, 0.06, { gain: 0.06 });
        this.tone(90, 0.3, { gain: 0.1, delay: 0.05 });
        break;
      case 'explode':
        this.noise(0.5, { gain: 0.35, cutoff: 700 });
        this.tone(110, 0.4, { type: 'sawtooth', gain: 0.12, slide: -70 });
        break;
      case 'lead':
        this.tone(784, 0.1, { type: 'triangle', gain: 0.08 });
        this.tone(1047, 0.14, { type: 'triangle', gain: 0.08, delay: 0.09 });
        break;
      case 'bell':
        // Ding ding: the ring bell, twice.
        for (const delay of [0, 0.32]) {
          this.tone(1568, 1.1, { type: 'sine', gain: 0.14, delay });
          this.tone(2350, 0.7, { type: 'triangle', gain: 0.05, delay });
        }
        break;
      case 'frag':
        this.noise(0.18, { gain: 0.22, cutoff: 1400 });
        this.tone(190, 0.14, { type: 'sawtooth', gain: 0.1, slide: -120 });
        break;
      case 'chat':
        this.tone(880, 0.05, { type: 'sine', gain: 0.04, slide: 180 });
        break;
      case 'rollback':
        this.tone(660, 0.16, { type: 'sawtooth', gain: 0.12, slide: -380 });
        this.tone(440, 0.28, { type: 'square', gain: 0.1, slide: 260, delay: 0.16 });
        break;
      case 'clawWhir':
        this.tone(180, 0.22, { type: 'sawtooth', gain: 0.05, slide: 60 });
        break;
      case 'clawDrop':
        this.noise(0.28, { gain: 0.14, cutoff: 1800 });
        this.tone(360, 0.25, { type: 'triangle', gain: 0.07, slide: -180 });
        break;
      case 'clawSlip':
        this.tone(820, 0.32, { type: 'sine', gain: 0.11, slide: -540 });
        break;
      case 'clawClank':
        this.tone(920, 0.09, { type: 'square', gain: 0.12, slide: -400 });
        this.noise(0.1, { gain: 0.16, cutoff: 2200, delay: 0.02 });
        break;
      case 'clawWin':
        this.tone(523, 0.12, { type: 'square', gain: 0.12, delay: 0 });
        this.tone(659, 0.12, { type: 'square', gain: 0.12, delay: 0.12 });
        this.tone(1047, 0.32, { type: 'square', gain: 0.14, delay: 0.24 });
        break;
      case 'plinkoPeg': {
        const pitch = 520 + Math.max(0, Math.min(1, Number(arg) || 0)) * 460;
        this.tone(pitch, 0.035, { type: 'triangle', gain: 0.06, slide: 60 });
        break;
      }
      case 'plinkoBumper':
        this.tone(320, 0.14, { type: 'sawtooth', gain: 0.11, slide: 340 });
        break;
      case 'plinkoWarp':
        this.tone(240, 0.36, { type: 'sine', gain: 0.1, slide: 680 });
        break;
      case 'plinkoFlip':
        this.tone(420, 0.06, { type: 'square', gain: 0.09, slide: 180 });
        break;
      case 'plinkoWin':
        this.tone(1318, 0.55, { type: 'sine', gain: 0.16 });
        this.tone(1760, 0.5, { type: 'triangle', gain: 0.1, delay: 0.08 });
        this.tone(2093, 0.65, { type: 'sine', gain: 0.12, delay: 0.18 });
        break;
      case 'freezeTick':
        this.tone(660, 0.09, { type: 'square', gain: 0.09, slide: 180 });
        break;
      case 'freezeWarn':
        this.tone(540, 0.14, { type: 'sawtooth', gain: 0.1, slide: 240 });
        break;
      case 'freezeRed':
        this.tone(140, 0.35, { type: 'sawtooth', gain: 0.14, slide: -40 });
        break;
      case 'freezeZap':
        this.tone(1100, 0.16, { type: 'sawtooth', gain: 0.13, slide: -850 });
        this.noise(0.14, { gain: 0.18, cutoff: 1800, delay: 0.02 });
        break;
      case 'freezeWin':
        this.tone(523, 0.14, { type: 'square', gain: 0.12, delay: 0 });
        this.tone(659, 0.14, { type: 'square', gain: 0.12, delay: 0.12 });
        this.tone(784, 0.14, { type: 'square', gain: 0.12, delay: 0.24 });
        this.tone(1047, 0.45, { type: 'square', gain: 0.14, delay: 0.36 });
        break;
      case 'launchBeep':
        this.tone(880, 0.14, { type: 'sine', gain: 0.13 });
        break;
      case 'launchRoar':
        this.noise(1.1, { gain: 0.28, cutoff: 650 });
        this.tone(120, 0.7, { type: 'sawtooth', gain: 0.12, slide: 180 });
        break;
      case 'launchWhistle':
        this.tone(940, 0.42, { type: 'sine', gain: 0.1, slide: -660 });
        break;
      case 'launchPop':
        this.noise(0.16, { gain: 0.22, cutoff: 1800 });
        this.tone(260, 0.12, { type: 'triangle', gain: 0.11, slide: -140 });
        break;
      case 'launchOrbit':
        this.tone(440, 0.4, { type: 'triangle', gain: 0.12, delay: 0 });
        this.tone(554, 0.4, { type: 'triangle', gain: 0.12, delay: 0.08 });
        this.tone(659, 0.65, { type: 'sine', gain: 0.14, delay: 0.16 });
        break;
      case 'jengaScrape':
        this.noise(0.28, { gain: 0.16, cutoff: 950 });
        this.tone(180, 0.34, { type: 'sawtooth', gain: 0.08, slide: 110 });
        break;
      case 'jengaSiren':
        this.tone(860, 0.16, { type: 'square', gain: 0.11, slide: 240, delay: 0 });
        this.tone(860, 0.16, { type: 'square', gain: 0.11, slide: 240, delay: 0.22 });
        break;
      case 'jengaHeartbeat':
        this.tone(72, 0.16, { type: 'sine', gain: 0.2, slide: -24, delay: 0 });
        this.tone(64, 0.18, { type: 'sine', gain: 0.16, slide: -18, delay: 0.18 });
        break;
      case 'jengaCollapse':
        this.tone(110, 0.75, { type: 'sine', gain: 0.26, slide: -72 });
        this.noise(0.65, { gain: 0.24, cutoff: 1400, delay: 0.05 });
        this.tone(320, 0.1, { type: 'triangle', gain: 0.11, delay: 0.18 });
        this.tone(240, 0.12, { type: 'triangle', gain: 0.11, delay: 0.32 });
        break;
      case 'jengaFall':
        this.tone(780, 0.36, { type: 'sine', gain: 0.09, slide: -540 });
        break;
      case 'jengaWin':
        this.tone(523, 0.13, { type: 'triangle', gain: 0.13, delay: 0 });
        this.tone(659, 0.13, { type: 'triangle', gain: 0.13, delay: 0.11 });
        this.tone(784, 0.13, { type: 'triangle', gain: 0.13, delay: 0.22 });
        this.tone(1047, 0.5, { type: 'triangle', gain: 0.15, delay: 0.33 });
        break;
      case 'cannonFuse':
        this.noise(0.55, { gain: 0.1, cutoff: 4200 });
        break;
      case 'cannonBoom':
        this.tone(115, 0.28, { type: 'sine', gain: 0.24, slide: -75 });
        this.noise(0.22, { gain: 0.2, cutoff: 750 });
        break;
      case 'cannonWhistle':
        this.tone(860, 0.38, { type: 'sine', gain: 0.08, slide: -480 });
        break;
      case 'cannonSquawk':
        this.tone(1280, 0.12, { type: 'sawtooth', gain: 0.1, slide: -320, delay: 0 });
        this.tone(1160, 0.14, { type: 'sawtooth', gain: 0.09, slide: -380, delay: 0.12 });
        break;
      case 'cannonSplash':
        this.noise(0.32, { gain: 0.18, cutoff: 1300 });
        this.tone(240, 0.18, { type: 'sine', gain: 0.1, slide: -150 });
        break;
      case 'cannonBullseye':
        this.tone(880, 0.28, { type: 'triangle', gain: 0.16, delay: 0 });
        this.tone(1108, 0.22, { type: 'triangle', gain: 0.14, delay: 0.12 });
        this.tone(1318, 0.55, { type: 'sine', gain: 0.16, delay: 0.24 });
        break;
      case 'golfPutt':
        this.tone(240, 0.08, { type: 'triangle', gain: 0.15, slide: -90 });
        this.noise(0.04, { gain: 0.08, cutoff: 1800 });
        break;
      case 'golfClack':
        this.tone(680, 0.05, { type: 'triangle', gain: 0.11, slide: -220 });
        break;
      case 'golfBumper':
        this.tone(540, 0.12, { type: 'sine', gain: 0.14, slide: 280 });
        break;
      case 'golfSand':
        this.noise(0.18, { gain: 0.1, cutoff: 2600 });
        break;
      case 'golfSplash':
        this.noise(0.28, { gain: 0.16, cutoff: 1400 });
        this.tone(280, 0.14, { type: 'sine', gain: 0.09, slide: -160 });
        break;
      case 'golfCup':
        this.tone(720, 0.06, { type: 'square', gain: 0.09, delay: 0 });
        this.tone(540, 0.06, { type: 'square', gain: 0.09, delay: 0.06 });
        this.tone(880, 0.22, { type: 'triangle', gain: 0.15, delay: 0.14 });
        this.tone(1108, 0.22, { type: 'triangle', gain: 0.14, delay: 0.25 });
        this.tone(1318, 0.5, { type: 'sine', gain: 0.16, delay: 0.36 });
        break;
      case 'tumbaThrow':
        this.noise(0.14, { gain: 0.14, cutoff: 1900 });
        this.tone(420, 0.12, { type: 'triangle', gain: 0.11, slide: -210 });
        break;
      case 'tumbaClang':
        // Bright metallic TING-KLANG-KLANG tin can bounce resonances
        this.tone(1480, 0.14, { type: 'square', gain: 0.11, slide: -120, delay: 0 });
        this.tone(1920, 0.12, { type: 'triangle', gain: 0.12, delay: 0.06 });
        this.tone(1620, 0.1, { type: 'square', gain: 0.09, delay: 0.16 });
        this.tone(1340, 0.08, { type: 'triangle', gain: 0.08, delay: 0.26 });
        break;
      case 'tumbaRestore':
        this.tone(980, 0.09, { type: 'square', gain: 0.12, delay: 0 });
        this.tone(740, 0.18, { type: 'sawtooth', gain: 0.11, slide: 420, delay: 0.08 });
        break;
      case 'tumbaTag':
        this.tone(587, 0.14, { type: 'triangle', gain: 0.14, delay: 0 });
        this.tone(880, 0.14, { type: 'triangle', gain: 0.15, delay: 0.1 });
        this.tone(1174, 0.35, { type: 'sine', gain: 0.16, delay: 0.2 });
        break;
      case 'karangClack':
        // Hollow bamboo woodblock clack
        this.tone(620, 0.045, { type: 'triangle', gain: 0.12, slide: -140 });
        this.noise(0.025, { gain: 0.07, cutoff: 2400 });
        break;
      case 'karangSnap':
        // Crisp dry bamboo SNAP + comedic slide-whistle tumble
        this.noise(0.08, { gain: 0.18, cutoff: 3600 });
        this.tone(920, 0.32, { type: 'sine', gain: 0.1, slide: -640, delay: 0.05 });
        break;
      case 'karangWin':
        this.tone(659, 0.14, { type: 'triangle', gain: 0.15, delay: 0 });
        this.tone(880, 0.14, { type: 'triangle', gain: 0.15, delay: 0.1 });
        this.tone(1318, 0.42, { type: 'sine', gain: 0.16, delay: 0.2 });
        break;
      case 'win': {
        const notes = [523, 659, 784, 1047, 784, 1047, 1319];
        notes.forEach((f, i) => this.tone(f, i === notes.length - 1 ? 0.7 : 0.16, { type: 'square', gain: 0.12, delay: i * 0.13 }));
        notes.forEach((f, i) => this.tone(f / 2, 0.16, { type: 'triangle', gain: 0.1, delay: i * 0.13 }));
        break;
      }
    }
  }
}
