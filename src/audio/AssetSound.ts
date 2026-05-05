/**
 * Sample-based audio playback. Decodes audio files into AudioBuffer
 * and plays them via AudioBufferSourceNode (one-shot or looped).
 */
export interface PlayOptions {
  volume?: number;
  loop?: boolean;
  /** Playback rate (1 = normal). Negative not supported. */
  rate?: number;
}

export class AssetSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private muted = false;

  ensureCtx(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
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

  setMasterVolume(v: number): void {
    if (this.master) this.master.gain.value = Math.max(0, Math.min(1, v));
  }

  /** Fetch and decode an audio file under a given key. */
  async load(key: string, url: string): Promise<void> {
    const ctx = this.ensureCtx();
    if (!ctx) throw new Error("AudioContext unavailable");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`audio fetch failed: ${url} (${res.status})`);
    const arrayBuffer = await res.arrayBuffer();
    const buf = await ctx.decodeAudioData(arrayBuffer);
    this.buffers.set(key, buf);
  }

  has(key: string): boolean {
    return this.buffers.has(key);
  }

  /** Play a one-shot sample. Returns the source node so the caller can stop()/disconnect() if needed. */
  play(key: string, opts: PlayOptions = {}): AudioBufferSourceNode | null {
    if (this.muted) return null;
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return null;
    const buf = this.buffers.get(key);
    if (!buf) return null;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = opts.loop ?? false;
    src.playbackRate.value = opts.rate ?? 1;

    const g = ctx.createGain();
    g.gain.value = opts.volume ?? 1;
    src.connect(g).connect(this.master);
    src.start();
    return src;
  }
}
