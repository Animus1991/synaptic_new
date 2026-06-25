/**
 * Workspace concept lens — enriches the active concept with graph metadata,
 * source sections, bus activity, and weak-area context for the Concept module UI.
 */

import type { GlossaryEntry, Topic } from '../types';
import type { ConceptMapEdge, ConceptMapNode } from './noteContentExtractors';
import { conceptRelevanceScore } from './noteContentExtractors';
import type { WorkspaceStepRef } from './readerStepSync';
import type { WorkspaceToolId } from './taskFlows';
import type { WeakSpotRef } from './workspaceWeakAreas';
import { resolveWorkspaceStepForConcept } from './workspaceWeakAreas';
import { normalizeFocusTerm } from './workspaceFocus';
import {
  activityFor,
  conceptEngagement,
  isConfident,
  isStruggling,
  type ConceptActivity,
  type ConceptBusState,
} from './workspaceConceptBus';

export type ConceptRef = {
  label: string;
  id?: string;
  mastery?: number;
  relation: 'prerequisite' | 'related' | 'contrasts' | 'follow-up';
};

export type ConceptToolHit = {
  tool: WorkspaceToolId;
  count: number;
};

export type ConceptLensAction =
  | 'explain'
  | 'quiz'
  | 'flashcards'
  | 'compare'
  | 'debate'
  | 'feynman'
  | 'mark-confusing'
  | 'mark-mastered'
  | 'open-reader';

export type ConceptLensView = {
  activeConcept: string;
  definition?: string;
  note?: string;
  mastery: number;
  engagement: number;
  struggling: boolean;
  confident: boolean;
  sourceSections: string[];
  readerStepIndex: number | null;
  prerequisites: ConceptRef[];
  related: ConceptRef[];
  followUp: ConceptRef[];
  contrasted: ConceptRef[];
  weakConcepts: ConceptRef[];
  toolHits: ConceptToolHit[];
  suggestedActions: ConceptLensAction[];
  hasGraph: boolean;
  emptyReason?: 'no-source' | 'weak-extraction' | 'missing-concept';
};

const RELEVANCE_THRESHOLD = 0.4;

function findNodeForConcept(nodes: ConceptMapNode[], concept: string): ConceptMapNode | undefined {
  let best: ConceptMapNode | undefined;
  let bestScore = 0;
  for (const node of nodes) {
    const score = conceptRelevanceScore(node.label, concept);
    if (score > bestScore) {
      bestScore = score;
      best = node;
    }
  }
  return bestScore >= RELEVANCE_THRESHOLD ? best : undefined;
}

function nodeById(nodes: ConceptMapNode[], id: string): ConceptMapNode | undefined {
  return nodes.find((n) => n.id === id);
}

function refsFromEdges(
  nodes: ConceptMapNode[],
  edges: ConceptMapEdge[],
  activeId: string,
  relation: ConceptMapEdge['relation'],
  direction: 'in' | 'out',
  limit = 4,
): ConceptRef[] {
  const out: ConceptRef[] = [];
  const seen = new Set<string>();
  for (const edge of edges) {
    if (edge.relation !== relation) continue;
    const match = direction === 'in'
      ? edge.to === activeId
      : edge.from === activeId;
    if (!match) continue;
    const peerId = direction === 'in' ? edge.from : edge.to;
    const peer = nodeById(nodes, peerId);
    if (!peer || seen.has(peer.id)) continue;
    seen.add(peer.id);
    out.push({
      label: peer.label,
      id: peer.id,
      mastery: peer.mastery,
      relation,
    });
    if (out.length >= limit) break;
  }
  return out;
}

function glossaryDefinition(glossary: GlossaryEntry[], concept: string): string | undefined {
  let best: GlossaryEntry | undefined;
  let bestScore = 0;
  for (const entry of glossary) {
    const score = conceptRelevanceScore(entry.term, concept);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return bestScore >= 0.45 ? best?.definition : undefined;
}

function topicSections(topics: Topic[], concept: string): string[] {
  const sections: string[] = [];
  for (const topic of topics) {
    if (conceptRelevanceScore(topic.title, concept) >= RELEVANCE_THRESHOLD) {
      sections.push(topic.title);
    }
  }
  return sections.slice(0, 4);
}

function resolveMastery(
  concept: string,
  conceptBars: { concept: string; mastery: number }[],
  node?: ConceptMapNode,
): number {
  const bar = conceptBars.find((b) => conceptRelevanceScore(b.concept, concept) > 0.45);
  if (bar) return bar.mastery;
  return node?.mastery ?? 0;
}

function buildToolHits(activity?: ConceptActivity): ConceptToolHit[] {
  if (!activity?.toolHitCounts) return [];
  return Object.entries(activity.toolHitCounts)
    .filter(([, count]) => count > 0)
    .map(([tool, count]) => ({ tool: tool as WorkspaceToolId, count }))
    .sort((a, b) => b.count - a.count);
}

function suggestedActionsFor(
  activity: ConceptActivity | undefined,
  struggling: boolean,
  confident: boolean,
): ConceptLensAction[] {
  const hits = new Set((activity?.tools ?? []));
  const actions: ConceptLensAction[] = ['open-reader'];
  if (!hits.has('feynman')) actions.push('explain');
  if (!hits.has('quiz')) actions.push('quiz');
  if (!hits.has('leitner')) actions.push('flashcards');
  if (!hits.has('compare')) actions.push('compare');
  if (!hits.has('debate')) actions.push('debate');
  if (!hits.has('feynman')) actions.push('feynman');
  if (struggling) actions.push('mark-confusing');
  if (confident) actions.push('mark-mastered');
  return [...new Set(actions)].slice(0, 8);
}

export function filterConceptNodes(nodes: ConceptMapNode[], query: string): ConceptMapNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;
  return nodes.filter((n) =>
    n.label.toLowerCase().includes(q)
    || (n.note?.toLowerCase().includes(q) ?? false),
  );
}

