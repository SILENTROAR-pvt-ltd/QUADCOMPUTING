// lib/services/wallet/redemption.service.ts
//
// wallet_redemptions is the only source of truth. This used to keep an in-memory Map that every
// read consulted first, which is per-instance on serverless: a code created on one instance was
// invisible to the POS on another, and a 4-digit code collision silently overwrote another
// guest's pending record.
import { RedemptionRecord, generateRedemptionCode } from './redemption-store.util';
import { getGuestWallet } from './cashback.service';

const IS_UUID = (v: any) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const MAX_CODE_ATTEMPTS = 5;
const REDEMPTION_TTL_MS = 60 * 60 * 1000;
const MONEY_EPSILON = 0.005;

const round2 = (n: number) => Math.round(Number(n) * 100) / 100;

/** A redemption that cannot be applied to this bill. `code` is stable for the UI and logs. */
export class RedemptionSettlementError extends Error {
  status = 409;
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'RedemptionSettlementError';
  }
}

export interface CreateRedemptionPayload {
  guest_id: string;
  guest_handle?: string;
  customer_phone?: string;
  guest_name?: string;
  business_id: string;
  cafe_id?: string;
  table_number?: string;
  amount?: number;
}

export async function createRedemptionRequest(supabase: any, payload: CreateRedemptionPayload) {
  const { guest_id, guest_handle, customer_phone, guest_name, business_id, cafe_id, table_number, amount: reqAmount } = payload;
  const resolvedBiz = business_id || cafe_id || '';
  if (!resolvedBiz) return { success: false, error: 'business_id is required' };
  const cleanHandle = guest_handle ? (guest_handle.startsWith('@') ? guest_handle : `@${guest_handle}`) : undefined;
  const primaryId = cleanHandle || guest_id || customer_phone;
  if (!primaryId) return { success: false, error: 'A guest identifier is required' };

  // 1. Current wallet balance. Names are not identifiers (not unique, not claimable).
  const walletRes = await getGuestWallet(supabase, primaryId, resolvedBiz, [cleanHandle, customer_phone].filter(Boolean) as string[]);

  const currentBalance = Number(walletRes.wallet?.balance || 0);
  if (currentBalance <= 0) {
    return { success: false, error: 'Wallet balance is ₹0.00. No cashback available to redeem.' };
  }

  const redeemAmount = reqAmount && reqAmount > 0 ? Math.min(reqAmount, currentBalance) : currentBalance;
  if (redeemAmount <= 0) {
    return { success: false, error: 'Invalid redemption amount requested.' };
  }
  const amount = Math.round(redeemAmount * 100) / 100;

  const now = new Date();
  const nowIso = now.toISOString();

  // 2. An expired code still counts as 'pending' to the unique index until it is flipped.
  const { error: expireErr } = await supabase
    .from('wallet_redemptions')
    .update({ status: 'expired' })
    .eq('business_id', resolvedBiz)
    .eq('guest_id', primaryId)
    .eq('status', 'pending')
    .lt('expires_at', nowIso);
  if (expireErr) throw expireErr;

  // 3. Reuse a live pending code instead of minting a second one.
  const findPending = async () => {
    const { data, error } = await supabase
      .from('wallet_redemptions')
      .select('*')
      .eq('business_id', resolvedBiz)
      .eq('guest_id', primaryId)
      .eq('status', 'pending')
      .gt('expires_at', nowIso)
      .maybeSingle();
    if (error) throw error;
    return data as RedemptionRecord | null;
  };

  const reuse = async (existing: RedemptionRecord) => {
    const patch = { amount, table_number: table_number || existing.table_number || null };
    const { data, error } = await supabase
      .from('wallet_redemptions')
      .update(patch)
      .eq('id', existing.id)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return { success: true, redemption: (data || existing) as RedemptionRecord, is_existing: true };
  };

  const existing = await findPending();
  if (existing) return reuse(existing);

  // 4. Insert with a fresh random code; the DB enforces code uniqueness, so retry on collision.
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const { data, error } = await supabase
      .from('wallet_redemptions')
      .insert({
        code: generateRedemptionCode(),
        wallet_id: IS_UUID(walletRes.wallet?.id) ? walletRes.wallet.id : null,
        guest_id: primaryId,
        guest_handle: cleanHandle,
        guest_phone: customer_phone,
        business_id: resolvedBiz,
        cafe_id: resolvedBiz,
        table_number: table_number || null,
        amount,
        status: 'pending',
        created_at: nowIso,
        expires_at: new Date(now.getTime() + REDEMPTION_TTL_MS).toISOString(),
      })
      .select('*')
      .single();

    if (!error && data) {
      return { success: true, redemption: { ...data, guest_name } as RedemptionRecord };
    }

    if (error?.code === '23505') {
      // Either another request just created this guest's pending code, or the random code collided.
      const raced = await findPending();
      if (raced) return reuse(raced);
      continue;
    }
    throw error;
  }

  throw new Error('Could not generate a unique redemption code. Please try again.');
}

