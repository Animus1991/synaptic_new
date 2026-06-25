/**
 * Typed document model for Synapse content recognition.
 *
 * `DocumentModel` is the canonical, structured representation of an uploaded
 * source. It captures layout (sections, headings), text spans (sentences with
 * precise offsets), extracted entities (concepts, definitions, formulas,
 * acronyms), quality signals, and retrievable chunks. It is produced entirely
 * offline and feeds course generation, workspace tools, and RAG.
 */

import type { FileType, UploadedFile } from '../types';
import {
  detectHierarchicalSections,
  extractAcronyms,
  extractDefinitions,
  inferSubject,
  rankKeyphrases,
  splitSentences,
  type DiscourseRole,
} from './contentAnalysis';
import { extractFormulas } from './noteContentExtractors';
import { chunkText, type SourceChunk } from './rag';

export interface DocumentSpan {
  id: string;
  text: string;
  charStart: number;
  charEnd: number;
  sentenceIndex: number;
  sectionIndex: number;
}

export type EntityType = 'concept' | 'definition' | 'formula' | 'acronym';

export interface DocumentEntity {
  id: string;
  type: EntityType;
  label: string;
  value: string;
  /** Span ids that ground this entity in the source. */
  spanIds: string[];
  /** Normalized concept key for deduplication. */
  key: string;
}

export interface DocumentFormula {
  id: string;
  name: string;
  formula: string;
  spanIds: string[];
}

export interface DocumentSection {
  id: string;
  index: number;
  heading?: string;
  text: string;
  charStart: number;
  charEnd: number;
  sentenceIds: string[];
  /** Heading depth in the section tree (1 = root). */
  level: number;
  /** ID of the nearest parent section, or null for roots. */
  parentId: string | null;
  /** Discourse role: intro, body, example, summary, aside, unknown. */
  role: DiscourseRole;
}

export interface DocumentQuality {
  wordCount: number;
  sectionCount: number;
  sentenceCount: number;
  definitionCount: number;
  formulaCount: number;
  conceptCount: number;
  acronymCount: number;
  averageSentenceLength: number;
}

export interface DocumentModel {
  id: string;
  fileId: string;
  fileName: string;
  fileType: FileType;
  language: string;
  subject: string;
  text: string;
  sections: DocumentSection[];
  spans: DocumentSpan[];
  entities: DocumentEntity[];
  formulas: DocumentFormula[];
  chunks: SourceChunk[];
  quality: DocumentQuality;
  /** ISO timestamp of model creation. */
  createdAt: string;
}

export interface BuildDocumentModelOptions {
  language?: string;
}

function makeId(prefix: string, index: number): string {
  return `${prefix}-${index}`;
}

function normalizeEntityKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\u0370-\u03ff]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function rankConcepts(text: string, max = 40): string[] {
  return rankKeyphrases(text, max).map((k) => k.phrase);
}

