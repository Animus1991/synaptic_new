/** @vitest-environment jsdom */
import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ReaderStepSyncHarness } from './ReaderStepSyncHarness';

afterEach(() => cleanup());

const syllabusText = [
  'ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ ΣΤΗ ΔΙΕΘΝΗ ΟΙΚΟΝΟΜΙΚΗ',
  'Θεματική: εμπορική πολιτική.',
].join('\f') + '\f' + [
  'ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ ΣΥΓΚΡΙΤΙΚΩΝ ΠΛΕΟΝΕΚΤΗΜΑΤΩΝ',
  'Απόλυτα πλεονεκτήματα.',
].join('\n');

const steps = [
  { title: 'ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ ΣΤΗ ΔΙΕΘΝΗ ΟΙΚΟΝΟΜΙΚΗ', type: 'Core Concept' },
  { title: 'ΔΙΑΛΕΞΗ 2 ΘΕΩΡΙΑ ΣΥΓΚΡΙΤΙΚΩΝ ΠΛΕΟΝΕΚΤΗΜΑΤΩΝ', type: 'Deep Dive' },
  { title: 'Knowledge Check', type: 'Quiz' },
];

function lecture2NavButton() {
  const nav = screen.getByTestId('reader-section-nav');
  return [...nav.querySelectorAll('button')].find((b) => /ΔΙΑΛΕΞΗ 2/i.test(b.textContent ?? ''));
}

describe('ReaderStepSyncHarness (Prompt 16 — DOM component tests)', () => {
  it('1. Reader-to-step: section nav click updates active step rail', () => {
    render(<ReaderStepSyncHarness steps={steps} sourceText={syllabusText} />);
    expect(screen.getByTestId('harness-active-step').textContent).toBe('0');

    const lecture2 = lecture2NavButton();
    expect(lecture2).toBeTruthy();
    fireEvent.click(lecture2!);

    expect(screen.getByTestId('harness-active-step').textContent).toBe('1');
    expect(screen.getByTestId('workspace-step-rail-1').getAttribute('aria-current')).toBe('step');
    expect(screen.getByTestId('harness-focus-reader').textContent).toBe('yes');
  });

  it('2. Step-to-Reader: workspace step rail click highlights reader segment', () => {
    render(<ReaderStepSyncHarness steps={steps} sourceText={syllabusText} />);
    fireEvent.click(screen.getByTestId('workspace-step-rail-1'));
    expect(screen.getByTestId('harness-active-step').textContent).toBe('1');
    expect(screen.getByTestId('harness-active-segment').textContent).not.toBe('none');
    expect(document.querySelector('[data-testid^="reader-section-nav-active-"]')).toBeTruthy();
    expect(screen.getByTestId('harness-focus-reader').textContent).toBe('yes');
  });

  it('3. Quiz no-focus: quiz step does not request reader focus', () => {
    render(<ReaderStepSyncHarness steps={steps} sourceText={syllabusText} />);
    fireEvent.click(screen.getByTestId('workspace-step-rail-2'));
    expect(screen.getByTestId('harness-active-step').textContent).toBe('2');
    expect(screen.getByTestId('harness-focus-reader').textContent).toBe('no');
    expect(screen.getByTestId('harness-active-segment').textContent).toBe('none');
  });

  it('4. Noop: re-clicking active section nav does not change step', () => {
    render(<ReaderStepSyncHarness steps={steps} sourceText={syllabusText} />);
    const lecture2 = lecture2NavButton();
    fireEvent.click(lecture2!);
    expect(screen.getByTestId('harness-active-step').textContent).toBe('1');
    fireEvent.click(lecture2!);
    expect(screen.getByTestId('harness-active-step').textContent).toBe('1');
  });

  it('5. Missing step fallback: unknown nav label is ignored', () => {
    render(<ReaderStepSyncHarness steps={steps} sourceText={syllabusText} />);
    fireEvent.click(screen.getByTestId('workspace-step-rail-1'));
    expect(screen.getByTestId('harness-active-step').textContent).toBe('1');
    fireEvent.click(screen.getByTestId('harness-unknown-nav'));
    expect(screen.getByTestId('harness-active-step').textContent).toBe('1');
  });

  it('6. Reprocess mismatch: step index clamps when outline shrinks', () => {
    const { rerender } = render(<ReaderStepSyncHarness steps={steps} sourceText={syllabusText} />);
    fireEvent.click(screen.getByTestId('workspace-step-rail-2'));
    expect(screen.getByTestId('harness-active-step').textContent).toBe('2');

    rerender(<ReaderStepSyncHarness steps={steps.slice(0, 2)} sourceText={syllabusText} />);
    expect(screen.getByTestId('harness-active-step').textContent).toBe('1');
    expect(screen.getByTestId('harness-active-segment').textContent).not.toBe('none');
  });
});
