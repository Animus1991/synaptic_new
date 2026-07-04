/**
 * Sprint I — typed knowledge graph persisted on Course + Agent relation explanations.
 */

import { normalizeConcept } from './contentAnalysis';
import type { ConceptGraph, ConceptNode, RelationType } from './conceptGraph';
import { buildConceptGraph } from './conceptGraph';
import type { ConceptMapEdge, ConceptMapNode } from './noteContentExtractors';
import { conceptRelevanceScore } from './noteContentExtractors';
import type { Course, Topic } from '../types';
import type { Lang } from './i18n';
import { t } from './i18n';

export type CourseGraphVisualNode = {
  id: string;
  label: string;
  mastery: number;
  type: 'concept' | 'formula' | 'definition' | 'theory';
  x: number;
  y: number;
};

export type CourseGraphVisualEdge = {
  from: string;
  to: string;
  relation: 'prerequisite' | 'related' | 'contrasts' | 'example-of';
};

export type GraphRelationContext = {
  sourceLabel: string;
  targetLabel: string;
  relationType: RelationType;
  evidence?: string;
  weight: number;
};

const RELATION_TO_MAP: Record<RelationType, ConceptMapEdge['relation'] | null> = {
  prerequisite: 'prerequisite',
  related: 'related',
  contradicts: 'contrasts',
  part_of: 'prerequisite',
  example_of: 'related',
  unknown: 'related',
};

const RELATION_TO_VISUAL: Record<RelationType, CourseGraphVisualEdge['relation']> = {
  prerequisite: 'prerequisite',
  related: 'related',
  contradicts: 'contrasts',
  part_of: 'prerequisite',
  example_of: 'example-of',
  unknown: 'related',
};

function nodeKey(label: string): string {
  return normalizeConcept(label);
}

function resolveGraphLabelNode(graph: ConceptGraph, label: string): ConceptNode | undefined {
  const direct = findGraphNode(graph, label);
  if (direct) return direct;
  const lower = label.toLowerCase();
  let best: ConceptNode | undefined;
  let bestScore = 0;
  for (const node of graph.nodes) {
    const nodeLower = node.label.toLowerCase();
    const score = Math.max(
      conceptRelevanceScore(node.label, label),
      lower.includes(nodeLower) || nodeLower.includes(lower) ? 0.55 : 0,
    );
    if (score > bestScore) {
      bestScore = score;
      best = node;
    }
  }
  return bestScore >= 0.35 ? best : undefined;
}

function findGraphNode(graph: ConceptGraph, label: string): ConceptNode | undefined {
  const key = nodeKey(label);
  let best: ConceptNode | undefined;
  let bestScore = 0;
  for (const node of graph.nodes) {
    const score = conceptRelevanceScore(node.label, label);
    if (score > bestScore) {
      bestScore = score;
      best = node;
    }
  }
  return bestScore >= 0.4 ? best : graph.nodes.find((n) => n.key === key);
}

/** Mine and attach a typed concept graph during course recognition. */
export async function attachConceptGraphToCourse(
  course: Course,
  sourceText: string,
  conceptLabels?: string[],
): Promise<Course> {
  const labels = conceptLabels?.length
    ? conceptLabels
    : [
      ...new Set(
        course.topics.flatMap((topic) => [
          topic.title,
          ...(topic.keyConcepts ?? []),
        ]),
      ),
    ].filter(Boolean);

  if (!sourceText.trim() || labels.length === 0) return course;

  const graph = await buildConceptGraph(sourceText, {
    concepts: labels.map((l) => l.trim()).filter(Boolean),
    maxConcepts: Math.min(40, labels.length + 4),
    minEdgeWeight: 0.45,
  });

  if (graph.nodes.length === 0) return course;
  return { ...course, conceptGraph: graph };
}

