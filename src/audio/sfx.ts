/**
 * Synthesized sound effects (Web Audio). No audio files. Silent until the
 * user enables sound; the context is created lazily on first use.
 */
export type SfxName =
  | 'deal'
  | 'tick'
  | 'correct'
  | 'wrong'
  | 'combo'
  | 'break'
  | 'shuffle'
  | 'level'
  | 'flip'
  | 'click';

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  enabled = false;

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (on) this.ensure();
  }

  private ensure(): AudioContext | null {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    }
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.32;
    this.master.connect(this.ctx.destination);
    const len = Math.floor(this.ctx.sampleRate * 0.5);
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return this.ctx;
  }

  play(name: SfxName): void {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + 0.005;
    switch (name) {
      case 'deal':
        return this.noise(t, 0.045, 2800, 1.2, 0.5);
      case 'flip':
        return this.noise(t, 0.06, 1800, 0.8, 0.35);
      case 'tick':
        return this.tone(t, 1250, 0.03, 'sine', 0.18);
      case 'click':
        return this.tone(t, 900, 0.025, 'triangle', 0.15);
      case 'correct':
        this.tone(t, 659.25, 0.12, 'triangle', 0.35);
        return this.tone(t + 0.07, 987.77, 0.18, 'triangle', 0.3);
      case 'wrong':
        this.sweep(t, 220, 120, 0.22, 'sine', 0.45);
        return this.noise(t, 0.08, 400, 0.7, 0.2);
      case 'combo':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          this.tone(t + i * 0.055, f, 0.14, 'triangle', 0.26),
        );
        return;
      case 'break':
        this.sweep(t, 600, 140, 0.45, 'sawtooth', 0.12);
        return this.noise(t, 0.3, 1200, 0.6, 0.25);
      case 'shuffle':
        for (let i = 0; i < 16; i++) this.noise(t + i * 0.028, 0.02, 3200, 1.5, 0.22);
        return;
      case 'level':
        [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          this.tone(t + i * 0.08, f, 0.32, 'triangle', 0.24),
        );
        return;
    }
  }

  private tone(t: number, freq: number, dur: number, type: OscillatorType, vol: number): void {
    const ctx = this.ctx as AudioContext;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master as GainNode);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private sweep(
    t: number,
    f0: number,
    f1: number,
    dur: number,
    type: OscillatorType,
    vol: number,
  ): void {
    const ctx = this.ctx as AudioContext;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master as GainNode);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(t: number, dur: number, freq: number, q: number, vol: number): void {
    const ctx = this.ctx as AudioContext;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src
      .connect(f)
      .connect(g)
      .connect(this.master as GainNode);
    src.start(t, Math.random() * 0.3);
    src.stop(t + dur + 0.01);
  }
}
