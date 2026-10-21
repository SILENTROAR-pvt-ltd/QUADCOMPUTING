import type { Quote } from './useCollect';

// Which server call each kind of payment makes, and how its answer reads as a quote. The sheet itself never works out money.

export type CollectSpec =
  | { kind: 'pass'; booking: import('../useStayBookings').StayBooking | null; showLink?: boolean }
  | { kind: 'late'; roomId: string; optionId: string }
  /** A payment during the stay: the room at check-in ('stay'), or whatever stands on the bill now ('balance'). `amount` takes part of it (an advance). */
  | { kind: 'room'; roomId: string; purpose: 'stay' | 'balance'; amount?: number | null };

export interface CallResult { ok: boolean; data: any; offline: boolean }

export const post = async (url: string, body: unknown): Promise<CallResult> => {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
  const data = res ? await res.json().catch(() => ({})) : {};
  return { ok: Boolean(res?.ok && data.success), data, offline: !res };
};

export const fail = (r: CallResult, fallback: string) => (r.offline ? 'No connection. Nothing was recorded; check the network and try again.' : r.data?.error || fallback);

const nights = (n: number) => `${n} night${n === 1 ? '' : 's'}`;

/** Asks the server what is owed for this spec. */
export function quoteRequest(spec: CollectSpec, stayBody: () => Record<string, unknown>): Promise<CallResult> {
  if (spec.kind === 'late') return post(`/api/host/accommodations/rooms/${spec.roomId}/late-checkout`, { action: 'preview', option_id: spec.optionId });
  if (spec.kind === 'room') return post(`/api/host/accommodations/rooms/${spec.roomId}/payment`, { action: 'preview' });
  return post('/api/host/accommodations/passes', { ...stayBody(), preview: true });
}

/** Records the money for this spec; `base` carries the tender, the reference and the sheet's idempotency key. */
export function confirmRequest(spec: CollectSpec, stayBody: () => Record<string, unknown>, base: Record<string, unknown>, amount: number): Promise<CallResult> {
  if (spec.kind === 'late') return post(`/api/host/accommodations/rooms/${spec.roomId}/late-checkout`, { action: 'grant', option_id: spec.optionId, ...base });
  if (spec.kind === 'room') return post(`/api/host/accommodations/rooms/${spec.roomId}/payment`, { action: 'record', amount, purpose: spec.purpose, ...base });
  return post('/api/host/accommodations/passes', { ...stayBody(), ...base });
}

/** The server's answer as the sheet shows it. */
export function toQuote(spec: CollectSpec, d: any): Quote {
  if (spec.kind === 'late') return { lines: d.quote.lines, amount: d.quote.amount, title: `Late check-out · Room ${d.room_number}`, subtitle: 'Paid now, added to the stay as a credit', guestName: d.guest_name || 'Guest', guestPhone: null };
  if (spec.kind === 'room') {
    // An advance chosen at check-in: part of what is owed, never more than it.
    const owed = Number(d.quote.amount) || 0;
    const amount = spec.amount && spec.amount > 0 ? Math.min(owed, spec.amount) : owed;
    const partial = amount < owed;
    return { lines: d.quote.lines, amount, title: `${spec.purpose === 'stay' ? (partial ? 'Advance' : 'Room payment') : 'Pay now'} · Room ${d.room_number}`,
      subtitle: partial ? `₹${Math.round(owed - amount).toLocaleString('en-IN')} of ₹${Math.round(owed).toLocaleString('en-IN')} stays on the room bill for checkout`
        : d.paid_so_far > 0 ? `₹${Number(d.paid_so_far).toLocaleString('en-IN')} paid so far · balance now` : 'Owed so far; anything ordered later is paid at checkout', guestName: d.guest_name || 'Guest', guestPhone: null };
  }
  return { lines: d.quote.lines, amount: d.quote.amount, title: d.category, subtitle: `${nights(d.quote.nights)} · ${d.check_in} → ${d.check_out}`, guestName: d.guest.name, guestPhone: d.guest.phone };
}
