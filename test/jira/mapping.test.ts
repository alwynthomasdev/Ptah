import { describe, expect, it } from 'vitest';
import {
  PTAH_TO_JIRA_PRIORITY,
  alreadyPushedUrl,
  buildCreateFields,
  jiraBrowseUrl,
} from '../../src/jira/mapping';

const ticket = { title: 'Fix the thing', description: 'Steps:\n1. do it', priority: 'high' as const };

describe('PTAH_TO_JIRA_PRIORITY', () => {
  it('maps every Ptah priority to a stock Jira Cloud name', () => {
    expect(PTAH_TO_JIRA_PRIORITY).toEqual({
      lowest: 'Lowest',
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      highest: 'Highest',
    });
  });
});

describe('buildCreateFields', () => {
  it('builds project / issuetype / summary / description / priority by default', () => {
    expect(buildCreateFields(ticket, { projectId: '10000', issueTypeId: '3' })).toEqual({
      fields: {
        project: { id: '10000' },
        issuetype: { id: '3' },
        summary: 'Fix the thing',
        description: 'Steps:\n1. do it',
        priority: { name: 'High' },
      },
    });
  });

  it('omits priority when includePriority is false', () => {
    const { fields } = buildCreateFields(ticket, {
      projectId: '1',
      issueTypeId: '2',
      includePriority: false,
    });
    expect('priority' in fields).toBe(false);
  });

  it('omits description when the body is blank', () => {
    const { fields } = buildCreateFields(
      { ...ticket, description: '   \n  ' },
      { projectId: '1', issueTypeId: '2' },
    );
    expect('description' in fields).toBe(false);
  });
});

describe('jiraBrowseUrl', () => {
  it('joins base + key, tolerating a trailing slash', () => {
    expect(jiraBrowseUrl('https://x.atlassian.net', 'AB-1')).toBe(
      'https://x.atlassian.net/browse/AB-1',
    );
    expect(jiraBrowseUrl('https://x.atlassian.net/', 'AB-1')).toBe(
      'https://x.atlassian.net/browse/AB-1',
    );
  });
});

describe('alreadyPushedUrl', () => {
  it('finds an existing browse link for this site', () => {
    const t = { urls: ['https://example.com', 'https://x.atlassian.net/browse/AB-9'] };
    expect(alreadyPushedUrl(t, 'https://x.atlassian.net/')).toBe(
      'https://x.atlassian.net/browse/AB-9',
    );
  });

  it('returns undefined when nothing points at this site', () => {
    expect(
      alreadyPushedUrl({ urls: ['https://other/browse/Z-1'] }, 'https://x.atlassian.net'),
    ).toBeUndefined();
  });
});
