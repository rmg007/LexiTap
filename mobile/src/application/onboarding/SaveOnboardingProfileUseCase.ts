import type { UserStatsRepository } from '@/domain/user/UserStats';
import type { OnboardingState } from '@/domain/onboarding/OnboardingState';

// Persists the user's onboarding profile choices (goal, proficiency band,
// frontier rank) to the user_stats.onboarding_state JSON blob. Called once,
// at the end of the onboarding flow, before navigating to Home.
//
// Intentionally thin: serialisation lives in the repository layer
// (SQLiteUserStatsRepository) so the use case stays pure and testable.
export class SaveOnboardingProfileUseCase {
  constructor(private readonly statsRepo: UserStatsRepository) {}

  async execute(state: OnboardingState): Promise<void> {
    await this.statsRepo.saveOnboardingProfile(state);
  }
}
