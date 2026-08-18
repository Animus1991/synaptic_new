/**
 * Study-room co-reading hubs (challenges + votes).
 * In-memory always; durable via study_room_coreading when DATABASE_URL is set.
 */

import { config } from '../config';
import {
  emptyCoReadingHub,
  mergeCoReadingHubs,
  parseCoReadingHub,
  type CoReadingHubStore,
} from '../lib/coReadingHubMerge';
import { createCoReadingPgRepo } from './coReadingPgStore';

const hubs = new Map<string, CoReadingHubStore>();
const pgRepo = createCoReadingPgRepo(config.databaseUrl);

export async function getCoReadingHubAsync(roomId: string): Promise<CoReadingHubStore> {
  if (pgRepo) {
    const row = await pgRepo.get(roomId);
    if (row) {
      hubs.set(roomId, row);
      return row;
    }
  }
  return hubs.get(roomId) ?? emptyCoReadingHub(roomId);
}

export async function upsertCoReadingHubAsync(
  roomId: string,
  incoming: CoReadingHubStore,
): Promise<CoReadingHubStore> {
  const current = await getCoReadingHubAsync(roomId);
  const merged = mergeCoReadingHubs(current, { ...incoming, roomId });
  hubs.set(roomId, merged);
  if (pgRepo) {
    try {
      await pgRepo.upsert(merged);
    } catch (err) {
      console.warn('[coreading] persist failed', err);
    }
  }
  return merged;
}

export function resetCoReadingStore(): void {
  hubs.clear();
}

export { parseCoReadingHub, emptyCoReadingHub };
export type { CoReadingHubStore };
