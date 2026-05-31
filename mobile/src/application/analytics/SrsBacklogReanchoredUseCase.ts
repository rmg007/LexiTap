import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';

// Emits srs_backlog_reanchored when the SRS catch-up window (freeze forgiveness)
// resets the last_activity anchor. Used to track freeze-recovery behavior.

export interface SrsBacklogReanchoredInput {
  previousAnchorDate: number | null;
  newAnchorDate: number;
  frozeCount: number;
}

export class SrsBacklogReanchoredUseCase {
  constructor(private readonly analytics: AnalyticsPort) {}

  async execute(input: SrsBacklogReanchoredInput): Promise<void> {
    this.analytics.track('srs_backlog_reanchored', {
      previous_anchor_date: input.previousAnchorDate ?? null,
      new_anchor_date: input.newAnchorDate,
      freezes_count: input.frozeCount,
    });
  }
}
