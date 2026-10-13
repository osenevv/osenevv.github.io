/** macOS / iOS — show ⌘; Windows/Linux — show Ctrl. */
export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator as Navigator & { userAgentData?: { platform?: string } };
  if (ua.userAgentData?.platform) return /mac/i.test(ua.userAgentData.platform);
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}

/** Visible shortcut on the search button, e.g. ⌘K or Ctrl+K. */
export function searchShortcutLabel(): string {
  return isMacPlatform() ? '⌘K' : 'Ctrl+K';
}

/** For aria-keyshortcuts on controls. */
export function searchShortcutAria(): string {
  return isMacPlatform() ? 'Meta+K' : 'Control+K';
}
