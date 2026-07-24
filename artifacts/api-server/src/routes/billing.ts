import { Router, type Request, type Response } from 'express';
import Stripe from 'stripe';
import { config, type Plan } from '../config';
import { planFromStripePriceId, SUPPORTED_WEBHOOK_EVENTS } from '../lib/billingPlans';
import { authenticate } from '../middleware/auth';
import { findByStripeCustomerIdAsync, setPlanAsync } from '../store/accounts';
import {
  isWebhookEventProcessed,
  markWebhookEventProcessed,
} from '../store/webhookIdempotency';

let stripeClient: Stripe | null = null;

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookVerificationError';
  }
}

function getStripe(): Stripe {
  if (!config.stripeSecretKey) throw new Error('STRIPE_SECRET_KEY is not configured');
  if (!stripeClient) stripeClient = new Stripe(config.stripeSecretKey);
  return stripeClient;
}

function priceIdForPlan(plan: Plan): string | undefined {
  if (plan === 'pro') return config.stripePricePro;
  if (plan === 'team') return config.stripePriceTeam;
  return undefined;
}

function customerIdFrom(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
): string | undefined {
  if (!customer) return undefined;
  return typeof customer === 'string' ? customer : customer.id;
}

export const billingRouter = Router();

billingRouter.get('/billing/status', (_req: Request, res: Response) => {
  res.json({
    enabled: Boolean(config.stripeSecretKey),
    webhookConfigured: Boolean(config.stripeWebhookSecret),
    signatureRequiredInProduction: true,
    webhookEvents: SUPPORTED_WEBHOOK_EVENTS,
    plans: Object.keys(config.quotas),
    prices: {
      pro: Boolean(config.stripePricePro),
      team: Boolean(config.stripePriceTeam),
    },
  });
});

billingRouter.post('/billing/checkout', authenticate, async (req: Request, res: Response) => {
  try {
    const plan = (req.body as { plan?: string })?.plan;
    if (plan !== 'pro' && plan !== 'team') {
      res.status(400).json({ error: 'plan must be "pro" or "team"' });
      return;
    }
    const priceId = priceIdForPlan(plan);
    if (!priceId) {
      res.status(503).json({ error: `Stripe price not configured for ${plan}` });
      return;
    }

    const account = req.account!;
    const stripe = getStripe();
    const successUrl =
      typeof (req.body as { successUrl?: string }).successUrl === 'string'
        ? (req.body as { successUrl: string }).successUrl
        : `${config.clientAppUrl}/?billing=success`;
    const cancelUrl =
      typeof (req.body as { cancelUrl?: string }).cancelUrl === 'string'
        ? (req.body as { cancelUrl: string }).cancelUrl
        : `${config.clientAppUrl}/?billing=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: account.email === 'anonymous@local' ? undefined : account.email,
      client_reference_id: account.id,
      metadata: { accountId: account.id, plan },
      subscription_data: { metadata: { accountId: account.id, plan } },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl.includes('{CHECKOUT_SESSION_ID}')
        ? successUrl
        : `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Checkout failed' });
  }
});

export async function applyCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const accountId = session.client_reference_id ?? session.metadata?.accountId;
  const plan = (session.metadata?.plan ?? null) as Plan | null;
  const resolvedPlan = plan === 'pro' || plan === 'team' ? plan : null;
  if (!accountId || !resolvedPlan) return;
  const customerId = customerIdFrom(session.customer);
  await setPlanAsync(accountId, resolvedPlan, customerId);
  console.log(`[billing] upgraded account ${accountId} → ${resolvedPlan}`);
}

export async function applySubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const customerId = customerIdFrom(subscription.customer);
  if (!customerId) return;

  const terminal = new Set(['canceled', 'unpaid', 'incomplete_expired']);
  if (terminal.has(subscription.status)) {
    if (subscription.status === 'canceled') {
      const account = await findByStripeCustomerIdAsync(customerId);
      if (account) {
        await setPlanAsync(account.id, 'free');
        console.log(`[billing] downgraded account ${account.id} → free (subscription canceled)`);
      }
    }
    return;
  }

  if (subscription.status !== 'active' && subscription.status !== 'trialing') return;

  const priceId = subscription.items.data[0]?.price?.id;
  const plan = planFromStripePriceId(priceId);
  if (!plan) {
    console.warn(`[billing] subscription.updated unknown price ${priceId ?? 'none'}`);
    return;
  }

  let account = await findByStripeCustomerIdAsync(customerId);
  const accountId = account?.id ?? subscription.metadata?.accountId;
  if (!accountId) return;

  await setPlanAsync(accountId, plan, customerId);
  console.log(`[billing] synced account ${accountId} → ${plan} (subscription.updated)`);
}

export async function applySubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId = customerIdFrom(subscription.customer);
  if (!customerId) return;
  const account = await findByStripeCustomerIdAsync(customerId);
  if (!account) return;
  await setPlanAsync(account.id, 'free');
  console.log(`[billing] downgraded account ${account.id} → free`);
}

export type BillingDispatchResult =
  | { status: 'duplicate'; type: string }
  | { status: 'processed'; type: string }
  | { status: 'ignored'; type: string };

/** Idempotent dispatch — safe for Stripe retries. */
export async function dispatchBillingEvent(event: Stripe.Event): Promise<BillingDispatchResult> {
  if (isWebhookEventProcessed(event.id)) {
    return { status: 'duplicate', type: event.type };
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await applyCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'customer.subscription.updated':
      await applySubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await applySubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = customerIdFrom(invoice.customer);
      console.warn(`[billing] invoice.payment_failed customer=${customerId ?? 'unknown'} invoice=${invoice.id}`);
      break;
    }
    default:
      return { status: 'ignored', type: event.type };
  }

  markWebhookEventProcessed(event.id);
  return { status: 'processed', type: event.type };
}

/** Parse and verify Stripe webhook body. Unsigned bodies allowed only in dev/test. */
export function parseStripeWebhook(raw: Buffer, signature: string | string[] | undefined): Stripe.Event {
  if (!Buffer.isBuffer(raw)) {
    throw new WebhookVerificationError('Expected raw body');
  }

  const sig = Array.isArray(signature) ? signature[0] : signature;
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  if (config.stripeWebhookSecret) {
    if (typeof sig !== 'string') {
      throw new WebhookVerificationError('Missing Stripe-Signature header');
    }
    return getStripe().webhooks.constructEvent(raw, sig, config.stripeWebhookSecret);
  }

  if (isProduction) {
    throw new WebhookVerificationError('STRIPE_WEBHOOK_SECRET is required in production');
  }

  if (!isTest) {
    console.warn('[billing] webhook processed without signature verification (dev mode)');
  }

  return JSON.parse(raw.toString('utf8')) as Stripe.Event;
}

/** Stripe webhook — verifies signature when STRIPE_WEBHOOK_SECRET is set. */
export async function billingWebhookHandler(req: Request, res: Response): Promise<void> {
  const raw = req.body as Buffer;
  if (!Buffer.isBuffer(raw)) {
    res.status(400).json({ error: 'Expected raw body' });
    return;
  }

  let event: Stripe.Event;
  try {
    event = parseStripeWebhook(raw, req.headers['stripe-signature']);
  } catch (e) {
    const status = e instanceof WebhookVerificationError ? 401 : 400;
    res.status(status).json({ error: e instanceof Error ? e.message : 'Invalid webhook payload' });
    return;
  }

  try {
    const result = await dispatchBillingEvent(event);
    res.json({ received: true, ...result });
  } catch (e) {
    console.error('[billing] webhook handler error', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Webhook processing failed' });
  }
}
