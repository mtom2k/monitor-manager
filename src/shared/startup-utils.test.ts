import { describe, expect, it } from 'vitest';
import { shouldShowMainWindowAtLaunch } from './startup-utils';

describe('startup window visibility', () => {
  it('shows the main window by default', () => {
    expect(shouldShowMainWindowAtLaunch(false)).toBe(true);
  });

  it('keeps the main window hidden when start minimized is enabled', () => {
    expect(shouldShowMainWindowAtLaunch(true)).toBe(false);
  });

  it('keeps visual smoke capture available without changing the saved preference', () => {
    expect(shouldShowMainWindowAtLaunch(true, true)).toBe(true);
  });
});
