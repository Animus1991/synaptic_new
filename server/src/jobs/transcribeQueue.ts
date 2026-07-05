import { Queue, Worker } from 'bullmq';
import { config } from '../config';
import {
  buildVideoChapters,
  parseWhisperVerboseJson,
  type VideoChapter,
  type WhisperSegment,
} from '../lib/videoChapters';

export type TranscribeJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type TranscribeJob = {
  id: string;
  accountId: string;
  status: TranscribeJobStatus;
  language?: string;
  filename?: string;
  resultText?: string;
  segments?: WhisperSegment[];
  chapters?: VideoChapter[];
  error?: string;
  createdAt: string;
  completedAt?: string;
};

type JobPayload = {
  accountId: string;
  audioBase64: string;
  filename: string;
  language?: string;
};

const memoryJobs = new Map<string, TranscribeJob>();
let queue: Queue | null = null;
let workerStarted = false;

function redisConnection(): { url: string } | null {
  if (!config.redisUrl) return null;
  return { url: config.redisUrl };
}

async function transcribeBuffer(
  buffer: Buffer,
  filename: string,
  language?: string,
): Promise<{ text: string; language?: string; segments: WhisperSegment[]; chapters: VideoChapter[] }> {
  if (!config.upstreamApiKey) {
    throw new Error('Transcription service not configured');
  }
  const form = new FormData();
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  form.append('file', blob, filename);
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');
  if (language) form.append('language', language);

  const upstreamRes = await fetch(`${config.upstreamBaseUrl}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.upstreamApiKey}` },
    body: form,
  });
  if (!upstreamRes.ok) {
    const err = await upstreamRes.text().catch(() => 'Transcription failed');
    throw new Error(err);
  }
  const data = await upstreamRes.json();
  const parsed = parseWhisperVerboseJson(data);
  const chapters = buildVideoChapters(parsed.segments);
  return {
    text: parsed.text,
    language: (data as { language?: string }).language,
    segments: parsed.segments,
    chapters,
  };
}

async function runJob(jobId: string, payload: JobPayload): Promise<void> {
  const row = memoryJobs.get(jobId);
  if (!row) return;
  row.status = 'processing';
  memoryJobs.set(jobId, row);
  try {
    const buffer = Buffer.from(payload.audioBase64, 'base64');
    const result = await transcribeBuffer(buffer, payload.filename, payload.language);
    row.status = 'completed';
    row.resultText = result.text;
    row.segments = result.segments;
    row.chapters = result.chapters;
    row.language = result.language ?? payload.language;
    row.completedAt = new Date().toISOString();
  } catch (e) {
    row.status = 'failed';
    row.error = e instanceof Error ? e.message : 'Transcription failed';
    row.completedAt = new Date().toISOString();
  }
  memoryJobs.set(jobId, row);
}

export function initTranscribeQueue(): void {
  const conn = redisConnection();
  if (!conn || workerStarted) return;
  workerStarted = true;

  new Worker(
    'transcribe-whisper',
    async (job) => {
      const payload = job.data as JobPayload;
      await runJob(job.id!, payload);
    },
    { connection: conn, concurrency: 2 },
  );

  queue = new Queue('transcribe-whisper', { connection: conn });
  console.log('[transcribe] BullMQ worker started');
}

export function enqueueTranscribeJob(payload: JobPayload): TranscribeJob {
  const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const row: TranscribeJob = {
    id,
    accountId: payload.accountId,
    status: 'queued',
    language: payload.language,
    filename: payload.filename,
    createdAt: new Date().toISOString(),
  };
  memoryJobs.set(id, row);

  if (queue) {
    void queue
      .add('transcribe', payload, { jobId: id, removeOnComplete: true, removeOnFail: 100 })
      .catch(() => {
        void runJob(id, payload);
      });
  } else {
    void runJob(id, payload);
  }
  return row;
}

export function getTranscribeJob(jobId: string, accountId: string): TranscribeJob | null {
  const row = memoryJobs.get(jobId);
  if (!row || row.accountId !== accountId) return null;
  return row;
}

/** Test helper */
export function resetTranscribeJobs(): void {
  memoryJobs.clear();
}
