import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const electronMocks = vi.hoisted(() => ({
  getPath: vi.fn(),
}));

vi.mock('electron', () => ({
  app: { getPath: electronMocks.getPath },
}));

import { AppSettingsStore } from './app-settings-store';

let testDirectory = '';

beforeEach(async () => {
  testDirectory = await mkdtemp(path.join(os.tmpdir(), 'monitor-manager-settings-'));
  electronMocks.getPath.mockReturnValue(testDirectory);
});

afterEach(async () => {
  vi.clearAllMocks();
  await rm(testDirectory, { recursive: true, force: true });
});

describe('application settings persistence', () => {
  it('defaults to showing the main window when no settings file exists', async () => {
    await expect(new AppSettingsStore().get()).resolves.toEqual({
      schemaVersion: 1,
      startMinimized: false,
    });
  });

  it('persists the start-minimized preference across store instances', async () => {
    await expect(new AppSettingsStore().setStartMinimized(true)).resolves.toBe(true);
    await expect(new AppSettingsStore().get()).resolves.toEqual({
      schemaVersion: 1,
      startMinimized: true,
    });
  });

  it('falls back safely when the settings file is invalid', async () => {
    await writeFile(path.join(testDirectory, 'settings.json'), '{ invalid', 'utf8');
    await expect(new AppSettingsStore().get()).resolves.toEqual({
      schemaVersion: 1,
      startMinimized: false,
    });
  });
});
