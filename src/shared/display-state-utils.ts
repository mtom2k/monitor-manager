import type { DisplayInfo } from './types';

function findSameDisplay(displays: DisplayInfo[], target: DisplayInfo): DisplayInfo | undefined {
  const stableMatch = displays.find((display) => (
    display.id.localeCompare(target.id, undefined, { sensitivity: 'accent' }) === 0
  ));
  if (stableMatch || !target.systemId) return stableMatch;
  const sourceMatches = displays.filter((display) => (
    Boolean(display.systemId) &&
    display.systemId.localeCompare(target.systemId, undefined, { sensitivity: 'accent' }) === 0
  ));
  return sourceMatches.find((display) => display.name.localeCompare(target.name, undefined, { sensitivity: 'base' }) === 0);
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

function validDisplayNumber(display: DisplayInfo): number | undefined {
  return Number.isInteger(display.displayNumber) && Number(display.displayNumber) > 0
    ? Number(display.displayNumber)
    : undefined;
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
  const assignedNumbers = new Map<string, number>();
  const usedNumbers = new Set<number>();
  for (const stored of storedDisplays) {
    const number = validDisplayNumber(stored);
    if (!number || usedNumbers.has(number)) continue;
    assignedNumbers.set(stored.id.toLocaleLowerCase(), number);
    usedNumbers.add(number);
  }
  let nextNumber = 1;
  const numberFor = (display: DisplayInfo): number => {
    const key = display.id.toLocaleLowerCase();
    const existing = assignedNumbers.get(key);
    if (existing) return existing;
    while (usedNumbers.has(nextNumber)) nextNumber += 1;
    const assigned = nextNumber;
    assignedNumbers.set(key, assigned);
    usedNumbers.add(assigned);
    nextNumber += 1;
    return assigned;
  };

  const hydrated = liveDisplays.map((liveDisplay) => {
    const displayNumber = numberFor(liveDisplay);
    if (liveDisplay.enabled || hasUsableMode(liveDisplay)) return cloneDisplay(liveDisplay);

    const stored = findSameDisplay(storedDisplays, liveDisplay);
    if (!stored) return { ...cloneDisplay(liveDisplay), displayNumber };

    return {
      ...cloneDisplay(stored),
      id: liveDisplay.id,
      displayNumber,
      systemId: liveDisplay.systemId || stored.systemId,
      name: liveDisplay.name || stored.name,
      adapterName: liveDisplay.adapterName || stored.adapterName,
      connection: liveDisplay.connection === 'Unknown' ? stored.connection : liveDisplay.connection,
      enabled: false,
      mirrored: false,
      primary: false,
    };
  }).map((display) => ({ ...display, displayNumber: numberFor(display) }));

  const knownDisplays = storedDisplays.map(cloneDisplay);
  for (const display of liveDisplays) {
    if (!display.enabled || display.mirrored || !hasUsableMode(display)) continue;
    const existing = findSameDisplay(knownDisplays, display);
    const existingIndex = existing ? knownDisplays.indexOf(existing) : -1;
    const snapshot = { ...cloneDisplay(display), displayNumber: numberFor(display) };
    if (existingIndex >= 0) knownDisplays.splice(existingIndex, 1, snapshot);
    else knownDisplays.push(snapshot);
  }

  for (let index = 0; index < knownDisplays.length; index += 1) {
    const display = knownDisplays[index];
    knownDisplays[index] = { ...display, displayNumber: numberFor(display) };
  }

  hydrated.sort((left, right) => numberFor(left) - numberFor(right));
  knownDisplays.sort((left, right) => numberFor(left) - numberFor(right));
  return { displays: hydrated, knownDisplays };
}
