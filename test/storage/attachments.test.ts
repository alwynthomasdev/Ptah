import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FileStore } from '@storage/FileStore';
import { ProjectRepository } from '@storage/ProjectRepository';
import { TicketRepository } from '@storage/TicketRepository';
import { createProject } from '@models/Project';
import { createTicket } from '@models/Ticket';
import { makeTmpDir } from '../helpers/tmp';

let dir: string;
let cleanup: () => Promise<void>;
let store: FileStore;
let projects: ProjectRepository;
let tickets: TicketRepository;
let srcDir: string;

beforeEach(async () => {
  ({ dir, cleanup } = await makeTmpDir());
  store = new FileStore(dir);
  projects = new ProjectRepository(store);
  tickets = new TicketRepository(store);
  await projects.create(createProject({ key: 'PTAH', name: 'Ptah' }));
  await tickets.save(createTicket('PTAH-1', { title: 'A', project: 'PTAH' }));
  srcDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ptah-src-'));
});
afterEach(async () => {
  await cleanup();
  await fs.rm(srcDir, { recursive: true, force: true });
});

describe('TicketRepository attachments', () => {
  it('copies an external file into the ticket folder', async () => {
    const src = path.join(srcDir, 'diagram.png');
    await fs.writeFile(src, 'PNGDATA');

    const list = await tickets.addAttachment('PTAH-1', src);

    expect(list).toEqual(['diagram.png']);
    const copied = await fs.readFile(
      path.join(store.attachmentsDir('PTAH', 'PTAH-1'), 'diagram.png'),
      'utf8',
    );
    expect(copied).toBe('PNGDATA');
  });

  it('de-dupes a colliding filename with a numeric suffix', async () => {
    const a = path.join(srcDir, 'a', 'notes.txt');
    const b = path.join(srcDir, 'b', 'notes.txt');
    await fs.mkdir(path.dirname(a), { recursive: true });
    await fs.mkdir(path.dirname(b), { recursive: true });
    await fs.writeFile(a, 'first');
    await fs.writeFile(b, 'second');

    await tickets.addAttachment('PTAH-1', a);
    const list = await tickets.addAttachment('PTAH-1', b);

    expect(list).toEqual(['notes (2).txt', 'notes.txt']);
  });

  it('removes one attachment and rejects unsafe names', async () => {
    const src = path.join(srcDir, 'x.txt');
    await fs.writeFile(src, 'x');
    await tickets.addAttachment('PTAH-1', src);

    await expect(tickets.removeAttachment('PTAH-1', '../project.yml')).rejects.toThrow();
    await expect(tickets.removeAttachment('PTAH-1', 'sub/x.txt')).rejects.toThrow();

    const list = await tickets.removeAttachment('PTAH-1', 'x.txt');
    expect(list).toEqual([]);
  });

  it('attachmentAbsPath refuses to escape the attachments folder', () => {
    expect(() => tickets.attachmentAbsPath('PTAH-1', '..')).toThrow();
    expect(() => tickets.attachmentAbsPath('PTAH-1', 'a/b')).toThrow();
    expect(tickets.attachmentAbsPath('PTAH-1', 'ok.png')).toBe(
      path.join(store.attachmentsDir('PTAH', 'PTAH-1'), 'ok.png'),
    );
  });
});
