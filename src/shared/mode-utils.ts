import type { DisplayMode } from './types';

export const resolutionKey = (mode: DisplayMode): string => `${mode.width}x${mode.height}`;

export function uniqueResolutions(current: DisplayMode, available: DisplayMode[]): DisplayMode[] {
  const modes = [current, ...available].filter((mode) => mode.width > 0 && mode.height > 0);
  return Array.from(new Map(modes.map((mode) => [resolutionKey(mode), mode])).values());
}

export function refreshRatesForResolution(current: DisplayMode, available: DisplayMode[]): number[] {
  const rates = [current, ...available]
    .filter((mode) => mode.width === current.width && mode.height === current.height && mode.refreshRate > 1)
    .map((mode) => mode.refreshRate);
  return Array.from(new Map(rates.map((rate) => [Math.round(rate * 100), rate])).values())
    .sort((left, right) => right - left);
}

export function selectResolution(current: DisplayMode, available: DisplayMode[], key: string): DisplayMode | undefined {
  const candidates = available.filter((mode) => resolutionKey(mode) === key);
  if (!candidates.length) return undefined;
  return candidates.reduce((best, mode) => {
    const bestDistance = Math.abs(best.refreshRate - current.refreshRate);
    const distance = Math.abs(mode.refreshRate - current.refreshRate);
    if (distance < bestDistance) return mode;
    if (distance === bestDistance && mode.refreshRate > best.refreshRate) return mode;
    return best;
  });
}

export function selectRefreshRate(current: DisplayMode, available: DisplayMode[], rateKey: number): DisplayMode | undefined {
  return [current, ...available].find((mode) =>
    mode.width === current.width
    && mode.height === current.height
    && Math.round(mode.refreshRate * 100) === rateKey,
  );
}
