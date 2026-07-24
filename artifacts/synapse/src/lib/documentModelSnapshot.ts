/**
 * Compact persistence for DocumentModel (S8-PR5).
 * Omits duplicate full text and RAG chunks — rehydrate from UploadedFile.extractedText.
 */

import type { DocumentModel, DocumentQuality, DocumentRecognitionMeta } from './documentModel';
import { buildDocumentModelFromText } from './documentModel';
import { chunkText } from './rag';

/** Serializable snapshot stored on UploadedFile / Course. */
export type DocumentModelSnapshot = Omit<DocumentModel, 'text' | 'chunks'> & {
  chunkCount: number;
};

export type RecognitionSummary = {
  sectionCount: number;
  sentenceCount: number;
  conceptCount: number;
  definitionCount: number;
  formulaCount: number;
  relationCount: number;
  blockCount: number;
  subject: string;
  language: string;
  hasEmbeddingClusters: boolean;
  createdAt: string;
};

export function toDocumentModelSnapshot(model: DocumentModel): DocumentModelSnapshot {
  const { text: _text, chunks, ...rest } = model;
  return {
    ...rest,
    chunkCount: chunks.length,
  };
}

export function hydrateDocumentModel(
  snapshot: DocumentModelSnapshot,
  extractedText: string,
): DocumentModel {
  const chunks = chunkText(extractedText, snapshot.fileId, snapshot.fileName);
  return {
    ...snapshot,
    text: extractedText,
    chunks,
  };
}

export function recognitionSummaryFromSnapshot(
  snapshot: DocumentModelSnapshot,
): RecognitionSummary {
  const q = snapshot.quality;
  return {
    sectionCount: q.sectionCount,
    sentenceCount: q.sentenceCount,
    conceptCount: q.conceptCount,
    definitionCount: q.definitionCount,
    formulaCount: q.formulaCount,
    relationCount: q.relationCount,
    blockCount: q.blockCount,
    subject: snapshot.subject,
    language: snapshot.language,
    hasEmbeddingClusters: Boolean(snapshot.recognitionMeta?.sectionClusterLabels?.length),
    createdAt: snapshot.createdAt,
  };
}

export function mergeRecognitionSummaries(summaries: RecognitionSummary[]): RecognitionSummary | undefined {
  if (summaries.length === 0) return undefined;
  if (summaries.length === 1) return summaries[0];
  const quality: DocumentQuality = summaries.reduce(
    (acc, s) => ({
      wordCount: acc.wordCount + s.sentenceCount,
      sectionCount: acc.sectionCount + s.sectionCount,
      sentenceCount: acc.sentenceCount + s.sentenceCount,
      definitionCount: acc.definitionCount + s.definitionCount,
      formulaCount: acc.formulaCount + s.formulaCount,
      conceptCount: acc.conceptCount + s.conceptCount,
      acronymCount: 0,
      averageSentenceLength: 0,
      blockCount: acc.blockCount + s.blockCount,
      relationCount: acc.relationCount + s.relationCount,
    }),
    {
      wordCount: 0,
      sectionCount: 0,
      sentenceCount: 0,
      definitionCount: 0,
      formulaCount: 0,
      conceptCount: 0,
      acronymCount: 0,
      averageSentenceLength: 0,
      blockCount: 0,
      relationCount: 0,
    },
  );
  return {
    sectionCount: quality.sectionCount,
    sentenceCount: quality.sentenceCount,
    conceptCount: quality.conceptCount,
    definitionCount: quality.definitionCount,
    formulaCount: quality.formulaCount,
    relationCount: quality.relationCount,
    blockCount: quality.blockCount,
    subject: summaries[0]!.subject,
    language: summaries[0]!.language,
    hasEmbeddingClusters: summaries.some((s) => s.hasEmbeddingClusters),
    createdAt: summaries[0]!.createdAt,
  };
}

/** Build a snapshot from raw text (sync fallback for tests). */
export function snapshotFromText(
  text: string,
  file: { id: string; name: string; type: DocumentModel['fileType']; detectedLanguage?: string },
  recognitionMeta?: DocumentRecognitionMeta,
): DocumentModelSnapshot {
  const model = buildDocumentModelFromText(text, {
    fileId: file.id,
    fileName: file.name,
    fileType: file.type,
    language: file.detectedLanguage,
    recognitionMeta,
  });
  return toDocumentModelSnapshot(model);
}
