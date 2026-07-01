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
  blockCount: number;
  relationCount: number;
}

/** Typed layout block (v2 substrate for layout-aware tools and eval). */
export type DocumentBlockType =
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'code'
  | 'equation'
  | 'caption';

export interface DocumentBlock {
  id: string;
  type: DocumentBlockType;
  text: string;
  charStart: number;
  charEnd: number;
  sectionId: string | null;
}

/** Typed semantic edge between entities (v2). */
export type DocumentRelationType =
  | 'defines'
  | 'example-of'
  | 'part-of'
  | 'relates'
  | 'contrasts-with';

export interface DocumentRelation {
  id: string;
  type: DocumentRelationType;
  sourceEntityId: string;
  targetEntityId: string;
  evidenceSpanIds: string[];
  confidence: number;
}

/** Optional enrichment from off-thread embedding clustering (recognition worker). */
export interface DocumentRecognitionMeta {
  sectionClusterLabels?: number[];
  embeddingModel?: string;
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
  blocks: DocumentBlock[];
  relations: DocumentRelation[];
  chunks: SourceChunk[];
  quality: DocumentQuality;
  recognitionMeta?: DocumentRecognitionMeta;
  /** ISO timestamp of model creation. */
  createdAt: string;
}

export interface BuildDocumentModelOptions {
  language?: string;
  recognitionMeta?: DocumentRecognitionMeta;
}

/** Build typed layout blocks from sections and formulas. */
export function buildDocumentBlocks(
  sections: DocumentSection[],
  formulas: DocumentFormula[],
  fullText: string,
): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  let blockIndex = 0;

  const pushBlock = (
    type: DocumentBlockType,
    text: string,
    charStart: number,
    sectionId: string | null,
  ) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    blocks.push({
      id: makeId('blk', blockIndex++),
      type,
      text: trimmed,
      charStart,
      charEnd: charStart + trimmed.length,
      sectionId,
    });
  };

  for (const section of sections) {
    if (section.heading) {
      const headingStart = fullText.indexOf(section.heading, section.charStart);
      pushBlock(
        'heading',
        section.heading,
        headingStart >= 0 ? headingStart : section.charStart,
        section.id,
      );
    }

    const paragraphs = section.text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    if (paragraphs.length === 0 && section.text.trim()) {
      paragraphs.push(section.text.trim());
    }

    let searchFrom = section.charStart;
    for (const para of paragraphs) {
      const idx = fullText.indexOf(para, searchFrom);
      const start = idx >= 0 ? idx : section.charStart;
      const isList = /^(\s*[-*•]\s+|\s*\d+[.)]\s+)/m.test(para);
      const isCode = para.startsWith('```') || /^ {4}\S/m.test(para);
      pushBlock(isCode ? 'code' : isList ? 'list' : 'paragraph', para, start, section.id);
      searchFrom = start + para.length;
    }
  }

  for (const formula of formulas) {
    const idx = fullText.indexOf(formula.formula);
    if (idx >= 0) {
      pushBlock('equation', formula.formula, idx, null);
    }
  }

  return blocks;
}

/** Mine typed relations from entities, sections, and formulas. */
export function buildDocumentRelations(
  entities: DocumentEntity[],
  formulas: DocumentFormula[],
  sections: DocumentSection[],
  spans: DocumentSpan[],
): DocumentRelation[] {
  const relations: DocumentRelation[] = [];
  let relIndex = 0;

  const entityByKey = new Map(entities.map((e) => [e.key, e]));
  const spanById = new Map(spans.map((s) => [s.id, s]));

  const addRelation = (
    type: DocumentRelationType,
    source: DocumentEntity,
    target: DocumentEntity,
    evidenceSpanIds: string[],
    confidence: number,
  ) => {
    relations.push({
      id: makeId('rel', relIndex++),
      type,
      sourceEntityId: source.id,
      targetEntityId: target.id,
      evidenceSpanIds,
      confidence,
    });
  };

  for (const def of entities.filter((e) => e.type === 'definition')) {
    const concept = entityByKey.get(def.key) ?? entities.find(
      (e) => e.type === 'concept' && def.spanIds.some((sid) => e.spanIds.includes(sid)),
    );
    if (concept) {
      addRelation('defines', concept, def, [...new Set([...concept.spanIds, ...def.spanIds])], 0.85);
    }
  }

  for (const section of sections.filter((s) => s.role === 'example')) {
    const parent = section.parentId
      ? sections.find((s) => s.id === section.parentId)
      : sections[section.index - 1];
    const parentHeading = parent?.heading?.trim();
    if (!parentHeading) continue;
    const parentConcept = entities.find(
      (e) => e.type === 'concept' && normalizeEntityKey(e.label) === normalizeEntityKey(parentHeading),
    );
    if (!parentConcept) continue;
    const exampleConcepts = entities.filter(
      (e) =>
        e.type === 'concept' &&
        e.id !== parentConcept.id &&
        section.sentenceIds.some((sid) => e.spanIds.includes(sid)),
    );
    for (const ex of exampleConcepts.slice(0, 3)) {
      addRelation('example-of', ex, parentConcept, section.sentenceIds, 0.7);
    }
  }

  for (const formula of formulas) {
    const formulaEntity = entities.find(
      (e) => e.type === 'concept' && formula.spanIds.some((sid) => e.spanIds.includes(sid)),
    );
    const section = sections.find(
      (s) => formula.spanIds.some((sid) => {
        const span = spanById.get(sid);
        return span && span.sectionIndex === s.index;
      }),
    );
    if (formulaEntity && section?.heading) {
      const sectionConcept = entities.find(
        (e) =>
          e.type === 'concept' &&
          normalizeEntityKey(e.label) === normalizeEntityKey(section.heading!),
      );
      if (sectionConcept) {
        addRelation('part-of', formulaEntity, sectionConcept, formula.spanIds, 0.75);
      }
    }
  }

  const contrastPattern = /\b(however|but|whereas|unlike|in contrast)\b/i;
  for (const span of spans) {
    if (!contrastPattern.test(span.text)) continue;
    const mentioned = entities.filter(
      (e) => e.type === 'concept' && span.text.toLowerCase().includes(e.label.toLowerCase()),
    );
    if (mentioned.length >= 2) {
      addRelation('contrasts-with', mentioned[0]!, mentioned[1]!, [span.id], 0.6);
    }
  }

  return relations;
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
  const { language = file.detectedLanguage ?? 'en', recognitionMeta } = options;
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

  const blocks = buildDocumentBlocks(sections, formulas, normalized);
  const relations = buildDocumentRelations(entities, formulas, sections, spans);

  const quality: DocumentQuality = {
    wordCount: words.length,
    sectionCount: sections.length,
    sentenceCount: spans.length,
    definitionCount: entities.filter((e) => e.type === 'definition').length,
    formulaCount: formulas.length,
    conceptCount: conceptEntities.length,
    acronymCount: entities.filter((e) => e.type === 'acronym').length,
    averageSentenceLength,
    blockCount: blocks.length,
    relationCount: relations.length,
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
    blocks,
    relations,
    chunks,
    quality,
    recognitionMeta,
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
