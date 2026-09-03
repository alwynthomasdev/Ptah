import { describe, expect, it } from 'vitest';
import { formatId, isValidId, nextId, parseId } from '@shared/ids';

describe('ids', () => {
  it('formats and parses round-trip', () => {
    expect(formatId('ptah', 12)).toBe('PTAH-12');
    expect(parseId('PTAH-12')).toEqual({ project: 'PTAH', number: 12 });
  });

  it('rejects malformed ids', () => {
    expect(isValidId('PTAH-0')).toBe(false);
    expect(isValidId('ptah-1')).toBe(false);
    expect(isValidId('P-1')).toBe(false);
    expect(isValidId('PTAH_1')).toBe(false);
    expect(() => parseId('nope')).toThrow();
  });

  it('advances the counter', () => {
    expect(nextId('PTAH', 4)).toEqual({ id: 'PTAH-5', counter: 5 });
    expect(nextId('PTAH', 0)).toEqual({ id: 'PTAH-1', counter: 1 });
  });
});
