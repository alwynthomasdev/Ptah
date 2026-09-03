import type { Result } from '@shared/result';
import { unwrap } from '@shared/result';

/** The preload bridge. Throws early if the app is opened outside Electron. */
export const ptah = window.ptah;

/** Await an IPC Result and unwrap it, turning `{ ok: false }` into a throw. */
export async function call<T>(p: Promise<Result<T>>): Promise<T> {
  return unwrap(await p);
}
