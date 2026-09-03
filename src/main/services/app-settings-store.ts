import { app } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface AppSettings {
  schemaVersion: 1;
  startMinimized: boolean;
}

const defaults = (): AppSettings => ({
  schemaVersion: 1,
  startMinimized: false,
});

export class AppSettingsStore {
  private readonly filePath = path.join(app.getPath('userData'), 'settings.json');

  async get(): Promise<AppSettings> {
    try {
      const contents = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(contents) as Partial<AppSettings>;
      if (parsed.schemaVersion !== 1 || typeof parsed.startMinimized !== 'boolean') return defaults();
      return { schemaVersion: 1, startMinimized: parsed.startMinimized };
    } catch {
      return defaults();
    }
  }

  async setStartMinimized(enabled: boolean): Promise<boolean> {
    const settings: AppSettings = { schemaVersion: 1, startMinimized: enabled };
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
    return settings.startMinimized;
  }
}
