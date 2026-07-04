import { t } from './i18n';
import type { WorkspaceToolId } from './taskFlows';
import { CONTENT_PIPELINE_VERSION } from './pipelineConstants';
import { displayWorkspaceStepTitle, isLowConfidenceStepTitle } from './workspaceContextModel';
import { workspaceToolLabel } from './workspaceToolRegistry';
import { selectionExcerptPreview } from './workspaceSelectionActions';
import { formatGraphRelationSystemBlock } from './courseConceptGraph';

import type { GraphRelationContext } from './courseConceptGraph';

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
  /** True when handwriting OCR (TrOCR) contributed to the source text. */
  handwrittenSource?: boolean;
  /** Passage the learner selected before opening Agent (selection handoff). */
  selectionExcerpt?: string;
  /** Sprint I — typed knowledge-graph relation for explain-relation prompts. */
  graphRelation?: GraphRelationContext;
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
  if (ctx?.selectionExcerpt?.trim()) parts.push(ctx.selectionExcerpt.trim().slice(0, 240));
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
  const bits = [
    course && t('agentCtxBitCourse', lang).replace('{name}', course),
    step && t('agentCtxBitSection', lang).replace('{name}', step),
    concept && t('agentCtxBitConcept', lang).replace('{name}', concept),
    ctx.stepIndex != null && t('agentCtxBitStep', lang).replace('{n}', String(ctx.stepIndex + 1)),
  ].filter(Boolean) as string[];
  return bits.length ? t('agentCtxLine', lang).replace('{bits}', bits.join(' · ')) : undefined;
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
  handwrittenSource?: boolean;
  selectionExcerpt?: string;
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
    handwrittenSource: opts.handwrittenSource,
    selectionExcerpt: opts.selectionExcerpt?.trim() || undefined,
  };
}

/** Stable JSON payload attached on every workspace → Agent handoff (SW-P2-05). */
export type AgentWorkspaceContextJson = {
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
  handwrittenSource?: boolean;
  selectionExcerpt?: string;
  graphRelation?: import('./courseConceptGraph').GraphRelationContext;
};

export type AgentContextBannerView = {
  heading: string;
  line: string;
  caution?: string;
  groundingNote?: string;
  contextJson?: AgentWorkspaceContextJson;
};

/** Strip undefined fields for a compact, stable JSON handoff object. */
export function toAgentWorkspaceContextJson(
  ctx: AgentWorkspaceContext | null | undefined,
): AgentWorkspaceContextJson | null {
  if (!ctx) return null;
  const out: AgentWorkspaceContextJson = {};
  if (ctx.courseId) out.courseId = ctx.courseId;
  if (ctx.courseName) out.courseName = ctx.courseName;
  if (ctx.stepIndex != null) out.stepIndex = ctx.stepIndex;
  if (ctx.stepCount != null) out.stepCount = ctx.stepCount;
  if (ctx.stepTitle) out.stepTitle = ctx.stepTitle;
  if (ctx.stepType) out.stepType = ctx.stepType;
  if (ctx.concept) out.concept = ctx.concept;
  if (ctx.activeTool) out.activeTool = ctx.activeTool;
  if (ctx.activeToolLabel) out.activeToolLabel = ctx.activeToolLabel;
  if (typeof ctx.sourceQuality === 'number') out.sourceQuality = ctx.sourceQuality;
  if (ctx.oldPipeline != null) out.oldPipeline = ctx.oldPipeline;
  if (ctx.pipelineVersion) out.pipelineVersion = ctx.pipelineVersion;
  if (ctx.lowConfidenceSection != null) out.lowConfidenceSection = ctx.lowConfidenceSection;
  if (ctx.handwrittenSource != null) out.handwrittenSource = ctx.handwrittenSource;
  if (ctx.selectionExcerpt) out.selectionExcerpt = ctx.selectionExcerpt;
  if (ctx.graphRelation) out.graphRelation = ctx.graphRelation;
  return Object.keys(out).length > 0 ? out : null;
}

export function serializeAgentWorkspaceContextJson(
  ctx: AgentWorkspaceContext | null | undefined,
): string | null {
  const payload = toAgentWorkspaceContextJson(ctx);
  return payload ? JSON.stringify(payload, null, 2) : null;
}

/** Human line + structured JSON block for Agent system grounding. */
export function buildAgentContextSystemBlock(
  ctx: AgentWorkspaceContext | null | undefined,
  lang: 'en' | 'el' = 'en',
): string | undefined {
  const line = formatAgentWorkspaceContextLine(ctx, lang);
  const json = serializeAgentWorkspaceContextJson(ctx);
  const relationBlock = ctx?.graphRelation
    ? formatGraphRelationSystemBlock(ctx.graphRelation, lang)
    : '';
  if (!line && !json && !relationBlock) return undefined;
  const jsonBlock = json
    ? t('agentCtxJsonBlock', lang).replace('{json}', json)
    : '';
  return `${line ?? ''}${relationBlock ? `\n\n${relationBlock}` : ''}${jsonBlock}`.trim() || undefined;
}

/** Structured banner for the Agent panel UI. */
export function buildAgentContextBanner(
  ctx: AgentWorkspaceContext | null | undefined,
  lang: 'en' | 'el',
): AgentContextBannerView | null {
  if (!ctx) return null;
    const section = ctx.stepTitle?.trim();
  const tool = ctx.activeToolLabel?.trim();
  if (!section && !tool && ctx.stepIndex == null) return null;

  const stepPart = ctx.stepIndex != null && ctx.stepCount
    ? t('agentStepProgress', lang).replace('{current}', String(ctx.stepIndex + 1)).replace('{total}', String(ctx.stepCount))
    : null;

  const bits = [
    section,
    stepPart,
    tool,
    typeof ctx.sourceQuality === 'number' ? t('agentQualityScore', lang).replace('{score}', String(ctx.sourceQuality)) : null,
    ctx.oldPipeline
      ? t('agentOldPipeline', lang).replace('{version}', String(ctx.pipelineVersion ?? '?'))
      : null,
    ctx.handwrittenSource ? t('agentHandwrittenSource', lang) : null,
    ctx.selectionExcerpt
      ? t('agentCtxBitSelection', lang).replace('{excerpt}', selectionExcerptPreview(ctx.selectionExcerpt))
      : null,
  ].filter(Boolean);

  let caution: string | undefined;
  if (ctx.oldPipeline || (typeof ctx.sourceQuality === 'number' && ctx.sourceQuality < 50)) {
    caution = t('agentCautionLowQuality', lang);
  } else if (ctx.handwrittenSource) {
    caution = t('agentCautionHandwritten', lang);
  } else if (ctx.lowConfidenceSection) {
    caution = t('agentCautionUnreliableSection', lang);
  }

  const groundingNote = t('agentGroundingNote', lang);

  return {
    heading: t('agentContextHeading', lang),
    line: bits.join(' · '),
    caution,
    groundingNote,
    contextJson: toAgentWorkspaceContextJson(ctx) ?? undefined,
  };
}
