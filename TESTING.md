# Testing and Verification

## Automated checks

Run these commands from the repository root:

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

The current suite contains 31 tests across 9 files. Coverage includes:

- tray version-label formatting;
- profile deletion confirmation;
- stable and fallback display matching;
- stable target precedence when mirrored targets share one Windows source;
- primary-display normalization;
- rejection of configurations with zero enabled monitors;
- inactive-target hydration from last-known state;
- cache updates from valid active scans;
- resolution and refresh-rate selection;
- per-profile scaling persistence;
- primary-star behavior in Arrangement Preview;
- Windows PowerShell helper encoding safety.
- Duplicate-mode UI safeguards.
- preservation of last-known independent modes during Duplicate mode.
- Windows and macOS native display-settings targets;
- unsupported-platform settings behavior;
- Display settings toolbar wiring.
- accepted-state verification for topology, refresh rate, orientation, position, scaling, and HDR;
- persistent monitor numbering across Windows enumeration changes;
- new-monitor number assignment;
- collision-safe layout normalization;
- twelve-display layout coverage without an application-level fixed limit.

## Native Windows discovery

```powershell
powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass `
  -File .\assets\native\windows-display.ps1 -Command list
```

Expected output is one JSON object with `ok: true` and a `data` array. Run profile-application tests from a normal signed-in desktop session because `SetDisplayConfig` requires interactive-session access.

## Hardware verification record

Date: 2026-08-14

Environment:

- Windows 11
- NVIDIA GeForce RTX 4090
- Alienware AW3225QF over HDMI
- Gigabyte M28U over DisplayPort

| Test | Result |
| --- | --- |
| Discover and deduplicate physical targets | Pass, exactly two displays |
| AW3225QF active mode | Pass, 3840 x 2160 at 240 Hz, landscape |
| M28U active mode | Pass, 2160 x 3840 at 144 Hz, portrait |
| Connection type | Pass, HDMI and DisplayPort |
| HDR discovery | Pass, both capable and AW3225QF enabled |
| Idempotent HDR application | Pass |
| Reapply unchanged two-monitor profile | Pass |
| Apply AW3225QF-only profile | Pass |
| Keep disabled M28U accessible | Pass |
| Hydrate disabled M28U from cache | Pass |
| Restore M28U exact mode and position | Pass |
| Enumerate scale choices | Pass, 100% through 350% on both displays |
| Change M28U scale | Pass, 150% to 125% with no warnings |
| Restore M28U scale | Pass, returned to 150% with other settings unchanged |
| Win+P Duplicate discovery | Pass, two enabled mirrored targets on one shared source |
| Save or edit Duplicate mode | Pass, blocked with an explanatory notice |
| Apply saved profile from Duplicate | Pass, exited Duplicate and restored exact independent settings |
| Win+P PC screen only | Pass, one active and one recoverable inactive target |
| Win+P Second screen only | Pass, one active and one recoverable inactive target |
| Win+P Extend | Pass, exact baseline retained |
| Windows native Display settings launch | Pass, packaged v0.3.0 opened System > Display |
| macOS Displays settings targets | Pass, automated target and fallback validation; physical hardware pending |
| Packaged native helper path | Pass |
| Packaged tray version row | Pass, Version 0.3.1 directly above Quit |
| Main interface visual review | Pass |
| Signal controls visual review | Pass |
| Settings visual review | Pass |
| Delete confirmation visual review | Pass |
| Primary star visual review | Pass |

### Three-monitor regression verification

Date: 2026-08-20

Environment added a Gigabyte G34WQC A over DisplayPort to the existing AW3225QF and M28U setup.

| Test | Result |
| --- | --- |
| Discover available physical targets | Pass, three stable targets with one currently disabled |
| Persistent numbering | Pass, AW3225QF 1, G34WQC A 2, M28U 3 before and after topology changes |
| Three-display draft preview | Pass, G34WQC A placed to the right of the valid AW3225QF and M28U rectangles with no overlap |
| Arbitrary-count layout | Pass, automated twelve-display coverage with no fixed application limit |
| Apply Racing Sim profile | Pass, G34WQC A at 3440 x 1440, 144 Hz, landscape, 125% scaling, primary |
| Restore Default profile after topology change | Pass, first detailed Windows commit returned error 87; serialized retry converged without another user action |
| Restore AW3225QF signal | Pass, 3840 x 2160 at 240 Hz, landscape, 150% scaling, HDR on, primary |
| Restore M28U signal | Pass, 2160 x 3840 at 144 Hz, portrait, 150% scaling, HDR off |
| Final baseline comparison | Pass, all enabled states, modes, positions, rotations, scales, primary state, and HDR states matched |

The final hardware state was restored after every topology or scaling test:

- AW3225QF: 3840 x 2160 at 240 Hz, landscape, 150% scaling, HDR on, primary
- M28U: 2160 x 3840 at 144 Hz, portrait, 150% scaling, HDR off
- G34WQC A: connected and disabled, preserved as monitor 2

## Release artifacts

Monitor Manager 0.3.1 SHA-256 hashes:

```text
portable  26C340AFDA78FD7D90CD064E95A50BE8C9AB93CCCF48C2A2996FB9561BBA44A6
setup     92E258E9C675E9CDD0472C8254B18ADFCED53915478B25A592584A9015100799
```

## Visual smoke capture

The main process supports opt-in development variables for deterministic screenshots:

```powershell
$env:MONITOR_MANAGER_SMOKE_CAPTURE = "$PWD\artifacts\ui-smoke.png"
npm.cmd start
```

Set `MONITOR_MANAGER_SMOKE_VIEW` to `settings`, `signal-controls`, or `delete-confirmation` to capture those states. Smoke data uses an isolated user-data directory and the code path remains inactive unless a smoke variable is present.

The packaged tray menu can be serialized with:

```powershell
$env:MONITOR_MANAGER_TRAY_SMOKE_RESULT = "$PWD\artifacts\tray-menu.json"
& '.\release\Monitor Manager-0.3.1-x64-portable.exe'
```

## Manual release checklist

- [ ] Save, rename, apply, and delete a profile.
- [ ] Cancel profile deletion once and confirm no profile is removed.
- [ ] Apply profiles from the window and tray menu.
- [ ] Confirm the primary star follows primary-display changes.
- [ ] Save two profiles with different signal and scaling settings for one monitor, then verify each profile restores its values.
- [ ] Disable a secondary monitor and restore it from Current setup.
- [ ] Enter Duplicate with Win+P and confirm both physical monitors are labeled Mirrored by Windows.
- [ ] Confirm Duplicate Current setup cannot be saved or edited.
- [ ] Apply a saved extended profile from Duplicate and confirm independent modes are restored.
- [ ] Confirm Version 0.3.1 appears immediately above Quit Monitor Manager.
- [ ] Open native Display settings from the main toolbar and confirm the correct operating-system page appears.
- [ ] Change resolution, refresh rate, scale, or arrangement in native settings, return to Monitor Manager, and confirm Current setup refreshes.
- [ ] Apply a Monitor Manager change while native settings is open and confirm the operating-system panel reflects the accepted state.
- [ ] Confirm closing the window leaves the tray process running.
- [ ] Confirm Quit Monitor Manager exits the process.
- [ ] Confirm Identify overlays appear on every active monitor.
- [ ] Toggle HDR off and back on for an HDR display.
- [ ] Install and repeat the checklist with the NSIS package.
- [ ] Verify release hashes before upload.
- [ ] On macOS, verify identifiers and profile application against the installed `displayplacer` version.
