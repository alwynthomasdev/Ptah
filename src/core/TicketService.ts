import type { NewTicketInput, Ticket, TicketPatch } from '@models/Ticket';
import { applyPatch, createTicket } from '@models/Ticket';
import { formatId } from '@shared/ids';
import type { ProjectRepository } from '@storage/ProjectRepository';
import type { TicketRepository } from '@storage/TicketRepository';
import type { RecycleBinService } from './RecycleBinService';

/** Orchestrates ticket CRUD across the ticket + project repositories. */
export class TicketService {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly projects: ProjectRepository,
    private readonly bin: RecycleBinService,
  ) {}

  /** All live tickets, optionally scoped to one project. */
  async list(projectKey?: string): Promise<Ticket[]> {
    if (projectKey) return this.tickets.listForProject(projectKey);
    const all: Ticket[] = [];
    for (const project of await this.projects.list()) {
      all.push(...(await this.tickets.listForProject(project.key)));
    }
    return all;
  }

  get(id: string): Promise<Ticket> {
    return this.tickets.get(id);
  }

  async create(input: NewTicketInput): Promise<Ticket> {
    if (!(await this.projects.exists(input.project))) {
      throw new Error(`Project "${input.project}" does not exist.`);
    }
    const n = await this.projects.bumpCounter(input.project);
    const ticket = createTicket(formatId(input.project, n), input);
    return this.tickets.save(ticket);
  }

  async update(id: string, patch: TicketPatch): Promise<Ticket> {
    const current = await this.tickets.get(id);
    return this.tickets.save(applyPatch(current, patch));
  }

  /** Move a ticket to a different project, minting it a new id there. */
  async changeProject(id: string, targetProjectKey: string): Promise<Ticket> {
    const current = await this.tickets.get(id);
    const target = targetProjectKey.trim().toUpperCase();
    if (!(await this.projects.exists(target))) {
      throw new Error(`Project "${target}" does not exist.`);
    }
    if (target === current.project) return current; // no-op, allowed
    const n = await this.projects.bumpCounter(target);
    const newId = formatId(target, n);
    return this.tickets.move(current, newId, target);
  }

  /** Soft-delete: move the ticket to the recycle bin. */
  async delete(id: string): Promise<void> {
    const ticket = await this.tickets.get(id);
    await this.bin.moveToBin(ticket);
  }

  // ---- attachments -------------------------------------------------------

  async addAttachment(id: string, srcAbsPath: string): Promise<Ticket> {
    await this.tickets.addAttachment(id, srcAbsPath);
    return this.tickets.get(id);
  }

  async removeAttachment(id: string, filename: string): Promise<Ticket> {
    await this.tickets.removeAttachment(id, filename);
    return this.tickets.get(id);
  }

  attachmentAbsPath(id: string, filename: string): string {
    return this.tickets.attachmentAbsPath(id, filename);
  }
}
