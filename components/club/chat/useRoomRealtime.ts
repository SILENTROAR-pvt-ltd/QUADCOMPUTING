'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Live signals for one chat room over Supabase Realtime broadcast: "someone is typing" and "new
 * message, refetch". Nothing private travels here; message content always comes from the API.
 */
export function useRoomRealtime(roomId: string | null, myName: string, onNewMessage: () => void) {
  const [typing, setTyping] = useState<string[]>([]);
  const channel = useRef<any>(null);
  const lastTyped = useRef(0);
  const refetch = useRef(onNewMessage);
  refetch.current = onNewMessage;

  useEffect(() => {
    if (!roomId) return;
    const supabase = createClient();
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const ch = supabase.channel(`club-room:${roomId}`, { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'typing' }, ({ payload }: any) => {
      const name = String(payload?.name || '').slice(0, 40);
      if (!name) return;
      setTyping((t) => (t.includes(name) ? t : [...t, name]));
      clearTimeout(timers.get(name));
      timers.set(name, setTimeout(() => setTyping((t) => t.filter((n) => n !== name)), 3500));
    });
    ch.on('broadcast', { event: 'message' }, () => refetch.current());
    ch.subscribe();
    channel.current = ch;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      void supabase.removeChannel(ch);
      channel.current = null;
      setTyping([]);
    };
  }, [roomId]);

  return {
    typing,
    sendTyping: () => {
      if (Date.now() - lastTyped.current < 2000) return;
      lastTyped.current = Date.now();
      void channel.current?.send({ type: 'broadcast', event: 'typing', payload: { name: myName } });
    },
    announceMessage: () => void channel.current?.send({ type: 'broadcast', event: 'message', payload: {} }),
  };
}
