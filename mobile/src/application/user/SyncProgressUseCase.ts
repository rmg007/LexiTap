import type { SyncService } from '@/application/user/SyncService';

// Offline-tolerant sync orchestration. SQLite is the source of truth, so a
// sync failure is a NO-OP (CODING_STANDARDS.md: never a blocking error). The
// use case swallows infra errors and reports outcome without throwing.

export type SyncDirection = 'pull' | 'push';

export interface SyncOutcome {
  pulled: boolean;
  pushed: boolean;
  // Errors are reported, not thrown — the caller may log them, but the quiz
  // path must never be blocked by a failed sync.
  errors: ReadonlyArray<{ direction: SyncDirection; error: unknown }>;
}

export interface SyncProgressInput {
  userId: string;
  sinceCursor: number;
  // Which directions to attempt; defaults to both.
  directions?: readonly SyncDirection[];
}

export class SyncProgressUseCase {
  constructor(private readonly sync: SyncService) {}

  async execute(input: SyncProgressInput): Promise<SyncOutcome> {
    const directions = input.directions ?? (['pull', 'push'] as const);
    const errors: Array<{ direction: SyncDirection; error: unknown }> = [];
    let pulled = false;
    let pushed = false;

    if (directions.includes('pull')) {
      try {
        await this.sync.pull(input.userId);
        pulled = true;
      } catch (error) {
        errors.push({ direction: 'pull', error });
      }
    }

    if (directions.includes('push')) {
      try {
        await this.sync.push(input.userId, input.sinceCursor);
        pushed = true;
      } catch (error) {
        errors.push({ direction: 'push', error });
      }
    }

    return { pulled, pushed, errors };
  }
}
