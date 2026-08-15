// @vitest-environment jsdom

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppSnapshot, DisplayInfo, DisplayProfile, MonitorManagerApi } from '../shared/types';
import { App, mergeProfile, Topology, toProfileDisplay } from './App';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const display: DisplayInfo = {
  id: 'display-1',
  systemId: '\\\\.\\DISPLAY1',
  name: 'Test display',
  connection: 'DisplayPort',
  enabled: true,
  mirrored: false,
  primary: true,
  hdrSupported: true,
  hdrEnabled: false,
  bounds: { x: 0, y: 0, width: 1920, height: 1080 },
  mode: { width: 1920, height: 1080, refreshRate: 60 },
  rotation: 0,
  scalePercent: 100,
  availableScalePercents: [100, 125, 150],
  availableModes: [{ width: 1920, height: 1080, refreshRate: 60 }],
};

const profile: DisplayProfile = {
  id: 'desk-profile',
  name: 'Desk setup',
  createdAt: '2026-08-14T00:00:00.000Z',
  updatedAt: '2026-08-14T00:00:00.000Z',
  displays: [{
    displayId: display.id,
    fallbackSystemId: display.systemId,
    name: display.name,
    enabled: true,
    primary: true,
    hdrEnabled: false,
    bounds: display.bounds,
    mode: display.mode,
    rotation: 0,
    scalePercent: 100,
  }],
};

const snapshot: AppSnapshot = {
  displays: [display],
  profiles: [profile],
  capabilities: {
    platform: 'windows',
    canConfigureDisplays: true,
    canToggleHdr: true,
    canIdentify: true,
    profileBackend: 'Test backend',
    notes: [],
  },
  startupEnabled: false,
  appVersion: '0.3.0',
};

function buttonWithText(text: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll('button')).find((item) => item.textContent?.includes(text));
  if (!button) throw new Error(`Button not found: ${text}`);
  return button;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('profile deletion', () => {
  it('requires confirmation before calling the delete API', async () => {
    const deleteProfile = vi.fn(async () => [] as DisplayProfile[]);
    const noopListener = vi.fn(() => () => undefined);
    window.monitorManager = {
      getSnapshot: vi.fn(async () => snapshot),
      refreshDisplays: vi.fn(async () => [display]),
      saveProfile: vi.fn(async () => [profile]),
      deleteProfile,
      applyProfile: vi.fn(),
      applyConfiguration: vi.fn(),
      setHdr: vi.fn(),
      identifyDisplays: vi.fn(),
      openDisplaySettings: vi.fn(),
      setStartup: vi.fn(async () => false),
      openExternal: vi.fn(),
      onDisplaysChanged: noopListener,
      onProfileApplied: noopListener,
    } satisfies MonitorManagerApi;

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<App />);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    act(() => buttonWithText('Desk setup').click());
    act(() => document.querySelector<HTMLButtonElement>('button[title="Delete this profile"]')?.click());

    expect(deleteProfile).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Delete display profile?');
    act(() => buttonWithText('Cancel').click());
    expect(document.body.textContent).not.toContain('Delete display profile?');

    act(() => document.querySelector<HTMLButtonElement>('button[title="Delete this profile"]')?.click());
    await act(async () => buttonWithText('Delete profile').click());
    expect(deleteProfile).toHaveBeenCalledOnce();

    act(() => root.unmount());
  });
});

describe('profile signal persistence', () => {
  it('captures and restores resolution, refresh rate, and scaling independently', () => {
    const configured = {
      ...display,
      mode: { width: 2560, height: 1440, refreshRate: 144 },
      scalePercent: 125,
    } satisfies DisplayInfo;
    const saved = toProfileDisplay(configured);
    const restored = mergeProfile([display], { ...profile, displays: [saved] })[0];

    expect(saved.mode).toEqual({ width: 2560, height: 1440, refreshRate: 144 });
    expect(saved.scalePercent).toBe(125);
    expect(restored.mode).toEqual(saved.mode);
    expect(restored.scalePercent).toBe(125);
    expect(restored.mirrored).toBe(false);
  });
});

describe('system display settings', () => {
  it('opens the operating system display settings from the main toolbar', async () => {
    const openDisplaySettings = vi.fn(async () => undefined);
    const noopListener = vi.fn(() => () => undefined);
    window.monitorManager = {
      getSnapshot: vi.fn(async () => snapshot),
      refreshDisplays: vi.fn(async () => [display]),
      saveProfile: vi.fn(async () => [profile]),
      deleteProfile: vi.fn(),
      applyProfile: vi.fn(),
      applyConfiguration: vi.fn(),
      setHdr: vi.fn(),
      identifyDisplays: vi.fn(),
      openDisplaySettings,
      setStartup: vi.fn(async () => false),
      openExternal: vi.fn(),
      onDisplaysChanged: noopListener,
      onProfileApplied: noopListener,
    } satisfies MonitorManagerApi;

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<App />);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => buttonWithText('Display settings').click());
    expect(openDisplaySettings).toHaveBeenCalledOnce();

    act(() => root.unmount());
  });
});

describe('Windows projection compatibility', () => {
  it('detects Duplicate mode and prevents saving or editing the mirrored current setup', async () => {
    const mirroredDisplays: DisplayInfo[] = [
      { ...display, mirrored: true },
      {
        ...display,
        id: 'display-2',
        name: 'Mirrored display',
        mirrored: true,
        primary: false,
      },
    ];
    const noopListener = vi.fn(() => () => undefined);
    window.monitorManager = {
      getSnapshot: vi.fn(async () => ({ ...snapshot, displays: mirroredDisplays, profiles: [] })),
      refreshDisplays: vi.fn(async () => mirroredDisplays),
      saveProfile: vi.fn(async () => []),
      deleteProfile: vi.fn(),
      applyProfile: vi.fn(),
      applyConfiguration: vi.fn(),
      setHdr: vi.fn(),
      identifyDisplays: vi.fn(),
      openDisplaySettings: vi.fn(),
      setStartup: vi.fn(async () => false),
      openExternal: vi.fn(),
      onDisplaysChanged: noopListener,
      onProfileApplied: noopListener,
    } satisfies MonitorManagerApi;

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<App />);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(document.body.textContent).toContain('Windows Duplicate mode is active.');
    expect(document.querySelectorAll('.mirrored-badge')).toHaveLength(2);
    expect(buttonWithText('Save as profile').disabled).toBe(true);
    expect(buttonWithText('Apply changes').disabled).toBe(true);
    expect(document.querySelectorAll<HTMLButtonElement>('.display-card .switch')[0].disabled).toBe(true);

    act(() => root.unmount());
  });
});

describe('arrangement preview', () => {
  it('moves the primary star to whichever display is primary', () => {
    const secondary = {
      ...display,
      id: 'display-2',
      systemId: '\\\\.\\DISPLAY2',
      name: 'Second display',
      primary: false,
      bounds: { ...display.bounds, x: 1920 },
    } satisfies DisplayInfo;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => root.render(<Topology displays={[display, secondary]} selectedId={display.id} onSelect={() => undefined} />));
    expect(document.querySelector('[aria-label="Primary display"]')?.closest('button')?.title).toContain(display.name);

    act(() => root.render(<Topology displays={[{ ...display, primary: false }, { ...secondary, primary: true }]} selectedId={secondary.id} onSelect={() => undefined} />));
    expect(document.querySelectorAll('[aria-label="Primary display"]')).toHaveLength(1);
    expect(document.querySelector('[aria-label="Primary display"]')?.closest('button')?.title).toContain(secondary.name);

    act(() => root.unmount());
  });
});