export async function verifyRedemptionCode(
  supabase: any,
  payload: { code: string; business_id?: string; cafe_id?: string; table_number?: string }
) {
  const rawCode = (payload.code || '').trim().toUpperCase();
  if (!rawCode) return { success: false, error: 'Redemption code is required' };
  const resolvedBiz = payload.business_id || payload.cafe_id;

  const { data: record, error: lookupErr } = await supabase
    .from('wallet_redemptions')
    .select('*')
    .eq('code', rawCode)
    .maybeSingle();
  if (lookupErr) throw lookupErr;

  if (!record) {
    return { success: false, error: 'Invalid redemption code. Please check and try again.' };
  }

  // Idempotency check: Cannot be used more than once!
  if (record.status === 'redeemed') {
    return {
      success: false,
      error: 'This redemption code has already been redeemed and cannot be used again.',
      already_redeemed: true,
      redeemed_at: record.redeemed_at,
    };
  }

  if (record.status === 'cancelled') {
    return { success: false, error: 'This redemption code has been cancelled.' };
  }

  // Check venue match before revealing anything else about the code
  if (resolvedBiz && record.cafe_id !== resolvedBiz && record.business_id !== resolvedBiz) {
    return { success: false, error: 'This redemption code is not valid for this venue.' };
  }

  if (record.status === 'expired' || new Date(record.expires_at).getTime() < Date.now()) {
    if (record.status === 'pending' || record.status === 'verified') {
      await supabase.from('wallet_redemptions').update({ status: 'expired' }).eq('id', record.id).in('status', ['pending', 'verified']);
    }
    return { success: false, error: 'Redemption code has expired. Please generate a new code.' };
  }

  // Re-verify guest wallet balance
  const walletRes = await getGuestWallet(supabase, record.guest_id, record.cafe_id, [
    record.guest_handle,
    record.guest_phone,
  ].filter(Boolean) as string[]);

  const balance = Number(walletRes.wallet?.balance || 0);
  if (balance < Number(record.amount)) {
    return {
      success: false,
      error: `Insufficient wallet balance. Code requested ₹${record.amount}, but wallet only has ₹${balance}.`,
    };
  }

  // Persist the transition; only report success if the row really moved to 'verified'.
  const nowIso = new Date().toISOString();
  const { data: verified, error: verifyErr } = await supabase
    .from('wallet_redemptions')
    .update({ status: 'verified', verified_at: record.verified_at || nowIso, table_number: payload.table_number || record.table_number || null })
    .eq('id', record.id)
    .in('status', ['pending', 'verified'])
    .select('*')
    .maybeSingle();
  if (verifyErr) throw verifyErr;
  if (!verified) {
    return { success: false, error: 'This redemption code is no longer valid. Please generate a new code.' };
  }

  return {
    success: true,
    message: `Redemption code ${rawCode} verified. Up to ₹${verified.amount} can be applied to this bill.`,
    redemption: verified,
    amount: Number(verified.amount),
    guest_handle: verified.guest_handle,
    guest_name: record.guest_name,
    wallet_code: (walletRes.wallet as { wallet_code?: string | null } | null)?.wallet_code ?? null,
    table_number: verified.table_number,
  };
}

/**
 * Checks, before anything is written, that a redemption code can fund this bill's discount.
 *
 * The rule is the one the settlement RPC enforces: the wallet is debited the discount actually
 * applied, which must be above zero, no more than the code is worth, and no more than the bill.
 * Any unused part of the code stays in the wallet.
 */
export async function assertRedemptionSettleable(
  supabase: any,
  args: { code: string; businessId: string; orderId?: string | null; discountAmount: number; subtotal?: number; now?: number }
): Promise<{ record: RedemptionRecord; applied: number; replay: boolean }> {
  const rawCode = (args.code || '').trim().toUpperCase();
  const businessId = (args.businessId || '').toLowerCase();

  const { data: record, error } = await supabase
    .from('wallet_redemptions')
    .select('*')
    .eq('code', rawCode)
    .maybeSingle();
  if (error) throw error;

  const sameVenue = record && (String(record.business_id).toLowerCase() === businessId || String(record.cafe_id).toLowerCase() === businessId);
  if (!record || !sameVenue) {
    throw new RedemptionSettlementError('This redemption code is not valid for this venue.', 'REDEMPTION_NOT_FOUND');
  }
  if (record.status === 'redeemed') {
    // The same order settling again (double tap, network retry) after this code already
    // settled it: the debit happened once, so the retry is a success, not a second use.
    const sameOrder = !!args.orderId && String(record.order_id || '').toLowerCase() === String(args.orderId).toLowerCase();
    if (sameOrder) {
      return { record: record as RedemptionRecord, applied: round2(record.applied_amount ?? record.amount), replay: true };
    }
    throw new RedemptionSettlementError('This redemption code has already been used on a bill.', 'REDEMPTION_ALREADY_USED');
  }
  if (record.status !== 'pending' && record.status !== 'verified') {
    throw new RedemptionSettlementError(`This redemption code is ${record.status}. The guest needs a new code.`, 'REDEMPTION_NOT_USABLE');
  }
  const now = args.now ?? Date.now();
  if (new Date(record.expires_at).getTime() <= now) {
    throw new RedemptionSettlementError('This redemption code has expired. The guest needs a new code.', 'REDEMPTION_EXPIRED');
  }

  const applied = round2(args.discountAmount);
  if (!(applied > 0)) {
    throw new RedemptionSettlementError('Apply the wallet discount to the bill before settling with this code.', 'REDEMPTION_NOT_APPLIED');
  }
  const worth = round2(record.amount);
  if (applied > worth + MONEY_EPSILON) {
    throw new RedemptionSettlementError(`The discount ₹${applied} is more than this code is worth (₹${worth}).`, 'REDEMPTION_EXCEEDS_CODE');
  }
  if (args.subtotal !== undefined && applied > round2(args.subtotal) + MONEY_EPSILON) {
    throw new RedemptionSettlementError('The wallet discount is more than the bill subtotal.', 'REDEMPTION_EXCEEDS_BILL');
  }
  return { record: record as RedemptionRecord, applied, replay: false };
}
