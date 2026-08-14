import { describe, expect, it } from 'vitest';
import { hydrateKnownDisplayState } from './display-state-utils';
import type { DisplayInfo } from './types';

const activeDisplay: DisplayInfo = {
  id: 'win:monitor-a',
  systemId: '\\\\.\\DISPLAY2',
  name: 'Portrait display',
  adapterName: 'Test adapter',
  connection: 'DisplayPort',
  enabled: true,
  primary: false,
  hdrSupported: true,
  hdrEnabled: false,
  bounds: { x: 3840, y: -908, width: 2160, height: 3840 },
  mode: { width: 2160, height: 3840, refreshRate: 144, bitDepth: 32, interlaced: false },
  rotation: 90,
  scalePercent: 150,
  availableScalePercents: [100, 125, 150, 175, 200],
  availableModes: [{ width: 2160, height: 3840, refreshRate: 144 }],
};

describe('known display state hydration', () => {
  it('restores the last active mode for an inactive CCD target', () => {
    const inactive: DisplayInfo = {
      ...activeDisplay,
      systemId: '',
      adapterName: '',
      enabled: false,
      bounds: { x: 0, y: 0, width: 0, height: 0 },
      mode: { width: 0, height: 0, refreshRate: 0 },
      rotation: 0,
      scalePercent: 100,
      availableScalePercents: [],
      availableModes: [],
    };

    const result = hydrateKnownDisplayState([inactive], [activeDisplay]);

    expect(result.displays[0]).toMatchObject({
      enabled: false,
      primary: false,
      systemId: activeDisplay.systemId,
      bounds: activeDisplay.bounds,
      mode: activeDisplay.mode,
      rotation: 90,
      scalePercent: 150,
    });
  });

  it('updates the cache only from active displays with usable modes', () => {
    const updated = {
      ...activeDisplay,
      mode: { ...activeDisplay.mode, refreshRate: 120 },
    };
    const result = hydrateKnownDisplayState([updated], [activeDisplay]);

    expect(result.knownDisplays).toHaveLength(1);
    expect(result.knownDisplays[0].mode.refreshRate).toBe(120);
  });

  it('leaves a never-seen disabled target in automatic recovery mode', () => {
    const inactive = {
      ...activeDisplay,
      id: 'win:new-monitor',
      systemId: '',
      enabled: false,
      bounds: { x: 0, y: 0, width: 0, height: 0 },
      mode: { width: 0, height: 0, refreshRate: 0 },
      availableModes: [],
    } satisfies DisplayInfo;

    expect(hydrateKnownDisplayState([inactive], []).displays[0].mode.width).toBe(0);
  });
});
