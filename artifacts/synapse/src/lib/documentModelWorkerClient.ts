/**
 * Client bridge for the DocumentModel recognition worker (S8 substrate).
 *
 * Builds the canonical document model off the main thread with idle-sync fallback.
 */

import type { FileType, UploadedFile } from '../types';
import {
  buildDocumentModel,
  type BuildDocumentModelOptions,
  type DocumentModel,
} from './documentModel';
import type {
  DocumentModelWorkerBuildRequest,
  DocumentModelWorkerRequest,
  DocumentModelWorkerResponse,
} from '../workers/recognition.worker';

export type DocumentModelBuildInput = {
  text: string;
  file: Pick<UploadedFile, 'id' | 'name' | 'type' | 'size' | 'detectedLanguage'>;
  options?: BuildDocumentModelOptions;
};

let worker: Worker | null = null;
let warmStarted = false;

export function getDocumentModelWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL('../workers/recognition.worker.ts', import.meta.url), {
      type: 'module',
    });
    return worker;
  } catch {
    return null;
  }
}

/** Spawn worker and optionally preload the offline embedder. */
export function warmDocumentModelWorker(preloadEmbedder = true): void {
  if (warmStarted || typeof window === 'undefined') return;
  warmStarted = true;
  const w = getDocumentModelWorker();
  if (!w || !preloadEmbedder) return;
  const id = `preload-${Date.now()}`;
  w.postMessage({ id, type: 'preload' } satisfies DocumentModelWorkerRequest);
}

function deferOnMainIdle<T>(fn: () => T): Promise<T> {
  return new Promise((resolve) => {
    const run = () => resolve(fn());
    if (typeof window === 'undefined') {
      run();
      return;
    }
    const ric = window.requestIdleCallback;
    if (typeof ric === 'function') {
      ric(run, { timeout: 2500 });
    } else {
      window.setTimeout(run, 0);
    }
  });
}

function toUploadedFile(
  file: DocumentModelBuildInput['file'],
  text: string,
): UploadedFile {
  return {
    id: file.id,
    name: file.name,
    type: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    status: 'analyzed',
    extractedText: text,
    detectedLanguage: file.detectedLanguage,
  };
}

function buildSync(input: DocumentModelBuildInput): DocumentModel {
  return buildDocumentModel(toUploadedFile(input.file, input.text), input.text, input.options);
}

/**
 * Build DocumentModel off-thread when a worker is available; otherwise idle-deferred sync.
 */
export function buildDocumentModelInWorker(input: DocumentModelBuildInput): Promise<DocumentModel> {
  const w = getDocumentModelWorker();
  if (!w) {
    return deferOnMainIdle(() => buildSync(input));
  }

  return new Promise((resolve, reject) => {
    const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const onMessage = (ev: MessageEvent<DocumentModelWorkerResponse>) => {
      if (ev.data.id !== id) return;
      w.removeEventListener('message', onMessage);
      if (ev.data.type === 'error') {
        deferOnMainIdle(() => buildSync(input)).then(resolve).catch(reject);
        return;
      }
      if (ev.data.type === 'result') {
        resolve(ev.data.model);
        return;
      }
      reject(new Error('DocumentModel worker returned unexpected response'));
    };
    w.addEventListener('message', onMessage);
    try {
      const request: DocumentModelWorkerBuildRequest = {
        id,
        type: 'build',
        text: input.text,
        file: {
          id: input.file.id,
          name: input.file.name,
          type: input.file.type as FileType,
          size: input.file.size,
          detectedLanguage: input.file.detectedLanguage,
        },
        options: input.options,
      };
      w.postMessage(request);
    } catch {
      w.removeEventListener('message', onMessage);
      deferOnMainIdle(() => buildSync(input)).then(resolve).catch(reject);
    }
  });
}

/** Reset singleton for unit tests. */
export function resetDocumentModelWorkerForTests(): void {
  worker?.terminate();
  worker = null;
  warmStarted = false;
}
