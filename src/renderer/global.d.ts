import type { MonitorManagerApi } from '../shared/types';

declare global {
  interface Window {
    monitorManager: MonitorManagerApi;
  }
}

export {};
