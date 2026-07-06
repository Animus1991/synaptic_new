/** Server-rendered OAuth consent screen for the Synapse MCP authorization flow. */

const SCOPE_LABELS: Record<string, string> = {
  'courses:read': 'View your courses',
  'library:read': 'Search your uploaded notes & library',
  'progress:read': 'View your learning progress',
  'progress:write': 'Update lesson progress',
  'quiz:generate': 'Generate quizzes from your material',
};

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hidden(name: string, value: string): string {
  return `<input type="hidden" name="${esc(name)}" value="${esc(value)}" />`;
}

export interface ConsentParams {
  clientId: string;
  clientName: string;
  redirectUri: string;
  state: string;
  scope: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  resource: string;
  error?: string;
}

export function renderConsentPage(p: ConsentParams): string {
  const scopes = p.scope
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => `<li>${esc(SCOPE_LABELS[s] ?? s)}</li>`)
    .join('');

  const errorBanner = p.error
    ? `<div class="error" role="alert">${esc(p.error)}</div>`
    : '';

  const fields = [
    hidden('client_id', p.clientId),
    hidden('redirect_uri', p.redirectUri),
    hidden('state', p.state),
    hidden('scope', p.scope),
    hidden('code_challenge', p.codeChallenge),
    hidden('code_challenge_method', p.codeChallengeMethod),
    hidden('resource', p.resource),
  ].join('\n      ');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Authorize ${esc(p.clientName)} · Synapse</title>
  <style>
    :root { color-scheme: light dark; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: #0b1220; color: #e8edf5; display: grid; place-items: center; min-height: 100vh; padding: 16px; }
    .card { width: 100%; max-width: 420px; background: #131c2e; border: 1px solid #24314b;
      border-radius: 16px; padding: 28px; box-shadow: 0 12px 40px rgba(0,0,0,.4); }
    h1 { font-size: 20px; margin: 0 0 4px; }
    p.sub { margin: 0 0 20px; color: #9fb0c9; font-size: 14px; }
    .client { font-weight: 600; color: #5ed0c0; }
    ul { margin: 12px 0 20px; padding-left: 18px; color: #cdd8ea; font-size: 14px; }
    li { margin: 4px 0; }
    label { display: block; font-size: 13px; margin: 12px 0 4px; color: #9fb0c9; }
    input[type=email], input[type=password] { width: 100%; padding: 11px 12px; border-radius: 10px;
      border: 1px solid #2c3a58; background: #0e1626; color: #e8edf5; font-size: 15px; }
    .actions { display: flex; gap: 10px; margin-top: 22px; }
    button { flex: 1; padding: 12px; border-radius: 10px; border: 0; font-size: 15px; font-weight: 600; cursor: pointer; }
    .approve { background: #2f9e8f; color: #fff; }
    .deny { background: transparent; color: #9fb0c9; border: 1px solid #2c3a58; }
    .error { background: #3a1620; border: 1px solid #7a2438; color: #ffb4c0; padding: 10px 12px;
      border-radius: 10px; font-size: 13px; margin-bottom: 16px; }
    .foot { margin-top: 18px; font-size: 12px; color: #6b7a94; text-align: center; }
  </style>
</head>
<body>
  <main class="card">
    ${errorBanner}
    <h1>Authorize access</h1>
    <p class="sub"><span class="client">${esc(p.clientName)}</span> wants to connect to your Synapse account.</p>
    <p class="sub">It will be able to:</p>
    <ul>${scopes}</ul>
    <form method="post" action="/oauth/authorize/decision">
      ${fields}
      <label for="email">Email</label>
      <input id="email" name="email" type="email" autocomplete="username" required />
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required />
      <div class="actions">
        <button class="deny" type="submit" name="decision" value="deny">Deny</button>
        <button class="approve" type="submit" name="decision" value="approve">Allow</button>
      </div>
    </form>
    <p class="foot">Only your own data is shared. You can revoke access anytime.</p>
  </main>
</body>
</html>`;
}
