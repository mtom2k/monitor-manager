import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ApplyResult, DisplayInfo, DisplayProfile, PlatformCapabilities } from '../../shared/types';
import type { DisplayAdapter } from './display-adapter';

const execFileAsync = promisify(execFile);

type SystemProfilerDisplay = {
  _name?: string;
  _spdisplays_displayID?: string;
  _spdisplays_pixels?: string;
  _spdisplays_resolution?: string;
  spdisplays_main?: string;
  spdisplays_connection_type?: string;
  spdisplays_online?: string;
};

export class MacOsDisplayAdapter implements DisplayAdapter {
  readonly capabilities: PlatformCapabilities = {
    platform: 'macos',
    canConfigureDisplays: true,
    canToggleHdr: false,
    canIdentify: true,
    profileBackend: 'macOS system_profiler with optional displayplacer',
    notes: [
      'Install displayplacer with Homebrew to apply full monitor arrangements on macOS.',
      'macOS does not expose a stable public API for toggling HDR independently, so HDR is reported read-only.',
    ],
  };

  async listDisplays(): Promise<DisplayInfo[]> {
    const { stdout } = await execFileAsync('/usr/sbin/system_profiler', ['SPDisplaysDataType', '-json'], {
      timeout: 20_000,
      maxBuffer: 4 * 1024 * 1024,
      encoding: 'utf8',
    });
    const payload = JSON.parse(stdout) as Record<string, Array<{ spdisplays_ndrvs?: SystemProfilerDisplay[] }>>;
    const groups = payload.SPDisplaysDataType ?? [];
    const displays = groups.flatMap((group) => group.spdisplays_ndrvs ?? []);
    return displays.map((display, index) => {
      const resolution = this.parseResolution(display._spdisplays_pixels ?? display._spdisplays_resolution ?? '0 x 0');
      const id = display._spdisplays_displayID ?? `mac-display-${index + 1}`;
      return {
        id: `mac:${id}`,
        systemId: id,
        name: display._name ?? `Display ${index + 1}`,
        connection: display.spdisplays_connection_type?.toLowerCase().includes('internal') ? 'Internal' : 'Unknown',
        enabled: display.spdisplays_online !== 'spdisplays_no',
        primary: display.spdisplays_main === 'spdisplays_yes',
        hdrSupported: false,
        hdrEnabled: false,
        bounds: { x: index * resolution.width, y: 0, ...resolution },
        mode: { ...resolution, refreshRate: 60 },
        rotation: 0 as const,
        scalePercent: 100,
        availableScalePercents: [100],
        availableModes: [{ ...resolution, refreshRate: 60 }],
      } satisfies DisplayInfo;
    });
  }

  async applyProfile(profile: DisplayProfile): Promise<ApplyResult> {
    let displayplacerPath: string;
    try {
      const { stdout } = await execFileAsync('/bin/zsh', ['-lc', 'command -v displayplacer'], { encoding: 'utf8' });
      displayplacerPath = stdout.trim();
      if (!displayplacerPath) throw new Error('displayplacer was not found');
    } catch {
      return {
        ok: false,
        message: 'Applying profiles on macOS requires displayplacer (brew install displayplacer).',
      };
    }

    const args = profile.displays.map((display) => {
      const id = display.fallbackSystemId;
      if (!display.enabled) return `id:${id} enabled:false`;
      const { mode, bounds, rotation } = display;
      return `id:${id} enabled:true res:${mode.width}x${mode.height} hz:${Math.round(mode.refreshRate)} origin:(${bounds.x},${bounds.y}) degree:${rotation}`;
    });
    try {
      await execFileAsync(displayplacerPath, args, { timeout: 25_000, encoding: 'utf8' });
      return { ok: true, message: `Applied to ${profile.name}.`, displays: await this.listDisplays() };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : String(error) };
    }
  }

  async setHdr(): Promise<ApplyResult> {
    return { ok: false, message: 'Independent HDR switching is not available through a stable public macOS API.' };
  }

  private parseResolution(value: string): { width: number; height: number } {
    const match = value.match(/(\d+)\s*x\s*(\d+)/i);
    return match ? { width: Number(match[1]), height: Number(match[2]) } : { width: 0, height: 0 };
  }
}
