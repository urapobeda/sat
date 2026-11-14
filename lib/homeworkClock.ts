/** Accumulates visible time per question; persisted seconds are the initial base. */
export class HomeworkClock {
  private totals = new Map<string, number>();
  private active: string | null = null;
  private since: number | null = null;
  private now: () => number;
  constructor(saved: Record<string, number | null> = {}, now = () => performance.now()) {
    this.now = now;
    for (const [id, seconds] of Object.entries(saved)) if (seconds !== null) this.totals.set(id, seconds * 1000);
  }
  capture() {
    if (this.active && this.since !== null) {
      const at = this.now();
      this.totals.set(this.active, (this.totals.get(this.active) ?? 0) + Math.max(0, at - this.since));
      this.since = at;
    }
    return this.active;
  }
  enter(id: string, visible = true) { this.pause(); this.active = id; this.since = visible ? this.now() : null; }
  pause() { const id = this.capture(); this.since = null; return id; }
  resume() { if (this.active && this.since === null) this.since = this.now(); }
  seconds(id: string) { return Math.floor((this.totals.get(id) ?? 0) / 1000); }
}
