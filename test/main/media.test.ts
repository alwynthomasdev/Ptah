import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveMediaPath } from '@main/appState';

const BASE = path.join('/data', 'Ptah');
const attachments = (project: string, id: string, ...rest: string[]) =>
  path.join(BASE, 'projects', project, 'attachments', id, ...rest);

describe('resolveMediaPath', () => {
  it('resolves a well-formed ptah-media URL to the attachments file', () => {
    expect(resolveMediaPath(BASE, 'ptah-media://media/PTAH/PTAH-1/diagram.png')).toBe(
      attachments('PTAH', 'PTAH-1', 'diagram.png'),
    );
  });

  it('decodes percent-encoded segments', () => {
    expect(resolveMediaPath(BASE, 'ptah-media://media/PTAH/PTAH-1/sub%20folder/a%20b.png')).toBe(
      attachments('PTAH', 'PTAH-1', 'sub folder', 'a b.png'),
    );
  });

  it('preserves project-key case (host is ignored, path carries the key)', () => {
    const out = resolveMediaPath(BASE, 'ptah-media://media/PTAH/PTAH-1/x.png');
    expect(out).toContain(`${path.sep}PTAH${path.sep}`);
  });

  it('rejects a wrong protocol', () => {
    expect(resolveMediaPath(BASE, 'file:///etc/passwd')).toBeNull();
    expect(resolveMediaPath(BASE, 'http://media/PTAH/PTAH-1/x.png')).toBeNull();
  });

  it('rejects path traversal via ".." segments', () => {
    expect(
      resolveMediaPath(BASE, 'ptah-media://media/PTAH/PTAH-1/..%2f..%2f..%2fconfig.json'),
    ).toBeNull();
    expect(resolveMediaPath(BASE, 'ptah-media://media/PTAH/..%2f..%2fsecret.md')).toBeNull();
  });

  it('rejects URLs without a filename segment', () => {
    expect(resolveMediaPath(BASE, 'ptah-media://media/PTAH/PTAH-1')).toBeNull();
    expect(resolveMediaPath(BASE, 'ptah-media://media/PTAH')).toBeNull();
  });

  it('rejects a malformed URL and an empty base dir', () => {
    expect(resolveMediaPath(BASE, 'not a url')).toBeNull();
    expect(resolveMediaPath('', 'ptah-media://media/PTAH/PTAH-1/x.png')).toBeNull();
  });
});
