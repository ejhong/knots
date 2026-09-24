/**
 * Breath: the one voluntary handle on the autonomic system.
 *
 * A deep inspiration reflexly constricts skin arterioles within about two
 * seconds (the inspiratory gasp reflex; Bolton, Carmichael & Stürup 1936);
 * a slow exhale lets them open. `sympathetic` is the resulting drive on the
 * skin's vessels: positive after an inhale, negative through the exhale.
 *
 * Paced by default at resonance (~6 breaths a minute: 4 s in, 6 s out), or
 * driven by hand (hold to inhale, release to exhale).
 */
export type BreathPhase = 'inhale' | 'hold' | 'exhale' | 'rest';

export class Breath {
  /** 0 empty … 1 full. */
  volume = 0.3;
  phase: BreathPhase = 'exhale';
  /** Smoothed sympathetic effect on skin vessels, −1 … +1. */
  sympathetic = 0;
  paced = true;
  inhaleSeconds = 4;
  exhaleSeconds = 6;
  /** Manual control: true while the user holds the breath key. */
  private manualInhale = false;
  private t = 0;
  /** Inhale-and-hold: the prediction that pressure then fails to release. */
  holding = false;

  setManual(inhaling: boolean) {
    this.paced = false;
    this.manualInhale = inhaling;
  }

  setPaced(on: boolean) {
    this.paced = on;
  }

  /** True while the breath permits release: the out-breath. */
  get permits(): boolean {
    return this.phase === 'exhale' && !this.holding;
  }

  /** How strongly the exhale is opening vessels right now (0 … 1). */
  get openness(): number {
    return Math.max(0, -this.sympathetic);
  }

  update(dt: number) {
    let target: number;
    if (this.holding) {
      this.phase = 'hold';
      target = 1;
    } else if (this.paced) {
      const cycle = this.inhaleSeconds + this.exhaleSeconds;
      this.t = (this.t + dt) % cycle;
      if (this.t < this.inhaleSeconds) {
        this.phase = 'inhale';
        const k = this.t / this.inhaleSeconds;
        target = 0.5 - 0.5 * Math.cos(Math.PI * k);
      } else {
        this.phase = 'exhale';
        const k = (this.t - this.inhaleSeconds) / this.exhaleSeconds;
        target = 0.5 + 0.5 * Math.cos(Math.PI * k);
      }
      this.volume = target;
    } else {
      this.phase = this.manualInhale ? 'inhale' : this.volume > 0.05 ? 'exhale' : 'rest';
      const rate = this.manualInhale ? 1 / this.inhaleSeconds : -1 / this.exhaleSeconds;
      this.volume = Math.min(1, Math.max(0, this.volume + rate * dt));
      target = this.volume;
    }
    // Reflex: constriction follows the inhale with ~2 s lag; the exhale opens.
    const drive = this.phase === 'inhale' || this.phase === 'hold' ? 0.4 + 0.6 * this.volume : -0.9;
    const k = 1 - Math.exp(-dt / (drive > this.sympathetic ? 1.6 : 2.4));
    this.sympathetic += (drive - this.sympathetic) * k;
  }
}
