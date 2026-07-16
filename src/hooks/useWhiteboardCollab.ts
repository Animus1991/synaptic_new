import { useCallback, useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import type { WhiteboardDocument } from '../lib/whiteboardLayers';
import { migrateWhiteboardPayload } from '../lib/whiteboardLayers';
import {
  isWhiteboardDocEmpty,
  observeWhiteboardDoc,
  readWhiteboardDoc,
  writeWhiteboardDoc,
} from '../lib/whiteboardCrdt';
import { whiteboardDocumentName, type WhiteboardCollabConfig } from '../lib/whiteboardCollab';

type Args = {
  enabled: boolean;
  config?: WhiteboardCollabConfig;
  seedDoc: WhiteboardDocument;
  lang?: 'en' | 'el';
};

/** Shared whiteboard state via Yjs/Hocuspocus (Wave 3 COL-04). */
export function useWhiteboardCollab({ enabled, config, seedDoc, lang = 'en' }: Args) {
  const [doc, setDoc] = useState(seedDoc);
  const [synced, setSynced] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const docRef = useRef<Y.Doc | null>(null);
  const seededRef = useRef(false);
  const seedRef = useRef(seedDoc);
  seedRef.current = seedDoc;

  useEffect(() => {
    if (!enabled || !config?.roomId || !config.inviteCode || !config.wsUrl || !config.conceptKey) {
      setSynced(false);
      setConnecting(false);
      docRef.current = null;
      seededRef.current = false;
      return;
    }

    setConnecting(true);
    const ydoc = new Y.Doc();
    docRef.current = ydoc;

    const provider = new HocuspocusProvider({
      url: config.wsUrl,
      name: whiteboardDocumentName(config.roomId, config.conceptKey),
      token: config.inviteCode,
      document: ydoc,
      onSynced: () => {
        setSynced(true);
        setConnecting(false);
        if (!seededRef.current && isWhiteboardDocEmpty(ydoc) && seedRef.current.strokes.length > 0) {
          writeWhiteboardDoc(ydoc, seedRef.current);
          seededRef.current = true;
        }
        setDoc(readWhiteboardDoc(ydoc, lang));
      },
      onDisconnect: () => {
        setSynced(false);
        setConnecting(false);
      },
    });

    const unobserve = observeWhiteboardDoc(ydoc, (remote) => {
      setDoc(remote);
    }, lang);

    return () => {
      unobserve();
      provider.destroy();
      ydoc.destroy();
      docRef.current = null;
      seededRef.current = false;
      setSynced(false);
      setConnecting(false);
    };
  }, [enabled, config?.roomId, config?.inviteCode, config?.wsUrl, config?.conceptKey, lang]);

  const applyLocalDoc = useCallback((next: WhiteboardDocument) => {
    const normalized = migrateWhiteboardPayload(next, lang);
    setDoc(normalized);
    const ydoc = docRef.current;
    if (ydoc && synced) {
      writeWhiteboardDoc(ydoc, normalized);
    }
  }, [synced, lang]);

  const active = enabled && Boolean(config?.roomId && config?.inviteCode && config?.wsUrl);

  return {
    active,
    doc,
    synced,
    connecting,
    applyLocalDoc,
  };
}
