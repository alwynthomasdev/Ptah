import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

const { loadJiraSettings, saveJiraSettings, clearJiraSettings, readJiraToken } = await import(
  '../../src/jira/config'
);

let cleanup: () => Promise<void>;

beforeEach(async () => {
  const t = await makeTmpDir('ptah-jira-config-');
  h.dir = t.dir;
  h.encAvailable = true;
  cleanup = t.cleanup;
});
afterEach(() => cleanup());

describe('jira config', () => {
  it('starts empty and disconnected', async () => {
    expect(await loadJiraSettings()).toEqual({ baseUrl: '', email: '', connected: false });
    expect(await readJiraToken()).toBeNull();
  });

  it('round-trips base URL / email and stores the token encrypted', async () => {
    const saved = await saveJiraSettings({
      baseUrl: 'https://x.atlassian.net/',
      email: '  me@x.com ',
      token: 'secret-token',
    });
    expect(saved).toEqual({
      baseUrl: 'https://x.atlassian.net',
      email: 'me@x.com',
      connected: true,
    });
    expect(await loadJiraSettings()).toEqual(saved);
    expect(await readJiraToken()).toBe('secret-token');
  });

  it('keeps the stored token when a later save omits it', async () => {
    await saveJiraSettings({ baseUrl: 'https://x.atlassian.net', email: 'me@x.com', token: 'tok' });
    await saveJiraSettings({ baseUrl: 'https://y.atlassian.net', email: 'me@y.com' });

    const settings = await loadJiraSettings();
    expect(settings.baseUrl).toBe('https://y.atlassian.net');
    expect(settings.connected).toBe(true);
    expect(await readJiraToken()).toBe('tok');
  });

  it('treats a blank token the same as omitted', async () => {
    await saveJiraSettings({ baseUrl: 'https://x.atlassian.net', email: 'me@x.com', token: 'tok' });
    await saveJiraSettings({ baseUrl: 'https://x.atlassian.net', email: 'me@x.com', token: '   ' });
    expect(await readJiraToken()).toBe('tok');
  });

  it('clear() forgets everything, including the token', async () => {
    await saveJiraSettings({ baseUrl: 'https://x.atlassian.net', email: 'me@x.com', token: 'tok' });
    expect(await clearJiraSettings()).toEqual({ baseUrl: '', email: '', connected: false });
    expect(await readJiraToken()).toBeNull();
  });

  it('rejects a base URL without an http(s) scheme', async () => {
    await expect(
      saveJiraSettings({ baseUrl: 'x.atlassian.net', email: 'me@x.com', token: 'tok' }),
    ).rejects.toThrow(/http/i);
  });

  it('refuses to store a token when the OS keychain is unavailable', async () => {
    h.encAvailable = false;
    await expect(
      saveJiraSettings({ baseUrl: 'https://x.atlassian.net', email: 'me@x.com', token: 'tok' }),
    ).rejects.toThrow(/keychain is unavailable/i);
  });

  it('throws a readable error decrypting when the keychain is unavailable', async () => {
    await saveJiraSettings({ baseUrl: 'https://x.atlassian.net', email: 'me@x.com', token: 'tok' });
    h.encAvailable = false;
    await expect(readJiraToken()).rejects.toThrow(/cannot be decrypted/i);
  });
});
