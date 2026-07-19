import type { UserSettings } from '../types';

function proxyBase(settings: UserSettings): string {
  return (settings.authProxyBase ?? settings.llmProxyUrl ?? 'http://localhost:8787')
    .replace(/\/v1\/?$/, '')
    .replace(/\/$/, '');
}

/** SAML auth completion — kept in a tiny module so App can lazy-import without pulling orgClient. */
export async function completeSamlAuth(
  code: string,
  settings: UserSettings,
): Promise<{ token: string; refreshToken?: string; email: string; plan?: string }> {
  const res = await fetch(`${proxyBase(settings)}/v1/auth/saml/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as {
    token: string;
    refreshToken?: string;
    account?: { email?: string; plan?: string };
  };
  return {
    token: data.token,
    refreshToken: data.refreshToken,
    email: data.account?.email ?? '',
    plan: data.account?.plan,
  };
}
