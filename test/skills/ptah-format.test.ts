import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';
import { createProject } from '@models/Project';
import { PRIORITIES, STATUSES, TICKET_TYPES, createTicket } from '@models/Ticket';
import { createNotebook } from '@models/Notebook';
import { createNote } from '@models/Note';
import { isValidId } from '@shared/ids';
import { parseMarkdown } from '@storage/markdownFile';
import { ticketToMarkdown } from '@storage/TicketRepository';
import { noteToMarkdown } from '@storage/NoteRepository';

/**
 * Guards `.claude/skills/ptah/SKILL.md` against silent drift from the on-disk
 * ticket format. The skill is a downloadable, hand-maintained mirror of the
 * format; if an enum, a frontmatter key, the id shape, or `project.yml` changes
 * in the code without the skill being updated, this fails. Keep the skill's
 * embedded `format-summary` block and the code in step, and bump the skill's
 * version + changelog. See CLAUDE.md ("The Ptah skill").
 */

const skillText = readFileSync(new URL('../../.claude/skills/ptah/SKILL.md', import.meta.url), 'utf8');

const frontmatter = parseMarkdown(skillText).data as Record<string, unknown>;

function readFormatSummary(): Record<string, unknown> {
  for (const m of skillText.matchAll(/```yaml\r?\n([\s\S]*?)\r?\n```/g)) {
    if (m[1].includes('format-summary')) {
      return yaml.load(m[1]) as Record<string, unknown>;
    }
  }
  throw new Error('No ```yaml block containing "format-summary" found in SKILL.md');
}

const summary = readFormatSummary();

describe('ptah skill: format-summary matches the code', () => {
  it('is the ptah skill with a version', () => {
    expect(frontmatter.name).toBe('ptah');
    expect(frontmatter.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(summary.skillVersion).toBe(frontmatter.version);
    expect(String(summary.verifiedAgainstPtah)).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('lists exactly the ticket statuses', () => {
    expect(summary.statuses).toEqual([...STATUSES]);
  });

  it('lists exactly the ticket priorities', () => {
    expect(summary.priorities).toEqual([...PRIORITIES]);
  });

  it('lists exactly the ticket types', () => {
    expect(summary.types).toEqual([...TICKET_TYPES]);
  });

  it('lists the frontmatter keys Ptah actually writes, in order', () => {
    const ticket = createTicket(
      'PTAH-1',
      { title: 'sample', project: 'PTAH' },
      new Date('2026-01-01T00:00:00.000Z'),
    );
    const written = Object.keys(parseMarkdown(ticketToMarkdown(ticket)).data);
    expect(summary.frontmatterKeys).toEqual(written);
  });

  it('lists the project.yml keys, in order', () => {
    const keys = Object.keys(createProject({ key: 'PTAH', name: 'Ptah' }));
    expect(summary.projectYmlKeys).toEqual(keys);
  });

  it('lists the note frontmatter keys Ptah actually writes, in order', () => {
    const note = createNote(
      'NOTEBOOK-1',
      { title: 'sample', notebook: 'NOTEBOOK' },
      new Date('2026-01-01T00:00:00.000Z'),
    );
    const written = Object.keys(parseMarkdown(noteToMarkdown(note)).data);
    expect(summary.noteFrontmatterKeys).toEqual(written);
  });

  it('lists the notebook.yml keys, in order', () => {
    const keys = Object.keys(createNotebook({ key: 'NOTEBOOK', name: 'notebook' }));
    expect(summary.notebookYmlKeys).toEqual(keys);
  });

  it('documents an id pattern that agrees with isValidId', () => {
    const idRe = new RegExp(summary.idPattern as string);
    const samples: Array<[string, boolean]> = [
      ['PTAH-12', true],
      ['TODO-1', true],
      ['AB1-3', true],
      ['P-1', false],
      ['ptah-1', false],
      ['PTAH-0', false],
      ['PTAH-01', false],
      ['PTAH12', false],
      ['PTAH-12x', false],
      ['TOOLONGKEYX-1', false],
    ];
    for (const [id, ok] of samples) {
      expect(idRe.test(id), `pattern: ${id}`).toBe(ok);
      expect(isValidId(id), `isValidId: ${id}`).toBe(ok);
    }
  });
});
