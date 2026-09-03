/**
 * Plain-object Result type carried across the IPC boundary. Errors thrown in the
 * main process are converted to `{ ok: false, error }` so the renderer never
 * sees an opaque Electron IPC exception.
 */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<T = never>(error: unknown): Result<T> {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : String(error);
  return { ok: false, error: message };
}

/** Wrap an async op, converting any throw into an `err` Result. */
export async function tryResult<T>(fn: () => Promise<T> | T): Promise<Result<T>> {
  try {
    return ok(await fn());
  } catch (e) {
    return err(e);
  }
}

/** Unwrap a Result, throwing on failure. Handy in the renderer + tests. */
export function unwrap<T>(r: Result<T>): T {
  if (r.ok) return r.value;
  throw new Error(r.error);
}
