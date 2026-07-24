/** @vitest-environment jsdom */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SectionLabel } from './SectionLabel';
import { CompactProgressBar } from './CompactProgressBar';
import { QualityScoreBadge } from './QualityScoreBadge';
import { CourseStatusBadge } from './CourseStatusBadge';
import { BookOpen } from '@/lib/lucide-shim';

afterEach(() => cleanup());

describe('Wave A mockup primitives', () => {
  it('SectionLabel renders label text', () => {
    render(<SectionLabel icon={BookOpen}>Active courses</SectionLabel>);
    expect(screen.getByText('Active courses')).toBeTruthy();
  });

  it('CompactProgressBar exposes progressbar semantics', () => {
    render(<CompactProgressBar pct={66} aria-label="Mastery" />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('66');
  });

  it('QualityScoreBadge maps strong / weak bands', () => {
    const { rerender } = render(<QualityScoreBadge score={88} />);
    expect(screen.getByTestId('quality-score-badge').textContent).toMatch(/88/);
    rerender(<QualityScoreBadge score={40} />);
    expect(screen.getByTestId('quality-score-badge').textContent).toMatch(/40/);
  });

  it('CourseStatusBadge renders kind', () => {
    render(<CourseStatusBadge kind="needs_review" />);
    expect(screen.getByTestId('course-status-needs_review')).toBeTruthy();
  });
});
