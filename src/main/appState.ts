import path from 'node:path';

/**
 * The current data directory, shared between the IPC layer (which owns the
 * `AppContext`) and the `ptah-media://` protocol handler. Kept here so both see
 * the same value when the user points Ptah at a new folder.
 */
let dataDir = '';

export function getDataDir(): string {
  return dataDir;
}

export function setDataDir(dir: string): void {
  dataDir = dir;
}

/**
 * Resolve a `ptah-media://media/<project>/<ticketId>/<file...>` URL to an
 * absolute path under `<baseDir>/projects/<project>/attachments/<ticketId>/`.
 * Returns null for a malformed URL or one that escapes the attachments folder.
 */
export function resolveMediaPath(baseDir: string, rawUrl: string): string | null {
  if (!baseDir) return null;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'ptah-media:') return null;

  const segments = url.pathname
    .split('/')
    .filter(Boolean)
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    });

  // Need at least project + ticketId + one filename segment.
  if (segments.length < 3) return null;
  const [project, ticketId, ...rest] = segments;
  if (
    [project, ticketId, ...rest].some(
      (s) => !s || s === '.' || s === '..' || s.includes('\0') || s.includes('\\') || s.includes('/'),
    )
  ) {
    return null;
  }

  const root = path.join(baseDir, 'projects', project, 'attachments', ticketId);
  const full = path.join(root, ...rest);
  const rel = path.relative(root, full);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return full;
}
