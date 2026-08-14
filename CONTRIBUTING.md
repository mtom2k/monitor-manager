# Contributing

Thank you for helping improve Monitor Manager.

## Local setup

Requirements:

- Node.js 20.19 or newer
- npm
- Windows 10/11 or macOS

```powershell
git clone https://github.com/mtom2k/monitor-manager.git
cd monitor-manager
npm.cmd ci
npm.cmd run dev
```

On macOS, install `displayplacer` before testing profile application:

```bash
brew install displayplacer
```

## Before opening a pull request

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

For display-control changes, also complete the relevant manual checks in [TESTING.md](TESTING.md). Restore the original monitor state after any topology, scaling, or HDR test.

## Project guidelines

- Keep native behavior behind `DisplayAdapter`.
- Preserve stable physical display matching and fallback source matching.
- Keep at least one display enabled.
- Treat native state returned by the operating system as authoritative.
- Keep `assets/native/windows-display.ps1` ASCII-only for Windows PowerShell 5 compatibility.
- Preserve the flat visual system and avoid gradients, glow, bloom, and background blur.
- Add or update tests for behavior changes.
- Update `CHANGELOG.md` and the relevant architecture document when behavior or tradeoffs change.
- Do not commit generated output from `dist`, `dist-electron`, `release`, `coverage`, or `artifacts`.

## Commit style

Use short, imperative commit subjects. Examples:

```text
Add primary indicator to topology preview
Fix Windows apply notification encoding
Document per-profile scaling behavior
```

Keep unrelated changes in separate commits whenever practical.

## Reporting issues

Include:

- Monitor Manager version
- Operating system and build
- GPU and driver version
- Monitor models and connection types
- Expected and actual behavior
- Relevant profile settings
- Screenshots or logs with personal paths and identifiers removed

Do not include access tokens, private profile data, or other credentials.
