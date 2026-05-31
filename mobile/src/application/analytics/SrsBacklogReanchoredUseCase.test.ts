import { SrsBacklogReanchoredUseCase } from './SrsBacklogReanchoredUseCase';
import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';

describe('SrsBacklogReanchoredUseCase', () => {
  let mockAnalytics: jest.Mocked<AnalyticsPort>;
  let useCase: SrsBacklogReanchoredUseCase;

  beforeEach(() => {
    mockAnalytics = { track: jest.fn() } as unknown as jest.Mocked<AnalyticsPort>;
    useCase = new SrsBacklogReanchoredUseCase(mockAnalytics);
  });

  it('emits srs_backlog_reanchored with anchor dates', async () => {
    await useCase.execute({
      previousAnchorDate: 20260101,
      newAnchorDate: 20260131,
      frozeCount: 1,
    });

    expect(mockAnalytics.track).toHaveBeenCalledWith('srs_backlog_reanchored', {
      previous_anchor_date: 20260101,
      new_anchor_date: 20260131,
      freezes_count: 1,
    });
  });

  it('handles null previous anchor date', async () => {
    await useCase.execute({
      previousAnchorDate: null,
      newAnchorDate: 20260131,
      frozeCount: 0,
    });

    expect(mockAnalytics.track).toHaveBeenCalledWith('srs_backlog_reanchored', {
      previous_anchor_date: null,
      new_anchor_date: 20260131,
      freezes_count: 0,
    });
  });
});
