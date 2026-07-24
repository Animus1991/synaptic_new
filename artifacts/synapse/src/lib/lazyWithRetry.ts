/**
 * Resilient dynamic-import helpers used by all lazy code paths in the app.
 *
 * Solves three failure modes that previously stranded users on a blank screen:
 *
 *   1. Transient network glitches → exponential-backoff retry (300/600/1200ms).
 *   2. Stale chunks after redeploy → detect chunk-load errors and hard-reload
 *      *once* per session to pull the new index.html, then continue retrying.
 *   3. Permanent failure → propagate the error so React.lazy + ErrorBoundary
 *      can render the "Try again / Reload" fallback UI.
 *
 * Every failure is reported via `reportChunkError` so we can pinpoint which
 * flow broke in production.
 */

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { isChunkLoadError, reportChunkError } from './chunkErrorReporter';

const HARD_RELOAD_FLAG = 'synapse:chunk-hard-reload';
const DEFAULT_RETRIES = 3;
const BASE_DELAY_MS = 300;

interface RetryOptions {
  /** Stable identifier used for logging + reload deduping. */
  flow: string;
  /** Number of attempts (including the first). Defaults to 3. */
  retries?: number;
  /** Base delay in ms for exponential backoff. Defaults to 300ms. */
  baseDelay?: number;
  /** When true, schedule a one-shot hard reload on chunk-load errors. */
  reloadOnStaleChunk?: boolean;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readReloadFlag(flow: string): boolean {
  try {
    return sessionStorage.getItem(`${HARD_RELOAD_FLAG}:${flow}`) === '1';
  } catch {
    return false;
  }
}

function writeReloadFlag(flow: string): void {
  try {
    sessionStorage.setItem(`${HARD_RELOAD_FLAG}:${flow}`, '1');
  } catch {
    /* ignore */
  }
}

/** Wraps any dynamic import with retry + reporting + optional stale-chunk reload. */
export async function importWithRetry<T>(
  importer: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const retries = Math.max(1, options.retries ?? DEFAULT_RETRIES);
  const baseDelay = Math.max(50, options.baseDelay ?? BASE_DELAY_MS);
  const reloadOnStale = options.reloadOnStaleChunk ?? true;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await importer();
    } catch (err) {
      lastErr = err;
      const stale = isChunkLoadError(err);
      const willReload = stale && reloadOnStale && typeof window !== 'undefined' && !readReloadFlag(options.flow) && attempt === retries;

      reportChunkError(err, {
        flow: options.flow,
        attempt,
        maxAttempts: retries,
        willReload,
      });

      if (willReload) {
        writeReloadFlag(options.flow);
        try {
          window.location.reload();
        } catch {
          /* ignore */
        }
        // Stay pending until the reload happens.
        await delay(60_000);
        throw err;
      }

      if (attempt < retries) {
        const wait = baseDelay * Math.pow(2, attempt - 1);
        await delay(wait);
        continue;
      }
    }
  }
  throw lastErr;
}

/** React.lazy with retry semantics. Use everywhere we currently call React.lazy. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  flow: string,
  options: Omit<RetryOptions, 'flow'> = {},
): LazyExoticComponent<T> {
  return lazy(() => importWithRetry(importer, { flow, ...options }));
}

/** Clears the hard-reload guards once the app has booted successfully. */
export function clearChunkReloadFlags(): void {
  if (typeof window === 'undefined') return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(`${HARD_RELOAD_FLAG}:`)) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
