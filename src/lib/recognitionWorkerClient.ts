/**
 * Client-side bridge to the recognition Web Worker.
 *
 * Vite instantiates the worker module; the main thread posts file content and
 * receives the generated course without blocking the UI.
 */

import type { Course, CourseSourceQuality, GlossaryEntry, UploadedFile, UserSettings } from '../types';
import type { GeneratedOutline } from './courseGenerator';
import type { RecognitionWorkerInput, RecognitionWorkerMessage, RecognitionWorkerOutput } from './recognitionWorker';

export type { RecognitionWorkerOutput };

export interface RecognitionJob {
  text: string;
  fileNames: string[];
  payload: {
    files: { name: string; type: string; size: number }[];
    pastedContent?: string;
    youtubeUrl?: string;
    sourceMode: Course['sourceMode'];
    focusTags: string[];
    examDate?: string;
    title?: string;
    targetCourseId?: string;
    uploadMode?: 'new' | 'extend';
  };
  settings: UserSettings;
  existingCount: number;
  extendTarget?: Course;
  uploadedFiles: UploadedFile[];
  glossaryEntries: GlossaryEntry[];
}

export interface RecognitionResult {
  course: Course;
  outline: GeneratedOutline | null;
  glossary: GlossaryEntry[];
  courseQuality?: CourseSourceQuality;
  withCourse: UploadedFile[];
  ytFile?: UploadedFile;
}

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./recognitionWorker.ts', import.meta.url), { type: 'module' });
  }
  return worker;
}

export function terminateRecognitionWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
}

export function recognizeCourse(job: RecognitionJob): Promise<RecognitionResult> {
  const w = getWorker();
  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<RecognitionWorkerMessage>) => {
      const data = event.data;
      if (data.type === 'result') {
        cleanup();
        resolve(data.output);
      } else if (data.type === 'error') {
        cleanup();
        reject(new Error(data.error));
      }
    };
    const onError = (err: ErrorEvent) => {
      cleanup();
      reject(new Error(err.message));
    };
    const cleanup = () => {
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);
    };
    w.addEventListener('message', onMessage);
    w.addEventListener('error', onError);
    const input: RecognitionWorkerInput = {
      text: job.text,
      fileNames: job.fileNames,
      payload: job.payload,
      settings: job.settings,
      existingCount: job.existingCount,
      extendTarget: job.extendTarget,
      uploadedFiles: job.uploadedFiles,
      glossaryEntries: job.glossaryEntries,
    };
    w.postMessage(input);
  });
}
