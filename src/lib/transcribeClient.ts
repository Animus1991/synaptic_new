import type { UserSettings } from '../types';

function proxyBase(settings: UserSettings): string {
  return (settings.authProxyBase ?? settings.llmProxyUrl ?? 'http://localhost:8787')
    .replace(/\/v1\/?$/, '')
    .replace(/\/$/, '');
}

export type TranscribeJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type TranscribeJobResponse = {
  jobId: string;
  status: TranscribeJobStatus;
  text?: string;
  language?: string;
  error?: string;
  createdAt?: string;
  completedAt?: string;
};

export async function enqueueTranscribeJob(
  token: string,
  settings: UserSettings,
  audioBase64: string,
  opts?: { filename?: string; language?: string },
): Promise<{ jobId: string; status: TranscribeJobStatus }> {
  const res = await fetch(`${proxyBase(settings)}/v1/transcribe/jobs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audioBase64,
      filename: opts?.filename ?? 'audio.mp3',
      language: opts?.language,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { jobId: string; status: TranscribeJobStatus };
}

export async function pollTranscribeJob(
  token: string,
  settings: UserSettings,
  jobId: string,
): Promise<TranscribeJobResponse> {
  const res = await fetch(`${proxyBase(settings)}/v1/transcribe/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as TranscribeJobResponse;
}

export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

export async function waitForTranscribeJob(
  token: string,
  settings: UserSettings,
  jobId: string,
  opts?: { pollMs?: number; maxAttempts?: number },
): Promise<TranscribeJobResponse> {
  const pollMs = opts?.pollMs ?? 1500;
  const maxAttempts = opts?.maxAttempts ?? 120;
  for (let i = 0; i < maxAttempts; i++) {
    const job = await pollTranscribeJob(token, settings, jobId);
    if (job.status === 'completed' || job.status === 'failed') return job;
    await new Promise((r) => setTimeout(r, pollMs));
  }
  throw new Error('Transcription timed out');
}
