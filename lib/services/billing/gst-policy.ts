// Who may charge GST. A venue charges GST only on a valid GSTIN that its host has confirmed in My profile.
// The confirmation is stored against that exact GSTIN (gst_verified_number), so changing the number
// cancels it. Every bill path (guest orders, table settlement, counter bills) applies this on the server.
import { RULES } from '@/lib/services/profile/profile-rules';

export interface GstStatus {
  gstin: string | null;
  verified: boolean;
  canCharge: boolean;
  /** Why GST can't be charged, for the POS to show. Null when it can. */
  reason: string | null;
}

const MISSING_COLUMN = new Set(['42703', 'PGRST204']);
const clean = (v: unknown) => (typeof v === 'string' ? v.trim().toUpperCase().replace(/\s/g, '') : '');

export function gstStatusOf(business: { gst_number?: unknown; gst_verified_number?: unknown } | null | undefined): GstStatus {
  const gstin = clean(business?.gst_number) || null;
  const valid = Boolean(gstin && RULES.gst.re.test(gstin));
  const verified = Boolean(valid && clean(business?.gst_verified_number) === gstin);
  const reason = !gstin ? 'Add your GSTIN in My profile to charge GST.'
    : !valid ? 'Your GSTIN in My profile is not valid, so GST is off.'
      : !verified ? 'Confirm your GSTIN in My profile to charge GST.' : null;
  return { gstin, verified, canCharge: verified, reason };
}

/** The venue's GST status. Before migration 20261010000018 nothing is verified, so GST stays off. */
export async function loadGstStatus(db: any, businessId: string): Promise<GstStatus> {
  let { data, error } = await db.from('businesses').select('gst_number, gst_verified_number').eq('id', businessId).maybeSingle();
  if (error && MISSING_COLUMN.has(error.code)) {
    ({ data, error } = await db.from('businesses').select('gst_number').eq('id', businessId).maybeSingle());
  }
  if (error) throw error;
  return gstStatusOf(data);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** A bill's totals without the tax a venue may not charge: the total drops by exactly that tax. */
export function stripTax(t: { taxAmount: number; grandTotal: number }): { taxAmount: number; grandTotal: number } {
  const tax = Math.max(0, Number(t.taxAmount) || 0);
  return { taxAmount: 0, grandTotal: Math.max(0, round2((Number(t.grandTotal) || 0) - tax)) };
}
