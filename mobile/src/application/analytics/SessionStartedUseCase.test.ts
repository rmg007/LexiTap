import { SessionStartedUseCase } from './SessionStartedUseCase';
import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';
import type { UserStatsRepository } from '@/domain/user/UserStats';

describe('SessionStartedUseCase', () => {
  let mockAnalytics: jest.Mocked<AnalyticsPort>;
  let mockStats: jest.Mocked<UserStatsRepository>;
  let useCase: SessionStartedUseCase;

  beforeEach(() => {
    mockAnalytics = { track: jest.fn() } as unknown as jest.Mocked<AnalyticsPort>;
    mockStats = {
      get: jest.fn(),
      upsert: jest.fn(),
    } as unknown as jest.Mocked<UserStatsRepository>;

    useCase = new SessionStartedUseCase(mockAnalytics, mockStats);
  });

  it('emits session_started with app version and days since install', async () => {
    (mockStats.get as jest.Mock).mockResolvedValue({
      totalSessions: 5,
    });

    await useCase.execute({ appVersion: '0.1.0', daysSinceInstall: 10 });

    expect(mockAnalytics.track).toHaveBeenCalledWith('session_started', {
      app_version: '0.1.0',
      days_since_install: 10,
      total_sessions: 5,
      is_first_open: false,
    });
  });

  it('marks is_first_open=true on first launch', async () => {
    (mockStats.get as jest.Mock).mockResolvedValue(null);

    await useCase.execute({ appVersion: '0.1.0', daysSinceInstall: 0 });

    expect(mockAnalytics.track).toHaveBeenCalledWith('session_started', {
      app_version: '0.1.0',
      days_since_install: 0,
      total_sessions: 0,
      is_first_open: true,
    });
  });

  it('handles null stats gracefully', async () => {
    (mockStats.get as jest.Mock).mockResolvedValue(null);

    await useCase.execute({ appVersion: '0.1.0', daysSinceInstall: 0 });

    expect(mockAnalytics.track).toHaveBeenCalledWith('session_started', expect.objectContaining({ total_sessions: 0 }));
  });
});
