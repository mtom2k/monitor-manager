# Changelog

All notable changes are recorded here.

## 0.2.0 - 2026-08-14

### Added

- Detection for Windows Duplicate projection mode and shared-source mirrored targets.
- A clear Duplicate-mode notice and per-monitor mirrored status badges.
- Automated coverage for stable target matching when mirrored monitors share a Windows source.

### Changed

- Blocked saving and editing the mirrored Current setup because the profile schema represents independent display sources.
- Made saved profile application leave Duplicate mode through Windows Extend before restoring exact profile settings.
- Prioritized stable physical monitor identifiers over shared GDI source fallbacks throughout profile and cache matching.
- Preserved last-known independent modes while Duplicate mode is active.

### Verified

- Tested Win+P Duplicate, PC screen only, Second screen only, and Extend on two physical 4K monitors.
- Confirmed a saved profile exits Duplicate mode and restores resolution, refresh rate, position, rotation, scaling, primary role, and HDR.
- Confirmed the original two-monitor setup was restored exactly after every projection test.

## 0.1.2 - 2026-08-14

### Added

- Separate resolution, refresh-rate, scaling, and orientation controls.
- Per-profile persistence for resolution, refresh rate, and desktop scaling.
- Windows scale-choice discovery and per-display scale application.
- A conventional monitor icon beside Current setup.
- A filled primary star in Arrangement Preview.
- A persistence note above Connected displays.
- A disabled Version 0.1.2 row above Quit Monitor Manager in the tray menu.
- Explicit confirmation before deleting a display profile.

### Changed

- Reworked the interface with `#1a1a1e` surfaces, `#748df3` controls, larger typography, simpler navigation, and no bloom effects.
- Simplified Settings with a concise product description.
- Changed native apply messages to ASCII-safe text for Windows PowerShell 5.

### Verified

- Completed a hardware scale round trip from 150% to 125% and back to 150%.
- Verified packaged signal controls, tray menu, native helper paths, and primary-star rendering.

## 0.1.1 - 2026-08-14

- Added direct Apply changes support in Current setup.
- Kept inactive Windows targets visible so they can be re-enabled.
- Added a persistent last-known display cache for exact mode, rotation, scaling, and position recovery.
- Isolated UI smoke-test data from concurrently running application data.

## 0.1.0 - 2026-08-14

- Added Windows discovery through CCD, GDI, Advanced Color, and DPI APIs.
- Added per-display HDR switching.
- Added profiles for enabled state, primary role, position, resolution, refresh rate, rotation, and HDR preference.
- Added Windows tray and macOS menu-bar profile switching.
- Added monitor identification overlays and start-at-login behavior.
- Added macOS discovery and optional `displayplacer` profile application.
- Added the official Monitor Manager icon set.
- Added local persistence, isolated typed IPC, tests, packaging, and project documentation.
