import { describe, expect, it } from 'vitest';
import { applyNotePatch, createNote } from '@models/Note';
import { createNotebook, DEFAULT_NOTEBOOK_KEY } from '@models/Notebook';
import { filterAndSortNotes } from '@models/NoteFilter';
import type { Note } from '@models/Note';

describe('createNote', () => {
  it('trims the title and rejects an empty one', () => {
    expect(createNote('NOTEBOOK-1', { title: '  hi  ', notebook: 'NOTEBOOK' }).title).toBe('hi');
    expect(() => createNote('NOTEBOOK-1', { title: '   ', notebook: 'NOTEBOOK' })).toThrow();
  });

  it('normalizes labels (trim, dedupe ci, sorted)', () => {
    const n = createNote('NOTEBOOK-1', {
      title: 'x',
      notebook: 'NOTEBOOK',
      labels: [' beta ', 'Alpha', 'alpha', ''],
    });
    expect(n.labels).toEqual(['Alpha', 'beta']);
  });

  it('sets created and updated to the same instant, and deletedAt null', () => {
    const now = new Date('2026-01-02T03:04:05.000Z');
    const n = createNote('NOTEBOOK-1', { title: 'x', notebook: 'NOTEBOOK' }, now);
    expect(n.created).toBe(now.toISOString());
    expect(n.updated).toBe(now.toISOString());
    expect(n.deletedAt).toBeNull();
    expect(n.body).toBe('');
  });
});

describe('applyNotePatch', () => {
  const base = createNote(
    'NOTEBOOK-1',
    { title: 'x', notebook: 'NOTEBOOK', body: 'hello' },
    new Date('2026-01-01T00:00:00.000Z'),
  );

  it('bumps updated even when nothing else changes', () => {
    const later = new Date('2026-02-01T00:00:00.000Z');
    const next = applyNotePatch(base, {}, later);
    expect(next.updated).toBe(later.toISOString());
    expect(next.created).toBe(base.created);
  });

  it('applies title/labels/body and rejects a blank title', () => {
    const next = applyNotePatch(base, { title: ' new ', labels: ['z', 'a'], body: 'b' });
    expect(next.title).toBe('new');
    expect(next.labels).toEqual(['a', 'z']);
    expect(next.body).toBe('b');
    expect(() => applyNotePatch(base, { title: '  ' })).toThrow();
  });
});

describe('createNotebook', () => {
  it('uppercases and validates the key', () => {
    expect(createNotebook({ key: 'work', name: 'Work' }).key).toBe('WORK');
    expect(() => createNotebook({ key: 'w', name: 'x' })).toThrow();
    expect(() => createNotebook({ key: 'WORK', name: '  ' })).toThrow();
  });

  it('the default key matches the constant', () => {
    expect(createNotebook({ key: DEFAULT_NOTEBOOK_KEY, name: 'notebook' }).key).toBe('NOTEBOOK');
  });
});

describe('filterAndSortNotes', () => {
  function n(overrides: Partial<Note>): Note {
    return {
      id: 'NB-1',
      title: 'A',
      notebook: 'NB',
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      labels: [],
      body: '',
      deletedAt: null,
      ...overrides,
    };
  }

  it('filters by text, labels, and notebook (ANDed)', () => {
    const notes = [
      n({ id: 'NB-1', title: 'Groceries', labels: ['home'] }),
      n({ id: 'NB-2', title: 'Grocery run', labels: ['home', 'urgent'], notebook: 'NB' }),
      n({ id: 'WORK-1', title: 'Grocery budget', notebook: 'WORK' }),
    ];
    const out = filterAndSortNotes(
      notes,
      { text: 'grocer', labels: ['home'], notebooks: ['NB'] },
      { key: 'title', dir: 'asc' },
    );
    // "Groceries" sorts before "Grocery run"; WORK-1 excluded by notebook,
    // and the label filter would drop NB-2 if it lacked "home".
    expect(out.map((x) => x.id)).toEqual(['NB-1', 'NB-2']);
  });

  it('sorts by updated desc', () => {
    const notes = [
      n({ id: 'NB-1', updated: '2026-01-01T00:00:00.000Z' }),
      n({ id: 'NB-2', updated: '2026-03-01T00:00:00.000Z' }),
      n({ id: 'NB-3', updated: '2026-02-01T00:00:00.000Z' }),
    ];
    expect(filterAndSortNotes(notes, {}, { key: 'updated', dir: 'desc' }).map((x) => x.id)).toEqual([
      'NB-2',
      'NB-3',
      'NB-1',
    ]);
  });
});
