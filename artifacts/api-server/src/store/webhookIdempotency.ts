/** In-memory Stripe webhook idempotency (single-instance; move to Redis for multi-replica). */

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 20_000;

const processedAt = new Map<string, number>();

function prune(): void {
  const now = Date.now();
  for (const [id, at] of processedAt) {
    if (now - at > TTL_MS) processedAt.delete(id);
  }
  while (processedAt.size > MAX_ENTRIES) {
    const oldest = processedAt.keys().next().value;
    if (!oldest) break;
    processedAt.delete(oldest);
  }
}

export function isWebhookEventProcessed(eventId: string): boolean {
  prune();
  const at = processedAt.get(eventId);
  if (!at) return false;
  if (Date.now() - at > TTL_MS) {
    processedAt.delete(eventId);
    return false;
  }
  return true;
}

export function markWebhookEventProcessed(eventId: string): void {
  prune();
  processedAt.set(eventId, Date.now());
}

/** Test helper */
export function resetWebhookIdempotency(): void {
  processedAt.clear();
}
