import { useCallback, useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import type { ConceptMapGraphSave } from '../lib/conceptMapGraph';
import {
  isConceptMapGraphEmpty,
  observeConceptMapGraph,
  readConceptMapGraph,
  writeConceptMapGraph,
} from '../lib/conceptMapCrdt';
import { conceptMapDocumentName, type ConceptMapCollabConfig } from '../lib/conceptMapCollab';

type Args = {
  enabled: boolean;
  config?: ConceptMapCollabConfig;
  seedGraph: ConceptMapGraphSave;
};

export function useConceptMapCollab({ enabled, config, seedGraph }: Args) {
  const [graph, setGraph] = useState(seedGraph);
  const [synced, setSynced] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const docRef = useRef<Y.Doc | null>(null);
  const seededRef = useRef(false);
  const seedRef = useRef(seedGraph);
  seedRef.current = seedGraph;

  useEffect(() => {
    if (!enabled || !config?.roomId || !config.inviteCode || !config.wsUrl || !config.conceptKey) {
      setSynced(false);
      setConnecting(false);
      docRef.current = null;
      seededRef.current = false;
      return;
    }

    setConnecting(true);
    const doc = new Y.Doc();
    docRef.current = doc;

    const provider = new HocuspocusProvider({
      url: config.wsUrl,
      name: conceptMapDocumentName(config.roomId, config.conceptKey),
      token: config.inviteCode,
      document: doc,
      onSynced: () => {
        setSynced(true);
        setConnecting(false);
        if (!seededRef.current && isConceptMapGraphEmpty(doc)) {
          writeConceptMapGraph(doc, seedRef.current);
          seededRef.current = true;
        }
        setGraph(readConceptMapGraph(doc));
      },
      onDisconnect: () => {
        setSynced(false);
        setConnecting(false);
      },
    });

    const unobserve = observeConceptMapGraph(doc, (remote: ConceptMapGraphSave) => {
      setGraph(remote);
    });

    return () => {
      unobserve();
      provider.destroy();
      doc.destroy();
      docRef.current = null;
      seededRef.current = false;
      setSynced(false);
      setConnecting(false);
    };
  }, [enabled, config?.roomId, config?.inviteCode, config?.wsUrl, config?.conceptKey]);

  const applyLocalGraph = useCallback((next: ConceptMapGraphSave) => {
    setGraph(next);
    const doc = docRef.current;
    if (doc && synced) {
      writeConceptMapGraph(doc, next);
    }
  }, [synced]);

  const active = enabled && Boolean(config?.roomId && config?.inviteCode && config?.wsUrl);

  return {
    active,
    nodes: graph.nodes,
    edges: graph.edges,
    synced,
    connecting,
    applyLocalGraph,
  };
}
