/** @vitest-environment jsdom */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CollabDeviceLocalBanner } from './CollabDeviceLocalBanner';
import { isCollabReviewMultiDeviceSyncEnabled } from '../../lib/collabReviewSync';

afterEach(() => cleanup());

describe('CollabDeviceLocalBanner (P1 — not live multi-device)', () => {
  it('keeps multi-device review sync disabled until server sync ships', () => {
    expect(isCollabReviewMultiDeviceSyncEnabled()).toBe(false);
  });

  it('labels proposals as this-device-only (EN)', () => {
    render(<CollabDeviceLocalBanner lang="en" surface="proposals" />);
    expect(screen.getByTestId('collab-device-local-banner-proposals')).toBeTruthy();
    expect(screen.getByText('This device only')).toBeTruthy();
    expect(screen.getByText(/Not live across devices/i)).toBeTruthy();
  });

  it('labels co-reading as this-device-only (EL)', () => {
    render(<CollabDeviceLocalBanner lang="el" surface="coreading" />);
    expect(screen.getByTestId('collab-device-local-banner-coreading')).toBeTruthy();
    expect(screen.getByText('Μόνο αυτή η συσκευή')).toBeTruthy();
  });
});
