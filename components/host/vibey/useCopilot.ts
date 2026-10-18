'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';
import type { VibeyHostReply } from '@/lib/vibey/host/schema';

export interface CopilotMsg { id: string; role: 'host' | 'vibey'; text: string; reply?: VibeyHostReply }

const uid = () => Math.random().toString(36).slice(2, 10);

/**
 * The co-pilot's state for one venue. Every call names the venue in the URL (?business_id=), which requireHost checks
 * against the signed-in host's own venues, so a host with two venues always asks about the one on screen.
 */
export function useCopilot(venueId: string, tab: string, unlocked: boolean) {
  const [enabled, setEnabled] = useState(false);
  const [messages, setMessages] = useState<CopilotMsg[]>([]);
  const [sending, setSending] = useState(false);
  const busy = useRef(false);
  const q = `?business_id=${encodeURIComponent(venueId)}`;

  useEffect(() => {
    if (!venueId) return;
    let live = true;
    apiRequest(`/api/host/vibey${q}`).then((r) => { if (live) setEnabled(Boolean(r.ok && r.data?.enabled)); });
    return () => { live = false; };
  }, [venueId, q]);

  const send = useCallback(async (raw: string) => {
    const text = raw.trim().slice(0, 300);
    if (!text || busy.current) return;
    busy.current = true;
    setSending(true);
    setMessages((ms) => [...ms, { id: uid(), role: 'host', text }]);
    const r = await apiRequest<VibeyHostReply>(`/api/host/vibey${q}`, jsonRequest('POST', { text, unlocked, tab }));
    busy.current = false;
    setSending(false);
    setMessages((ms) => [...ms, r.ok && r.data
      ? { id: uid(), role: 'vibey', text: r.data.reply, reply: r.data }
      : { id: uid(), role: 'vibey', text: r.error || 'Vibey could not answer just now. The tabs still have every number.' }]);
  }, [q, unlocked, tab]);

  return { enabled, messages, sending, send };
}
