/**
 * S8 substrate recognition worker — builds DocumentModel off the main thread.
 *
 * Distinct from `recognitionWorker.ts` (course outline generation). This worker
 * runs lexical recognition, optional offline embedding clustering, and returns
 * the canonical DocumentModel for upload persistence (S8-PR5).
 */

import type { FileType, UploadedFile } from '../types';
import { buildDocumentModel, type BuildDocumentModelOptions } from '../lib/documentModel';
import { agglomerativeCluster, chooseClusterCount } from '../lib/embeddingCluster';
import {
  createLocalEmbedder,
  LOCAL_EMBEDDER_MODEL,
  preloadLocalEmbedder,
} from '../lib/localEmbedder';

export type DocumentModelWorkerFileInput = {
  id: string;
  name: string;
  type: FileType;
  size: number;
  detectedLanguage?: string;
};

export type DocumentModelWorkerBuildRequest = {
  id: string;
  type: 'build';
  text: string;
  file: DocumentModelWorkerFileInput;
  options?: BuildDocumentModelOptions;
};

export type DocumentModelWorkerPreloadRequest = {
  id: string;
  type: 'preload';
};

export type DocumentModelWorkerRequest =
  | DocumentModelWorkerBuildRequest
  | DocumentModelWorkerPreloadRequest;

export type DocumentModelWorkerBuildResponse = {
  id: string;
  type: 'result';
  model: ReturnType<typeof buildDocumentModel>;
};

export type DocumentModelWorkerPreloadResponse = {
  id: string;
  type: 'preloaded';
  ready: boolean;
};

export type DocumentModelWorkerErrorResponse = {
  id: string;
  type: 'error';
  error: string;
};

export type DocumentModelWorkerResponse =
  | DocumentModelWorkerBuildResponse
  | DocumentModelWorkerPreloadResponse
  | DocumentModelWorkerErrorResponse;

function toUploadedFile(input: DocumentModelWorkerFileInput, text: string): UploadedFile {
  return {
    id: input.id,
    name: input.name,
    type: input.type,
    size: input.size,
    uploadedAt: new Date().toISOString(),
    status: 'analyzed',
    extractedText: text,
    detectedLanguage: input.detectedLanguage,
  };
}

async function buildWithEmbeddings(
  file: UploadedFile,
  text: string,
  options: BuildDocumentModelOptions = {},
): Promise<ReturnType<typeof buildDocumentModel>> {
  const base = buildDocumentModel(file, text, options);
  const embedder = createLocalEmbedder();

  if (!embedder.ready || base.sections.length < 2) {
    return base;
  }

  const sectionBodies = base.sections.map((s) =>
    `${s.heading ?? ''}\n${s.text}`.trim().slice(0, 2500),
  );
  const embeddings = await embedder.embed(sectionBodies);
  if (!embeddings || embeddings.some((e) => e.length === 0)) {
    return base;
  }

  const k = chooseClusterCount(sectionBodies.length);
  return {
    ...base,
    recognitionMeta: {
      ...options.recognitionMeta,
      sectionClusterLabels: agglomerativeCluster(embeddings, k),
      embeddingModel: LOCAL_EMBEDDER_MODEL,
    },
  };
}

self.onmessage = async (event: MessageEvent<DocumentModelWorkerRequest>) => {
  const msg = event.data;
  try {
    if (msg.type === 'preload') {
      const ready = await preloadLocalEmbedder();
      const response: DocumentModelWorkerPreloadResponse = {
        id: msg.id,
        type: 'preloaded',
        ready,
      };
      self.postMessage(response);
      return;
    }

    const file = toUploadedFile(msg.file, msg.text);
    const model = await buildWithEmbeddings(file, msg.text, msg.options);
    const response: DocumentModelWorkerBuildResponse = {
      id: msg.id,
      type: 'result',
      model,
    };
    self.postMessage(response);
  } catch (err) {
    const response: DocumentModelWorkerErrorResponse = {
      id: msg.id,
      type: 'error',
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
};

export {};
