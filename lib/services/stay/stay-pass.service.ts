import { randomUUID } from 'crypto';
import { todayIst } from '@/lib/services/reservations/venue-hours.service';
import { loadOpenBooking, type OpenBooking } from './booking-link.service';
import { hashPassToken, looksLikePassToken, passToken } from './pass-token';
import { earlyOptionOf, findOption, policyFee, type PolicyOption, type StayPolicies } from './stay-policy';
import { MAX_NIGHTS, nightsBetween } from './stay-booking.service';
import { stampAdvanceBillOwner } from './advance-bill-owner';
import { readCashTender } from '@/lib/services/billing/cash-tender';

// Paid self check-in. The desk bills the room (direct UPI, cash or card, taken and confirmed the way a table bill is),
// and that payment issues a pass: the quote that was billed plus a link only that guest holds. Self check-in works only
// with a pass, so a room is never released before it is paid, and the money side is decided by staff, not by a link.

export type StayPassCode = 'INVALID' | 'NOT_FOUND' | 'CONFLICT' | 'USED' | 'EXPIRED' | 'VOID' | 'FAILED';
export class StayPassError extends Error {
  constructor(public code: StayPassCode, message: string) { super(message); }
}

export const TENDERS = ['UPI', 'CASH', 'CARD'] as const;
export type Tender = (typeof TENDERS)[number];

/**
 * How the guest paid, as the desk confirms it. UPI and card must carry the reference from the bank or the slip, so every
 * advance bill can be matched to a real receipt later; cash needs none.
 */
export function readTender(method: unknown, ref: unknown, opts: { referenceOptional?: boolean } = {}): { tender: Tender; reference: string } {
  const tender = String(method || '').toUpperCase() as Tender;
  if (!TENDERS.includes(tender)) throw new StayPassError('INVALID', 'Choose how the guest paid: UPI, cash or card.');
  const reference = typeof ref === 'string' ? ref.replace(/\s+/g, ' ').trim().slice(0, 40) : '';
  // The till's receipt confirms a UPI payment with a tick rather than a reference, as every table bill is.
  if (tender !== 'CASH' && reference.length < 4 && !opts.referenceOptional) {
    throw new StayPassError('INVALID', tender === 'UPI' ? 'Enter the UPI reference (UTR) shown in your bank or UPI app.' : 'Enter the card approval code from the slip.');
  }
  return { tender, reference };
}

export interface QuoteLine { id: string; name: string; price: number; qty: number; notes?: string; type: 'room_tariff' | 'early_checkin' }
export interface StayQuote { nights: number; lines: QuoteLine[]; tariff: number; earlyFee: number; amount: number }

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PHONE = /^[0-9]{10}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const addDays = (d: string, n: number) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

/** What the room costs: the nights at the type's rate, plus the early check-in fee if one was chosen. Always computed here. */
export function quoteStay(p: { categoryName: string; rate: number; checkIn: string; checkOut: string; early?: PolicyOption | null }): StayQuote {
  const nights = Math.max(1, nightsBetween(p.checkIn, p.checkOut));
  const rate = Number(p.rate) || 0;
  const lines: QuoteLine[] = [{
    id: 'tariff', name: `${p.categoryName} · ${nights} night${nights === 1 ? '' : 's'}`, price: rate, qty: nights, type: 'room_tariff',
    notes: `${nights} night${nights === 1 ? '' : 's'} × ₹${rate.toLocaleString('en-IN')}`,
  }];
  const tariff = rate * nights;
  let earlyFee = 0;
  if (p.early) {
    earlyFee = policyFee(p.early, rate);
    if (earlyFee > 0) lines.push({ id: 'early-checkin', name: p.early.label, price: earlyFee, qty: 1, type: 'early_checkin', notes: `From ${p.early.time}` });
  }
  return { nights, lines, tariff, earlyFee, amount: tariff + earlyFee };
}

