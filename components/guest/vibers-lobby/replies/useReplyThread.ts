'use client';

import { useEffect, useRef, useState } from 'react';
import { addLobbyReply, fetchLobbyReplies } from '@/lib/guest/lobby-engagement-client';
import type { LobbyReplyView } from '@/lib/services/lobby/lobby-reply-view';

export const isPending = (c: { id: string }) => c.id.startsWith('pending-');

/**
 * The comments under a post. A comment shows the moment it is sent and is taken back, with its words returned to the box,
 * if the venue could not take it. `onReplied` is told +1 on send and -1 if it has to be taken back.
 */
export function useReplyThread(venueId: string, postId: string, onReplied: (delta?: number) => void) {
  const [comments, setComments] = useState<LobbyReplyView[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const sending = useRef(false);

  useEffect(() => {
    let live = true;
    fetchLobbyReplies(venueId, postId).then((out) => {
      if (!live) return;
      if (out.ok) setComments(out.value); else setLoadError(out.error);
    });
    return () => { live = false; };
  }, [venueId, postId]);

  const send = async () => {
    const content = draft.trim();
    if (!content || sending.current) return;
    sending.current = true;
    setSendError(null);

    const tempId = `pending-${Date.now()}`;
    const pending = { id: tempId, content, created_at: new Date().toISOString(), author: null } as unknown as LobbyReplyView;
    setComments((prev) => [...(prev ?? []), pending]);
    setDraft('');
    onReplied(1);

    const out = await addLobbyReply(venueId, postId, content);
    sending.current = false;
    if (out.ok) {
      setComments((prev) => (prev ?? []).map((c) => (c.id === tempId ? out.value : c)));
    } else {
      setComments((prev) => (prev ?? []).filter((c) => c.id !== tempId));
      setDraft(content);
      setSendError(out.error);
      onReplied(-1);
    }
  };

  return { comments, error: loadError ?? sendError, loadFailed: Boolean(loadError), draft, setDraft, send };
}
