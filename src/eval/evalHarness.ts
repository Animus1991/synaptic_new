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
import type { GeneratedOutline } from '../lib/courseGenerator';

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
    .replace(/[^a-z0-9]/g, ' ')
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
  averageConceptRecall: number;
  averageConceptPrecision: number;
  averageDefinitionRecall: number;
  averageFormulaRecall: number;
  qualityBands: Record<string, number>;
  pass: boolean;
}

export function evaluateAll(fixtures: string[]): EvalReport {
  const results = fixtures.map(evaluateFixture);
  const averageConceptRecall = results.reduce((s, r) => s + r.conceptRecall, 0) / results.length;
  const averageConceptPrecision = results.reduce((s, r) => s + r.conceptPrecision, 0) / results.length;
  const averageDefinitionRecall = results.reduce((s, r) => s + r.definitionRecall, 0) / results.length;
  const averageFormulaRecall = results.reduce((s, r) => s + r.formulaRecall, 0) / results.length;
  const qualityBands: Record<string, number> = {};
  for (const r of results) {
    qualityBands[r.sourceQualityBand] = (qualityBands[r.sourceQualityBand] ?? 0) + 1;
  }

  const pass =
    averageConceptRecall >= 0.6
    && results.every((r) => r.conceptRecall >= 0.6);

  return {
    results,
    averageConceptRecall,
    averageConceptPrecision,
    averageDefinitionRecall,
    averageFormulaRecall,
    qualityBands,
    pass,
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
  console.log(`  PASS: ${report.pass}`);
}
