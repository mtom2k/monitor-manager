import type { DisplayInfo } from './types';

function sameDisplay(left: DisplayInfo, right: DisplayInfo): boolean {
  return (
    left.id.localeCompare(right.id, undefined, { sensitivity: 'accent' }) === 0 ||
    (Boolean(left.systemId) &&
      Boolean(right.systemId) &&
      left.systemId.localeCompare(right.systemId, undefined, { sensitivity: 'accent' }) === 0)
  );
}

function cloneDisplay(display: DisplayInfo): DisplayInfo {
  return {
    ...display,
    bounds: { ...display.bounds },
    mode: { ...display.mode },
    availableScalePercents: [...(display.availableScalePercents ?? [display.scalePercent])],
    availableModes: display.availableModes.map((mode) => ({ ...mode })),
  };
}

function hasUsableMode(display: DisplayInfo): boolean {
  return display.mode.width > 0 && display.mode.height > 0;
}

export interface HydratedDisplayState {
  displays: DisplayInfo[];
  knownDisplays: DisplayInfo[];
}

/**
 * Hydrates inactive Windows CCD targets with their last active mode. Windows
 * exposes a disabled target, but normally omits its source geometry and mode.
 */
export function hydrateKnownDisplayState(
  liveDisplays: DisplayInfo[],
  storedDisplays: DisplayInfo[],
): HydratedDisplayState {
  const hydrated = liveDisplays.map((liveDisplay) => {
    if (liveDisplay.enabled || hasUsableMode(liveDisplay)) return cloneDisplay(liveDisplay);

    const stored = storedDisplays.find((candidate) => sameDisplay(liveDisplay, candidate));
    if (!stored) return cloneDisplay(liveDisplay);

    return {
      ...cloneDisplay(stored),
      id: liveDisplay.id,
      systemId: liveDisplay.systemId || stored.systemId,
      name: liveDisplay.name || stored.name,
      adapterName: liveDisplay.adapterName || stored.adapterName,
      connection: liveDisplay.connection === 'Unknown' ? stored.connection : liveDisplay.connection,
      enabled: false,
      primary: false,
    };
  });

  const knownDisplays = storedDisplays.map(cloneDisplay);
  for (const display of liveDisplays) {
    if (!display.enabled || !hasUsableMode(display)) continue;
    const existingIndex = knownDisplays.findIndex((candidate) => sameDisplay(display, candidate));
    const snapshot = cloneDisplay(display);
    if (existingIndex >= 0) knownDisplays.splice(existingIndex, 1, snapshot);
    else knownDisplays.push(snapshot);
  }

  return { displays: hydrated, knownDisplays };
}
