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

  /** Soft-delete: move the ticket to the recycle bin. */
  async delete(id: string): Promise<void> {
    const ticket = await this.tickets.get(id);
    await this.bin.moveToBin(ticket);
  }
}
