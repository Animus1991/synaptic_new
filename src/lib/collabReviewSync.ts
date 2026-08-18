/**
 * Co-reading challenges/votes sync via /v1/study-rooms/:id/coreading.
 * Note proposals stay device-local until their own server path ships.
 */
export const COLLAB_REVIEW_MULTI_DEVICE_SYNC = true;

export type CollabReviewSurface = 'proposals' | 'coreading';

export function isCollabReviewMultiDeviceSyncEnabled(
  surface: CollabReviewSurface = 'coreading',
): boolean {
  if (surface === 'proposals') return false;
  return COLLAB_REVIEW_MULTI_DEVICE_SYNC;
}
