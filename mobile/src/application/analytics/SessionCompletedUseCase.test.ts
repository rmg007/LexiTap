import { SessionCompletedUseCase } from './SessionCompletedUseCase';
import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';

describe('SessionCompletedUseCase', () => {
  let mockAnalytics: jest.Mocked<AnalyticsPort>;
  let useCase: SessionCompletedUseCase;

  beforeEach(() => {
    mockAnalytics = { track: jest.fn() } as unknown as jest.Mocked<AnalyticsPort>;
    useCase = new SessionCompletedUseCase(mockAnalytics);
  });

  it('emits session_completed with duration', async () => {
    await useCase.execute({ durationMs: 300000 });

    expect(mockAnalytics.track).toHaveBeenCalledWith('session_completed', {
      duration_ms: 300000,
    });
  });

  it('handles zero duration', async () => {
    await useCase.execute({ durationMs: 0 });

    expect(mockAnalytics.track).toHaveBeenCalledWith('session_completed', { duration_ms: 0 });
  });
});
