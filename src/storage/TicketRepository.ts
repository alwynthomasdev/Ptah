import type { Ticket } from '@models/Ticket';
import { isPriority, isStatus, normalizeLabels } from '@models/Ticket';
import { parseId } from '@shared/ids';
import type { FileStore } from './FileStore';
import { parseMarkdown, stringifyMarkdown } from './markdownFile';

/**
 * Maps Ticket objects to/from their `<id>.md` files. Frontmatter holds the
 * metadata; the body is the description. `attachments` is derived from the
 * ticket's attachments folder on read and never written to frontmatter.
 */
export class TicketRepository {
  constructor(private readonly store: FileStore) {}

  async listForProject(projectKey: string): Promise<Ticket[]> {
    const names = await this.store.listFiles(this.store.ticketsDir(projectKey), '.md');
    const tickets: Ticket[] = [];
    for (const name of names) {
      const id = name.replace(/\.md$/i, '');
      const ticket = await this.tryGet(projectKey, id);
      if (ticket) tickets.push(ticket);
    }
    return tickets;
  }

  async get(id: string): Promise<Ticket> {
    const { project } = parseId(id);
    const ticket = await this.tryGet(project, id);
    if (!ticket) throw new Error(`Ticket "${id}" not found.`);
    return ticket;
  }

  async exists(id: string): Promise<boolean> {
    const { project } = parseId(id);
    return this.store.exists(this.store.ticketFile(project, id));
  }

  /** Create or overwrite the ticket file. Does not touch attachments. */
  async save(ticket: Ticket): Promise<Ticket> {
    const text = ticketToMarkdown(ticket);
    await this.store.writeText(this.store.ticketFile(ticket.project, ticket.id), text);
    return { ...ticket, attachments: await this.readAttachments(ticket.project, ticket.id) };
  }

  /** Hard-delete the ticket file and its attachments folder. */
  async hardDelete(id: string): Promise<void> {
    const { project } = parseId(id);
    await this.store.remove(this.store.ticketFile(project, id));
    await this.store.remove(this.store.attachmentsDir(project, id));
  }

  async readAttachments(projectKey: string, id: string): Promise<string[]> {
    return (await this.store.listFiles(this.store.attachmentsDir(projectKey, id))).sort();
  }

  private async tryGet(projectKey: string, id: string): Promise<Ticket | null> {
    const file = this.store.ticketFile(projectKey, id);
    if (!(await this.store.exists(file))) return null;
    const raw = await this.store.readText(file);
    const ticket = markdownToTicket(id, projectKey, raw);
    ticket.attachments = await this.readAttachments(projectKey, id);
    return ticket;
  }
}

// ---- serialization (exported for tests) ---------------------------------

export function ticketToMarkdown(ticket: Ticket): string {
  const data: Record<string, unknown> = {
    id: ticket.id,
    title: ticket.title,
    project: ticket.project,
    status: ticket.status,
    priority: ticket.priority,
    created: ticket.created,
    due: ticket.due ?? null,
    labels: ticket.labels,
  };
  if (ticket.deletedAt) data.deletedAt = ticket.deletedAt;
  return stringifyMarkdown(data, ticket.description ?? '');
}

export function markdownToTicket(id: string, projectKey: string, raw: string): Ticket {
  const { data, body } = parseMarkdown(raw);
  const status = data.status;
  const priority = data.priority;
  const labels = Array.isArray(data.labels) ? data.labels.map(String) : [];
  const due = data.due == null || data.due === '' ? null : String(data.due);

  return {
    id: typeof data.id === 'string' && data.id ? data.id : id,
    title: String(data.title ?? id),
    project: typeof data.project === 'string' && data.project ? data.project : projectKey,
    status: isStatus(status) ? status : 'backlog',
    priority: isPriority(priority) ? priority : 'medium',
    created: String(data.created ?? new Date(0).toISOString()),
    due,
    labels: normalizeLabels(labels),
    description: body.trimEnd(),
    attachments: [],
    deletedAt: typeof data.deletedAt === 'string' ? data.deletedAt : null,
  };
}
