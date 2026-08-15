import {
  AppWindow,
  Check,
  ChevronDown,
  CircleAlert,
  Copy,
  CopyPlus,
  Eye,
  ExternalLink,
  Info,
  LoaderCircle,
  Menu,
  MonitorCog,
  MoonStar,
  Monitor,
  Play,
  Plus,
  Power,
  RefreshCw,
  Save,
  Settings,
  Star,
  SunMedium,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AppSnapshot,
  DisplayInfo,
  DisplayMode,
  DisplayProfile,
  ProfileDisplay,
} from '../shared/types';
import { findProfileDisplay, normalizeProfileDisplays } from '../shared/profile-utils';
import {
  refreshRatesForResolution,
  resolutionKey,
  selectRefreshRate,
  selectResolution,
  uniqueResolutions,
} from '../shared/mode-utils';

type ToastState = { kind: 'success' | 'error' | 'info'; message: string } | null;

export const toProfileDisplay = (display: DisplayInfo): ProfileDisplay => ({
  displayId: display.id,
  fallbackSystemId: display.systemId,
  name: display.name,
  enabled: display.enabled,
  primary: display.primary,
  hdrEnabled: display.hdrEnabled,
  bounds: { ...display.bounds },
  mode: { ...display.mode },
  rotation: display.rotation,
  scalePercent: display.scalePercent,
});

export function mergeProfile(displays: DisplayInfo[], profile: DisplayProfile): DisplayInfo[] {
  return displays.map((display) => {
    const saved = findProfileDisplay(profile.displays, display.id, display.systemId);
    if (!saved) return display;
    return {
      ...display,
      mirrored: false,
      enabled: saved.enabled,
      primary: saved.primary,
      hdrEnabled: saved.hdrEnabled,
      bounds: { ...saved.bounds },
      mode: { ...saved.mode },
      rotation: saved.rotation,
      scalePercent: saved.scalePercent ?? display.scalePercent,
    };
  });
}

function monitorNumber(displays: DisplayInfo[], id: string): number {
  return displays.findIndex((display) => display.id === id) + 1;
}

