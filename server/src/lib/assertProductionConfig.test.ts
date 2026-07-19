import { describe, expect, it } from 'vitest';
import { collectProductionConfigIssues } from './assertProductionConfig';

const baseProd: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  JWT_SECRET: 'a'.repeat(32),
  ALLOWED_ORIGINS: 'https://app.example.com',
  ALLOW_ANONYMOUS: 'false',
  OPENAI_API_KEY: 'sk-test',
  ADMIN_SECRET: 'admin-secret',
  DATABASE_URL: 'postgres://localhost/synapse',
};

describe('collectProductionConfigIssues', () => {
  it('returns no issues for a complete production env', () => {
    expect(collectProductionConfigIssues(baseProd)).toEqual([]);
  });

  it('skips checks outside production', () => {
    expect(collectProductionConfigIssues({ ...baseProd, NODE_ENV: 'development' })).toEqual([]);
  });

  it('rejects the dev JWT placeholder', () => {
    const issues = collectProductionConfigIssues({
      ...baseProd,
      JWT_SECRET: 'dev-insecure-secret-change-me',
    });
    expect(issues.some((i) => i.code === 'JWT_SECRET')).toBe(true);
  });

  it('rejects wildcard CORS', () => {
    const issues = collectProductionConfigIssues({
      ...baseProd,
      ALLOWED_ORIGINS: '*',
    });
    expect(issues.some((i) => i.code === 'ALLOWED_ORIGINS')).toBe(true);
  });

  it('requires Stripe webhook secret when Stripe is enabled', () => {
    const issues = collectProductionConfigIssues({
      ...baseProd,
      STRIPE_SECRET_KEY: 'sk_live_x',
    });
    expect(issues.some((i) => i.code === 'STRIPE_WEBHOOK_SECRET')).toBe(true);
  });

  it('accepts Stripe when webhook secret is present', () => {
    const issues = collectProductionConfigIssues({
      ...baseProd,
      STRIPE_SECRET_KEY: 'sk_live_x',
      STRIPE_WEBHOOK_SECRET: 'whsec_x',
    });
    expect(issues).toEqual([]);
  });
});
