import { promises as fs } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeTmpDir } from '../helpers/tmp';

// config.ts reads `app.getPath('userData')` — point it at a temp dir per test.
let userData = '';
vi.mock('electron', () => ({
  app: { getPath: (name: string) => (name === 'userData' ? userData : userData) },
}));

const { loadConfig, saveConfig, defaultConfig } = await import('@main/config');

let cleanup: () => Promise<void>;

beforeEach(async () => {
  const t = await makeTmpDir('ptah-config-');
  userData = t.dir;
  cleanup = t.cleanup;
});
afterEach(() => cleanup());

const configFile = () => path.join(userData, 'config.json');

describe('loadConfig', () => {
  it('returns defaults when no config file exists', async () => {
    expect(await loadConfig()).toEqual(defaultConfig());
  });

  it('returns defaults when the file is malformed JSON', async () => {
    await fs.writeFile(configFile(), '{ not json');
    expect(await loadConfig()).toEqual(defaultConfig());
  });

  it('falls back field-by-field for an unknown theme and empty dataDir', async () => {
    await fs.writeFile(configFile(), JSON.stringify({ dataDir: '', theme: 'neon' }));
    const cfg = await loadConfig();
    expect(cfg.theme).toBe('system');
    expect(cfg.dataDir).toBe(defaultConfig().dataDir);
  });

  it('keeps a valid persisted config', async () => {
    await fs.writeFile(configFile(), JSON.stringify({ dataDir: '/somewhere/Ptah', theme: 'dark' }));
    expect(await loadConfig()).toEqual({ dataDir: '/somewhere/Ptah', theme: 'dark' });
  });
});

describe('saveConfig', () => {
  it('round-trips through loadConfig and writes a trailing newline', async () => {
    const cfg = { dataDir: '/data/Ptah', theme: 'light' as const };
    const returned = await saveConfig(cfg);
    expect(returned).toEqual(cfg);
    expect(await loadConfig()).toEqual(cfg);
    expect(await fs.readFile(configFile(), 'utf8')).toMatch(/}\n$/);
  });

  it('creates the userData directory if it is missing', async () => {
    userData = path.join(userData, 'nested', 'deeper');
    const cfg = { dataDir: '/data/Ptah', theme: 'system' as const };
    await saveConfig(cfg);
    expect(await loadConfig()).toEqual(cfg);
  });
});
