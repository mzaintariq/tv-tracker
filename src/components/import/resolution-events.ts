export const RESOLUTION_REFRESH_EVENT = "tv-time-resolution-refresh";
export function notifyResolutionRefresh(importId: string, resolvedItemId?: string) {
  window.dispatchEvent(new CustomEvent(RESOLUTION_REFRESH_EVENT, { detail: { importId, resolvedItemId } }));
}
