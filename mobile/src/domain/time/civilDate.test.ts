import {
  toLocalCivilDate,
  civilDayDiff,
  startOfLocalDay,
} from '@/domain/time/civilDate';

const DAY_MS = 86_400_000;

describe('toLocalCivilDate', () => {
  it('returns YYYYMMDD in UTC', () => {
    // 2023-11-14T22:13:20Z
    expect(toLocalCivilDate(1_700_000_000_000, 'UTC')).toBe(20231114);
  });

  it('shifts the date across a timezone boundary', () => {
    // 2026-05-24T03:00:00Z is still 2026-05-23 in US Pacific (UTC-7/8).
    const ms = Date.UTC(2026, 4, 24, 3, 0, 0);
    expect(toLocalCivilDate(ms, 'UTC')).toBe(20260524);
    expect(toLocalCivilDate(ms, 'America/Los_Angeles')).toBe(20260523);
  });

  it('handles east-of-UTC zones', () => {
    // 2026-05-23T20:00:00Z is already 2026-05-24 in Tokyo (UTC+9).
    const ms = Date.UTC(2026, 4, 23, 20, 0, 0);
    expect(toLocalCivilDate(ms, 'Asia/Tokyo')).toBe(20260524);
  });
});

describe('civilDayDiff', () => {
  it('0 for the same day', () => {
    expect(civilDayDiff(20260524, 20260524)).toBe(0);
  });

  it('1 for consecutive days', () => {
    expect(civilDayDiff(20260524, 20260523)).toBe(1);
  });

  it('crosses month boundaries', () => {
    expect(civilDayDiff(20260601, 20260531)).toBe(1);
    expect(civilDayDiff(20260301, 20260228)).toBe(1); // 2026 not a leap year
  });

  it('crosses year boundaries', () => {
    expect(civilDayDiff(20260101, 20251231)).toBe(1);
  });

  it('is negative when the clock rolls backward', () => {
    expect(civilDayDiff(20260520, 20260524)).toBe(-4);
  });
});

describe('startOfLocalDay', () => {
  it('returns midnight-aligned epoch for UTC', () => {
    const ms = Date.UTC(2026, 4, 24, 13, 45, 30, 500);
    const start = startOfLocalDay(ms, 'UTC');
    expect(start).toBe(Date.UTC(2026, 4, 24, 0, 0, 0, 0));
    expect((ms - start) % DAY_MS).toBe(ms - start); // within one day
  });
});
