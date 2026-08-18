/** @vitest-environment jsdom */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CollabDeviceLocalBanner } from './CollabDeviceLocalBanner';
import { isCollabReviewMultiDeviceSyncEnabled } from '../../lib/collabReviewSync';

afterEach(() => cleanup());

describe('CollabDeviceLocalBanner (P1 — co-reading sync on, proposals local)', () => {
  it('enables multi-device sync for co-reading only', () => {
    expect(isCollabReviewMultiDeviceSyncEnabled('coreading')).toBe(true);
    expect(isCollabReviewMultiDeviceSyncEnabled('proposals')).toBe(false);
  });

  it('labels proposals as this-device-only (EN)', () => {
    render(<CollabDeviceLocalBanner lang="en" surface="proposals" />);
    expect(screen.getByTestId('collab-device-local-banner-proposals')).toBeTruthy();
    expect(screen.getByText('This device only')).toBeTruthy();
    expect(screen.getByText(/Not live across devices/i)).toBeTruthy();
  });

  it('hides the co-reading device-local banner once room sync is on', () => {
    render(<CollabDeviceLocalBanner lang="el" surface="coreading" />);
    expect(screen.queryByTestId('collab-device-local-banner-coreading')).toBeNull();
  });
});
