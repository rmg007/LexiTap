// Domain port. Implemented in infrastructure/analytics. Use cases depend on
// this interface — never on a concrete SDK — so analytics is swappable and
// test-doubles are trivial.
export interface AnalyticsPort {
  // Fire-and-forget: best-effort telemetry. Implementations must never throw.
  // Async to support opt-out checks (PostHogAnalyticsService checks the opt-out
  // flag before capture). Noop implementations can return resolved promises.
  track(event: string, properties?: Record<string, unknown>): void | Promise<void>;
}
