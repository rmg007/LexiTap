import { AnalyticsOptOutUseCase } from './AnalyticsOptOutUseCase';
import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';

describe('AnalyticsOptOutUseCase', () => {
  let mockAnalytics: jest.Mocked<AnalyticsPort>;
  let useCase: AnalyticsOptOutUseCase;

  beforeEach(() => {
    mockAnalytics = { track: jest.fn() } as unknown as jest.Mocked<AnalyticsPort>;
    useCase = new AnalyticsOptOutUseCase(mockAnalytics);
  });

  it('emits analytics_opt_out when user opts out', async () => {
    await useCase.execute({ optedOut: true });

    expect(mockAnalytics.track).toHaveBeenCalledWith('analytics_opt_out', {
      opted_out: true,
    });
  });

  it('emits analytics_opt_out when user opts in', async () => {
    await useCase.execute({ optedOut: false });

    expect(mockAnalytics.track).toHaveBeenCalledWith('analytics_opt_out', {
      opted_out: false,
    });
  });
});
