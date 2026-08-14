# Architecture Decisions

This file records decisions that materially affect maintenance, compatibility, or product behavior.

## ADR-001: Electron, React, and TypeScript

**Status:** Accepted

**Context:** The application needs one interface for Windows and macOS, tray or menu-bar behavior, login-item support, packaging, and a controlled native boundary.

**Decision:** Use Electron for desktop lifecycle, React for the renderer, and shared TypeScript contracts for IPC.

**Consequences:** The runtime is larger than a fully native utility. Native monitor work remains isolated and can move to compiled helpers later without replacing the renderer.

## ADR-002: Strict native adapter boundary

**Status:** Accepted

**Decision:** `DisplayAdapter` is the only interface the main process uses for monitor discovery, profile application, and HDR switching.

**Consequences:** Platform limitations are explicit. A future Swift helper or native Node module can replace one adapter independently.

## ADR-003: Windows CCD for topology and mode application

**Status:** Accepted after hardware testing

**Context:** The first implementation used `ChangeDisplaySettingsEx`. On the test RTX 4090 and NVIDIA driver, unchanged 3840 x 2160 at 240 Hz and 2160 x 3840 at 144 Hz modes returned `DISP_CHANGE_BADMODE`.

**Decision:** Use `QueryDisplayConfig` and `SetDisplayConfig` for topology and mode commits. Keep `EnumDisplaySettingsEx` only for mode enumeration.

**Consequences:** High-refresh, rotated, HDR, and Display Stream Compression capable outputs use the current Windows display model. A topology change requires path activation followed by an exact mode pass.

## ADR-004: Stable physical target identifiers

**Status:** Accepted

**Decision:** Store the normalized monitor device interface path as `displayId` and the current GDI source name as `fallbackSystemId`.

**Consequences:** Profiles survive `DISPLAY1` and `DISPLAY2` remapping. Identical monitors without distinct device paths may need EDID serial handling in a future schema.

## ADR-005: Local JSON persistence

**Status:** Accepted

**Decision:** Store versioned profile and last-known display JSON under Electron `userData` instead of using SQLite or a cloud service.

**Consequences:** Data is local, inspectable, easy to migrate, and protected from concurrent writes by the single-instance lock.

## ADR-006: displayplacer for macOS profile application

**Status:** Accepted with dependency disclosure

**Context:** Electron does not expose APIs for changing macOS display topology. A custom signed Swift and CoreGraphics helper would add significant build and signing work.

**Decision:** Use `system_profiler` for discovery and `displayplacer` for mode, position, rotation, primary, and enable or disable changes.

**Consequences:** Discovery works without extra software. Full application requires `brew install displayplacer`. macOS still needs physical hardware verification.

## ADR-007: Preserve the supplied logo

**Status:** Accepted

**Decision:** Use the supplied 1280 x 1280 purple monitor artwork as the official source. Generate required application sizes mechanically and create only a monochrome menu-bar derivative.

**Consequences:** The visual identity remains consistent across the window, tray, installer, and release packages.

## ADR-008: Persist last-known active display state

**Status:** Accepted after hardware testing

**Context:** Windows exposes a disabled physical CCD target but omits its active source mode, rotation, and position. Automatic reactivation restored the portrait M28U as 3840 x 2160 at 60 Hz in landscape instead of 2160 x 3840 at 144 Hz in portrait.

**Decision:** Cache each usable active scan in `known-displays.json`. Hydrate matching inactive targets from that cache while preserving their disabled state.

**Consequences:** A monitor observed while active can be restored with its last exact configuration, including after restarting the app. A monitor first discovered while disabled uses Windows automatic mode selection until Monitor Manager sees it active.

## ADR-009: Flat, conventional application styling

**Status:** Accepted

**Decision:** Use `#1a1a1e` for the application background and `#748df3` for primary controls, toggles, focus rings, and selected states. Use opaque surfaces, conventional borders, restrained corner radii, and readable supporting text. Do not use decorative gradients, glow, bloom, or background blur.

**Consequences:** The interface remains compact and readable on high-DPI displays. Profile deletion uses a focused confirmation dialog.

## ADR-010: Persist Windows desktop scaling per profile

**Status:** Accepted after hardware testing

**Context:** CCD `DISPLAYCONFIG_SCALING` controls image stretch and centering, not the Windows 100%, 125%, or 150% desktop scale. Microsoft's public device-info enum does not expose source DPI packet types.

**Decision:** Store `scalePercent` for each profile display. On Windows, read and set source-relative DPI values, validate every request against the source-reported range, and leave scaling unchanged for legacy profiles without the field. Keep macOS percentage scaling read-only until accurate native enumeration is implemented.

**Consequences:** Windows profiles independently restore resolution, refresh rate, and desktop scaling. The DPI packet types are a compatibility risk because Microsoft does not list them in the public enum. Failures are warnings and do not invalidate a successful topology application.

## ADR-011: Keep inactive displays accessible

**Status:** Accepted

**Context:** A display-management tool must provide a way to re-enable a monitor that it disabled.

**Decision:** Keep disabled targets in Current setup, provide direct Apply changes behavior, and preserve cached mode information when Windows omits inactive source details.

**Consequences:** Users can restore a disabled display from the same application or apply a saved profile that enables it. Physically disconnected displays still require reconnection.

## ADR-012: Treat Windows Duplicate mode as external read-only state

**Status:** Accepted after hardware testing

**Context:** Win+P Duplicate maps two physical targets to one CCD source. The current profile schema stores independent position, mode, scale, rotation, and primary state per monitor, so a mirrored group cannot be represented accurately. The tested NVIDIA stack also rejected a direct supplied-path conversion from clone to extend with `ERROR_INVALID_PARAMETER`.

**Decision:** Detect active targets that share a source, expose both physical monitors as mirrored, and block edits or profile capture for that Current setup. Applying a saved profile first asks Windows for its persisted Extend topology, then applies the exact Monitor Manager profile.

**Consequences:** Win+P and Monitor Manager can coexist without silently saving a false topology. Duplicate layouts cannot be created or stored by Monitor Manager in schema version 1. A saved independent profile provides a tested one-click route out of Duplicate mode.
