import { describe, expect, it } from 'vitest';
import { config } from '../config';
import type { UsageWindow } from '../store/accounts';
import {
  computeCostAbuseSummary,
  maskEmail,
  type AccountUsageRow,
} from './costAbuseSummary';

const NOW = new Date('2026-08-15T00:00:00.000Z');
const THIS_MONTH = '2026-08';
const LAST_MONTH = '2026-07';

function usage(month: string, requests: number, prompt: number, completion: number): UsageWindow {
  return { month, requests, promptTokens: prompt, completionTokens: completion };
}

function row(email: string, plan: AccountUsageRow['plan'], u: UsageWindow): AccountUsageRow {
  return { id: email, email, plan, usage: u };
}

describe('computeCostAbuseSummary (D8)', () => {
  it('aggregates only current-month usage into totals + per-plan breakdown', () => {
    const rows: AccountUsageRow[] = [
      row('a@example.com', 'free', usage(THIS_MONTH, 10, 1000, 500)),
      row('b@example.com', 'free', usage(THIS_MONTH, 5, 200, 300)),
      row('c@example.com', 'pro', usage(THIS_MONTH, 100, 40000, 60000)),
      // Stale window — must contribute an account but zero spend.
      row('stale@example.com', 'free', usage(LAST_MONTH, 999, 999999, 999999)),
    ];

    const s = computeCostAbuseSummary(rows, { now: NOW });

    expect(s.month).toBe(THIS_MONTH);
    expect(s.accounts.total).toBe(4);
    expect(s.accounts.byPlan.free).toBe(3);
    expect(s.accounts.byPlan.pro).toBe(1);

    // free: 1000+500 + 200+300 = 2000 tokens; pro: 100000 tokens; stale excluded.
    expect(s.byPlan.free.tokens).toBe(2000);
    expect(s.byPlan.free.requests).toBe(15);
    expect(s.byPlan.pro.tokens).toBe(100000);
    expect(s.totals.tokens).toBe(102000);
    expect(s.totals.requests).toBe(115);
    expect(s.byPlan.free.quota).toBe(config.quotas.free);
  });

  it('flags over-quota and near-quota accounts and masks emails', () => {
    const over = config.quotas.free; // 100% of free quota
    const near = Math.ceil(config.quotas.free * 0.85);
    const rows: AccountUsageRow[] = [
      row('over@example.com', 'free', usage(THIS_MONTH, 1, over, 0)),
      row('near@example.com', 'free', usage(THIS_MONTH, 1, near, 0)),
      row('fine@example.com', 'free', usage(THIS_MONTH, 1, 10, 0)),
    ];

    const s = computeCostAbuseSummary(rows, { now: NOW });
    const byEmail = Object.fromEntries(s.abuse.signals.map((x) => [x.emailMasked, x.reason]));

    expect(byEmail['o***@example.com']).toBe('over-quota');
    expect(byEmail['n***@example.com']).toBe('near-quota');
    expect(byEmail['f***@example.com']).toBeUndefined();
  });

  it('flags high request volume even when under token quota', () => {
    const rows: AccountUsageRow[] = [
      row('spammer@example.com', 'team', usage(THIS_MONTH, 9000, 10, 10)),
    ];
    const s = computeCostAbuseSummary(rows, { now: NOW, highRequestVolume: 5000 });
    expect(s.abuse.signals[0]?.reason).toBe('high-request-volume');
  });

  it('returns top consumers sorted by tokens, honoring topN', () => {
    const rows: AccountUsageRow[] = [
      row('small@example.com', 'free', usage(THIS_MONTH, 1, 10, 10)),
      row('big@example.com', 'pro', usage(THIS_MONTH, 1, 50000, 50000)),
      row('mid@example.com', 'free', usage(THIS_MONTH, 1, 5000, 0)),
    ];
    const s = computeCostAbuseSummary(rows, { now: NOW, topN: 2 });
    expect(s.topConsumers).toHaveLength(2);
    expect(s.topConsumers[0]!.emailMasked).toBe('b***@example.com');
    expect(s.topConsumers[0]!.tokens).toBe(100000);
    expect(s.topConsumers[1]!.emailMasked).toBe('m***@example.com');
  });

  it('handles an empty account list without dividing by zero', () => {
    const s = computeCostAbuseSummary([], { now: NOW });
    expect(s.totals.tokens).toBe(0);
    expect(s.byPlan.free.quotaUtilization).toBe(0);
    expect(s.topConsumers).toHaveLength(0);
    expect(s.abuse.signals).toHaveLength(0);
  });

  it('maskEmail keeps only first char + domain', () => {
    expect(maskEmail('alice@example.com')).toBe('a***@example.com');
    expect(maskEmail('bad-input')).toBe('***');
  });
});
