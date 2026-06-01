import { StreakEventUseCase } from './StreakEventUseCase';
import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';

describe('StreakEventUseCase', () => {
  let mockAnalytics: jest.Mocked<AnalyticsPort>;
  let useCase: StreakEventUseCase;

  beforeEach(() => {
    mockAnalytics = { track: jest.fn() } as unknown as jest.Mocked<AnalyticsPort>;
    useCase = new StreakEventUseCase(mockAnalytics);
  });

  it('emits streak_event with event_type=incremented', async () => {
    await useCase.execute({ event: 'incremented', newStreak: 5, longestStreak: 10 });

    expect(mockAnalytics.track).toHaveBeenCalledWith('streak_event', {
      event_type: 'incremented',
      current_streak: 5,
      longest_streak: 10,
    });
  });

  it('emits streak_event with event_type=broken', async () => {
    await useCase.execute({ event: 'broken', newStreak: 0, longestStreak: 10 });

    expect(mockAnalytics.track).toHaveBeenCalledWith('streak_event', {
      event_type: 'broken',
      current_streak: 0,
      longest_streak: 10,
    });
  });
});