export function buildDocumentModel(
  file: UploadedFile,
  text: string,
  options: BuildDocumentModelOptions = {},
): DocumentModel {
  const { language = file.detectedLanguage ?? 'en' } = options;
  const normalized = text.replace(/\r\n/g, '\n');
  const sections: DocumentSection[] = [];
  const spans: DocumentSpan[] = [];
  const entities: DocumentEntity[] = [];
  const formulas: DocumentFormula[] = [];

  const detectedSections = detectHierarchicalSections(normalized);
  let globalOffset = 0;

  for (let i = 0; i < detectedSections.length; i++) {
    const raw = detectedSections[i]!;
    const headingLen = raw.heading ? raw.heading.length + 1 : 0;
    const charStart = globalOffset + headingLen;
    const charEnd = charStart + raw.text.length;
    const parentId =
      raw.parentIndex >= 0 && raw.parentIndex < detectedSections.length
        ? makeId('sec', raw.parentIndex)
        : null;
    const section: DocumentSection = {
      id: makeId('sec', i),
      index: i,
      heading: raw.heading,
      text: raw.text,
      charStart,
      charEnd,
      sentenceIds: [],
      level: raw.level,
      parentId,
      role: raw.role,
    };

    const sentences = splitSentences(raw.text);
    for (let s = 0; s < sentences.length; s++) {
      const sentence = sentences[s]!;
      const idxInSection = raw.text.indexOf(sentence);
      const spanStart = idxInSection >= 0 ? charStart + idxInSection : charStart;
      const span: DocumentSpan = {
        id: makeId('span', spans.length),
        text: sentence,
        charStart: spanStart,
        charEnd: spanStart + sentence.length,
        sentenceIndex: s,
        sectionIndex: i,
      };
      spans.push(span);
      section.sentenceIds.push(span.id);
    }

    sections.push(section);
    globalOffset = charEnd + 1;
  }

  // Sentence-level spans for the whole document if no sections were detected.
  if (sections.length === 0) {
    const sentences = splitSentences(normalized);
    for (let s = 0; s < sentences.length; s++) {
      const sentence = sentences[s]!;
      const idx = normalized.indexOf(sentence);
      const span: DocumentSpan = {
        id: makeId('span', spans.length),
        text: sentence,
        charStart: idx >= 0 ? idx : 0,
        charEnd: (idx >= 0 ? idx : 0) + sentence.length,
        sentenceIndex: s,
        sectionIndex: -1,
      };
      spans.push(span);
    }
  }

  const findSpanIds = (needle: string): string[] => {
    const lowerNeedle = needle.toLowerCase();
    return spans
      .filter((span) => span.text.toLowerCase().includes(lowerNeedle))
      .map((span) => span.id);
  };

  const conceptSet = new Set<string>();
  const conceptEntities = rankConcepts(normalized, 40);
  for (const concept of conceptEntities) {
    const key = normalizeEntityKey(concept);
    if (conceptSet.has(key)) continue;
    conceptSet.add(key);
    entities.push({
      id: makeId('ent', entities.length),
      type: 'concept',
      label: concept,
      value: concept,
      spanIds: findSpanIds(concept),
      key,
    });
  }

  const definitionSet = new Set<string>();
  for (const def of extractDefinitions(normalized, 30)) {
    const key = normalizeEntityKey(def.term);
    if (definitionSet.has(key)) continue;
    definitionSet.add(key);
    entities.push({
      id: makeId('ent', entities.length),
      type: 'definition',
      label: def.term,
      value: def.definition,
      spanIds: findSpanIds(def.term),
      key,
    });
  }

  for (const ac of extractAcronyms(normalized)) {
    entities.push({
      id: makeId('ent', entities.length),
      type: 'acronym',
      label: ac.term,
      value: ac.definition,
      spanIds: findSpanIds(ac.term),
      key: normalizeEntityKey(ac.term),
    });
  }

  const formulaSet = new Set<string>();
  for (const f of extractFormulas(normalized, undefined, 20)) {
    const key = normalizeEntityKey(f.formula);
    if (formulaSet.has(key)) continue;
    formulaSet.add(key);
    formulas.push({
      id: makeId('form', formulas.length),
      name: f.name,
      formula: f.formula,
      spanIds: findSpanIds(f.formula),
    });
  }

  const chunks = chunkText(normalized, file.id, file.name);

  const words = normalized.match(/[\p{L}\p{N}]+/gu) ?? [];
  const averageSentenceLength =
    spans.length > 0 ? words.length / spans.length : 0;

  const quality: DocumentQuality = {
    wordCount: words.length,
    sectionCount: sections.length,
    sentenceCount: spans.length,
    definitionCount: entities.filter((e) => e.type === 'definition').length,
    formulaCount: formulas.length,
    conceptCount: conceptEntities.length,
    acronymCount: entities.filter((e) => e.type === 'acronym').length,
    averageSentenceLength,
  };

  return {
    id: makeId('doc', 0),
    fileId: file.id,
    fileName: file.name,
    fileType: file.type,
    language,
    subject: inferSubject(normalized),
    text: normalized,
    sections,
    spans,
    entities,
    formulas,
    chunks,
    quality,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Build a `DocumentModel` from raw text alone (no file metadata).
 * Useful for tests, eval harness, and programmatic ingestion.
 */
export function buildDocumentModelFromText(
  text: string,
  options: BuildDocumentModelOptions & { fileId?: string; fileName?: string; fileType?: FileType } = {},
): DocumentModel {
  const { fileId = 'anonymous', fileName = 'anonymous', fileType = 'txt', ...rest } = options;
  const file: UploadedFile = {
    id: fileId,
    name: fileName,
    type: fileType,
    size: text.length,
    uploadedAt: new Date().toISOString(),
    status: 'analyzed',
    extractedText: text,
  };
  return buildDocumentModel(file, text, rest);
}
