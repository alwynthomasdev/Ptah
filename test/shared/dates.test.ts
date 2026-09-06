import { describe, expect, it } from 'vitest';
import {
  addToDate,
  formatDate,
  formatDueRelative,
  isDueTodayOrEarlier,
  isOverdue,
  todayIso,
} from '@shared/dates';

// A fixed "now" so the date-only helpers are deterministic.
const NOW = new Date('2026-09-06T14:30:00.000Z');
const TODAY = '2026-09-06T00:00:00.000Z';
const YESTERDAY = '2026-09-05T00:00:00.000Z';
const TOMORROW = '2026-09-07T00:00:00.000Z';

describe('todayIso', () => {
  it('returns UTC midnight in the same shape as fromDateInput', () => {
    expect(todayIso(NOW)).toBe(TODAY);
    expect(todayIso(NOW)).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/);
  });
});

describe('isDueTodayOrEarlier', () => {
  it('is true for today and the past', () => {
    expect(isDueTodayOrEarlier(TODAY, NOW)).toBe(true);
    expect(isDueTodayOrEarlier(YESTERDAY, NOW)).toBe(true);
  });

  it('is false for the future, null, and invalid input', () => {
    expect(isDueTodayOrEarlier(TOMORROW, NOW)).toBe(false);
    expect(isDueTodayOrEarlier(null, NOW)).toBe(false);
    expect(isDueTodayOrEarlier(undefined, NOW)).toBe(false);
    expect(isDueTodayOrEarlier('not-a-date', NOW)).toBe(false);
  });
});

describe('isOverdue', () => {
  it('is false for a ticket due today even though its timestamp has passed', () => {
    expect(isOverdue(TODAY, NOW)).toBe(false);
  });

  it('is true only for a due date strictly before today', () => {
    expect(isOverdue(YESTERDAY, NOW)).toBe(true);
    expect(isOverdue(TOMORROW, NOW)).toBe(false);
    expect(isOverdue(null, NOW)).toBe(false);
  });
});

describe('addToDate', () => {
  it('adds whole days, returning UTC midnight in the todayIso shape', () => {
    expect(addToDate(TODAY, { days: 1 })).toBe(TOMORROW);
    expect(addToDate(TODAY, { days: 7 })).toBe('2026-09-13T00:00:00.000Z');
    expect(addToDate(TODAY, { days: 14 })).toBe('2026-09-20T00:00:00.000Z');
    expect(addToDate(TODAY, { days: 1 })).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/);
  });

  it('adds months, crossing a year boundary', () => {
    expect(addToDate(TODAY, { months: 1 })).toBe('2026-10-06T00:00:00.000Z');
    expect(addToDate('2026-12-06T00:00:00.000Z', { months: 1 })).toBe('2027-01-06T00:00:00.000Z');
  });

  it('applies months before days and rolls month overflow forward', () => {
    // 31 Jan + 1 month → JS lands in early March (no clamping).
    expect(addToDate('2026-01-31T00:00:00.000Z', { months: 1 })).toBe('2026-03-03T00:00:00.000Z');
  });

  it('throws on an unparseable date', () => {
    expect(() => addToDate('not-a-date', { days: 1 })).toThrow();
  });
});

describe('formatDueRelative', () => {
  it('returns none for a missing or invalid due date', () => {
    expect(formatDueRelative(null, NOW)).toEqual({ text: '', tone: 'none' });
    expect(formatDueRelative(undefined, NOW)).toEqual({ text: '', tone: 'none' });
    expect(formatDueRelative('not-a-date', NOW)).toEqual({ text: '', tone: 'none' });
  });

  it('words the near future and past', () => {
    expect(formatDueRelative(TODAY, NOW).text).toBe('Today');
    expect(formatDueRelative(TOMORROW, NOW).text).toBe('Tomorrow');
    expect(formatDueRelative(YESTERDAY, NOW).text).toBe('Yesterday');
    expect(formatDueRelative('2026-09-09T00:00:00.000Z', NOW).text).toBe('In 3 days');
    expect(formatDueRelative('2026-09-13T00:00:00.000Z', NOW).text).toBe('In 1 week');
    expect(formatDueRelative('2026-09-20T00:00:00.000Z', NOW).text).toBe('In 2 weeks');
    expect(formatDueRelative('2026-09-03T00:00:00.000Z', NOW).text).toBe('3 days overdue');
  });

  it('falls back to the absolute formatDate form beyond a fortnight', () => {
    const future = '2026-10-31T00:00:00.000Z';
    const past = '2026-08-01T00:00:00.000Z';
    expect(formatDueRelative(future, NOW).text).toBe(formatDate(future));
    expect(formatDueRelative(past, NOW).text).toBe(formatDate(past));
    // ...and not a relative phrase.
    expect(formatDueRelative(future, NOW).text).not.toMatch(/\bIn \d|\bdays overdue\b/);
  });

  it('tones by urgency: overdue < today..+3 soon < normal', () => {
    expect(formatDueRelative(YESTERDAY, NOW).tone).toBe('overdue');
    expect(formatDueRelative(TODAY, NOW).tone).toBe('soon');
    expect(formatDueRelative('2026-09-09T00:00:00.000Z', NOW).tone).toBe('soon');
    expect(formatDueRelative('2026-09-10T00:00:00.000Z', NOW).tone).toBe('normal');
  });
});
