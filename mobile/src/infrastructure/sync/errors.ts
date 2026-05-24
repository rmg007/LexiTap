// Typed infrastructure error for sync failures. The SyncService port is
// offline-tolerant: the adapter THROWS this on any network/Supabase failure and
// never crashes the app — callers (application layer) catch it and continue
// offline. A distinct class lets callers branch on `instanceof` without parsing
// messages.
export class SyncError extends Error {
  constructor(
    message: string,
    // The originating cause (network error, Supabase error object) for logging.
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SyncError';
    // Restore prototype chain for instanceof across the TS->ES5 target gap.
    Object.setPrototypeOf(this, SyncError.prototype);
  }
}
