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

  /** Every live ticket whose `parent` points at `parentId`, across all projects. */
  async listChildren(parentId: string): Promise<Ticket[]> {
    return (await this.list()).filter((t) => t.parent === parentId);
  }

  async create(input: NewTicketInput): Promise<Ticket> {
    if (!(await this.projects.exists(input.project))) {
      throw new Error(`Project "${input.project}" does not exist.`);
    }
    if (input.parent != null) await this.assertParentAllowed(null, input.parent);
    const n = await this.projects.bumpCounter(input.project);
    const ticket = createTicket(formatId(input.project, n), input);
    return this.tickets.save(ticket);
  }

  async update(id: string, patch: TicketPatch): Promise<Ticket> {
    const current = await this.tickets.get(id);
    if (typeof patch.parent === 'string') await this.assertParentAllowed(id, patch.parent);
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
    const moved = await this.tickets.move(current, newId, target);
    // The id just changed; repoint any sub-tasks that referenced the old one.
    await this.relinkParent(id, newId);
    return moved;
  }

  /** Soft-delete: move the ticket to the recycle bin, orphaning its sub-tasks. */
  async delete(id: string): Promise<void> {
    const ticket = await this.tickets.get(id);
    for (const child of await this.listChildren(id)) {
      await this.tickets.save({ ...child, parent: null });
    }
    await this.bin.moveToBin(ticket);
  }

  /**
   * Guard the two-level hierarchy for a proposed `child -> parent` link.
   * `childId` is null when the child doesn't exist yet (creation).
   */
  private async assertParentAllowed(childId: string | null, parentId: string): Promise<void> {
    if (parentId === childId) throw new Error("A ticket can't be its own parent.");
    if (!(await this.tickets.exists(parentId))) {
      throw new Error(`Parent ticket "${parentId}" does not exist.`);
    }
    const parent = await this.tickets.get(parentId);
    if (parent.parent != null) {
      throw new Error(
        `"${parentId}" is already a sub-task of "${parent.parent}"; nesting is two levels deep.`,
      );
    }
    if (childId != null && (await this.listChildren(childId)).length > 0) {
      throw new Error(`"${childId}" has sub-tasks of its own and can't also be a sub-task.`);
    }
  }

  /** Rewrite every ticket whose `parent` is `oldId` to point at `newId`. */
  private async relinkParent(oldId: string, newId: string): Promise<void> {
    for (const t of await this.list()) {
      if (t.parent === oldId) await this.tickets.save({ ...t, parent: newId });
    }
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
