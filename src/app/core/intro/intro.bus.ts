import { Injectable } from '@angular/core';

/**
 * Coordinates the one-shot opening between the page intro overlay and the
 * hero WebGL stage.
 *
 * The home component runs the greeting → wordmark preloader and, the moment
 * its curtain starts lifting, calls {@link lift}. The hero stage awaits
 * {@link lifted} before it begins auto-playing the rave→phone reveal — so the
 * reveal plays as the curtain rises instead of finishing hidden behind it.
 *
 * `providedIn: 'root'` → one instance shared by both components. Browser-only
 * in practice (both callers run inside `afterNextRender`).
 */
@Injectable({ providedIn: 'root' })
export class IntroBus {
  private resolve!: () => void;
  private done = false;

  /** Resolves when the intro curtain starts lifting (or immediately if skipped). */
  readonly lifted = new Promise<void>((r) => (this.resolve = r));

  /** Idempotent — safe to call from every choreography branch. */
  lift(): void {
    if (this.done) return;
    this.done = true;
    this.resolve();
  }
}
