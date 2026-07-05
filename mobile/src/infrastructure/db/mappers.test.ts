import {
  mapWordRow,
  mapContentTierRow,
  mapUserProgressRow,
  mapQuizAttemptRow,
  mapUserStatsRow,
  mapPseudoWordRow,
  mapSenseRows,
} from '@/infrastructure/db/mappers';
import type {
  WordRow,
  ContentTierRow,
  UserProgressRow,
  QuizAttemptRow,
  UserStatsRow,
  PseudoWordRow,
  SenseWithExampleRow,
} from '@/infrastructure/db/rows';

function wordRow(overrides: Partial<WordRow> = {}): WordRow {
  return {
    id: 'word_foundation_001',
    word: 'look up to',
    definition: 'to admire',
    tier_id: 'foundation',
    pos: 'verb',
    cefr_level: 'B1',
    grade_level: null,
    word_type: 'phrasal_verb',
    difficulty: 3,
    frequency_rank: 1200,
    theme: 'Daily Life',
    example_sentence: 'I _ my mentor.',
    image_path: null,
    audio_path: null,
    synonyms: '["admire","respect"]',
    antonyms: '["despise"]',
    usage_notes: null,
    created_at: 1000,
    deleted_at: null,
    ...overrides,
  };
}

describe('mapWordRow', () => {
  it('maps a full row including JSON arrays and active flag', () => {
    const w = mapWordRow(wordRow());
    expect(w.id).toBe('word_foundation_001');
    expect(w.wordType).toBe('phrasal_verb');
    expect(w.cefrLevel).toBe('B1');
    expect(w.synonyms).toEqual(['admire', 'respect']);
    expect(w.antonyms).toEqual(['despise']);
    expect(w.isDeleted).toBe(false);
    expect(w.frequencyRank).toBe(1200);
  });

  it('maps a null frequency_rank to undefined (pre-DIAG-A content)', () => {
    expect(mapWordRow(wordRow({ frequency_rank: null })).frequencyRank).toBeUndefined();
  });

  it('derives isDeleted from deleted_at and tolerates null/optional columns', () => {
    const w = mapWordRow(wordRow({ deleted_at: 5000, pos: null, cefr_level: null, theme: null }));
    expect(w.isDeleted).toBe(true);
    expect(w.pos).toBeUndefined();
    expect(w.cefrLevel).toBeUndefined();
    expect(w.theme).toBeUndefined();
  });

  it('falls back to vocabulary for unknown word_type and [] for bad JSON', () => {
    const w = mapWordRow(wordRow({ word_type: 'bogus', synonyms: 'not json', antonyms: null }));
    expect(w.wordType).toBe('vocabulary');
    expect(w.synonyms).toEqual([]);
    expect(w.antonyms).toEqual([]);
  });

  it('ignores non-string entries inside a JSON array', () => {
    const w = mapWordRow(wordRow({ synonyms: '["ok", 3, null, "fine"]' }));
    expect(w.synonyms).toEqual(['ok', 'fine']);
  });
});

describe('mapPseudoWordRow', () => {
  it('maps a pseudo-word row, score present', () => {
    const row: PseudoWordRow = { id: 'pseudo_1', word: 'blurp', phoneme_similarity_score: 0.72 };
    const p = mapPseudoWordRow(row);
    expect(p.id).toBe('pseudo_1');
    expect(p.word).toBe('blurp');
    expect(p.phonemeSimilarityScore).toBe(0.72);
  });

  it('maps a null score to undefined', () => {
    const row: PseudoWordRow = { id: 'pseudo_2', word: 'frobble', phoneme_similarity_score: null };
    expect(mapPseudoWordRow(row).phonemeSimilarityScore).toBeUndefined();
  });
});

