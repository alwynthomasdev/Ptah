import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Make a fresh temp directory for a test and hand back a cleanup fn. */
export async function makeTmpDir(prefix = 'ptah-test-'): Promise<{
  dir: string;
  cleanup: () => Promise<void>;
}> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  return {
    dir,
    cleanup: () => fs.rm(dir, { recursive: true, force: true }),
  };
}
