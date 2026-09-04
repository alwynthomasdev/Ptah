import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// integration.ts pulls configPath() from src/main/config.ts, which reads
// `app.getPath('userData')` — mock it the same way test/main/config.test.ts does.
vi.mock('electron', () => ({
  app: { getPath: (name: string) => (name === 'userData' ? '/fake/userData' : '/fake/userData') },
}));

type ExecCallback = (error: (Error & { code?: string }) | null, stdout: string, stderr: string) => void;
const execFileMock = vi.fn<(command: string, args: string[], cb: ExecCallback) => void>();
vi.mock('node:child_process', () => ({
  execFile: (command: string, args: string[], cb: ExecCallback) => execFileMock(command, args, cb),
}));

const { mergeMcpServerEntry, removeMcpServerEntry, detect, connect, disconnect } = await import(
  '../../src/mcp/integration'
);

const expectedConfigPath = path.join('/fake/userData', 'config.json');
// Mirrors integration.ts's own `path.join(__dirname, '../mcp/index.js')`,
// where `__dirname` is `<repoRoot>/src/mcp`.
const expectedMcpScriptPath = path.resolve(__dirname, '../../src/mcp/index.js');

function succeed(stdout = ''): void {
  execFileMock.mockImplementationOnce((_cmd, _args, cb) => cb(null, stdout, ''));
}
function failEnoent(): void {
  execFileMock.mockImplementationOnce((_cmd, _args, cb) => {
    const err = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    cb(err, '', '');
  });
}
function failGeneric(): void {
  execFileMock.mockImplementationOnce((_cmd, _args, cb) => cb(new Error('boom'), '', ''));
}

beforeEach(() => {
  execFileMock.mockReset();
});

describe('mergeMcpServerEntry', () => {
  const entry = { command: 'node', args: ['index.js'], env: { FOO: 'bar' } };

  it('adds ptah under mcpServers on an empty object', () => {
    expect(mergeMcpServerEntry({}, entry)).toEqual({ mcpServers: { ptah: entry } });
  });

  it('preserves unrelated top-level keys and other mcpServers entries', () => {
    const input = {
      someOtherSetting: true,
      mcpServers: { jira: { command: 'jira-mcp', args: [], env: {} } },
    };
    expect(mergeMcpServerEntry(input, entry)).toEqual({
      someOtherSetting: true,
      mcpServers: {
        jira: { command: 'jira-mcp', args: [], env: {} },
        ptah: entry,
      },
    });
  });

  it('overwrites an existing ptah entry', () => {
    const input = { mcpServers: { ptah: { command: 'old', args: [], env: {} } } };
    expect(mergeMcpServerEntry(input, entry)).toEqual({ mcpServers: { ptah: entry } });
  });
});

describe('removeMcpServerEntry', () => {
  it('is a no-op on an empty object', () => {
    expect(removeMcpServerEntry({})).toEqual({ mcpServers: {} });
  });

  it('removes only ptah, preserving other entries and top-level keys', () => {
    const input = {
      someOtherSetting: true,
      mcpServers: {
        jira: { command: 'jira-mcp', args: [], env: {} },
        ptah: { command: 'node', args: [], env: {} },
      },
    };
    expect(removeMcpServerEntry(input)).toEqual({
      someOtherSetting: true,
      mcpServers: { jira: { command: 'jira-mcp', args: [], env: {} } },
    });
  });
});

describe('Claude Code target', () => {
  afterEach(() => {
    execFileMock.mockReset();
  });

  it('detect(): ENOENT on --version means not installed, and connected is not checked', async () => {
    failEnoent();
    const result = await detect();
    expect(result.code).toEqual({ installed: false, connected: false });
    expect(execFileMock).toHaveBeenCalledTimes(1);
    expect(execFileMock.mock.calls[0][0]).toBe('claude');
    expect(execFileMock.mock.calls[0][1]).toEqual(['--version']);
  });

  it('detect(): successful --version means installed', async () => {
    succeed('2.1.0');
    failGeneric(); // `mcp get` — treat as not-connected.
    const result = await detect();
    expect(result.code).toEqual({ installed: true, connected: false });
  });

  it('detect(): a non-zero-exit --version still counts as installed', async () => {
    failGeneric();
    failGeneric();
    const result = await detect();
    expect(result.code.installed).toBe(true);
  });

  it('connect("code"): removes then adds with the exact expected argv, never shelling out', async () => {
    failGeneric(); // remove — swallowed
    succeed(); // add
    succeed('2.1.0'); // detect(): --version
    succeed(); // detect(): mcp get -> connected

    await connect('code');

    const calls = execFileMock.mock.calls;
    expect(calls[0][0]).toBe('claude');
    expect(calls[0][1]).toEqual(['mcp', 'remove', 'ptah', '-s', 'user']);

    expect(calls[1][0]).toBe('claude');
    expect(calls[1][1]).toEqual([
      'mcp',
      'add',
      'ptah',
      '-s',
      'user',
      '-e',
      'ELECTRON_RUN_AS_NODE=1',
      '--',
      process.execPath,
      expectedMcpScriptPath,
      '--config',
      expectedConfigPath,
    ]);
  });

  it('disconnect("code"): removes with the exact expected argv, swallowing a "not found" failure', async () => {
    failGeneric(); // remove — swallowed as no-op
    failEnoent(); // detect(): --version -> not installed

    const result = await disconnect('code');

    expect(execFileMock.mock.calls[0][0]).toBe('claude');
    expect(execFileMock.mock.calls[0][1]).toEqual(['mcp', 'remove', 'ptah', '-s', 'user']);
    expect(result).toEqual({ installed: false, connected: false });
  });
});
