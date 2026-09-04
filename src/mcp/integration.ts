import { execFile as execFileCb } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ClaudeDetectResult, ClaudeStatus, ClaudeTarget } from '@shared/ipc';
import { configPath } from '../main/config';

/**
 * Main-process-only half of the Claude integration: registers/unregisters
 * Ptah's MCP server (`src/mcp/server/**`, bundled to `dist-electron/mcp/index.js`)
 * with Claude Code (via the `claude` CLI) and Claude Desktop (via its config
 * file). Unlike `src/mcp/server/**`, this file *may* import `electron` — it
 * needs `process.execPath`/spawns processes — and is never touched by the
 * `scripts/build-mcp.mjs` bundle, only imported directly by `src/main/ipc.ts`.
 */

/** Promise wrapper around `child_process.execFile`, kept small and mockable. */
function execFile(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFileCb(command, args, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(error, { stdout: String(stdout ?? ''), stderr: String(stderr ?? '') }));
      } else {
        resolve({ stdout: String(stdout ?? ''), stderr: String(stderr ?? '') });
      }
    });
  });
}

/** The command + args used to launch Ptah's bundled MCP server as plain Node. */
function mcpCommand(): { command: string; mcpScriptPath: string } {
  const command = process.execPath;
  // Bundled main runs from dist-electron/main/index.js; the MCP server bundles
  // to dist-electron/mcp/index.js, a sibling directory at the same depth, so
  // this relative path resolves correctly in both dev and packaged builds.
  const mcpScriptPath = path.join(__dirname, '../mcp/index.js');
  return { command, mcpScriptPath };
}

// ---- Claude Code (CLI) ----------------------------------------------------

async function codeDetectInstalled(): Promise<boolean> {
  try {
    await execFile('claude', ['--version']);
    return true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return false;
    // Any other completion (including a non-zero exit) still means the
    // binary exists and ran.
    return true;
  }
}

async function codeDetectConnected(): Promise<boolean> {
  try {
    await execFile('claude', ['mcp', 'get', 'ptah', '-s', 'user']);
    return true;
  } catch {
    // `claude mcp get`'s exact "not found" contract wasn't confirmed live
    // during implementation — only `claude mcp add --help` was inspected.
    // Treating any failure (non-zero exit, thrown error, ENOENT) as
    // "not connected" is the safe direction: worst case this under-reports
    // a connection that Connect will happily re-establish idempotently.
    return false;
  }
}

async function codeDetect(): Promise<ClaudeStatus> {
  const installed = await codeDetectInstalled();
  const connected = installed && (await codeDetectConnected());
  return { installed, connected };
}

async function codeConnect(): Promise<ClaudeStatus> {
  const { command, mcpScriptPath } = mcpCommand();
  try {
    await execFile('claude', ['mcp', 'remove', 'ptah', '-s', 'user']);
  } catch {
    // Fine if it wasn't registered yet.
  }
  await execFile('claude', [
    'mcp',
    'add',
    'ptah',
    '-s',
    'user',
    '-e',
    'ELECTRON_RUN_AS_NODE=1',
    '--',
    command,
    mcpScriptPath,
    '--config',
    configPath(),
  ]);
  return codeDetect();
}

async function codeDisconnect(): Promise<ClaudeStatus> {
  try {
    await execFile('claude', ['mcp', 'remove', 'ptah', '-s', 'user']);
  } catch {
    // Swallow "not found" (or any other removal failure) as a no-op success.
  }
  return codeDetect();
}

// ---- Claude Desktop (config file) -----------------------------------------

/**
 * Claude Desktop's config path per platform. Windows and macOS are confirmed;
 * Linux (`~/.config/Claude/...`) is a best-effort guess, not verified live —
 * `detect()` degrades to "not installed" rather than throwing if it's wrong.
 */
export function desktopConfigPath(platform: NodeJS.Platform = process.platform): string {
  if (platform === 'win32') {
    return path.join(process.env.APPDATA ?? '', 'Claude', 'claude_desktop_config.json');
  }
  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  }
  return path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json');
}

interface McpServerEntry {
  command: string;
  args: string[];
  env: Record<string, string>;
}

function asRecord(json: unknown): Record<string, unknown> {
  return json !== null && typeof json === 'object' && !Array.isArray(json)
    ? (json as Record<string, unknown>)
    : {};
}

/**
 * Merge `entry` into `json.mcpServers.ptah`, preserving every unrelated
 * top-level key and every other `mcpServers` entry. Pure/independently
 * testable — no filesystem access.
 */
export function mergeMcpServerEntry(json: unknown, entry: McpServerEntry): Record<string, unknown> {
  const base = asRecord(json);
  const mcpServers = asRecord(base.mcpServers);
  return {
    ...base,
    mcpServers: {
      ...mcpServers,
      ptah: entry,
    },
  };
}

/**
 * Remove `json.mcpServers.ptah`, preserving every unrelated top-level key and
 * every other `mcpServers` entry. Pure/independently testable — no
 * filesystem access.
 */
export function removeMcpServerEntry(json: unknown): Record<string, unknown> {
  const base = asRecord(json);
  const mcpServers = { ...asRecord(base.mcpServers) };
  delete mcpServers.ptah;
  return {
    ...base,
    mcpServers,
  };
}

function desktopConfigDir(): string {
  return path.dirname(desktopConfigPath());
}

async function desktopInstalled(): Promise<boolean> {
  try {
    const stat = await fs.stat(desktopConfigDir());
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function readDesktopConfig(): Promise<unknown> {
  try {
    const raw = await fs.readFile(desktopConfigPath(), 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function desktopConnected(): Promise<boolean> {
  const parsed = asRecord(await readDesktopConfig());
  const mcpServers = asRecord(parsed.mcpServers);
  return mcpServers.ptah !== undefined;
}

async function desktopDetect(): Promise<ClaudeStatus> {
  const installed = await desktopInstalled();
  const connected = installed && (await desktopConnected());
  return { installed, connected };
}

async function writeDesktopConfig(json: Record<string, unknown>): Promise<void> {
  await fs.mkdir(desktopConfigDir(), { recursive: true });
  await fs.writeFile(desktopConfigPath(), `${JSON.stringify(json, null, 2)}\n`, 'utf8');
}

async function desktopConnectImpl(): Promise<ClaudeStatus> {
  const { command, mcpScriptPath } = mcpCommand();
  const current = await readDesktopConfig();
  const next = mergeMcpServerEntry(current, {
    command,
    args: [mcpScriptPath, '--config', configPath()],
    env: { ELECTRON_RUN_AS_NODE: '1' },
  });
  await writeDesktopConfig(next);
  return desktopDetect();
}

async function desktopDisconnectImpl(): Promise<ClaudeStatus> {
  // A missing file/folder is already a no-op success: readDesktopConfig()
  // returns {} and removeMcpServerEntry() is a no-op on an empty object.
  const current = await readDesktopConfig();
  const next = removeMcpServerEntry(current);
  if (await desktopInstalled()) {
    await writeDesktopConfig(next);
  }
  return desktopDetect();
}

// ---- public API -------------------------------------------------------

export async function detect(): Promise<ClaudeDetectResult> {
  const [code, desktop] = await Promise.all([codeDetect(), desktopDetect()]);
  return { code, desktop };
}

export async function connect(target: ClaudeTarget): Promise<ClaudeStatus> {
  return target === 'code' ? codeConnect() : desktopConnectImpl();
}

export async function disconnect(target: ClaudeTarget): Promise<ClaudeStatus> {
  return target === 'code' ? codeDisconnect() : desktopDisconnectImpl();
}
