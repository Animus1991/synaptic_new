/**
 * Propose / co-reading review layers are still device-local (localStorage).
 * Flip this when server sync ships so UI can drop the "this device only" chrome.
 */
export const COLLAB_REVIEW_MULTI_DEVICE_SYNC = false;

export function isCollabReviewMultiDeviceSyncEnabled(): boolean {
  return COLLAB_REVIEW_MULTI_DEVICE_SYNC;
}
