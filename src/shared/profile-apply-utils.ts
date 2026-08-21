import type { DisplayInfo, DisplayProfile, ProfileDisplay } from './types';

function findAppliedDisplay(displays: DisplayInfo[], desired: ProfileDisplay): DisplayInfo | undefined {
  const stable = displays.find((display) => display.id.localeCompare(desired.displayId, undefined, { sensitivity: 'accent' }) === 0);
  if (stable) return stable;

  const sourceMatches = displays.filter((display) => (
    Boolean(display.systemId) && display.systemId.localeCompare(desired.fallbackSystemId, undefined, { sensitivity: 'accent' }) === 0
  ));
  if (sourceMatches.length === 1) return sourceMatches[0];
  return sourceMatches.find((display) => display.name.localeCompare(desired.name, undefined, { sensitivity: 'base' }) === 0);
}

export function profileApplyMismatches(profile: DisplayProfile, displays: DisplayInfo[]): string[] {
  const enabled = profile.displays.filter((display) => display.enabled);
  const primary = enabled.find((display) => display.primary) ?? enabled[0];
  const originX = primary?.bounds.x ?? 0;
  const originY = primary?.bounds.y ?? 0;
  const mismatches: string[] = [];

  for (const desired of profile.displays) {
    const actual = findAppliedDisplay(displays, desired);
    if (!actual) {
      if (desired.enabled) mismatches.push(`${desired.name} was not found`);
      continue;
    }
    if (actual.enabled !== desired.enabled) {
      mismatches.push(`${desired.name} was ${actual.enabled ? 'enabled' : 'disabled'}`);
      continue;
    }
    if (!desired.enabled) continue;

    if (actual.primary !== desired.primary) mismatches.push(`${desired.name} primary state differed`);
    if (desired.mode.width > 0 && desired.mode.height > 0) {
      if (actual.mode.width !== desired.mode.width || actual.mode.height !== desired.mode.height) {
        mismatches.push(`${desired.name} resolution differed`);
      }
      if (desired.mode.refreshRate > 1 && Math.abs(actual.mode.refreshRate - desired.mode.refreshRate) > 0.6) {
        mismatches.push(`${desired.name} refresh rate differed`);
      }
      if (actual.rotation !== desired.rotation) mismatches.push(`${desired.name} orientation differed`);
      if (actual.bounds.x !== desired.bounds.x - originX || actual.bounds.y !== desired.bounds.y - originY) {
        mismatches.push(`${desired.name} position differed`);
      }
    }
    if (desired.scalePercent > 0 && actual.scalePercent !== desired.scalePercent) {
      mismatches.push(`${desired.name} scaling differed`);
    }
    if (actual.hdrSupported && actual.hdrEnabled !== desired.hdrEnabled) {
      mismatches.push(`${desired.name} HDR state differed`);
    }
  }
  return mismatches;
}
