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
  play(name, gap = 0.09) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    if (now - (this.lastPlayed.get(name) ?? -1) < gap) return;
    this.lastPlayed.set(name, now);

    switch (name) {
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
      case 'win': {
        const notes = [523, 659, 784, 1047, 784, 1047, 1319];
        notes.forEach((f, i) => this.tone(f, i === notes.length - 1 ? 0.7 : 0.16, { type: 'square', gain: 0.12, delay: i * 0.13 }));
        notes.forEach((f, i) => this.tone(f / 2, 0.16, { type: 'triangle', gain: 0.1, delay: i * 0.13 }));
        break;
      }
    }
  }
}
