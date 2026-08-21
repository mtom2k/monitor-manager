import { describe, expect, it } from 'vitest';
import { findProfileDisplay, normalizeProfileDisplays, resolveDisplayLayout } from './profile-utils';
import type { ProfileDisplay } from './types';

const makeDisplay = (id: string, enabled = true, primary = false): ProfileDisplay => ({
  displayId: id,
  fallbackSystemId: `system-${id}`,
  name: id,
  enabled,
  primary,
  hdrEnabled: false,
  bounds: { x: 0, y: 0, width: 1920, height: 1080 },
  mode: { width: 1920, height: 1080, refreshRate: 60 },
  rotation: 0,
  scalePercent: 100,
});

describe('profile utilities', () => {
  it('matches stable IDs case-insensitively', () => {
    const display = makeDisplay('WIN:MONITOR-A');
    expect(findProfileDisplay([display], 'win:monitor-a', 'other')).toBe(display);
  });

  it('falls back to the operating-system display source', () => {
    const display = makeDisplay('old-id');
    expect(findProfileDisplay([display], 'new-id', 'SYSTEM-OLD-ID')).toBe(display);
  });

  it('prefers a stable target match when mirrored displays share one source', () => {
    const first = { ...makeDisplay('first'), fallbackSystemId: 'shared-source' };
    const second = { ...makeDisplay('second'), fallbackSystemId: 'shared-source' };

    expect(findProfileDisplay([first, second], 'second', 'shared-source')).toBe(second);
  });

  it('guarantees one primary display among enabled displays', () => {
    const normalized = normalizeProfileDisplays([
      makeDisplay('a', false, true),
      makeDisplay('b', true, false),
      makeDisplay('c', true, false),
    ]);
    expect(normalized.map(({ enabled, primary }) => ({ enabled, primary }))).toEqual([
      { enabled: false, primary: false },
      { enabled: true, primary: true },
      { enabled: true, primary: false },
    ]);
  });

  it('rejects a profile that disables every display', () => {
    expect(() => normalizeProfileDisplays([makeDisplay('a', false)])).toThrow(/one monitor/i);
  });

  it('moves only colliding displays after every valid existing rectangle', () => {
    const primary = { ...makeDisplay('primary', true, true), bounds: { x: 0, y: 0, width: 3840, height: 2160 }, mode: { width: 3840, height: 2160, refreshRate: 240 } };
    const portrait = { ...makeDisplay('portrait'), bounds: { x: 3840, y: -900, width: 2160, height: 3840 }, mode: { width: 2160, height: 3840, refreshRate: 144 } };
    const overlapping = { ...makeDisplay('new'), bounds: { x: 0, y: 0, width: 3440, height: 1440 }, mode: { width: 3440, height: 1440, refreshRate: 144 } };

    const result = resolveDisplayLayout([primary, overlapping, portrait], 'new');

    expect(result.find((display) => display.displayId === 'primary')?.bounds.x).toBe(0);
    expect(result.find((display) => display.displayId === 'portrait')?.bounds.x).toBe(3840);
    expect(result.find((display) => display.displayId === 'new')?.bounds.x).toBe(6000);
  });

  it('lays out an arbitrary number of colliding displays without overlap', () => {
    const displays = Array.from({ length: 12 }, (_, index) => ({
      ...makeDisplay(`display-${index}`, true, index === 0),
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    }));

    const result = resolveDisplayLayout(displays);

    expect(result.map((display) => display.bounds.x)).toEqual(Array.from({ length: 12 }, (_, index) => index * 1920));
  });
});
