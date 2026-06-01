import { SessionCompletedUseCase } from './SessionCompletedUseCase';
import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';

describe('SessionCompletedUseCase', () => {
  let mockAnalytics: jest.Mocked<AnalyticsPort>;
  let useCase: SessionCompletedUseCase;

  beforeEach(() => {
    mockAnalytics = { track: jest.fn() } as unknown as jest.Mocked<AnalyticsPort>;
    useCase = new SessionCompletedUseCase(mockAnalytics);
  });

  it('emits session_completed with duration_sec and lesson_count', async () => {
    await useCase.execute({ durationMs: 300000, lessonCount: 3 });

    expect(mockAnalytics.track).toHaveBeenCalledWith('session_completed', {
      duration_sec: 300,
      lesson_count: 3,
    });
  });

  it('rounds duration to nearest second', async () => {
    await useCase.execute({ durationMs: 90500, lessonCount: 1 });

    expect(mockAnalytics.track).toHaveBeenCalledWith('session_completed', {
      duration_sec: 91,
      lesson_count: 1,
    });
  });

  it('handles zero duration and no lessons', async () => {
    await useCase.execute({ durationMs: 0, lessonCount: 0 });

    expect(mockAnalytics.track).toHaveBeenCalledWith('session_completed', {
      duration_sec: 0,
      lesson_count: 0,
    });
  });
});
