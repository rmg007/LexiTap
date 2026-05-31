import type { TierId, SessionId } from '@/domain/vocabulary/ids';
import type { Word } from '@/domain/vocabulary/Word';
import type { WordRepository } from '@/domain/vocabulary/WordRepository';
import type { UserProgressRepository } from '@/domain/user/UserProgressRepository';
import type { QuizSessionRepository } from '@/domain/quiz/repositories';
import type { QuizMode, QuizSession } from '@/domain/quiz/types';
import type { AnalyticsPort } from '@/domain/analytics/AnalyticsPort';
import { NoWordsAvailableError } from '@/domain/quiz/errors';
import {
  FORGIVENESS,
  effectiveDailyCap,
  selectReviewQueue,
  type DueWord,
} from '@/domain/srs/forgiveness';

// Orchestrates session creation. Review mode applies the forgiveness daily cap
// (a pure read-time selector — it never writes next_review_date). Learn mode
// pulls a fresh-word batch. All I/O goes through injected ports.

export interface StartQuizInput {
  tierId: TierId;
  mode: QuizMode;
  nowMs: number;
  tz: string;
}

export class StartQuizUseCase {
  constructor(
    private readonly words: WordRepository,
    private readonly progress: UserProgressRepository,
    private readonly sessions: QuizSessionRepository,
    private readonly analytics: AnalyticsPort,
  ) {}

  async execute(input: StartQuizInput): Promise<QuizSession> {
    const { tierId, mode, nowMs, tz } = input;

    const selected =
      mode === 'review'
        ? await this.selectReviewWords(tierId, nowMs, tz)
        : await this.words.getNewWords(tierId, FORGIVENESS.NEW_WORDS_PER_DAY);

    if (selected.length === 0) {
      throw new NoWordsAvailableError(tierId, mode);
    }

    const draft: QuizSession = {
      // Placeholder id; the repo assigns the real autoincrement SessionId.
      id: 0 as SessionId,
      tierId,
      mode,
      words: selected,
      currentIndex: 0,
      correctCount: 0,
      startedAt: nowMs,
    };

    const id = await this.sessions.save(draft);
    const session = { ...draft, id };

    this.analytics.track('session_started', {
      sessionId: session.id,
      tierId,
      mode,
      wordCount: selected.length,
    });

    return session;
  }

  private async selectReviewWords(tierId: TierId, nowMs: number, tz: string): Promise<Word[]> {
    const dueCount = await this.progress.countDue(tierId, nowMs);
    const cap = effectiveDailyCap(dueCount);

    // Fetch the due set (capped at the hard ceiling to bound the read), then
    // run the deterministic forgiveness selection over it.
    const dueWithProgress = await this.words.getWordsDueForReview(
      tierId,
      FORGIVENESS.HARD_SESSION_CEILING,
    );

    const dueWords: DueWord[] = dueWithProgress.map((wp) => ({
      wordId: wp.word.id,
      masteryLevel: wp.progress.masteryLevel,
      nextReviewDate: wp.progress.nextReviewDate,
    }));

    // Preserve the selector's deterministic order while returning full Words.
    // DueWord.wordId is a plain string, so key the lookup by string.
    const byId = new Map<string, Word>(
      dueWithProgress.map((wp) => [wp.word.id, wp.word] as const),
    );
    return selectReviewQueue(dueWords, nowMs, tz, cap)
      .map((d) => byId.get(d.wordId))
      .filter((w): w is Word => w !== undefined);
  }
}
