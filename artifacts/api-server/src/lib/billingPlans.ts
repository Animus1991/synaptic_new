import { config, type Plan } from '../config';

/** Map configured Stripe price IDs to Synapse plans. */
export function planFromStripePriceId(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  if (config.stripePriceTeam && priceId === config.stripePriceTeam) return 'team';
  if (config.stripePricePro && priceId === config.stripePricePro) return 'pro';
  return null;
}

export const SUPPORTED_WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
] as const;