export function buildConceptLensView(input: {
  concept: string;
  hasSource: boolean;
  nodes: ConceptMapNode[];
  edges: ConceptMapEdge[];
  glossary: GlossaryEntry[];
  topics: Topic[];
  steps: WorkspaceStepRef[];
  conceptBars: { concept: string; mastery: number }[];
  busState: ConceptBusState;
  weakSpots: WeakSpotRef[];
  sourceText?: string;
}): ConceptLensView {
  const label = input.concept.trim();
  const activity = label ? activityFor(input.busState, label) : undefined;
  const activeNode = findNodeForConcept(input.nodes, label);
  const struggling = activity ? isStruggling(activity) : false;
  const confident = activity ? isConfident(activity) : false;
  const engagement = activity ? conceptEngagement(activity) : 0;
  const mastery = resolveMastery(label, input.conceptBars, activeNode);

  if (!input.hasSource) {
    return {
      activeConcept: label,
      mastery,
      engagement,
      struggling,
      confident,
      sourceSections: [],
      readerStepIndex: null,
      prerequisites: [],
      related: [],
      followUp: [],
      contrasted: [],
      weakConcepts: [],
      toolHits: buildToolHits(activity),
      suggestedActions: ['open-reader'],
      hasGraph: false,
      emptyReason: 'no-source',
    };
  }

  if (!label) {
    return {
      activeConcept: '',
      mastery: 0,
      engagement: 0,
      struggling: false,
      confident: false,
      sourceSections: [],
      readerStepIndex: null,
      prerequisites: [],
      related: [],
      followUp: [],
      contrasted: [],
      weakConcepts: [],
      toolHits: [],
      suggestedActions: [],
      hasGraph: false,
      emptyReason: 'missing-concept',
    };
  }

  const activeId = activeNode?.id ?? '';
  const prerequisites = activeId
    ? refsFromEdges(input.nodes, input.edges, activeId, 'prerequisite', 'in')
    : [];
  const followUp = activeId
    ? refsFromEdges(input.nodes, input.edges, activeId, 'prerequisite', 'out')
    : [];
  const related = activeId
    ? refsFromEdges(input.nodes, input.edges, activeId, 'related', 'out')
      .concat(refsFromEdges(input.nodes, input.edges, activeId, 'related', 'in'))
      .filter((r, i, arr) => arr.findIndex((x) => x.label === r.label) === i)
      .slice(0, 4)
    : [];
  const contrasted = activeId
    ? refsFromEdges(input.nodes, input.edges, activeId, 'contrasts', 'out')
      .concat(refsFromEdges(input.nodes, input.edges, activeId, 'contrasts', 'in'))
      .slice(0, 3)
    : [];

  const topicSectionTitles = topicSections(input.topics, label);
  const readerStepIndex = resolveWorkspaceStepForConcept(label, input.steps, input.sourceText);
  const stepTitle = readerStepIndex != null ? input.steps[readerStepIndex]?.title : undefined;
  const sourceSections = [
    ...(stepTitle && !topicSectionTitles.includes(stepTitle) ? [stepTitle] : []),
    ...topicSectionTitles,
  ].slice(0, 4);

  const activeKey = normalizeFocusTerm(label);
  const weakConcepts = input.weakSpots
    .filter((s) => normalizeFocusTerm(s.concept) !== activeKey)
    .slice(0, 4)
    .map((s) => ({
      label: s.concept,
      mastery: s.mastery,
      relation: 'related' as const,
    }));

  const hasGraph = input.nodes.length > 0;
  const emptyReason = !hasGraph && input.hasSource ? 'weak-extraction' : undefined;

  return {
    activeConcept: label,
    definition: glossaryDefinition(input.glossary, label),
    note: activeNode?.note,
    mastery,
    engagement,
    struggling,
    confident,
    sourceSections,
    readerStepIndex,
    prerequisites,
    related,
    followUp,
    contrasted,
    weakConcepts,
    toolHits: buildToolHits(activity),
    suggestedActions: suggestedActionsFor(activity, struggling, confident),
    hasGraph,
    emptyReason,
  };
}