describe('mapSenseRows', () => {
  function senseRow(over: Partial<SenseWithExampleRow> = {}): SenseWithExampleRow {
    return {
      id: 'sense_a',
      sense_index: 0,
      pos: 'noun',
      short_gloss: 'a living organism',
      explanation: 'A plant grows in soil...',
      image_path: null,
      example_index: null,
      example_text: null,
      ...over,
    };
  }

  it('groups multiple example rows under one sense, preserving order', () => {
    const senses = mapSenseRows([
      senseRow({ example_index: 0, example_text: 'She watered the plant.' }),
      senseRow({ example_index: 1, example_text: 'The plant needs sun.' }),
    ]);
    expect(senses).toHaveLength(1);
    expect(senses[0]?.shortGloss).toBe('a living organism');
    expect(senses[0]?.pos).toBe('noun');
    expect(senses[0]?.examples.map((e) => e.text)).toEqual([
      'She watered the plant.',
      'The plant needs sun.',
    ]);
    expect(senses[0]?.examples.map((e) => e.exampleIndex)).toEqual([0, 1]);
  });

  it('keeps an exampleless sense with an empty examples array (LEFT JOIN null row)', () => {
    const senses = mapSenseRows([senseRow()]);
    expect(senses).toHaveLength(1);
    expect(senses[0]?.examples).toEqual([]);
  });

  it('groups multiple distinct senses, mapping null pos/image to undefined', () => {
    const senses = mapSenseRows([
      senseRow({ id: 's0', sense_index: 0, example_index: 0, example_text: 'x' }),
      senseRow({
        id: 's1',
        sense_index: 1,
        pos: null,
        image_path: 'vocab/plant_2.png',
        short_gloss: 'a factory',
        explanation: 'A power plant...',
        example_index: 0,
        example_text: 'The plant employs 200 people.',
      }),
    ]);
    expect(senses).toHaveLength(2);
    expect(senses[0]?.senseIndex).toBe(0);
    expect(senses[1]?.senseIndex).toBe(1);
    expect(senses[1]?.pos).toBeUndefined();
    expect(senses[1]?.imagePath).toBe('vocab/plant_2.png');
    expect(senses[1]?.examples[0]?.text).toBe('The plant employs 200 people.');
  });

  it('returns [] for no rows (un-backfilled word → flat fallback)', () => {
    expect(mapSenseRows([])).toEqual([]);
  });
});

describe('mapContentTierRow', () => {
  it('maps 0/1 integer flags to booleans and preserves null price', () => {
    const row: ContentTierRow = {
      id: 'foundation',
      name: 'Foundation',
      description: null,
      is_free: 1,
      sku: null,
      word_count: 500,
      display_order: 0,
      is_active: 1,
    };
    const t = mapContentTierRow(row);
    expect(t.isFree).toBe(true);
    expect(t.isActive).toBe(true);
    expect(t.sku).toBeNull();
  });

  it('maps a paid inactive tier', () => {
    const t = mapContentTierRow({
      id: 'gre',
      name: 'GRE',
      description: 'desc',
      is_free: 0,
      sku: 'com.lexitap.gre',
      word_count: 1000,
      display_order: 5,
      is_active: 0,
    });
    expect(t.isFree).toBe(false);
    expect(t.isActive).toBe(false);
  });
});

describe('mapUserProgressRow', () => {
  it('coalesces nullable counters to 0 and clamps mastery to 0-5', () => {
    const row: UserProgressRow = {
      word_id: 'w1',
      mastery_level: 9,
      next_review_date: 2000,
      last_reviewed_at: null,
      consecutive_correct: null,
      total_attempts: null,
      total_correct: null,
      first_seen_at: null,
      scheduler_version: 'v1-fixed',
    };
    const p = mapUserProgressRow(row);
    expect(p.masteryLevel).toBe(5);
    expect(p.consecutiveCorrect).toBe(0);
    expect(p.totalAttempts).toBe(0);
    expect(p.lastReviewedAt).toBeUndefined();
    expect(p.schedulerVersion).toBe('v1-fixed');
  });

  it('clamps a negative mastery up to 0', () => {
    const p = mapUserProgressRow({
      word_id: 'w1',
      mastery_level: -3,
      next_review_date: 1,
      last_reviewed_at: 10,
      consecutive_correct: 2,
      total_attempts: 4,
      total_correct: 3,
      first_seen_at: 5,
      scheduler_version: 'v1-fixed',
    });
    expect(p.masteryLevel).toBe(0);
  });
});

describe('mapQuizAttemptRow', () => {
  it('maps 0/1 is_correct to boolean and nullable replay fields to undefined', () => {
    const row: QuizAttemptRow = {
      id: 7,
      session_id: 3,
      word_id: 'w1',
      assessment_type: 'drag_drop',
      user_answer: 'a',
      correct_answer: 'a',
      is_correct: 1,
      answered_at: 100,
      time_to_answer_ms: null,
      pre_mastery_level: null,
      scheduled_review_date: null,
      scheduler_version: null,
      user_ease: null,
    };
    const a = mapQuizAttemptRow(row);
    expect(a.isCorrect).toBe(true);
    expect(a.assessmentType).toBe('drag_drop');
    expect(a.timeToAnswerMs).toBeUndefined();
    expect(a.preMasteryLevel).toBeUndefined();
    expect(a.schedulerVersion).toBeUndefined();
    expect(a.userEase).toBeUndefined();
  });

  it('maps user_ease "easy" to the literal and any other value to undefined', () => {
    const base = {
      id: 7,
      session_id: 3,
      word_id: 'w1',
      assessment_type: 'multiple_choice',
      user_answer: 'a',
      correct_answer: 'a',
      is_correct: 1,
      answered_at: 100,
      time_to_answer_ms: null,
      pre_mastery_level: null,
      scheduled_review_date: null,
      scheduler_version: null,
    };
    expect(mapQuizAttemptRow({ ...base, user_ease: 'easy' }).userEase).toBe('easy');
    expect(mapQuizAttemptRow({ ...base, user_ease: null }).userEase).toBeUndefined();
    expect(mapQuizAttemptRow({ ...base, user_ease: 'garbage' }).userEase).toBeUndefined();
  });

  it('preserves replay context and defaults unknown assessment_type', () => {
    const a = mapQuizAttemptRow({
      id: 1,
      session_id: 1,
      word_id: 'w1',
      assessment_type: 'weird',
      user_answer: 'x',
      correct_answer: 'y',
      is_correct: 0,
      answered_at: 1,
      time_to_answer_ms: 1200,
      pre_mastery_level: 2,
      scheduled_review_date: 9999,
      scheduler_version: 'v1-fixed',
      user_ease: null,
    });
    expect(a.isCorrect).toBe(false);
    expect(a.assessmentType).toBe('multiple_choice');
    expect(a.preMasteryLevel).toBe(2);
    expect(a.scheduledReviewDate).toBe(9999);
  });
});


