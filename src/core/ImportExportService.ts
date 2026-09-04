import path from 'node:path';
import AdmZip from 'adm-zip';
import type { Ticket } from '@models/Ticket';
import { formatId } from '@shared/ids';
import type { FileStore } from '@storage/FileStore';
import type { ProjectRepository } from '@storage/ProjectRepository';
import { markdownToTicket, ticketToMarkdown } from '@storage/TicketRepository';
import type { TicketRepository } from '@storage/TicketRepository';

export interface ExportOptions {
  /** Include each ticket's attachment files in the archive. */
  media: boolean;
}

/**
 * Moves tickets in and out of the data directory as portable files.
 *
 * A single ticket with no attachments exports as a plain `.md` (frontmatter +
 * body). Anything else is a `.zip` laid out as:
 *
 *   tickets/<ID>.md
 *   attachments/<ID>/<file>      (only when `media` is set)
 *
 * Import re-allocates ids in the target project, so a round-trip preserves
 * content (title, body, status, priority, labels, due, attachments) but not ids.
 */
export class ImportExportService {
  constructor(
    private readonly store: FileStore,
    private readonly projects: ProjectRepository,
    private readonly tickets: TicketRepository,
  ) {}

  // ---- export ----------------------------------------------------------

  async exportTickets(ticketIds: string[], destPath: string, opts: ExportOptions): Promise<void> {
    const loaded: Ticket[] = [];
    for (const id of ticketIds) loaded.push(await this.tickets.get(id));

    if (destPath.toLowerCase().endsWith('.md')) {
      if (loaded.length !== 1) {
        throw new Error('Markdown export needs exactly one ticket; use a .zip destination.');
      }
      await this.store.writeText(destPath, ticketToMarkdown(loaded[0]));
      return;
    }

    const zip = new AdmZip();
    for (const ticket of loaded) {
      zip.addFile(`tickets/${ticket.id}.md`, Buffer.from(ticketToMarkdown(ticket), 'utf8'));
      if (opts.media) {
        const dir = this.store.attachmentsDir(ticket.project, ticket.id);
        for (const file of ticket.attachments) {
          zip.addFile(
            `attachments/${ticket.id}/${file}`,
            await this.store.readBytes(path.join(dir, file)),
          );
        }
      }
    }
    await this.store.writeBytes(destPath, zip.toBuffer());
  }

  async exportProject(projectKey: string, destPath: string, opts: ExportOptions): Promise<void> {
    const tickets = await this.tickets.listForProject(projectKey);
    await this.exportTickets(
      tickets.map((t) => t.id),
      destPath,
      opts,
    );
  }

  // ---- import ----------------------------------------------------------

  async importFromFiles(srcPaths: string[], targetProjectKey: string): Promise<Ticket[]> {
    if (!(await this.projects.exists(targetProjectKey))) {
      throw new Error(`Project "${targetProjectKey}" does not exist.`);
    }
    const created: Ticket[] = [];
    for (const src of srcPaths) {
      if (src.toLowerCase().endsWith('.zip')) {
        created.push(...(await this.importZip(src, targetProjectKey)));
      } else {
        created.push(await this.saveImported(await this.store.readText(src), targetProjectKey, null, null));
      }
    }
    return created;
  }

  private async importZip(src: string, projectKey: string): Promise<Ticket[]> {
    const zip = new AdmZip(await this.store.readBytes(src));
    const created: Ticket[] = [];
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      const name = entry.entryName.replace(/\\/g, '/');
      if (!/\.md$/i.test(name)) continue;
      const oldId = path.basename(name, path.extname(name));
      created.push(
        await this.saveImported(entry.getData().toString('utf8'), projectKey, oldId, zip),
      );
    }
    return created;
  }

  private async saveImported(
    raw: string,
    projectKey: string,
    oldId: string | null,
    zip: AdmZip | null,
  ): Promise<Ticket> {
    const newId = formatId(projectKey, await this.projects.bumpCounter(projectKey));
    const parsed = markdownToTicket(newId, projectKey, raw);
    await this.tickets.save({ ...parsed, id: newId, project: projectKey, deletedAt: null });

    if (zip && oldId) {
      const prefix = `attachments/${oldId}/`;
      const destDir = this.store.attachmentsDir(projectKey, newId);
      for (const entry of zip.getEntries()) {
        if (entry.isDirectory) continue;
        const name = entry.entryName.replace(/\\/g, '/');
        if (!name.startsWith(prefix)) continue;
        const file = name.slice(prefix.length);
        if (!file || file.includes('/')) continue;
        await this.store.writeBytes(path.join(destDir, file), entry.getData());
      }
    }
    return this.tickets.get(newId);
  }
}
