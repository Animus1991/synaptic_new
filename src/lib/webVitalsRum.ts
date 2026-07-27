/**
 * B3 — Web Vitals RUM with route tag.
 * Sends LCP / INP / CLS to POST /v1/rum and optionally Sentry measurements.
 */

export type RumMetricName = 'LCP' | 'INP' | 'CLS' | 'TTFB' | 'FCP';

export type RumPayload = {
  name: RumMetricName;
  value: number;
  rating?: string;
  route: string;
  id?: string;
  navigationType?: string;
  ts: string;
};

type RouteGetter = () => string;

let routeGetter: RouteGetter = () => 'unknown';
let started = false;

export function setRumRouteGetter(getter: RouteGetter): void {
  routeGetter = getter;
}

export function buildRumPayload(
  metric: {
    name: string;
    value: number;
    rating?: string;
    id?: string;
    navigationType?: string;
  },
  route = routeGetter(),
): RumPayload | null {
  const name = metric.name as RumMetricName;
  if (!['LCP', 'INP', 'CLS', 'TTFB', 'FCP'].includes(name)) return null;
  return {
    name,
    value: Number(metric.value),
    rating: metric.rating,
    route: route.slice(0, 64),
    id: metric.id,
    navigationType: metric.navigationType,
    ts: new Date().toISOString(),
  };
}

export function rumEndpoint(proxyBase?: string | null): string {
  const base = (proxyBase ?? '').replace(/\/v1\/?$/, '').replace(/\/$/, '');
  if (base) return `${base}/v1/rum`;
  return '/v1/rum';
}

export async function postRumMetric(
  payload: RumPayload,
  proxyBase?: string | null,
): Promise<void> {
  const url = rumEndpoint(proxyBase);
  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(url, blob)) return;
    }
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch {
    /* best-effort */
  }
}

function reportToSentry(payload: RumPayload): void {
  try {
    const Sentry = window.Sentry as
      | {
          metrics?: { distribution?: (name: string, value: number, opts?: object) => void };
          captureMessage?: (msg: string, opts?: object) => void;
        }
      | undefined;
    if (Sentry?.metrics?.distribution) {
      Sentry.metrics.distribution(`webvital.${payload.name.toLowerCase()}`, payload.value, {
        attributes: { route: payload.route, rating: payload.rating ?? 'unknown' },
        unit: payload.name === 'CLS' ? undefined : 'millisecond',
      });
      return;
    }
    Sentry?.captureMessage?.(`webvital:${payload.name}`, {
      extra: payload,
      level: 'info',
    });
  } catch {
    /* optional */
  }
}

export function reportRumMetric(
  metric: {
    name: string;
    value: number;
    rating?: string;
    id?: string;
    navigationType?: string;
  },
  proxyBase?: string | null,
): void {
  const payload = buildRumPayload(metric);
  if (!payload) return;
  reportToSentry(payload);
  void postRumMetric(payload, proxyBase);
}

/** Boot web-vitals collectors once. */
export function initWebVitalsRum(proxyBase?: string | null): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  void import('web-vitals')
    .then(({ onLCP, onINP, onCLS, onTTFB, onFCP }) => {
      const report = (m: { name: string; value: number; rating?: string; id?: string; navigationType?: string }) =>
        reportRumMetric(m, proxyBase);
      onLCP(report);
      onINP(report);
      onCLS(report);
      onTTFB(report);
      onFCP(report);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[synapse] web-vitals init skipped:', err);
    });
}
