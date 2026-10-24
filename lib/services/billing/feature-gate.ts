// Plan gates on the server. A route that starts something a plan sells (an event, an offer, a delivery order, a room,
// a Vibey reply) asks here first. The venue's subscription is read with the service role and kept for 30 seconds per
// server instance. A failed read counts as Rhodium per bill (everything open), so a database blip never switches a
// venue's features off mid-service. Only new intake is gated: running stays, payments and check-outs never are.
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import type { Feature } from '@/lib/services/wallet/plans';
import { entitlementsOf, featureBlock, type Entitlements } from './entitlements';

const TTL_MS = 30_000;
const cache = new Map<string, { at: number; e: Entitlements }>();
const caching = () => process.env.NODE_ENV !== 'test';

export async function loadEntitlements(businessId: string, db?: any): Promise<Entitlements> {
  const hit = caching() ? cache.get(businessId) : undefined;
  if (hit && Date.now() - hit.at < TTL_MS) return hit.e;
  try {
    const { data, error } = await (db ?? adminDb()).from('venue_subscriptions').select('*').eq('venue_id', businessId).maybeSingle();
    if (error) throw error;
    const e = entitlementsOf(data);
    if (caching()) cache.set(businessId, { at: Date.now(), e });
    return e;
  } catch (err) {
    console.warn('[feature-gate] plan read failed, treating the venue as per bill', { businessId, code: (err as { code?: string })?.code });
    return entitlementsOf(null);
  }
}

export async function hasFeature(businessId: string, feature: Feature, db?: any): Promise<boolean> {
  return (await loadEntitlements(businessId, db)).features.has(feature);
}

/** A 402 `plan_required` response when the venue's plan lacks the feature, else null. */
export async function requireFeature(businessId: string, feature: Feature, db?: any): Promise<NextResponse | null> {
  const block = featureBlock(await loadEntitlements(businessId, db), feature);
  return block ? NextResponse.json({ success: false, error: block.message, ...block }, { status: 402 }) : null;
}

/** Forget a venue's cached plan (after it changes), or every venue's. */
export function clearEntitlements(businessId?: string) {
  if (businessId) cache.delete(businessId);
  else cache.clear();
}
