import { describe, expect, it, afterEach } from 'vitest';
import { sendEmail, setEmailTransportForTests, sendPasswordResetEmail } from './email';

describe('email provider', () => {
  afterEach(() => {
    setEmailTransportForTests(null);
    delete process.env.EMAIL_PROVIDER;
  });

  it('uses injectable mock transport', async () => {
    const calls: unknown[] = [];
    setEmailTransportForTests(async (input) => {
      calls.push(input);
      return { ok: true, provider: 'log', messageId: 'mock-1' };
    });
    const result = await sendPasswordResetEmail('user@example.com', 'tok123');
    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect((calls[0] as { to: string }).to).toBe('user@example.com');
  });

  it('defaults to log sink', async () => {
    const result = await sendEmail({ to: 'a@b.co', subject: 't', text: 'body' });
    expect(result.ok).toBe(true);
    expect(result.provider).toBe('log');
  });

  it('reports smtp misconfig without host', async () => {
    process.env.EMAIL_PROVIDER = 'smtp';
    delete process.env.SMTP_HOST;
    const result = await sendEmail({ to: 'a@b.co', subject: 't', text: 'body' });
    expect(result.ok).toBe(false);
    expect(result.provider).toBe('smtp');
  });
});