export interface PassRequest {
  bookingId?: string | null; categoryId?: string | null; checkOut?: string | null;
  guestName?: string; guestPhone?: string; guestEmail?: string | null; guests?: number;
  /** undefined follows the booking's stated arrival; null means no early check-in. */
  earlyOptionId?: string | null;
}

export interface ResolvedStay {
  booking: OpenBooking | null; category: { id: string; name: string; price: number };
  guest: { name: string; phone: string; email: string | null; guests: number };
  checkIn: string; checkOut: string; early: PolicyOption | null; quote: StayQuote;
}

/** Everything a pass is made from, validated: the booking or the walk-in, the room type, the dates, and the quote. */
export async function resolveStay(db: any, businessId: string, req: PassRequest, policies: StayPolicies, today = todayIst()): Promise<ResolvedStay> {
  let booking: OpenBooking | null = null;
  if (req.bookingId) {
    booking = await loadOpenBooking(db, businessId, req.bookingId);
    if (!booking) throw new StayPassError('NOT_FOUND', 'That booking is no longer open. Refresh the bookings list.');
  }
  const categoryId = booking?.category_id || req.categoryId || '';
  const { data: category, error } = categoryId
    ? await db.from('room_categories').select('id, name, price').eq('id', categoryId).eq('business_id', businessId).maybeSingle()
    : { data: null, error: null };
  if (error) throw new StayPassError('FAILED', 'Could not read the room type.');
  if (!category) throw new StayPassError('NOT_FOUND', 'Choose a room type.');

  const checkIn = booking ? booking.check_in : today;
  const checkOut = booking ? booking.check_out : String(req.checkOut || '');
  if (!DATE.test(checkOut)) throw new StayPassError('INVALID', 'Choose the check-out date.');
  if (checkOut <= today) throw new StayPassError('INVALID', booking ? 'This booking\'s dates have passed. Cancel it and make a new stay.' : 'Check-out must be after today.');
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1 || nights > MAX_NIGHTS) throw new StayPassError('INVALID', `A stay is between 1 and ${MAX_NIGHTS} nights.`);

  const guest = booking
    ? { name: booking.guest_name, phone: booking.guest_phone, email: booking.guest_email || null, guests: booking.guests }
    : { name: String(req.guestName || '').replace(/\s+/g, ' ').trim().slice(0, 60), phone: String(req.guestPhone || '').replace(/\D/g, '').slice(-10), email: req.guestEmail ? String(req.guestEmail).trim().slice(0, 120) : null, guests: Number(req.guests) || 1 };
  if (guest.name.length < 2) throw new StayPassError('INVALID', 'Enter the guest name.');
  if (!PHONE.test(guest.phone)) throw new StayPassError('INVALID', 'Enter a 10-digit mobile number.');
  if (guest.email && !EMAIL.test(guest.email)) throw new StayPassError('INVALID', 'That email address does not look right.');
  if (!Number.isInteger(guest.guests) || guest.guests < 1 || guest.guests > 20) throw new StayPassError('INVALID', 'How many guests are staying?');

  const wantedId = req.earlyOptionId === undefined ? earlyOptionOf((booking as any)?.expected_arrival) : req.earlyOptionId;
  const early = wantedId ? findOption(policies, 'early_checkin', wantedId) : null;
  if (wantedId && !early && req.earlyOptionId !== undefined) throw new StayPassError('INVALID', 'That early check-in option is not offered.');

  const quote = quoteStay({ categoryName: category.name, rate: Number(category.price) || 0, checkIn, checkOut, early });
  return { booking, category, guest, checkIn, checkOut, early, quote };
}

export interface PassRow {
  id: string; business_id: string; booking_id: string | null; category_id: string | null; guest_name: string; guest_phone: string; guest_email: string | null;
  guests: number; check_in: string; check_out: string; nights: number; early_option_id: string | null; lines: QuoteLine[]; amount: number;
  payment_method: string; payment_reference: string | null; paid_at: string; bill_order_id: string | null; token_version: number; expires_at: string;
  status: 'issued' | 'used' | 'void'; used_room_id: string | null; used_at: string | null;
}

