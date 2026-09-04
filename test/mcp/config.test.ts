import { promises as fs } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readConfiguredDataDir } from '../../src/mcp/server/config';
import { makeTmpDir } from '../helpers/tmp';

let dir: string;
let cleanup: () => Promise<void>;

beforeEach(async () => {
  const t = await makeTmpDir('ptah-mcp-config-');
  dir = t.dir;
  cleanup = t.cleanup;
});
afterEach(() => cleanup());

const configFile = () => path.join(dir, 'config.json');

describe('readConfiguredDataDir', () => {
  it('returns dataDir from a valid config file', async () => {
    await fs.writeFile(configFile(), JSON.stringify({ dataDir: '/somewhere/Ptah', theme: 'dark' }));
    expect(readConfiguredDataDir(configFile())).toBe('/somewhere/Ptah');
  });

  it('throws a descriptive error when the file is missing', () => {
    expect(() => readConfiguredDataDir(configFile())).toThrow(/open ptah/i);
  });

  it('throws a descriptive error when the file is malformed JSON', async () => {
    await fs.writeFile(configFile(), '{ not json');
    expect(() => readConfiguredDataDir(configFile())).toThrow(/open ptah/i);
  });

  it('throws a descriptive error when dataDir is missing', async () => {
    await fs.writeFile(configFile(), JSON.stringify({ theme: 'dark' }));
    expect(() => readConfiguredDataDir(configFile())).toThrow(/open ptah/i);
  });

  it('throws a descriptive error when dataDir is an empty string', async () => {
    await fs.writeFile(configFile(), JSON.stringify({ dataDir: '' }));
    expect(() => readConfiguredDataDir(configFile())).toThrow(/open ptah/i);
  });

  it('throws a descriptive error when dataDir is not a string', async () => {
    await fs.writeFile(configFile(), JSON.stringify({ dataDir: 42 }));
    expect(() => readConfiguredDataDir(configFile())).toThrow(/open ptah/i);
  });
});
