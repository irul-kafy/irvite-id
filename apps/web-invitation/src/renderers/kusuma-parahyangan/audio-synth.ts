/**
 * Web Audio API — Sundanese Laras Degung Pentatonic Kacapi Synthesizer
 * Produces authentic plucked string harmonics using triangle wave oscillators
 * and exponential decay envelopes.
 */

export class SundaneseKecapiSynth {
  private audioCtx: AudioContext | null = null;
  private isPlaying = false;
  private loopInterval: ReturnType<typeof setInterval> | null = null;
  private noteIndex = 0;

  // Laras Degung pentatonic frequencies (Hz): Da, Mi, Na, Ti, La across octaves
  private readonly degungScale = [
    293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99,
  ];

  // Melodic sequence pattern
  private readonly melodyPattern = [0, 2, 3, 4, 2, 5, 4, 3, 1, 0, 2, 4];

  public start(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!AudioCtxClass) return false;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
      }

      if (this.audioCtx.state === 'suspended') {
        void this.audioCtx.resume();
      }

      this.isPlaying = true;

      if (this.loopInterval) {
        clearInterval(this.loopInterval);
      }

      this.loopInterval = setInterval(() => {
        if (!this.isPlaying || !this.audioCtx) return;
        const noteIdx = this.melodyPattern[this.noteIndex % this.melodyPattern.length];
        this.playKecapiNote(this.degungScale[noteIdx]);
        this.noteIndex++;
      }, 620);

      return true;
    } catch {
      this.isPlaying = false;
      return false;
    }
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
  }

  public toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      return this.start();
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private playKecapiNote(freq: number): void {
    if (!this.audioCtx || !this.isPlaying) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.075, now + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 1.6);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 1.65);
    } catch {
      // Ignore audio synthesis errors on tab sleep
    }
  }
}

