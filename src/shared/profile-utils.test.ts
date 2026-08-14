import { describe, expect, it } from 'vitest';
import { findProfileDisplay, normalizeProfileDisplays } from './profile-utils';
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
});
