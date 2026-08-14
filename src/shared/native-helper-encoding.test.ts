import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Windows native helper encoding', () => {
  it('keeps embedded C# status text ASCII-safe for Windows PowerShell 5', () => {
    const helper = readFileSync(new URL('../../assets/native/windows-display.ps1', import.meta.url), 'utf8');

    expect(helper).not.toMatch(/[^\x00-\x7f]/);
    expect(helper).toContain('message = "Applied to " + profile.name + "."');
  });
});
