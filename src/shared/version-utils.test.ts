import { describe, expect, it } from 'vitest';
import { formatVersionLabel } from './version-utils';

describe('version label', () => {
  it('formats the packaged application version for the tray menu', () => {
    expect(formatVersionLabel('0.3.1')).toBe('Version 0.3.1');
  });
});
