/** Public marketing / legal URLs (OPS-05). Override with VITE_PUBLIC_SITE_URL in production. */
const DEFAULT_SITE = 'https://app.synapse-learning.io';

export function publicSiteUrl(): string {
  const raw = import.meta.env.VITE_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE;
  return raw.replace(/\/$/, '');
}

export function privacyPolicyUrl(): string {
  return `${publicSiteUrl()}/legal/privacy`;
}

export function termsOfServiceUrl(): string {
  return `${publicSiteUrl()}/legal/terms`;
}

export function supportEmail(): string {
  return import.meta.env.VITE_SUPPORT_EMAIL?.trim() || 'support@synapse-learning.io';
}
