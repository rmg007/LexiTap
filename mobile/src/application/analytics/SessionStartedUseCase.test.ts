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

  it('emits session_started with core session fields', async () => {
    (mockStats.get as jest.Mock).mockResolvedValue({ totalSessions: 5 });

    await useCase.execute({ appVersion: '0.1.0', daysSinceInstall: 10, platform: 'ios' });

    expect(mockAnalytics.track).toHaveBeenCalledWith('session_started', {
      app_version: '0.1.0',
      platform: 'ios',
      days_since_install: 10,
      total_sessions: 5,
      is_first_open: false,
    });
  });

  it('includes onboarding_goal and frontier_rank when onboarding is complete', async () => {
    (mockStats.get as jest.Mock).mockResolvedValue({
      totalSessions: 3,
      onboardingState: { goal: 'exam', frontierRank: 2500, completedAt: 1000 },
    });

    await useCase.execute({ appVersion: '0.1.0', daysSinceInstall: 2, platform: 'ios' });

    expect(mockAnalytics.track).toHaveBeenCalledWith('session_started', {
      app_version: '0.1.0',
      platform: 'ios',
      days_since_install: 2,
      total_sessions: 3,
      is_first_open: false,
      onboarding_goal: 'exam',
      frontier_rank: 2500,
    });
  });

  it('omits onboarding_goal and frontier_rank when onboardingState absent', async () => {
    (mockStats.get as jest.Mock).mockResolvedValue({ totalSessions: 1 });

    await useCase.execute({ appVersion: '0.1.0', daysSinceInstall: 0, platform: 'ios' });

    const call = (mockAnalytics.track as jest.Mock).mock.calls[0]![1] as Record<string, unknown>;
    expect(call).not.toHaveProperty('onboarding_goal');
    expect(call).not.toHaveProperty('frontier_rank');
  });

  it('marks is_first_open=true on first launch', async () => {
    (mockStats.get as jest.Mock).mockResolvedValue(null);

    await useCase.execute({ appVersion: '0.1.0', daysSinceInstall: 0, platform: 'android' });

    expect(mockAnalytics.track).toHaveBeenCalledWith('session_started', {
      app_version: '0.1.0',
      platform: 'android',
      days_since_install: 0,
      total_sessions: 0,
      is_first_open: true,
    });
  });

  it('handles null stats gracefully', async () => {
    (mockStats.get as jest.Mock).mockResolvedValue(null);

    await useCase.execute({ appVersion: '0.1.0', daysSinceInstall: 0, platform: 'ios' });

    expect(mockAnalytics.track).toHaveBeenCalledWith('session_started', expect.objectContaining({ total_sessions: 0 }));
  });
});
