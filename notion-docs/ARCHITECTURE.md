# Architecture - Clean and Domain-Driven

---
title: Architecture - Clean and Domain-Driven
category: agent-docs
status: active
phase: 1
priority: P0
updated: 2026-05-22
load_order: 4
tags: [architecture, hexagonal, domain-driven, clean-architecture, layers, dependency-injection, testing, reusability]
---

> Load order: 4 of 14. Load when touching new components or layers. Pairs with AGENTS_MOBILE_CONVENTIONS.md.

---

## Architecture Principles

**1. Domain-Driven Design**

- Business logic in domain entities
- No React, no UI in domain layer
- Repositories for persistence abstraction

**2. Hexagonal Architecture**

- Core logic independent of UI, DB, external services
- Dependencies point inward
- Frameworks are replaceable

**3. SOLID Principles**

- Single Responsibility
- Open/Closed
- Liskov Substitution
- Interface Segregation
- Dependency Inversion

---

## Layer Structure

```
┌─────────────────────────────────────┐
│      Domain (Core Logic)          │
│  - SpacedRepetition algorithm    │
│  - Mastery scoring               │
│  - Quiz session orchestration    │
└─────────────┬────────────────────────┘
         │
  ┌──────┼──────┐
  │            │
┌─┴─────┐   ┌─┴─────┐
│ Ports  │   │ Ports  │
│ (Input)│   │(Output)│
└─┬─────┘   └─┬─────┘
  │            │
┌─┴─────┐   ┌─┴─────┐
│Adapters│   │Adapters│
│React UI│   │ SQLite │
│  CLI   │   │  IAP    │
└────────┘   └────────┘
```

---

## Domain Layer (100% Reusable)

**No dependencies on React, SQLite, or UI.**

### Key Entities

**QuizSession.ts:**

```tsx
export class QuizSession {
  constructor(
    public id: string,
    public tierId: string,
    public words: Word[],
    public currentIndex: number = 0,
    public correctCount: number = 0
  ) {}

  get currentWord(): Word {
    return this.words[this.currentIndex];
  }

  get isComplete(): boolean {
    return this.currentIndex >= this.words.length;
  }

  answerQuestion(isCorrect: boolean): QuizResult {
    if (isCorrect) this.correctCount++;
    this.currentIndex++;
    
    return {
      isCorrect,
      totalCorrect: this.correctCount,
      isSessionComplete: this.isComplete
    };
  }
}
```

**SpacedRepetition.ts:**

```tsx
export class SpacedRepetition {
  static calculateNextReviewDate(
    masteryLevel: number,
    isCorrect: boolean
  ): Date {
    const intervals = [1, 3, 7, 14, 30];
    
    let newMastery = isCorrect 
      ? Math.min(masteryLevel + 1, 5) 
      : Math.max(masteryLevel - 1, 0);
    
    const days = intervals[newMastery] || 1;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);
    
    return nextDate;
  }
}
```

---

## Application Layer (Use Cases)

**Orchestrates domain entities.**

**StartQuizUseCase.ts:**

```tsx
export class StartQuizUseCase {
  constructor(
    private wordRepo: WordRepository,
    private sessionRepo: QuizSessionRepository
  ) {}

  async execute(
    tierId: string,
    mode: 'review' | 'learn'
  ): Promise<QuizSession> {
    const words = mode === 'review'
      ? await this.wordRepo.getWordsDueForReview(tierId, 20)
      : await this.wordRepo.getNewWords(tierId, 10);
    
    if (words.length === 0) {
      throw new NoWordsAvailableError(tierId, mode);
    }
    
    const session = new QuizSession(
      generateId(),
      tierId,
      words
    );
    
    await this.sessionRepo.save(session);
    return session;
  }
}
```

---

## Infrastructure Layer

**Concrete implementations of repositories.**

**SQLiteWordRepository.ts:**

