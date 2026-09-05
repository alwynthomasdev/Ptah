import path from 'node:path';
import type { Ticket } from '@models/Ticket';
import { isPriority, isStatus, isTicketType, normalizeLabels, normalizeUrls } from '@models/Ticket';
import { isValidId, parseId } from '@shared/ids';
import type { FileStore } from './FileStore';
import { parseMarkdown, stringifyMarkdown } from './markdownFile';

/** Reject anything that isn't a bare filename (no traversal, no separators). */
export function assertSafeFilename(name: string): void {
  if (
    !name ||
    name === '.' ||
    name === '..' ||
    name.includes('\0') ||
    name.includes('/') ||
    name.includes('\\')
  ) {
    throw new Error(`Unsafe attachment filename: "${name}".`);
  }
}

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

  /** Move a ticket (and its attachments) to a new id/project. Writes the new
   *  file+frontmatter and moves the attachments dir, then removes the old file. */
  async move(ticket: Ticket, newId: string, newProject: string): Promise<Ticket> {
    const moved: Ticket = { ...ticket, id: newId, project: newProject };
    await this.store.writeText(this.store.ticketFile(newProject, newId), ticketToMarkdown(moved));
    const oldAttachments = this.store.attachmentsDir(ticket.project, ticket.id);
    if (await this.store.exists(oldAttachments)) {
      await this.store.move(oldAttachments, this.store.attachmentsDir(newProject, newId));
    }
    await this.store.remove(this.store.ticketFile(ticket.project, ticket.id));
    return { ...moved, attachments: await this.readAttachments(newProject, newId) };
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

  /** Copy an external file into the ticket's attachments folder, avoiding name
   *  collisions by suffixing " (2)", " (3)", … Returns the refreshed list. */
  async addAttachment(id: string, srcAbsPath: string): Promise<string[]> {
    const { project } = parseId(id);
    const dir = this.store.attachmentsDir(project, id);
    const ext = path.extname(srcAbsPath);
    const stem = path.basename(srcAbsPath, ext);
    let name = `${stem}${ext}`;
    for (let n = 2; await this.store.exists(path.join(dir, name)); n += 1) {
      name = `${stem} (${n})${ext}`;
    }
    await this.store.copyFile(srcAbsPath, path.join(dir, name));
    return this.readAttachments(project, id);
  }

  /** Remove a single attachment file. Returns the refreshed list. */
  async removeAttachment(id: string, filename: string): Promise<string[]> {
    assertSafeFilename(filename);
    const { project } = parseId(id);
    await this.store.remove(path.join(this.store.attachmentsDir(project, id), filename));
    return this.readAttachments(project, id);
  }

  /** Absolute path of one attachment, guaranteed to sit inside its folder. */
  attachmentAbsPath(id: string, filename: string): string {
    assertSafeFilename(filename);
    const { project } = parseId(id);
    const dir = this.store.attachmentsDir(project, id);
    const full = path.join(dir, filename);
    const rel = path.relative(dir, full);
    if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(`Unsafe attachment filename: "${filename}".`);
    }
    return full;
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
    type: ticket.type,
    parent: ticket.parent ?? null,
    status: ticket.status,
    priority: ticket.priority,
    created: ticket.created,
    due: ticket.due ?? null,
    labels: ticket.labels,
    urls: ticket.urls,
  };
  if (ticket.deletedAt) data.deletedAt = ticket.deletedAt;
  return stringifyMarkdown(data, ticket.description ?? '');
}

export function markdownToTicket(id: string, projectKey: string, raw: string): Ticket {
  const { data, body } = parseMarkdown(raw);
  const status = data.status;
  const priority = data.priority;
  const labels = Array.isArray(data.labels) ? data.labels.map(String) : [];
  const urls = Array.isArray(data.urls) ? data.urls.map(String) : [];
  const due = data.due == null || data.due === '' ? null : String(data.due);
  const parent =
    typeof data.parent === 'string' && isValidId(data.parent) && data.parent !== id
      ? data.parent
      : null;

  return {
    id: typeof data.id === 'string' && data.id ? data.id : id,
    title: String(data.title ?? id),
    project: typeof data.project === 'string' && data.project ? data.project : projectKey,
    type: isTicketType(data.type) ? data.type : 'task',
    parent,
    status: isStatus(status) ? status : 'backlog',
    priority: isPriority(priority) ? priority : 'medium',
    created: String(data.created ?? new Date(0).toISOString()),
    due,
    labels: normalizeLabels(labels),
    urls: normalizeUrls(urls),
    // Mirror stringifyMarkdown's body normalization so load(save(x)) === load(x).
    description: body.replace(/^\r?\n+/, '').trimEnd(),
    attachments: [],
    deletedAt: typeof data.deletedAt === 'string' ? data.deletedAt : null,
  };
}
