import type { WorkspaceToolId } from './taskFlows';
import { CONTENT_PIPELINE_VERSION } from './pipelineConstants';
import { displayWorkspaceStepTitle, isLowConfidenceStepTitle } from './workspaceContextModel';
import { workspaceToolLabel } from './workspaceToolRegistry';

/** Workspace handoff context for Agent RAG + system grounding. */
export type AgentWorkspaceContext = {
  courseId?: string;
  courseName?: string;
  stepIndex?: number;
  stepCount?: number;
  stepTitle?: string;
  stepType?: string;
  concept?: string;
  activeTool?: string;
  activeToolLabel?: string;
  sourceQuality?: number | null;
  oldPipeline?: boolean;
  pipelineVersion?: string;
  lowConfidenceSection?: boolean;
};

export type OpenAgentFromWorkspaceOpts = {
  prompt?: string;
  mode?: import('../types').AgentMode;
  autoSend?: boolean;
  context?: AgentWorkspaceContext;
};

/**
 * Widen the BM25/embedding query with course, section, and concept terms so
 * retrieval matches the learner's current workspace step — not just the prompt.
 */
export function buildAgentRetrievalQuery(
  userQuery: string,
  ctx?: AgentWorkspaceContext,
): string {
  const parts: string[] = [userQuery.trim()];
  if (ctx?.concept?.trim()) parts.push(ctx.concept.trim());
  if (ctx?.stepTitle?.trim()) parts.push(ctx.stepTitle.trim());
  if (ctx?.courseName?.trim()) parts.push(ctx.courseName.trim());
  if (ctx?.stepType?.trim()) parts.push(ctx.stepType.trim());
  return parts.filter(Boolean).join(' ');
}

/** One-line context block injected into the Agent reply stream metadata. */
export function formatAgentWorkspaceContextLine(
  ctx: AgentWorkspaceContext | null | undefined,
  lang: 'en' | 'el' = 'en',
): string | undefined {
  if (!ctx) return undefined;
  const step = ctx.stepTitle?.trim();
  const course = ctx.courseName?.trim();
  const concept = ctx.concept?.trim();
  if (!step && !course && !concept) return undefined;
  if (lang === 'el') {
    const bits = [
      course && `μάθημα «${course}»`,
      step && `ενότητα «${step}»`,
      concept && `έννοια ${concept}`,
      ctx.stepIndex != null && `βήμα ${ctx.stepIndex + 1}`,
    ].filter(Boolean);
    return bits.length ? `Context χώρου μελέτης: ${bits.join(' · ')}.` : undefined;
  }
  const bits = [
    course && `course "${course}"`,
    step && `section "${step}"`,
    concept && `concept ${concept}`,
    ctx.stepIndex != null && `step ${ctx.stepIndex + 1}`,
  ].filter(Boolean);
  return bits.length ? `Study workspace context: ${bits.join(' · ')}.` : undefined;
}

export function buildAgentWorkspaceContext(opts: {
  courseId?: string;
  courseName?: string;
  stepIndex: number;
  stepCount: number;
  stepTitle?: string;
  stepType?: string;
  concept: string;
  activeTool: WorkspaceToolId;
  lang: 'en' | 'el';
  sourceQuality?: number | null;
  oldPipeline?: boolean;
  pipelineVersion?: string;
}): AgentWorkspaceContext {
  const rawTitle = opts.stepTitle?.trim() || opts.concept;
  return {
    courseId: opts.courseId,
    courseName: opts.courseName,
    stepIndex: opts.stepIndex,
    stepCount: opts.stepCount,
    stepTitle: displayWorkspaceStepTitle(rawTitle, opts.concept, opts.lang),
    stepType: opts.stepType,
    concept: opts.concept,
    activeTool: opts.activeTool,
    activeToolLabel: workspaceToolLabel(opts.activeTool, opts.lang),
    sourceQuality: opts.sourceQuality ?? null,
    oldPipeline: opts.oldPipeline,
    pipelineVersion: opts.pipelineVersion ?? CONTENT_PIPELINE_VERSION,
    lowConfidenceSection: isLowConfidenceStepTitle(rawTitle, opts.concept),
  };
}

export type AgentContextBannerView = {
  heading: string;
  line: string;
  caution?: string;
  groundingNote?: string;
};

/** Structured banner for the Agent panel UI. */
export function buildAgentContextBanner(
  ctx: AgentWorkspaceContext | null | undefined,
  lang: 'en' | 'el',
): AgentContextBannerView | null {
  if (!ctx) return null;
  const isEl = lang === 'el';
  const section = ctx.stepTitle?.trim();
  const tool = ctx.activeToolLabel?.trim();
  if (!section && !tool && ctx.stepIndex == null) return null;

  const stepPart = ctx.stepIndex != null && ctx.stepCount
    ? (isEl ? `Βήμα ${ctx.stepIndex + 1}/${ctx.stepCount}` : `Step ${ctx.stepIndex + 1}/${ctx.stepCount}`)
    : null;

  const bits = [
    section,
    stepPart,
    tool,
    typeof ctx.sourceQuality === 'number' ? (isEl ? `Ποιότητα ${ctx.sourceQuality}/100` : `Quality ${ctx.sourceQuality}/100`) : null,
    ctx.oldPipeline
      ? (isEl ? `Παλαιό pipeline (v${ctx.pipelineVersion ?? '?'})` : `Old pipeline (v${ctx.pipelineVersion ?? '?'})`)
      : null,
  ].filter(Boolean);

  let caution: string | undefined;
  if (ctx.oldPipeline || (typeof ctx.sourceQuality === 'number' && ctx.sourceQuality < 50)) {
    caution = isEl
      ? 'Οι απαντήσεις μπορεί να επηρεάζονται από χαμηλή ποιότητα εξαγωγής — προτίμησε επανεπεξεργασία.'
      : 'Answers may be affected by low extraction quality — consider reprocessing first.';
  } else if (ctx.lowConfidenceSection) {
    caution = isEl
      ? 'Ο τίτλος ενότητας φαίνεται αναξιόπιστος — επιβεβαίωσε στο Reader.'
      : 'Section title looks unreliable — verify in the Reader.';
  }

  const groundingNote = isEl
    ? 'Λειτουργία: απάντηση από πηγή όπου είναι δυνατόν, με AI συμπλήρωση όταν λείπει υλικό.'
    : 'Mode: source-grounded answers where possible, AI enrichment when material is missing.';

  return {
    heading: isEl ? 'Context:' : 'Context:',
    line: bits.join(' · '),
    caution,
    groundingNote,
  };
}
