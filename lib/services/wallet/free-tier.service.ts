/**
 * free-tier.service.ts
 *
 * Centralises all free-tier threshold logic for Pay-As-You-Go venues.
 *
 * FREE THRESHOLDS (per venue, lifetime count in catalog_items):
 *   food / service items  → first 10 free  → then ₹2.00 per item (menu_item_creation)
 *   room items            → first 2 free   → then ₹5.00 per item (room_creation)
 *
 * Returns:
 *   { isFree: true }          → log 'onboarding_free_tier', skip fee guard
 *   { isFree: false, cost }   → invoke evaluateFeeGuard with the returned cost
 */

import type { FeeGuardAction } from '@/types/wallet';

export const FREE_TIER = {
  menu: { threshold: 10, cost: 2.00, action: 'menu_item_creation' as FeeGuardAction },
  room: { threshold: 2,  cost: 10.00, action: 'room_creation'      as FeeGuardAction },
} as const;

export type FreeTierKey = keyof typeof FREE_TIER;

export class FreeTierUnavailableError extends Error {
  readonly status = 503;
  readonly code = 'FREE_TIER_UNAVAILABLE';
  constructor(cause?: unknown) {
    super('Free-tier quota check unavailable');
    this.name = 'FreeTierUnavailableError';
    (this as { cause?: unknown }).cause = cause;
  }
}

/**
 * Returns true if an item is a service or addon, which are 100% free (₹0.00)
 * and completely bypass Pay-As-You-Go fees and quota counting.
 */
export function isFreeItemType(itemType?: string, category?: string): boolean {
  if (!itemType && !category) return false;
  const t = (itemType || '').toLowerCase().trim();
  const c = (category || '').toLowerCase().trim();
  return (
    t === 'service' ||
    t === 'addon' ||
    t === 'menu_addon' ||
    c === 'service' ||
    c === 'services' ||
    c === 'addon' ||
    c === 'add-on' ||
    c === 'addons' ||
    c === 'add-ons'
  );
}

export interface FreeTierResult {
  isFree: boolean;
  existingCount: number;
  threshold: number;
  cost: number;
  action: FeeGuardAction;
}

/**
 * Check whether the next catalog/room creation is within the free-tier quota.
 *
 * @param supabase   — server-side Supabase client
 * @param businessId — venue's business_id
 * @param kind       — 'menu' (food/beverage) or 'room'
 */
export async function checkFreeTier(
  supabase: any,
  businessId: string,
  kind: FreeTierKey,
): Promise<FreeTierResult> {
  const cfg = FREE_TIER[kind];
  let existingCount = 0;

  try {
    if (kind === 'room') {
      // 1. Check rooms table
      const { count: roomsCount, error: roomsErr } = await supabase
        .from('rooms')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId);
      if (roomsErr) throw roomsErr;

      // 2. Check catalog_items table for room types
      const { count: catalogRoomsCount, error: catalogRoomsErr } = await supabase
        .from('catalog_items')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .in('item_type', ['room', 'room_accommodation']);
      if (catalogRoomsErr) throw catalogRoomsErr;

      existingCount = Math.max(roomsCount ?? 0, catalogRoomsCount ?? 0);
    } else {
      // Only standard menu items (food/beverage) count toward the first-10 menu free threshold.
      // Services and add-ons are completely excluded. catalog_items is the single
      // source of truth for catalog entries (there is no `menu_items` table in
      // this schema — querying it used to always fail and fall into the catch
      // below, which defaulted to the paid threshold on every single call).
      const { count: catalogCount, error: catalogErr } = await supabase
        .from('catalog_items')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .in('item_type', ['food', 'beverage']);
      if (catalogErr) throw catalogErr;

      existingCount = catalogCount ?? 0;
    }
  } catch (e) {
    // Fail closed: an unknown count is neither "free" nor "paid". Callers decide whether
    // to block (pre-insert) or flag the row for reconciliation (post-insert).
    console.error('[FreeTier] Count query failed:', { businessId, kind, error: (e as any)?.message || e });
    throw new FreeTierUnavailableError(e);
  }

  return {
    isFree: existingCount < cfg.threshold,
    existingCount,
    threshold: cfg.threshold,
    cost: cfg.cost,
    action: cfg.action,
  };
}

import { adminDb } from '@/lib/supabase/admin';

/**
 * Log a free-tier onboarding event to usage_ledger (₹0 cost, informational only).
 */
export async function logFreeTierUsage(
  supabase: any,
  businessId: string,
  action: FeeGuardAction,
  referenceId: string,
): Promise<void> {
  try {
    const writeClient = adminDb();
    await writeClient.from('usage_ledger').insert({
      venue_id: businessId,
      action_type: 'onboarding_free_tier',
      cost: 0,
      reference_id: referenceId,
      metadata: { free_tier_action: action },
    });
    console.log('[FreeTier] Onboarding free-tier logged', { businessId, action, referenceId });
  } catch (e) {
    console.error('[FreeTier] Failed to log free-tier usage:', e);
  }
}
