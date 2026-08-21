import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DisplayInfo, DisplayProfile, ProfileDisplay } from '../../shared/types';
import { WindowsDisplayAdapter } from './windows-adapter';

const desired: ProfileDisplay = {
  displayId: 'win:monitor',
  fallbackSystemId: '\\\\.\\DISPLAY1',
  name: 'Monitor',
  enabled: true,
  primary: true,
  hdrEnabled: false,
  bounds: { x: 0, y: 0, width: 2560, height: 1440 },
  mode: { width: 2560, height: 1440, refreshRate: 144 },
  rotation: 0,
  scalePercent: 125,
};

const profile: DisplayProfile = {
  id: 'profile',
  name: 'Profile',
  createdAt: '',
  updatedAt: '',
  displays: [desired],
};

const applied: DisplayInfo = {
  id: desired.displayId,
  systemId: desired.fallbackSystemId,
  name: desired.name,
  connection: 'DisplayPort',
  enabled: true,
  mirrored: false,
  primary: true,
  hdrSupported: false,
  hdrEnabled: false,
  bounds: { ...desired.bounds },
  mode: { ...desired.mode },
  rotation: 0,
  scalePercent: 125,
  availableScalePercents: [100, 125, 150],
  availableModes: [{ ...desired.mode }],
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Windows profile convergence', () => {
  it('retries a transient native commit failure and verifies the accepted state', async () => {
    vi.useFakeTimers();
    const adapter = new WindowsDisplayAdapter();
    const invoke = vi.spyOn(adapter as never, 'invoke' as never)
      .mockResolvedValueOnce({ ok: false, message: 'Windows could not commit the display arrangement (error 87).', data: [] } as never)
      .mockResolvedValueOnce({ ok: true, message: 'Applied to Profile.', data: [applied], warnings: [] } as never);

    const resultPromise = adapter.applyProfile(profile);
    await vi.advanceTimersByTimeAsync(900);
    const result = await resultPromise;

    expect(result.ok).toBe(true);
    expect(result.displays).toEqual([applied]);
    expect(result.warnings).toContain('Windows required 2 passes to retain the complete profile.');
    expect(invoke).toHaveBeenCalledTimes(2);
  });
});