export function App() {
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [liveDisplays, setLiveDisplays] = useState<DisplayInfo[]>([]);
  const [draftDisplays, setDraftDisplays] = useState<DisplayInfo[]>([]);
  const [profiles, setProfiles] = useState<DisplayProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('current');
  const [selectedDisplayId, setSelectedDisplayId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [nameDialog, setNameDialog] = useState<{ mode: 'create' | 'rename'; value: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<DisplayProfile | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const selectedProfileIdRef = useRef(selectedProfileId);

  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId);
  const selectedDisplay = draftDisplays.find((display) => display.id === selectedDisplayId) ?? draftDisplays[0];
  const currentSetupMirrored = selectedProfileId === 'current' && draftDisplays.some((display) => display.enabled && display.mirrored);

  const showToast = useCallback((next: ToastState) => {
    setToast(next);
    window.setTimeout(() => setToast(null), 3800);
  }, []);

  const adoptLiveDisplays = useCallback((displays: DisplayInfo[]) => {
    setLiveDisplays(displays);
    setDraftDisplays((current) => {
      if (selectedProfileIdRef.current !== 'current' && current.length) return current;
      return displays;
    });
    setSelectedDisplayId((current) => current || displays[0]?.id || '');
  }, []);

  useEffect(() => {
    selectedProfileIdRef.current = selectedProfileId;
  }, [selectedProfileId]);

  useEffect(() => {
    let cancelled = false;
    window.monitorManager.getSnapshot()
      .then((data) => {
        if (cancelled) return;
        setSnapshot(data);
        setProfiles(data.profiles);
        setLiveDisplays(data.displays);
        setDraftDisplays(data.displays);
        setSelectedDisplayId(data.displays[0]?.id ?? '');
      })
      .catch((error) => showToast({ kind: 'error', message: String(error) }))
      .finally(() => !cancelled && setLoading(false));
    const removeDisplaysListener = window.monitorManager.onDisplaysChanged(adoptLiveDisplays);
    const removeProfileListener = window.monitorManager.onProfileApplied(() => {
      showToast({ kind: 'success', message: 'Display profile applied.' });
    });
    return () => {
      cancelled = true;
      removeDisplaysListener();
      removeProfileListener();
    };
  }, [adoptLiveDisplays, showToast]);

  useEffect(() => {
    if (!selectedDisplayId && draftDisplays[0]) setSelectedDisplayId(draftDisplays[0].id);
  }, [draftDisplays, selectedDisplayId]);

  const selectProfile = (id: string) => {
    setSettingsOpen(false);
    setSelectedProfileId(id);
    setDirty(false);
    if (id === 'current') {
      setDraftDisplays(liveDisplays);
    } else {
      const profile = profiles.find((item) => item.id === id);
      if (profile) setDraftDisplays(mergeProfile(liveDisplays, profile));
    }
  };

  const updateDisplay = (id: string, update: Partial<DisplayInfo>) => {
    setDraftDisplays((items) => items.map((display) => display.id === id ? { ...display, ...update } : display));
    setDirty(true);
  };

  const toggleEnabled = (display: DisplayInfo) => {
    const enabledCount = draftDisplays.filter((item) => item.enabled).length;
    if (display.enabled && enabledCount === 1) {
      showToast({ kind: 'error', message: 'At least one monitor must stay enabled.' });
      return;
    }
    setDraftDisplays((items) => {
      const next = items.map((item) => item.id === display.id ? { ...item, enabled: !display.enabled, primary: display.enabled ? false : item.primary } : item);
      if (display.enabled && display.primary) {
        const replacement = next.find((item) => item.enabled);
        if (replacement) return next.map((item) => ({ ...item, primary: item.id === replacement.id }));
      }
      return next;
    });
    setDirty(true);
  };

  const setPrimary = (display: DisplayInfo) => {
    setDraftDisplays((items) => items.map((item) => ({
      ...item,
      enabled: item.id === display.id ? true : item.enabled,
      primary: item.id === display.id,
    })));
    setDirty(true);
  };

  const handleHdr = async (display: DisplayInfo, enabled: boolean) => {
    if (selectedProfileId !== 'current') {
      updateDisplay(display.id, { hdrEnabled: enabled });
      return;
    }
    setWorking(true);
    const result = await window.monitorManager.setHdr(display.id, enabled);
    setWorking(false);
    showToast({ kind: result.ok ? 'success' : 'error', message: result.message });
    if (result.displays) adoptLiveDisplays(result.displays);
  };

  const saveProfile = async (name?: string, createNew = false) => {
    if (draftDisplays.some((display) => display.enabled && display.mirrored)) {
      showToast({ kind: 'error', message: 'Windows Duplicate mode cannot be saved as a Monitor Manager profile. Choose Extend in Win+P first.' });
      return null;
    }
    const targetName = name ?? selectedProfile?.name;
    if (!targetName) {
      setNameDialog({ mode: 'create', value: 'My display profile' });
      return null;
    }
    const next = await window.monitorManager.saveProfile({
      id: createNew ? undefined : selectedProfile?.id,
      name: targetName,
      displays: normalizeProfileDisplays(draftDisplays.map(toProfileDisplay)),
    });
    setProfiles(next);
    const saved = selectedProfile?.id && !createNew
      ? next.find((item) => item.id === selectedProfile.id)
      : next[next.length - 1];
    if (saved) setSelectedProfileId(saved.id);
    setDirty(false);
    showToast({ kind: 'success', message: `Saved ${targetName}.` });
    return saved;
  };

  const applySelected = async () => {
    let profile: DisplayProfile | null | undefined = selectedProfile;
    setWorking(true);
    try {
      if (!profile || dirty) profile = await saveProfile(profile?.name);
      if (!profile) return;
      const result = await window.monitorManager.applyProfile(profile.id);
      showToast({ kind: result.ok ? 'success' : 'error', message: result.message });
      if (result.displays) {
        setLiveDisplays(result.displays);
        setDraftDisplays(mergeProfile(result.displays, profile));
      }
    } finally {
      setWorking(false);
    }
  };

  const applyCurrentChanges = async () => {
    if (currentSetupMirrored) {
      showToast({ kind: 'error', message: 'Choose Extend in Win+P, or apply a saved profile to leave Duplicate mode.' });
      return;
    }
    setWorking(true);
    try {
      const result = await window.monitorManager.applyConfiguration({
        name: 'Current setup',
        displays: normalizeProfileDisplays(draftDisplays.map(toProfileDisplay)),
      });
      showToast({ kind: result.ok ? 'success' : 'error', message: result.message });
      if (result.displays) {
        setLiveDisplays(result.displays);
        setDraftDisplays(result.displays);
        setDirty(false);
      }
    } catch (error) {
      showToast({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
    } finally {
      setWorking(false);
    }
  };

  const refresh = async () => {
    setWorking(true);
    try {
      const displays = await window.monitorManager.refreshDisplays();
      setLiveDisplays(displays);
      setDraftDisplays(selectedProfile ? mergeProfile(displays, selectedProfile) : displays);
      setDirty(false);
      showToast({ kind: 'info', message: `Found ${displays.length} display${displays.length === 1 ? '' : 's'}.` });
    } catch (error) {
      showToast({ kind: 'error', message: String(error) });
    } finally {
      setWorking(false);
    }
  };

  const openDisplaySettings = async () => {
    try {
      await window.monitorManager.openDisplaySettings();
      showToast({ kind: 'info', message: `Opened ${snapshot?.capabilities.platform === 'macos' ? 'macOS Displays' : 'Windows display'} settings.` });
    } catch (error) {
      showToast({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  };

  const deleteSelected = async () => {
    if (!deleteDialog) return;
    setWorking(true);
    const profileName = deleteDialog.name;
    try {
      const next = await window.monitorManager.deleteProfile(deleteDialog.id);
      setProfiles(next);
      selectProfile('current');
      setDeleteDialog(null);
      showToast({ kind: 'info', message: `Deleted ${profileName}.` });
    } catch (error) {
      showToast({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
    } finally {
      setWorking(false);
    }
  };

  const completeNameDialog = async () => {
    if (!nameDialog?.value.trim()) return;
    if (nameDialog.mode === 'rename' && selectedProfile) {
      const next = await window.monitorManager.saveProfile({
        id: selectedProfile.id,
        name: nameDialog.value,
        displays: selectedProfile.displays,
      });
      setProfiles(next);
      showToast({ kind: 'success', message: 'Profile renamed.' });
    } else {
      await saveProfile(nameDialog.value, true);
    }
    setNameDialog(null);
  };

  if (loading) {
    return <div className="splash"><img src="../assets/icons/icon-256.png" alt="" /><LoaderCircle className="spin" /><span>Discovering your displays…</span></div>;
  }

  return (
    <div className="app-shell">
      <header className="titlebar">
        <div className="brand"><img src="../assets/icons/icon-32.png" alt="" /><span>Monitor Manager</span></div>
        <div className="drag-region" />
        <div className="header-status"><span className="status-dot" />{liveDisplays.filter((display) => display.enabled).length} active</div>
      </header>

      <aside className="sidebar">
        <div className="sidebar-heading">
          <h2>Display profiles</h2>
          <button className="icon-button" title="Save the current arrangement as a new profile" onClick={() => setNameDialog({ mode: 'create', value: 'My display profile' })}><Plus size={18} /></button>
        </div>
        <nav className="profile-list" aria-label="Display profiles">
          <button className={`profile-item current ${!settingsOpen && selectedProfileId === 'current' ? 'selected' : ''}`} onClick={() => selectProfile('current')}>
            <span className="profile-icon"><Monitor size={18} /></span>
            <span className="profile-copy"><strong>Current setup</strong></span>
            {!settingsOpen && selectedProfileId === 'current' && <Check size={16} />}
          </button>
          <div className="list-label">Saved profiles</div>
          {profiles.map((profile) => (
            <button key={profile.id} className={`profile-item ${!settingsOpen && selectedProfileId === profile.id ? 'selected' : ''}`} onClick={() => selectProfile(profile.id)}>
              <span className="profile-icon"><AppWindow size={17} /></span>
              <span className="profile-copy"><strong>{profile.name}</strong><small>{profile.displays.filter((display) => display.enabled).length} monitors active</small></span>
              {!settingsOpen && selectedProfileId === profile.id && <Check size={16} />}
            </button>
          ))}
          {!profiles.length && <div className="empty-profiles"><CopyPlus size={22} /><span>No saved profiles yet</span><small>Capture a setup for one-click switching.</small></div>}
        </nav>
        <div className="sidebar-footer">
          <button className={settingsOpen ? 'selected' : ''} onClick={() => setSettingsOpen((value) => !value)}><Settings size={17} />Settings</button>
          <span>v{snapshot?.appVersion}</span>
        </div>
      </aside>

      <main className="content">
        <div className="content-heading">
          <div>
            {settingsOpen ? <h1>Settings</h1> : <>{selectedProfile && <span className="eyebrow">Saved profile</span>}<h1>{selectedProfile?.name ?? 'Current setup'} {dirty && <span className="unsaved">Unsaved</span>}</h1></>}
          </div>
          {!settingsOpen && <div className="heading-actions">
            {selectedProfile && <button className="icon-button danger" title="Delete this profile" onClick={() => setDeleteDialog(selectedProfile)}><Trash2 size={17} /></button>}
            {selectedProfile && <button className="button secondary" onClick={() => setNameDialog({ mode: 'rename', value: selectedProfile.name })}><Menu size={16} />Rename</button>}
            <button className="button secondary" title={snapshot?.capabilities.platform === 'macos' ? 'Open macOS Displays settings' : 'Open Windows display settings'} onClick={() => void openDisplaySettings()} disabled={snapshot?.capabilities.platform === 'unsupported'}><ExternalLink size={17} />Display settings</button>
            <button className="button secondary" title="Show a number on every connected monitor" onClick={() => void window.monitorManager.identifyDisplays()}><Eye size={17} />Identify</button>
            <button className="icon-button" title="Refresh connected displays" onClick={refresh} disabled={working}><RefreshCw size={17} className={working ? 'spin' : ''} /></button>
          </div>}
        </div>

        {settingsOpen ? (
          <SettingsPanel snapshot={snapshot} onSnapshot={setSnapshot} />
        ) : (
          <>
            {snapshot && !snapshot.capabilities.canToggleHdr && (
              <div className="notice"><Info size={18} /><span>{snapshot.capabilities.notes[0]}</span></div>
            )}
            {currentSetupMirrored && (
              <div className="notice warning" role="status"><Copy size={18} /><span><strong>Windows Duplicate mode is active.</strong> Mirrored layouts cannot be saved or edited. Choose Extend in Win+P, or apply a saved profile to restore an independent layout.</span></div>
            )}
            <Topology displays={draftDisplays} selectedId={selectedDisplay?.id} onSelect={setSelectedDisplayId} />

            <section className="display-section">
              <div className="section-heading"><div><h3>Connected displays</h3><p>Choose a display to configure its role and signal. Resolution, refresh rate, and scaling are saved independently with every display profile.</p></div><span>{draftDisplays.length} detected</span></div>
              <div className="display-cards">
                {draftDisplays.map((display) => (
                  <DisplayCard
                    key={display.id}
                    display={display}
                    number={monitorNumber(draftDisplays, display.id)}
                    selected={selectedDisplay?.id === display.id}
                    canToggleHdr={snapshot?.capabilities.canToggleHdr ?? false}
                    onSelect={() => setSelectedDisplayId(display.id)}
                    onToggle={() => toggleEnabled(display)}
                    onPrimary={() => setPrimary(display)}
                    onHdr={(enabled) => void handleHdr(display, enabled)}
                  />
                ))}
              </div>
            </section>

            {selectedDisplay && (
              <DisplayEditor
                display={selectedDisplay}
                onMode={(mode) => updateDisplay(selectedDisplay.id, { mode, bounds: { ...selectedDisplay.bounds, width: mode.width, height: mode.height } })}
                onScale={(scalePercent) => updateDisplay(selectedDisplay.id, { scalePercent })}
                onRotation={(rotation) => {
                  const wasPortrait = selectedDisplay.rotation === 90 || selectedDisplay.rotation === 270;
                  const willBePortrait = rotation === 90 || rotation === 270;
                  const mode = wasPortrait === willBePortrait ? selectedDisplay.mode : { ...selectedDisplay.mode, width: selectedDisplay.mode.height, height: selectedDisplay.mode.width };
                  const availableModes = wasPortrait === willBePortrait ? selectedDisplay.availableModes : selectedDisplay.availableModes.map((item) => ({ ...item, width: item.height, height: item.width }));
                  updateDisplay(selectedDisplay.id, { rotation, mode, availableModes, bounds: { ...selectedDisplay.bounds, width: mode.width, height: mode.height } });
                }}
              />
            )}
          </>
        )}

        {!settingsOpen && (
          <div className="actionbar">
            <div className="actionbar-copy">
              {selectedProfile ? <><Save size={17} /><span>{dirty ? 'Save changes, then apply this profile.' : 'Ready to switch to this profile.'}</span></> : currentSetupMirrored ? <><Copy size={17} /><span>Duplicate mode is controlled by Windows. Apply a saved profile to return to an extended layout.</span></> : <><CircleAlert size={17} /><span>{dirty ? 'Apply these changes now, or save them for tray access.' : 'Disabled monitors stay here so they can be switched back on.'}</span></>}
            </div>
            <div className="actionbar-buttons">
              <button className="button secondary" onClick={() => void saveProfile()} disabled={working || currentSetupMirrored} title={currentSetupMirrored ? 'Duplicate mode cannot be saved as a profile' : undefined}><Save size={17} />{selectedProfile ? 'Save' : 'Save as profile'}</button>
              {selectedProfile && <button className="button primary" onClick={applySelected} disabled={working}>{working ? <LoaderCircle className="spin" size={17} /> : <Play size={17} fill="currentColor" />}Apply profile</button>}
              {!selectedProfile && <button className="button primary" onClick={applyCurrentChanges} disabled={working || !dirty || currentSetupMirrored} title={currentSetupMirrored ? 'Choose Extend in Win+P or apply a saved profile' : undefined}>{working ? <LoaderCircle className="spin" size={17} /> : <Play size={17} fill="currentColor" />}Apply changes</button>}
            </div>
          </div>
        )}
      </main>

      {nameDialog && (
        <div className="modal-backdrop" onMouseDown={() => setNameDialog(null)}>
          <form className="modal" onSubmit={(event) => { event.preventDefault(); void completeNameDialog(); }} onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setNameDialog(null)}><X size={18} /></button>
            <div className="modal-icon"><MonitorCog size={24} /></div>
            <h2>{nameDialog.mode === 'rename' ? 'Rename profile' : 'Save display profile'}</h2>
            <p>{nameDialog.mode === 'rename' ? 'Choose a clear name for this arrangement.' : 'This captures enabled monitors, layout, resolution, refresh rate, scaling, rotation, and HDR preferences.'}</p>
            <label>Profile name<input autoFocus value={nameDialog.value} onChange={(event) => setNameDialog({ ...nameDialog, value: event.target.value })} onFocus={(event) => event.target.select()} /></label>
            <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setNameDialog(null)}>Cancel</button><button className="button primary" disabled={!nameDialog.value.trim() || currentSetupMirrored} title={currentSetupMirrored ? 'Duplicate mode cannot be saved as a profile' : undefined}><Save size={17} />Save profile</button></div>
          </form>
        </div>
      )}
      {deleteDialog && (
        <div className="modal-backdrop" onMouseDown={() => !working && setDeleteDialog(null)}>
          <section className="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-profile-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" aria-label="Close" disabled={working} onClick={() => setDeleteDialog(null)}><X size={18} /></button>
            <div className="modal-icon danger"><Trash2 size={22} /></div>
            <h2 id="delete-profile-title">Delete display profile?</h2>
            <p>Are you sure you want to delete <strong>“{deleteDialog.name}”</strong>? This cannot be undone.</p>
            <div className="modal-actions">
              <button type="button" className="button secondary" disabled={working} onClick={() => setDeleteDialog(null)}>Cancel</button>
              <button type="button" className="button destructive" disabled={working} onClick={() => void deleteSelected()}>{working ? <LoaderCircle className="spin" size={17} /> : <Trash2 size={17} />}Delete profile</button>
            </div>
          </section>
        </div>
      )}
      {toast && <div className={`toast ${toast.kind}`}>{toast.kind === 'success' ? <Check size={18} /> : toast.kind === 'error' ? <CircleAlert size={18} /> : <Info size={18} />}{toast.message}</div>}
    </div>
  );
}

export function Topology({ displays, selectedId, onSelect }: { displays: DisplayInfo[]; selectedId?: string; onSelect: (id: string) => void }) {
  const active = displays.filter((display) => display.enabled);
  const layout = useMemo(() => {
    if (!active.length) return [];
    const minX = Math.min(...active.map((display) => display.bounds.x));
    const minY = Math.min(...active.map((display) => display.bounds.y));
    const maxX = Math.max(...active.map((display) => display.bounds.x + display.mode.width));
    const maxY = Math.max(...active.map((display) => display.bounds.y + display.mode.height));
    const scale = Math.min(720 / Math.max(maxX - minX, 1), 170 / Math.max(maxY - minY, 1));
    return active.map((display) => ({
      display,
      left: (display.bounds.x - minX) * scale,
      top: (display.bounds.y - minY) * scale,
      width: Math.max(display.mode.width * scale, 76),
      height: Math.max(display.mode.height * scale, 48),
    }));
  }, [active]);
  const width = Math.max(0, ...layout.map((item) => item.left + item.width));
  const height = Math.max(0, ...layout.map((item) => item.top + item.height));

  return (
    <section className="topology-card">
      <div className="topology-toolbar"><span><Monitor size={17} />Arrangement preview</span><small>Positions are restored when this profile is applied</small></div>
      <div className="topology-stage">
        <div className="topology-layout" style={{ width, height }}>
          {layout.map(({ display, ...style }) => (
            <button key={display.id} className={`monitor-tile ${selectedId === display.id ? 'selected' : ''} ${display.primary ? 'primary' : ''}`} style={style} onClick={() => onSelect(display.id)} title={`${display.name} — ${display.mode.width} × ${display.mode.height} at ${Math.round(display.mode.refreshRate)} Hz`}>
              {display.primary && <span className="monitor-primary-star" role="img" aria-label="Primary display" title="Primary display"><Star size={13} fill="currentColor" /></span>}
              <span className="monitor-number">{monitorNumber(displays, display.id)}</span>
              <span className="monitor-name">{display.name}</span>
              <small>{display.mode.width} × {display.mode.height} · {Math.round(display.mode.refreshRate)} Hz</small>
              {display.hdrEnabled && <b>HDR</b>}
            </button>
          ))}
        </div>
        {!!displays.filter((display) => !display.enabled).length && <div className="disabled-rack"><Power size={14} />Disabled: {displays.filter((display) => !display.enabled).map((display) => `${monitorNumber(displays, display.id)}. ${display.name}`).join(', ')}</div>}
      </div>
    </section>
  );
}

function DisplayCard({ display, number, selected, canToggleHdr, onSelect, onToggle, onPrimary, onHdr }: {
  display: DisplayInfo; number: number; selected: boolean; canToggleHdr: boolean; onSelect: () => void; onToggle: () => void; onPrimary: () => void; onHdr: (enabled: boolean) => void;
}) {
  return (
    <article className={`display-card ${selected ? 'selected' : ''} ${!display.enabled ? 'disabled' : ''}`} onClick={onSelect}>
      <div className="display-card-top">
        <div className="display-glyph"><Monitor size={24} /><span>{number}</span></div>
        <div className="display-title"><strong>{display.name}</strong><span>{display.connection} · {display.systemId}</span></div>
        <button className={`switch ${display.enabled ? 'on' : ''}`} role="switch" aria-checked={display.enabled} disabled={display.mirrored} title={display.mirrored ? 'Choose Extend in Win+P before editing this monitor' : display.enabled ? 'Disable this monitor in the profile' : 'Enable this monitor in the profile'} onClick={(event) => { event.stopPropagation(); onToggle(); }}><span /></button>
      </div>
      <div className="display-stats">
        <span><small>Resolution</small>{display.mode.width > 0 ? `${display.mode.width} × ${display.mode.height}` : 'Automatic'}</span>
        <span><small>Refresh rate</small>{display.mode.refreshRate > 1 ? `${Math.round(display.mode.refreshRate)} Hz` : 'Automatic'}</span>
        <span><small>Scale</small>{display.enabled ? `${display.scalePercent}%` : '—'}</span>
      </div>
      <div className="display-badges">
        {display.mirrored && <span className="mirrored-badge" title="This monitor currently shares a Windows display source"><Copy size={14} />Mirrored by Windows</span>}
        <button className={display.primary ? 'active' : ''} disabled={!display.enabled || display.mirrored} title="Make this the primary monitor" onClick={(event) => { event.stopPropagation(); onPrimary(); }}><Star size={14} fill={display.primary ? 'currentColor' : 'none'} />{display.primary ? 'Primary' : 'Set primary'}</button>
        <button className={display.hdrEnabled ? 'active hdr' : ''} disabled={!display.enabled || display.mirrored || !display.hdrSupported || !canToggleHdr} title={!display.hdrSupported ? 'This monitor does not report HDR support' : 'Toggle HDR for this monitor'} onClick={(event) => { event.stopPropagation(); onHdr(!display.hdrEnabled); }}>{display.hdrEnabled ? <SunMedium size={14} /> : <MoonStar size={14} />}HDR {display.hdrEnabled ? 'on' : 'off'}</button>
      </div>
    </article>
  );
}

function DisplayEditor({ display, onMode, onScale, onRotation }: {
  display: DisplayInfo;
  onMode: (mode: DisplayMode) => void;
  onScale: (scalePercent: number) => void;
  onRotation: (rotation: 0 | 90 | 180 | 270) => void;
}) {
  const resolutions = uniqueResolutions(display.mode, display.availableModes);
  const refreshRates = refreshRatesForResolution(display.mode, display.availableModes);
  const scalePercents = Array.from(new Set([display.scalePercent, ...display.availableScalePercents]))
    .filter((value) => value > 0)
    .sort((left, right) => left - right);
  return (
    <section className={`signal-editor ${!display.enabled || display.mirrored ? 'disabled' : ''}`}>
      <div><h3>Signal settings</h3><p>Settings for {display.name}</p></div>
      <label>Resolution<div className="select-wrap"><select value={resolutionKey(display.mode)} disabled={!display.enabled || display.mirrored} onChange={(event) => { const mode = selectResolution(display.mode, display.availableModes, event.target.value); if (mode) onMode(mode); }}>{resolutions.map((mode) => <option key={resolutionKey(mode)} value={resolutionKey(mode)}>{mode.width} × {mode.height}</option>)}</select><ChevronDown size={16} /></div></label>
      <label>Refresh rate<div className="select-wrap"><select value={Math.round(display.mode.refreshRate * 100)} disabled={!display.enabled || display.mirrored} onChange={(event) => { const mode = selectRefreshRate(display.mode, display.availableModes, Number(event.target.value)); if (mode) onMode(mode); }}>{refreshRates.map((rate) => <option key={Math.round(rate * 100)} value={Math.round(rate * 100)}>{Number(rate.toFixed(2))} Hz</option>)}</select><ChevronDown size={16} /></div></label>
      <label>Scaling<div className="select-wrap"><select value={display.scalePercent} disabled={!display.enabled || display.mirrored || scalePercents.length < 2} title={scalePercents.length < 2 ? 'This platform did not report additional scaling choices' : 'Set desktop text and app scaling for this display'} onChange={(event) => onScale(Number(event.target.value))}>{scalePercents.map((scale) => <option key={scale} value={scale}>{scale}%</option>)}</select><ChevronDown size={16} /></div></label>
      <label>Orientation<div className="select-wrap"><select value={display.rotation} disabled={!display.enabled || display.mirrored} onChange={(event) => onRotation(Number(event.target.value) as 0 | 90 | 180 | 270)}><option value={0}>Landscape</option><option value={90}>Portrait</option><option value={180}>Landscape (flipped)</option><option value={270}>Portrait (flipped)</option></select><ChevronDown size={16} /></div></label>
    </section>
  );
}

function SettingsPanel({ snapshot, onSnapshot }: { snapshot: AppSnapshot | null; onSnapshot: (value: AppSnapshot) => void }) {
  if (!snapshot) return null;
  const toggleStartup = async () => {
    const startupEnabled = await window.monitorManager.setStartup(!snapshot.startupEnabled);
    onSnapshot({ ...snapshot, startupEnabled });
  };
  return (
    <section className="settings-panel">
      <div className="settings-hero"><div className="settings-logo"><img src="../assets/icons/icon-256.png" alt="Monitor Manager" /></div><div><h2>Monitor Manager</h2><p>Monitor Manager is a display controller that lives in your system tray. It detects connected monitors, lets you enable or disable each display, controls HDR where supported, and saves complete display profiles for one-click switching.</p></div></div>
      <div className="settings-group"><h3>General</h3><button className="settings-row" onClick={toggleStartup}><span><strong>Start at login</strong><small>Keep your display profiles one click away after signing in.</small></span><span className={`switch ${snapshot.startupEnabled ? 'on' : ''}`}><span /></span></button></div>
      <div className="settings-group about"><h3>About</h3><p>Version {snapshot.appVersion}. Configuration is stored locally on this computer.</p></div>
    </section>
  );
}
