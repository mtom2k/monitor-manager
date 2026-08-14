import { app } from 'electron';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import type { ApplyResult, DisplayInfo, DisplayProfile, PlatformCapabilities } from '../../shared/types';
import type { DisplayAdapter } from './display-adapter';

const execFileAsync = promisify(execFile);

interface NativeResponse<T = unknown> {
  ok: boolean;
  message?: string;
  data?: T;
  warnings?: string[];
}

export class WindowsDisplayAdapter implements DisplayAdapter {
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
    const response = await this.invoke<DisplayInfo[]>('list');
    if (!response.ok || !response.data) {
      throw new Error(response.message ?? 'Windows did not return display information.');
    }
    return response.data;
  }

  async applyProfile(profile: DisplayProfile): Promise<ApplyResult> {
    const response = await this.invoke<DisplayInfo[]>('apply', profile);
    return {
      ok: response.ok,
      message: response.message ?? (response.ok ? 'Display profile applied.' : 'The profile could not be applied.'),
      warnings: response.warnings,
      displays: response.data,
    };
  }

  async setHdr(displayId: string, enabled: boolean): Promise<ApplyResult> {
    const response = await this.invoke<DisplayInfo[]>('hdr', { displayId, enabled });
    return {
      ok: response.ok,
      message: response.message ?? (response.ok ? 'HDR setting updated.' : 'HDR could not be updated.'),
      warnings: response.warnings,
      displays: response.data,
    };
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
