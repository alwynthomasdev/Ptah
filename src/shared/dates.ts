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

/**
 * Shift an ISO date by whole days and/or months, returning a UTC-midnight ISO
 * string in the same shape as `todayIso()` / `fromDateInput()`. Months are
 * applied before days. Month overflow follows JS defaults (e.g. Jan 31 + 1
 * month lands in early March), which is fine for the "snooze roughly a month"
 * use case. Throws on an unparseable input, like `fromDateInput`.
 */
export function addToDate(
  iso: string,
  { days = 0, months = 0 }: { days?: number; months?: number },
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: "${iso}".`);
  if (months) d.setUTCMonth(d.getUTCMonth() + months);
  if (days) d.setUTCDate(d.getUTCDate() + days);
  return `${d.toISOString().slice(0, 10)}T00:00:00.000Z`;
}

/**
 * The next occurrence of `weekday` (0 = Sunday .. 6 = Saturday) on the UTC
 * calendar, as a UTC-midnight ISO string in the `todayIso()` shape. Strictly in
 * the future: when `now` already falls on that weekday, returns one week ahead.
 * Weekday math runs on `getUTCDay()` (never local time) to stay consistent with
 * the other date-only helpers here and with how due dates are stored.
 */
export function nextWeekday(weekday = 1, now: Date = new Date()): string {
  const today = todayIso(now);
  const cur = new Date(today).getUTCDay();
  let delta = (weekday - cur + 7) % 7;
  if (delta === 0) delta = 7;
  return addToDate(today, { days: delta });
}

/** Convenience: the next UTC-calendar Monday, in the `todayIso()` shape. */
export function nextMonday(now: Date = new Date()): string {
  return nextWeekday(1, now);
}

/** How urgent a due date is, for colour-coding. `none` = no due date set. */
export type DueTone = 'none' | 'normal' | 'soon' | 'overdue';

/** A due date rendered relative to today, plus its urgency tone. */
export interface RelativeDue {
  text: string;
  tone: DueTone;
}

/** Whole-day count from `now` to `iso`, date-only (negative = in the past). */
function daysUntil(iso: string, now: Date): number {
  const d = new Date(iso);
  const dayMs = 86_400_000;
  const to = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const from = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((to - from) / dayMs);
}

/**
 * Human-friendly relative due date: "Today", "Tomorrow", "In 3 days",
 * "2 days overdue", falling back to the absolute `formatDate` form for dates
 * more than a fortnight away. `tone` is `overdue` when past, `soon` when due
 * within three days, otherwise `normal` (or `none` when there is no due date).
 */
export function formatDueRelative(
  iso: string | null | undefined,
  now: Date = new Date(),
): RelativeDue {
  if (!iso) return { text: '', tone: 'none' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { text: '', tone: 'none' };

  const diff = daysUntil(iso, now);
  const tone: DueTone = diff < 0 ? 'overdue' : diff <= 3 ? 'soon' : 'normal';

  let text: string;
  if (diff === 0) text = 'Today';
  else if (diff === 1) text = 'Tomorrow';
  else if (diff === -1) text = 'Yesterday';
  else if (diff === 7) text = 'In 1 week';
  else if (diff === 14) text = 'In 2 weeks';
  else if (diff > 1 && diff <= 14) text = `In ${diff} days`;
  else if (diff < -1 && diff >= -14) text = `${-diff} days overdue`;
  else text = formatDate(iso);

  return { text, tone };
}
