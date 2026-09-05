import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
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

beforeEach(async () => {
  ({ dir, cleanup } = await makeTmpDir());
  store = new FileStore(dir);
  projects = new ProjectRepository(store);
  tickets = new TicketRepository(store);
});
afterEach(() => cleanup());

describe('ProjectRepository', () => {
  it('creates, lists, and rejects duplicates', async () => {
    await projects.create(createProject({ key: 'PTAH', name: 'Ptah' }));
    expect((await projects.list()).map((p) => p.key)).toEqual(['PTAH']);
    await expect(projects.create(createProject({ key: 'PTAH', name: 'Dup' }))).rejects.toThrow();
  });

  it('bumps the counter monotonically and persists it', async () => {
    await projects.create(createProject({ key: 'PTAH', name: 'Ptah' }));
    expect(await projects.bumpCounter('PTAH')).toBe(1);
    expect(await projects.bumpCounter('PTAH')).toBe(2);
    expect((await projects.get('PTAH')).counter).toBe(2);
  });

  it('delete removes the whole project folder', async () => {
    await projects.create(createProject({ key: 'PTAH', name: 'Ptah' }));
    await projects.delete('PTAH');
    expect(await store.exists(store.projectDir('PTAH'))).toBe(false);
  });
});

describe('TicketRepository', () => {
  beforeEach(async () => {
    await projects.create(createProject({ key: 'PTAH', name: 'Ptah' }));
  });

  it('saves a ticket as an .md file and reads it back', async () => {
    const t = createTicket('PTAH-1', {
      title: 'First',
      project: 'PTAH',
      status: 'scheduled',
      urls: ['https://b.com', 'https://a.com'],
    });
    await tickets.save(t);

    const file = store.ticketFile('PTAH', 'PTAH-1');
    expect(await store.exists(file)).toBe(true);
    expect(await store.readText(file)).toMatch(/^---\n/);

    const back = await tickets.get('PTAH-1');
    expect(back.title).toBe('First');
    expect(back.status).toBe('scheduled');
    expect(back.urls).toEqual(['https://b.com', 'https://a.com']);
  });

  it('lists tickets for a project', async () => {
    await tickets.save(createTicket('PTAH-1', { title: 'A', project: 'PTAH' }));
    await tickets.save(createTicket('PTAH-2', { title: 'B', project: 'PTAH' }));
    expect((await tickets.listForProject('PTAH')).map((t) => t.id).sort()).toEqual([
      'PTAH-1',
      'PTAH-2',
    ]);
  });

  it('reads attachments from the attachments folder', async () => {
    await tickets.save(createTicket('PTAH-1', { title: 'A', project: 'PTAH' }));
    const adir = store.attachmentsDir('PTAH', 'PTAH-1');
    await fs.mkdir(adir, { recursive: true });
    await fs.writeFile(path.join(adir, 'diagram.png'), 'x');
    expect((await tickets.get('PTAH-1')).attachments).toEqual(['diagram.png']);
  });

  it('hardDelete removes the file and attachments', async () => {
    await tickets.save(createTicket('PTAH-1', { title: 'A', project: 'PTAH' }));
    await tickets.hardDelete('PTAH-1');
    expect(await tickets.exists('PTAH-1')).toBe(false);
  });

  describe('move', () => {
    beforeEach(async () => {
      await projects.create(createProject({ key: 'ACME', name: 'Acme' }));
    });

    it('moves the ticket file and attachments to the new project/id', async () => {
      const t = await tickets.save(createTicket('PTAH-1', { title: 'A', project: 'PTAH' }));
      const adir = store.attachmentsDir('PTAH', 'PTAH-1');
      await fs.mkdir(adir, { recursive: true });
      await fs.writeFile(path.join(adir, 'diagram.png'), 'x');
      const withAttachment = await tickets.get('PTAH-1');
      expect(withAttachment.attachments).toEqual(['diagram.png']);

      const moved = await tickets.move(withAttachment, 'ACME-1', 'ACME');

      expect(moved.id).toBe('ACME-1');
      expect(moved.project).toBe('ACME');
      expect(moved.attachments).toEqual(['diagram.png']);

      // old files gone
      expect(await store.exists(store.ticketFile('PTAH', 'PTAH-1'))).toBe(false);
      expect(await store.exists(store.attachmentsDir('PTAH', 'PTAH-1'))).toBe(false);

      // new files present
      expect(await store.exists(store.ticketFile('ACME', 'ACME-1'))).toBe(true);
      const back = await tickets.get('ACME-1');
      expect(back.id).toBe('ACME-1');
      expect(back.project).toBe('ACME');
      expect(back.title).toBe('A');
      expect(back.attachments).toEqual(['diagram.png']);

      const copied = await fs.readFile(
        path.join(store.attachmentsDir('ACME', 'ACME-1'), 'diagram.png'),
        'utf8',
      );
      expect(copied).toBe('x');

      void t;
    });

    it('moves a ticket with no attachments folder without error', async () => {
      const t = await tickets.save(createTicket('PTAH-1', { title: 'B', project: 'PTAH' }));
      const moved = await tickets.move(t, 'ACME-1', 'ACME');

      expect(moved.attachments).toEqual([]);
      expect(await store.exists(store.ticketFile('PTAH', 'PTAH-1'))).toBe(false);
      expect(await store.exists(store.attachmentsDir('ACME', 'ACME-1'))).toBe(false);

      const back = await tickets.get('ACME-1');
      expect(back.id).toBe('ACME-1');
      expect(back.project).toBe('ACME');
    });
  });
});