```tsx
export class SQLiteWordRepository implements WordRepository {
  constructor(private db: Database) {}

  async getWordsDueForReview(
    tierId: string,
    limit: number
  ): Promise<Word[]> {
    const now = Date.now();
    return this.db.query(`
      SELECT w.*, p.mastery_level
      FROM words w
      JOIN user_progress p ON w.id = p.word_id
      WHERE w.tier_id = ?
        AND p.next_review_date <= ?
      ORDER BY p.next_review_date ASC
      LIMIT ?
    `, [tierId, now, limit]);
  }
}
```

---

## Presentation Layer (ESL-Specific)

**React Native UI components.**

**QuizScreen.tsx:**

```tsx
import { StartQuizUseCase } from '@/application/quiz';
import { TIER_CONFIG } from '@/config/tiers';

export function QuizScreen({ route }) {
  const { tierId } = route.params;
  const tierConfig = TIER_CONFIG[tierId];
  
  const [session, setSession] = useState<QuizSession | null>(null);
  
  useEffect(() => {
    const startQuiz = new StartQuizUseCase(wordRepo, sessionRepo);
    startQuiz.execute(tierId, 'review')
      .then(setSession)
      .catch(handleError);
  }, [tierId]);
  
  const handleAnswer = async (userAnswer: string) => {
    const answerUseCase = new AnswerQuestionUseCase(...);
    const result = await answerUseCase.execute(...);
    
    if (result.isCorrect) {
      showSuccessAnimation();
    }
  };
  
  return (
    <View>
      <Text>{tierConfig.displayName}</Text>
      <MultipleChoice
        word={session.currentWord}
        onAnswer={handleAnswer}
      />
    </View>
  );
}
```

---

## Dependency Injection

**Why:** Domain doesn't know about SQLite.

**WordRepository interface:**

```tsx
// src/domain/vocabulary/WordRepository.ts
export interface WordRepository {
  getWordsDueForReview(tierId: string, limit: number): Promise<Word[]>;
  getNewWords(tierId: string, limit: number): Promise<Word[]>;
}
```

**Swap implementations:**

- `SQLiteWordRepository` (production)
- `MockWordRepository` (tests)
- `FirebaseWordRepository` (if cloud sync later)

---

## Configuration Over Conditionals

**BAD (multi-tenant):**

```tsx
const name = variant === 'esl' ? 'Foundation' : 'Grade 6-8';
```

**GOOD (config-driven):**

```tsx
// src/config/tiers.ts
export const TIER_CONFIG = {
  foundation: {
    id: 'foundation',
    displayName: 'Foundation (CEFR A2-B1)',
    description: 'Essential vocab for beginners',
    isFree: true
  }
};
```

---

## Reusability for Schools App

**When you build Schools app later:**

**Copy (100% reusable):**

- `src/domain/` (all)
- `src/application/` (all)
- `src/infrastructure/` (mostly)

**Rewrite (ESL-specific):**

- `src/presentation/` (different UX for kids)
- `src/config/` (different tier names)

**Effort:** 3-4 weeks (mostly UI, not logic)

---

## Testing Strategy

**Domain tests (pure unit):**

```tsx
describe('SpacedRepetition', () => {
  it('increases interval on correct', () => {
    const next = SpacedRepetition.calculateNextReviewDate(1, true);
    const expected = addDays(new Date(), 3);
    expect(next).toEqual(expected);
  });
});
```

**Application tests (mocked):**

```tsx
describe('StartQuizUseCase', () => {
  it('returns 20 review words when available', async () => {
    const mockRepo = {
      getWordsDueForReview: jest.fn().mockResolvedValue(mockWords(20))
    };
    const useCase = new StartQuizUseCase(mockRepo, mockSessionRepo);
    
    const session = await useCase.execute('toefl', 'review');
    
    expect(session.words.length).toBe(20);
  });
});
```

---

## Invariants

1. **No TextInput in quiz flows**
2. **SQLite is source of truth**
3. **Offline-first** (no network for core features)
4. **Bundled content** (all words in app binary)
5. **Spaced repetition immutable** (next_review_date can't be retroactively changed)

---

## Key Constraints

- **CEFR levels:** Words tagged A2-C2 (not grades 6-12)
- **Thematic grouping:** NOT alphabetical
- **Non-punitive UX:** Gentle feedback, no harsh red X
- **Accessibility:** VoiceOver/TalkBack mandatory