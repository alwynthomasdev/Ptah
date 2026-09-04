import { describe, expect, it } from 'vitest';
import { parseMarkdown, stringifyMarkdown } from '@storage/markdownFile';
import { markdownToTicket, ticketToMarkdown } from '@storage/TicketRepository';
import { createTicket } from '@models/Ticket';

describe('markdownFile', () => {
  it('parses frontmatter + body', () => {
    const { data, body } = parseMarkdown('---\ntitle: Hi\ncount: 2\n---\n\n# Heading\n\ntext');
    expect(data).toEqual({ title: 'Hi', count: 2 });
    expect(body.trim()).toBe('# Heading\n\ntext');
  });

  it('treats a file with no frontmatter as pure body', () => {
    const { data, body } = parseMarkdown('just text');
    expect(data).toEqual({});
    expect(body).toBe('just text');
  });

  it('round-trips through stringify', () => {
    const text = stringifyMarkdown({ a: 1, b: 'two' }, 'body here');
    expect(parseMarkdown(text).data).toEqual({ a: 1, b: 'two' });
    expect(parseMarkdown(text).body.trim()).toBe('body here');
  });
});

describe('ticket <-> markdown', () => {
  it('round-trips a ticket losslessly', () => {
    const original = createTicket(
      'PTAH-7',
      {
        title: 'Do the thing',
        project: 'PTAH',
        status: 'wip',
        priority: 'high',
        due: '2026-05-01T00:00:00.000Z',
        labels: ['bug', 'ui'],
        description: '# Notes\n\n- one\n- two\n\n[link](https://example.com)',
      },
      new Date('2026-01-01T00:00:00.000Z'),
    );

    const restored = markdownToTicket('PTAH-7', 'PTAH', ticketToMarkdown(original));
    expect(restored).toMatchObject({
      id: 'PTAH-7',
      title: 'Do the thing',
      project: 'PTAH',
      status: 'wip',
      priority: 'high',
      due: '2026-05-01T00:00:00.000Z',
      labels: ['bug', 'ui'],
      created: '2026-01-01T00:00:00.000Z',
    });
    expect(restored.description).toContain('[link](https://example.com)');
  });

  it('falls back to safe defaults for corrupt metadata', () => {
    const t = markdownToTicket('PTAH-9', 'PTAH', '---\nstatus: bogus\npriority: nope\n---\nbody');
    expect(t.status).toBe('backlog');
    expect(t.priority).toBe('medium');
    expect(t.title).toBe('PTAH-9');
  });

  it('falls back to an empty array when urls is missing or not an array', () => {
    expect(markdownToTicket('PTAH-9', 'PTAH', '---\nstatus: wip\n---\nbody').urls).toEqual([]);
    expect(
      markdownToTicket('PTAH-9', 'PTAH', '---\nurls: "https://a.com"\n---\nbody').urls,
    ).toEqual([]);
    expect(markdownToTicket('PTAH-9', 'PTAH', '---\nurls: 42\n---\nbody').urls).toEqual([]);
  });

  it('parses and normalizes a valid urls array, preserving order', () => {
    const t = markdownToTicket(
      'PTAH-9',
      'PTAH',
      '---\nurls:\n  - https://z.com\n  - https://a.com\n  - https://z.com\n---\nbody',
    );
    expect(t.urls).toEqual(['https://z.com', 'https://a.com']);
  });
});
