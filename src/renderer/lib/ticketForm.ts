import type { Priority, Status, TicketType } from '@models/Ticket';
import { DEFAULT_PROJECT_KEY } from '@models/Project';

/**
 * Shape of the reactive form object bound by `TicketForm.vue`. Shared between
 * the create dialog and the ticket page's edit mode so both build/parse it
 * the same way. `labels`/`urls` are raw textarea strings (comma/newline
 * separated respectively) — parsing into arrays happens where the form is
 * submitted.
 */
export interface TicketFormModel {
  title: string;
  type: TicketType;
  /** Parent ticket id, or '' for no parent. */
  parent: string;
  status: Status;
  priority: Priority;
  due: string;
  labels: string;
  urls: string;
  description: string;
  project: string;
}

/**
 * Seed value for a "which project" dropdown, matching the create dialog's
 * precedence: an explicit preference, else the active project, else the
 * default `TODO` project if it exists, else the first project, else ''.
 */
export function defaultProjectKey(
  preferred: string | null | undefined,
  activeKey: string | null,
  items: { key: string }[],
): string {
  return (
    preferred ??
    activeKey ??
    (items.some((p) => p.key === DEFAULT_PROJECT_KEY)
      ? DEFAULT_PROJECT_KEY
      : (items[0]?.key ?? ''))
  );
}
