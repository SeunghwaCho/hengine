/**
 * Web Audio synthesis — no sample files required.
 * Browsers require a user gesture before AudioContext starts producing sound;
 * call ensureCtx() from your first pointer/key handler.
 */
export interface ToneOptions {
  freq: number;
  duration: number; // seconds
  type?: OscillatorType;
  gain?: number; // 0..1
  delay?: number; // seconds
  attack?: number; // seconds
  release?: number; // seconds
}

export interface Note {
  freq: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
}

export class Synth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private _volume = 1;

  /** Lazily create AudioContext. Call from a user-gesture handler. */
  ensureCtx(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this._volume;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  resume(): void {
    if (this.ctx?.state === "suspended") {
      this.ctx.resume().catch(() => {
        /* ignore */
      });
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  setVolume(v: number): void {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this._volume;
  }

  get volume(): number {
    return this._volume;
  }

  /** Play a single oscillator tone with linear attack + exponential release. */
  tone(opts: ToneOptions): void {
    if (this.muted) return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const start = ctx.currentTime + (opts.delay ?? 0);
    const dur = opts.duration;
    const attack = opts.attack ?? 0.005;
    const release = opts.release ?? Math.min(0.05, dur);
    const gain = opts.gain ?? 0.2;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? "sine";
    osc.frequency.value = opts.freq;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain, start + attack);
    g.gain.setValueAtTime(gain, start + Math.max(attack, dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g).connect(this.master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  /** Play a sequence of notes. delay is additive from the start of the call. */
  sequence(notes: readonly Note[]): void {
    for (const n of notes) {
      this.tone({
        freq: n.freq,
        duration: n.duration,
        type: n.type ?? "sine",
        gain: n.gain ?? 0.2,
        delay: n.delay ?? 0,
      });
    }
  }

  /** White-noise burst — useful for hits/explosions. */
  noise(duration: number, gain = 0.15): void {
    if (this.muted) return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const start = ctx.currentTime;
    const length = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(g).connect(this.master);
    src.start(start);
    src.stop(start + duration + 0.02);
  }
}

/** Common note → frequency lookup (equal temperament, A4 = 440 Hz). */
export const NOTE: Readonly<Record<string, number>> = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, B5: 987.77,
  C6: 1046.5,
};
