import { describe, expect, it, vi } from 'vitest';
import { JiraApiError, JiraClient } from '../../src/jira/client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function client(fetchImpl: typeof fetch): JiraClient {
  return new JiraClient({
    baseUrl: 'https://x.atlassian.net/',
    email: 'me@x.com',
    token: 'tok',
    fetchImpl,
  });
}

describe('JiraClient', () => {
  it('sends Basic auth (email:token) against the v2 API', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ displayName: 'Me' }));
    const me = await client(fetchImpl as unknown as typeof fetch).myself();

    expect(me).toEqual({ displayName: 'Me' });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://x.atlassian.net/rest/api/2/myself');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from('me@x.com:tok').toString('base64')}`,
    );
  });

  it('createIssue posts { fields } and returns key + id', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ key: 'AB-12', id: '99' }, 201));
    const res = await client(fetchImpl as unknown as typeof fetch).createIssue({
      fields: { summary: 'x' },
    });

    expect(res).toEqual({ key: 'AB-12', id: '99' });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://x.atlassian.net/rest/api/2/issue');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ fields: { summary: 'x' } });
  });

  it('maps 401 to a credentials message', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ errorMessages: ['nope'] }, 401));
    await expect(client(fetchImpl as unknown as typeof fetch).myself()).rejects.toMatchObject({
      status: 401,
    });
    await expect(client(fetchImpl as unknown as typeof fetch).myself()).rejects.toThrow(
      /credentials/i,
    );
  });

  it('surfaces Jira field errors on 400', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ errors: { priority: 'Field cannot be set' } }, 400),
    );
    await expect(
      client(fetchImpl as unknown as typeof fetch).createIssue({ fields: {} }),
    ).rejects.toThrow(/priority: Field cannot be set/);
  });

  it('paginates listProjects until isLast', async () => {
    const pages = [
      { values: [{ id: 1, key: 'A', name: 'Alpha' }], isLast: false },
      { values: [{ id: 2, key: 'B', name: 'Beta' }], isLast: true },
    ];
    const fetchImpl = vi.fn(async () => jsonResponse(pages.shift()));
    const result = await client(fetchImpl as unknown as typeof fetch).listProjects();

    expect(result).toEqual([
      { id: '1', key: 'A', name: 'Alpha' },
      { id: '2', key: 'B', name: 'Beta' },
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('listIssueTypes drops sub-tasks and dedupes by id', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        values: [
          { id: 1, name: 'Task', subtask: false },
          { id: 1, name: 'Task', subtask: false },
          { id: 5, name: 'Sub-task', subtask: true },
        ],
      }),
    );
    expect(await client(fetchImpl as unknown as typeof fetch).listIssueTypes('10000')).toEqual([
      { id: '1', name: 'Task' },
    ]);
  });

  it('falls back to the project resource when createmeta 404s', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ errorMessages: ['no'] }, 404))
      .mockResolvedValueOnce(
        jsonResponse({ issueTypes: [{ id: 7, name: 'Bug', subtask: false }] }),
      );
    expect(await client(fetchImpl as unknown as typeof fetch).listIssueTypes('P')).toEqual([
      { id: '7', name: 'Bug' },
    ]);
  });

  it('wraps a network failure as JiraApiError with status 0', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    });
    await expect(client(fetchImpl as unknown as typeof fetch).myself()).rejects.toBeInstanceOf(
      JiraApiError,
    );
    await expect(client(fetchImpl as unknown as typeof fetch).myself()).rejects.toMatchObject({
      status: 0,
    });
  });

  it('times out via AbortController', async () => {
    const fetchImpl = ((_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
        );
      })) as unknown as typeof fetch;
    const c = new JiraClient({
      baseUrl: 'https://x',
      email: 'e',
      token: 't',
      fetchImpl,
      timeoutMs: 5,
    });
    await expect(c.myself()).rejects.toThrow(/did not respond/i);
  });
});
