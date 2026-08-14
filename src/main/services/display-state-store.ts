import { app } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hydrateKnownDisplayState } from '../../shared/display-state-utils';
import type { DisplayInfo } from '../../shared/types';

interface DisplayStateShape {
  schemaVersion: 1;
  displays: DisplayInfo[];
}

export class DisplayStateStore {
  private readonly filePath = path.join(app.getPath('userData'), 'known-displays.json');
  private knownDisplays: DisplayInfo[] | undefined;
  private operation: Promise<void> = Promise.resolve();

  hydrate(liveDisplays: DisplayInfo[]): Promise<DisplayInfo[]> {
    const hydration = this.operation.then(async () => {
      const knownDisplays = this.knownDisplays ?? (await this.read()).displays;
      const nextState = hydrateKnownDisplayState(liveDisplays, knownDisplays);
      const changed = JSON.stringify(nextState.knownDisplays) !== JSON.stringify(knownDisplays);
      this.knownDisplays = nextState.knownDisplays;
      if (changed) await this.write({ schemaVersion: 1, displays: nextState.knownDisplays });
      return nextState.displays;
    });
    this.operation = hydration.then(
      () => undefined,
      () => undefined,
    );
    return hydration;
  }

  private async read(): Promise<DisplayStateShape> {
    try {
      const contents = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(contents) as DisplayStateShape;
      return parsed.schemaVersion === 1 && Array.isArray(parsed.displays)
        ? parsed
        : { schemaVersion: 1, displays: [] };
    } catch {
      return { schemaVersion: 1, displays: [] };
    }
  }

  private async write(store: DisplayStateShape): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  }
}
