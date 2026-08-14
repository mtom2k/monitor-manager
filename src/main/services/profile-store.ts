import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DisplayProfile, SaveProfileInput } from '../../shared/types';

interface StoreShape {
  schemaVersion: 1;
  profiles: DisplayProfile[];
}

export class ProfileStore {
  private readonly filePath = path.join(app.getPath('userData'), 'profiles.json');

  async list(): Promise<DisplayProfile[]> {
    return (await this.read()).profiles;
  }

  async get(profileId: string): Promise<DisplayProfile | undefined> {
    return (await this.list()).find((profile) => profile.id === profileId);
  }

  async save(input: SaveProfileInput): Promise<DisplayProfile[]> {
    const store = await this.read();
    const now = new Date().toISOString();
    const existing = input.id ? store.profiles.find((profile) => profile.id === input.id) : undefined;
    const profile: DisplayProfile = {
      id: existing?.id ?? randomUUID(),
      name: input.name.trim() || 'Untitled profile',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      displays: input.displays,
    };
    store.profiles = existing
      ? store.profiles.map((item) => (item.id === existing.id ? profile : item))
      : [...store.profiles, profile];
    await this.write(store);
    return store.profiles;
  }

  async delete(profileId: string): Promise<DisplayProfile[]> {
    const store = await this.read();
    store.profiles = store.profiles.filter((profile) => profile.id !== profileId);
    await this.write(store);
    return store.profiles;
  }

  private async read(): Promise<StoreShape> {
    try {
      const contents = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(contents) as StoreShape;
      return parsed.schemaVersion === 1 && Array.isArray(parsed.profiles)
        ? parsed
        : { schemaVersion: 1, profiles: [] };
    } catch {
      return { schemaVersion: 1, profiles: [] };
    }
  }

  private async write(store: StoreShape): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  }
}
