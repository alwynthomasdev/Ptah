import type { Note } from './Note';

/** Descriptor for filtering a note list. All fields are ANDed together. */
export interface NoteFilter {
  /** Substring match against the title, case-insensitive. */
  text?: string;
  /** Note must carry every label listed here (case-insensitive). */
  labels?: string[];
  /** Restrict to these notebook keys. */
  notebooks?: string[];
}

export type NoteSortKey = 'created' | 'updated' | 'title';
export type NoteSortDir = 'asc' | 'desc';

export interface NoteSort {
  key: NoteSortKey;
  dir: NoteSortDir;
}

export function matchesNoteFilter(note: Note, filter: NoteFilter): boolean {
  if (filter.text) {
    if (!note.title.toLowerCase().includes(filter.text.trim().toLowerCase())) return false;
  }
  if (filter.labels && filter.labels.length) {
    const have = new Set(note.labels.map((l) => l.toLowerCase()));
    if (!filter.labels.every((l) => have.has(l.trim().toLowerCase()))) return false;
  }
  if (filter.notebooks && filter.notebooks.length) {
    if (!filter.notebooks.includes(note.notebook)) return false;
  }
  return true;
}

/** Comparable value for a sort key. */
function sortValue(note: Note, key: NoteSortKey): number | string {
  switch (key) {
    case 'created':
      return Date.parse(note.created) || 0;
    case 'updated':
      return Date.parse(note.updated) || 0;
    case 'title':
      return note.title.toLowerCase();
  }
}

/** Return a new, sorted array. Ties break by id for a stable, predictable order. */
export function sortNotes(notes: Note[], sort: NoteSort): Note[] {
  const factor = sort.dir === 'asc' ? 1 : -1;
  return [...notes].sort((a, b) => {
    const av = sortValue(a, sort.key);
    const bv = sortValue(b, sort.key);
    if (av === bv) return a.id.localeCompare(b.id, undefined, { numeric: true });
    if (typeof av === 'string' || typeof bv === 'string') {
      return String(av).localeCompare(String(bv)) * factor;
    }
    return (av - bv) * factor;
  });
}

export function filterAndSortNotes(notes: Note[], filter: NoteFilter, sort: NoteSort): Note[] {
  return sortNotes(
    notes.filter((n) => matchesNoteFilter(n, filter)),
    sort,
  );
}
