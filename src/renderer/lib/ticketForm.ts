import type { Priority, Status, TicketType } from '@models/Ticket';

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