describe('mapUserStatsRow', () => {
  const baseRow: UserStatsRow = {
    id: 1,
    current_streak: 5,
    longest_streak: 9,
    last_activity_local_date: 20260524,
    total_sessions: 12,
    total_words_mastered: 30,
    freeze_count: 2,
    freezes_granted_total: 4,
    last_catchup_anchor_date: null,
    onboarding_state: null,
  };

  it('composes StreakState with totals', () => {
    const s = mapUserStatsRow(baseRow);
    expect(s.streak.currentStreak).toBe(5);
    expect(s.streak.freezeCount).toBe(2);
    expect(s.streak.lastActivityLocalDate).toBe(20260524);
    expect(s.totalSessions).toBe(12);
    expect(s.totalWordsMastered).toBe(30);
  });

  describe('onboarding_state parsing', () => {
    it('returns undefined when the blob is NULL', () => {
      expect(mapUserStatsRow({ ...baseRow, onboarding_state: null }).onboardingState).toBeUndefined();
    });

    it('returns undefined when the blob is empty/whitespace', () => {
      expect(mapUserStatsRow({ ...baseRow, onboarding_state: '   ' }).onboardingState).toBeUndefined();
    });

    it('parses a full, valid profile', () => {
      const json = JSON.stringify({
        goal: 'exam',
        band: 'B2',
        frontierRank: 3000,
        completedAt: 1717200000000,
      });
      const profile = mapUserStatsRow({ ...baseRow, onboarding_state: json }).onboardingState;
      expect(profile).toEqual({
        goal: 'exam',
        band: 'B2',
        frontierRank: 3000,
        completedAt: 1717200000000,
      });
    });

    it('does NOT throw and returns undefined on malformed JSON (corrupt blob)', () => {
      const row = { ...baseRow, onboarding_state: '{not valid json,,,' };
      expect(() => mapUserStatsRow(row)).not.toThrow();
      expect(mapUserStatsRow(row).onboardingState).toBeUndefined();
    });

    it('returns undefined when the JSON is valid but not an object', () => {
      expect(mapUserStatsRow({ ...baseRow, onboarding_state: '42' }).onboardingState).toBeUndefined();
      expect(mapUserStatsRow({ ...baseRow, onboarding_state: '"x"' }).onboardingState).toBeUndefined();
      expect(mapUserStatsRow({ ...baseRow, onboarding_state: '[]' }).onboardingState).toBeUndefined();
      expect(mapUserStatsRow({ ...baseRow, onboarding_state: 'null' }).onboardingState).toBeUndefined();
    });

    it('returns undefined when the required completedAt is missing or non-numeric', () => {
      expect(
        mapUserStatsRow({ ...baseRow, onboarding_state: JSON.stringify({ goal: 'exam' }) })
          .onboardingState,
      ).toBeUndefined();
      expect(
        mapUserStatsRow({ ...baseRow, onboarding_state: JSON.stringify({ completedAt: 'soon' }) })
          .onboardingState,
      ).toBeUndefined();
    });

    it('drops invalid enum values but keeps a valid completedAt', () => {
      const json = JSON.stringify({ goal: 'bogus', band: 'Z9', completedAt: 123 });
      const profile = mapUserStatsRow({ ...baseRow, onboarding_state: json }).onboardingState;
      expect(profile).toEqual({
        completedAt: 123,
        goal: undefined,
        band: undefined,
        frontierRank: undefined,
      });
    });

    it('ignores unknown extra fields', () => {
      const json = JSON.stringify({ completedAt: 1, band: 'C1', injected: 'x' });
      const profile = mapUserStatsRow({ ...baseRow, onboarding_state: json }).onboardingState;
      expect(profile?.band).toBe('C1');
      expect(profile).not.toHaveProperty('injected');
    });
  });
});
