/**
 * A3 — Email delivery abstraction.
 * Providers: log (default) | smtp | resend | ses
 * Set EMAIL_PROVIDER + EMAIL_FROM for real delivery in staging/prod.
 */

export type EmailProviderName = 'log' | 'smtp' | 'resend' | 'ses';

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SendEmailResult {
  ok: boolean;
  provider: EmailProviderName;
  messageId?: string;
  error?: string;
}

function providerName(): EmailProviderName {
  const raw = (process.env.EMAIL_PROVIDER ?? 'log').trim().toLowerCase();
  if (raw === 'smtp' || raw === 'resend' || raw === 'ses' || raw === 'log') return raw;
  return 'log';
}

function fromAddress(): string {
  return process.env.EMAIL_FROM?.trim() || 'noreply@synapse.local';
}

async function sendLog(input: SendEmailInput): Promise<SendEmailResult> {
  console.info('[email:log]', JSON.stringify({ to: input.to, subject: input.subject, text: input.text.slice(0, 500) }));
  return { ok: true, provider: 'log', messageId: `log-${Date.now()}` };
}

async function sendSmtp(input: SendEmailInput): Promise<SendEmailResult> {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? '587');
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS ?? '';
  if (!host) {
    return { ok: false, provider: 'smtp', error: 'SMTP_HOST not configured' };
  }
  // Lazy import so unit tests / default log path need no nodemailer install failure.
  const nodemailer = await import('nodemailer').catch(() => null);
  if (!nodemailer) {
    return { ok: false, provider: 'smtp', error: 'nodemailer not installed' };
  }
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user ? { user, pass } : undefined,
  });
  const info = await transport.sendMail({
    from: fromAddress(),
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
  return { ok: true, provider: 'smtp', messageId: String(info.messageId ?? '') };
}

async function sendResend(input: SendEmailInput): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return { ok: false, provider: 'resend', error: 'RESEND_API_KEY not configured' };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return { ok: false, provider: 'resend', error: detail.slice(0, 300) || res.statusText };
  }
  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return { ok: true, provider: 'resend', messageId: data.id };
}

async function sendSes(_input: SendEmailInput): Promise<SendEmailResult> {
  // SES via SMTP bridge is preferred; this path expects AWS SES v2 HTTP with IAM
  // credentials already injected by the runtime (optional advanced). Falls back to SMTP hint.
  const region = process.env.AWS_REGION?.trim() || process.env.SES_REGION?.trim();
  if (!region) {
    return { ok: false, provider: 'ses', error: 'AWS_REGION/SES_REGION not set — use EMAIL_PROVIDER=smtp with SES SMTP' };
  }
  // Minimal SES SendEmail via fetch requires SigV4 — keep SMTP as supported SES path.
  return {
    ok: false,
    provider: 'ses',
    error: 'Use EMAIL_PROVIDER=smtp with Amazon SES SMTP credentials (documented in DEPLOYMENT.md)',
  };
}

/** Injectable transport for tests. */
let overrideSend: ((input: SendEmailInput) => Promise<SendEmailResult>) | null = null;

export function setEmailTransportForTests(
  fn: ((input: SendEmailInput) => Promise<SendEmailResult>) | null,
): void {
  overrideSend = fn;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (overrideSend) return overrideSend(input);
  const name = providerName();
  try {
    if (name === 'smtp') return await sendSmtp(input);
    if (name === 'resend') return await sendResend(input);
    if (name === 'ses') return await sendSes(input);
    return await sendLog(input);
  } catch (err) {
    return { ok: false, provider: name, error: (err as Error).message };
  }
}

export function appPublicUrl(): string {
  return (process.env.CLIENT_APP_URL ?? 'http://localhost:5173').replace(/\/$/, '');
}

export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<SendEmailResult> {
  const link = `${appPublicUrl()}/?resetToken=${encodeURIComponent(resetToken)}`;
  return sendEmail({
    to,
    subject: 'Reset your Synapse password',
    text: `Use this link to reset your password (expires in 1 hour):\n\n${link}\n\nIf you did not request this, ignore this email.`,
    html: `<p>Use this link to reset your password (expires in 1 hour):</p><p><a href="${link}">${link}</a></p>`,
  });
}

export async function sendEmailVerificationEmail(to: string, verifyToken: string): Promise<SendEmailResult> {
  const link = `${appPublicUrl()}/?verifyToken=${encodeURIComponent(verifyToken)}`;
  return sendEmail({
    to,
    subject: 'Verify your Synapse email',
    text: `Verify your email:\n\n${link}\n\nToken expires in 24 hours.`,
    html: `<p>Verify your email:</p><p><a href="${link}">${link}</a></p>`,
  });
}

export function isEmailDeliveryConfigured(): boolean {
  const name = providerName();
  if (name === 'log') return true;
  if (name === 'smtp') return Boolean(process.env.SMTP_HOST?.trim());
  if (name === 'resend') return Boolean(process.env.RESEND_API_KEY?.trim());
  if (name === 'ses') return Boolean(process.env.SMTP_HOST?.trim() || process.env.AWS_REGION?.trim());
  return false;
}
