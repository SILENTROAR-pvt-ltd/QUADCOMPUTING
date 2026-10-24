import type { VenueSubscription, VenueWallet } from '@/types/wallet';
import { mem } from './wallet-memory.store';
import { adminDb } from '@/lib/supabase/admin';

export async function getOrProvisionVenueWallet(supabase: any, venueId: string) {
  if (!venueId) return null;
  let subscription: VenueSubscription | null = null;
  let wallet: VenueWallet | null = null;

  try {
    const db = adminDb();
    const { data: sub } = await db
      .from('venue_subscriptions')
      .select('*')
      .eq('venue_id', venueId)
      .maybeSingle();
    subscription = sub;

    const { data: wal } = await db
      .from('venue_wallets')
      .select('*')
      .eq('venue_id', venueId)
      .maybeSingle();
    wallet = wal;

    if (!subscription) {
      const { data: nSub } = await db
        .from('venue_subscriptions')
        .insert({
          venue_id: venueId,
          plan_tier: 'pay_as_you_go',
          status: 'active',
          trial_ends_at: null,
          expires_at: null,
        })
        .select()
        .maybeSingle();
      subscription = nSub;
    } else if (
      subscription.plan_tier === 'pay_as_you_go' &&
      (subscription.trial_ends_at || subscription.status === 'trial')
    ) {
      await db
        .from('venue_subscriptions')
        .update({ status: 'active', trial_ends_at: null, expires_at: null })
        .eq('id', subscription.id);
      subscription.status = 'active';
      subscription.trial_ends_at = null;
      subscription.expires_at = null;
    }

    if (!wallet) {
      const { data: nWal } = await db
        .from('venue_wallets')
        .insert({ venue_id: venueId, balance: 0.0, currency: 'INR' })
        .select()
        .maybeSingle();
      wallet = nWal;
    }
  } catch {}

  if (!subscription || !wallet) {
    if (!mem.has(venueId)) {
      mem.set(venueId, {
        subscription: {
          id: `sub_${venueId}`,
          venue_id: venueId,
          plan_tier: 'pay_as_you_go',
          status: 'active',
          trial_ends_at: null,
          expires_at: null,
        },
        // No free credit: a venue's wallet starts empty, here as in the database.
        wallet: { id: `wal_${venueId}`, venue_id: venueId, balance: 0, currency: 'INR' },
        ledger: [],
      });
    }
    const c = mem.get(venueId)!;
    return { subscription: c.subscription, wallet: c.wallet, cached: true };
  }

  return { subscription, wallet, cached: false };
}
