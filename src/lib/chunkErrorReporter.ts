/**
 * Centralized client-side reporter for dynamic-import / chunk-load failures.
 *
 * - Emits a `synapse:chunk-error` CustomEvent so any host (Sentry, Datadog,
 *   custom backend) can subscribe without coupling to a specific vendor.
 * - If `window.Sentry` is present, automatically forwards the error with rich
 *   `extra` context (version, url, attempt, flow).
 * - Best-effort `navigator.sendBeacon` to `/__chunk_errors` when available,
 *   so we still capture data even if the page is about to unload.
 *
 * All side effects are wrapped in try/catch — reporting must never throw.
 */

export interface ChunkErrorContext {
  /** Human-readable identifier of the flow that triggered the import. */
  flow: string;
  /** Attempt number (1-based) for the current load cycle. */
  attempt: number;
  /** Maximum attempts allowed for this load cycle. */
  maxAttempts: number;
  /** Whether the helper decided to hard-reload after this error. */
  willReload: boolean;
  /** Dynamic-import URL when extractable, else the request that failed. */
  url?: string;
  /** Original thrown value, normalized to Error.message. */
  message: string;
  /** App version that was current when the import failed. */
  version: string;
  /** ISO timestamp of the failure. */
  timestamp: string;
  /** User agent for triage. */
  userAgent?: string;
}

// Injected by Vite at build-time. Falls back to a dev marker otherwise.
declare const __APP_VERSION__: string | undefined;

function readAppVersion(): string {
  try {
    if (typeof __APP_VERSION__ === 'string' && __APP_VERSION__) return __APP_VERSION__;
  } catch {
    /* ignore */
  }
  return 'dev';
}

interface SentryLike {
  captureException(err: unknown, hint?: { extra?: Record<string, unknown> }): void;
}

function getSentry(): SentryLike | null {
  try {
    const s = (window as unknown as { Sentry?: SentryLike }).Sentry;
    return s && typeof s.captureException === 'function' ? s : null;
  } catch {
    return null;
  }
}

export function extractImportUrl(err: unknown): string | undefined {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const m = msg.match(/https?:\/\/[^\s'")]+/);
  return m ? m[0] : undefined;
}

export function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError|dynamically imported module|error loading dynamically imported module/i.test(
    msg,
  );
}

export function reportChunkError(err: unknown, ctx: Omit<ChunkErrorContext, 'message' | 'version' | 'timestamp' | 'userAgent' | 'url'> & { url?: string }): void {
  if (typeof window === 'undefined') return;
  const payload: ChunkErrorContext = {
    ...ctx,
    url: ctx.url ?? extractImportUrl(err),
    message: err instanceof Error ? err.message : String(err ?? 'unknown'),
    version: readAppVersion(),
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };

  // 1. Console (always — easiest triage in dev + visible in Vercel/CF logs).
  try {
    // eslint-disable-next-line no-console
    console.error('[synapse] chunk-error', payload, err);
  } catch {
    /* ignore */
  }

  // 2. Sentry-compatible host.
  try {
    const sentry = getSentry();
    if (sentry) sentry.captureException(err, { extra: payload as unknown as Record<string, unknown> });
  } catch {
    /* ignore */
  }

  // 3. Custom event — host can subscribe via window.addEventListener.
  try {
    window.dispatchEvent(new CustomEvent('synapse:chunk-error', { detail: payload }));
  } catch {
    /* ignore */
  }

  // 4. Best-effort beacon (gracefully ignored if endpoint absent).
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const body = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon('/__chunk_errors', body);
    }
  } catch {
    /* ignore */
  }
}

export function getAppVersion(): string {
  return readAppVersion();
}
