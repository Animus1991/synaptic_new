/**
 * Outline synthesis v2.
 *
 * Takes a base outline (from LLM or offline analysis) and improves it by:
 *   1. Building a typed concept graph from the topic concepts.
 *   2. Reordering topics so prerequisites (DAG sources) come first.
 *   3. Re-estimating difficulty from the concept graph tier.
 *   4. Enriching prerequisite edges with concept-graph evidence.
 *
 * The result still conforms to `GeneratedOutline`, so it drops into the same
 * `buildCourseFromOutline` path without any UI changes.
 */

import type { UserSettings } from '../types';
import type { GeneratedOutline, GeneratedTopic } from './courseGenerator';
import { buildConceptGraph, conceptsByTier, getPrerequisites, type ConceptGraph } from './conceptGraph';
import type { LocalEmbedder } from './localEmbedder';
import { normalizeConcept } from './contentAnalysis';

export interface SynthesisOptions {
  settings?: UserSettings;
  /** Optional offline embedder for concept extraction reranking. */
  localEmbedder?: LocalEmbedder;
  /** Cap the number of topics in the synthesized outline. */
  maxTopics?: number;
}

/** Compute a topic's primary concept keys. */
function topicConceptKeys(topic: GeneratedTopic): string[] {
  return topic.concepts
    .map((c) => normalizeConcept(c))
    .filter((k) => k.length > 1);
}

/** Average DAG tier of the concepts that belong to a topic. */
function averageTier(topic: GeneratedTopic, graph: ConceptGraph): number {
  const keys = topicConceptKeys(topic);
  let sum = 0;
  let count = 0;
  for (const key of keys) {
    const node = graph.nodes.find((n) => n.key === key);
    if (node) {
      sum += node.tier;
      count += 1;
    }
  }
  return count > 0 ? sum / count : 1;
}

/** Map a tier average to a difficulty label. */
function tierToDifficulty(tier: number): GeneratedTopic['difficulty'] {
  if (tier <= 1.4) return 'beginner';
  if (tier >= 2.6) return 'advanced';
  return 'intermediate';
}

/** Collect prerequisite topic titles for a topic based on graph edges. */
function inferTopicPrerequisites(topic: GeneratedTopic, allTopics: GeneratedTopic[], graph: ConceptGraph): string[] {
  const keys = topicConceptKeys(topic);
  const prereqKeys = new Set<string>();
  for (const key of keys) {
    for (const source of getPrerequisites(graph, key)) {
      prereqKeys.add(source);
    }
  }

  const prereqTitles: string[] = [];
  const seen = new Set<string>();
  for (const other of allTopics) {
    if (other.title === topic.title) continue;
    const otherKeys = topicConceptKeys(other);
    const matches = otherKeys.some((k) => prereqKeys.has(k));
    if (matches) {
      const key = normalizeConcept(other.title);
      if (!seen.has(key)) {
        seen.add(key);
        prereqTitles.push(other.title);
      }
    }
  }

  return prereqTitles.slice(0, 3);
}

