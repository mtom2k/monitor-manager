import { app } from 'electron';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import type { ApplyResult, DisplayInfo, DisplayProfile, PlatformCapabilities } from '../../shared/types';
import { profileApplyMismatches } from '../../shared/profile-apply-utils';
import type { DisplayAdapter } from './display-adapter';

const execFileAsync = promisify(execFile);

interface NativeResponse<T = unknown> {
  ok: boolean;
  message?: string;
  data?: T;
  warnings?: string[];
}

export class WindowsDisplayAdapter implements DisplayAdapter {
  private operation: Promise<void> = Promise.resolve();
  readonly capabilities: PlatformCapabilities = {
    platform: 'windows',
    canConfigureDisplays: true,
    canToggleHdr: true,
    canIdentify: true,
    profileBackend: 'Windows CCD and User32 APIs',
    notes: [
      'Windows may briefly blank displays while a topology is applied.',
      'HDR changes require a display and GPU driver that expose Advanced Color.',
    ],
  };

  async listDisplays(): Promise<DisplayInfo[]> {
    return this.enqueue(() => this.listDisplaysNow());
  }

  private async listDisplaysNow(): Promise<DisplayInfo[]> {
    const response = await this.invoke<DisplayInfo[]>('list');
    if (!response.ok || !response.data) {
      throw new Error(response.message ?? 'Windows did not return display information.');
    }
    return response.data;
  }

  async applyProfile(profile: DisplayProfile): Promise<ApplyResult> {
    return this.enqueue(async () => {
      let lastMismatches: string[] = [];
      let lastFailure = '';
      let lastDisplays: DisplayInfo[] | undefined;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const response = await this.invoke<DisplayInfo[]>('apply', profile);
        if (!response.ok) {
          lastFailure = response.message ?? 'The profile could not be applied.';
          lastDisplays = response.data;
          if (attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, 900));
            continue;
          }
          return { ok: false, message: lastFailure, warnings: response.warnings, displays: lastDisplays };
        }
        lastFailure = '';
        const displays = response.data ?? await this.listDisplaysNow();
        lastDisplays = displays;
        lastMismatches = profileApplyMismatches(profile, displays);
        if (!lastMismatches.length) {
          const warnings = [...(response.warnings ?? [])];
          if (attempt > 1) warnings.push(`Windows required ${attempt} passes to retain the complete profile.`);
          return {
            ok: true,
            message: response.message ?? 'Display profile applied.',
            warnings,
            displays,
          };
        }
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 900));
      }
      return {
        ok: false,
        message: lastFailure || `Windows did not retain the complete profile: ${lastMismatches.join('; ')}.`,
        displays: lastDisplays,
      };
    });
  }

  async setHdr(displayId: string, enabled: boolean): Promise<ApplyResult> {
    return this.enqueue(async () => {
      const response = await this.invoke<DisplayInfo[]>('hdr', { displayId, enabled });
      return {
        ok: response.ok,
        message: response.message ?? (response.ok ? 'HDR setting updated.' : 'HDR could not be updated.'),
        warnings: response.warnings,
        displays: response.data,
      };
    });
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operation.then(operation, operation);
    this.operation = result.then(() => undefined, () => undefined);
    return result;
  }

  private async invoke<T>(command: string, payload?: unknown): Promise<NativeResponse<T>> {
    const scriptPath = app.isPackaged
      ? path.join(process.resourcesPath, 'native', 'windows-display.ps1')
      : path.join(app.getAppPath(), 'assets', 'native', 'windows-display.ps1');
    const args = [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
      '-Command',
      command,
    ];
    if (payload !== undefined) {
      args.push('-PayloadBase64', Buffer.from(JSON.stringify(payload), 'utf8').toString('base64'));
    }

    try {
      const { stdout, stderr } = await execFileAsync('powershell.exe', args, {
        windowsHide: true,
        timeout: 25_000,
        maxBuffer: 4 * 1024 * 1024,
        encoding: 'utf8',
      });
      const output = stdout.trim();
      if (!output) {
        throw new Error(stderr.trim() || 'The native display helper returned no data.');
      }
      return JSON.parse(output) as NativeResponse<T>;
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
