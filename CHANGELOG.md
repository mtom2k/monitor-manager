# Changelog

All notable changes are recorded here.

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
