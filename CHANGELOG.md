# Changelog

All notable changes are recorded here.

## 0.3.1 - 2026-08-20

### Fixed

- Serialized native display operations so tray profile switches cannot race display refreshes or another profile application.
- Verified every Windows profile application and retried up to three times when the operating system did not retain topology, resolution, refresh rate, orientation, position, scaling, or HDR state on the first pass.
- Persisted monitor numbers by stable physical target instead of deriving them from Windows enumeration order.
- Prevented newly enabled or newly connected displays from overlapping existing displays in Arrangement Preview or saved profiles.

### Changed

- Made Arrangement Preview horizontally scrollable when a large display topology cannot remain readable inside the available width.
- Disabled tray profile entries while a profile operation is in progress and surfaced a Windows notification if a tray application fails.

### Verified

- Added stable numbering, transient native failure retry, application convergence, overlapping-layout, and twelve-display regression coverage.
- Reproduced Windows error 87 during a one-click Racing Sim to Default transition and verified that the retry restored every requested setting without a second user action.

## 0.3.0 - 2026-08-15

### Added

- A Display settings toolbar button that opens Windows Display settings or macOS Displays settings.
- Modern and legacy macOS Displays settings launch fallbacks.
- Focus-based display refresh so refresh-rate-only changes made in native settings are discovered when the user returns to Monitor Manager.

### Changed

- Kept operating-system display changes and Monitor Manager Current setup synchronized through display events and focus refreshes.

### Verified

- Added Windows, macOS, unsupported-platform, and renderer button coverage.

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
