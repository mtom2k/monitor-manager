export type PlatformName = 'windows' | 'macos' | 'unsupported';

export type ConnectionType =
  | 'HDMI'
  | 'DisplayPort'
  | 'DVI'
  | 'VGA'
  | 'USB-C'
  | 'Internal'
  | 'Virtual'
  | 'Unknown';

export interface DisplayMode {
  width: number;
  height: number;
  refreshRate: number;
  bitDepth?: number;
  interlaced?: boolean;
}

export interface DisplayBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DisplayInfo {
  id: string;
  displayNumber?: number;
  systemId: string;
  name: string;
  adapterName?: string;
  connection: ConnectionType;
  enabled: boolean;
  mirrored: boolean;
  primary: boolean;
  hdrSupported: boolean;
  hdrEnabled: boolean;
  bounds: DisplayBounds;
  mode: DisplayMode;
  rotation: 0 | 90 | 180 | 270;
  scalePercent: number;
  availableScalePercents: number[];
  availableModes: DisplayMode[];
}

export interface ProfileDisplay {
  displayId: string;
  fallbackSystemId: string;
  name: string;
  enabled: boolean;
  primary: boolean;
  hdrEnabled: boolean;
  bounds: DisplayBounds;
  mode: DisplayMode;
  rotation: 0 | 90 | 180 | 270;
  scalePercent: number;
}

export interface DisplayProfile {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  displays: ProfileDisplay[];
}

export interface PlatformCapabilities {
  platform: PlatformName;
  canConfigureDisplays: boolean;
  canToggleHdr: boolean;
  canIdentify: boolean;
  profileBackend: string;
  notes: string[];
}

export interface AppSnapshot {
  displays: DisplayInfo[];
  profiles: DisplayProfile[];
  capabilities: PlatformCapabilities;
  startupEnabled: boolean;
  appVersion: string;
}

export interface ApplyResult {
  ok: boolean;
  message: string;
  warnings?: string[];
  displays?: DisplayInfo[];
}

export interface SaveProfileInput {
  id?: string;
  name: string;
  displays: ProfileDisplay[];
}

export interface MonitorManagerApi {
  getSnapshot(): Promise<AppSnapshot>;
  refreshDisplays(): Promise<DisplayInfo[]>;
  saveProfile(profile: SaveProfileInput): Promise<DisplayProfile[]>;
  deleteProfile(profileId: string): Promise<DisplayProfile[]>;
  applyProfile(profileId: string): Promise<ApplyResult>;
  applyConfiguration(configuration: SaveProfileInput): Promise<ApplyResult>;
  setHdr(displayId: string, enabled: boolean): Promise<ApplyResult>;
  identifyDisplays(): Promise<void>;
  openDisplaySettings(): Promise<void>;
  setStartup(enabled: boolean): Promise<boolean>;
  openExternal(url: string): Promise<void>;
  onDisplaysChanged(callback: (displays: DisplayInfo[]) => void): () => void;
  onProfileApplied(callback: (profileId: string) => void): () => void;
}

export const IPC = {
  getSnapshot: 'monitor-manager:get-snapshot',
  refreshDisplays: 'monitor-manager:refresh-displays',
  saveProfile: 'monitor-manager:save-profile',
  deleteProfile: 'monitor-manager:delete-profile',
  applyProfile: 'monitor-manager:apply-profile',
  applyConfiguration: 'monitor-manager:apply-configuration',
  setHdr: 'monitor-manager:set-hdr',
  identifyDisplays: 'monitor-manager:identify-displays',
  openDisplaySettings: 'monitor-manager:open-display-settings',
  setStartup: 'monitor-manager:set-startup',
  openExternal: 'monitor-manager:open-external',
  displaysChanged: 'monitor-manager:displays-changed',
  profileApplied: 'monitor-manager:profile-applied',
} as const;
