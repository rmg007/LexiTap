// Domain port. Implemented in infrastructure/analytics. Use cases depend on
// this interface — never on a concrete SDK — so analytics is swappable and
// test-doubles are trivial.
export interface AnalyticsPort {
  // Fire-and-forget: best-effort telemetry. Implementations must never throw.
  track(event: string, properties?: Record<string, unknown>): void;
}
