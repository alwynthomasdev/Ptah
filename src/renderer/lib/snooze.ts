import { addToDate, nextMonday, todayIso } from '@shared/dates';

/**
 * Snooze presets for the per-row "bump the due date" menu (Today view list and
 * swimlane cards). Each `to()` resolves — lazily, on click — to a UTC-midnight
 * ISO string in the `todayIso()` shape. Everything is measured from today, not
 * the current due date, so "In 1 week" always means seven days from now.
 */
export const SNOOZE: { label: string; to: () => string }[] = [
  { label: 'Tomorrow', to: () => addToDate(todayIso(), { days: 1 }) },
  { label: 'In 3 days', to: () => addToDate(todayIso(), { days: 3 }) },
  { label: 'Next Monday', to: () => nextMonday() },
  { label: 'In 1 week', to: () => addToDate(todayIso(), { days: 7 }) },
  { label: 'In 2 weeks', to: () => addToDate(todayIso(), { days: 14 }) },
  { label: 'In 1 month', to: () => addToDate(todayIso(), { months: 1 }) },
];
