import {
  FORGIVENESS,
  effectiveDailyCap,
  selectReviewQueue,
  reanchorBacklog,
  isLapse,
  lapseGapDays,
  type DueWord,
} from '@/domain/srs/forgiveness';

const DAY_MS = 86_400_000;
const TZ = 'UTC';
// Fixed "now" at midday UTC so startOfLocalDay is deterministic.
const NOW = Date.UTC(2026, 4, 24, 12, 0, 0);
const START_OF_TODAY = Date.UTC(2026, 4, 24, 0, 0, 0);

function due(wordId: string, masteryLevel: number, daysOverdue: number): DueWord {
  return { wordId, masteryLevel, nextReviewDate: START_OF_TODAY - daysOverdue * DAY_MS };
}

describe('effectiveDailyCap', () => {
  it('is the base cap in steady state', () => {
    expect(effectiveDailyCap(0)).toBe(40);
    expect(effectiveDailyCap(40)).toBe(40);
  });

  it('raises by the catch-up budget when over base', () => {
    expect(effectiveDailyCap(41)).toBe(60);
    expect(effectiveDailyCap(10_000)).toBe(60);
  });

  it('never exceeds the hard ceiling', () => {
    expect(effectiveDailyCap(99_999)).toBeLessThanOrEqual(FORGIVENESS.HARD_SESSION_CEILING);
  });
});

describe('selectReviewQueue ordering', () => {
  it('sorts most-overdue first', () => {
    const words = [due('a', 3, 1), due('b', 3, 5), due('c', 3, 2)];
    const out = selectReviewQueue(words, NOW, TZ, 10).map((w) => w.wordId);
    expect(out).toEqual(['b', 'c', 'a']);
  });

  it('breaks overdue ties by lowest mastery first', () => {
    const words = [due('a', 4, 3), due('b', 1, 3), due('c', 2, 3)];
    const out = selectReviewQueue(words, NOW, TZ, 10).map((w) => w.wordId);
    expect(out).toEqual(['b', 'c', 'a']);
  });

  it('breaks remaining ties by next_review_date then word_id', () => {
    const same = (id: string, nrd: number): DueWord => ({
      wordId: id,
      masteryLevel: 2,
      nextReviewDate: nrd,
    });
    // identical overdue + mastery; earlier date first, then id
    const words = [same('b', START_OF_TODAY), same('a', START_OF_TODAY), same('c', START_OF_TODAY - DAY_MS)];
    const out = selectReviewQueue(words, NOW, TZ, 10).map((w) => w.wordId);
    expect(out).toEqual(['c', 'a', 'b']);
  });

  it('applies the cap as a ceiling and defers the rest', () => {
    const words = Array.from({ length: 100 }, (_, i) => due(`w${i}`, 3, i));
    const out = selectReviewQueue(words, NOW, TZ, 40);
    expect(out).toHaveLength(40);
  });

  it('returns all when fewer due than cap', () => {
    const words = [due('a', 1, 1), due('b', 2, 2)];
    expect(selectReviewQueue(words, NOW, TZ, 40)).toHaveLength(2);
  });

  it('does not mutate the input', () => {
    const words = [due('a', 1, 1), due('b', 2, 5)];
    const snapshot = JSON.stringify(words);
    selectReviewQueue(words, NOW, TZ, 1);
    expect(JSON.stringify(words)).toBe(snapshot);
  });

  it('returns [] for an empty due set', () => {
    expect(selectReviewQueue([], NOW, TZ, 40)).toEqual([]);
  });
});

describe('isLapse / lapseGapDays', () => {
  it('null last activity is not a lapse', () => {
    expect(isLapse(null, 20260524)).toBe(false);
    expect(lapseGapDays(null, 20260524)).toBe(0);
  });

  it('1-2 day gaps are NOT lapses (cap handles them)', () => {
    expect(isLapse(20260523, 20260524)).toBe(false); // gap 1
    expect(isLapse(20260522, 20260524)).toBe(false); // gap 2
  });

  it('gap >= 3 qualifies as a lapse', () => {
    expect(isLapse(20260521, 20260524)).toBe(true); // gap 3
    expect(isLapse(20260512, 20260524)).toBe(true); // gap 12
  });
});

