'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest, jsonRequest } from '@/lib/utils/api-client';
import type { MenuItem } from '@/components/guest/menu/types';
import type { StaffReason, VibeyContext, VibeyGuestReply } from '@/lib/vibey/guest/schema';
import { askVibey } from './ask-vibey';
import { applyActions, trayForVibey, undoApplied, type Applied } from './apply-actions';

export interface VibeyMsg {
  id: string;
  role: 'guest' | 'vibey';
  text: string;
  reply?: VibeyGuestReply;
  applied?: Pick<Applied, 'lines' | 'before' | 'after'>;
  undone?: boolean;
  staff?: StaffReason | null;
  staffSent?: boolean;
}

interface Options {
  venueId: string;
  tableNumber: string;
  menu: MenuItem[];
  onNeedOptions: (item: MenuItem) => void;
  onOpenTray: () => void;
  showToast: (msg: string) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

/** The guest's conversation with Vibey: status, messages, sending, Undo and calling staff. */
export function useVibeyGuest({ venueId, tableNumber, menu, onNeedOptions, onOpenTray, showToast }: Options) {
  const [status, setStatus] = useState<{ enabled: boolean; simple: boolean }>({ enabled: false, simple: false });
  const [messages, setMessages] = useState<VibeyMsg[]>([]);
  const [sending, setSending] = useState(false);
  /** The live steps of the answer being prepared (empty when idle). */
  const [steps, setSteps] = useState<string[]>([]);
  /** The reply still typing itself out; its dishes and suggestions appear once it has finished. */
  const [typingId, setTypingId] = useState<string | null>(null);
  const doneTyping = useCallback(() => setTypingId(null), []);
  const busy = useRef(false);
  // What Vibey remembers between turns (the dishes it just showed, a question it is waiting on); sent back each time.
  const context = useRef<VibeyContext | undefined>(undefined);

  useEffect(() => {
    if (!venueId) return;
    let live = true;
    apiRequest(`/api/guest/vibey?cafe_id=${encodeURIComponent(venueId)}`).then((r) => {
      if (live && r.ok && r.data) setStatus({ enabled: Boolean(r.data.enabled), simple: Boolean(r.data.simple) });
    });
    return () => { live = false; };
  }, [venueId]);

  /** A tapped suggestion sends its English text (`chip`) while the guest sees it in their own language (`label`). */
  const send = useCallback(async (raw: string, opts: { chip?: boolean; label?: string } = {}) => {
    const text = raw.trim().slice(0, 300);
    if (!text || busy.current) return;
    busy.current = true;
    setSending(true);
    setTypingId(null);
    const history = messages.slice(-6).map((m) => ({ role: m.role, text: m.text.slice(0, 600) }));
    setMessages((ms) => [...ms, { id: uid(), role: 'guest', text: (opts.label || text).slice(0, 300) }]);
    setSteps(['read']);
    const r = await askVibey(
      { cafe_id: venueId, table_number: tableNumber, text, history, tray: trayForVibey(), ...(opts.chip ? { chip: true } : {}), ...(context.current ? { context: context.current } : {}) },
      (step) => setSteps((s) => (s.includes(step) ? s : [...s, step])),
    );
    busy.current = false;
    setSending(false);
    setSteps([]);
    const id = uid();
    setTypingId(id);
    if (!r.ok) {
      setMessages((ms) => [...ms, { id, role: 'vibey', text: r.error }]);
      return;
    }
    const reply = r.reply;
    context.current = reply.meta.context;
    const applied = applyActions(reply.actions, menu);
    const extra = applied.needsOptions.length ? ` ${applied.needsOptions[0].name} has options, so pick them first.` : '';
    setMessages((ms) => [...ms, {
      id, role: 'vibey', text: reply.reply + extra, reply, staff: applied.staff,
      applied: applied.lines.length ? { lines: applied.lines, before: applied.before, after: applied.after } : undefined,
    }]);
    if (applied.needsOptions.length) onNeedOptions(applied.needsOptions[0]);
    else if (applied.openTray) onOpenTray();
  }, [messages, venueId, tableNumber, menu, onNeedOptions, onOpenTray]);

  const undo = useCallback((id: string) => {
    const msg = messages.find((m) => m.id === id);
    if (!msg?.applied) return;
    if (undoApplied(msg.applied)) {
      setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, undone: true } : m)));
      showToast('Undone');
    } else showToast('Your tray changed since then, so there is nothing to undo.');
  }, [messages, showToast]);

  const callStaff = useCallback(async (id: string, reason: StaffReason) => {
    const r = await apiRequest('/api/guest/call-staff', jsonRequest('POST', {
      venue_id: venueId, table_number: tableNumber, type: reason === 'bill' ? 'BILL' : 'WAITER',
      message: reason === 'dietary' ? 'Vibey: a guest has a dietary or allergy question' : reason === 'bill' ? 'Vibey: a guest asked for the bill' : 'Vibey: a guest asked for help',
    }));
    if (r.ok) setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, staffSent: true } : m)));
    showToast(r.ok ? 'The staff have been told. Someone will come to your table.' : "Couldn't reach the staff. Please wave to a waiter.");
  }, [venueId, tableNumber, showToast]);

  return { status, messages, sending, steps, typingId, doneTyping, send, undo, callStaff };
}
