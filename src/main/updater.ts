import { autoUpdater } from 'electron-updater';
import type { UpdateInfo as ElectronUpdateInfo } from 'electron-updater';
import { err, ok, type Result } from '@shared/result';
import type { UpdateInfo } from '@shared/ipc';

/**
 * Thin wrapper around `electron-updater`'s `autoUpdater` singleton, matching
 * every other main-side entry point's request/response shape (`Result<T>`)
 * instead of the raw event emitter.
 *
 * Note: `autoUpdater` is a lazy getter that constructs its platform-specific
 * updater (and reads `app.getVersion()`) on first property access — touching
 * it at module scope crashes the main process before `app` is ready (this
 * module is imported transitively at startup via `ipc.ts`). So nothing here
 * touches `autoUpdater` until a function below is actually called, which only
 * happens after the renderer triggers a check post-app-ready.
 */

/** electron-updater's `releaseNotes` can be a string or per-version notes; we only surface one string. */
function extractReleaseNotes(info: ElectronUpdateInfo): string | undefined {
  const notes = info.releaseNotes;
  if (typeof notes === 'string') return notes;
  if (Array.isArray(notes) && notes.length > 0) {
    const first = notes[0];
    if (first && typeof first.note === 'string') return first.note;
  }
  return undefined;
}

/**
 * Checks GitHub Releases for a newer version. Resolves `Ok(null)` when
 * already current (or on macOS, where unsigned builds can't self-update, so
 * we skip the network call entirely).
 */
export async function checkForUpdate(): Promise<Result<UpdateInfo | null>> {
  if (process.platform === 'darwin') return ok(null);

  // `autoDownload` is off so a check never silently starts pulling bytes —
  // the renderer always asks before download. Idempotent, so safe to set on
  // every call; this is also the first touch of `autoUpdater` in the process.
  autoUpdater.autoDownload = false;

  return new Promise((resolve) => {
    const cleanup = () => {
      autoUpdater.removeListener('update-available', onAvailable);
      autoUpdater.removeListener('update-not-available', onNotAvailable);
      autoUpdater.removeListener('error', onError);
    };
    const onAvailable = (info: ElectronUpdateInfo) => {
      cleanup();
      resolve(ok({ version: info.version, releaseNotes: extractReleaseNotes(info) }));
    };
    const onNotAvailable = () => {
      cleanup();
      resolve(ok(null));
    };
    const onError = (error: Error) => {
      cleanup();
      resolve(err(error));
    };

    autoUpdater.once('update-available', onAvailable);
    autoUpdater.once('update-not-available', onNotAvailable);
    autoUpdater.once('error', onError);

    autoUpdater.checkForUpdates().catch(onError);
  });
}

/** Downloads the update found by `checkForUpdate`. Resolves once fully downloaded. */
export async function downloadUpdate(): Promise<Result<void>> {
  return new Promise((resolve) => {
    const cleanup = () => {
      autoUpdater.removeListener('update-downloaded', onDownloaded);
      autoUpdater.removeListener('error', onError);
    };
    const onDownloaded = () => {
      cleanup();
      resolve(ok(undefined));
    };
    const onError = (error: Error) => {
      cleanup();
      resolve(err(error));
    };

    autoUpdater.once('update-downloaded', onDownloaded);
    autoUpdater.once('error', onError);

    autoUpdater.downloadUpdate().catch(onError);
  });
}

/** Quits the app and runs the downloaded installer. Only call after `downloadUpdate` resolves. */
export function installUpdate(): void {
  autoUpdater.quitAndInstall();
}