export interface IssueOptions { policies: StayPolicies; today?: string; now?: Date }
export interface IssueInput extends PassRequest { paymentMethod?: string; paymentReference?: string | null; cashTendered?: unknown; idempotencyKey?: string | null; issuedBy?: string | null }

/** Bills the room and issues the pass: a settled advance bill, then the pass that points at it. Either both exist or neither does. */
export async function issuePass(db: any, businessId: string, input: IssueInput, opts: IssueOptions): Promise<{ pass: PassRow; token: string; quote: StayQuote; reused: boolean }> {
  const { tender, reference } = readTender(input.paymentMethod, input.paymentReference);

  const key = input.idempotencyKey ? String(input.idempotencyKey).slice(0, 80) : null;
  if (key) {
    const { data: existing } = await db.from('stay_passes').select('*').eq('business_id', businessId).eq('idempotency_key', key).maybeSingle();
    if (existing) return { pass: existing, token: passToken(existing.id, existing.token_version), quote: quoteFromPass(existing), reused: true };
  }

  const r = await resolveStay(db, businessId, input, opts.policies, opts.today);
  const cash = readCashTender(tender, r.quote.amount, input.cashTendered);
  if (cash.error) throw new StayPassError('INVALID', cash.error);
  const now = opts.now || new Date();
  const id = randomUUID();
  const token = passToken(id, 1);
  const label = r.booking?.confirmation_code || id.slice(0, 6).toUpperCase();

  const { data: bill, error: billErr } = await db.from('orders').insert({
    business_id: businessId, order_type: 'room_advance', order_source: 'POS', status: 'SETTLED', table_number: `ADV ${label}`,
    customer_name: r.guest.name, customer_phone: r.guest.phone, items: r.quote.lines, subtotal: r.quote.amount, grand_total: r.quote.amount,
    total_amount: r.quote.amount, payment_method: tender,
    ...(cash.tender ? { cash_tendered: cash.tender.cash_tendered, cash_change: cash.tender.cash_change } : {}),
  }).select('id').maybeSingle();
  if (billErr || !bill) throw new StayPassError('FAILED', 'The bill could not be saved. Nothing was recorded; please try again.');
  // A guest who reserved with their Vibers ID owns this bill: it then appears among their invoices. Best effort.
  void stampAdvanceBillOwner(db, businessId, bill.id, r.booking?.guest_account_id || null);

  const row = {
    id, business_id: businessId, booking_id: r.booking?.id || null, category_id: r.category.id, guest_name: r.guest.name, guest_phone: r.guest.phone,
    guest_email: r.guest.email, guests: r.guest.guests, check_in: r.checkIn, check_out: r.checkOut, nights: r.quote.nights, early_option_id: r.early?.id || null,
    lines: r.quote.lines, amount: r.quote.amount, payment_method: tender, payment_reference: reference || null, paid_at: now.toISOString(), bill_order_id: bill.id,
    token_version: 1, token_hash: hashPassToken(token), idempotency_key: key, expires_at: new Date(`${addDays(r.checkOut, 1)}T12:00:00+05:30`).toISOString(),
    status: 'issued', issued_by: input.issuedBy || null,
  };
  const { data: pass, error } = await db.from('stay_passes').insert(row).select('*').maybeSingle();
  if (error || !pass) {
    // The bill is removed so a refused pass never leaves a paid bill with nothing behind it.
    await db.from('orders').delete().eq('id', bill.id).eq('business_id', businessId);
    if (error?.code === '23505') throw new StayPassError('CONFLICT', 'This booking has already been billed. Show the existing link instead.');
    throw new StayPassError('FAILED', 'The check-in link could not be created. Nothing was recorded; please try again.');
  }
  return { pass, token, quote: r.quote, reused: false };
}

