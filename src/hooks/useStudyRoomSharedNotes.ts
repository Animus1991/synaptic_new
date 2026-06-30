import { useCallback, useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { STUDY_ROOM_NOTES_FIELD, studyRoomDocumentName } from '../lib/studyRoomCollab';

type Args = {
  roomId: string | null;
  inviteCode: string | null;
  wsUrl: string | null;
  enabled: boolean;
};

export function useStudyRoomSharedNotes({ roomId, inviteCode, wsUrl, enabled }: Args) {
  const [text, setText] = useState('');
  const [synced, setSynced] = useState(false);
  const yTextRef = useRef<Y.Text | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const applyingRemote = useRef(false);

  useEffect(() => {
    if (!enabled || !roomId || !inviteCode || !wsUrl) {
      setSynced(false);
      yTextRef.current = null;
      docRef.current = null;
      return;
    }

    const doc = new Y.Doc();
    const yText = doc.getText(STUDY_ROOM_NOTES_FIELD);
    docRef.current = doc;
    yTextRef.current = yText;

    const provider = new HocuspocusProvider({
      url: wsUrl,
      name: studyRoomDocumentName(roomId),
      token: inviteCode,
      document: doc,
      onSynced: () => setSynced(true),
      onDisconnect: () => setSynced(false),
    });

    const observer = () => {
      applyingRemote.current = true;
      setText(yText.toString());
      applyingRemote.current = false;
    };
    yText.observe(observer);
    setText(yText.toString());

    return () => {
      yText.unobserve(observer);
      provider.destroy();
      doc.destroy();
      yTextRef.current = null;
      docRef.current = null;
      setSynced(false);
    };
  }, [enabled, roomId, inviteCode, wsUrl]);

  const updateText = useCallback((next: string) => {
    setText(next);
    if (applyingRemote.current) return;
    const yText = yTextRef.current;
    const doc = docRef.current;
    if (!yText || !doc) return;
    doc.transact(() => {
      yText.delete(0, yText.length);
      if (next) yText.insert(0, next);
    });
  }, []);

  return { text, updateText, synced };
}
