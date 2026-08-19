import type { Plan } from '../config';
import { config } from '../config';
import type { UsageWindow } from '../store/accounts';
import { listAccountUsageAsync } from '../store/accounts';

/** One account's cost-relevant footprint (no credentials, no personal payload). */
export type AccountUsageRow = {
  id: string;
  email: string;
  plan: Plan;
  usage: UsageWindow;
};

export type PlanUsageBreakdown = {
  accounts: number;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  tokens: number;
  /** Monthly token quota for the plan (from server config). */
  quota: number;
  /** tokens / (quota * accounts), clamped to [0, ∞); 0 when no accounts. */
  quotaUtilization: number;
};

export type TopConsumer = {
  /** Email masked to first char + domain (e.g. `a***@example.com`) for least-privilege display. */
  emailMasked: string;
  plan: Plan;
  requests: number;
  tokens: number;
  /** tokens / plan quota for this single account (0 when quota is 0). */
  quotaUtilization: number;
};

export type AbuseSignal = {
  emailMasked: string;
  plan: Plan;
  tokens: number;
  requests: number;
  quotaUtilization: number;
  reason: 'over-quota' | 'near-quota' | 'high-request-volume';
};

export type CostAbuseSummary = {
  generatedAt: string;
  /** Usage window month key these totals cover (accounts outside it are ignored). */
  month: string;
  accounts: { total: number; byPlan: Record<Plan, number> };
  totals: {
    requests: number;
    promptTokens: number;
    completionTokens: number;
    tokens: number;
  };
  byPlan: Record<Plan, PlanUsageBreakdown>;
  topConsumers: TopConsumer[];
  abuse: {
    /** Utilisation thresholds used to flag accounts. */
    nearQuotaThreshold: number;
    highRequestVolume: number;
    signals: AbuseSignal[];
  };
};

const PLANS: Plan[] = ['free', 'pro', 'team'];

export type CostAbuseOptions = {
  now?: Date;
  /** Number of top token consumers to include (default 10). */
  topN?: number;
  /** Fraction of quota (0–1) above which an account is a near-quota signal (default 0.8). */
  nearQuotaThreshold?: number;
  /** Absolute monthly request count above which an account is a volume signal (default 5000). */
  highRequestVolume?: number;
};

function monthKey(now: Date): string {
  return now.toISOString().slice(0, 7);
}

/** Mask an email to first char + domain so the admin view is least-privilege by default. */
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  const first = email[0]!;
  const domain = email.slice(at);
  return `${first}***${domain}`;
}

function emptyBreakdown(plan: Plan): PlanUsageBreakdown {
  return {
    accounts: 0,
    requests: 0,
    promptTokens: 0,
    completionTokens: 0,
    tokens: 0,
    quota: config.quotas[plan],
    quotaUtilization: 0,
  };
}

/**
 * Pure aggregation — deterministic given rows + quotas + clock. Only rows whose
 * usage window matches the target month contribute token/request totals, so a
 * stale window (pre-month-rollover) reads as zero rather than inflating cost.
 */
export function computeCostAbuseSummary(
  rows: AccountUsageRow[],
  opts: CostAbuseOptions = {},
): CostAbuseSummary {
  const now = opts.now ?? new Date();
  const topN = Math.max(1, opts.topN ?? 10);
  const nearQuotaThreshold = opts.nearQuotaThreshold ?? 0.8;
  const highRequestVolume = opts.highRequestVolume ?? 5000;
  const month = monthKey(now);

  const byPlan: Record<Plan, PlanUsageBreakdown> = {
    free: emptyBreakdown('free'),
    pro: emptyBreakdown('pro'),
    team: emptyBreakdown('team'),
  };
  const accountsByPlan: Record<Plan, number> = { free: 0, pro: 0, team: 0 };
  const totals = { requests: 0, promptTokens: 0, completionTokens: 0, tokens: 0 };

  type Enriched = AccountUsageRow & { tokens: number; requests: number; util: number };
  const enriched: Enriched[] = [];

  for (const row of rows) {
    const plan: Plan = PLANS.includes(row.plan) ? row.plan : 'free';
    accountsByPlan[plan] += 1;
    byPlan[plan].accounts += 1;

    // Only current-month usage counts toward spend.
    const inWindow = row.usage.month === month;
    const requests = inWindow ? Math.max(0, row.usage.requests) : 0;
    const promptTokens = inWindow ? Math.max(0, row.usage.promptTokens) : 0;
    const completionTokens = inWindow ? Math.max(0, row.usage.completionTokens) : 0;
    const tokens = promptTokens + completionTokens;

    byPlan[plan].requests += requests;
    byPlan[plan].promptTokens += promptTokens;
    byPlan[plan].completionTokens += completionTokens;
    byPlan[plan].tokens += tokens;

    totals.requests += requests;
    totals.promptTokens += promptTokens;
    totals.completionTokens += completionTokens;
    totals.tokens += tokens;

    const quota = config.quotas[plan];
    const util = quota > 0 ? tokens / quota : 0;
    enriched.push({ ...row, plan, tokens, requests, util });
  }

  for (const plan of PLANS) {
    const b = byPlan[plan];
    const denom = b.quota * b.accounts;
    b.quotaUtilization = denom > 0 ? b.tokens / denom : 0;
  }

  const ranked = [...enriched].sort((a, b) => b.tokens - a.tokens);
  const topConsumers: TopConsumer[] = ranked.slice(0, topN).map((r) => ({
    emailMasked: maskEmail(r.email),
    plan: r.plan,
    requests: r.requests,
    tokens: r.tokens,
    quotaUtilization: r.util,
  }));

  const signals: AbuseSignal[] = [];
  for (const r of ranked) {
    let reason: AbuseSignal['reason'] | null = null;
    if (r.util >= 1) reason = 'over-quota';
    else if (r.util >= nearQuotaThreshold) reason = 'near-quota';
    else if (r.requests >= highRequestVolume) reason = 'high-request-volume';
    if (!reason) continue;
    signals.push({
      emailMasked: maskEmail(r.email),
      plan: r.plan,
      tokens: r.tokens,
      requests: r.requests,
      quotaUtilization: r.util,
      reason,
    });
  }

  return {
    generatedAt: now.toISOString(),
    month,
    accounts: {
      total: rows.length,
      byPlan: accountsByPlan,
    },
    totals,
    byPlan,
    topConsumers,
    abuse: {
      nearQuotaThreshold,
      highRequestVolume,
      signals,
    },
  };
}

/** Fetch every account's usage footprint and aggregate it into an admin summary. */
export async function buildCostAbuseSummaryAsync(
  opts: CostAbuseOptions = {},
): Promise<CostAbuseSummary> {
  const rows = await listAccountUsageAsync();
  return computeCostAbuseSummary(rows, opts);
}