describe('reanchorBacklog', () => {
  const TODAY = 20260524;

  it('no writes when not in a lapse', () => {
    const words = [due('a', 1, 1)];
    const res = reanchorBacklog(words, NOW, TZ, 2, null, TODAY);
    expect(res.writes).toEqual([]);
    expect(res.event).toBeNull();
  });

  it('idempotent: skips if already anchored today', () => {
    const words = Array.from({ length: 180 }, (_, i) => due(`w${i}`, 3, 12));
    const res = reanchorBacklog(words, NOW, TZ, 12, TODAY, TODAY);
    expect(res.writes).toEqual([]);
    expect(res.event).toBeNull();
  });

  it('runs when anchored on a different day', () => {
    const words = Array.from({ length: 180 }, (_, i) => due(`w${i}`, 3, 12));
    const res = reanchorBacklog(words, NOW, TZ, 12, 20260510, TODAY);
    expect(res.writes.length).toBeGreaterThan(0);
    expect(res.event?.type).toBe('srs_backlog_reanchored');
  });

  it('spreads 180 overdue words into buckets of 60 (perDay)', () => {
    const words = Array.from({ length: 180 }, (_, i) => due(`w${i}`, 3, 12));
    const res = reanchorBacklog(words, NOW, TZ, 12, null, TODAY);
    const dates = new Set(res.writes.map((w) => w.nextReviewDate));
    // buckets 0,1,2 -> today, +1d, +2d
    expect(dates).toEqual(
      new Set([START_OF_TODAY, START_OF_TODAY + DAY_MS, START_OF_TODAY + 2 * DAY_MS]),
    );
    // each bucket holds 60
    const bucket0 = res.writes.filter((w) => w.nextReviewDate === START_OF_TODAY);
    expect(bucket0).toHaveLength(60);
  });

  it('clamps overflow beyond perDay*drainDays into the final bucket', () => {
    // 60*5 = 300 capacity; 360 words -> last 60 clamp into bucket 4 (+4d)
    const words = Array.from({ length: 360 }, (_, i) => due(`w${i}`, 3, 20));
    const res = reanchorBacklog(words, NOW, TZ, 20, null, TODAY);
    const lastBucketDate = START_OF_TODAY + (FORGIVENESS.CATCH_UP_DRAIN_DAYS - 1) * DAY_MS;
    const inLast = res.writes.filter((w) => w.nextReviewDate === lastBucketDate);
    expect(inLast.length).toBeGreaterThanOrEqual(120); // bucket 4 + clamped overflow
  });

  it('never pushes a word later than already scheduled (pull-in only)', () => {
    // A word due tomorrow (not overdue) should never be delayed; if it lands
    // in a later bucket, the min-guard keeps its earlier existing date.
    const notOverdue: DueWord = {
      wordId: 'future',
      masteryLevel: 5,
      nextReviewDate: START_OF_TODAY + 10 * DAY_MS,
    };
    const overdue = Array.from({ length: 120 }, (_, i) => due(`w${i}`, 1, 30));
    const res = reanchorBacklog([...overdue, notOverdue], NOW, TZ, 30, null, TODAY);
    const futureWrite = res.writes.find((w) => w.wordId === 'future');
    // either untouched, or pulled inward — never pushed past its original date
    if (futureWrite) {
      expect(futureWrite.nextReviewDate).toBeLessThanOrEqual(notOverdue.nextReviewDate);
    }
  });

  it('no writes for empty overdue set even in a lapse', () => {
    const res = reanchorBacklog([], NOW, TZ, 12, null, TODAY);
    expect(res.writes).toEqual([]);
    expect(res.event).toBeNull();
  });

  it('event payload reports count, lapseDays, drainDays', () => {
    const words = Array.from({ length: 100 }, (_, i) => due(`w${i}`, 3, 12));
    const res = reanchorBacklog(words, NOW, TZ, 12, null, TODAY);
    expect(res.event).toMatchObject({
      type: 'srs_backlog_reanchored',
      lapseDays: 12,
      drainDays: FORGIVENESS.CATCH_UP_DRAIN_DAYS,
    });
    expect(res.event?.count).toBe(res.writes.length);
  });
});