const quoteFromPass = (p: PassRow): StayQuote => ({
  nights: p.nights, lines: p.lines, tariff: p.lines.filter((l) => l.type === 'room_tariff').reduce((s, l) => s + l.price * l.qty, 0),
  earlyFee: p.lines.filter((l) => l.type === 'early_checkin').reduce((s, l) => s + l.price * l.qty, 0), amount: Number(p.amount) || 0,
});

/** The pass behind a link token, whatever its state; callers decide what each state means. */
export async function loadPassByToken(db: any, token: unknown): Promise<PassRow> {
  if (!looksLikePassToken(token)) throw new StayPassError('NOT_FOUND', 'This check-in link is not valid. Ask the desk for a new one.');
  const { data, error } = await db.from('stay_passes').select('*').eq('token_hash', hashPassToken(token)).maybeSingle();
  if (error) throw new StayPassError('FAILED', 'Could not read the check-in link. Please try again.');
  if (!data) throw new StayPassError('NOT_FOUND', 'This check-in link is not valid. Ask the desk for a new one.');
  return data;
}

/** Throws unless the pass can still be used to check in. */
export function assertPassUsable(pass: PassRow, now = new Date()) {
  if (pass.status === 'used') throw new StayPassError('USED', 'This check-in link has already been used.');
  if (pass.status === 'void') throw new StayPassError('VOID', 'This check-in link was cancelled. Please see the front desk.');
  if (Date.parse(pass.expires_at) < now.getTime()) throw new StayPassError('EXPIRED', 'This check-in link has expired. Please see the front desk.');
}

/** Marks the pass used. Conditional on it being unused, so a double tap or a shared link checks in one guest only. */
export async function claimPass(db: any, passId: string, now = new Date()): Promise<void> {
  const { data, error } = await db.from('stay_passes').update({ status: 'used', used_at: now.toISOString() }).eq('id', passId).eq('status', 'issued').select('id').maybeSingle();
  if (error) throw new StayPassError('FAILED', 'Could not start the check-in. Please try again.');
  if (!data) throw new StayPassError('USED', 'This check-in link has already been used.');
}

/** Gives a pass back when the check-in that claimed it did not happen: a paid guest never loses the pass to a failure. */
export async function releasePass(db: any, passId: string): Promise<void> {
  const { error } = await db.from('stay_passes').update({ status: 'issued', used_at: null }).eq('id', passId).eq('status', 'used').is('used_room_id', null);
  if (error) console.error('[stay pass] could not give the pass back', passId, error.message);
}

/** A new link for the same pass; the previous one stops working. */
export async function rotatePassLink(db: any, businessId: string, passId: string): Promise<string> {
  const { data: pass } = await db.from('stay_passes').select('id, token_version, status').eq('id', passId).eq('business_id', businessId).maybeSingle();
  if (!pass) throw new StayPassError('NOT_FOUND', 'That check-in link was not found.');
  if (pass.status !== 'issued') throw new StayPassError('USED', 'This pass has already been used or cancelled.');
  const version = Number(pass.token_version) + 1;
  const token = passToken(passId, version);
  const { data, error } = await db.from('stay_passes').update({ token_version: version, token_hash: hashPassToken(token) })
    .eq('id', passId).eq('business_id', businessId).eq('token_version', pass.token_version).eq('status', 'issued').select('id').maybeSingle();
  if (error || !data) throw new StayPassError('CONFLICT', 'The link changed while you were doing that. Try again.');
  return token;
}

export const passLink = (origin: string, venue: string, token: string) => `${origin}/stay/${encodeURIComponent(venue)}/checkin?p=${token}`;

/** What the guest's check-in page may know: first name and the stay, never the phone or the payment reference. */
export function guestPassView(p: PassRow) {
  return {
    status: p.status, guest_first_name: p.guest_name.trim().split(/\s+/)[0], guest_name: p.guest_name, invoice_id: p.bill_order_id, guests: p.guests, check_in: p.check_in, check_out: p.check_out, nights: p.nights,
    amount: Number(p.amount) || 0, paid_at: p.paid_at, payment_method: p.payment_method, lines: p.lines,
  };
}
