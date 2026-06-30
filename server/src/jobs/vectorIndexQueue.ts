import { Queue, Worker } from 'bullmq';
import { config } from '../config';
import { indexLibraryVectors, scheduleLibraryVectorIndex } from '../lib/libraryVectorIndex';
import type { StoredLibrary } from '../store/libraryStore';

let queue: Queue | null = null;
let workerStarted = false;

function redisConnection(): { url: string } | null {
  if (!config.redisUrl) return null;
  return { url: config.redisUrl };
}

export function initVectorIndexQueue(): void {
  const conn = redisConnection();
  if (!conn || workerStarted) return;
  workerStarted = true;

  new Worker(
    'library-vector-index',
    async (job) => {
      const { accountId, library } = job.data as { accountId: string; library: StoredLibrary };
      await indexLibraryVectors(accountId, library);
    },
    { connection: conn, concurrency: 1 },
  );

  queue = new Queue('library-vector-index', { connection: conn });
  console.log('[vector-index] BullMQ worker started');
}

export function enqueueLibraryVectorIndex(accountId: string, library: StoredLibrary): void {
  if (!queue) {
    scheduleLibraryVectorIndex(accountId, library);
    return;
  }
  void queue
    .add('index', { accountId, library }, { jobId: accountId, removeOnComplete: true, removeOnFail: 100 })
    .catch((err) => {
      console.warn('[vector-index] enqueue failed, falling back to inline', err);
      scheduleLibraryVectorIndex(accountId, library);
    });
}
