import { contextBridge, ipcRenderer } from 'electron';
import type { DisplayInfo, MonitorManagerApi } from '../shared/types';
import { IPC } from '../shared/types';

const api: MonitorManagerApi = {
  getSnapshot: () => ipcRenderer.invoke(IPC.getSnapshot),
  refreshDisplays: () => ipcRenderer.invoke(IPC.refreshDisplays),
  saveProfile: (profile) => ipcRenderer.invoke(IPC.saveProfile, profile),
  deleteProfile: (profileId) => ipcRenderer.invoke(IPC.deleteProfile, profileId),
  applyProfile: (profileId) => ipcRenderer.invoke(IPC.applyProfile, profileId),
  applyConfiguration: (configuration) => ipcRenderer.invoke(IPC.applyConfiguration, configuration),
  setHdr: (displayId, enabled) => ipcRenderer.invoke(IPC.setHdr, displayId, enabled),
  identifyDisplays: () => ipcRenderer.invoke(IPC.identifyDisplays),
  openDisplaySettings: () => ipcRenderer.invoke(IPC.openDisplaySettings),
  setStartup: (enabled) => ipcRenderer.invoke(IPC.setStartup, enabled),
  setStartMinimized: (enabled) => ipcRenderer.invoke(IPC.setStartMinimized, enabled),
  openExternal: (url) => ipcRenderer.invoke(IPC.openExternal, url),
  onDisplaysChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, displays: DisplayInfo[]) => callback(displays);
    ipcRenderer.on(IPC.displaysChanged, listener);
    return () => ipcRenderer.removeListener(IPC.displaysChanged, listener);
  },
  onProfileApplied: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, profileId: string) => callback(profileId);
    ipcRenderer.on(IPC.profileApplied, listener);
    return () => ipcRenderer.removeListener(IPC.profileApplied, listener);
  },
};

contextBridge.exposeInMainWorld('monitorManager', api);
