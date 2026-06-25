import { describe, expect, it } from 'vitest';
import {
  buildWorkspaceContext,
  buildWorkspaceContextBreadcrumb,
  displayWorkspaceStepTitle,
  isLowConfidenceStepTitle,
} from './workspaceContextModel';

describe('workspaceContextModel', () => {
  it('sanitizes garbage step titles for display', () => {
    const title = '=10*QK+20*QY1800=1*QK+4*QY';
    const shown = displayWorkspaceStepTitle(title, 'ΗΠΑ Ιαπωνία', 'el');
    expect(shown).not.toContain('=10*');
    expect(isLowConfidenceStepTitle(title, 'ΗΠΑ Ιαπωνία')).toBe(true);
  });

  it('builds breadcrumb with course, section, step, and tool', () => {
    const ctx = buildWorkspaceContextBreadcrumb({
      courseName: 'Μικροοικονομική Θεωρία ΙΙ',
      concept: 'ΗΠΑ Ιαπωνία',
      stepIndex: 7,
      stepCount: 8,
      stepTitle: 'Έλεγχος Γνώσεων',
      stepType: 'quiz',
      activeTool: 'quiz',
      lang: 'el',
    });
    expect(ctx.courseLabel).toBe('Μικροοικονομική Θεωρία ΙΙ');
    expect(ctx.sectionLabel).toContain('Έλεγχος');
    expect(ctx.stepLabel).toBe('Βήμα 8/8');
    expect(ctx.toolLabel).toBe('Κουίζ');
    expect(ctx.lowConfidenceSection).toBe(false);
  });

  it('flags low-confidence section titles', () => {
    const ctx = buildWorkspaceContextBreadcrumb({
      concept: 'ΗΠΑ Ιαπωνία',
      stepIndex: 0,
      stepCount: 8,
      stepTitle: '=10*QK+20*QY1800=1*QK+4*QY',
      activeTool: 'reader',
      lang: 'el',
    });
    expect(ctx.lowConfidenceSection).toBe(true);
  });

  it('buildWorkspaceContext includes spine fields', () => {
    const ctx = buildWorkspaceContext({
      courseId: 'c1',
      courseName: 'Micro',
      concept: 'Tariffs',
      stepIndex: 2,
      stepCount: 10,
      stepTitle: 'Trade policy',
      activeTool: 'quiz',
      lang: 'en',
      sourceQuality: 55,
    });
    expect(ctx.activeConcept).toBe('Tariffs');
    expect(ctx.stepIndex).toBe(2);
    expect(ctx.documentId).toBe('c1');
    expect(ctx.sectionTitle).toBeTruthy();
  });
});
