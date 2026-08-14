import type { ApplyResult, DisplayInfo, DisplayProfile, PlatformCapabilities } from '../../shared/types';
import type { DisplayAdapter } from './display-adapter';

export class UnsupportedDisplayAdapter implements DisplayAdapter {
  readonly capabilities: PlatformCapabilities = {
    platform: 'unsupported',
    canConfigureDisplays: false,
    canToggleHdr: false,
    canIdentify: false,
    profileBackend: 'None',
    notes: ['Monitor Manager currently supports Windows and macOS.'],
  };

  async listDisplays(): Promise<DisplayInfo[]> {
    return [];
  }

  async applyProfile(_profile: DisplayProfile): Promise<ApplyResult> {
    return { ok: false, message: 'Display profiles are not supported on this operating system.' };
  }

  async setHdr(): Promise<ApplyResult> {
    return { ok: false, message: 'HDR control is not supported on this operating system.' };
  }
}