/** Sort topics so prerequisites come first, then by tier, then by original order. */
function reorderTopics(topics: GeneratedTopic[], graph: ConceptGraph): GeneratedTopic[] {
  const tierMap = new Map(topics.map((t) => [normalizeConcept(t.title), averageTier(t, graph)]));
  const prereqsMap = new Map(topics.map((t) => [t.title, new Set(inferTopicPrerequisites(t, topics, graph))]));

  const edges: [number, number][] = [];
  for (let i = 0; i < topics.length; i++) {
    for (let j = 0; j < topics.length; j++) {
      if (i === j) continue;
      const deps = prereqsMap.get(topics[i]!.title) ?? new Set<string>();
      if (deps.has(topics[j]!.title)) {
        edges.push([j, i]); // j must come before i
      }
    }
  }

  const inDegree = new Map<number, number>();
  const adj = new Map<number, number[]>();
  for (let i = 0; i < topics.length; i++) {
    inDegree.set(i, 0);
    adj.set(i, []);
  }
  for (const [src, dst] of edges) {
    adj.get(src)!.push(dst);
    inDegree.set(dst, (inDegree.get(dst) ?? 0) + 1);
  }

  const queue: number[] = [];
  for (let i = 0; i < topics.length; i++) {
    if (inDegree.get(i) === 0) queue.push(i);
  }

  const order: number[] = [];
  while (queue.length > 0) {
    // Sort queue by tier ascending, then original index for stability.
    queue.sort((a, b) => {
      const ta = tierMap.get(normalizeConcept(topics[a]!.title)) ?? 1;
      const tb = tierMap.get(normalizeConcept(topics[b]!.title)) ?? 1;
      if (ta !== tb) return ta - tb;
      return a - b;
    });
    const idx = queue.shift()!;
    order.push(idx);
    for (const next of adj.get(idx) ?? []) {
      const deg = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }

  // If cycle exists, fall back to simple tier sort.
  if (order.length !== topics.length) {
    order.length = 0;
    const indexed = topics.map((t, i) => ({ t, i, tier: tierMap.get(normalizeConcept(t.title)) ?? 1 }));
    indexed.sort((a, b) => a.tier - b.tier || a.i - b.i);
    indexed.forEach(({ i }) => order.push(i));
  }

  return order.map((i) => topics[i]!);
}

/** Merge any topics that share a majority of their concepts. */
function deduplicateTopics(topics: GeneratedTopic[]): GeneratedTopic[] {
  const kept: GeneratedTopic[] = [];
  for (const topic of topics) {
    const key = normalizeConcept(topic.title);
    const duplicate = kept.find((k) => {
      const kk = normalizeConcept(k.title);
      return kk === key || kk === normalizeConcept(topic.concepts[0] ?? '');
    });
    if (duplicate) {
      const newConcepts = topic.concepts.filter((c) => !duplicate.concepts.includes(c));
      duplicate.concepts = [...duplicate.concepts, ...newConcepts].slice(0, 10);
      if (topic.description && topic.description !== duplicate.description) {
        duplicate.description = `${duplicate.description} ${topic.description}`.slice(0, 220);
      }
      duplicate.estimatedMinutes = Math.min(120, duplicate.estimatedMinutes + topic.estimatedMinutes / 2);
    } else {
      kept.push({ ...topic });
    }
  }
  return kept;
}

/**
 * Synthesize an improved outline from a base outline and source text.
 */
export async function synthesizeOutlineV2(
  text: string,
  baseOutline: GeneratedOutline,
  options: SynthesisOptions = {},
): Promise<GeneratedOutline> {
  const maxTopics = options.maxTopics ?? 12;
  const uniqueConcepts = [
    ...new Set(baseOutline.topics.flatMap((t) => t.concepts.map((c) => normalizeConcept(c)))),
  ].filter(Boolean);

  if (uniqueConcepts.length === 0) return baseOutline;

  const graph = await buildConceptGraph(text, {
    concepts: uniqueConcepts,
    embedder: options.localEmbedder,
    maxConcepts: uniqueConcepts.length,
    minEdgeWeight: 0.45,
  });

  let topics = deduplicateTopics(baseOutline.topics.slice(0, maxTopics).map((t) => ({ ...t })));
  topics = reorderTopics(topics, graph);

  const enriched = topics.map((topic) => {
    const tier = averageTier(topic, graph);
    const prerequisites = inferTopicPrerequisites(topic, topics, graph);
    const tierGroup = conceptsByTier(graph);
    const tierConcepts = tierGroup.get(Math.round(tier)) ?? [];
    const clusterLabel = tierConcepts.length > 0
      ? tierConcepts.sort((a, b) => b.salience - a.salience)[0]!.label
      : undefined;

    return {
      ...topic,
      difficulty: tierToDifficulty(tier),
      prerequisites: [...new Set([...topic.prerequisites, ...prerequisites])].slice(0, 4),
      description: clusterLabel && !topic.description.includes(clusterLabel)
        ? `${topic.description} (cluster: ${clusterLabel})`
        : topic.description,
    };
  });

  const difficulties = new Set(enriched.map((t) => t.difficulty));
  return {
    ...baseOutline,
    topics: enriched,
    difficulty: difficulties.size > 1 ? 'mixed' : [...difficulties][0] ?? baseOutline.difficulty,
  };
}
