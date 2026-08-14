import type {
  ApplyResult,
  DisplayInfo,
  DisplayProfile,
  PlatformCapabilities,
} from '../../shared/types';

export interface DisplayAdapter {
  readonly capabilities: PlatformCapabilities;
  listDisplays(): Promise<DisplayInfo[]>;
  applyProfile(profile: DisplayProfile): Promise<ApplyResult>;
  setHdr(displayId: string, enabled: boolean): Promise<ApplyResult>;
}
