/**
 * High-Fidelity Studio-Grade Web Audio Synthesizer for ExamGuard Pro.
 * Produces warm, harmonics-layered institutional acoustic chimes with zero external assets,
 * zero latency, zero zero-crossing clicks, and dynamic low-pass resonance filters.
 */

export type SoundAlertTheme = 'success' | 'error' | 'warning' | 'info' | 'commence';

class ProfessionalSoundService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('examguard_sound_muted');
        this.isMuted = stored === 'true';
      } catch {
        this.isMuted = false;
      }
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  public setSoundMuted(muted: boolean): void {
    this.isMuted = muted;
    try {
      localStorage.setItem('examguard_sound_muted', muted ? 'true' : 'false');
    } catch {}
  }

  /**
   * Helper to play a harmonics-rich acoustic bell or chime tone.
   */
  private playHarmonicNote(
    ctx: AudioContext,
    startTime: number,
    fundamentalFreq: number,
    duration: number,
    peakGain: number = 0.12,
    filterCutoff: number = 2400
  ): void {
    // 1. Master filter for warm, non-piercing institutional presence
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterCutoff, startTime);
    filter.Q.setValueAtTime(1.2, startTime);
    filter.connect(ctx.destination);

    // 2. Fundamental oscillator (pure warm sine)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(fundamentalFreq, startTime);

    const gain1 = ctx.createGain();
    // Click-free soft attack (4ms)
    gain1.gain.setValueAtTime(0.0001, startTime);
    gain1.gain.linearRampToValueAtTime(peakGain, startTime + 0.006);
    // Smooth natural exponential decay
    gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(gain1);
    gain1.connect(filter);

    // 3. Harmonic overtone oscillator (+1 octave, delicate 30% intensity for glass/bell resonance)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(fundamentalFreq * 2, startTime);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.0001, startTime);
    gain2.gain.linearRampToValueAtTime(peakGain * 0.32, startTime + 0.008);
    gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.75);

    osc2.connect(gain2);
    gain2.connect(filter);

    // Start and stop
    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.02);
    osc2.stop(startTime + duration + 0.02);
  }

  /**
   * Helper to play a warm, rounded wooden-resonance damped thud for errors/warnings.
   */
  private playDampedThud(
    ctx: AudioContext,
    startTime: number,
    freq: number,
    duration: number,
    peakGain: number = 0.14
  ): void {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(520, startTime);
    filter.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.75, startTime + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(filter);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  /**
   * Plays a crisp, executive-grade audio cue tailored to each institutional event.
   */
  public playAlertBeep(type: SoundAlertTheme = 'info'): void {
    if (this.isMuted) return;

    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      switch (type) {
        case 'success': {
          // Executive Double Glass Chime: E5 (659.25Hz) -> A5 (880Hz)
          // Crisp, warm, reassuring, feels like an Apple/macOS ratification sound
          this.playHarmonicNote(ctx, now, 659.25, 0.22, 0.11, 2800);
          this.playHarmonicNote(ctx, now + 0.09, 880.0, 0.42, 0.13, 3200);
          break;
        }

        case 'error': {
          // Dignified Low Damped Tone: Two soft sub-bass frequencies (185Hz -> 146Hz)
          // Authoritative and clear without being annoying or harsh
          this.playDampedThud(ctx, now, 185, 0.16, 0.14);
          this.playDampedThud(ctx, now + 0.08, 146.83, 0.24, 0.12);
          break;
        }

        case 'warning': {
          // Warm Marimba Double-Tap: F#4 (369.99Hz) -> A#4 (466.16Hz)
          // Alerting, distinct, elegant
          this.playHarmonicNote(ctx, now, 369.99, 0.18, 0.11, 1800);
          this.playHarmonicNote(ctx, now + 0.07, 466.16, 0.28, 0.12, 2000);
          break;
        }

        case 'commence': {
          // Formal Academic Inauguration Arpeggio:
          // Three rising harmonic bells: C5 (523.25Hz) -> G5 (783.99Hz) -> C6 (1046.5Hz)
          // Resonant and prestigious for examination launch
          this.playHarmonicNote(ctx, now, 523.25, 0.35, 0.09, 2600);
          this.playHarmonicNote(ctx, now + 0.09, 783.99, 0.45, 0.11, 3000);
          this.playHarmonicNote(ctx, now + 0.18, 1046.5, 0.75, 0.14, 3600);
          break;
        }

        case 'info':
        default: {
          // Velvet Micro-Chime: G5 (783.99Hz) with smooth overtone
          // Subtle, modern, unobtrusive
          this.playHarmonicNote(ctx, now, 783.99, 0.25, 0.09, 2400);
          break;
        }
      }
    } catch {
      // Audio autoplay policy may prevent playback before first interaction
    }
  }
}

export const soundService = new ProfessionalSoundService();
export const playAlertBeep = (type: SoundAlertTheme = 'info') =>
  soundService.playAlertBeep(type);
