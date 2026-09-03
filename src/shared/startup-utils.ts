export function shouldShowMainWindowAtLaunch(startMinimized: boolean, smokeCaptureRequested = false): boolean {
  return !startMinimized || smokeCaptureRequested;
}
