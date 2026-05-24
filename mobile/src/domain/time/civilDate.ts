// Pure IANA-timezone civil-date helpers. No ambient clock, no ambient locale:
// callers pass `nowMs` (epoch ms) and `tz` (IANA) explicitly
// (SRS_FORGIVENESS_MECHANICS.md design principle 3).

import { DAY_MS } from '@/domain/srs/v1-fixed';

interface CivilParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number;
  minute: number;
  second: number;
}

// Intl.DateTimeFormat is part of ECMA-402 (no React/Expo dependency) and is
// the only correct way to resolve a wall-clock date in an arbitrary IANA tz
// without shipping a tz database. We pass the tz explicitly so the function
// stays referentially transparent.
function civilPartsInTz(nowMs: number, tz: string): CivilParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(nowMs));
  const lookup = (type: string): number => {
    const found = parts.find((p) => p.type === type);
    // hour can come back as "24" at midnight in some engines; normalize.
    const raw = found ? Number(found.value) : 0;
    return Number.isFinite(raw) ? raw : 0;
  };
  const hour = lookup('hour');
  return {
    year: lookup('year'),
    month: lookup('month'),
    day: lookup('day'),
    hour: hour === 24 ? 0 : hour,
    minute: lookup('minute'),
    second: lookup('second'),
  };
}

/** Local civil date as the integer YYYYMMDD in the given tz. Pure. */
export function toLocalCivilDate(nowMs: number, tz: string): number {
  const { year, month, day } = civilPartsInTz(nowMs, tz);
  return year * 10000 + month * 100 + day;
}

/** Split a YYYYMMDD integer back into {year, month, day}. */
function splitCivilDate(yyyymmdd: number): { year: number; month: number; day: number } {
  return {
    year: Math.floor(yyyymmdd / 10000),
    month: Math.floor((yyyymmdd % 10000) / 100),
    day: yyyymmdd % 100,
  };
}

// Days since an epoch for a civil date, using UTC arithmetic purely as a
// calendar calculator (no timezone semantics — the date is already local).
function civilToDayNumber(yyyymmdd: number): number {
  const { year, month, day } = splitCivilDate(yyyymmdd);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

/**
 * Calendar-day difference between two YYYYMMDD dates. Positive when `today`
 * is after `last`; can be negative if the clock rolled backward.
 */
export function civilDayDiff(today: number, last: number): number {
  return civilToDayNumber(today) - civilToDayNumber(last);
}

/** Epoch ms for the start (00:00:00.000) of the local day containing nowMs. */
export function startOfLocalDay(nowMs: number, tz: string): number {
  const { hour, minute, second } = civilPartsInTz(nowMs, tz);
  const msIntoDay =
    hour * 3_600_000 + minute * 60_000 + second * 1_000 + (nowMs % 1_000 + 1_000) % 1_000;
  return nowMs - msIntoDay;
}
