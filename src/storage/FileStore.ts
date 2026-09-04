import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Owns the on-disk layout and every filesystem primitive the repositories use.
 * All paths are resolved relative to `dataDir`; nothing outside the storage
 * layer touches `fs` directly.
 *
 * Layout under dataDir:
 *   projects/<KEY>/project.yml
 *   projects/<KEY>/tickets/<ID>.md
 *   projects/<KEY>/attachments/<ID>/<file>
 *   .recyclebin/tickets/<ID>.md
 *   .recyclebin/attachments/<ID>/<file>
 */
export class FileStore {
  constructor(public readonly dataDir: string) {}

  // ---- path helpers -------------------------------------------------------
  projectsDir(): string {
    return path.join(this.dataDir, 'projects');
  }
  projectDir(key: string): string {
    return path.join(this.projectsDir(), key);
  }
  projectFile(key: string): string {
    return path.join(this.projectDir(key), 'project.yml');
  }
  ticketsDir(key: string): string {
    return path.join(this.projectDir(key), 'tickets');
  }
  ticketFile(key: string, id: string): string {
    return path.join(this.ticketsDir(key), `${id}.md`);
  }
  attachmentsDir(key: string, id: string): string {
    return path.join(this.projectDir(key), 'attachments', id);
  }
  recycleBinDir(): string {
    return path.join(this.dataDir, '.recyclebin');
  }
  recycledTicketFile(id: string): string {
    return path.join(this.recycleBinDir(), 'tickets', `${id}.md`);
  }
  recycledAttachmentsDir(id: string): string {
    return path.join(this.recycleBinDir(), 'attachments', id);
  }

  // ---- primitives -------------------------------------------------------
  async ensureDir(dir: string): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
  }

  async exists(p: string): Promise<boolean> {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  }

  async readText(p: string): Promise<string> {
    return fs.readFile(p, 'utf8');
  }

  async writeText(p: string, contents: string): Promise<void> {
    await this.ensureDir(path.dirname(p));
    const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(tmp, contents, 'utf8');
    await fs.rename(tmp, p);
  }

  async readBytes(p: string): Promise<Buffer> {
    return fs.readFile(p);
  }

  async writeBytes(p: string, contents: Buffer | Uint8Array): Promise<void> {
    await this.ensureDir(path.dirname(p));
    const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(tmp, contents);
    await fs.rename(tmp, p);
  }

  async remove(p: string): Promise<void> {
    await fs.rm(p, { recursive: true, force: true });
  }

  /** Move a file or directory, creating the destination's parent first. */
  async move(from: string, to: string): Promise<void> {
    await this.ensureDir(path.dirname(to));
    try {
      await fs.rename(from, to);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'EXDEV') {
        await fs.cp(from, to, { recursive: true });
        await fs.rm(from, { recursive: true, force: true });
      } else {
        throw e;
      }
    }
  }

  async copyFile(from: string, to: string): Promise<void> {
    await this.ensureDir(path.dirname(to));
    await fs.copyFile(from, to);
  }

  /** List immediate directory names in `dir`; [] when the dir is absent. */
  async listDirs(dir: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw e;
    }
  }

  /** List immediate file names in `dir` (optionally by extension); [] when absent. */
  async listFiles(dir: string, ext?: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      return entries
        .filter((e) => e.isFile())
        .map((e) => e.name)
        .filter((n) => (ext ? n.toLowerCase().endsWith(ext.toLowerCase()) : true));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw e;
    }
  }
}
