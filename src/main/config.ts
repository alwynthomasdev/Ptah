import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { app } from 'electron';
import type { AppConfig } from '@shared/ipc';

/**
 * Reads/writes `userData/config.json`. Holds the data directory and the theme
 * preference — everything else lives in the data directory itself.
 */

export function configPath(): string {
  return path.join(app.getPath('userData'), 'config.json');
}

export function defaultConfig(): AppConfig {
  return { dataDir: path.join(os.homedir(), 'Ptah'), theme: 'system', defaultProjectName: 'To Do' };
}

export async function loadConfig(): Promise<AppConfig> {
  try {
    const raw = await fs.readFile(configPath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    const base = defaultConfig();
    return {
      dataDir: typeof parsed.dataDir === 'string' && parsed.dataDir ? parsed.dataDir : base.dataDir,
      theme:
        parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system'
          ? parsed.theme
          : base.theme,
      defaultProjectName:
        typeof parsed.defaultProjectName === 'string' && parsed.defaultProjectName
          ? parsed.defaultProjectName
          : base.defaultProjectName,
    };
  } catch {
    return defaultConfig();
  }
}

export async function saveConfig(config: AppConfig): Promise<AppConfig> {
  await fs.mkdir(path.dirname(configPath()), { recursive: true });
  await fs.writeFile(configPath(), `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  return config;
}
