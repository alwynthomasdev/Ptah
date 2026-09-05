/**
 * A Project groups tickets. Every ticket belongs to exactly one project.
 * Persisted as `<dataDir>/projects/<key>/project.yml`.
 */
export interface Project {
  /** Uppercase short key, e.g. "PTAH". Used as the ticket-id prefix and folder name. */
  key: string;
  /** Human-readable name. */
  name: string;
  /** Monotonic counter for the next ticket number in this project. */
  counter: number;
  /** ISO-8601 creation timestamp. */
  created: string;
}

export const PROJECT_KEY_PATTERN = /^[A-Z][A-Z0-9]{1,9}$/;

/** Every Ptah install always has this project; the key is fixed but its display name is user-configurable via Settings. */
export const DEFAULT_PROJECT_KEY = 'TODO';

export function isValidProjectKey(key: string): boolean {
  return PROJECT_KEY_PATTERN.test(key);
}

export interface NewProjectInput {
  key: string;
  name: string;
}

/** Build a fresh Project record. Throws if the key is malformed. */
export function createProject(input: NewProjectInput, now: Date = new Date()): Project {
  const key = input.key.trim().toUpperCase();
  if (!isValidProjectKey(key)) {
    throw new Error(
      `Invalid project key "${input.key}": must be 2-10 chars, start with a letter, A-Z/0-9 only.`,
    );
  }
  const name = input.name.trim();
  if (!name) {
    throw new Error('Project name must not be empty.');
  }
  return { key, name, counter: 0, created: now.toISOString() };
}
