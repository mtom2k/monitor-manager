import type { DisplayInfo, ProfileDisplay } from './types';

type LayoutDisplay = Pick<DisplayInfo, 'enabled' | 'primary' | 'bounds' | 'mode'> & {
  id?: string;
  displayId?: string;
};

function layoutId(display: LayoutDisplay): string {
  return display.id ?? display.displayId ?? '';
}

function usableBounds(display: LayoutDisplay) {
  const width = display.bounds.width > 0 ? display.bounds.width : display.mode.width;
  const height = display.bounds.height > 0 ? display.bounds.height : display.mode.height;
  return { x: display.bounds.x, y: display.bounds.y, width, height };
}

function overlaps(left: LayoutDisplay, right: LayoutDisplay): boolean {
  const a = usableBounds(left);
  const b = usableBounds(right);
  if (a.width <= 0 || a.height <= 0 || b.width <= 0 || b.height <= 0) return false;
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * Windows extended desktops cannot contain overlapping source rectangles.
 * Preserve every valid position, then move only colliding displays to the
 * right edge. The algorithm has no fixed display-count limit.
 */
export function resolveDisplayLayout<T extends LayoutDisplay>(displays: T[], preferredDisplayId?: string): T[] {
  const result = displays.map((display) => ({ ...display, bounds: { ...display.bounds } })) as T[];
  const active = result.filter((display) => display.enabled && usableBounds(display).width > 0 && usableBounds(display).height > 0);
  if (active.length < 2) return result;

  const primary = active.find((display) => display.primary) ?? active[0];
  const pending = active
    .filter((display) => display !== primary)
    .sort((left, right) => Number(layoutId(left) === preferredDisplayId) - Number(layoutId(right) === preferredDisplayId));
  const placed: T[] = [primary];

  while (pending.length) {
    const freeIndex = pending.findIndex((candidate) => placed.every((existing) => !overlaps(candidate, existing)));
    if (freeIndex >= 0) {
      placed.push(pending.splice(freeIndex, 1)[0]);
      continue;
    }

    const candidate = pending.shift()!;
    const rightEdge = Math.max(...placed.map((display) => {
      const bounds = usableBounds(display);
      return bounds.x + bounds.width;
    }));
    const candidateBounds = usableBounds(candidate);
    candidate.bounds = {
      x: rightEdge,
      y: primary.bounds.y,
      width: candidateBounds.width,
      height: candidateBounds.height,
    };
    placed.push(candidate);
  }

  return result;
}

export function findProfileDisplay(
  displays: ProfileDisplay[],
  displayId: string,
  fallbackSystemId: string,
): ProfileDisplay | undefined {
  const normalizedId = displayId.toLocaleLowerCase();
  const normalizedFallback = fallbackSystemId.toLocaleLowerCase();
  return displays.find((display) => display.displayId.toLocaleLowerCase() === normalizedId)
    ?? displays.find((display) => display.fallbackSystemId.toLocaleLowerCase() === normalizedFallback);
}

export function normalizeProfileDisplays(displays: ProfileDisplay[]): ProfileDisplay[] {
  const enabled = displays.filter((display) => display.enabled);
  if (!enabled.length) throw new Error('At least one monitor must stay enabled.');
  const requestedPrimary = enabled.find((display) => display.primary) ?? enabled[0];
  return resolveDisplayLayout(displays.map((display) => ({
    ...display,
    primary: display.enabled && display.displayId === requestedPrimary.displayId,
  }))) as ProfileDisplay[];
}
