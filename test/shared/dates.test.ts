import { describe, expect, it } from 'vitest';
import { isDueTodayOrEarlier, isOverdue, todayIso } from '@shared/dates';

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
