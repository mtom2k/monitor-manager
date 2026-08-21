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
  mirrored: false,
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
      mirrored: false,
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
      mirrored: false,
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

  it('prefers a stable target match when mirrored targets share a source', () => {
    const first = { ...activeDisplay, id: 'win:monitor-a', systemId: '\\\\.\\DISPLAY1', name: 'First' };
    const second = { ...activeDisplay, id: 'win:monitor-b', systemId: '\\\\.\\DISPLAY1', name: 'Second' };
    const inactiveSecond = {
      ...second,
      enabled: false,
      bounds: { x: 0, y: 0, width: 0, height: 0 },
      mode: { width: 0, height: 0, refreshRate: 0 },
      availableModes: [],
    } satisfies DisplayInfo;

    const result = hydrateKnownDisplayState([inactiveSecond], [first, second]);

    expect(result.displays[0].id).toBe(second.id);
    expect(result.displays[0].name).toBe(second.name);
  });

  it('does not replace last-known independent modes with a temporary mirrored mode', () => {
    const mirrored = {
      ...activeDisplay,
      mirrored: true,
      bounds: { x: 0, y: 0, width: 3840, height: 2160 },
      mode: { width: 3840, height: 2160, refreshRate: 60 },
      rotation: 0 as const,
    } satisfies DisplayInfo;

    const result = hydrateKnownDisplayState([mirrored], [activeDisplay]);

    expect(result.knownDisplays[0].mode).toEqual(activeDisplay.mode);
    expect(result.knownDisplays[0].rotation).toBe(90);
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

  it('persists monitor numbers when Windows changes enumeration order', () => {
    const first = { ...activeDisplay, id: 'win:first', name: 'First', displayNumber: 1 };
    const second = { ...activeDisplay, id: 'win:second', name: 'Second', displayNumber: 2 };
    const third = { ...activeDisplay, id: 'win:third', name: 'Third', displayNumber: 3 };

    const result = hydrateKnownDisplayState([third, first, second], [first, second, third]);

    expect(result.displays.map((display) => [display.name, display.displayNumber])).toEqual([
      ['First', 1],
      ['Second', 2],
      ['Third', 3],
    ]);
  });

  it('assigns unnumbered displays once and appends newly connected displays', () => {
    const first = { ...activeDisplay, id: 'win:first', name: 'First' };
    const second = { ...activeDisplay, id: 'win:second', name: 'Second' };
    const initial = hydrateKnownDisplayState([first, second], []);
    const third = { ...activeDisplay, id: 'win:third', name: 'Third' };
    const next = hydrateKnownDisplayState([third, second, first], initial.knownDisplays);

    expect(next.displays.map((display) => [display.name, display.displayNumber])).toEqual([
      ['First', 1],
      ['Second', 2],
      ['Third', 3],
    ]);
  });
});
