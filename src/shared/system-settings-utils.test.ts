import { describe, expect, it } from 'vitest';
import { systemDisplaySettingsTargets } from './system-settings-utils';

describe('system display settings targets', () => {
  it('opens the documented Windows display settings URI', () => {
    expect(systemDisplaySettingsTargets('windows')).toEqual([
      { kind: 'external', value: 'ms-settings:display' },
    ]);
  });

  it('provides modern and legacy macOS Displays settings fallbacks', () => {
    expect(systemDisplaySettingsTargets('macos')).toEqual([
      { kind: 'external', value: 'x-apple.systempreferences:com.apple.Displays-Settings.extension' },
      { kind: 'external', value: 'x-apple.systempreferences:com.apple.preference.displays' },
      { kind: 'path', value: '/System/Library/PreferencePanes/Displays.prefPane' },
    ]);
  });

  it('does not invent a settings target for unsupported platforms', () => {
    expect(systemDisplaySettingsTargets('unsupported')).toEqual([]);
  });
});
