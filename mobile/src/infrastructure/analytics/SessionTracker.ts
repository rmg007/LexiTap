// Tracks per-session metrics: start time and lesson count.
// Instantiated once in the container; reset on each app foreground cycle.
export class SessionTracker {
  private startMs: number = Date.now();
  private _lessonCount: number = 0;

  start(): void {
    this.startMs = Date.now();
    this._lessonCount = 0;
  }

  incrementLesson(): void {
    this._lessonCount++;
  }

  end(): { durationMs: number; lessonCount: number } {
    return {
      durationMs: Date.now() - this.startMs,
      lessonCount: this._lessonCount,
    };
  }
}
