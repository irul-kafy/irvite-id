/**
 * Web Audio API — Balinese Pelog Selisir Rindik & Gender Wayang Synthesizer
 * Recreates the soothing bamboo Rindik & Gender Wayang shimmer melody from Swarga Dewata.
 */

export class BalineseRindikSynth {
  private audioCtx: AudioContext | null = null;
  private isPlaying = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private step = 0;

  // Pelog Selisir 5-tone scale (Ding, Dong, Deng, Dung, Dang) in Hz
  private readonly selisirScale = [
    277.18, // Ding (C#4)
    311.13, // Dong (D#4)
    369.99, // Deng (F#4)
    415.30, // Dung (G#4)
    466.16, // Dang (A#4)
    554.37, // Ding (C#5)
    622.25, // Dong (D#5)
    739.99, // Deng (F#5)
  ];

  private readonly kotekanPattern = [0, 2, 4, 5, 4, 2, 3, 1, 0, 4, 6, 5];

  private initAudio(): void {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
  }

  private playRindikNote(freq: number, duration = 2.6, volume = 0.045): void {
    if (!this.audioCtx || !this.isPlaying) return;
    const now = this.audioCtx.currentTime;

    // Pengumbang & Pengisep (Balinese paired tuning shimmer ~4.5Hz beat)
    const osc1 = this.audioCtx.createOscillator();
    const osc2 = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq + 4.2, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  }

  public start(): boolean {
    this.initAudio();
    if (!this.audioCtx) return false;
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }
    this.isPlaying = true;
    if (this.intervalId) clearInterval(this.intervalId);

    this.step = 0;
    const noteIdx =
      this.kotekanPattern[this.step % this.kotekanPattern.length];
    this.playRindikNote(this.selisirScale[noteIdx], 2.8, 0.045);

    this.intervalId = setInterval(() => {
      if (!this.isPlaying) return;
      const idx = this.kotekanPattern[this.step % this.kotekanPattern.length];
      this.playRindikNote(this.selisirScale[idx], 2.8, 0.045);
      if (this.step % 4 === 0) {
        // Deep Kempur / Gong accent
        this.playRindikNote(this.selisirScale[0] * 0.5, 4.5, 0.06);
      }
      this.step++;
    }, 680);

    return true;
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    }
    return this.start();
  }
}

