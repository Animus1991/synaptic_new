import type { Course, UploadedFile } from '../types';
import { normalizeConcept } from './contentAnalysis';
import { buildConceptGraph, type ConceptEdge, type ConceptGraph } from './conceptGraph';

function conceptLabelsFromCourse(course: Course): Set<string> {
  const labels = new Set<string>();
  for (const topic of course.topics ?? []) {
    for (const c of topic.keyConcepts ?? [topic.title]) {
      labels.add(normalizeConcept(c));
    }
  }
  if (course.conceptGraph) {
    for (const node of course.conceptGraph.nodes) {
      labels.add(normalizeConcept(node.label));
    }
  }
  return labels;
}

/**
 * Build concept graph for a new course and add cross-document edges to prior library material.
 */
export async function enrichCourseWithCrossLinks(
  course: Course,
  newText: string,
  existingCourses: Course[],
  existingFiles: UploadedFile[],
): Promise<Course> {
  const concepts = [
    ...new Set(course.topics.flatMap((t) => (t.keyConcepts ?? [t.title]).map(normalizeConcept))),
  ].filter(Boolean);

  if (concepts.length === 0 || newText.trim().length < 40) return course;

  const graph = await buildConceptGraph(newText, {
    concepts,
    maxConcepts: Math.min(24, concepts.length),
    minEdgeWeight: 0.4,
  });

  const crossEdges: ConceptEdge[] = [];
  const linkedCourseIds = new Set<string>();

  for (const other of existingCourses) {
    if (other.id === course.id) continue;
    const otherLabels = conceptLabelsFromCourse(other);
    for (const node of graph.nodes) {
      const key = normalizeConcept(node.label);
      if (!otherLabels.has(key)) continue;
      linkedCourseIds.add(other.id);
      crossEdges.push({
        id: `cross-${course.id}-${other.id}-${node.id}`,
        source: node.id,
        target: `ext-${other.id}-${key}`,
        type: 'related',
        evidence: `Shared concept "${node.label}" with "${other.title}"`,
        weight: 0.78,
      });
    }
  }

  for (const file of existingFiles) {
    if (file.courseId === course.id) continue;
    const hay = file.extractedText?.slice(0, 8000).toLowerCase() ?? '';
    if (hay.length < 40) continue;
    for (const node of graph.nodes) {
      const label = node.label.toLowerCase();
      if (label.length < 4 || !hay.includes(label)) continue;
      crossEdges.push({
        id: `cross-file-${file.id}-${node.id}`,
        source: node.id,
        target: `file-${file.id}`,
        type: 'related',
        evidence: `Also referenced in ${file.name}`,
        weight: 0.62,
      });
    }
  }

  const seen = new Set(graph.edges.map((e) => e.id));
  const mergedGraph: ConceptGraph = {
    ...graph,
    edges: [...graph.edges, ...crossEdges.filter((e) => !seen.has(e.id))],
  };

  return {
    ...course,
    conceptGraph: mergedGraph,
    linkedCourseIds: linkedCourseIds.size > 0 ? [...linkedCourseIds] : course.linkedCourseIds,
  };
}
