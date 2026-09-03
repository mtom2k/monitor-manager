# Developer Handoff

## Current release

Monitor Manager 0.3.2 is a functional Electron desktop application. It is not a static prototype.

The Windows implementation has passed physical hardware tests for:

- native discovery and stable monitor identity;
- high-refresh and rotated modes;
- enable and disable topology changes;
- direct restoration of disabled displays;
- persistent last-known mode recovery;
- per-display HDR switching;
- per-display desktop scaling;
- complete profile application;
- serialized and verified tray profile application;
- persistent physical-monitor numbering across topology changes;
- collision-safe three-monitor and arbitrary-count preview layout;
- Win+P projection detection and Duplicate-mode recovery;
- native Windows and macOS display-settings launching;
- packaged native helper paths;
- tray profile and version menu behavior.
- persistent tray-only startup through the Start minimized setting.

The 2026-08-20 three-monitor regression run reproduced a transient Windows error 87 while returning from the single-monitor Racing Sim profile to Default. Version 0.3.1 retried after topology stabilization and restored AW3225QF and M28U resolution, refresh rate, rotation, scaling, coordinates, primary state, and HDR without another user action. G34WQC A remained connected and disabled as requested.

The interface uses `#1a1a1e` surfaces, `#748df3` controls, no bloom effects, readable typography, confirmation before profile deletion, and a primary star in Arrangement Preview.

## Important files

- `src/main/index.ts`: lifecycle, tray, IPC, identify overlays, smoke capture, and login item behavior
- `src/main/platform/display-adapter.ts`: native adapter contract
- `src/main/platform/windows-adapter.ts`: JSON bridge to the Windows helper
- `assets/native/windows-display.ps1`: CCD, mode, scaling, identity, and HDR implementation
- `src/main/platform/macos-adapter.ts`: macOS discovery and `displayplacer` integration
- `src/main/services/profile-store.ts`: local profile persistence
- `src/main/services/app-settings-store.ts`: schema-versioned application preference persistence
- `src/main/services/display-state-store.ts`: persistent last-known monitor state
- `src/renderer/App.tsx`: display and profile interaction model
- `src/renderer/styles.css`: responsive application styling
- `src/shared/types.ts`: domain and IPC contracts
- `src/shared/mode-utils.ts`: resolution and refresh-rate selection logic
- `src/shared/system-settings-utils.ts`: fixed native settings targets and platform fallback order
- `src/shared/profile-apply-utils.ts`: accepted-state verification for Windows profile convergence
- `src/shared/profile-utils.ts`: profile matching, primary normalization, and collision-safe layout

## Invariants

1. Do not replace CCD profile application with `ChangeDisplaySettingsEx`. The tested NVIDIA driver rejected unchanged high-refresh modes through that API.
2. `SetDisplayConfig` must run in the signed-in interactive desktop session.
3. Activate topology paths before applying exact source modes when the active monitor set changes.
4. Re-query paths after topology changes because Windows can remap source identifiers.
5. Match displays by physical target identifier before using the GDI source fallback.
6. Apply desktop scaling only after topology and mode stabilization.
7. Apply HDR after the target is active.
8. Preserve inactive synthetic records and hydrate them through `DisplayStateStore`.
9. Keep at least one monitor enabled. The renderer and helper both enforce this rule.
10. Keep the Windows PowerShell helper ASCII-only. Windows PowerShell 5 can corrupt UTF-8 smart punctuation in native status messages.
11. Refresh native state after every mutation instead of assuming Windows accepted the request.
12. Preserve the flat color system and profile deletion confirmation.
13. Treat Duplicate mode as read-only Current setup state. Do not persist mirrored layouts in schema version 1.
14. Leave Duplicate through `SDC_TOPOLOGY_EXTEND` before applying independent profile paths. Direct clone-to-extend supplied paths returned error 87 on the tested NVIDIA stack.
15. Do not cache mirrored display scans as last-known independent state.
16. Keep native settings targets hardcoded behind the parameterless IPC method. Do not allow renderer-supplied system protocols.
17. Preserve focus-based refresh because refresh-rate-only native changes may not emit an Electron display-metrics event.
18. Serialize all Windows helper operations. A display-event scan must not overlap a topology mutation.
19. Treat a Windows profile application as successful only after accepted-state verification passes.
20. Keep `displayNumber` bound to the stable physical target ID and never derive it from the latest enumeration order.
21. Preserve valid source rectangles and move only overlapping enabled targets. Do not introduce a fixed display-count limit.
22. Read Start minimized before showing the initial window. Tray clicks, activation, and second-instance launches must still reveal the window.

## Profile compatibility

Schema version 1 stores one `ProfileDisplay` per monitor. Current fields include topology, enabled state, primary role, bounds, mode, rotation, scale, and HDR preference.

Profiles written before scale support can omit `scalePercent`. The renderer inherits the live scale and the Windows helper treats a missing or nonpositive value as "leave unchanged."

Changing schema structure requires a migration in `ProfileStore` and compatibility coverage in the test suite.

## Known limitations

- macOS has not been tested on physical hardware.
- macOS profile application requires `displayplacer`.
- macOS percentage scaling and independent HDR switching are read-only.
- Clone and mirror groups cannot be saved or created. External Windows Duplicate mode is detected, labeled, and recoverable through a saved extended profile.
- Variable refresh rate, color-depth selection, and overscan are not represented.
- Arrangement Preview displays coordinates but does not support drag-to-arrange editing.
- Exact disabled-target recovery requires Monitor Manager to have observed the monitor while active.
- There is no timed rollback dialog after a signal or topology change.
- Release executables are not code-signed.

## Recommended next work

1. Add a 15-second "Keep these settings?" dialog with automatic CCD rollback.
2. Perform the installed-build checklist on a clean Windows account.
3. Run macOS hardware QA and improve persistent identifier parsing from `displayplacer list`.
4. Add drag-to-arrange behavior to Arrangement Preview.
5. Add profile import and export.
6. Add Windows and Apple signing and notarization.

## Release process

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd test
npm.cmd run package:win
```

Update `CHANGELOG.md`, run the hardware-sensitive checklist in `TESTING.md`, compute SHA-256 hashes, create an annotated Git tag, and upload the setup and portable executables to the matching GitHub release.

Electron Builder copies `assets/native` into packaged resources so PowerShell can execute the helper outside `app.asar`. Generate icon derivatives from the supplied source with:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\generate-icons.ps1
```

Do not edit generated icon PNG files by hand.
