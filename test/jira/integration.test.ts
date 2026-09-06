import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Ticket } from '@models/Ticket';
import { makeTmpDir } from '../helpers/tmp';

const h = vi.hoisted(() => ({ dir: '', encAvailable: true }));

vi.mock('electron', () => ({
  app: { getPath: () => h.dir },
  safeStorage: {
    isEncryptionAvailable: () => h.encAvailable,
    encryptString: (s: string) => Buffer.from(`enc:${s}`),
    decryptString: (b: Buffer) => Buffer.from(b).toString('utf8').replace(/^enc:/, ''),
  },
}));

const { saveSettings, clearSettings, testConnection, listProjects, pushTicket } = await import(
  '../../src/jira/integration'
);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const baseTicket: Ticket = {
  id: 'AB-1',
  title: 'Ship it',
  project: 'AB',
  type: 'task',
  parent: null,
  status: 'wip',
  priority: 'high',
  created: '2026-01-01T00:00:00.000Z',
  due: null,
  labels: [],
  urls: ['https://notes.example/x'],
  description: 'body text',
  attachments: [],
};

function fakeCtx(ticket: Ticket = baseTicket) {
  const update = vi.fn(async (_id: string, patch: { urls?: string[] }) => ({ ...ticket, ...patch }));
  return { ctx: { tickets: { get: vi.fn(async () => ticket), update } }, update };
}

let cleanup: () => Promise<void>;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  const t = await makeTmpDir('ptah-jira-integration-');
  h.dir = t.dir;
  h.encAvailable = true;
  cleanup = t.cleanup;
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  await saveSettings({ baseUrl: 'https://x.atlassian.net', email: 'me@x.com', token: 'tok' });
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await cleanup();
});

describe('testConnection', () => {
  it('reports the display name on success', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ displayName: 'Me McGee' }));
    expect(await testConnection()).toEqual({ ok: true, displayName: 'Me McGee' });
  });

  it('reports a readable error on 401', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ errorMessages: ['bad'] }, 401));
    const status = await testConnection();
    expect(status.ok).toBe(false);
    expect(status.error).toMatch(/credentials/i);
  });
});

describe('listProjects', () => {
  it('fails clearly when Jira is not fully configured', async () => {
    await clearSettings();
    await expect(listProjects()).rejects.toThrow(/not fully configured/i);
  });
});

describe('pushTicket', () => {
  it('creates an issue with priority and appends its browse URL to the ticket', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ key: 'AB-5', id: '500' }, 201));
    const { ctx, update } = fakeCtx();

    const result = await pushTicket(ctx, 'AB-1', { projectId: '10', issueTypeId: '3' });

    expect(result).toEqual({ issueKey: 'AB-5', url: 'https://x.atlassian.net/browse/AB-5' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://x.atlassian.net/rest/api/2/issue');
    expect(JSON.parse(init.body as string).fields.priority).toEqual({ name: 'High' });
    expect(update).toHaveBeenCalledWith('AB-1', {
      urls: ['https://notes.example/x', 'https://x.atlassian.net/browse/AB-5'],
    });
  });

  it('retries without priority when the project rejects that field', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ errors: { priority: 'cannot be set' } }, 400))
      .mockResolvedValueOnce(jsonResponse({ key: 'AB-6', id: '600' }, 201));
    const { ctx } = fakeCtx();

    const result = await pushTicket(ctx, 'AB-1', { projectId: '10', issueTypeId: '3' });

    expect(result.issueKey).toBe('AB-6');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string);
    expect('priority' in secondBody.fields).toBe(false);
  });

  it('propagates a non-priority 400 without retrying', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ errors: { summary: 'is required' } }, 400));
    const { ctx, update } = fakeCtx();

    await expect(pushTicket(ctx, 'AB-1', { projectId: '10', issueTypeId: '3' })).rejects.toThrow(
      /summary: is required/,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();
  });

  it('requires a project and issue type', async () => {
    const { ctx } = fakeCtx();
    await expect(
      pushTicket(ctx, 'AB-1', { projectId: '', issueTypeId: '' }),
    ).rejects.toThrow(/project and issue type/i);
  });
});
