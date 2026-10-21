'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FrontDeskContact } from '@/lib/guest/front-desk';
import type { StayInvoiceView } from '@/components/stay/stay-invoice';
import { fetchRoomState, postRoomAction, verifyRoom } from './room-stay-api';
import { markCheckedOut, rememberStay, type LastStay } from './last-stay';

export interface RoomState {
  room: { id: string; room_number: string; status: string; guest_first_name: string | null; check_in_time: string | null; check_out_time: string | null; total_guests: number; category: { name: string; price: number; amenities: string[]; photos: string[] } | null };
  business: { id: string; name: string; slug: string | null; in_room_dining_enabled: boolean; checkout_time: string | null; gstin: string | null; address: string | null; front_desk: FrontDeskContact };
  occupied: boolean;
  verified: boolean;
  dining: { enabled: boolean; open: boolean; message: string; opens_at: string | null; closes_at: string | null };
  folio: null | {
    nights: number; tariff_total: number; addons_total: number; extras_total: number; dining_total: number; total: number; advance_paid: number; advance_total: number; balance: number;
    lines: Array<{ id: string; name: string; price: number; qty: number; notes?: string; type: string }>;
    orders: Array<{ id: string; created_at: string; status: string; grand_total: number; items: Array<{ name: string; qty: number; price: number }> }>;
  };
  /** The room's tax invoice as the desk issued it; null for a stay the desk checked in without a pass. */
  invoice: null | (StayInvoiceView & { guests: number; check_in: string; check_out: string; nights: number });
  late_checkout: null | {
    current: string | null;
    options: Array<{ id: string; label: string; time: string; fee: number }>;
    request: null | { status: 'pending' | 'declined'; label: string; fee: number };
    /** False when another guest is due in a room of this type after the check-out: the time cannot be extended. */
    available: boolean;
  };
  /** The guest has said they are ready to leave; the desk is preparing the bill. */
  checkout_request: null | { status: 'pending'; requested_at: string; note: string | null };
}

/**
 * The in-room page's state, re-read after every action and on a timer; the guest proves the room is theirs once per
 * stay. When the desk checks the stay out, the room has nothing to show, so the page keeps what it knew and reports the
 * stay as over (`checkedOut`), with `justLeft` true the first time this open page sees it, for the farewell sheet.
 */
export function useRoomStay(code: string) {
  const [data, setData] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedOut, setCheckedOut] = useState<LastStay | null>(null);
  const [justLeft, setJustLeft] = useState(false);
  const wasLive = useRef(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    const res = await fetchRoomState(code);
    setLoading(false);
    if (!res.data) { setError(res.error); return; }
    const d = res.data as RoomState;
    if (d.occupied && d.verified && d.folio) {
      rememberStay(code, { roomNumber: d.room.room_number, venue: { id: d.business.id, name: d.business.name, slug: d.business.slug }, nights: d.folio.nights, total: d.folio.total, dining: d.folio.dining_total, checkIn: d.room.check_in_time });
      setCheckedOut(null);
    } else if (!d.occupied) {
      const last = markCheckedOut(code);
      setCheckedOut(last);
      if (last && wasLive.current) setJustLeft(true);
    }
    wasLive.current = Boolean(d.occupied && d.verified);
    setData(d); setError(null);
  }, [code]);
  useEffect(() => { void load(); }, [load]);

  // The bill, the kitchen hours and the desk's answers move while the guest watches; a light refresh keeps them current.
  useEffect(() => {
    if (!data?.verified) return;
    const waiting = data.late_checkout?.request?.status === 'pending' || Boolean(data.checkout_request);
    const t = setInterval(() => void load(true), waiting ? 15_000 : 45_000);
    return () => clearInterval(t);
  }, [data?.verified, data?.late_checkout?.request?.status, data?.checkout_request, load]);

  const verify = async (last4: string) => { const err = await verifyRoom(code, last4); if (!err) await load(true); return err; };
  const send = async (path: string, body: unknown, ok: string) => {
    const r = await postRoomAction(code, path, body, ok);
    if (r.ok && path !== 'service') void load(true);
    return r.message;
  };
  const request = (kind: string, message?: string) => send('service', { kind, message }, 'The desk has been told.');
  const requestLateCheckout = (optionId: string) => send('late-checkout', { option_id: optionId }, 'Requested. The desk will confirm.');
  const requestCheckout = (action: 'request' | 'cancel', note?: string) =>
    send('checkout-request', { action, note }, action === 'cancel' ? 'Taken back.' : 'The desk is preparing your bill.');

  return { data, loading, error, checkedOut, justLeft, dismissLeft: () => setJustLeft(false), reload: load, verify, request, requestLateCheckout, requestCheckout };
}
