/** Small date helpers shared by UI and services. */

/** Format an ISO string as `YYYY-MM-DD`, or '' when null/invalid. */
export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/** Turn a `YYYY-MM-DD` form value into an ISO string, or null when empty. */
export function fromDateInput(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const d = new Date(`${v}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: "${value}".`);
  return d.toISOString();
}

/**
 * Today as a UTC-midnight ISO timestamp — the same shape `fromDateInput`
 * produces, so it round-trips through `<input type="date">` and the ticket
 * frontmatter unchanged.
 */
export function todayIso(now: Date = new Date()): string {
  return `${now.toISOString().slice(0, 10)}T00:00:00.000Z`;
}

/** True when a due date falls on or before today (date-only comparison). */
export function isDueTodayOrEarlier(
  iso: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) <= now.toISOString().slice(0, 10);
}

/** Human-friendly short date, e.g. "3 Sep 2026". Empty string when null. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * True when a due date is strictly before today. Date-only: a ticket due
 * *today* is not overdue, even though its stored timestamp (UTC midnight) is
 * already in the past by the time you read it.
 */
export function isOverdue(iso: string | null | undefined, now: Date = new Date()): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) < now.toISOString().slice(0, 10);
}
