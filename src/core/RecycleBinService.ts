import type { Ticket } from '@models/Ticket';
import { parseId } from '@shared/ids';
import type { FileStore } from '@storage/FileStore';
import { markdownToTicket, ticketToMarkdown } from '@storage/TicketRepository';
import type { ProjectRepository } from '@storage/ProjectRepository';

/**
 * Soft-delete for tickets. A deleted ticket's `.md` file and attachments folder
 * are moved under `.recyclebin/`, stamped with `deletedAt`. Restore moves them
 * back; purge removes them for good. Deleting a whole project bypasses this and
 * is permanent (see ProjectService).
 */
export class RecycleBinService {
  constructor(
    private readonly store: FileStore,
    private readonly projects: ProjectRepository,
  ) {}

  async list(): Promise<Ticket[]> {
    const names = await this.store.listFiles(`${this.store.recycleBinDir()}/tickets`, '.md');
    const tickets: Ticket[] = [];
    for (const name of names) {
      const id = name.replace(/\.md$/i, '');
      const raw = await this.store.readText(this.store.recycledTicketFile(id));
      const ticket = markdownToTicket(id, parseId(id).project, raw);
      ticket.attachments = await this.store.listFiles(this.store.recycledAttachmentsDir(id));
      tickets.push(ticket);
    }
    return tickets.sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''));
  }

  async moveToBin(ticket: Ticket, now: Date = new Date()): Promise<void> {
    const { project, id } = { project: ticket.project, id: ticket.id };
    const stamped: Ticket = { ...ticket, deletedAt: now.toISOString() };
    await this.store.writeText(this.store.recycledTicketFile(id), ticketToMarkdown(stamped));
    await this.store.remove(this.store.ticketFile(project, id));
    const attachSrc = this.store.attachmentsDir(project, id);
    if (await this.store.exists(attachSrc)) {
      await this.store.move(attachSrc, this.store.recycledAttachmentsDir(id));
    }
  }

  async restore(id: string): Promise<Ticket> {
    const binFile = this.store.recycledTicketFile(id);
    if (!(await this.store.exists(binFile))) {
      throw new Error(`Ticket "${id}" is not in the recycle bin.`);
    }
    const { project } = parseId(id);
    if (!(await this.projects.exists(project))) {
      throw new Error(`Cannot restore "${id}": project "${project}" no longer exists.`);
    }
    const ticket = markdownToTicket(id, project, await this.store.readText(binFile));
    ticket.deletedAt = null;
    // A sub-task's parent may have been purged or moved while this sat in the
    // bin; drop the link rather than restore a dangling reference.
    if (ticket.parent) {
      const { project: parentProject } = parseId(ticket.parent);
      if (!(await this.store.exists(this.store.ticketFile(parentProject, ticket.parent)))) {
        ticket.parent = null;
      }
    }
    await this.store.writeText(this.store.ticketFile(project, id), ticketToMarkdown(ticket));
    await this.store.remove(binFile);
    const attachSrc = this.store.recycledAttachmentsDir(id);
    if (await this.store.exists(attachSrc)) {
      await this.store.move(attachSrc, this.store.attachmentsDir(project, id));
    }
    ticket.attachments = await this.store.listFiles(this.store.attachmentsDir(project, id));
    return ticket;
  }

  async purge(id: string): Promise<void> {
    await this.store.remove(this.store.recycledTicketFile(id));
    await this.store.remove(this.store.recycledAttachmentsDir(id));
  }

  async empty(): Promise<void> {
    await this.store.remove(this.store.recycleBinDir());
  }
}
