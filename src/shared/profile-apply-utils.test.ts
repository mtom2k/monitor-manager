import { describe, expect, it } from 'vitest';
import { profileApplyMismatches } from './profile-apply-utils';
import type { DisplayInfo, DisplayProfile, ProfileDisplay } from './types';

const desiredDisplay = (id: string, x: number, primary = false): ProfileDisplay => ({
  displayId: id,
  fallbackSystemId: `source-${id}`,
  name: id,
  enabled: true,
  primary,
  hdrEnabled: false,
  bounds: { x, y: -200, width: 1920, height: 1080 },
  mode: { width: 1920, height: 1080, refreshRate: 144 },
  rotation: 0,
  scalePercent: 125,
});

const actualDisplay = (desired: ProfileDisplay): DisplayInfo => ({
  id: desired.displayId,
  systemId: desired.fallbackSystemId,
  name: desired.name,
  connection: 'DisplayPort',
  enabled: desired.enabled,
  mirrored: false,
  primary: desired.primary,
  hdrSupported: false,
  hdrEnabled: false,
  bounds: { ...desired.bounds },
  mode: { ...desired.mode },
  rotation: desired.rotation,
  scalePercent: desired.scalePercent,
  availableScalePercents: [100, 125, 150],
  availableModes: [{ ...desired.mode }],
});

describe('profile application verification', () => {
  it('accepts positions normalized around a non-zero profile origin', () => {
    const first = desiredDisplay('first', 6000, true);
    const second = desiredDisplay('second', 7920);
    const profile = { id: 'p', name: 'Test', createdAt: '', updatedAt: '', displays: [first, second] } satisfies DisplayProfile;
    const actual = [actualDisplay(first), actualDisplay(second)].map((display) => ({
      ...display,
      bounds: { ...display.bounds, x: display.bounds.x - 6000, y: 0 },
    }));

    expect(profileApplyMismatches(profile, actual)).toEqual([]);
  });

  it('reports signal and orientation settings that Windows failed to retain', () => {
    const desired = desiredDisplay('portrait', 0, true);
    desired.rotation = 90;
    desired.mode = { width: 1080, height: 1920, refreshRate: 144 };
    desired.bounds = { x: 0, y: 0, width: 1080, height: 1920 };
    const actual = actualDisplay(desired);
    actual.rotation = 0;
    actual.mode = { ...actual.mode, refreshRate: 60 };

    expect(profileApplyMismatches({ id: 'p', name: 'Test', createdAt: '', updatedAt: '', displays: [desired] }, [actual]))
      .toEqual(['portrait refresh rate differed', 'portrait orientation differed']);
  });
});
