import { describe, expect, it } from 'vitest';
import { refreshRatesForResolution, selectRefreshRate, selectResolution, uniqueResolutions } from './mode-utils';
import type { DisplayMode } from './types';

const modes: DisplayMode[] = [
  { width: 3840, height: 2160, refreshRate: 144 },
  { width: 3840, height: 2160, refreshRate: 60 },
  { width: 2560, height: 1440, refreshRate: 120 },
  { width: 2560, height: 1440, refreshRate: 60 },
];

describe('display mode utilities', () => {
  it('lists each resolution once', () => {
    expect(uniqueResolutions(modes[0], modes).map((mode) => `${mode.width}x${mode.height}`))
      .toEqual(['3840x2160', '2560x1440']);
  });

  it('lists refresh rates only for the selected resolution', () => {
    expect(refreshRatesForResolution(modes[2], modes)).toEqual([120, 60]);
  });

  it('keeps the closest refresh rate when changing resolution', () => {
    expect(selectResolution(modes[0], modes, '2560x1440')?.refreshRate).toBe(120);
  });

  it('selects an exact refresh mode', () => {
    expect(selectRefreshRate(modes[0], modes, 6000)).toEqual(modes[1]);
  });
});
