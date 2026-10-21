'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { addDays, todayIst } from '@/components/stay/stay-format';
import { newUuid } from '@/lib/utils/uuid';
import { confirmRequest, fail, quoteRequest, toQuote, type CollectSpec } from './collect-requests';

export type { CollectSpec };
export type Step = 'details' | 'review' | 'pay' | 'done';
export type Tender = 'UPI' | 'CASH' | 'CARD';
export interface QuoteLine { id: string; name: string; price: number; qty: number; notes?: string }
export interface Quote { lines: QuoteLine[]; amount: number; title: string; subtitle: string; guestName: string; guestPhone: string | null }
export interface Receipt { quote: Quote; tender: Tender | null; reference: string; paidAt: string; link: string | null; passId: string | null; billId: string | null }
export interface WalkIn { categoryId: string; nights: number; guestName: string; guestPhone: string; guests: number }

/**
 * The desk's payment step, for a stay (a booking, or a walk-in), a late check-out, or a payment during the stay: the
 * server quotes what is owed, the guest pays directly (UPI to the venue, cash or card), the desk confirms receipt, and
 * the server writes the settled bill (and, for a stay, issues the check-in pass). One idempotency key per sheet.
 */
export function useCollect(spec: CollectSpec) {
  const booking = spec.kind === 'pass' ? spec.booking : null;
  const [step, setStep] = useState<Step>(spec.kind === 'pass' && !spec.booking ? 'details' : spec.kind === 'pass' && spec.showLink ? 'done' : 'review');
  const [walk, setWalk] = useState<WalkIn>({ categoryId: '', nights: 1, guestName: '', guestPhone: '', guests: 2 });
  const [earlyId, setEarlyId] = useState<string | null | undefined>(undefined);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [tender, setTender] = useState<Tender>('UPI');
  const [reference, setReference] = useState('');
  const [received, setReceived] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idem = useRef(newUuid());

  const stayBody = useCallback(() => ({
    booking_id: booking?.id, category_id: walk.categoryId || undefined, check_out: addDays(todayIst(), walk.nights),
    guest_name: walk.guestName, guest_phone: walk.guestPhone, guests: walk.guests, early_option_id: earlyId,
  }), [booking?.id, walk, earlyId]);

  /** Asks the server what is owed; the screen never works out money itself. */
  const requote = useCallback(async () => {
    setError(null);
    const r = await quoteRequest(spec, stayBody);
    if (!r.ok) { setError(fail(r, 'The amount could not be worked out.')); setQuote(null); return false; }
    setQuote(toQuote(spec, r.data));
    if (r.data.early_option_id !== undefined) setEarlyId((cur) => (cur === undefined ? r.data.early_option_id : cur));
    return true;
  }, [spec, stayBody]);

  useEffect(() => { if (step === 'review') void requote(); }, [step, earlyId]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Show link": the pass already exists; fetch it (the link is derived on the server) and go straight to the receipt.
  useEffect(() => {
    if (spec.kind !== 'pass' || !spec.showLink || !booking) return;
    void (async () => {
      const res = await fetch(`/api/host/accommodations/passes?booking_id=${booking.id}`, { cache: 'no-store' }).catch(() => null);
      const p = res ? (await res.json().catch(() => ({}))).passes?.[0] : null;
      if (!p) { setError('The check-in link could not be loaded.'); return; }
      setReceipt({ quote: { lines: p.lines, amount: p.amount, title: booking.category?.name || 'Room', subtitle: `${p.nights} night${p.nights === 1 ? '' : 's'} · ${p.check_in} → ${p.check_out}`, guestName: p.guest_name, guestPhone: p.guest_phone }, tender: p.payment_method, reference: p.payment_reference || '', paidAt: p.paid_at, link: p.link, passId: p.id, billId: p.bill_order_id || null });
    })();
  }, [spec.kind, booking]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirm = async () => {
    // A free item (a late check-out the owner offers at no charge) has no money to confirm.
    if (!quote || busy || (!received && quote.amount > 0)) return;
    setBusy(true); setError(null);
    const base = quote.amount > 0 ? { payment_method: tender, payment_reference: reference, idempotency_key: idem.current } : { payment_method: 'CASH', idempotency_key: idem.current };
    const r = await confirmRequest(spec, stayBody, base, quote.amount);
    setBusy(false);
    if (!r.ok) { setError(fail(r, 'The payment could not be recorded.')); return; }
    setReceipt({ quote, tender: quote.amount > 0 ? tender : null, reference: reference.trim(), paidAt: new Date().toISOString(), link: r.data.pass?.link || null, passId: r.data.pass?.id || null, billId: r.data.pass?.bill_order_id || r.data.billId || null });
    setStep('done');
  };

  return { requote, step, setStep, walk, setWalk, earlyId, setEarlyId, quote, tender, setTender, reference, setReference, received, setReceived, receipt, setReceipt, busy, error, setError, confirm, booking };
}
