import { SaveOnboardingProfileUseCase } from '@/application/onboarding/SaveOnboardingProfileUseCase';
import type { UserStatsRepository, UserStats } from '@/domain/user/UserStats';
import type { OnboardingState } from '@/domain/onboarding/OnboardingState';

// The use case is a thin pass-through to the repository; these tests pin that
// contract so a future refactor can't silently drop the persistence call.
function makeRepo(): {
  repo: UserStatsRepository;
  saved: OnboardingState[];
} {
  const saved: OnboardingState[] = [];
  const repo: UserStatsRepository = {
    get: async (): Promise<UserStats | null> => null,
    save: async (): Promise<void> => undefined,
    saveOnboardingProfile: async (state: OnboardingState): Promise<void> => {
      saved.push(state);
    },
  };
  return { repo, saved };
}

describe('SaveOnboardingProfileUseCase', () => {
  it('persists the onboarding state verbatim via the repository', async () => {
    const { repo, saved } = makeRepo();
    const useCase = new SaveOnboardingProfileUseCase(repo);
    const state: OnboardingState = {
      goal: 'exam',
      band: 'B1',
      frontierRank: 2000,
      completedAt: 1717200000000,
    };

    await useCase.execute(state);

    expect(saved).toHaveLength(1);
    expect(saved[0]).toEqual(state);
  });

  it('forwards a minimal state (only completedAt)', async () => {
    const { repo, saved } = makeRepo();
    const useCase = new SaveOnboardingProfileUseCase(repo);

    await useCase.execute({ completedAt: 42 });

    expect(saved[0]).toEqual({ completedAt: 42 });
  });

  it('propagates repository write failures to the caller', async () => {
    const repo: UserStatsRepository = {
      get: async (): Promise<UserStats | null> => null,
      save: async (): Promise<void> => undefined,
      saveOnboardingProfile: async (): Promise<void> => {
        throw new Error('disk full');
      },
    };
    const useCase = new SaveOnboardingProfileUseCase(repo);

    await expect(useCase.execute({ completedAt: 1 })).rejects.toThrow('disk full');
  });
});
