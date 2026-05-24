/**
 * Tiny structured logger for the CLI. Centralized so `no-console` can be
 * enforced everywhere else (CODING_STANDARDS: console.log is banned outside the
 * logger). Writes diagnostics to stderr so command stdout stays parseable.
 */

export const logger = {
  info(message: string): void {
    console.error(`[info] ${message}`);
  },
  warn(message: string): void {
    console.error(`[warn] ${message}`);
  },
  error(message: string): void {
    console.error(`[error] ${message}`);
  },
  /** Primary command output (counts, reports) goes to stdout. */
  print(message: string): void {
    console.log(message);
  },
};
