import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  nativeTheme,
  Notification,
  screen,
  shell,
  Tray,
} from 'electron';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import type { DisplayInfo, SaveProfileInput } from '../shared/types';
import { IPC } from '../shared/types';
import { formatVersionLabel } from '../shared/version-utils';
import { systemDisplaySettingsTargets } from '../shared/system-settings-utils';
import type { DisplayAdapter } from './platform/display-adapter';
import { MacOsDisplayAdapter } from './platform/macos-adapter';
import { UnsupportedDisplayAdapter } from './platform/unsupported-adapter';
import { WindowsDisplayAdapter } from './platform/windows-adapter';
import { DisplayStateStore } from './services/display-state-store';
import { ProfileStore } from './services/profile-store';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let trayMenu: Menu | null = null;
let adapter: DisplayAdapter;
let profileStore: ProfileStore;
let displayStateStore: DisplayStateStore;
let isQuitting = false;
let displayRefreshTimer: NodeJS.Timeout | undefined;
let profileApplyInProgress = false;

const smokeOutputPath = process.env.MONITOR_MANAGER_SMOKE_CAPTURE ?? process.env.MONITOR_MANAGER_TRAY_SMOKE_RESULT;
if (smokeOutputPath) {
  app.setPath('userData', path.join(path.dirname(smokeOutputPath), '.monitor-manager-smoke-data'));
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

function createAdapter(): DisplayAdapter {
  if (process.platform === 'win32') return new WindowsDisplayAdapter();
  if (process.platform === 'darwin') return new MacOsDisplayAdapter();
  return new UnsupportedDisplayAdapter();
}

function assetPath(...segments: string[]): string {
  return path.join(app.getAppPath(), ...segments);
}

function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow();
  }
  mainWindow?.show();
  mainWindow?.focus();
}

function scheduleDisplayRefresh(): void {
  clearTimeout(displayRefreshTimer);
  displayRefreshTimer = setTimeout(() => void refreshDisplays(true), 700);
}

async function openDisplaySettings(): Promise<void> {
  const platform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'unsupported';
  const targets = systemDisplaySettingsTargets(platform);
  if (!targets.length) throw new Error('Native display settings are not available on this platform.');

  let lastError: unknown;
  for (const target of targets) {
    try {
      if (target.kind === 'external') {
        await shell.openExternal(target.value);
      } else {
        const error = await shell.openPath(target.value);
        if (error) throw new Error(error);
      }
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Could not open native display settings: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 800,
    minWidth: 980,
    minHeight: 650,
    show: false,
    backgroundColor: '#1a1a1e',
    icon: assetPath('assets', 'icons', 'icon-256.png'),
    title: 'Monitor Manager',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1a1a1e',
      symbolColor: '#a9a7b4',
      height: 44,
    },
    webPreferences: {
      preload: path.join(__dirname, '..', 'main', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    void mainWindow.loadURL(devUrl);
  } else {
    void mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    const smokeCapturePath = process.env.MONITOR_MANAGER_SMOKE_CAPTURE;
    if (smokeCapturePath) {
      setTimeout(async () => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        const smokeView = process.env.MONITOR_MANAGER_SMOKE_VIEW;
        if (smokeView === 'settings') {
          await mainWindow.webContents.executeJavaScript("document.querySelector('.sidebar-footer button')?.click()");
          await new Promise((resolve) => setTimeout(resolve, 750));
        } else if (smokeView === 'signal-controls') {
          await mainWindow.webContents.executeJavaScript("document.querySelector('.signal-editor')?.scrollIntoView({ block: 'center' })");
          await new Promise((resolve) => setTimeout(resolve, 750));
        } else if (smokeView === 'delete-confirmation') {
          await mainWindow.webContents.executeJavaScript("document.querySelectorAll('.profile-item')[1]?.click()");
          await new Promise((resolve) => setTimeout(resolve, 150));
          await mainWindow.webContents.executeJavaScript("document.querySelector('.heading-actions .danger')?.click()");
          await new Promise((resolve) => setTimeout(resolve, 750));
        }
        const image = await mainWindow.webContents.capturePage();
        await writeFile(smokeCapturePath, image.toPNG());
        isQuitting = true;
        app.quit();
      }, 3000);
    }
  });
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  mainWindow.on('focus', scheduleDisplayRefresh);
}

