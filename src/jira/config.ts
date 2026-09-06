import { promises as fs } from 'node:fs';
import path from 'node:path';
import { app, safeStorage } from 'electron';
import type { JiraSettings } from '@shared/ipc';

/**
 * Reads/writes `userData/jira.json` — deliberately *not* `config.json`, which is
 * plaintext and also read by the bundled MCP server. The API token is stored
 * encrypted via Electron `safeStorage` (OS-backed: DPAPI on Windows, Keychain
 * on macOS, libsecret on Linux) and is never returned to the renderer.
 */

interface StoredJiraConfig {
  baseUrl: string;
  email: string;
  /** base64 of `safeStorage.encryptString(token)`, or null when unset. */
  tokenCipher: string | null;
}

function jiraConfigPath(): string {
  return path.join(app.getPath('userData'), 'jira.json');
}

function empty(): StoredJiraConfig {
  return { baseUrl: '', email: '', tokenCipher: null };
}

async function read(): Promise<StoredJiraConfig> {
  try {
    const raw = await fs.readFile(jiraConfigPath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoredJiraConfig>;
    return {
      baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '',
      email: typeof parsed.email === 'string' ? parsed.email : '',
      tokenCipher: typeof parsed.tokenCipher === 'string' ? parsed.tokenCipher : null,
    };
  } catch {
    return empty();
  }
}

async function write(cfg: StoredJiraConfig): Promise<void> {
  await fs.mkdir(path.dirname(jiraConfigPath()), { recursive: true });
  await fs.writeFile(jiraConfigPath(), `${JSON.stringify(cfg, null, 2)}\n`, 'utf8');
}

/** Public view: base URL / email, and whether a token is stored. Never the token. */
export async function loadJiraSettings(): Promise<JiraSettings> {
  const cfg = await read();
  return { baseUrl: cfg.baseUrl, email: cfg.email, connected: cfg.tokenCipher !== null };
}

/** The decrypted token, or null. Main-process only — never send this anywhere. */
export async function readJiraToken(): Promise<string | null> {
  const cfg = await read();
  if (!cfg.tokenCipher) return null;
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('This OS keychain is unavailable, so the stored Jira token cannot be decrypted.');
  }
  try {
    return safeStorage.decryptString(Buffer.from(cfg.tokenCipher, 'base64'));
  } catch {
    throw new Error('The stored Jira token could not be decrypted; re-enter it in Settings.');
  }
}

/** Persist base URL / email. A non-empty `token` replaces the stored one; an
 *  omitted or blank `token` keeps whatever is already there. */
export async function saveJiraSettings(input: {
  baseUrl: string;
  email: string;
  token?: string;
}): Promise<JiraSettings> {
  const baseUrl = input.baseUrl.trim().replace(/\/+$/, '');
  const email = input.email.trim();
  if (baseUrl && !/^https?:\/\/.+/i.test(baseUrl)) {
    throw new Error('Base URL must start with http:// or https://');
  }
  const prev = await read();
  let tokenCipher = prev.tokenCipher;
  const token = input.token?.trim();
  if (token) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error(
        'This OS keychain is unavailable, so the Jira API token cannot be stored securely.',
      );
    }
    tokenCipher = safeStorage.encryptString(token).toString('base64');
  }
  await write({ baseUrl, email, tokenCipher });
  return { baseUrl, email, connected: tokenCipher !== null };
}

export async function clearJiraSettings(): Promise<JiraSettings> {
  await write(empty());
  return { baseUrl: '', email: '', connected: false };
}
