/**
 * Evaluation harness for the Synapse recognition pipeline.
 *
 * This is a lightweight, deterministic scaffold for Phase 0. It measures
 * recall/precision of extracted concepts, definitions, formulas, and course
 * quality against hand-annotated gold fixtures. Add more fixtures and metrics
 * as the pipeline deepens.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  analyzeContentToOutline,
  detectSections,
  extractAcronyms,
  extractDefinitions,
  rankKeyphrases,
} from '../lib/contentAnalysis';
import { extractFormulas } from '../lib/noteContentExtractors';
import { analyzeCourseSourceQuality } from '../lib/courseSourceQuality';
import { buildDocumentModelFromText } from '../lib/documentModel';
import {
  verifyAgentFaithfulness,
  verifyLessonPanelsFaithfulness,
} from '../lib/grounding';
import type { WorkspacePanel } from '../lib/workspaceLessonPanels';
import type { MessageCitation } from '../types';
import type { GeneratedOutline } from '../lib/courseGenerator';
import baseline from './baseline.json';
import { EVAL_GROUNDING_FAITHFULNESS_MIN } from '../lib/qualityThresholds';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface GoldAnnotation {
  expectedConcepts: string[];
  expectedDefinitions: string[];
  expectedFormulas: string[];
  expectedTopicCount?: number;
  expectedSubject?: string;
}

export interface EvalResult {
  fixture: string;
  conceptRecall: number;
  conceptPrecision: number;
  definitionRecall: number;
  formulaRecall: number;
  sourceQualityBand: 'strong' | 'moderate' | 'weak';
  topicCount: number;
  detectedSubject: string;
  errors: string[];
}

function loadFixture(name: string): { text: string; gold: GoldAnnotation } {
  const text = readFileSync(join(__dirname, 'fixtures', name), 'utf8');
  const gold = JSON.parse(readFileSync(join(__dirname, 'fixtures', `${name}.gold.json`), 'utf8'));
  return { text, gold };
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\u0370-\u03ff]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function overlap(a: string, b: string): boolean {
  const A = normalize(a);
  const B = normalize(b);
  if (A.length === 0 || B.length === 0) return false;
  return A.includes(B) || B.includes(A) || A.split(' ').some((w) => w.length >= 4 && B.includes(w));
}

function computeRecall(gold: string[], found: string[]): number {
  if (gold.length === 0) return 1;
  let hits = 0;
  for (const g of gold) {
    if (found.some((f) => overlap(g, f))) hits++;
  }
  return hits / gold.length;
}

function computePrecision(gold: string[], found: string[]): number {
  if (found.length === 0) return gold.length === 0 ? 1 : 0;
  let hits = 0;
  for (const f of found) {
    if (gold.some((g) => overlap(g, f))) hits++;
  }
  return hits / found.length;
}

/** Union concepts from the full recognition pipeline (not keyphrases alone). */
export function collectPipelineConcepts(text: string, outline: GeneratedOutline): string[] {
  const raw: string[] = [];
  const push = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length >= 2) raw.push(trimmed);
  };

  for (const { phrase } of rankKeyphrases(text, 24)) push(phrase);
  for (const topic of outline.topics) {
    push(topic.title);
    for (const concept of topic.concepts) push(concept);
    for (const objective of topic.objectives ?? []) push(objective);
  }
  for (const entry of outline.glossary) push(entry.term);
  for (const def of extractDefinitions(text, 24)) push(def.term);
  for (const acronym of extractAcronyms(text)) push(acronym.term);
  for (const section of detectSections(text)) {
    if (section.heading?.trim()) push(section.heading);
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw) {
    const key = normalize(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

export function evaluateFixture(name: string): EvalResult {
  const { text, gold } = loadFixture(name);
  const outline = analyzeContentToOutline(text, [name]);
  if (!outline) {
    return {
      fixture: name,
      conceptRecall: 0,
      conceptPrecision: 0,
      definitionRecall: 0,
      formulaRecall: 0,
      sourceQualityBand: 'weak',
      topicCount: 0,
      detectedSubject: 'Unknown',
      errors: ['analyzeContentToOutline returned null (text too short)'],
    };
  }

  const definitions = extractDefinitions(text, 20);
  const formulas = extractFormulas(text);
  const quality = analyzeCourseSourceQuality(text, outline);

  const foundConcepts = collectPipelineConcepts(text, outline);
  const foundDefs = definitions.map((d) => d.term);
  const foundFormulas = formulas.map((f) => f.formula);

  const errors: string[] = [];
  if (gold.expectedSubject && outline.subject !== gold.expectedSubject) {
    errors.push(
      `Subject mismatch: expected ${gold.expectedSubject}, got ${outline.subject}`,
    );
  }
  if (gold.expectedTopicCount && outline.topics.length !== gold.expectedTopicCount) {
    errors.push(
      `Topic count mismatch: expected ${gold.expectedTopicCount}, got ${outline.topics.length}`,
    );
  }

  return {
    fixture: name,
    conceptRecall: computeRecall(gold.expectedConcepts, foundConcepts),
    conceptPrecision: computePrecision(gold.expectedConcepts, foundConcepts),
    definitionRecall: computeRecall(gold.expectedDefinitions, foundDefs),
    formulaRecall: computeRecall(gold.expectedFormulas, foundFormulas),
    sourceQualityBand: quality.band,
    topicCount: outline.topics.length,
    detectedSubject: outline.subject,
    errors,
  };
}

export interface EvalReport {
  results: EvalResult[];
  documentModelResults: EvalResult[];
  groundingResults: GroundingEvalCaseResult[];
  averageConceptRecall: number;
  averageConceptPrecision: number;
  averageDefinitionRecall: number;
  averageFormulaRecall: number;
  averageDocumentModelConceptRecall: number;
  averageGroundingFaithfulness: number;
  qualityBands: Record<string, number>;
  pass: boolean;
  passChecks: {
    averageConceptRecall: boolean;
    perFixtureConceptRecall: boolean;
    documentModelConceptRecall: boolean;
    definitionRecall: boolean;
    groundingFaithfulness: boolean;
    groundingCasePassRate: boolean;
  };
}

export interface GroundingEvalCase {
  id: string;
  source: string;
  content?: string;
  kind: 'agent' | 'lesson';
  strict: boolean;
  expectVerified: boolean;
  minFaithfulness: number;
  panels?: WorkspacePanel[];
}

export interface GroundingEvalCaseResult {
  id: string;
  kind: 'agent' | 'lesson';
  faithfulness: number;
  verified: boolean;
  expectVerified: boolean;
  pass: boolean;
  errors: string[];
}

function loadGroundingCases(): GroundingEvalCase[] {
  const raw = JSON.parse(
    readFileSync(join(__dirname, 'fixtures', 'grounding-cases.json'), 'utf8'),
  ) as { cases: GroundingEvalCase[] };
  return raw.cases;
}

function citationFromSource(source: string): MessageCitation {
  return {
    chunkId: 'eval#0',
    fileId: 'eval-file',
    fileName: 'eval.txt',
    locator: '¶1',
    charStart: 0,
    charEnd: source.length,
    snippet: source,
  };
}

export function evaluateGroundingCase(testCase: GroundingEvalCase): GroundingEvalCaseResult {
  const errors: string[] = [];
  let faithfulness = 0;
  let verified = false;

  if (testCase.kind === 'agent') {
    const content = testCase.content ?? '';
    const report = verifyAgentFaithfulness(content, [citationFromSource(testCase.source)], testCase.strict);
    faithfulness = report.faithfulness;
    verified = report.verified;
  } else {
    const panels = testCase.panels ?? [];
    const report = verifyLessonPanelsFaithfulness(panels, testCase.source, testCase.strict);
    faithfulness = report.faithfulness;
    verified = report.verified;
  }

  if (testCase.expectVerified && faithfulness < testCase.minFaithfulness) {
    errors.push(`faithfulness ${faithfulness.toFixed(2)} < ${testCase.minFaithfulness}`);
  }
  if (verified !== testCase.expectVerified) {
    errors.push(`verified=${verified}, expected ${testCase.expectVerified}`);
  }

  return {
    id: testCase.id,
    kind: testCase.kind,
    faithfulness,
    verified,
    expectVerified: testCase.expectVerified,
    pass: errors.length === 0,
    errors,
  };
}

export function evaluateGroundingFaithfulness(): {
  results: GroundingEvalCaseResult[];
  /** Average faithfulness across expectVerified (positive-only) cases. */
  averageFaithfulness: number;
  /** Average across all cases including negative detection fixtures. */
  averageFaithfulnessAll: number;
  passRate: number;
  pass: boolean;
} {
  const results = loadGroundingCases().map(evaluateGroundingCase);
  const positive = results.filter((r) => r.expectVerified);
  const averageFaithfulness =
    positive.reduce((s, r) => s + r.faithfulness, 0) / Math.max(positive.length, 1);
  const averageFaithfulnessAll =
    results.reduce((s, r) => s + r.faithfulness, 0) / Math.max(results.length, 1);
  const passRate = results.filter((r) => r.pass).length / Math.max(results.length, 1);
  const t = baseline.thresholds as typeof baseline.thresholds & {
    groundingFaithfulnessMin?: number;
    groundingCasePassRate?: number;
  };
  const pass =
    averageFaithfulness >= (t.groundingFaithfulnessMin ?? EVAL_GROUNDING_FAITHFULNESS_MIN)
    && passRate >= (t.groundingCasePassRate ?? 1);
  return { results, averageFaithfulness, averageFaithfulnessAll, passRate, pass };
}

export const EVAL_FIXTURES: string[] = baseline.fixtures;

export function evaluateDocumentModelFixture(name: string): EvalResult {
  const { text, gold } = loadFixture(name);
  const doc = buildDocumentModelFromText(text, { fileName: name, language: name.includes('-el') ? 'el' : 'en' });
  const foundConcepts = doc.entities.filter((e) => e.type === 'concept').map((e) => e.label);
  const foundDefs = doc.entities.filter((e) => e.type === 'definition').map((e) => e.label);
  const foundFormulas = doc.formulas.map((f) => f.formula);

  const errors: string[] = [];
  if (gold.expectedSubject && doc.subject !== gold.expectedSubject) {
    errors.push(`Subject mismatch: expected ${gold.expectedSubject}, got ${doc.subject}`);
  }

  return {
    fixture: `${name} (DocumentModel)`,
    conceptRecall: computeRecall(gold.expectedConcepts, foundConcepts),
    conceptPrecision: computePrecision(gold.expectedConcepts, foundConcepts),
    definitionRecall: computeRecall(gold.expectedDefinitions, foundDefs),
    formulaRecall: computeRecall(gold.expectedFormulas, foundFormulas),
    sourceQualityBand: doc.quality.conceptCount >= 4 ? 'strong' : doc.quality.conceptCount >= 2 ? 'moderate' : 'weak',
    topicCount: doc.sections.length,
    detectedSubject: doc.subject,
    errors,
  };
}

export function evaluateAll(fixtures: string[] = EVAL_FIXTURES): EvalReport {
  const results = fixtures.map(evaluateFixture);
  const documentModelResults = fixtures.map(evaluateDocumentModelFixture);
  const groundingEval = evaluateGroundingFaithfulness();
  const averageConceptRecall = results.reduce((s, r) => s + r.conceptRecall, 0) / results.length;
  const averageConceptPrecision = results.reduce((s, r) => s + r.conceptPrecision, 0) / results.length;
  const averageDefinitionRecall = results.reduce((s, r) => s + r.definitionRecall, 0) / results.length;
  const averageFormulaRecall = results.reduce((s, r) => s + r.formulaRecall, 0) / results.length;
  const averageDocumentModelConceptRecall =
    documentModelResults.reduce((s, r) => s + r.conceptRecall, 0) / documentModelResults.length;
  const qualityBands: Record<string, number> = {};
  for (const r of results) {
    qualityBands[r.sourceQualityBand] = (qualityBands[r.sourceQualityBand] ?? 0) + 1;
  }

  const t = baseline.thresholds as typeof baseline.thresholds & {
    groundingFaithfulnessMin?: number;
    groundingCasePassRate?: number;
  };
  const passChecks = {
    averageConceptRecall: averageConceptRecall >= t.averageConceptRecall,
    perFixtureConceptRecall: results.every((r) => r.conceptRecall >= t.perFixtureConceptRecall),
    documentModelConceptRecall: averageDocumentModelConceptRecall >= t.documentModelConceptRecall,
    definitionRecall: averageDefinitionRecall >= (t.definitionRecall ?? 0),
    groundingFaithfulness: groundingEval.averageFaithfulness >= (t.groundingFaithfulnessMin ?? EVAL_GROUNDING_FAITHFULNESS_MIN),
    groundingCasePassRate: groundingEval.passRate >= (t.groundingCasePassRate ?? 1),
  };
  const pass =
    passChecks.averageConceptRecall
    && passChecks.perFixtureConceptRecall
    && passChecks.documentModelConceptRecall
    && passChecks.groundingFaithfulness
    && passChecks.groundingCasePassRate;

  return {
    results,
    documentModelResults,
    groundingResults: groundingEval.results,
    averageConceptRecall,
    averageConceptPrecision,
    averageDefinitionRecall,
    averageFormulaRecall,
    averageDocumentModelConceptRecall,
    averageGroundingFaithfulness: groundingEval.averageFaithfulness,
    qualityBands,
    pass,
    passChecks,
  };
}

export function printReport(report: EvalReport): void {
  console.log('\n=== Synapse Eval Report ===');
  for (const r of report.results) {
    console.log(`\n${r.fixture}`);
    console.log(`  subject: ${r.detectedSubject}, topics: ${r.topicCount}, quality: ${r.sourceQualityBand}`);
    console.log(`  concept recall: ${(r.conceptRecall * 100).toFixed(1)}%`);
    console.log(`  concept precision: ${(r.conceptPrecision * 100).toFixed(1)}%`);
    console.log(`  definition recall: ${(r.definitionRecall * 100).toFixed(1)}%`);
    console.log(`  formula recall: ${(r.formulaRecall * 100).toFixed(1)}%`);
    if (r.errors.length) console.log(`  errors: ${r.errors.join('; ')}`);
  }
  console.log('\nAverages');
  console.log(`  concept recall: ${(report.averageConceptRecall * 100).toFixed(1)}%`);
  console.log(`  concept precision: ${(report.averageConceptPrecision * 100).toFixed(1)}%`);
  console.log(`  definition recall: ${(report.averageDefinitionRecall * 100).toFixed(1)}%`);
  console.log(`  formula recall: ${(report.averageFormulaRecall * 100).toFixed(1)}%`);
  console.log(`  DocumentModel concept recall: ${(report.averageDocumentModelConceptRecall * 100).toFixed(1)}%`);
  console.log(`  Grounding faithfulness: ${(report.averageGroundingFaithfulness * 100).toFixed(1)}%`);
  for (const g of report.groundingResults) {
    console.log(`  grounding ${g.id}: faithfulness ${(g.faithfulness * 100).toFixed(1)}% pass=${g.pass}`);
  }
  console.log(`  PASS: ${report.pass}`);
}