function graphRelationFromEdge(
  graph: ConceptGraph,
  edge: ConceptGraph['edges'][number],
  activeKey: string,
  relatedKey: string,
): GraphRelationContext {
  const active = graph.nodes.find((n) => n.key === activeKey)!;
  const related = graph.nodes.find((n) => n.key === relatedKey)!;
  const forward = edge.source === activeKey && edge.target === relatedKey;
  return {
    sourceLabel: forward ? active.label : related.label,
    targetLabel: forward ? related.label : active.label,
    relationType: edge.type,
    evidence: edge.evidence,
    weight: edge.weight,
  };
}

/** Find the strongest typed edge between two concept labels. */
export function findGraphRelation(
  graph: ConceptGraph | undefined,
  activeLabel: string,
  relatedLabel: string,
): GraphRelationContext | null {
  if (!graph || !activeLabel.trim() || !relatedLabel.trim()) return null;
  const active = findGraphNode(graph, activeLabel);
  const related = resolveGraphLabelNode(graph, relatedLabel);
  if (!related) return null;
  if (active && active.key === related.key) return null;

  if (active) {
    const direct = graph.edges.filter(
      (e) =>
        (e.source === active.key && e.target === related.key)
        || (e.source === related.key && e.target === active.key),
    );
    if (direct.length > 0) {
      const best = [...direct].sort((a, b) => b.weight - a.weight)[0]!;
      return graphRelationFromEdge(graph, best, active.key, related.key);
    }
  }

  // Active label is outside the graph (course umbrella, step title, etc.) — use the
  // strongest typed edge touching the related concept the learner clicked.
  const touching = graph.edges.filter(
    (e) => e.source === related.key || e.target === related.key,
  );
  if (touching.length === 0) return null;
  const best = [...touching].sort((a, b) => b.weight - a.weight)[0]!;
  const otherKey = best.source === related.key ? best.target : best.source;
  return graphRelationFromEdge(graph, best, otherKey, related.key);
}

export function relationTypeLabel(type: RelationType, lang: Lang): string {
  switch (type) {
    case 'prerequisite': return t('graphRelationPrerequisite', lang);
    case 'related': return t('graphRelationRelated', lang);
    case 'part_of': return t('graphRelationPartOf', lang);
    case 'example_of': return t('graphRelationExampleOf', lang);
    case 'contradicts': return t('graphRelationContradicts', lang);
    default: return t('graphRelationUnknown', lang);
  }
}

/** Grounded Agent prompt for "how does X relate to Y?" */
export function buildRelationExplainPrompt(
  ctx: GraphRelationContext,
  lang: Lang,
): string {
  const relation = relationTypeLabel(ctx.relationType, lang);
  const evidence = ctx.evidence?.trim();
  return [
    t('agentRelationExplainIntro', lang)
      .replace('{source}', ctx.sourceLabel)
      .replace('{target}', ctx.targetLabel),
    t('agentRelationExplainTypeLine', lang).replace('{relation}', relation),
    evidence
      ? t('agentRelationExplainEvidenceLine', lang).replace('{evidence}', evidence)
      : '',
    t('agentRelationExplainGrounding', lang),
  ].filter(Boolean).join('\n');
}