async function rebuildTrayMenu(): Promise<void> {
  if (!tray) return;
  const profiles = await profileStore.list();
  const profileItems: Electron.MenuItemConstructorOptions[] = profiles.length
    ? profiles.map((profile) => ({
        label: profile.name,
        enabled: !profileApplyInProgress,
        click: () => void applyProfile(profile.id, true),
      }))
    : [{ label: 'No profiles saved', enabled: false }];

  trayMenu = Menu.buildFromTemplate([
    { label: 'Open Monitor Manager', click: showMainWindow },
    { type: 'separator' },
    { label: 'Display Profiles', enabled: false },
    ...profileItems,
    { type: 'separator' },
    { label: 'Refresh displays', click: () => void refreshDisplays(true) },
    { label: 'Identify displays', click: () => void identifyDisplays() },
    { type: 'separator' },
    { label: formatVersionLabel(app.getVersion()), enabled: false },
    {
      label: 'Quit Monitor Manager',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(trayMenu);
}

function createTray(): void {
  const trayIconPath = assetPath('assets', 'icons', process.platform === 'darwin' ? 'trayTemplate.png' : 'icon-32.png');
  const image = nativeImage.createFromPath(trayIconPath);
  if (process.platform === 'darwin') image.setTemplateImage(true);
  tray = new Tray(image);
  tray.setToolTip('Monitor Manager');
  tray.on('click', showMainWindow);
  void rebuildTrayMenu();
}

function scheduleTraySmokeResult(): void {
  const resultPath = process.env.MONITOR_MANAGER_TRAY_SMOKE_RESULT;
  if (!resultPath) return;

  setTimeout(() => {
    void (async () => {
      if (!trayMenu) throw new Error('The tray menu was unavailable for smoke verification.');
      const items = trayMenu.items.map((item) => ({
        label: item.label,
        type: item.type,
        enabled: item.enabled,
      }));
      await writeFile(resultPath, `${JSON.stringify({ version: app.getVersion(), items }, null, 2)}\n`, 'utf8');
      isQuitting = true;
      app.quit();
    })();
  }, 1200);
}

async function refreshDisplays(broadcast = false): Promise<DisplayInfo[]> {
  const displays = await displayStateStore.hydrate(await adapter.listDisplays());
  if (broadcast) {
    mainWindow?.webContents.send(IPC.displaysChanged, displays);
  }
  return displays;
}

async function applyProfile(profileId: string, fromTray = false) {
  if (profileApplyInProgress) return { ok: false, message: 'Another display profile is still being applied.' };
  const profile = await profileStore.get(profileId);
  if (!profile) return { ok: false, message: 'That profile no longer exists.' };
  profileApplyInProgress = true;
  await rebuildTrayMenu();
  try {
    const result = await adapter.applyProfile(profile);
    result.displays = await refreshDisplays(false);
    mainWindow?.webContents.send(IPC.displaysChanged, result.displays);
    if (result.ok) {
      mainWindow?.webContents.send(IPC.profileApplied, profileId);
    } else if (fromTray && Notification.isSupported()) {
      new Notification({ title: 'Monitor Manager', body: result.message }).show();
    }
    return result;
  } finally {
    profileApplyInProgress = false;
    await rebuildTrayMenu();
  }
}

async function identifyDisplays(): Promise<void> {
  const activeDisplays = (await refreshDisplays(false)).filter((display) => display.enabled);
  const used = new Set<string>();
  const overlays = screen.getAllDisplays().map((display, index) => {
    const labelMatch = activeDisplays.find((candidate) => (
      !used.has(candidate.id)
      && Boolean(display.label)
      && candidate.name.localeCompare(display.label, undefined, { sensitivity: 'base' }) === 0
    ));
    const primaryMatch = display.bounds.x === 0 && display.bounds.y === 0
      ? activeDisplays.find((candidate) => !used.has(candidate.id) && candidate.primary)
      : undefined;
    const matched = labelMatch ?? primaryMatch ?? activeDisplays.find((candidate) => !used.has(candidate.id));
    if (matched) used.add(matched.id);
    const overlay = new BrowserWindow({
      x: display.bounds.x + Math.round(display.bounds.width / 2) - 92,
      y: display.bounds.y + Math.round(display.bounds.height / 2) - 92,
      width: 184,
      height: 184,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      focusable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      webPreferences: { sandbox: true },
    });
    overlay.setIgnoreMouseEvents(true);
    overlay.setAlwaysOnTop(true, 'screen-saver');
    const number = matched?.displayNumber ?? index + 1;
    const html = `<!doctype html><style>*{box-sizing:border-box}body{margin:0;background:transparent;font-family:Segoe UI,-apple-system,sans-serif}.badge{width:176px;height:176px;margin:4px;border:5px solid rgba(255,255,255,.94);border-radius:20px;background:#748df3;color:#111218;display:grid;place-items:center;font-size:86px;font-weight:750}</style><div class="badge">${number}</div>`;
    void overlay.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    return overlay;
  });
  setTimeout(() => overlays.forEach((overlay) => !overlay.isDestroyed() && overlay.destroy()), 2200);
}

function registerIpc(): void {
  ipcMain.handle(IPC.getSnapshot, async () => ({
    displays: await refreshDisplays(false),
    profiles: await profileStore.list(),
    capabilities: adapter.capabilities,
    startupEnabled: app.getLoginItemSettings().openAtLogin,
    appVersion: app.getVersion(),
  }));
  ipcMain.handle(IPC.refreshDisplays, () => refreshDisplays(false));
  ipcMain.handle(IPC.saveProfile, async (_event, input: SaveProfileInput) => {
    const profiles = await profileStore.save(input);
    await rebuildTrayMenu();
    return profiles;
  });
  ipcMain.handle(IPC.deleteProfile, async (_event, profileId: string) => {
    const profiles = await profileStore.delete(profileId);
    await rebuildTrayMenu();
    return profiles;
  });
  ipcMain.handle(IPC.applyProfile, (_event, profileId: string) => applyProfile(profileId));
  ipcMain.handle(IPC.applyConfiguration, async (_event, input: SaveProfileInput) => {
    const now = new Date().toISOString();
    const result = await adapter.applyProfile({
      id: 'current-configuration',
      name: input.name.trim() || 'Current setup',
      createdAt: now,
      updatedAt: now,
      displays: input.displays,
    });
    if (result.ok) {
      result.displays = await refreshDisplays(false);
      mainWindow?.webContents.send(IPC.displaysChanged, result.displays);
    }
    return result;
  });
  ipcMain.handle(IPC.setHdr, async (_event, displayId: string, enabled: boolean) => {
    const result = await adapter.setHdr(displayId, enabled);
    if (result.ok) {
      result.displays = await refreshDisplays(false);
      mainWindow?.webContents.send(IPC.displaysChanged, result.displays);
    }
    return result;
  });
  ipcMain.handle(IPC.identifyDisplays, () => identifyDisplays());
  ipcMain.handle(IPC.openDisplaySettings, () => openDisplaySettings());
  ipcMain.handle(IPC.setStartup, (_event, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: true });
    return app.getLoginItemSettings().openAtLogin;
  });
  ipcMain.handle(IPC.openExternal, async (_event, url: string) => {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Unsupported URL protocol.');
    await shell.openExternal(parsed.toString());
  });
}

app.on('second-instance', showMainWindow);

app.whenReady().then(() => {
  app.setAppUserModelId('com.monitormanager.app');
  nativeTheme.themeSource = 'dark';
  adapter = createAdapter();
  profileStore = new ProfileStore();
  displayStateStore = new DisplayStateStore();
  registerIpc();
  createMainWindow();
  createTray();
  scheduleTraySmokeResult();

  screen.on('display-added', scheduleDisplayRefresh);
  screen.on('display-removed', scheduleDisplayRefresh);
  screen.on('display-metrics-changed', scheduleDisplayRefresh);
});

app.on('activate', showMainWindow);
app.on('window-all-closed', () => {
  // Monitor Manager intentionally remains available in the tray/menu bar.
});
app.on('before-quit', () => {
  isQuitting = true;
});
