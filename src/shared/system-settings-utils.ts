import type { PlatformName } from './types';

export interface SystemSettingsTarget {
  kind: 'external' | 'path';
  value: string;
}

export function systemDisplaySettingsTargets(platform: PlatformName): SystemSettingsTarget[] {
  if (platform === 'windows') {
    return [{ kind: 'external', value: 'ms-settings:display' }];
  }
  if (platform === 'macos') {
    return [
      { kind: 'external', value: 'x-apple.systempreferences:com.apple.Displays-Settings.extension' },
      { kind: 'external', value: 'x-apple.systempreferences:com.apple.preference.displays' },
      { kind: 'path', value: '/System/Library/PreferencePanes/Displays.prefPane' },
    ];
  }
  return [];
}
