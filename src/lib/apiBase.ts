import type { UserSettings } from '../types';
import { configuredProxyBase } from './authClient';

/** API origin for Synapse proxy (no trailing slash, no /v1). */
export function resolveApiOrigin(settings?: UserSettings): string {
  const configured = configuredProxyBase(settings);
  if (configured) return configured;
  const fromEnv = (import.meta.env.VITE_API_ORIGIN as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/v1\/?$/, '').replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:8787';
}

export function apiUrl(path: string, settings?: UserSettings): string {
  const base = resolveApiOrigin(settings);
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
