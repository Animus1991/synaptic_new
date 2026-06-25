/** @vitest-environment jsdom */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { LeitnerPanel } from './LeitnerPanel';
import type { LeitnerSessionContent } from '../../lib/leitnerSessionModel';

afterEach(() => cleanup());

const session: LeitnerSessionContent = {
  cards: [{ front: 'Elasticity', back: 'Price sensitivity' }],
  sectionLabel: 'Markets',
  weakExtraction: false,
  passageGrounded: false,
  hasSource: true,
};

describe('LeitnerPanel — stale artifact mobile UX (Wave 6.8d)', () => {
  it('shows desktop header banner when stale', () => {
    render(
      <LeitnerPanel
        session={session}
        concept="Elasticity"
        lang="en"
        scopeKey="test-scope"
        artifactStale
        onAcknowledgeStale={vi.fn()}
      />,
    );
    expect(screen.getByTestId('artifact-stale-banner-leitner')).toBeTruthy();
  });

  it('shows mobile sticky deck banner when stale', () => {
    render(
      <LeitnerPanel
        session={session}
        concept="Elasticity"
        lang="en"
        scopeKey="test-scope"
        artifactStale
        onAcknowledgeStale={vi.fn()}
      />,
    );
    expect(screen.getByTestId('leitner-stale-banner-mobile')).toBeTruthy();
  });

  it('dismisses stale banner from mobile control', () => {
    const onAcknowledgeStale = vi.fn();
    render(
      <LeitnerPanel
        session={session}
        concept="Elasticity"
        lang="en"
        scopeKey="test-scope"
        artifactStale
        onAcknowledgeStale={onAcknowledgeStale}
      />,
    );
    fireEvent.click(screen.getByTestId('artifact-stale-dismiss-leitner-mobile'));
    expect(onAcknowledgeStale).toHaveBeenCalled();
  });

  it('hides stale banners when not stale', () => {
    render(
      <LeitnerPanel
        session={session}
        concept="Elasticity"
        lang="en"
        scopeKey="test-scope"
        artifactStale={false}
      />,
    );
    expect(screen.queryByTestId('artifact-stale-banner-leitner')).toBeNull();
    expect(screen.queryByTestId('leitner-stale-banner-mobile')).toBeNull();
  });
});
