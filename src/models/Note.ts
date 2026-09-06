/**
 * A Note is a free-form Markdown jotting: a title, a body, and labels — nothing
 * else. Persisted as one Markdown file with YAML frontmatter at
 * `<dataDir>/notebooks/<notebook>/notes/<id>.md`; the file body is the note text.
 */

import { normalizeLabels } from './Ticket';

export interface Note {
  /** `<NOTEBOOKKEY>-<n>`, e.g. "NOTEBOOK-12". Unique within the notebooks tree. */
  id: string;
  title: string;
  /** Notebook key this note belongs to. */
  notebook: string;
  /** ISO-8601 timestamp. */
  created: string;
  /** ISO-8601 timestamp; bumped on every edit. */
  updated: string;
  labels: string[];
  /** Markdown body. */
  body: string;
  /** Set only while the note sits in the recycle bin. */
  deletedAt?: string | null;
}

/** Fields the UI supplies when creating a note. */
export interface NewNoteInput {
  title: string;
  notebook: string;
  labels?: string[];
  body?: string;
}

/** Mutable fields on an existing note. */
export type NotePatch = Partial<Pick<Note, 'title' | 'labels' | 'body'>>;

/**
 * Build a Note from user input plus an already-allocated id.
 * Validation only; persistence is the storage layer's job.
 */
export function createNote(id: string, input: NewNoteInput, now: Date = new Date()): Note {
  const title = input.title.trim();
  if (!title) {
    throw new Error('Note title must not be empty.');
  }
  const iso = now.toISOString();
  return {
    id,
    title,
    notebook: input.notebook,
    created: iso,
    updated: iso,
    labels: normalizeLabels(input.labels ?? []),
    body: input.body ?? '',
    deletedAt: null,
  };
}

/** Apply a patch, returning a new Note with a refreshed `updated` stamp. */
export function applyNotePatch(note: Note, patch: NotePatch, now: Date = new Date()): Note {
  const next: Note = { ...note };
  if (patch.title !== undefined) {
    const t = patch.title.trim();
    if (!t) throw new Error('Note title must not be empty.');
    next.title = t;
  }
  if (patch.labels !== undefined) next.labels = normalizeLabels(patch.labels);
  if (patch.body !== undefined) next.body = patch.body;
  next.updated = now.toISOString();
  return next;
}
