import { AppContext } from '@core/AppContext';
import { readConfiguredDataDir } from './config';

/**
 * Builds a fresh `AppContext` for the data directory named in `config.json`.
 * Deliberately uncached: called fresh on every tool invocation so a data-dir
 * change made through Ptah's Settings is picked up without restarting this
 * process.
 */
export async function getContext(configPath: string): Promise<AppContext> {
  const ctx = new AppContext(readConfiguredDataDir(configPath));
  await ctx.init();
  return ctx;
}
