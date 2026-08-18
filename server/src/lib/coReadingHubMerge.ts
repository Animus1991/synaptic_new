/** Server-side merge for co-reading hubs — mirrors src/lib/coReadingHub.mergeCoReadingHubs. */

export type PeerDimensionVotes = {
  clarity: number;
  sourceGrounding: number;
  completeness: number;
  examUsefulness: number;
};

export type CoReadingHubStore = {
  roomId: string;
  challenges: Array<{
    id: string;
    roomId: string;
    sourceExcerpt: string;
    sourceRef: string;
    explanations: Array<{
      id: string;
      authorId: string;
      authorName: string;
      text: string;
      aiAssisted: boolean;
      votes: PeerDimensionVotes;
      voterIds: string[];
      createdAt: string;
      contentHash: string;
      readReceiptIds: string[];
    }>;
    exemplarId: string | null;
    createdById: string;
    createdByName: string;
    createdAt: string;
    events: unknown[];
  }>;
};

function emptyVotes(): PeerDimensionVotes {
  return { clarity: 0, sourceGrounding: 0, completeness: 0, examUsefulness: 0 };
}

function asVotes(raw: unknown): PeerDimensionVotes {
  const v = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    clarity: Number(v.clarity) || 0,
    sourceGrounding: Number(v.sourceGrounding) || 0,
    completeness: Number(v.completeness) || 0,
    examUsefulness: Number(v.examUsefulness) || 0,
  };
}

export function emptyCoReadingHub(roomId: string): CoReadingHubStore {
  return { roomId, challenges: [] };
}

export function parseCoReadingHub(raw: unknown, roomId: string): CoReadingHubStore | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  if (!Array.isArray(rec.challenges)) return null;
  const challenges: CoReadingHubStore['challenges'] = [];
  for (const item of rec.challenges) {
    if (!item || typeof item !== 'object') continue;
    const ch = item as Record<string, unknown>;
    if (typeof ch.id !== 'string' || typeof ch.sourceExcerpt !== 'string') continue;
    const explanations = Array.isArray(ch.explanations)
      ? ch.explanations.flatMap((ex) => {
          if (!ex || typeof ex !== 'object') return [];
          const e = ex as Record<string, unknown>;
          if (typeof e.id !== 'string' || typeof e.text !== 'string') return [];
          return [{
            id: e.id,
            authorId: typeof e.authorId === 'string' ? e.authorId : '',
            authorName: typeof e.authorName === 'string' ? e.authorName : '',
            text: e.text,
            aiAssisted: Boolean(e.aiAssisted),
            votes: asVotes(e.votes) ?? emptyVotes(),
            voterIds: Array.isArray(e.voterIds) ? e.voterIds.filter((id): id is string => typeof id === 'string') : [],
            createdAt: typeof e.createdAt === 'string' ? e.createdAt : new Date().toISOString(),
            contentHash: typeof e.contentHash === 'string' ? e.contentHash : '',
            readReceiptIds: Array.isArray(e.readReceiptIds)
              ? e.readReceiptIds.filter((id): id is string => typeof id === 'string')
              : [],
          }];
        })
      : [];
    challenges.push({
      id: ch.id,
      roomId,
      sourceExcerpt: ch.sourceExcerpt,
      sourceRef: typeof ch.sourceRef === 'string' ? ch.sourceRef : '',
      explanations,
      exemplarId: typeof ch.exemplarId === 'string' ? ch.exemplarId : null,
      createdById: typeof ch.createdById === 'string' ? ch.createdById : '',
      createdByName: typeof ch.createdByName === 'string' ? ch.createdByName : '',
      createdAt: typeof ch.createdAt === 'string' ? ch.createdAt : new Date().toISOString(),
      events: Array.isArray(ch.events) ? ch.events : [],
    });
  }
  return { roomId, challenges: challenges.slice(0, 40) };
}

export function mergeCoReadingHubs(a: CoReadingHubStore, b: CoReadingHubStore): CoReadingHubStore {
  const roomId = a.roomId || b.roomId;
  const byId = new Map<string, CoReadingHubStore['challenges'][number]>();
  for (const ch of [...a.challenges, ...b.challenges]) {
    const prev = byId.get(ch.id);
    if (!prev) {
      byId.set(ch.id, ch);
      continue;
    }
    const exById = new Map(prev.explanations.map((e) => [e.id, e]));
    for (const ex of ch.explanations) {
      const old = exById.get(ex.id);
      if (!old) {
        exById.set(ex.id, ex);
        continue;
      }
      exById.set(ex.id, {
        ...old,
        ...ex,
        votes: {
          clarity: Math.max(old.votes.clarity, ex.votes.clarity),
          sourceGrounding: Math.max(old.votes.sourceGrounding, ex.votes.sourceGrounding),
          completeness: Math.max(old.votes.completeness, ex.votes.completeness),
          examUsefulness: Math.max(old.votes.examUsefulness, ex.votes.examUsefulness),
        },
        voterIds: [...new Set([...old.voterIds, ...ex.voterIds])],
        readReceiptIds: [...new Set([...old.readReceiptIds, ...ex.readReceiptIds])],
      });
    }
    byId.set(ch.id, {
      ...prev,
      ...ch,
      explanations: [...exById.values()],
      exemplarId: ch.exemplarId ?? prev.exemplarId,
      events: ch.events.length >= prev.events.length ? ch.events : prev.events,
    });
  }
  return {
    roomId,
    challenges: [...byId.values()]
      .sort((x, y) => y.createdAt.localeCompare(x.createdAt))
      .slice(0, 40),
  };
}
