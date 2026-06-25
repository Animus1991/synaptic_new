/**
 * Canonical workspace context — breadcrumbs, step titles, tool labels.
 * Priority 0 / Prompt 1: one hierarchy for header, stepper, Agent.
 */

import type { WorkspaceToolId } from './taskFlows';
import { isGenericStudyConcept } from './workspaceContentFallback';
import { isGarbageStepTitle, sanitizeStepTitle } from './workspaceStepTitleQuality';
import { workspaceToolLabel, workspaceToolDescription } from './workspaceToolRegistry';

export type WorkspaceContextBreadcrumb = {
  courseLabel: string | null;
  sectionLabel: string;
  stepLabel: string;
  toolLabel: string;
  toolDescription: string;
  stepType: string | null;
  lowConfidenceSection: boolean;
  genericConcept: boolean;
};

/** §2.1 canonical workspace context — single source of truth for all surfaces. */
export type WorkspaceContext = WorkspaceContextBreadcrumb & {
  courseId?: string;
  documentId?: string;
  processingVersion?: string;
  sectionId?: string;
  sectionTitle: string;
  stepIndex: number;
  stepCount: number;
  activeTool: WorkspaceToolId;
  activeConcept: string;
  sourceQuality: number | null;
  oldPipeline: boolean;
  pipelineVersion?: string;
};

/** @deprecated alias — use WorkspaceContext */
export type WorkspaceContextSnapshot = WorkspaceContext;

export function displayWorkspaceStepTitle(
  title: string,
  concept: string,
  lang: 'en' | 'el',
): string {
  const sanitized = sanitizeStepTitle(title, concept, lang);
  return sanitized.slice(0, 42);
}

export function isLowConfidenceStepTitle(title: string, concept: string): boolean {
  const trimmed = title.trim();
  if (!trimmed) return true;
  if (isGarbageStepTitle(trimmed)) return true;
  if (isGenericStudyConcept(trimmed) && isGenericStudyConcept(concept)) return true;
  return false;
}

export function buildWorkspaceContextBreadcrumb(opts: {
  courseName?: string;
  concept: string;
  stepIndex: number;
  stepCount: number;
  stepTitle?: string;
  stepType?: string;
  activeTool: WorkspaceToolId;
  lang: 'en' | 'el';
}): WorkspaceContextBreadcrumb {
  const {
    courseName,
    concept,
    stepIndex,
    stepCount,
    stepTitle,
    stepType,
    activeTool,
    lang,
  } = opts;

  const rawSection = stepTitle?.trim() || concept;
  const sectionLabel = displayWorkspaceStepTitle(rawSection, concept, lang);
  const isEl = lang === 'el';

  return {
    courseLabel: courseName?.trim() || null,
    sectionLabel,
    stepLabel: isEl
      ? `Βήμα ${stepIndex + 1}/${stepCount}`
      : `Step ${stepIndex + 1}/${stepCount}`,
    toolLabel: workspaceToolLabel(activeTool, lang),
    toolDescription: workspaceToolDescription(activeTool, lang),
    stepType: stepType?.trim() || null,
    lowConfidenceSection: isLowConfidenceStepTitle(rawSection, concept),
    genericConcept: isGenericStudyConcept(concept),
  };
}

export function buildWorkspaceContext(opts: {
  courseId?: string;
  courseName?: string;
  documentId?: string;
  concept: string;
  stepIndex: number;
  stepCount: number;
  stepTitle?: string;
  stepType?: string;
  activeTool: WorkspaceToolId;
  lang: 'en' | 'el';
  sourceQuality?: number | null;
  oldPipeline?: boolean;
  pipelineVersion?: string;
}): WorkspaceContext {
  const breadcrumb = buildWorkspaceContextBreadcrumb(opts);
  const rawSection = opts.stepTitle?.trim() || opts.concept;
  return {
    ...breadcrumb,
    courseId: opts.courseId,
    documentId: opts.documentId ?? opts.courseId,
    processingVersion: opts.pipelineVersion,
    sectionId: rawSection || undefined,
    sectionTitle: breadcrumb.sectionLabel,
    stepIndex: opts.stepIndex,
    stepCount: opts.stepCount,
    activeTool: opts.activeTool,
    activeConcept: opts.concept,
    sourceQuality: opts.sourceQuality ?? null,
    oldPipeline: Boolean(opts.oldPipeline),
    pipelineVersion: opts.pipelineVersion,
  };
}
