/**
 * Optional Sentry bootstrap — no-op when VITE_SENTRY_DSN is unset.
 * Exposes `window.Sentry` so chunkErrorReporter forwards without vendor coupling.
 */

import { getAppVersion } from './chunkErrorReporter';

declare global {
  interface Window {
    Sentry?: {
      captureException: (err: unknown, hint?: { extra?: Record<string, unknown> }) => void;
    };
  }
}

let initPromise: Promise<void> | null = null;

export function initSentry(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
    if (!dsn || typeof window === 'undefined') return;

    try {
      const Sentry = await import('@sentry/react');
      Sentry.init({
        dsn,
        environment: import.meta.env.MODE,
        release: getAppVersion(),
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
        ],
        tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: import.meta.env.PROD ? 0.25 : 0,
        beforeSend(event) {
          if (event.request?.headers) {
            delete event.request.headers['Authorization'];
            delete event.request.headers['authorization'];
          }
          return event;
        },
      });
      window.Sentry = Sentry;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[synapse] Sentry init skipped:', err);
    }
  })();

  return initPromise;
}
