/**
 * A Notebook groups notes, the way a Project groups tickets. Every note belongs
 * to exactly one notebook. Persisted as `<dataDir>/notebooks/<key>/notebook.yml`.
 */
export interface Notebook {
  /** Uppercase short key, e.g. "NOTEBOOK". Used as the note-id prefix and folder name. */
  key: string;
  /** Human-readable name. */
  name: string;
  /** Monotonic counter for the next note number in this notebook. */
  counter: number;
  /** ISO-8601 creation timestamp. */
  created: string;
}

export const NOTEBOOK_KEY_PATTERN = /^[A-Z][A-Z0-9]{1,9}$/;

/** Every Ptah install always has this notebook; the key is fixed. */
export const DEFAULT_NOTEBOOK_KEY = 'NOTEBOOK';

export function isValidNotebookKey(key: string): boolean {
  return NOTEBOOK_KEY_PATTERN.test(key);
}

export interface NewNotebookInput {
  key: string;
  name: string;
}

/** Build a fresh Notebook record. Throws if the key is malformed. */
export function createNotebook(input: NewNotebookInput, now: Date = new Date()): Notebook {
  const key = input.key.trim().toUpperCase();
  if (!isValidNotebookKey(key)) {
    throw new Error(
      `Invalid notebook key "${input.key}": must be 2-10 chars, start with a letter, A-Z/0-9 only.`,
    );
  }
  const name = input.name.trim();
  if (!name) {
    throw new Error('Notebook name must not be empty.');
  }
  return { key, name, counter: 0, created: now.toISOString() };
}
