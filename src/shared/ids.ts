/** Ticket id helpers. Ids look like `PTAH-12`: a project key, a dash, a number. */

export interface ParsedId {
  project: string;
  number: number;
}

const ID_PATTERN = /^([A-Z][A-Z0-9]{1,9})-([1-9][0-9]*)$/;

export function formatId(project: string, n: number): string {
  return `${project.toUpperCase()}-${n}`;
}

export function parseId(id: string): ParsedId {
  const m = ID_PATTERN.exec(id.trim());
  if (!m) throw new Error(`Malformed ticket id: "${id}".`);
  return { project: m[1], number: Number(m[2]) };
}

export function isValidId(id: string): boolean {
  return ID_PATTERN.test(id.trim());
}

/**
 * Given a project's current counter, return the next id and the counter value
 * to persist. Kept pure so the storage layer owns the read/write.
 */
export function nextId(projectKey: string, counter: number): { id: string; counter: number } {
  const n = counter + 1;
  return { id: formatId(projectKey, n), counter: n };
}