/** Merge persisted course graph edges into workspace concept-map data for the lens. */
export function mergeCourseGraphIntoConceptMap(
  nodes: ConceptMapNode[],
  edges: ConceptMapEdge[],
  graph: ConceptGraph | undefined,
): { nodes: ConceptMapNode[]; edges: ConceptMapEdge[] } {
  if (!graph || graph.nodes.length === 0) return { nodes, edges };

  const nodeByKey = new Map<string, ConceptMapNode>();
  for (const node of nodes) {
    nodeByKey.set(nodeKey(node.label), node);
  }

  const mergedNodes = [...nodes];
  graph.nodes.forEach((gn, i) => {
    if (nodeByKey.has(gn.key)) return;
    const col = i % 4;
    const row = Math.floor(i / 4);
    const added: ConceptMapNode = {
      id: gn.id,
      label: gn.label,
      mastery: Math.round(gn.salience * 100),
      type: 'concept',
      x: 80 + col * 160,
      y: 60 + row * 110,
    };
    nodeByKey.set(gn.key, added);
    mergedNodes.push(added);
  });

  const keyToId = new Map<string, string>();
  for (const node of mergedNodes) {
    keyToId.set(nodeKey(node.label), node.id);
  }
  for (const gn of graph.nodes) {
    keyToId.set(gn.key, keyToId.get(gn.key) ?? gn.id);
  }

  const seen = new Set(edges.map((e) => `${e.from}|${e.relation}|${e.to}`));
  const mergedEdges = [...edges];
  for (const ge of graph.edges) {
    const fromId = keyToId.get(ge.source);
    const toId = keyToId.get(ge.target);
    const mapRelation = RELATION_TO_MAP[ge.type];
    if (!fromId || !toId || !mapRelation) continue;
    const sig = `${fromId}|${mapRelation}|${toId}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    mergedEdges.push({ from: fromId, to: toId, relation: mapRelation });
  }

  return { nodes: mergedNodes, edges: mergedEdges };
}

/** Layout course graph for CourseView ConceptGraph visual. */
export function conceptGraphToCourseVisual(
  course: Course,
  topics: Topic[] = course.topics,
): { nodes: CourseGraphVisualNode[]; edges: CourseGraphVisualEdge[] } {
  const graph = course.conceptGraph;
  if (!graph || graph.nodes.length === 0) {
    const fallbackTopics = topics.filter((t) => !t.isLocked);
    return {
      nodes: fallbackTopics.map((t, i) => ({
        id: t.id,
        label: t.title,
        mastery: t.mastery,
        type: 'concept' as const,
        x: 100 + (i % 3) * 200,
        y: 80 + Math.floor(i / 3) * 140,
      })),
      edges: fallbackTopics.flatMap((t) =>
        t.prerequisites
          .map((p) => ({ from: p, to: t.id, relation: 'prerequisite' as const }))
          .filter((e) => fallbackTopics.some((n) => n.id === e.from)),
      ),
    };
  }

  const topicMastery = new Map(topics.map((t) => [nodeKey(t.title), t.mastery]));
  const nodes: CourseGraphVisualNode[] = graph.nodes.map((gn, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    return {
      id: gn.id,
      label: gn.label,
      mastery: topicMastery.get(gn.key) ?? Math.round(gn.salience * 100),
      type: 'concept',
      x: 70 + col * 155,
      y: 60 + row * 105,
    };
  });

  const idByKey = new Map(graph.nodes.map((n) => [n.key, n.id]));
  const edges: CourseGraphVisualEdge[] = [];
  for (const ge of graph.edges) {
    const from = idByKey.get(ge.source);
    const to = idByKey.get(ge.target);
    if (!from || !to) continue;
    edges.push({
      from,
      to,
      relation: RELATION_TO_VISUAL[ge.type] ?? 'related',
    });
  }

  return { nodes, edges };
}

export function summarizeCourseGraph(graph: ConceptGraph | undefined): {
  nodeCount: number;
  edgeCount: number;
  valid: boolean;
  orderedConcepts: string[];
} {
  if (!graph) {
    return { nodeCount: 0, edgeCount: 0, valid: false, orderedConcepts: [] };
  }
  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    valid: graph.valid,
    orderedConcepts: graph.order.map((key) => graph.nodes.find((n) => n.key === key)?.label ?? key),
  };
}

export function formatGraphRelationSystemBlock(ctx: GraphRelationContext, lang: Lang): string {
  const relation = relationTypeLabel(ctx.relationType, lang);
  const evidence = ctx.evidence
    ? t('agentGraphRelationEvidence', lang).replace('{evidence}', ctx.evidence)
    : '';
  return t('agentGraphRelationBlock', lang)
    .replace('{source}', ctx.sourceLabel)
    .replace('{target}', ctx.targetLabel)
    .replace('{relation}', relation)
    .replace('{evidence}', evidence ? ` ${evidence}` : '');
}
