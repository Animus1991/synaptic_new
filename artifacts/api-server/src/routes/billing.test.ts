import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';
import {
  applySubscriptionUpdated,
  dispatchBillingEvent,
  parseStripeWebhook,
  WebhookVerificationError,
} from './billing';
import { resetWebhookIdempotency } from '../store/webhookIdempotency';

vi.mock('../store/accounts', () => ({
  findByStripeCustomerIdAsync: vi.fn(),
  setPlanAsync: vi.fn(),
}));

vi.mock('../config', () => ({
  config: {
    stripeSecretKey: undefined,
    stripeWebhookSecret: undefined,
    stripePricePro: 'price_pro_test',
    stripePriceTeam: 'price_team_test',
    clientAppUrl: 'http://localhost:5173',
    quotas: { free: 100_000, pro: 5_000_000, team: 25_000_000 },
  },
}));

import { findByStripeCustomerIdAsync, setPlanAsync } from '../store/accounts';

function stripeEvent<T>(type: string, object: T, id = `evt_${type}`): Stripe.Event {
  return {
    id,
    type,
    data: { object },
  } as unknown as Stripe.Event;
}

describe('billing webhooks', () => {
  beforeEach(() => {
    resetWebhookIdempotency();
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  it('rejects unsigned webhooks in production without STRIPE_WEBHOOK_SECRET', () => {
    process.env.NODE_ENV = 'production';
    const raw = Buffer.from(JSON.stringify(stripeEvent('checkout.session.completed', {})));
    expect(() => parseStripeWebhook(raw, undefined)).toThrow(WebhookVerificationError);
  });

  it('allows unsigned webhooks in test for local integration', () => {
    const payload = stripeEvent('checkout.session.completed', { id: 'cs_1' });
    const raw = Buffer.from(JSON.stringify(payload));
    const event = parseStripeWebhook(raw, undefined);
    expect(event.id).toBe(payload.id);
  });

  it('deduplicates webhook events by Stripe event id', async () => {
    const session = {
      client_reference_id: 'acc-1',
      metadata: { plan: 'pro' },
      customer: 'cus_1',
    } as unknown as Stripe.Checkout.Session;

    const event = stripeEvent('checkout.session.completed', session, 'evt_dup');
    const first = await dispatchBillingEvent(event);
    const second = await dispatchBillingEvent(event);

    expect(first.status).toBe('processed');
    expect(second.status).toBe('duplicate');
    expect(setPlanAsync).toHaveBeenCalledTimes(1);
  });

  it('maps subscription.updated active price to plan', async () => {
    vi.mocked(findByStripeCustomerIdAsync).mockResolvedValue({
      id: 'acc-2',
      email: 't@example.com',
      plan: 'free',
      passwordHash: '',
      salt: '',
      createdAt: '',
      usage: { month: '2026-06', requests: 0, promptTokens: 0, completionTokens: 0 },
    });

    const sub = {
      customer: 'cus_2',
      status: 'active',
      items: { data: [{ price: { id: 'price_team_test' } }] },
      metadata: {},
    } as Stripe.Subscription;

    await applySubscriptionUpdated(sub);
    expect(setPlanAsync).toHaveBeenCalledWith('acc-2', 'team', 'cus_2');
  });

  it('downgrades on subscription.updated canceled status', async () => {
    vi.mocked(findByStripeCustomerIdAsync).mockResolvedValue({
      id: 'acc-3',
      email: 't@example.com',
      plan: 'pro',
      passwordHash: '',
      salt: '',
      createdAt: '',
      usage: { month: '2026-06', requests: 0, promptTokens: 0, completionTokens: 0 },
    });

    const sub = {
      customer: 'cus_3',
      status: 'canceled',
      items: { data: [] },
      metadata: {},
    } as unknown as Stripe.Subscription;

    await applySubscriptionUpdated(sub);
    expect(setPlanAsync).toHaveBeenCalledWith('acc-3', 'free');
  });
});
