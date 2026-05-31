import type { StreakState } from '@/domain/gamification/streak';
import type { OnboardingState } from '@/domain/onboarding/OnboardingState';

// Aggregate user statistics surfaced on the Home/progress screens. Streak and
// freeze state is owned by the gamification StreakState; this composes it with
// session/mastery totals (DATA_MODELS.md UserStats).

export interface UserStats {
  streak: StreakState;
  totalSessions: number;
  totalWordsMastered: number;
  onboardingState?: OnboardingState;
}

export interface UserStatsRepository {
  get(): Promise<UserStats | null>;
  save(stats: UserStats): Promise<void>;
  saveOnboardingProfile(state: OnboardingState): Promise<void>;
}
