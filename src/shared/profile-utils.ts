import type { ProfileDisplay } from './types';

export function findProfileDisplay(
  displays: ProfileDisplay[],
  displayId: string,
  fallbackSystemId: string,
): ProfileDisplay | undefined {
  const normalizedId = displayId.toLocaleLowerCase();
  const normalizedFallback = fallbackSystemId.toLocaleLowerCase();
  return displays.find((display) =>
    display.displayId.toLocaleLowerCase() === normalizedId
    || display.fallbackSystemId.toLocaleLowerCase() === normalizedFallback,
  );
}

export function normalizeProfileDisplays(displays: ProfileDisplay[]): ProfileDisplay[] {
  const enabled = displays.filter((display) => display.enabled);
  if (!enabled.length) throw new Error('At least one monitor must stay enabled.');
  const requestedPrimary = enabled.find((display) => display.primary) ?? enabled[0];
  return displays.map((display) => ({
    ...display,
    primary: display.enabled && display.displayId === requestedPrimary.displayId,
  }));
}
